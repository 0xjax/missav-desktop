import { GM_getValue, GM_setValue, readMainWorld } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'
import { toastBroadcast, listenToastChannel } from '../utils/toast.ts'
import { t } from '../utils/i18n.ts'
import { recordPlaylistOp } from './playlist-panel.ts'
import { applyChangeToLatestSnapshot } from './backup-export.ts'

// 站点收藏/片单的问题：1) 收藏状态要等 /api/items/{id}/view 返回才显示；
// 2) toggleSave 乐观翻转 UI 但请求无失败处理，关标签页可能丢请求；
// 3) user 未就位时 requireLogin 误弹登录框。
// 本模块统一接管：无条件拦截点击，请求一律由本模块发出（keepalive，关标签页也送达）。
// NOTE 站点自己的点击处理器同样是 Alpine 绑定的——Alpine 未就绪时它根本没绑定，
// 所以"读不到 Alpine 就放行站点原生流程"放行也没人接，反而让请求丢掉 keepalive。
// 故 Alpine 只作"状态来源的首选"，不是拦截的前提。
// WARNING 反馈（跨标签 toast / 秒显缓存 / 备份快照）必须乐观写在请求发出之后，
// 不能等响应：关标签页后 .then() 永不执行，反馈会全丢（实测 gm:mx-toast 与
// saved-cache 均无写入，而服务器已收藏成功）。失败时若页面还在再回滚。

interface ComponentData {
  user?: unknown
  saved?: boolean
  loading?: boolean
  togglePanel?: (type: string) => void
  [key: string]: unknown
}

interface AlpineLike {
  $data: (el: Element) => ComponentData
}

function alpine(): AlpineLike | undefined {
  // WARNING 沙盒 window 对站点全局透传不保证可靠（诊断日志实测偶发读不到
  // window.Alpine），必须 unsafeWindow 兜底；仍拿不到时调用方放行站点原生流程
  const w = (window as { Alpine?: AlpineLike }).Alpine
  if (w) return w
  return readMainWorld<AlpineLike>('Alpine')
}

// ---- 收藏状态跨标签缓存（秒显提示，服务器 /view 返回后由站点自动校准） ----

const SAVED_CACHE_KEY = 'saved-cache'
type SavedCache = Record<string, boolean>

function readCache(): SavedCache {
  return GM_getValue<SavedCache>(SAVED_CACHE_KEY, {})
}

function writeCache(dvdId: string, saved: boolean): void {
  const cache = readCache()
  cache[dvdId] = saved
  // 简单限量：超过 800 条时丢弃最早的一批
  const keys = Object.keys(cache)
  if (keys.length > 800) keys.slice(0, 200).forEach((k) => delete cache[k])
  GM_setValue(SAVED_CACHE_KEY, cache)
}

function dvdIdOf(el: Element): string | null {
  const fromUrl = location.pathname.split('/').filter(Boolean).pop() ?? null
  let cur: Element | null = el
  while (cur) {
    const xd = cur.getAttribute?.('x-data') || ''
    const matches = [...xd.matchAll(/dvdId:\s*'([^']+)'/g)].map((m) => m[1])
    if (matches.length) {
      // 同一 x-data 可能有多个 dvdId（片单面板容器是短 id，函数体是完整 id）：
      // 与当前 URL slug 一致的最可信，否则取最长（更具体）
      return (
        matches.find((m) => m === fromUrl) ??
        matches.sort((a, b) => b.length - a.length)[0]
      )
    }
    cur = cur.parentElement
  }
  return fromUrl
}

// 当前视频信息：操作成功后回写最新备份快照用
function currentVideo(dvdId: string): { id: string; title: string; url: string } {
  return {
    id: dvdId,
    title: document.querySelector('h1')?.textContent?.trim() || dvdId,
    url: location.href,
  }
}

// ---- 请求：keepalive 保证关标签页后仍送达 ----

