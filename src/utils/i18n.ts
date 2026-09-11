import { currentLang } from './lang.ts'

// 脚本 UI 文案表：仅中英双语，语言跟随站点语言（cn → 中文，其余语言 → 英文兜底）。
// NOTE 不做手动语言设置：站点本身已有语言切换器（lang-pref 记偏好），
// 脚本 UI 跟着页面走最不容易出现"页面英文、脚本中文"的割裂。
// 值统一为 [中文, English]，键名点分层；文案里的 {x} 由 t() 的第二参数替换。
const DICT = {
  // ---- 设置面板 ----
  'setting.title': ['脚本设置', 'Script Settings'],
  'setting.close': ['关闭', 'Close'],
  'setting.save': ['保存', 'Save'],
  'setting.export': ['导出备份', 'Export Backup'],
  'menu.options': ['可选功能', 'Features'],
  'setting.back': ['← 返回', '← Back'],
  'setting.backupHint': [
    '立即备份约需 1–3 分钟，期间请勿关闭本标签页；完成后会覆盖今日快照并下载',
    "A backup takes about 1–3 minutes. Don't close this tab; when done it overwrites today's snapshot and downloads it.",
  ],
  'setting.backupNow': ['立即备份', 'Back Up Now'],
  'setting.download': ['下载', 'Download'],
  'setting.emptySlot': ['（空槽位）', '(empty slot)'],
  'setting.exported': ['已导出历史备份', 'Historical backup exported'],
  'opt.block-ads': ['去广告', 'Block Ads'],
  'opt.lang-pref': ['语言偏好', 'Language Preference'],
  'opt.search-pref': ['搜索偏好', 'Search Preference'],
  'opt.shortcut-keys': ['快捷操作', 'Keyboard Shortcuts'],
  'opt.fast-save': ['收藏片单增强', 'Enhanced Save & Playlists'],
  'opt.sources': ['多源显示切换', 'Multi-source Switcher'],
  'opt.playlist-panel': ['片单面板优化', 'Playlist Panel Tuning'],
  'opt.playlist-sort': ['片单排序（第三级）', 'Playlist Order (third level)'],
  'sort.recent': ['按最近操作', 'By recent action'],
  'sort.name': ['按名称', 'By name'],
  'sort.viewed': ['按最近观看', 'By recently viewed'],
  'opt.playlist-dock': [
    '片单右侧栏（宽屏自动展开）',
    'Playlist Sidebar (auto-expand on wide screens)',
  ],
  'opt.topbar-ui': [
    '顶栏增强（设置入口 + 图标统一）',
    'Topbar Enhancements (settings entry + unified icons)',
  ],

  // ---- 快捷键帮助 ----
  'help.title': ['快捷键', 'Shortcuts'],
  'help.playPause': ['播放 / 暂停', 'Play / Pause'],
  'help.save': ['收藏 / 取消收藏', 'Save / Unsave'],
  'help.playlist': ['展开 / 收起片单', 'Open / Close Playlists'],
  'help.search': ['聚焦搜索框', 'Focus Search Box'],
  'help.home': ['回到首页', 'Go to Homepage'],
  'help.saved': ['打开我的收藏', 'Open My Collection'],
  'help.history': ['打开观看历史', 'Open Watch History'],
  'help.settings': ['脚本设置', 'Script Settings'],
  'help.help': ['快捷键帮助', 'Shortcut Help'],
  'help.fullscreen': ['全屏（站点自带）', 'Fullscreen (site built-in)'],

  // ---- 多源分段器档位 ----
  // 档位按源自己的字幕语言分（中字/英字），不跟站点语言走：同一个番号可能同时有两者
  'source.original': ['原版', 'Original'],
  'source.uncensored': ['无码', 'Uncensored'],
  'source.cnsub': ['中字', 'Chinese sub'],
  'source.ensub': ['英字', 'Eng sub'],
  'source.fetch': ['档位为推测，点击检测该番号的全部源', 'Tier guessed — click to detect all sources'],
  'source.failed': ['多源检测失败，请重试', 'Source detection failed, please retry'],

  // ---- 收藏 / 片单反馈 ----
  'save.saved': ['已收藏', 'Saved'],
  'save.unsaved': ['已取消收藏', 'Removed from saved'],
  'save.added': ['已加入片单', 'Added to playlist'],
  'save.removed': ['已移出片单', 'Removed from playlist'],
  'save.failed': ['操作失败，请重试', 'Action failed, please retry'],
  'save.netError': ['网络错误，操作未生效', 'Network error, action not applied'],

  // ---- 备份 ----
  'backup.saved': ['备份收藏', 'Backing up saved'],
  'backup.savedDone': ['收藏 {n} 部，开始备份片单', '{n} saved items, backing up playlists'],
  'backup.playlistList': ['备份片单列表：第 {page} 页', 'Backing up playlist list: page {page}'],
  'backup.playlist': ['片单 {i}/{total}「{name}」', 'Playlist {i}/{total} "{name}"'],
  'backup.progress': ['{label}：第 {page} 页（已抓 {n} 条）', '{label}: page {page} ({n} items)'],
  'backup.stat': [
    '{saved} 收藏 · {lists} 片单 · {videos} 片',
    '{saved} saved · {lists} playlists · {videos} videos',
  ],
  'backup.done': [
    '备份完成：收藏 {saved} 部，片单 {lists} 个',
    'Backup complete: {saved} saved, {lists} playlists',
  ],
  'backup.running': ['备份进行中，请稍候', 'Backup already running, please wait'],
  'backup.confirm': [
    '距离上次备份仅 {min} 分钟，数据可能没什么变化。确定要重新备份吗？',
    'The last backup was only {min} minutes ago, so data may be unchanged. Back up again?',
  ],
  'backup.failed': ['备份失败：{msg}', 'Backup failed: {msg}'],
  'backup.netError': ['网络异常', 'network error'],
  'backup.denied': ['HTTP {status}（重试后仍被拒绝）', 'HTTP {status} (still refused after retries)'],

  // ---- 页内改写：推广链接精简后的文案 ----
  'ad.manga': ['漫画', 'Manga'],
}

export type I18nKey = keyof typeof DICT

// 当前 UI 语言：站点语言为 cn 时中文，其余一律英文
function uiLang(): 'cn' | 'en' {
  return currentLang() === 'cn' ? 'cn' : 'en'
}

export function t(key: I18nKey, params?: Record<string, string | number>): string {
  let s: string = DICT[key][uiLang() === 'cn' ? 0 : 1]
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
