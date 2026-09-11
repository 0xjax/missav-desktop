import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 片单面板优化：多列布局、智能排序（选中 > 标题匹配 > 用户选的第三级）。
// 面板是 Alpine x-for 渲染的 checkbox 列表，数据来自站点自身的
// /api/playlists/{视频id}——本模块不发任何网络请求。
// 第三级排序依据本地记录（0 请求），三种模式见 SORT_KEY：
//   recent = 最近操作（勾选/取消过该片单）
//   viewed = 最近观看（打开过该片单页）
//   name   = 名称（中文拼音）
// NOTE 已移除"片单数量"显示与数量排序：站点没有数量接口（片单列表页无数量字段，
// 片单详情页要为每个片单翻完所有分页才数得出），旧版靠"每 3 天全量备份"取数量，
// 请求成本与收益不成比例，且是 Cloudflare 人机验证的主要来源。

const USAGE_KEY = 'playlist-usage'
const SORT_KEY = 'playlist-sort'
const ITEM_SEL = 'input[x-model="playlist.is_added"]'

type SortMode = 'recent' | 'viewed' | 'name'
type UsageMap = Record<string, { op?: number; view?: number }>

function readUsage(): UsageMap {
  return GM_getValue<UsageMap>(USAGE_KEY, {})
}

// 记录一次操作/观看时间；限量 300 条，超出丢弃最早的一批
function stamp(key: string, field: 'op' | 'view'): void {
  const map = readUsage()
  map[key] = { ...map[key], [field]: Date.now() }
  const keys = Object.keys(map)
  if (keys.length > 300) keys.slice(0, 100).forEach((k) => delete map[k])
  GM_setValue(USAGE_KEY, map)
}

// 勾选/取消后记一笔，供「最近操作」排序用（由 fast-save 调用）
// NOTE 排序在面板渲染时（enhancePanel）才应用：勾选后当前页面不就地重排，
// 刷新/重开面板后新顺序才生效。实测符合预期——避免点击瞬间行位置跳动
export function recordPlaylistOp(key: string): void {
  stamp(key, 'op')
}

// /{lang}/playlists/<key> 页面加载时记一笔，供「最近观看」排序用。
// WARNING 末段要排除 create：/cn/playlists/create/<番号> 是功能页，不是片单
function recordPlaylistView(): void {
  const parts = location.pathname.split('/').filter(Boolean)
  const key = parts[parts.length - 1]
  if (!key || key === 'create' || parts[parts.length - 2] !== 'playlists') return
  stamp(key, 'view')
}

interface Row {
  el: HTMLElement
  key: string
  name: string
  checked: boolean
}

function enhancePanel(fieldset: Element): void {
  const inputs = [...fieldset.querySelectorAll(ITEM_SEL)] as HTMLInputElement[]
  if (!inputs.length) return
  const title = (document.querySelector('h1')?.textContent || '').toUpperCase()
  const videoId = (location.pathname.split('/').filter(Boolean).pop() || '').toUpperCase()

  const rows: Row[] = []
  for (const input of inputs) {
    const el = input.closest('div.flex')?.parentElement as HTMLElement | null
    if (!el || !el.classList.contains('relative')) continue
    const name = el.querySelector('label')?.textContent?.trim() || ''
    rows.push({ el, key: input.id, name, checked: input.checked })
  }
  if (!rows.length) return

  // 标题匹配：片单名出现在视频标题或番号里（女优名片单、系列片单如 MIMK/FC2）
  const matched = (name: string) =>
    name.length >= 2 && (title.includes(name.toUpperCase()) || videoId.startsWith(name.toUpperCase() + '-'))
  const tier = (r: Row) => (r.checked ? 0 : matched(r.name) ? 1 : 2)

  // 第三级：本地记录的时间戳降序（name 模式一律 0，退化成按名称排）
  const mode = GM_getValue<SortMode>(SORT_KEY, 'recent')
  const usage = readUsage()
  const usageTs = (key: string): number => {
    if (mode === 'name') return 0
    const u = usage[key]
    return (mode === 'viewed' ? u?.view : u?.op) ?? 0
  }
  rows.sort(
    (a, b) =>
      tier(a) - tier(b) ||
      usageTs(b.key) - usageTs(a.key) ||
      a.name.localeCompare(b.name, 'zh'),
  )

  // 幂等检查：观察器回调在我们的 DOM 改动之后异步触发，若增强已就位
  // 就直接返回，否则会反复重排形成死循环卡死页面
  const orderSame =
    fieldset.classList.contains('mx-pl-grid') &&
    rows.every((r, i) => r.el.style.order === String(i))
  if (orderSame) return

  // 只做纯视觉增强，绝不移动行节点：把 Alpine x-for 渲染的行 appendChild
  // 到别处会让部分行的 x-model effect 失效（is_added 变了但 checked 刷不上，
  // 表现为点了不勾选）。分列靠 fieldset 自身 display:grid，排序靠 CSS order，
  // <hr> 分割线和「建立片单」链接用 grid-column + order:-1 整行置顶（见 main.css）
  fieldset.classList.add('mx-pl-grid')
  rows.forEach((r, i) => {
    r.el.style.order = String(i)
  })
}

function scan(root: ParentNode): void {
  const input =
    root instanceof Element && root.matches(ITEM_SEL)
      ? (root as HTMLInputElement)
      : (root.querySelector?.(ITEM_SEL) as HTMLInputElement | null)
  if (!input) return
  const fieldset = input.closest('fieldset')
  if (fieldset) enhancePanel(fieldset)
}

export function playlistPanel(): void {
  recordPlaylistView()
  waitDOMContentLoaded(() => {
    scan(document)
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE) scan(n as Element)
        })
      }
    }).observe(document.body, { childList: true, subtree: true })
  })
}
