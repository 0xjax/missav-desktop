import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { t, type I18nKey } from '../utils/i18n.ts'

// 多源显示与切换：同一番号在站点有多个源（原版/无码流出/中字/英字），详情页拉一次，
// 在顶栏搜索图标左侧渲染胶囊分段器，当前源实色档位，点档位直达对应源。
// 兄弟源列表以**站点自己的版本切换菜单**为准（`[aria-labelledby=download-option-menu-button]`，
// 只出现在裸番号主条目页的 SSR 里；实测每个番号都有裸页，菜单列的就是全部兄弟源）；
// 同语言搜索页只用来给裸番号定类型（徽章）。源类型判据：URL 后缀（自带字幕语言，最精确）
// → 搜索卡片左下角徽章 class（只判"是否字幕/无码"）→ 原版兜底。
// WARNING 不能只靠搜索页：实测 sdmf-009 / har-050 / umd-971 / har-068 等番号搜索页
// 一张匹配卡片都不返回，而站点菜单列着兄弟源——只用搜索页时分段器只剩当前档。
// NOTE 无后缀 id 也可能是字幕版（如 fneo-014），纯后缀判断会误判成原版。
// NOTE 档位链接一律按当前站点语言拼 `/{lang}/{id}`：缓存不分语言，若存下别的语言的
// 链接，点击会先跳英文页再被 lang-pref 弹回中文（实测页面中英来回跳）。
// 顶栏是固定高度常驻区域，组件放这里从结构上杜绝下方内容布局跳动。

interface Source {
  id: string
  kind: Kind
}

type Kind = 'original' | 'uncensored' | 'cnsub' | 'ensub'

// 源类型 → 文案键/配色；顺序即分段器排列顺序（原版→无码→中字→英字）。
// 文案在渲染时取（见 labelOf），缓存只存 kind，避免切站点语言后残留旧语言标签
const KINDS: [Kind, I18nKey, string][] = [
  ['original', 'source.original', '#4c566a'],
  ['uncensored', 'source.uncensored', '#2563eb'],
  ['cnsub', 'source.cnsub', '#dc2626'],
  ['ensub', 'source.ensub', '#dc2626'],
]

const KIND_ORDER = new Map(KINDS.map(([kind], i) => [kind, i]))

// URL 后缀 → 源类型：字幕后缀自带语言，比徽章更精确
const SUFFIX_KIND: [string, Kind][] = [
  ['-uncensored-leak', 'uncensored'],
  ['-chinese-subtitle', 'cnsub'],
  ['-english-subtitle', 'ensub'],
]

// 搜索卡片左下角徽章 class：红=字幕版、蓝=无码版。徽章文本会本地化
// （中文字幕/English subtitle/…），class 跨语言稳定；但它不区分字幕语言。
// WARNING 只能读搜索页的 SSR 卡片：详情页的推荐卡片每张同时含 3 个徽章 span
// （中文字幕/英文字幕/无码影片，靠站点 x-show 切换可见性），在活 DOM 上
// querySelector 会永远命中第一个 bg-red-800，把全部条目判成字幕版
const BADGE_SEL = 'span.absolute.bottom-1.left-1'
const BADGE_KIND: [string, 'subtitle' | 'uncensored'][] = [
  ['bg-red-800', 'subtitle'],
  ['bg-blue-800', 'uncensored'],
]

function kindOf(id: string, badgeCls: string | null, lang: string): Kind {
  const bySuffix = SUFFIX_KIND.find(([suffix]) => id.endsWith(suffix))?.[1]
  if (bySuffix) return bySuffix
  const byBadge = badgeCls
    ? BADGE_KIND.find(([cls]) => badgeCls.includes(cls))?.[1]
    : undefined
  if (byBadge === 'uncensored') return 'uncensored'
  // 裸番号带字幕徽章：搜索页按语言过滤，出现在 /cn 的是中字版、/en 的是英字版
  if (byBadge === 'subtitle') return lang === 'cn' ? 'cnsub' : 'ensub'
  return 'original'
}

