// @grant 表示全局作用域运行，而不在隔离沙盒内使用特定 API

import './style/main.css'

import { GM_getValue } from './utils/gm.ts'
import { registerSettingMenu } from './setting.js'
import { blockAds } from './modules/block-ads.js'
import { preferLang } from './modules/lang-pref.js'
import { searchPref } from './modules/search-pref.js'
import { shortcuts } from './modules/shortcuts.js'
;(function () {
  if (window.top !== window.self) {
    return
  } // 检查当前执行环境是否为顶级窗口

  console.log('MissAV desktop execute!')

  registerSettingMenu()

  // 按页面路径在此分发各功能模块
  if (GM_getValue('block-ads', true)) blockAds()
  if (GM_getValue('lang-pref', true)) preferLang()
  if (GM_getValue('search-pref', true)) searchPref()
  if (GM_getValue('shortcut-keys', true)) shortcuts()
})()
