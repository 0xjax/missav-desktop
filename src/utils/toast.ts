// 操作反馈 toast：左上堆叠（最多 4 条，超出排队）+ 跨标签广播（localStorage storage 事件）

export type ToastType = 'success' | 'error'

export interface ToastOptions {
  code?: string // AV 番号，单独成 chip 显示
  type?: ToastType // 状态色边：成功绿 / 失败红，缺省中性灰蓝
}

const SHOW_MS = 3500
const OUT_MS = 300
const MAX_VISIBLE = 4

const queue: (ToastOptions & { msg: string })[] = []
let visible = 0

function ensureBox(): HTMLElement {
  let box = document.getElementById('mx-toast-box')
  if (!box) {
    box = Object.assign(document.createElement('div'), { id: 'mx-toast-box' })
    document.body.appendChild(box)
  }
  return box
}

function render(item: ToastOptions & { msg: string }): void {
  const box = ensureBox()
  const el = document.createElement('div')
  el.className = item.type ? `mx-toast mx-toast-${item.type}` : 'mx-toast'
  const text = document.createElement('span')
  text.textContent = item.msg
  el.append(text)
  if (item.code) {
    const code = document.createElement('span')
    code.className = 'mx-toast-code'
    code.textContent = item.code
    el.append(code)
  }
  box.appendChild(el)
  visible++
  setTimeout(() => el.classList.add('mx-toast-out'), SHOW_MS)
  setTimeout(() => {
    el.remove()
    visible--
    drain()
    if (!box.children.length) box.remove()
  }, SHOW_MS + OUT_MS)
}

function drain(): void {
  while (visible < MAX_VISIBLE && queue.length) render(queue.shift()!)
}

export function toast(msg: string, opts?: ToastOptions): void {
  queue.push({ msg, ...opts })
  drain()
}

// 成功确认写入 localStorage，其他标签经 storage 事件收到；
// 失败提示只在本标签显示（UI 回滚也发生在本标签，跨标签无上下文）
const TOAST_CHANNEL = 'gm:mx-toast'
let lastToastTs = 0

export function toastBroadcast(msg: string, opts?: ToastOptions): void {
  toast(msg, opts)
  lastToastTs = Date.now()
  localStorage.setItem(
    TOAST_CHANNEL,
    JSON.stringify({ text: msg, ...opts, ts: lastToastTs }),
  )
}

// 常驻状态条：长耗时流程（备份抓取）期间显示进度，不会自动消失；
// 更新调用覆盖文本，结束/失败时由调用方显式 stickyToast(id) 移除
export function stickyToast(id: string, msg?: string): void {
  let el = document.getElementById(id)
  if (!el) {
    if (msg === undefined) return
    el = Object.assign(document.createElement('div'), { id })
    el.className = 'mx-toast mx-toast-sticky'
    ensureBox().appendChild(el)
  }
  if (msg === undefined) el.remove()
  else el.textContent = msg
}

export function listenToastChannel(): void {
  window.addEventListener('storage', (e) => {
    if (e.key !== TOAST_CHANNEL || !e.newValue) return
    try {
      const { text, code, type, ts } = JSON.parse(e.newValue) as {
        text: string
        ts: number
      } & ToastOptions
      if (ts <= lastToastTs) return
      lastToastTs = ts
      toast(text, { code, type })
    } catch {
      // 非法消息忽略
    }
  })
}
