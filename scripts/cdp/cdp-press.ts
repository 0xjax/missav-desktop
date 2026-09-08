// 真实鼠标按压复选框并全程埋点：bun scripts/cdp/cdp-press.ts <url包含> <checkbox的id>
// 步骤：装埋点 → 取坐标 → Input.dispatchMouseEvent 按压 → 导出事件日志与最终状态
const [, , urlPart, boxId] = process.argv

const targets = await (await fetch('http://localhost:9222/json')).json()
const tab = targets.find((t) => t.type === 'page' && t.url.includes(urlPart))
if (!tab) { console.error('tab not found'); process.exit(1) }

const ws = new WebSocket(tab.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error)))
    else p.resolve(msg.result)
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600))
  return r.result.value
}

ws.onopen = async () => {
  try {
    await send('Runtime.enable')
    // 1) 装埋点并取目标坐标
    const setup = await evalJs(`(() => {
      const inp = document.getElementById(${JSON.stringify(boxId)})
      if (!inp) return { ok: false, reason: 'checkbox not found' }
      inp.scrollIntoView({ block: 'center' })
      window.__pressLog = []
      const rec = (e) => {
        window.__pressLog.push({
          t: e.type, target: e.target.tagName + '#' + (e.target.id || ''),
          trusted: e.isTrusted, checked: inp.checked,
          defaultPrevented: e.defaultPrevented, ts: performance.now() | 0,
        })
      }
      for (const type of ['pointerdown','mousedown','pointerup','mouseup','click','change','input']) {
        window.addEventListener(type, rec, true)
      }
      // 记录按压前后的位置，排查元素位移导致 click 丢失
      const r = inp.getBoundingClientRect()
      window.__pressRect0 = { x: r.x, y: r.y }
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return {
        ok: true, x: r.x + r.width / 2, y: r.y + r.height / 2,
        checked: inp.checked,
        hit: hit ? hit.tagName + '#' + (hit.id || '') : null,
      }
    })()`)
    if (!setup.ok) { console.log(JSON.stringify(setup)); process.exit(1) }

    // 2) 真实按压
    const base = { x: setup.x, y: setup.y, button: 'left', clickCount: 1 }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base })
    await sleep(80)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base })
    await sleep(2500) // 等请求与 effect 落地

    // 3) 导出日志与最终状态
    const out = await evalJs(`(() => {
      const inp = document.getElementById(${JSON.stringify(boxId)})
      const r = inp.getBoundingClientRect()
      const data = window.Alpine?.$data(inp)
      const item = data?.playlists?.find((p) => p.key === inp.id)
      const log = window.__pressLog
      for (const type of ['pointerdown','mousedown','pointerup','mouseup','click','change','input']) {
        window.removeEventListener(type, undefined, true)
      }
      return {
        log,
        rectAfter: { x: r.x, y: r.y },
        rectBefore: window.__pressRect0,
        finalChecked: inp.checked,
        isAdded: item?.is_added,
        count: inp.closest('div.relative')?.querySelector('.mx-pl-count')?.textContent,
      }
    })()`)
    console.log(JSON.stringify(out, null, 1))
    process.exit(0)
  } catch (err) {
    console.error('ERR', err.message)
    process.exit(1)
  }
}
setTimeout(() => { console.error('timeout'); process.exit(1) }, 30000)
