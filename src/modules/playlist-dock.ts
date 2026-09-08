import { readMainWorld } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 片单右侧栏：宽屏（≥1024px，与站点右栏 lg 断点一致）时把片单面板 DOM
// 整体移入右侧栏推荐列表上方并自动展开；窄屏移回左列原位置，行为同原生。
// 面板是站点 Alpine 组件（x-show="showPanel === 'playlist'"），容器级搬运
// 不触碰 x-for 行节点，Alpine 状态天然保留。
//
// 面板 DOM 是懒渲染的：刷新后 showPanel 为 null，面板根本不会渲染。
// 所以展开必须「状态先行」——showPanel 的宿主是左列 div.flex 这个 Alpine
// 根（始终存在），先把它置为 'playlist'，面板渲染出来后再搬运进右栏。

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

// showPanel 状态宿主扫描：遍历 x-data 根找持有 showPanel 键的组件
// （面板未渲染时无法从面板向上找，只能全量扫；宿主唯一，扫到即用）
function expand(alp: AlpineLike): boolean {
  for (const el of document.querySelectorAll('[x-data]')) {
    let d: Record<string, unknown> | undefined
    try {
      d = alp.$data(el)
    } catch {
      continue
    }
    if (d && 'showPanel' in d) {
      d.showPanel = 'playlist'
      return true
    }
  }
  return false
}

export function playlistDock(): void {
  waitDOMContentLoaded(() => {
    const mq = window.matchMedia(LG_QUERY)
    // 原生锚点：面板在左列中的原始位置（用 nextSibling 精确还原）
    let homeAnchor: ChildNode | null = null
    let docked = false

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
      const alp = alpine()
      if (mq.matches) {
        // 宽屏：每次都先置状态（断点切回/宿主重渲染都可能复位），再搬运
        if (alp) expand(alp)
        dock()
      } else {
        undock()
      }
    }

    mq.addEventListener('change', apply)

    // 宽屏冷启动：Alpine 就绪后先置状态，面板渲染出来后 observer 负责搬运
    const boot = async (): Promise<void> => {
      if (!mq.matches) return
      let alp: AlpineLike | undefined
      for (let i = 0; i < 100 && !alp; i++) {
        alp = alpine()
        if (!alp) await new Promise((r) => setTimeout(r, 100))
      }
      if (!alp) return
      expand(alp)
      const obs = new MutationObserver(() => {
        if (!findPanel()) return
        obs.disconnect()
        dock()
      })
      obs.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => obs.disconnect(), 20000)
    }
    boot()
  })
}