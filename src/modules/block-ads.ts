import { waitDOMContentLoaded } from '../utils/wait.ts'

// 广告域名黑名单（比站点的 hash 类名稳定），漏广告时在此补充
const AD_HOSTS = ['mayzaent.com', 'rallytrck.website', 'myavlive.com', 'snaptrckr.fun']

// 广告位结构特征（无 src 的广告槽等无法用域名匹配的情况）
const AD_SELECTORS = ['[id^="ts_ms_"]', 'iframe[width="1"][height="1"]:not([src])']

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

function scanAndRemove(root: ParentNode): void {
  root
    .querySelectorAll(`iframe[src], a[href], ${AD_SELECTORS.join(', ')}`)
    .forEach((el) => {
      if (matchAdEl(el)) removeAd(el)
    })
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
          if (matchAdEl(el)) removeAd(el)
          else scanAndRemove(el)
        })
      }
      // 浮层可能先挂空壳再注入广告链接，有新增节点就复查一次
      if (hasAdded) scanFloatingAds()
    } catch (e) {
      console.error('[missav-desktop] 去广告观察器异常:', e)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

// 拦截 popunder：站点正常功能不依赖 window.open，全部拦掉并留痕
function hijackWindowOpen(): void {
  window.open = (...args: unknown[]) => {
    console.warn('[missav-desktop] 已拦截 window.open:', args[0])
    return null
  }
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
