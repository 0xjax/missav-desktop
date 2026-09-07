import { GM_getValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'
import { toggleSettingPanel } from '../setting.ts'

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

const shortcutList: [string, string][] = [
  ['Space', '播放 / 暂停'],
  ['S', '收藏 / 取消收藏'],
  ['P', '展开 / 收起片单'],
  ['/', '聚焦搜索框'],
  ['Esc', '退出搜索输入'],
  ['B', '打开我的收藏'],
  ['H', '打开观看历史'],
  [',', '脚本设置'],
  ['?', '快捷键帮助'],
  ['F', '全屏（站点自带，播放器聚焦时）'],
]

function toggleHelpPanel(): void {
  const exist = document.getElementById('shortcut-help')
  if (exist) {
    exist.remove()
    return
  }
  const panel = Object.assign(document.createElement('div'), {
    id: 'shortcut-help',
    innerHTML: `
      <div class="help-title">快捷键</div>
      <div class="help-list">
        ${shortcutList
          .map(([key, desc]) => `<kbd>${key}</kbd><span>${desc}</span>`)
          .join('')}
      </div>
    `,
  })
  document.body.appendChild(panel)
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
      // Esc 让输入框失焦，否则 / 聚焦搜索后再按 / 只会变成打字
      if (e.code === 'Escape' && isTyping()) {
        ;(document.activeElement as HTMLElement).blur()
        return
      }
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
        case 'KeyP':
          clickByAlpineAction('togglePlaylist')
          break
        case 'Slash':
          e.preventDefault()
          // Shift+/ 即 ?，弹快捷键帮助
          if (e.shiftKey) toggleHelpPanel()
          else focusSearch()
          break
        case 'Comma':
          toggleSettingPanel()
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