function apiFetch(
  url: string,
  method: 'POST' | 'DELETE',
  body?: Record<string, string>,
): Promise<Response> {
  const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1]
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  }
  if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
  if (body) headers['Content-Type'] = 'application/json'
  return fetch(url, {
    method,
    credentials: 'include',
    keepalive: true,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function openLoginModal(data: ComponentData): void {
  const req = data.requireLogin as ((cb: () => void) => void) | undefined
  if (typeof req === 'function') {
    req(() => {})
    return
  }
  const btn = [...document.querySelectorAll('button, a')].find((el) =>
    el
      .getAttributeNames()
      .some(
        (n) =>
          n.startsWith('@click') &&
          (el.getAttribute(n) || '').includes('showLoginModal'),
      ),
  )
  ;(btn as HTMLElement | undefined)?.click()
}

function alpineAction(el: Element, action: string): boolean {
  return el
    .getAttributeNames()
    .some(
      (n) => n.startsWith('@click') && (el.getAttribute(n) || '').includes(action),
    )
}

function findSaveUrl(btn: Element): string | null {
  let el: Element | null = btn
  while (el) {
    const m = (el.getAttribute?.('x-data') || '').match(
      /https:\/\/[^'"]+\/api\/items\/[^'"]+\/save/,
    )
    if (m) return m[0]
    el = el.parentElement
  }
  return null
}

// ---- 收藏/取消 ----

// Alpine 组件数据：元素不在组件内时 $data 会抛错
function componentData(alp: AlpineLike, el: Element): ComponentData | null {
  try {
    return alp.$data(el) ?? null
  } catch {
    return null
  }
}

// Alpine 未接管时两个图标同时可见（x-show 还没生效）→ 判不出来返回 null。
// 那种情况下站点 UI 必然显示"未收藏"（x-data 初值 saved:false 且 /view 未回），
// 调用方按"收藏"处理即可
// NOTE 站点第二个图标的属性是 x-show="! saved"（感叹号后有空格），不能写死选择器
function domSavedState(btn: Element): boolean | null {
  const icons = [...btn.querySelectorAll('svg[x-show]')]
  const on = icons.find((s) => s.getAttribute('x-show') === 'saved')
  const off = icons.find(
    (s) => (s.getAttribute('x-show') || '').replace(/\s+/g, '') === '!saved',
  )
  if (!on || !off) return null
  const onVisible = getComputedStyle(on).display !== 'none'
  const offVisible = getComputedStyle(off).display !== 'none'
  if (onVisible === offVisible) return null
  return onVisible
}

// toast 里的 AV 番号：优先取 h1 首个词（站点自身格式，如 UMD-1017），
// 取不到时回退 URL slug 大写
function avCode(dvdId: string): string {
  const first = document.querySelector('h1')?.textContent?.trim().split(/\s+/)[0]
  return first && /^[a-z]+-\d/i.test(first) ? first : dvdId.toUpperCase()
}

function onSaveClick(e: MouseEvent, btn: Element): void {
  const url = findSaveUrl(btn)
  // 连请求地址都拿不到就什么都不做，也不拦截（放行站点，避免点了没反应）
  if (!url) return
  e.preventDefault()
  e.stopImmediatePropagation()

  const alp = alpine()
  const data = alp ? componentData(alp, btn) : null
  // 状态来源：Alpine 优先，其次图标可见性；都判不出（页面刚加载）按"收藏"处理
  const state = data ? data.saved : domSavedState(btn)
  const target = state !== true
  const dvdId = dvdIdOf(btn)
  const code = dvdId ? avCode(dvdId) : undefined

  if (data) {
    data.saved = target
    data.loading = true
  }
  // 乐观写：关标签页后 .then() 不会执行，反馈只能在这里落地
  const commit = (saved: boolean): void => {
    if (!dvdId) return
    writeCache(dvdId, saved)
    applyChangeToLatestSnapshot(currentVideo(dvdId), saved)
  }
  commit(target)
  toastBroadcast(target ? t('save.saved') : t('save.unsaved'), {
    code,
    type: 'success',
  })

  apiFetch(url, target ? 'POST' : 'DELETE')
    .then((r) => {
      if (data) data.loading = false
      if (r.ok) return
      // 回滚（页面还在才有意义）：本地状态与反馈都要撤回
      if (data) data.saved = !target
      commit(!target)
      if (r.status === 401) openLoginModal(data ?? {})
      else toastBroadcast(t('save.failed'), { code, type: 'error' })
    })
    .catch(() => {
      if (data) {
        data.loading = false
        data.saved = !target
      }
      commit(!target)
      toastBroadcast(t('save.netError'), { code, type: 'error' })
    })
}

// ---- 片单 ----

interface PlaylistItem {
  key: string
  name?: string
  is_added: boolean
}

// 片单名：Alpine 数据（实测字段 {is_added, key, name}）优先，其次面板行 label。
// 快照里没有该片单时要靠它补建条目（名字错就没法回溯是哪个片单）
function playlistName(input: HTMLInputElement, item?: PlaylistItem): string | undefined {
  if (item?.name) return item.name
  return (
    input.closest('div.relative')?.querySelector('label')?.textContent?.trim() ||
    undefined
  )
}

function onPlaylistOpenClick(e: MouseEvent, btn: Element): void {
  const alp = alpine()
  if (!alp) return
  const data = alp.$data(btn)
  // user 已就位则走站点原流程；否则绕过 requireLogin 直接展开
  if (!data || data.user || typeof data.togglePanel !== 'function') return
  e.preventDefault()
  e.stopImmediatePropagation()
  data.togglePanel('playlist')
}

function onPlaylistToggle(e: MouseEvent, input: HTMLInputElement): void {
  const dvdId = dvdIdOf(input)
  // 没有 dvdId 就发不出请求：不拦截，放行站点原生流程
  if (!dvdId) return
  // 真实按压的激活序列：pre-click 已翻转 checked，取消点击后浏览器才回滚，
  // 所以此刻的 input.checked 就是用户想要的目标状态（Alpine 读不到时的状态来源）
  const checkedByUser = input.checked
  e.preventDefault()
  e.stopImmediatePropagation()

  const alp = alpine()
  // 面板组件数据含 playlists（x-model 绑定的项即 checkbox 状态来源）
  const data = alp ? componentData(alp, input) : null
  const list = data?.playlists as PlaylistItem[] | undefined
  const item = list?.find((p) => p.key === input.id)
  const target = item ? !item.is_added : checkedByUser
  const name = playlistName(input, item)
  const code = avCode(dvdId)

  const setLocal = (on: boolean): void => {
    if (item) item.is_added = on
    input.checked = on
    applyChangeToLatestSnapshot(currentVideo(dvdId), on, input.id, name)
  }
  if (item) item.is_added = target
  // 这些行的 x-model 数据→DOM effect 会部分失效（实测：is_added=true 但 checked
  // 永不刷新），且回滚发生在本拍之后，故回滚结束后由我们直接写死
  setTimeout(() => {
    if (item) item.is_added = target
    input.checked = target
  }, 0)
  // 乐观写：关标签页后 .then() 不会执行，反馈只能在这里落地
  setLocal(target)
  recordPlaylistOp(input.id)
  toastBroadcast(target ? t('save.added') : t('save.removed'), {
    code,
    type: 'success',
  })

  apiFetch(
    `${location.origin}/api/playlists/${target ? 'add' : 'remove'}`,
    'POST',
    { dvdId, key: input.id },
  )
    .then((r) => {
      if (r.ok) return
      // 回滚（页面还在才有意义）
      setLocal(!target)
      if (r.status === 401) openLoginModal(data ?? {})
      else toastBroadcast(t('save.failed'), { code, type: 'error' })
    })
    .catch(() => {
      setLocal(!target)
      toastBroadcast(t('save.netError'), { code, type: 'error' })
    })
}

// ---- 入口 ----

export function fastSave(): void {
  waitDOMContentLoaded(() => {
    listenToastChannel()
    // 秒显收藏状态：Alpine 初始化后、/view 返回前把缓存值填进去
    const timer = setInterval(() => {
      const alp = alpine()
      const btn = [...document.querySelectorAll('button')].find((b) =>
        alpineAction(b, 'toggleSave'),
      )
      if (!alp || !btn) return
      clearInterval(timer)
      // /view 已返回则服务器真值就位，不用缓存覆盖
      const viewDone = performance
        .getEntriesByType('resource')
        .some((r) => r.name.includes('/view'))
      if (viewDone) return
      const dvdId = dvdIdOf(btn)
      if (!dvdId) return
      const cache = readCache()
      if (dvdId in cache) {
        const data = alp.$data(btn)
        if (data && data.saved === false) data.saved = cache[dvdId]
      }
    }, 100)
    setTimeout(() => clearInterval(timer), 3000)

    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as Element
        // 片单 checkbox（站点绑的是 @click 而非 @change）
        const box = target.closest?.('input[x-model="playlist.is_added"]')
        if (box) {
          onPlaylistToggle(e, box as HTMLInputElement)
          return
        }
        const el = target.closest?.('button, a')
        if (!el) return
        if (el.tagName === 'BUTTON' && alpineAction(el, 'toggleSave')) {
          onSaveClick(e, el)
        } else if (alpineAction(el, 'togglePlaylist')) {
          onPlaylistOpenClick(e, el)
        }
      },
      true,
    )
  })
}
