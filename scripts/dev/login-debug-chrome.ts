// 调试 Chrome 自动登录 missav：从仓库根 .env 读 MISSAV_USER / MISSAV_PASS，
// 未建 .env 或已登录则跳过。.env 在 .gitignore，凭据不进仓库；
// 新设备按 .env.example 说明复制创建。仅本机使用。
// 用法：bun scripts/dev/login-debug-chrome.ts <tab url 包含子串>
const [, , urlPart = 'missav.ai'] = process.argv

// bun 自动加载 .env（bunfig 无需配置）；再兜底手动解析一次
if (!process.env.MISSAV_USER || !process.env.MISSAV_PASS) {
  try {
    const envFile = await Bun.file('.env').text()
    for (const line of envFile.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  } catch {
    // 无 .env，跳过登录
  }
}

const USER = process.env.MISSAV_USER
const PASS = process.env.MISSAV_PASS
if (!USER || !PASS) {
  console.log('SKIP: 仓库根无 .env（参考 .env.example 创建；已登录则无需创建）')
  process.exit(0)
}

const targets = (await (await fetch('http://localhost:9222/json')).json()) as {
  url: string
  webSocketDebuggerUrl: string
  type: string
}[]
const tab = targets.find((t) => t.type === 'page' && t.url.includes(urlPart))
if (!tab) {
  console.error('tab not found')
  process.exit(1)
}

const ws = new WebSocket(tab.webSocketDebuggerUrl)

let seq = 100
function send(method: string, params?: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const id = ++seq
    const onMsg = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string)
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg)
        resolve(msg.result ?? msg.error ?? {})
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

ws.onopen = async () => {
  // 1. 探测登录态：以「我的帐户」为已登录特征（仅登录态导航渲染；简繁双写）。
  // 用「登入」按钮探测不行——登录模态里藏着 display:none 的同名按钮（offsetParent
  // 过滤也挡不住页面差异：未登录首页上入口藏在我收藏下拉里，同样全不可见）
  const probe = (await send('Runtime.evaluate', {
    expression: `(() => {
      const t = document.body.innerText
      return t.includes('我的帐户') || t.includes('我的帳戶')
    })()`,
    returnByValue: true,
  })) as { result?: { value?: boolean } }
  if (process.env.MX_DEBUG) console.error('probe raw:', JSON.stringify(probe))
  if (probe?.result?.value === true) {
    console.log('ALREADY-LOGGED-IN')
    process.exit(0)
  }

  // 2. 未登录：找可点的登录入口。优先「我的收藏」下拉里的「登入你的帐户」
  // （href="#"，SPA 内部切换，需先 hover 展开下拉）；退化用可见「登入」按钮
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const trigger = [...document.querySelectorAll('a, span, div')].find(e =>
        /^(我的收藏|我的影片收藏)$/.test(e.textContent.trim()) && e.offsetParent !== null)
      if (trigger) {
        trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
        await new Promise(r => setTimeout(r, 400))
      }
      const entry = [...document.querySelectorAll('a, button')]
        .find(e => /登入你的帐户|登入你的賬戶|登入你的帳戶/.test(e.textContent.trim()) && e.offsetParent !== null)
        ?? [...document.querySelectorAll('a, button')]
          .find(e => /^(登入|登录)$/.test(e.textContent.trim()) && e.offsetParent !== null)
      if (!entry) return 'NO-ENTRY'
      entry.click()
      return 'CLICKED'
    })()`,
    returnByValue: true,
    awaitPromise: true,
  })
  await new Promise((r) => setTimeout(r, 1500))

  // 3. 填表提交：登录表单字段是 x-model="email"/"password"（type 是 text 不是 email，
  // 页面上还有注册/找回等多个 x-show 切换的 form，必须按 @submit.prevent="login" 精确选中）
  const r = (await send('Runtime.evaluate', {
    expression: `(async () => {
      const form = [...document.querySelectorAll('form')]
        .find(f => f.getAttribute('@submit.prevent') === 'login')
      if (!form || getComputedStyle(form).display === 'none') return 'NO-FORM'
      const email = form.querySelector('input[x-model="email"]')
      const pass = form.querySelector('input[x-model="password"]')
      if (!email || !pass) return 'NO-INPUT'
      email.value = ${JSON.stringify(USER)}
      pass.value = ${JSON.stringify(PASS)}
      email.dispatchEvent(new Event('input', { bubbles: true }))
      pass.dispatchEvent(new Event('input', { bubbles: true }))
      const submit = form.querySelector('button[type="submit"]')
      if (submit) { submit.click(); return 'SUBMITTED' }
      return 'NO-SUBMIT'
    })()`,
    returnByValue: true,
    awaitPromise: true,
  })) as { result?: { result?: { value?: string } } }
  const val = r.result?.value
  console.log(val ?? JSON.stringify(r))
  if (val !== 'SUBMITTED') process.exit(1)
  // 提交成功后：站点的 login() 走 axios，302 到首页但 SPA 的 user 状态不更新——
  // 必须刷新页面让站点用新 session 取回用户。「我的帐户」菜单是登录成功标志，
  // 但它只在部分页面渲染（saved/playlists 等有，dm247 首页无）——确认前先导航到 /cn/saved
  await new Promise((res) => setTimeout(res, 2000))
  await send('Runtime.evaluate', { expression: `location.href = location.origin + '/cn/saved'` })
  for (let i = 0; i < 25; i++) {
    await new Promise((res) => setTimeout(res, 1000))
    const check = (await send('Runtime.evaluate', {
      expression: `(() => {
        if (!location.pathname.includes('saved')) return false
        const t = document.body.innerText
        return t.includes('我的帐户') || t.includes('我的帳戶')
      })()`,
      returnByValue: true,
    })) as { result?: { value?: boolean } }
    if (check.result?.value === true) {
      console.log('LOGGED-IN')
      process.exit(0)
    }
  }
  console.log('LOGIN-UNCONFIRMED')
  process.exit(1)
}
setTimeout(() => { console.error('timeout'); process.exit(1) }, 45000)
