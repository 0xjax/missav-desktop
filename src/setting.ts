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
  'auto-backup': '自动备份（每 7 天）',
}

// 设置项默认值，未列出的键默认为 false
const keyDefaults: Record<string, boolean> = {
  'block-ads': true,
  'lang-pref': true,
  'search-pref': true,
  'shortcut-keys': true,
  'fast-save': true,
  'auto-backup': true,
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
