import { readMainWorld } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 片单右侧栏：宽屏（≥1024px，与站点右栏 lg 断点一致）时把片单面板 DOM
// 整体移入右侧栏推荐列表上方并自动展开；窄屏移回左列原位置，行为同原生。
// 面板是站点 Alpine 组件（x-show="showPanel === 'playlist'"），容器级搬运
// 不触碰 x-for 行节点，Alpine 状态天然保留。

interface AlpineLike {
  $data: (el: Element) => Record<string, unknown>
}

const LG_QUERY = '(min-width: 1024px)'

function alpine(): AlpineLike | undefined {
  const w = (window as { Alpine?: AlpineLike }).Alpine
  if (w) return w
  return readMainWorld<AlpineLike>('Alpine')
}

function findPanel(): HTMLElement | null {
  const box = document.querySelector('input[x-model="playlist.is_added"]')
  if (!box) return null
  const panel = box.closest('div.mb-5')
  return (panel as HTMLElement | null) ?? null
}

// 右栏：hidden lg:flex 侧栏（推荐视频列表容器）。
// 层级：右栏 > 左列(本面板当前父级 flex-1) 的父级 flex 下，与左列平级的前一个兄弟
function findSidebar(): HTMLElement | null {
  const box = document.querySelector('input[x-model="playlist.is_added"]')
  if (!box) return null
  const panel = box.closest('div.mb-5')!
  const leftCol = panel.parentElement // flex-1 order-first
  const flex = leftCol?.parentElement
  if (!flex) return null
  const right = flex.querySelector(':scope > [class*="hidden"][class*="lg:flex"]')
  return (right as HTMLElement | null) ?? null
}

export function playlistDock(): void {
  waitDOMContentLoaded(() => {
    const mq = window.matchMedia(LG_QUERY)
    // 原生锚点：面板在左列中的原始位置（用 nextSibling 精确还原）
    let homeAnchor: ChildNode | null = null
    let docked = false

    const expand = (): boolean => {
      const alp = alpine()
      const panel = findPanel()
      // 接不到 Alpine 就不展开：宁可不增强，不弄坏
      if (!alp || !panel) return false
      const data = alp.$data(panel)
      const showPanel = data?.showPanel
      if (typeof showPanel !== 'string') return false
      data.showPanel = 'playlist'
      return true
    }

    const dock = (): void => {
      const panel = findPanel()
      const sidebar = findSidebar()
      if (!panel || !sidebar) return
      if (docked) return
      homeAnchor = panel.nextSibling
      sidebar.insertBefore(panel, sidebar.firstChild)
      docked = true
      // 面板容器在右栏时去掉底部留白，贴住推荐列表
      panel.classList.add('mx-pl-docked')
      expand()
    }

    const undock = (): void => {
      const panel = findPanel()
      if (!panel) return
      if (homeAnchor && homeAnchor.parentElement) {
        homeAnchor.parentElement.insertBefore(panel, homeAnchor)
      }
      panel.classList.remove('mx-pl-docked')
      docked = false
      homeAnchor = null
    }

    const apply = (): void => {
      if (mq.matches) dock()
      else undock()
    }

    // 面板 DOM 是懒渲染的（打开过一次才出现）：observer 等它出现，
    // 出现后断点在宽屏就搬运；之后监听断点变化跟随窗口
    const obs = new MutationObserver(() => {
      if (!findPanel()) return
      obs.disconnect()
      apply()
      mq.addEventListener('change', apply)
    })
    obs.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => obs.disconnect(), 20000)
  })
}