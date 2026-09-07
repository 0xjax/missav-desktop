import { waitDOMContentLoaded } from '../utils/wait.ts'

interface SaveComponentData {
  user: unknown
  saved: boolean
  loading: boolean
  requireLogin: (cb: () => void) => void
}

interface AlpineLike {
  $data: (el: Element) => SaveComponentData
}

interface AxiosLike {
  post: (url: string) => Promise<unknown>
  delete: (url: string) => Promise<unknown>
}

// 站点收藏按钮的 toggleSave 被 requireLogin 包裹：页面加载后 user 要等
// /api/items/{id}/view 返回才就位，新标签页头几秒点收藏会误弹登录框。
// 收藏接口本身只用 cookie 鉴权，与 user 变量无关，因此拦截点击直接请求，
// 返回 401 才说明真未登录，此时回退站点的登录弹窗。
function findSaveUrl(btn: Element): string | null {
  let el: Element | null = btn
  while (el) {
    const xdata = el.getAttribute?.('x-data')
    const m = xdata?.match(/https:\/\/[^'"]+\/api\/items\/[^'"]+\/save/)
    if (m) return m[0]
    el = el.parentElement
  }
  return null
}

function isSaveButton(btn: Element): boolean {
  return btn
    .getAttributeNames()
    .some(
      (n) =>
        n.startsWith('@click') &&
        (btn.getAttribute(n) || '').includes('toggleSave'),
    )
}

export function fastSave(): void {
  waitDOMContentLoaded(() => {
    document.addEventListener(
      'click',
      (e) => {
        const btn = (e.target as Element).closest?.('button')
        if (!btn || !isSaveButton(btn)) return
        const alpine = (window as { Alpine?: AlpineLike }).Alpine
        const axios = (window as { axios?: AxiosLike }).axios
        if (!alpine || !axios) return
        const data = alpine.$data(btn)
        // 登录状态已就位则走站点原流程，零开销
        if (!data || data.user) return
        const url = findSaveUrl(btn)
        if (!url) return

        e.preventDefault()
        e.stopImmediatePropagation()

        const targetSaved = !data.saved
        data.loading = true
        ;(targetSaved ? axios.post(url) : axios.delete(url))
          .then(() => {
            data.saved = targetSaved
            data.loading = false
          })
          .catch((err: { response?: { status?: number } }) => {
            data.loading = false
            if (err.response?.status === 401) {
              // 真未登录：回退站点的登录弹窗
              if (typeof data.requireLogin === 'function') {
                data.requireLogin(() => {})
              } else {
                const loginBtn = [
                  ...document.querySelectorAll('button, a'),
                ].find((el) =>
                  el
                    .getAttributeNames()
                    .some(
                      (n) =>
                        n.startsWith('@click') &&
                        (el.getAttribute(n) || '').includes('showLoginModal'),
                    ),
                )
                ;(loginBtn as HTMLElement | undefined)?.click()
              }
            }
          })
      },
      true,
    )
  })
}
