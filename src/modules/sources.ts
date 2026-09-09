import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { t, type I18nKey } from '../utils/i18n.ts'

// 多源显示与切换：同一番号在站点有多个源（原版/无码流出/字幕版），详情页拉一次
// 搜索页解析同源列表，在顶栏搜索图标左侧渲染胶囊分段器（原版/无码/中字），
// 当前源实色档位，点档位直达对应源。
// 源类型判据按可信度：搜索卡片左下角徽章 class（主判据，跨语言稳定）→ URL 后缀
// （兜底，站点偶有徽章缺失的条目，如 iesp-390-uncensored-leak）。
// NOTE 无后缀 id 也可能是字幕版（如 fneo-014），纯后缀判断会误判成原版。
// 顶栏是固定高度常驻区域，组件放这里从结构上杜绝下方内容布局跳动。

interface Source {
  id: string
  kind: Kind
  href: string
}

type Kind = 'original' | 'uncensored' | 'subtitle'

// 源类型 → 文案键/配色；顺序即分段器排列顺序。
// 文案在渲染时取（见 labelOf），缓存只存 kind，避免切站点语言后残留旧语言标签
const KINDS: [Kind, I18nKey, string][] = [
  ['original', 'source.original', '#4c566a'],
  ['uncensored', 'source.uncensored', '#2563eb'],
  ['subtitle', 'source.subtitle', '#dc2626'],
]

// URL 后缀 → 源类型（兜底判据）：中字后缀随站语言不同（/cn 中字、/en 英字）
const SUFFIX_KIND: [string, Kind][] = [
  ['-uncensored-leak', 'uncensored'],
  ['-chinese-subtitle', 'subtitle'],
  ['-english-subtitle', 'subtitle'],
]

// 搜索卡片左下角徽章 class → 源类型（主判据）：红=字幕版、蓝=无码版。
// 徽章文本会本地化（中文字幕/English subtitle/…），class 跨语言稳定
const BADGE_SEL = 'span.absolute.bottom-1.left-1'
const BADGE_KIND: [string, Kind][] = [
  ['bg-red-800', 'subtitle'],
  ['bg-blue-800', 'uncensored'],
]

function kindOf(id: string, badgeCls: string | null): Kind {
  if (badgeCls) {
    const hit = BADGE_KIND.find(([cls]) => badgeCls.includes(cls))
    if (hit) return hit[1]
  }
  return SUFFIX_KIND.find(([suffix]) => id.endsWith(suffix))?.[1] ?? 'original'
}

function labelOf(kind: Kind): [string, string] {
  const def = KINDS.find(([k]) => k === kind)!
  return [t(def[1]), def[2]]
}

// ---- 同源列表缓存：跨页面/跨会话（复观场景），7 天有效 ----

// NOTE 缓存结构从"存标签"改为"存 kind"（标签随站点语言变），旧缓存形状不兼容，故换 key；
// 条目键带站点语言前缀：搜索页按语言过滤源，同番号在 cn/en 下的源集合本就不同，
// 不分语言会把中文站点的列表渲染到英文站点上
const CACHE_KEY = 'sources-cache-v3'
const CACHE_TTL = 7 * 24 * 3600 * 1000
type SourcesCache = Record<string, { ts: number; list: Source[] }>

function readCache(): SourcesCache {
  return GM_getValue<SourcesCache>(CACHE_KEY, {})
}

function writeCache(cacheKey: string, list: Source[]): void {
  const cache = readCache()
  cache[cacheKey] = { ts: Date.now(), list }
  // 限量 500 条，超出丢弃最早的
  const keys = Object.keys(cache)
  if (keys.length > 500) keys.slice(0, 100).forEach((k) => delete cache[k])
  GM_setValue(CACHE_KEY, cache)
}

function parseVideoId(id: string): { base: string; kind: Kind } | null {
  // fc2 等没有多源体系
  if (id.startsWith('fc2-')) return null
  for (const [suffix, kind] of SUFFIX_KIND) {
    if (id.endsWith(suffix)) return { base: id.slice(0, -suffix.length), kind }
  }
  return { base: id, kind: 'original' }
}

