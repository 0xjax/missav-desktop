import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'

// 多源显示与切换：同一番号在站点有多个源（原版/无码流出/中文字幕），
// URL 后缀即源标识。详情页拉一次搜索页解析同源列表，在顶栏搜索图标左侧
// 渲染胶囊三档分段器（原版/无码/中字），当前源实色档位，点档位直达对应源。
// 顶栏是固定高度常驻区域，组件放这里从结构上杜绝下方内容布局跳动。

interface Source {
  id: string
  label: string
  color: string
  href: string
}

const SUFFIXES: [suffix: string, label: string, color: string][] = [
  ['-uncensored-leak', '无码', '#2563eb'],
  ['-chinese-subtitle', '中字', '#dc2626'],
]
const ORIGINAL: [string, string, string] = ['', '原版', '#4c566a']

// ---- 同源列表缓存：跨页面/跨会话（复观场景），7 天有效 ----

const CACHE_KEY = 'sources-cache'
const CACHE_TTL = 7 * 24 * 3600 * 1000
type SourcesCache = Record<string, { ts: number; list: Source[] }>

function readCache(): SourcesCache {
  return GM_getValue<SourcesCache>(CACHE_KEY, {})
}

function writeCache(base: string, list: Source[]): void {
  const cache = readCache()
  cache[base] = { ts: Date.now(), list }
  // 限量 500 条，超出丢弃最早的
  const keys = Object.keys(cache)
  if (keys.length > 500) keys.slice(0, 100).forEach((k) => delete cache[k])
  GM_setValue(CACHE_KEY, cache)
}

function parseVideoId(id: string): { base: string; suffix: string } | null {
  // fc2 等没有多源体系
  if (id.startsWith('fc2-')) return null
  for (const [suffix] of SUFFIXES) {
    if (id.endsWith(suffix)) return { base: id.slice(0, -suffix.length), suffix }
  }
  return { base: id, suffix: '' }
}

async function fetchSources(base: string, lang: string): Promise<Source[]> {
  const res = await fetch(`${location.origin}/${lang}/search/${base}?filters=individual`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const found = new Map<string, string>() // id -> href
  doc.querySelectorAll('.thumbnail a[href]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    const id = href.split('/').filter(Boolean).pop() || ''
    // 只收本番号及其已知后缀的源，排除 sone-6690 这类误匹配
    if (id === base || SUFFIXES.some(([s]) => id === base + s)) {
      if (!found.has(id)) found.set(id, href)
    }
  })
  const sources: Source[] = []
  for (const [suffix, label, color] of [ORIGINAL, ...SUFFIXES]) {
    const id = base + suffix
    const href = found.get(id)
    if (href) sources.push({ id, label, color, href })
  }
  return sources
}

// ---- 顶栏胶囊三档分段器 ----

// 渲染/更新分段器。锚定顶栏按钮组（搜索 a 的父级 flex 行），与齿轮同位置体系。
// 三态：拉取中（单颗骨架档）、可选（≥1 源，当前档实色）、锁定态不渲染整组
// （单源无切换意义，顶栏不留死控件）。列表页（无番号）整组不渲染。
function renderSegmented(
  sources: Source[],
  currentId: string,
  loading: boolean,
): void {
  // 两套响应式容器都要注入（同齿轮）；锚点组 = 搜索 a 的父级
  const groups = new Set<Element>()
  for (const a of document.querySelectorAll('a')) {
    if (a.getAttributeNames().some((n) => (a.getAttribute(n) || '').includes('toggleSearch')))
      groups.add(a.parentElement!)
  }
  if (!groups.size) return
  for (const group of groups) {
    if (loading && !sources.length) {
      // 骨架态：单颗灰胶囊，不拦截点击
      let seg = group.querySelector<HTMLDivElement>('[data-mx-seg]')
      if (!seg) {
        seg = document.createElement('div')
        seg.setAttribute('data-mx-seg', '')
        group.insertBefore(seg, group.querySelector('[data-setting-icon]'))
      }
      seg.innerHTML = '<span class="mx-seg mx-seg-skeleton">…</span>'
      continue
    }
    // 锁定态（仅当前一个源）：无切换意义，整组不渲染
    if (sources.length < 2) {
      group.querySelector('[data-mx-seg]')?.remove()
      continue
    }
    let seg = group.querySelector<HTMLDivElement>('[data-mx-seg]')
    if (!seg) {
      seg = document.createElement('div')
      seg.setAttribute('data-mx-seg', '')
      group.insertBefore(seg, group.querySelector('[data-setting-icon]'))
    }
    seg.className = 'mx-segmented'
    seg.replaceChildren(
      ...sources.map((s) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'mx-seg' + (s.id === currentId ? ' mx-seg-current' : '')
        b.textContent = s.label
        if (s.id === currentId) {
          b.style.background = s.color
          b.disabled = true
        } else {
          b.addEventListener('click', () => {
            location.href = s.href
          })
        }
        return b
      }),
    )
  }
}

