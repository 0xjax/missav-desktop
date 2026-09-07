import { currentLang } from '../utils/lang.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

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
  waitDOMContentLoaded(async () => {
    // 详情页特征：有收藏按钮
    const isVideoPage = [...document.querySelectorAll('button')].some((b) =>
      b
        .getAttributeNames()
        .some(
          (n) =>
            n.startsWith('@click') &&
            (b.getAttribute(n) || '').includes('toggleSave'),
        ),
    )
    if (!isVideoPage) return
    const id = location.pathname.split('/').filter(Boolean).pop() || ''
    const parsed = parseVideoId(id)
    if (!parsed) return

    // 当前源从 URL 即可判断，立即渲染占位行，高度固定不跳动；
    // 搜索结果返回后只追加其他源徽章
    const curDef = [ORIGINAL, ...SUFFIXES].find(([s]) => s === parsed.suffix)!
    const current: Source = {
      id,
      label: curDef[1],
      color: curDef[2],
      href: location.href,
    }
    renderSwitcher([current], id, true)

    try {
      const lang = currentLang() ?? 'cn'
      const list = await fetchSources(parsed.base, lang)
      if (!list.length) list.push(current)
      renderSwitcher(list, id, false)
    } catch {
      // 搜索页拉取失败则只保留当前源标识
      renderSwitcher([current], id, false)
    }
  })
}