async function fetchSources(
  base: string,
  lang: string,
  current: Source,
): Promise<Source[]> {
  const res = await fetch(`${location.origin}/${lang}/search/${base}?filters=individual`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const found = new Map<string, { href: string; kind: Kind }>()
  doc.querySelectorAll('.thumbnail').forEach((card) => {
    const href = card.querySelector('a[href]')?.getAttribute('href') || ''
    const id = href.split('/').filter(Boolean).pop() || ''
    // 只收本番号及其已知后缀的源，排除 sone-6690 这类误匹配
    if (id !== base && !SUFFIX_KIND.some(([suffix]) => id === base + suffix)) return
    if (found.has(id)) return
    const badgeCls = card.querySelector(BADGE_SEL)?.className ?? null
    found.set(id, { href, kind: kindOf(id, badgeCls) })
  })
  // WARNING 搜索页按站点语言过滤源：当前页是"非该语言"的版本时连自己都不返回
  // （实测 /en/search 对中文字幕裸番号页 sdmf-008/ipx-988 漏掉该 id），
  // 必须把当前源补回，否则分段器没有当前档、只剩可跳转的兄弟档
  if (!found.has(current.id)) found.set(current.id, { href: current.href, kind: current.kind })
  const sources: Source[] = []
  // 按原版→无码→字幕排序，分段器档位顺序稳定
  for (const [kind] of KINDS) {
    for (const [id, v] of found) {
      if (v.kind === kind) sources.push({ id, kind, href: v.href })
    }
  }
  return sources
}

// ---- 顶栏胶囊三档分段器 ----

// 渲染/更新分段器。锚定顶栏按钮组（搜索 a 的父级 flex 行），与齿轮同位置体系。
// 始终显示，按源数自适应形态：拉取中（单颗骨架档）、单源（单档锁定态，当前源
// 实色但禁用）、双/三源（多档可选，当前档实色）。列表页（无番号）整组不渲染。
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
    let seg = group.querySelector<HTMLDivElement>('[data-mx-seg]')
    if (!seg) {
      seg = document.createElement('div')
      seg.setAttribute('data-mx-seg', '')
      // 位置：搜索图标左侧（insertBefore 搜索 a 本身），图标们靠右、分段器靠中间
      const searchA = [...group.querySelectorAll('a')].find((a) =>
        a.getAttributeNames().some((n) => (a.getAttribute(n) || '').includes('toggleSearch')),
      )
      group.insertBefore(seg, searchA ?? group.querySelector('[data-setting-icon]'))
    }
    if (loading && !sources.length) {
      // 骨架态：单颗灰胶囊，不拦截点击
      seg.className = ''
      seg.innerHTML = '<span class="mx-seg mx-seg-skeleton">…</span>'
      continue
    }
    seg.className = 'mx-segmented'
    seg.replaceChildren(
      ...sources.map((s) => {
        const [label, color] = labelOf(s.kind)
        const b = document.createElement('button')
        b.type = 'button'
        const isCurrent = s.id === currentId
        b.className = 'mx-seg' + (isCurrent ? ' mx-seg-current' : '')
        b.textContent = label
        if (isCurrent) {
          // 当前档实色；单源时额外加锁定态（无切换意义，仅作标识）
          b.style.background = color
          b.disabled = true
          if (sources.length < 2) b.classList.add('mx-seg-locked')
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

  const current: Source = {
    id,
    kind: parsed.kind,
    href: location.href,
  }
  const lang = currentLang() ?? 'cn'
  const cacheKey = `${lang}:${parsed.base}`

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
    const cached = readCache()[cacheKey]
    const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL
    if (cacheFresh && cached.list.length) renderSegmented(cached.list, id, false)

    ;(async () => {
      try {
        const list = await fetchSources(parsed.base, lang, current)
        writeCache(cacheKey, list)
        // 缓存命中时只有内容变化才重渲染，无变化零感知
        if (!cacheFresh || list.map((s) => s.id).join() !== cached.list.map((s) => s.id).join()) {
          renderSegmented(list, id, false)
        }
      } catch {
        // 拉取失败：有缓存用缓存，否则只显示当前源（下页重试）
        if (!cacheFresh) renderSegmented(cached?.list ?? [current], id, false)
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