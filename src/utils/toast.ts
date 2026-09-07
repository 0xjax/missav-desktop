// 操作反馈 toast：堆叠显示 + 跨标签广播（localStorage storage 事件）

export function toast(msg: string): void {
  let box = document.getElementById('mx-toast-box')
  if (!box) {
    box = Object.assign(document.createElement('div'), { id: 'mx-toast-box' })
    document.body.appendChild(box)
  }
  const el = Object.assign(document.createElement('div'), {
    className: 'mx-toast',
    textContent: msg,
  })
  box.appendChild(el)
  setTimeout(() => el.classList.add('mx-toast-out'), 1800)
  setTimeout(() => {
    el.remove()
    if (!box!.children.length) box!.remove()
  }, 2200)
}

// 成功确认写入 localStorage，其他标签经 storage 事件收到；
// 失败提示只在本标签显示（UI 回滚也发生在本标签，跨标签无上下文）
const TOAST_CHANNEL = 'gm:mx-toast'
let lastToastTs = 0

export function toastBroadcast(msg: string): void {
  toast(msg)
  lastToastTs = Date.now()
  localStorage.setItem(
    TOAST_CHANNEL,
    JSON.stringify({ text: msg, ts: lastToastTs }),
  )
}

export function listenToastChannel(): void {
  window.addEventListener('storage', (e) => {
    if (e.key !== TOAST_CHANNEL || !e.newValue) return
    try {
      const { text, ts } = JSON.parse(e.newValue) as {
        text: string
        ts: number
      }
      if (ts <= lastToastTs) return
      lastToastTs = ts
      toast(text)
    } catch {
      // 非法消息忽略
    }
  })
}
