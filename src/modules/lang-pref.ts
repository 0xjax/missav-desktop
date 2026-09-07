import { GM_getValue, GM_setValue } from '../utils/gm.ts'

// 站点支持的语言码
const LANGS = ['cn', 'en', 'ja', 'ko', 'ms', 'th', 'de', 'fr', 'vi', 'id', 'pt']

// 语言菜单项的显示文本（各语言的自称，不随界面语言变化）
const LANG_NAMES: Record<string, string> = {
  简体中文: 'cn',
  English: 'en',
  日本語: 'ja',
  한국의: 'ko',
  Melayu: 'ms',
  ไทย: 'th',
  Deutsch: 'de',
  Français: 'fr',
  'Tiếng Việt': 'vi',
  'Bahasa Indonesia': 'id',
  Português: 'pt',
}

interface ParsedPath {
  shard: string | null // dm\d+ CDN 分片段
  lang: string | null // 语言段
  rest: string[] // 其余路径段
}

function parsePath(pathname: string): ParsedPath {
  const segs = pathname.split('/').filter(Boolean)
  let shard: string | null = null
  let lang: string | null = null
  if (segs[0] && /^dm\d+$/.test(segs[0])) shard = segs.shift()!
  if (segs[0] && LANGS.includes(segs[0])) lang = segs.shift()!
  return { shard, lang, rest: segs }
}

// 复用站内语言切换器作为偏好入口：
// 菜单项文本是各语言自称（视频页里链接带完整路径，不能用路径形态判断），
// 命中后从 href 的语言段提取偏好保存
function watchSwitcher(): void {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element).closest?.('a[href]')
      if (!a) return
      const name = a.textContent?.trim() ?? ''
      const lang = LANG_NAMES[name]
      if (!lang) return
      const parsed = parsePath(
        new URL((a as HTMLAnchorElement).href, location.origin).pathname,
      )
      if (parsed.lang === lang && LANGS.includes(lang))
        GM_setValue('pref-lang', lang)
    },
    true,
  )
}

// document-start 执行：URL 语言与偏好不一致时在渲染前跳转
export function preferLang(): void {
  watchSwitcher()
  const pref = GM_getValue<string | null>('pref-lang', null)
  if (!pref || !LANGS.includes(pref)) return
  const { shard, lang, rest } = parsePath(location.pathname)
  if (lang === pref) return
  // 防死循环：偏好语言版本不存在被站点弹回时，同一偏好+路径只跳一次
  const key = `lang-redirected:${pref}:${location.pathname}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  const target = '/' + [shard, pref, ...rest].filter(Boolean).join('/')
  location.replace(target + location.search + location.hash)
}
