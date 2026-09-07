export const LANG_RE = /^(cn|en|ja|ko|ms|th|de|fr|vi|id|pt)$/

// 从当前 URL 路径提取语言段（无语言段时返回 null）
export function currentLang(): string | null {
  return (
    location.pathname.split('/').filter(Boolean).find((s) => LANG_RE.test(s)) ??
    null
  )
}
