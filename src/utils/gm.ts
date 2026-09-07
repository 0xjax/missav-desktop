import {
  GM_getValue as importedGetValue,
  GM_setValue as importedSetValue,
  GM_registerMenuCommand as importedRegisterMenuCommand,
} from '$'

/**
 * GM API 兜底层。
 *
 * 管理器注入 GM_* 的方式各不相同：脚本作用域（闭包）、globalThis、
 * unsafeWindow，且注入时机可能晚于 document-start（插件客户端在模块
 * 初始化时缓存的绑定可能是 undefined）。有的实现还会对未设置的键抛异常。
 *
 * 因此在【调用时】按 插件绑定（作用域查找）→ globalThis → unsafeWindow
 * 顺序动态解析，全部缺失时用 localStorage 兜底，保证脚本不崩。
 *
 * 另外 MV3 管理器（如 Tampermonkey 5.x）的 GM_setValue 经 service worker
 * 异步落盘，页面随即跳转时写入可能丢失，所以采用双写策略：
 * 写入时 localStorage 同步保底 + 管理器存储；读取时若管理器返回的仍是
 * 默认值而本地有备份，以备份为准。
 */

declare const unsafeWindow: (Window & typeof globalThis) | undefined

function rawFn(name: string, imported: unknown): Function | undefined {
  // 插件绑定经由作用域查找，能覆盖闭包注入的管理器
  if (typeof imported === 'function') return imported
  const g = globalThis as Record<string, unknown>
  if (typeof g[name] === 'function') return g[name] as Function
  const w = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined) as
    | Record<string, unknown>
    | undefined
  if (w && typeof w[name] === 'function') return w[name] as Function
  return undefined
}

export function GM_getValue<T = any>(key: string, defaultValue?: T): T {
  const stored = localStorage.getItem(`gm:${key}`)
  const backup = stored === null ? (defaultValue as T) : JSON.parse(stored)
  const fn = rawFn('GM_getValue', importedGetValue) as
    | ((key: string, defaultValue?: T) => T)
    | undefined
  if (fn) {
    try {
      const value = fn(key, defaultValue)
      // 管理器读到默认值但本地有备份：可能是跳转丢写，以备份为准
      if (value === undefined || (value === defaultValue && stored !== null))
        return backup
      return value
    } catch {
      return backup
    }
  }
  return backup
}

export function GM_setValue(key: string, value: unknown): void {
  // 先同步写 localStorage 保底（页面立即跳转也不丢），再写管理器存储
  localStorage.setItem(`gm:${key}`, JSON.stringify(value))
  const fn = rawFn('GM_setValue', importedSetValue) as
    | ((key: string, value: unknown) => void)
    | undefined
  if (fn) {
    try {
      fn(key, value)
    } catch {
      // 管理器写入失败时 localStorage 已保底
    }
  }
}

export function GM_registerMenuCommand(
  name: string,
  callback: () => void,
): void {
  const fn = rawFn('GM_registerMenuCommand', importedRegisterMenuCommand) as
    | ((name: string, callback: () => void) => void)
    | undefined
  if (fn) {
    try {
      fn(name, callback)
    } catch {
      // 无菜单命令能力时静默降级
    }
  }
}
