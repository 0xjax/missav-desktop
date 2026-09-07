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

function renderSwitcher(sources: Source[], currentId: string): void {
  const h1 = document.querySelector('h1')
  if (!h1) return
  const row = Object.assign(document.createElement('div'), {
    className: 'mx-sources',
    innerHTML:
      '<span class="mx-sources-label">源</span>' +
      sources
        .map(
          (s) =>
            `<a class="mx-src${s.id === currentId ? ' current' : ''}" ` +
            `style="background:${s.color}" href="${s.href}">${s.label}</a>`,
        )
        .join(''),
  })
  // 当前源不可点
  const cur = row.querySelector('.mx-src.current')
  cur?.removeAttribute('href')
  h1.after(row)
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
    try {
      const lang = currentLang() ?? 'cn'
      const list = await fetchSources(parsed.base, lang)
      // 多源才显示切换行；单源但当前带后缀时也显示（补回详情页缺失的标识）
      if (list.length < 2 && !parsed.suffix) return
      renderSwitcher(list, id)
    } catch {
      // 搜索页拉取失败静默降级，不影响详情页
    }
  })
}
