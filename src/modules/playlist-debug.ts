import { GM_registerMenuCommand } from '../utils/gm.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// WARNING 诊断模块（临时）：排查偶发"加入片单没反应"。全程埋点记录
// 事件链路 → 我们的接管分支 → Alpine 数据翻转 → API 响应 → UI 回写，
// 日志经 GM_registerMenuCommand 一键复制导出。定位后此文件整体移除。

interface LogEntry {
  t: number // 相对加载的毫秒
  ev: string
  detail?: unknown
}

const t0 = performance.now()
const log: LogEntry[] = []
const MAX = 500

function rec(ev: string, detail?: unknown): void {
  if (log.length >= MAX) return
  log.push({ t: Math.round(performance.now() - t0), ev, detail })
  // 同步落 localStorage，页面跳转也不丢
  try {
    localStorage.setItem('gm:playlist-debug-log', JSON.stringify(log))
  } catch {}
}

function describe(e: Event): Record<string, unknown> {
  const el = e.target as Element
  return {
    type: e.type,
    tag: el?.tagName,
    id: (el as HTMLElement)?.id || undefined,
    xmodel: el?.getAttribute?.('x-model'),
    xclick: el?.getAttributeNames?.().filter((n) => n.startsWith('@click')).map((n) => `${n}=${el.getAttribute(n)}`),
    checked: (el as HTMLInputElement)?.checked,
    trusted: e.isTrusted,
    defaultPrevented: e.defaultPrevented,
  }
}

// 事件阶段记录（捕获，先于一切处理器）
function installEventTap(): void {
  const types = [
    'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'change', 'input',
  ]
  const handler = (e: Event) => {
    const el = e.target as Element
    // 只记片单相关目标，避免噪声
    if (
      el?.closest?.('input[x-model="playlist.is_added"]') ||
      (el?.getAttributeNames?.().some((n) => n.startsWith('@click') && (el.getAttribute(n) || '').includes('togglePlaylist')))
    ) {
      rec('dom-event', describe(e))
    }
  }
  for (const t of types) document.addEventListener(t, handler, { capture: true })
}

// fetch 包装：记录片单 API 请求与响应
function installFetchTap(): void {
  const orig = window.fetch.bind(window)
  window.fetch = (...args) => {
    const url = String(args[0])
    const isPl = /\/api\/playlists\/(add|remove)/.test(url)
    if (isPl) rec('fetch-start', { url, keepalive: (args[1] as RequestInit)?.keepalive })
    return orig(...args).then(
      (r) => {
        if (isPl) rec('fetch-done', { url, status: r.status, ok: r.ok })
        return r
      },
      (err) => {
        if (isPl) rec('fetch-error', { url, msg: String(err) })
        throw err
      },
    )
  }
}

// fast-save 的接管点（与 onPlaylistToggle 同源逻辑埋点）
function installFastSaveProbe(): void {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element
      const box = target.closest?.('input[x-model="playlist.is_added"]')
      if (!box) return
      const input = box as HTMLInputElement
      rec('fastsave-hit', { id: input.id, checked: input.checked })
      const w = window as { Alpine?: { $data: (el: Element) => Record<string, unknown> } }
      const alp = w.Alpine
      if (!alp) {
        rec('fastsave-no-alpine')
        return
      }
      const data = alp.$data(input)
      const list = data?.playlists as { key: string; is_added: boolean }[] | undefined
      const item = list?.find((p) => p.key === input.id)
      rec('fastsave-data', {
        hasData: !!data,
        hasList: !!list,
        listLen: list?.length,
        hasItem: !!item,
        itemIsAdded: item?.is_added,
        dvdId: data?.dvdId ?? (data as { videoCode?: string }).videoCode,
      })
      // 捕获阶段先于 fast-save（后者也是 capture，注册更早但同序执行——
      // 我们注册晚，所以在它之后跑，能看到它 stopImmediatePropagation 后的状态）
      setTimeout(() => {
        rec('fastsave-after-tick', {
          checked: input.checked,
          itemIsAdded: item?.is_added,
        })
      }, 0)
    },
    true,
  )
  // fast-save 处理器执行完毕后再看一次最终状态（冒泡后）
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element
      const box = target.closest?.('input[x-model="playlist.is_added"]')
      if (!box) return
      rec('fastsave-bubble', {
        defaultPrevented: e.defaultPrevented,
        checked: (box as HTMLInputElement).checked,
      })
    },
    false,
  )
}

// 面板出现/checkbox 渲染状态周期性快照
function installPanelWatcher(): void {
  waitDOMContentLoaded(() => {
    const snapshot = () => {
      const boxes = document.querySelectorAll<HTMLInputElement>(
        'input[x-model="playlist.is_added"]',
      )
      if (!boxes.length) return
      const fieldset = boxes[0].closest('fieldset')
      rec('panel-snap', {
        boxes: boxes.length,
        fieldsetGrid: fieldset?.classList.contains('mx-pl-grid'),
        order: [...boxes].slice(0, 3).map((b) => (b.closest('div.relative') as HTMLElement)?.style.order),
      })
    }
    snapshot()
    const iv = setInterval(() => {
      if (!document.querySelector('input[x-model="playlist.is_added"]')) return
      snapshot()
    }, 2000)
    // 面板关了就停
    document.addEventListener('click', (e) => {
      const t = e.target as Element
      if (t?.getAttributeNames?.().some((n) => n.startsWith('@click') && (t.getAttribute(n) || '').includes('togglePanel'))) {
        setTimeout(() => {
          if (!document.querySelector('input[x-model="playlist.is_added"]')) clearInterval(iv)
        }, 500)
      }
    }, true)
  })
}

export function playlistDebug(): void {
  installEventTap()
  installFetchTap()
  installFastSaveProbe()
  installPanelWatcher()
  rec('debug-installed', { href: location.href })
  GM_registerMenuCommand('📋 复制片单诊断日志', () => {
    const text = log.map((l) => `${l.t}ms ${l.ev} ${l.detail !== undefined ? JSON.stringify(l.detail) : ''}`).join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() => alert(`已复制 ${log.length} 条日志`))
      .catch(() => {
        // 剪贴板失败兜底：弹窗展示
        prompt('手动复制：', text)
      })
  })
}