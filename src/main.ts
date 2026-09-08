// @grant 表示全局作用域运行，而不在隔离沙盒内使用特定 API

import './style/main.css'

import { GM_getValue } from './utils/gm.ts'
import { registerSettingIcon, registerSettingMenu, installAntiFlicker } from './setting.js'
import { blockAds } from './modules/block-ads.js'
import { preferLang } from './modules/lang-pref.js'
import { searchPref } from './modules/search-pref.js'
import { shortcuts } from './modules/shortcuts.js'
import { fastSave } from './modules/fast-save.js'
import { autoBackup } from './modules/backup-export.js'
import { sources } from './modules/sources.js'
import { playlistPanel } from './modules/playlist-panel.js'
import { playlistDebug } from './modules/playlist-debug.js'
;(function () {
  if (window.top !== window.self) {
    return
  } // 检查当前执行环境是否为顶级窗口

  console.log('MissAV desktop execute!')

  registerSettingMenu()
  if (GM_getValue('topbar-ui', true)) {
    installAntiFlicker()
    registerSettingIcon()
  }

  // 按页面路径在此分发各功能模块
  if (GM_getValue('block-ads', true)) blockAds()
  if (GM_getValue('lang-pref', true)) preferLang()
  if (GM_getValue('search-pref', true)) searchPref()
  if (GM_getValue('shortcut-keys', true)) shortcuts()
  if (GM_getValue('fast-save', true)) fastSave()
  if (GM_getValue('auto-backup', true)) autoBackup()
  if (GM_getValue('sources', true)) sources()
  if (GM_getValue('playlist-panel', true)) playlistPanel()
  playlistDebug() // WARNING 诊断版：1.35.1，定位片单偶发失效后移除
})()
