import { GM_getValue, GM_setValue, GM_registerMenuCommand } from './utils/gm.ts'
import { toast } from './utils/toast.ts'
import { waitDOMContentLoaded } from './utils/wait.ts'
import {
  backupNow,
  downloadSnapshot,
  readSnapshots,
  snapshotStat,
  fmtTs,
} from './modules/backup-export.ts'

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
  'topbar-ui': '顶栏增强（设置入口 + 图标统一）',
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
  'topbar-ui': true,
}

function createSettingPanel(): HTMLElement {
  const panel = Object.assign(document.createElement('div'), {
    id: 'setting-panel',
    innerHTML: `
      <div id="setting-view">
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
        <div class="setting-actions dialog-footer">
          <button class="dialog-cancel" type="button">取消</button>
          <button id="setting-export" type="button">导出备份</button>
          <button id="setting-save" type="button">保存</button>
        </div>
      </div>
      <div id="backup-view" style="display: none"></div>
    `,
  })

  const checkboxes = panel.querySelectorAll(
    '.setting-checkboxes input[type="checkbox"]',
  ) as NodeListOf<HTMLInputElement>

  checkboxes.forEach((checkbox) => {
    const key = checkbox.dataset.key as string
    checkbox.checked = GM_getValue(key, keyDefaults[key] ?? false)
  })

  panel.querySelector('.dialog-cancel')?.addEventListener('click', () => {
    panel.remove()
  })

  panel.querySelector('#setting-export')?.addEventListener('click', () => {
    showBackupView(panel)
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

// 备份子视图：在同一弹窗内导航层级切换（设置 → 备份 → 返回），
// 替代原先两个独立弹窗的割裂感
function showBackupView(panel: HTMLElement): void {
  const backupView = panel.querySelector('#backup-view') as HTMLElement
  const settingView = panel.querySelector('#setting-view') as HTMLElement
  if (!backupView || backupView.style.display !== 'none') return
  const render = (): HTMLElement => {
    const snapshots = readSnapshots()
    const view = Object.assign(document.createElement('div'), {
      className: 'backup-render',
      innerHTML: `
        <div class="dialog-header">
          <button class="dialog-back" type="button">← 返回</button>
          <span class="setting-title">导出备份</span>
        </div>
        <div class="backup-hint">立即备份约需 1–3 分钟，期间请勿关闭本标签页；完成后会覆盖今日快照并下载</div>
        <div class="setting-actions backup-latest">
          <button id="backup-latest-btn" type="button">立即备份</button>
        </div>
        ${
          // 固定渲染 5 个槽位，高度恒定；行内"时间 + 统计"单行排布保持紧凑
          `<div class="backup-list">${[0, 1, 2, 3, 4]
            .map((i) => {
              const s = snapshots[i]
              if (!s)
                return '<div class="backup-row backup-empty"><span>（空槽位，等待自动备份）</span></div>'
              return `
              <div class="backup-row">
                <span><b>${fmtTs(s.ts)}</b> · ${snapshotStat(s)}</span>
                <button type="button" data-i="${i}">下载</button>
              </div>`
            })
            .join('')}</div>`
        }
        <div class="setting-actions dialog-footer">
          <button class="dialog-cancel" type="button">取消</button>
        </div>
      `,
    })
    view.querySelector('.dialog-back')?.addEventListener('click', () => {
      view.style.display = 'none'
      backupView.style.display = 'none'
      settingView.style.display = ''
    })
    view.querySelector('.dialog-cancel')?.addEventListener('click', () => {
      panel.remove()
    })
    view.querySelector('#backup-latest-btn')?.addEventListener('click', () => {
      panel.remove()
      backupNow()
    })
    view.querySelectorAll<HTMLButtonElement>('.backup-row button').forEach((b) => {
      b.addEventListener('click', () => {
        const s = readSnapshots()[Number(b.dataset.i)]
        if (s) {
          downloadSnapshot(s)
          toast('已导出历史备份')
        }
        panel.remove()
      })
    })
    return view
  }
  settingView.style.display = 'none'
  backupView.style.display = ''
  backupView.replaceChildren(render())
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

// 页内设置 icon：嵌在站点顶栏按钮组最右（语言图标之后），与搜索/语言同款风格。
// 站点顶栏有两套响应式容器（小屏 div.xl:hidden / 大屏 nav.hidden.xl:flex），
// 都要插入；锚点用 Alpine action 名定位（不含构建 hash，跨改版稳定）。
// 顶栏四个图标统一为 heroicons v1 solid 20x20（站点搜索本就是该包的 search）：
// 齿轮 cog（脚本新增）、语言 globe-alt（替换站点国旗 img）、汉堡 menu（替换小屏 24 outline）。
// SVG 内容取自官方仓库 tailwindlabs/heroicons v1.0.6，fill 换 currentColor 随主题变色
const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-6 w-6">${inner}</svg>`

const GEAR_SVG = svg(
  `<path fill-rule="evenodd" clip-rule="evenodd" d="M11.4892 3.17094C11.1102 1.60969 8.8898 1.60969 8.51078 3.17094C8.26594 4.17949 7.11045 4.65811 6.22416 4.11809C4.85218 3.28212 3.28212 4.85218 4.11809 6.22416C4.65811 7.11045 4.17949 8.26593 3.17094 8.51078C1.60969 8.8898 1.60969 11.1102 3.17094 11.4892C4.17949 11.7341 4.65811 12.8896 4.11809 13.7758C3.28212 15.1478 4.85218 16.7179 6.22417 15.8819C7.11045 15.3419 8.26594 15.8205 8.51078 16.8291C8.8898 18.3903 11.1102 18.3903 11.4892 16.8291C11.7341 15.8205 12.8896 15.3419 13.7758 15.8819C15.1478 16.7179 16.7179 15.1478 15.8819 13.7758C15.3419 12.8896 15.8205 11.7341 16.8291 11.4892C18.3903 11.1102 18.3903 8.8898 16.8291 8.51078C15.8205 8.26593 15.3419 7.11045 15.8819 6.22416C16.7179 4.85218 15.1478 3.28212 13.7758 4.11809C12.8896 4.65811 11.7341 4.17949 11.4892 3.17094ZM10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z"/>`,
)

const GLOBE_SVG = svg(
  `<path fill-rule="evenodd" clip-rule="evenodd" d="M4.08296 9H6.02863C6.11783 7.45361 6.41228 6.02907 6.86644 4.88228C5.41752 5.77135 4.37513 7.25848 4.08296 9ZM10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 4C9.92395 4 9.76787 4.03173 9.5347 4.26184C9.29723 4.4962 9.03751 4.8849 8.79782 5.44417C8.40914 6.3511 8.12491 7.58559 8.03237 9H11.9676C11.8751 7.58559 11.5909 6.3511 11.2022 5.44417C10.2321 4.03173 10.076 4 10 4ZM13.9714 9C13.8822 7.45361 13.5877 6.02907 13.1336 4.88228C14.5825 5.77135 15.6249 7.25848 15.917 9H13.9714ZM11.9676 11H8.03237C8.12491 12.4144 8.40914 13.6489 8.79782 14.5558C9.03751 15.1151 9.29723 15.5038 9.5347 15.7382C9.76787 15.9683 9.92395 16 10 16C10.076 16 10.2321 15.9683 10.4653 15.7382C10.7028 15.5038 10.9625 15.1151 11.2022 14.5558C11.5909 13.6489 11.8751 12.4144 11.9676 11ZM13.1336 15.1177C13.5877 13.9709 13.8822 12.5464 13.9714 11H15.917C15.6249 12.7415 14.5825 14.2287 13.1336 15.1177ZM6.86644 15.1177C6.41228 13.9709 6.11783 12.5464 6.02863 11H4.08296C4.37513 12.7415 5.41752 14.2287 6.86644 15.1177Z"/>`,
)

const MENU_SVG = svg(
  `<path fill-rule="evenodd" clip-rule="evenodd" d="M3 5C3 4.44772 3.44772 4 4 4H16C16.5523 4 17 4.44772 17 5C17 5.55228 16.5523 6 16 6H4C3.44772 6 3 5.55228 3 5Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 10C3 9.44772 3.44772 9 4 9H16C16.5523 9 17 9.44772 17 10C17 10.5523 16.5523 11 16 11H4C3.44772 11 3 10.5523 3 10Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 15C3 14.4477 3.44772 14 4 14H16C16.5523 14 17 14.4477 17 15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15Z"/>`,
)

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

// 站点图标统一化：语言切换（国旗 img → globe）、小屏汉堡（24 outline → solid menu）。
// 只动外观不动行为：Alpine 绑定都在父级 a 上，替换的是 a 的子内容
function unifyIcons(container: Element): boolean {
  let touched = false
  for (const a of container.querySelectorAll('a')) {
    const actions = a.getAttributeNames()
      .map((n) => a.getAttribute(n) || '')
      .join(' ')
    if (actions.includes('showLocaleSwitcher')) {
      const img = a.querySelector('img')
      if (img && !a.querySelector('[data-mx-icon]')) {
        // 原国旗 img 自带颜色，a 无 class；换 svg 后需补上其他按钮同款的配色 class，
        // 否则 currentColor 继承默认黑色（实测踩坑：globe 几乎不可见）
        a.setAttribute(
          'class',
          'rounded-md text-nord6 hover:text-primary focus:outline-none',
        )
        const svgEl = Object.assign(document.createElement('span'), { innerHTML: GLOBE_SVG })
        const node = svgEl.firstElementChild as Element
        node.setAttribute('data-mx-icon', 'lang')
        node.setAttribute('alt', img.getAttribute('alt') || '语言')
        img.replaceWith(node)
        touched = true
      }
    }
    // 小屏汉堡（24 outline 三横线，只存在于 xl:hidden 容器）；NAV 大屏的下拉是菜单项 chevron，不动
    if (actions.includes('showDropdown') && a.closest('[class*="xl:hidden"]')) {
      const old = a.querySelector('svg')
      if (old && !old.hasAttribute('data-mx-icon')) {
        const wrap = Object.assign(document.createElement('span'), { innerHTML: MENU_SVG })
        const node = wrap.firstElementChild as Element
        node.setAttribute('data-mx-icon', 'menu')
        old.replaceWith(node)
        touched = true
      }
    }
  }
  return touched
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
      unifyIcons(c)
    }
    // 容器都未渲染时从共同父级兜底（组定位仍落在响应式容器内，标记防重）
    if (!injected) {
      const bar = document.querySelector('div[class*="fixed z-max"]')
      if (bar && injectSettingIcon(bar)) injected++
    }
    return injected === containers.length
  }
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
