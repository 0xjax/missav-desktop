import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'

// 多源显示与切换：同一番号在站点有多个源（原版/无码流出/中文字幕），
// URL 后缀即源标识。详情页拉一次搜索页解析同源列表，在标题下方
// 嵌入与卡片徽标同风格的切换行，当前源高亮。

interface Source {
  id: string
  label: string
  color: string
  href: string
}

const SUFFIXES: [suffix: string, label: string, color: string][] = [
  ['-uncensored-leak', '无码影片', '#1e40af'],
  ['-chinese-subtitle', '中文字幕', '#991b1b'],
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

function renderSwitcher(
  sources: Source[],
  currentId: string,
  loading: boolean,
): void {
  const h1 = document.querySelector('h1')
  if (!h1) return
  const row =
    document.querySelector('.mx-sources') ??
    Object.assign(document.createElement('div'), { className: 'mx-sources' })
  row.innerHTML =
    '<span class="mx-sources-label">源</span>' +
    sources
      .map(
        (s) =>
          `<a class="mx-src${s.id === currentId ? ' current' : ''}" ` +
          `style="background:${s.color}" href="${s.href}">${s.label}</a>`,
      )
      .join('') +
    (loading ? '<span class="mx-src mx-loading">…</span>' : '')
  // 当前源不可点
  row.querySelector('.mx-src.current')?.removeAttribute('href')
  if (!row.isConnected) h1.after(row)
}

export function sources(): void {
  // 脚本在 document-start 运行：等 DOMContentLoaded 会让插入发生在首帧之后，
  // 造成高度 0 突变。改用 MutationObserver 在收藏按钮（详情页标志）
  // 解析出来的同一帧内插入切换行，消除布局跳动。
  let done = false
  const init = (): boolean => {
    if (done) return true
    const isVideoPage = [...document.querySelectorAll('button')].some((b) =>
      b
        .getAttributeNames()
        .some(
          (n) =>
            n.startsWith('@click') &&
            (b.getAttribute(n) || '').includes('toggleSave'),
        ),
    )
    if (!isVideoPage) return false
    done = true

    const id = location.pathname.split('/').filter(Boolean).pop() || ''
    const parsed = parseVideoId(id)
    if (!parsed) return true

    const curDef = [ORIGINAL, ...SUFFIXES].find(([s]) => s === parsed.suffix)!
    const current: Source = {
      id,
      label: curDef[1],
      color: curDef[2],
      href: location.href,
    }
    renderSwitcher([current], id, true)

    // 有新鲜缓存则直接渲染完整列表，后台静默校验
    const cached = readCache()[parsed.base]
    const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL
    if (cacheFresh) renderSwitcher(cached.list, id, false)

    ;(async () => {
      try {
        const lang = currentLang() ?? 'cn'
        const list = await fetchSources(parsed.base, lang)
        if (!list.length) list.push(current)
        writeCache(parsed.base, list)
        // 缓存命中时只有内容变化才重渲染，无变化零感知
        if (!cacheFresh || list.map((s) => s.id).join() !== cached.list.map((s) => s.id).join()) {
          renderSwitcher(list, id, false)
        }
      } catch {
        // 拉取失败：有缓存用缓存，否则只保留当前源标识
        if (!cacheFresh) renderSwitcher([current], id, false)
      }
    })()
    return true
  }

  if (init()) return
  const obs = new MutationObserver(() => {
    if (init()) obs.disconnect()
  })
  obs.observe(document.documentElement, { childList: true, subtree: true })
  setTimeout(() => obs.disconnect(), 15000)
}
