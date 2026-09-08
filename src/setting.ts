import { GM_getValue, GM_setValue, GM_registerMenuCommand } from './utils/gm.ts'
import { waitDOMContentLoaded } from './utils/wait.ts'
import { exportBackup } from './modules/backup-export.ts'

// 新增设置项：在 keyValues 加键（键名即存储 key，值为面板显示文案）
const keyValues: Record<string, string> = {
  'block-ads': '去广告',
  'lang-pref': '语言偏好',
  'search-pref': '搜索偏好',
  'shortcut-keys': '快捷操作',
  'fast-save': '收藏片单增强',
  'auto-backup': '自动备份（每 3 天）',
  'sources': '多源显示切换',
  'playlist-panel': '片单面板优化',
}

// 设置项默认值，未列出的键默认为 false
const keyDefaults: Record<string, boolean> = {
  'block-ads': true,
  'lang-pref': true,
  'search-pref': true,
  'shortcut-keys': true,
  'fast-save': true,
  'auto-backup': true,
  'sources': true,
  'playlist-panel': true,
}

function createSettingPanel(): HTMLElement {
  const panel = Object.assign(document.createElement('div'), {
    id: 'setting-panel',
    innerHTML: `
      <div class="setting-title">脚本设置</div>
      <div class="setting-checkboxes">
        ${Object.entries(keyValues)
          .map(
            ([key, label]) => `
          <label><input type="checkbox" data-key="${key}"><span>${label}</span></label>
        `,
          )
          .join('')}
      </div>
      <div class="setting-actions">
        <button id="setting-export" type="button">导出备份</button>
        <button id="setting-save" type="button">保存</button>
      </div>
    `,
  })

  const checkboxes = panel.querySelectorAll(
    '.setting-checkboxes input[type="checkbox"]',
  ) as NodeListOf<HTMLInputElement>

  checkboxes.forEach((checkbox) => {
    const key = checkbox.dataset.key as string
    checkbox.checked = GM_getValue(key, keyDefaults[key] ?? false)
  })

  panel.querySelector('#setting-export')?.addEventListener('click', () => {
    exportBackup()
  })

  panel.querySelector('#setting-save')?.addEventListener('click', () => {
    checkboxes.forEach((checkbox) => {
      const key = checkbox.dataset.key as string
      if (checkbox.checked !== GM_getValue(key, keyDefaults[key] ?? false))
        GM_setValue(key, checkbox.checked)
    })
    panel.remove()
    location.reload()
  })

  return panel
}

export function toggleSettingPanel(): void {
  const exist = document.getElementById('setting-panel')
  if (exist) {
    exist.remove()
    return
  }
  document.body.appendChild(createSettingPanel())
}

// 通过油猴菜单注册设置入口
export function registerSettingMenu(): void {
  GM_registerMenuCommand('脚本设置', () => {
    waitDOMContentLoaded(toggleSettingPanel)
  })
}

// 页内设置 icon：嵌在站点顶栏按钮组最右（国旗之后），与搜索/国旗同款风格。
// 站点顶栏有两套响应式容器（小屏 div.xl:hidden / 大屏 nav.hidden.xl:flex），
// 都要插入；锚点用 Alpine action 名定位（不含构建 hash，跨改版稳定）。
const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 0 1-2.28.95l-.09-.06a1.53 1.53 0 0 0-2.08.53l-.14.24a1.53 1.53 0 0 0 .4 2.03l.1.07c.87.63.87 1.94 0 2.57l-.1.07a1.53 1.53 0 0 0-.4 2.03l.14.24c.42.72 1.3.98 2.08.53l.09-.06c.85-.5 1.9-.06 2.27.88.22.56.76.94 1.36.94h.28c.6 0 1.14-.38 1.36-.94.37-.94 1.42-1.38 2.27-.88l.09.06c.78.45 1.66.19 2.08-.53l.14-.24a1.53 1.53 0 0 0-.4-2.03l-.1-.07a1.53 1.53 0 0 1 0-2.57l.1-.07a1.53 1.53 0 0 0 .4-2.03l-.14-.24a1.53 1.53 0 0 0-2.08-.53l-.09.06c-.85.5-1.9.06-2.27-.88a1.45 1.45 0 0 0-1.36-.94h-.28ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd"/></svg>`

function injectSettingIcon(container: Element): boolean {
  // 按钮组锚点：搜索 icon（Alpine action 名，全站稳定）。
  // group = 搜索 a 的直接父级 = 按钮组 flex 行（两套响应式容器结构一致）；
  // 国旗 a 外面还包着一层 DIV.relative.z-max（下拉容器），不能把 icon 插到它里面，
  // 否则会掉出 flex 行叠到国旗正下方（实测踩坑）——统一 appendChild 到行尾
  const groups = new Set<Element>()
  for (const a of container.querySelectorAll('a')) {
    if (a.getAttributeNames().some((n) => (a.getAttribute(n) || '').includes('toggleSearch')))
      groups.add(a.parentElement!)
  }
  if (!groups.size) return false
  for (const group of groups) {
    if (group.querySelector(':scope > [data-setting-icon]')) continue
    const icon = Object.assign(document.createElement('a'), {
      href: '#',
      innerHTML: GEAR_SVG,
    })
    icon.setAttribute('data-setting-icon', '')
    icon.setAttribute('class', 'rounded-md text-nord6 hover:text-primary focus:outline-none')
    icon.setAttribute('alt', '脚本设置')
    icon.addEventListener('click', (e) => {
      e.preventDefault()
      toggleSettingPanel()
    })
    group.appendChild(icon)
  }
  return true
}

// 两套容器分别注入；observer 不能在"任一套成功"时就断开——
// 小屏套先渲染，若此时断开，大屏 NAV 套会永久缺失（实测踩坑）。
// 两个容器都注入完成才断开；去重由 [data-setting-icon] 标记保证，重复触发无害
export function registerSettingIcon(): void {
  const injectAll = (): boolean => {
    const containers = [document.querySelector('div.sm\\:container'), document.querySelector('nav')]
    let injected = 0
    for (const c of containers) {
      // nav 未渲染不能计入"完成"——否则 sm 套先就绪时 injectAll 提前返回 true，
      // observer 断开，大屏套永久缺失（实测踩坑两次：缺 NAV、缺 attributes 监听）
      if (!c) return false
      if (injectSettingIcon(c)) injected++
    }
    // 容器都未渲染时从共同父级兜底（组定位仍落在响应式容器内，标记防重）
    if (!injected) {
      const bar = document.querySelector('div[class*="fixed z-max"]')
      if (bar && injectSettingIcon(bar)) injected++
    }
    return injected === containers.length
  }
  if (injectAll()) return
  if (injectAll()) return
  // attributes 必须监听：NAV 套的 a 元素先入 DOM、@click 属性由 Alpine 之后补上，
  // 只看 childList 会在最后一突变更早前错过（实测踩坑：大屏 icon 永久缺失）
  const obs = new MutationObserver(() => {
    if (injectAll()) obs.disconnect()
  })
  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })
  setTimeout(() => obs.disconnect(), 15000)
}
