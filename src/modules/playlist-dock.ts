import { waitDOMContentLoaded } from '../utils/wait.ts'

// 片单右侧栏：宽屏（≥1024px，与站点右栏 lg 断点一致）时，用户手动展开片单后
// 把面板 DOM 整体移入右侧栏推荐列表上方；收起（showPanel 复位）移回左列原位置，
// 窄屏行为同原生。面板是站点 Alpine 组件
// （x-show="showPanel === 'playlist'"），容器级搬运不触碰 x-for 行节点，
// Alpine 状态天然保留。
//
// NOTE 不做宽屏自动展开（v1.36.29 移除）：面板数据走站点
// /api/playlists/{id}，自动展开等于每个标签页加载都发一次请求，同时开多个
// 标签会撞站点频率限制，反而谁都打不开。改为只跟随用户点击，停靠自身照旧。
// 因此也不再有「状态先行」置位与 API 补拉兜底——数据加载完全交还站点，
// 本模块不发任何网络请求。

const LG_QUERY = '(min-width: 1024px)'

// 片单展开按钮（按钮行那个开关，不是 fieldset 里的勾选行）
function playlistOpenBtn(): HTMLButtonElement | null {
  return (
    ([...document.querySelectorAll('button')].find(
      (b) =>
        b
          .getAttributeNames()
          .some(
            (n) =>
              n.startsWith('@click') &&
              b.getAttribute(n) === 'togglePlaylist',
          ) && !b.closest('fieldset'),
    ) as HTMLButtonElement | undefined) ?? null
  )
}

function findPanel(): HTMLElement | null {
  const box = document.querySelector('input[x-model="playlist.is_added"]')
  if (!box) return null
  return (box.closest('div.mb-5') as HTMLElement | null) ?? null
}

// 右栏：hidden lg:flex 侧栏（推荐视频列表容器），与左列平级。
// 左列 flex-1 的定位用片单按钮锚定（面板未渲染时它也可靠）
function findSidebar(): HTMLElement | null {
  const leftCol = playlistOpenBtn()?.closest('.flex-1')
  const flex = leftCol?.parentElement
  if (!flex) return null
  return (
    (flex.querySelector(
      ':scope > [class*="hidden"][class*="lg:flex"]',
    ) as HTMLElement | null) ?? null
  )
}

export function playlistDock(): void {
  waitDOMContentLoaded(() => {
    const mq = window.matchMedia(LG_QUERY)
    // 原生锚点：面板在左列中的原始位置（用 nextSibling 精确还原）
    let homeAnchor: ChildNode | null = null
    let docked = false

    // 面板可见性：面板始终在 DOM 里（站点 x-show 切 display），搬运后仍在
    // 文档流中，所以 display:none 与已停靠两种情况的判断都成立——已停靠时
    // 由 docked 短路，不会误判
    const visible = (panel: HTMLElement | null): panel is HTMLElement =>
      !!panel && panel.offsetParent !== null

    const dock = (): void => {
      const panel = findPanel()
      if (!mq.matches || docked || !visible(panel)) return
      const sidebar = findSidebar()
      if (!sidebar) return
      homeAnchor = panel.nextSibling
      sidebar.insertBefore(panel, sidebar.firstChild)
      docked = true
      // 面板容器在右栏时去掉底部留白，贴住推荐列表
      panel.classList.add('mx-pl-docked')
    }

    const undock = (): void => {
      const panel = findPanel()
      if (!docked) return
      panel?.classList.remove('mx-pl-docked')
      if (panel && homeAnchor?.parentElement) {
        homeAnchor.parentElement.insertBefore(panel, homeAnchor)
      }
      docked = false
      homeAnchor = null
    }

    // 跟随站点 showPanel 状态停靠 / 还原。站点的 togglePlaylist 是 Alpine 事件
    // 绑定，没有 DOM 事件可听；面板的渲染与显隐都能从 DOM 观察到，故轮询同步。
    // WARNING 不要改回 MutationObserver + 一次性 disconnect：那样只在首次渲染
    // 时搬运一次，用户收起后无法还原，再次展开也不会重新停靠
    setInterval(() => {
      if (!mq.matches) {
        undock()
        return
      }
      if (visible(findPanel())) dock()
      else undock()
    }, 300)

    // 断点切换：分辨率跨过 1024px 时立即纠正一次，不等下个轮询
    mq.addEventListener('change', () => {
      if (mq.matches) dock()
      else undock()
    })
  })
}