// 源类型：后缀最精确（自带字幕语言）→ 搜索页徽章（给裸番号定类型）→ 原版
function kindOfId(id: string, badgeKind: Kind | undefined): Kind {
  return SUFFIX_KIND.find(([suffix]) => id.endsWith(suffix))?.[1] ?? badgeKind ?? 'original'
}

function labelOf(kind: Kind): [string, string] {
  const def = KINDS.find(([k]) => k === kind)!
  return [t(def[1]), def[2]]
}

// ---- 同源列表缓存：跨页面/跨会话（复观场景），7 天有效 ----

// NOTE 缓存条目从"存 href"改为"只存 id + kind"（href 按当前站点语言在渲染时拼），
// 旧形状不兼容故换 key；条目键用纯番号：兄弟源列表与站点语言无关
const CACHE_KEY = 'sources-cache-v5'
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

// 裸番号主条目页里的版本切换菜单 = 站点给出的全部兄弟源（不含当前条目自己）
const MENU_SEL = '[aria-labelledby="download-option-menu-button"]'

async function fetchMenuIds(base: string, lang: string): Promise<string[] | null> {
  const res = await fetch(`${location.origin}/${lang}/${base}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const menu = doc.querySelector(MENU_SEL)
  if (!menu) return null
  return [...menu.querySelectorAll('a[href]')]
    .map((a) => a.getAttribute('href')?.split('/').filter(Boolean).pop() || '')
    .filter((id) => id === base || SUFFIX_KIND.some(([suffix]) => id === base + suffix))
}

// 搜索页只取类型（徽章）：裸番号可能是中字版（fneo-014），后缀判不出来
async function fetchBadges(base: string, lang: string): Promise<Map<string, Kind>> {
  const res = await fetch(`${location.origin}/${lang}/search/${base}?filters=individual`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const badges = new Map<string, Kind>()
  doc.querySelectorAll('.thumbnail').forEach((card) => {
    const id = card.querySelector('a[href]')?.getAttribute('href')?.split('/').filter(Boolean).pop() || ''
    // 只收本番号及其已知后缀的源，排除 sone-6690 这类误匹配
    if (id !== base && !SUFFIX_KIND.some(([suffix]) => id === base + suffix)) return
    if (badges.has(id)) return
    badges.set(id, kindOf(id, card.querySelector(BADGE_SEL)?.className ?? null, lang))
  })
  return badges
}

// ---- 顶栏胶囊分段器 ----

// 渲染/更新分段器。锚定顶栏按钮组（搜索 a 的父级 flex 行），与齿轮同位置体系。
// 始终显示，按源数自适应形态：拉取中（单颗骨架档）、单源（单档锁定态，当前源
// 实色但禁用）、多源（多档可选，当前档实色）。列表页（无番号）整组不渲染。
function renderSegmented(
  sources: Source[],
  currentId: string,
  loading: boolean,
): void {
  const lang = currentLang() ?? 'cn'
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
            // 一律按当前站点语言拼链接，避免跳到别的语言页被 lang-pref 弹回
            location.href = `/${lang}/${s.id}`
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

  const current: Source = { id, kind: parsed.kind }
  const lang = currentLang() ?? 'cn'
  const cacheKey = parsed.base

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
        // 菜单是权威兄弟列表；搜索页只供徽章，失败只影响裸番号的类型判定
        const [menuIds, badges] = await Promise.all([
          fetchMenuIds(parsed.base, lang),
          fetchBadges(parsed.base, lang).catch(() => null),
        ])
        // 搜索页失败时用上次缓存的类型兜底，避免裸番号类型忽原忽中
        const cachedKind = (x: string): Kind | undefined =>
          cached?.list.find((s) => s.id === x)?.kind
        const ids = new Set<string>([
          parsed.base,
          id,
          ...(menuIds ?? []),
          ...(badges?.keys() ?? []),
        ])
        const list = [...ids]
          .map((x) => ({ id: x, kind: kindOfId(x, badges?.get(x) ?? cachedKind(x)) }))
          .sort((a, b) => KIND_ORDER.get(a.kind)! - KIND_ORDER.get(b.kind)!)
        // 搜索页没拿到徽章时不写缓存：裸番号类型可能判错，别固化 7 天
        if (badges) writeCache(cacheKey, list)
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