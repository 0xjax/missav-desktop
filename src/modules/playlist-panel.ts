import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 片单面板优化：多列布局、数量显示、智能排序（选中 > 标题匹配 > 数量降序）。
// 面板是 Alpine x-for 渲染的 checkbox 列表（数据来自 /api/playlists/{视频id}，
// 无数量字段）；数量来自备份快照，勾选时本地 ±1 保持准确。

const COUNTS_KEY = 'playlist-counts'
const ITEM_SEL = 'input[x-model="playlist.is_added"]'

export function readPlaylistCounts(): Record<string, number> {
  const map = GM_getValue<Record<string, number>>(COUNTS_KEY, {})
  if (Object.keys(map).length) return map
  // 数量表为空时从最近的备份快照兜底（老用户已有快照，不必等下次备份）
  const snaps = GM_getValue<{ playlists?: { key: string; videos: unknown[] }[] }[]>(
    'backup-snapshots',
    [],
  )
  snaps[0]?.playlists?.forEach((p) => (map[p.key] = p.videos.length))
  return map
}

// 备份快照写入时整体刷新数量表（快照是真值来源，顺带清掉累计误差）
export function setPlaylistCounts(map: Record<string, number>): void {
  GM_setValue(COUNTS_KEY, map)
}

// 勾选/取消成功后本地 ±1；面板开着则同步界面上的数字
export function adjustPlaylistCount(key: string, delta: number): void {
  const map = readPlaylistCounts()
  if (!(key in map)) return
  map[key] = Math.max(0, map[key] + delta)
  GM_setValue(COUNTS_KEY, map)
  const span = document
    .querySelector(`input[id="${key}"]`)
    ?.closest('div.relative')
    ?.querySelector('.mx-pl-count')
  if (span) span.textContent = `(${map[key]})`
}

interface Row {
  el: HTMLElement
  key: string
  name: string
  checked: boolean
  count: number | undefined
}

function enhancePanel(fieldset: Element): void {
  const inputs = [...fieldset.querySelectorAll(ITEM_SEL)] as HTMLInputElement[]
  if (!inputs.length) return
  const counts = readPlaylistCounts()
  const title = (document.querySelector('h1')?.textContent || '').toUpperCase()
  const videoId = (location.pathname.split('/').filter(Boolean).pop() || '').toUpperCase()

  const rows: Row[] = []
  for (const input of inputs) {
    const el = input.closest('div.flex')?.parentElement as HTMLElement | null
    if (!el || !el.classList.contains('relative')) continue
    const name = el.querySelector('label')?.textContent?.trim() || ''
    rows.push({ el, key: input.id, name, checked: input.checked, count: counts[input.id] })
  }
  if (!rows.length) return

  // 标题匹配：片单名出现在视频标题或番号里（女优名片单、系列片单如 MIMK/FC2）
  const matched = (name: string) =>
    name.length >= 2 && (title.includes(name.toUpperCase()) || videoId.startsWith(name.toUpperCase() + '-'))
  const tier = (r: Row) => (r.checked ? 0 : matched(r.name) ? 1 : 2)
  rows.sort(
    (a, b) =>
      tier(a) - tier(b) ||
      (b.count ?? -1) - (a.count ?? -1) ||
      a.name.localeCompare(b.name, 'zh'),
  )

  // 幂等检查：观察器回调在我们的 DOM 改动之后异步触发，若增强已就位
  // 就直接返回，否则会反复重排形成死循环卡死页面
  const orderSame =
    fieldset.classList.contains('mx-pl-grid') &&
    rows.every((r, i) => r.el.style.order === String(i))
  const spansOk = rows.every((r) => {
    if (r.count === undefined) return true
    return r.el.querySelector('.mx-pl-count')?.textContent === `(${r.count})`
  })
  if (orderSame && spansOk) return

  // 只做纯视觉增强，绝不移动行节点：把 Alpine x-for 渲染的行 appendChild
  // 到别处会让部分行的 x-model effect 失效（is_added 变了但 checked 刷不上，
  // 表现为点了不勾选）。分列靠 fieldset 自身 display:grid，排序靠 CSS order，
  // <hr> 分割线和「建立片单」链接用 grid-column + order:-1 整行置顶（见 main.css）
  fieldset.classList.add('mx-pl-grid')
  rows.forEach((r, i) => {
    r.el.style.order = String(i)
    const label = r.el.querySelector('label')
    if (!label || r.count === undefined) return
    let span = r.el.querySelector('.mx-pl-count')
    if (!span) {
      span = Object.assign(document.createElement('span'), { className: 'mx-pl-count' })
      label.after(span)
    }
    span.textContent = `(${r.count})`
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
