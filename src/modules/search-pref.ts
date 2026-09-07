import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

declare global {
  interface Window {
    Cookies?: {
      get(name: string): string | undefined
      set(name: string, value: string, options?: object): void
    }
  }
}

const LANG_RE = /^(cn|en|ja|ko|ms|th|de|fr|vi|id|pt)$/

function currentLang(): string | null {
  return (
    location.pathname.split('/').filter(Boolean).find((s) => LANG_RE.test(s)) ??
    null
  )
}

// 记忆：点击过滤/排序链接时保存整组参数（链接 href 已包含当前组合，
// 「所有」不带 filters 参数，天然表示清除过滤偏好）
function watchParamLinks(): void {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element).closest?.(
        'a[href*="/search/"]',
      ) as HTMLAnchorElement | null
      if (!a) return
      const params = new URL(a.href, location.origin).searchParams
      if (!params.has('filters') && !params.has('sort')) return
      GM_setValue('search-filters', params.get('filters'))
      GM_setValue('search-sort', params.get('sort'))
    },
    true,
  )
}

// 与站点 search() 行为一致：维护搜索历史 cookie（keyword 已编码）
function recordHistory(keyword: string): void {
  try {
    const raw = window.Cookies?.get('search_history')
    const history: string[] = raw ? JSON.parse(raw) : []
    const i = history.indexOf(keyword)
    if (i !== -1) history.splice(i, 1)
    history.unshift(keyword)
    window.Cookies?.set('search_history', JSON.stringify(history), {
      expires: 365,
    })
  } catch {
    // 历史记录失败不影响搜索
  }
}

function navigateWithPrefs(keyword: string): void {
  const kw = encodeURIComponent(keyword.trim().replace('\\', ''))
  if (!kw) return
  recordHistory(kw)
  const lang = currentLang() ?? GM_getValue<string | null>('pref-lang', null)
  const filters = GM_getValue<string | null>('search-filters', null)
  const sort = GM_getValue<string | null>('search-sort', null)
  const params = new URLSearchParams()
  if (filters) params.set('filters', filters)
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  location.href = `${lang ? `/${lang}` : ''}/search/${kw}${qs ? `?${qs}` : ''}`
}

// 应用：拦截搜索表单提交与历史链接点击，直接带偏好参数导航（零跳转）
function interceptSearch(): void {
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target as HTMLFormElement
      if (!form.getAttribute('@submit.prevent')?.includes('search(')) return
      const input = form.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement | null
      if (!input) return
      e.preventDefault()
      e.stopImmediatePropagation()
      navigateWithPrefs(input.value)
    },
    true,
  )
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element).closest?.(
        'a[href="#"]',
      ) as HTMLAnchorElement | null
      if (!a?.getAttribute('@click.prevent')?.includes('search(')) return
      e.preventDefault()
      e.stopImmediatePropagation()
      navigateWithPrefs(a.textContent ?? '')
    },
    true,
  )
}

// 兜底：落在无参数搜索页且已存偏好时，渲染前补参数（同一组合+路径只跳一次）
function applyPrefsToBareSearch(): void {
  if (!/\/search\/[^/]+/.test(location.pathname)) return
  if (/[?&](filters|sort)=/.test(location.search)) return
  const filters = GM_getValue<string | null>('search-filters', null)
  const sort = GM_getValue<string | null>('search-sort', null)
  if (!filters && !sort) return
  const key = `search-redirected:${filters}:${sort}:${location.pathname}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  const params = new URLSearchParams()
  if (filters) params.set('filters', filters)
  if (sort) params.set('sort', sort)
  location.replace(`${location.pathname}?${params}${location.hash}`)
}

export function searchPref(): void {
  applyPrefsToBareSearch()
  waitDOMContentLoaded(() => {
    watchParamLinks()
    interceptSearch()
  })
}
