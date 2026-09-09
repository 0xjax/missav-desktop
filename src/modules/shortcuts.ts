import { GM_getValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { t, type I18nKey } from '../utils/i18n.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'
import { toggleSettingPanel } from '../setting.ts'

// 只有"真的在输入文字"才算：播放器里有点击后获得焦点的 input[type=range]
// （Seek / Volume 滑块），把它当输入框会让 S/P 等快捷键在播放器上失效（实测）
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'number',
  'url',
  'tel',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
])

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') return TEXT_INPUT_TYPES.has((el as HTMLInputElement).type)
  return false
}

// 复用站点的 Alpine 动作（@click 绑定在 button/a 上），优先可见元素
function clickByAlpineAction(action: string): boolean {
  const els = Array.from(document.querySelectorAll('button, a')).filter((e) =>
    e
      .getAttributeNames()
      .some(
        (n) =>
          n.startsWith('@click') && (e.getAttribute(n) || '').includes(action),
      ),
  )
  const el =
    els.find((e) => (e as HTMLElement).offsetParent !== null) ?? els[0]
  if (!el) return false
  ;(el as HTMLElement).click()
  return true
}

function focusSearch(): void {
  // 首页大搜索框优先；顶栏搜索框（x-ref=search）仅展开时渲染
  const visibleInput = () =>
    [
      ...document.querySelectorAll<HTMLInputElement>(
        'form.w-full input[type="text"], input[x-ref="search"]',
      ),
    ].find((i) => i.offsetParent !== null)
  const input = visibleInput()
  if (input) {
    input.focus()
    input.select()
    return
  }
  // 搜索条收起时先展开再聚焦（展开后站点通常会自动聚焦，这里兜底）
  if (clickByAlpineAction('toggleSearch')) {
    setTimeout(() => {
      const el = visibleInput()
      el?.focus()
      el?.select()
    }, 200)
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

const shortcutList: [string, I18nKey][] = [
  ['Space', 'help.playPause'],
  ['S', 'help.save'],
  ['P', 'help.playlist'],
  ['/', 'help.search'],
  ['G', 'help.home'],
  ['B', 'help.saved'],
  ['H', 'help.history'],
  [',', 'help.settings'],
  ['?', 'help.help'],
  ['F', 'help.fullscreen'],
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
      <div class="help-title">${t('help.title')}</div>
      <div class="help-list">
        ${shortcutList
          .map(([key, desc]) => `<kbd>${key}</kbd><span>${t(desc)}</span>`)
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
      // Esc：输入框失焦；顶栏搜索条若展开则一并收起（一次按键完成关闭）
      if (e.code === 'Escape') {
        if (isTyping()) (document.activeElement as HTMLElement).blur()
        if (document.querySelector('.content-with-search'))
          clickByAlpineAction('toggleSearch')
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
        case 'KeyG':
          gotoPage('/')
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
