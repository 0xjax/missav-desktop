import { GM_getValue, GM_setValue, GM_registerMenuCommand } from './utils/gm.ts'
import { waitDOMContentLoaded } from './utils/wait.ts'

// 新增设置项：在 keyValues 加键（键名即存储 key，值为面板显示文案）
const keyValues: Record<string, string> = {
  // 'example-toggle': '示例开关',
}

// 设置项默认值，未列出的键默认为 false
const keyDefaults: Record<string, boolean> = {
  // 'example-toggle': true,
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

function toggleSettingPanel(): void {
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
