import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 站点收藏/片单的问题：1) 收藏状态要等 /api/items/{id}/view 返回才显示；
// 2) toggleSave 乐观翻转 UI 但请求无失败处理，关标签页可能丢请求；
// 3) user 未就位时 requireLogin 误弹登录框。
// 本模块统一接管：keepalive 请求保证关标签页也送达；GM 缓存秒显收藏状态，
// 服务器 /view 返回后自动校准；操作结果 toast 反馈，失败回滚。

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
  return (window as { Alpine?: AlpineLike }).Alpine
}

function toast(msg: string): void {
  let box = document.getElementById('mx-toast-box')
  if (!box) {
    box = Object.assign(document.createElement('div'), { id: 'mx-toast-box' })
    document.body.appendChild(box)
  }
  const el = Object.assign(document.createElement('div'), {
    className: 'mx-toast',
    textContent: msg,
  })
  box.appendChild(el)
  setTimeout(() => el.classList.add('mx-toast-out'), 1800)
  setTimeout(() => {
    el.remove()
    if (!box!.children.length) box!.remove()
  }, 2200)
}

// 跨标签 toast：成功确认写入 localStorage，其他标签经 storage 事件收到。
// 失败提示只在本标签显示（UI 回滚也发生在本标签，跨标签无上下文）。
const TOAST_CHANNEL = 'gm:mx-toast'
let lastToastTs = 0

function toastBroadcast(msg: string): void {
  toast(msg)
  lastToastTs = Date.now()
  localStorage.setItem(
    TOAST_CHANNEL,
    JSON.stringify({ text: msg, ts: lastToastTs }),
  )
}

function listenToastChannel(): void {
  window.addEventListener('storage', (e) => {
    if (e.key !== TOAST_CHANNEL || !e.newValue) return
    try {
      const { text, ts } = JSON.parse(e.newValue) as {
        text: string
        ts: number
      }
      if (ts <= lastToastTs) return
      lastToastTs = ts
      toast(text)
    } catch {
      // 非法消息忽略
    }
  })
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
  let cur: Element | null = el
  while (cur) {
    const m = (cur.getAttribute?.('x-data') || '').match(/dvdId: '([^']+)'/)
    if (m) return m[1]
    cur = cur.parentElement
  }
  return location.pathname.split('/').filter(Boolean).pop() ?? null
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

function onSaveClick(e: MouseEvent, btn: Element): void {
  const alp = alpine()
  if (!alp) return
  const data = alp.$data(btn)
  const url = findSaveUrl(btn)
  if (!data || !url) return

  e.preventDefault()
  e.stopImmediatePropagation()

  const target = !data.saved
  const dvdId = dvdIdOf(btn)
  data.saved = target
  data.loading = true
  apiFetch(url, target ? 'POST' : 'DELETE')
    .then((r) => {
      data.loading = false
      if (r.ok) {
        if (dvdId) writeCache(dvdId, target)
        toastBroadcast(target ? '已收藏' : '已取消收藏')
      } else {
        data.saved = !target
        if (r.status === 401) openLoginModal(data)
        else toast('操作失败，请重试')
      }
    })
    .catch(() => {
      data.loading = false
      data.saved = !target
      toast('网络错误，操作未生效')
    })
}

// ---- 片单 ----

interface PlaylistItem {
  key: string
  is_added: boolean
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
  e.preventDefault()
  e.stopImmediatePropagation()
  const alp = alpine()
  if (!alp) return
  // 面板组件数据含 playlists（x-model 绑定的项即 checkbox 状态来源）
  const data = alp.$data(input)
  const list = data.playlists as PlaylistItem[] | undefined
  const item = list?.find((p) => p.key === input.id)
  const dvdId = dvdIdOf(input)
  if (!item || !dvdId) return
  const target = !item.is_added
  item.is_added = target
  apiFetch(
    `${location.origin}/api/playlists/${target ? 'add' : 'remove'}`,
    'POST',
    { dvdId, key: item.key },
  )
    .then((r) => {
      if (r.ok) {
        toastBroadcast(target ? '已加入片单' : '已移出片单')
      } else {
        item.is_added = !target
        if (r.status === 401) openLoginModal(data)
        else toast('操作失败，请重试')
      }
    })
    .catch(() => {
      item.is_added = !target
      toast('网络错误，操作未生效')
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
