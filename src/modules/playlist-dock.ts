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
//
// 停靠后面板静态常驻：片单按钮置灰禁用（不允许收起，行内样式稳压
// Alpine :class 绑定的高亮重写）；面板 display !important 压过 x-show
// 的内联 display:none，切到分享面板时停靠面板也不消失；面板渲染前
// 用同尺寸槽位占位，避免右栏内容跳动。

interface AlpineLike {
  $data: (el: Element) => Record<string, unknown>
}

const LG_QUERY = '(min-width: 1024px)'

function alpine(): AlpineLike | undefined {
  const w = (window as { Alpine?: AlpineLike }).Alpine
  if (w) return w
  return readMainWorld<AlpineLike>('Alpine')
}

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
// 左列 flex-1 的定位改用片单按钮锚定（面板未渲染时它也可靠存在）
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

// 站点把片单数据加载挂在 $watch('showPanel') 上：冷启动我们直接把
// showPanel 从 null 置为 'playlist' 时 watcher 可能尚未注册，变更通知
// 丢失，fetch 永不发生——表现为面板打开是空的，手动关开（第二次变更）
// 才加载。置位后轮询兜底：数据仍空且不在 loading 就按站点同款逻辑补拉
function ensurePlaylistLoaded(alp: AlpineLike): void {
  const slug = location.pathname.split('/').filter(Boolean).pop()
  if (!slug) return
  const url = `${location.origin}/api/playlists/${slug}`
  let tries = 0
  const tick = (): void => {
    tries++
    const panel = findPanel()
    const d = panel ? alp.$data(panel) : undefined
    const loading = d?.loading as { playlist?: boolean } | undefined
    const playlists = d?.playlists as unknown[] | undefined
    if (!d || !loading || !playlists) return
    if (playlists.length > 0 || loading.playlist) return
    loading.playlist = true
    void fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        const list = (j as { data?: unknown[] }).data ?? []
        // fetch 期间站点 watcher 可能也发起了同请求：仅在仍为空时写入
        if ((d.playlists as unknown[]).length === 0) d.playlists = list
      })
      .catch(() => {})
      .finally(() => {
        loading.playlist = false
      })
  }
  const timer = setInterval(() => {
    if (tries > 40) {
      clearInterval(timer)
      return
    }
    const panel = findPanel()
    const d = panel ? alp.$data(panel) : undefined
    if (d && (d.playlists as unknown[] | undefined)?.length) clearInterval(timer)
    else tick()
  }, 250)
  setTimeout(() => clearInterval(timer), 11000)
}

export function playlistDock(): void {
  waitDOMContentLoaded(() => {
    const mq = window.matchMedia(LG_QUERY)
    // 原生锚点：面板在左列中的原始位置（用 nextSibling 精确还原）
    let homeAnchor: ChildNode | null = null
    let docked = false
    let slot: HTMLElement | null = null
    let slotTimer: ReturnType<typeof setTimeout> | undefined

    // 槽位：面板渲染前在右栏顶预留同尺寸空间防跳动；久等不渲染
    //（未登录等）则撤掉，不留空洞
    const reserveSlot = (): void => {
      const sidebar = findSidebar()
      if (!sidebar || slot?.isConnected) return
      slot = document.createElement('div')
      slot.className = 'mx-pl-dock-slot'
      sidebar.insertBefore(slot, sidebar.firstChild)
      clearTimeout(slotTimer)
      slotTimer = setTimeout(() => {
        slot?.remove()
        slot = null
      }, 8000)
    }

    const setBtnDisabled = (disabled: boolean): void => {
      const btn = playlistOpenBtn()
      if (!btn) return
      btn.disabled = disabled
      // :class 绑定会在 showPanel 变化时重写 className，
      // 行内样式才能稳压高亮；disabled 挡掉点击事件。
      // 禁用只求"不显眼"，比普通态略暗即可，太灰反而变成视觉焦点
      btn.style.color = disabled ? '#9aa5b6' : ''
      btn.style.cursor = disabled ? 'default' : ''
    }

    const dock = (): void => {
      const panel = findPanel()
      const sidebar = findSidebar()
      if (!panel || !sidebar || docked) return
      homeAnchor = panel.nextSibling
      sidebar.insertBefore(panel, sidebar.firstChild)
      docked = true
      // 面板容器在右栏时去掉底部留白，贴住推荐列表
      panel.classList.add('mx-pl-docked')
      slot?.remove()
      slot = null
      clearTimeout(slotTimer)
      setBtnDisabled(true)
    }

    const undock = (): void => {
      const panel = findPanel()
      setBtnDisabled(false)
      if (panel && homeAnchor?.parentElement) {
        homeAnchor.parentElement.insertBefore(panel, homeAnchor)
      }
      panel?.classList.remove('mx-pl-docked')
      docked = false
      homeAnchor = null
    }

    // 面板渲染出来后搬运（冷启动由 expand 置位触发渲染）
    let obs: MutationObserver | null = null
    const watch = (): void => {
      if (obs) return
      obs = new MutationObserver(() => {
        if (!findPanel()) return
        obs?.disconnect()
        obs = null
        dock()
      })
      obs.observe(document.body, { childList: true, subtree: true })
      setTimeout(() => {
        obs?.disconnect()
        obs = null
      }, 20000)
    }

    const apply = (): void => {
      const alp = alpine()
      if (mq.matches) {
        // 宽屏：每次都先置状态（断点切回/宿主重渲染都可能复位），再搬运
        reserveSlot()
        if (alp) {
          if (expand(alp)) ensurePlaylistLoaded(alp)
        }
        dock()
        watch()
      } else {
        undock()
      }
    }

    mq.addEventListener('change', apply)

    // 宽屏冷启动：Alpine 就绪后置状态并占位，面板渲染后 observer 搬运
    const boot = async (): Promise<void> => {
      if (!mq.matches) return
      let alp: AlpineLike | undefined
      for (let i = 0; i < 100 && !alp; i++) {
        alp = alpine()
        if (!alp) await new Promise((r) => setTimeout(r, 100))
      }
      if (!alp) return
      apply()
    }
    boot()
  })
}