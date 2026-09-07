// 设置调试浏览器的下载目录：bun scripts/cdp/cdp-dl.ts
const ver = await (await fetch('http://localhost:9222/json/version')).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Browser.setDownloadBehavior',
    params: { behavior: 'allow', downloadPath: 'D:/chrome-debug-downloads', eventsEnabled: true },
  }))
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id === 1) { console.log('set:', JSON.stringify(msg.result ?? msg.error)); process.exit(0) }
}
setTimeout(() => { console.error('timeout'); process.exit(1) }, 15000)
