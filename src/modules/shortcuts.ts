import { GM_getValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

function isTyping(): boolean {
  const el = document.activeElement
  return (
    !!el &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
      (el as HTMLElement).isContentEditable)
  )
}

// 复用站点的 Alpine 动作（@click 绑定在 button/a 上）
function clickByAlpineAction(action: string): boolean {
  const el = Array.from(document.querySelectorAll('button, a')).find((e) =>
    e
      .getAttributeNames()
      .some(
        (n) =>
          n.startsWith('@click') && (e.getAttribute(n) || '').includes(action),
      ),
  )
  if (!el) return false
  ;(el as HTMLElement).click()
  return true
}

function focusSearch(): void {
  // 首页大搜索框优先
  const home = document.querySelector(
    'form.w-full input[type="text"]',
  ) as HTMLInputElement | null
  if (home) {
    home.focus()
    home.select()
    return
  }
  // 其他页先展开顶栏搜索再聚焦
  if (clickByAlpineAction('toggleSearch')) {
    setTimeout(() => {
      const input = Array.from(document.querySelectorAll('form'))
        .find((f) =>
          (f.getAttribute('@submit.prevent') || '').includes(
            'search($refs.search',
          ),
        )
        ?.querySelector('input[type="text"]') as HTMLInputElement | null
      input?.focus()
      input?.select()
    }, 100)
  }
}

function gotoPage(path: string): void {
  const lang = currentLang() ?? GM_getValue<string | null>('pref-lang', null)
  location.href = `${lang ? `/${lang}` : ''}${path}`
}

function togglePlay(): void {
  const video = (document.querySelector('.plyr video') ??
    document.querySelector('video')) as HTMLVideoElement | null
  if (!video) return
  if (video.paused) video.play()
  else video.pause()
}

export function shortcuts(): void {
  waitDOMContentLoaded(() => {
    // 夺回空格键：站点的弹窗广告绑在 window 的 keyup.space 上，
    // 捕获阶段截断，不让事件到达广告监听器
    window.addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'Space' && !isTyping()) e.stopImmediatePropagation()
      },
      true,
    )
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping()) return
      switch (e.code) {
        case 'Space':
          // 播放器聚焦时 Plyr 自己处理空格，避免重复切换
          if ((e.target as Element).closest?.('.plyr')) return
          e.preventDefault()
          togglePlay()
          break
        case 'KeyS':
          clickByAlpineAction('toggleSave')
          break
        case 'Slash':
          e.preventDefault()
          focusSearch()
          break
        case 'KeyB':
          gotoPage('/saved')
          break
        case 'KeyH':
          gotoPage('/history')
          break
      }
    })
  })
}
