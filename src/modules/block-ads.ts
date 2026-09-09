import { waitDOMContentLoaded } from '../utils/wait.ts'
import { hijackMainWorld } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { t, type I18nKey } from '../utils/i18n.ts'

// 广告域名黑名单（比站点的 hash 类名稳定），漏广告时在此补充
const AD_HOSTS = [
  'mayzaent.com',
  'rallytrck.website',
  'myavlive.com',
  'snaptrckr.fun',
  // 页脚/下拉里的小广告：短链与友联伪装的推广站
  'bit.ly',
  'jerkdolls.com',
  'theporndude.com',
  // 详情页/页脚广告位的 SDK 脚本源
  'tsyndicate.com',
]

// 保留但精简文字的推广链接：不删，只把冗长文案改短（替换文案随站点语言）
const RENAME_LINKS: [host: string, text: I18nKey][] = [['mycomic.com', 'ad.manga']]

// 命中重命名列表则改写文字并返回 true（调用方跳过后续删除逻辑）
function renameLink(el: Element): boolean {
  if (el.tagName !== 'A') return false
  const href = el.getAttribute('href')
  const hit = RENAME_LINKS.find(([host]) => href?.includes(host))
  if (!hit) return false
  const want = t(hit[1])
  if (el.textContent?.trim() !== want) el.textContent = want
  return true
}

// 广告位结构特征（无 src 的广告槽等无法用域名匹配的情况）
const AD_SELECTORS = [
  '[id^="ts_ms_"]',
  'iframe[width="1"][height="1"]:not([src])',
  // 页脚整列纯广告（电报群/漫画/vpn 等），连列带间距整体移除
  'ul.list-none.text-nord14',
]

// 纯广告菜单：文案匹配（类名是通用 Tailwind，不可靠）。
// 站点文案随语言本地化，故按站点语言取表；表未覆盖的语言退化为不匹配（少删不误删）
const AD_MENU_TEXTS: Record<string, string[]> = {
  cn: ['更多好站'],
  en: ['More sites'],
}

function matchAdMenu(el: Element): boolean {
  if (el.tagName !== 'A') return false
  const text = el.textContent?.trim() ?? ''
  const texts = AD_MENU_TEXTS[currentLang() ?? '']
  return !!texts?.some((t) => text.startsWith(t))
}

function isAdUrl(url: string | null): boolean {
  return !!url && AD_HOSTS.some((host) => url.includes(host))
}

// 尽量连同纯占位容器一起移除以回收空白；
// 容器内除广告外还有其他内容时只删广告元素本身，防误伤
function removeWithWrapper(el: Element): void {
  let target = el
  for (let i = 0; i < 2; i++) {
    const parent = target.parentElement
    if (!parent || parent === document.body) break
    const siblings = Array.from(parent.children).filter((c) => c !== target)
    if (siblings.length > 0 || parent.textContent?.trim()) break
    target = parent
  }
  target.remove()
}

function matchAdUrl(el: Element): boolean {
  return isAdUrl(el.getAttribute('src') ?? el.getAttribute('href'))
}

function matchAdEl(el: Element): boolean {
  return (
    matchAdUrl(el) || AD_SELECTORS.some((sel) => el.matches(sel))
  )
}

// 右下角悬浮广告：类名是构建 hash 不稳定，改用结构特征匹配
// （body 直接子级 + 极高 z-index 的 fixed 定位）
function isFloatingShell(el: Element): boolean {
  if (el.id === 'setting-panel') return false
  const cs = getComputedStyle(el)
  return cs.position === 'fixed' && parseInt(cs.zIndex) >= 1000000
}

function scanFloatingAds(): void {
  document.body.querySelectorAll(':scope > div').forEach((el) => {
    if (!isFloatingShell(el)) return
    const hasAdContent =
      el.querySelector('iframe') !== null ||
      Array.from(el.querySelectorAll('a[href]')).some(matchAdUrl)
    if (hasAdContent) el.remove()
  })
}

// 删除广告元素；若它位于悬浮壳内，广告链接可能已被单独清除，
// 需要把空壳整体删掉，否则残留一个空的悬浮框
function removeAd(el: Element): void {
  const shell = el.closest('body > div')
  if (shell && shell !== el && isFloatingShell(shell)) shell.remove()
  else removeWithWrapper(el)
}