// 详情页 URL 判据（document-start 即可算，不等 Vue 水合）：
// 末段为番号格式（前缀-数字 或 fc2-数字，可带源后缀）；排除 search 等功能路径
const ID_RE = /^[a-z]{2,6}-\d{2,6}(-[a-z-]+)?$/
const FC2_RE = /^fc2(-\d+)?(-[a-z-]+)?$/
const RESERVED = new Set(['search', 'new', 'best', 'genres', 'actresses', 'series', 'makers', 'leak', 'ranking', 'settings', 'login', 'register', 'dm4', 'dm539'])

function isVideoPath(): boolean {
  const parts = location.pathname.split('/').filter(Boolean)
  // 详情页路径两段起（dm 前缀段 + lang + 番号），末段必须是番号且不在保留词内
  const id = parts[parts.length - 1] || ''
  if (!id || RESERVED.has(id)) return false
  return ID_RE.test(id) || FC2_RE.test(id)
}

export function sources(): void {
  // 顶栏分段器放在固定高度常驻容器里，无布局跳动问题；
  // 等顶栏按钮组渲染出来（MutationObserver），番号判据 document-start 已可算
  if (!isVideoPath()) return

  const id = location.pathname.split('/').filter(Boolean).pop() || ''
  const parsed = parseVideoId(id)
  if (!parsed) return

  const curDef = [ORIGINAL, ...SUFFIXES].find(([s]) => s === parsed.suffix)!
  const current: Source = {
    id,
    label: curDef[1],
    color: curDef[2],
    href: location.href,
  }

  // 骨架态先行：顶栏一出就显示拉取中，无内容高度参与
  let injected = false
  const init = (): boolean => {
    if (injected) return true
    const hasGroup = [...document.querySelectorAll('a')].some((a) =>
      a.getAttributeNames().some((n) => (a.getAttribute(n) || '').includes('toggleSearch')),
    )
    if (!hasGroup) return false
    injected = true
    renderSegmented([], id, true)

    // 有新鲜缓存则直接渲染完整分段器，后台静默校验
    const cached = readCache()[parsed.base]
    const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL
    if (cacheFresh && cached.list.length >= 2) renderSegmented(cached.list, id, false)

    ;(async () => {
      try {
        const lang = currentLang() ?? 'cn'
        const list = await fetchSources(parsed.base, lang)
        if (!list.length) list.push(current)
        writeCache(parsed.base, list)
        // 缓存命中时只有内容变化才重渲染，无变化零感知
        if (!cacheFresh || list.map((s) => s.id).join() !== cached.list.map((s) => s.id).join()) {
          renderSegmented(list, id, false)
        }
      } catch {
        // 拉取失败：有缓存用缓存，否则保留骨架（下页重试）
        if (!cacheFresh) renderSegmented(cached?.list ?? [], id, false)
      }
    })()
    return true
  }

  if (init()) return
  const obs = new MutationObserver(() => {
    if (init()) obs.disconnect()
  })
  obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
  setTimeout(() => obs.disconnect(), 15000)
}