// 删除广告菜单：桌面端整个下拉单元（含空面板）一起删，移动端只删条目本身
function removeAdMenu(el: Element): void {
  const wrapper = el.closest('nav div.relative')
  if (wrapper && matchAdMenu(wrapper.querySelector('a') ?? el)) wrapper.remove()
  else removeWithWrapper(el)
}

// 广告被删后残留的空占位壳：space-y/mb 间距容器，内容清空后仍留白
// （页脚上方 250px 广告位是这种）。带 x-/@ 属性的是 Alpine 组件容器，
// 可能稍后渲染，跳过防误伤。
// NOTE 详情页侧栏顶部也是 space-y-6 mb-6 壳（包着 300×250 广告），
// 但它是右栏首卡原生顶距的载体，删壳会吃掉间距（实测踩坑）——
// 只在壳位于 body 直接子级（页脚广告壳的归属层）时才清，侧栏深层的保留
function isEmptyAdWrapper(el: Element): boolean {
  if (el.tagName !== 'DIV') return false
  if (el.parentElement !== document.body) return false
  const cls = (el.className || '').toString()
  if (!/\bspace-y-\d/.test(cls) || !/\bmb-\d/.test(cls)) return false
  if (el.children.length > 0 || el.textContent?.trim()) return false
  return !el.getAttributeNames().some((n) => n.startsWith('x-') || n.startsWith('@'))
}

function removeEmptyAdWrappers(root: ParentNode): void {
  root.querySelectorAll('div[class*="space-y-"]').forEach((el) => {
    if (isEmptyAdWrapper(el)) el.remove()
  })
}

function scanAndRemove(root: ParentNode): void {
  root
    .querySelectorAll(`iframe[src], script[src], a[href], ${AD_SELECTORS.join(', ')}`)
    .forEach((el) => {
      if (renameLink(el)) return
      if (matchAdMenu(el)) removeAdMenu(el)
      else if (matchAdEl(el)) removeAd(el)
    })
  removeEmptyAdWrappers(root === document ? document.body : root)
  if (root === document) scanFloatingAds()
}

function observeAds(): void {
  const observer = new MutationObserver((mutations) => {
    try {
      let hasAdded = false
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return
          hasAdded = true
          const el = node as Element
          if (renameLink(el)) return
          if (matchAdMenu(el)) removeAdMenu(el)
          else if (matchAdEl(el)) removeAd(el)
          else scanAndRemove(el)
        })
      }
      // 浮层可能先挂空壳再注入广告链接，有新增节点就复查一次；
      // 广告被动态清除后残留的空壳也一并扫掉
      if (hasAdded) {
        scanFloatingAds()
        removeEmptyAdWrappers(document.body)
      }
    } catch (e) {
      console.error('[missav-desktop] 去广告观察器异常:', e)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

// 拦截 popunder：站点正常功能不依赖 window.open，全部拦掉并留痕。
// WARNING 必须劫持主世界（unsafeWindow）：@grant 沙盒模式下改沙盒
// window.open 无效，播放器 Alpine 的 pop()（主世界）仍会弹广告新 tab
function hijackWindowOpen(): void {
  const blocked = (...args: unknown[]) => {
    console.warn('[missav-desktop] 已拦截 window.open:', args[0])
    return null
  }
  hijackMainWorld('open', blocked)
}

// 捕获阶段拦截指向广告域名的 target=_blank 点击劫持
function interceptAdClicks(): void {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element).closest?.('a[target="_blank"]')
      if (a && matchAdUrl(a)) {
        e.preventDefault()
        e.stopPropagation()
        console.warn('[missav-desktop] 已拦截广告跳转:', a.getAttribute('href'))
      }
    },
    true,
  )
}

export function blockAds(): void {
  hijackWindowOpen()
  interceptAdClicks()
  // document-start 时 body 尚未存在，DOM 层面的清理等就绪后执行
  waitDOMContentLoaded(() => {
    scanAndRemove(document)
    observeAds()
  })
}
