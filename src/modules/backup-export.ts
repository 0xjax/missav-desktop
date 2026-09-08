import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { stickyToast, toast } from '../utils/toast.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'
import { setPlaylistCounts } from './playlist-panel.ts'

// 收藏与片单的备份导出：顺序抓取自己账号的分页列表页
// （服务端渲染 HTML，无内部列表接口），解析视频卡片后下载 JSON。
// 每页间隔 400ms，与正常翻页浏览相当，避免给服务器额外压力。
// 快照是唯一事实来源：立即备份与自动备份同一体系，按"日"占槽（同日覆盖，
// 最多 5 份）；收藏/片单操作成功后动态回写最新快照，保持近乎最新。

interface VideoItem {
  id: string
  title: string
  url: string
}

interface PlaylistData {
  key: string
  name: string
  videos: VideoItem[]
}

let exporting = false

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Cloudflare 防爬会在连续翻页中随机插入 403（实测单次请求即触发、与具体页面无关），
// 不是封禁：稍候重试同一 URL 即可通过。指数退避重试 4 次，全部失败才放弃本次备份。
async function fetchDoc(url: string): Promise<Document> {
  const delays = [2000, 5000, 10000, 20000]
  let lastStatus = 0
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) await sleep(delays[attempt - 1])
    const res = await fetch(url, { credentials: 'include' })
    if (res.ok) return new DOMParser().parseFromString(await res.text(), 'text/html')
    lastStatus = res.status
    if (res.status !== 403) break // 403 之外的错误重试无意义
  }
  throw new Error(`HTTP ${lastStatus}（重试后仍被拒绝）`)
}

// 视频卡片：.thumbnail 内的 a（href 为视频页，alt 为番号，img alt 为标题）
function parseVideos(doc: Document): VideoItem[] {
  const items: VideoItem[] = []
  const seen = new Set<string>()
  doc.querySelectorAll('.thumbnail a[href]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    const m = href.match(/\/([a-z0-9-]+)\/?$/i)
    if (!m) return
    const id = m[1]
    if (seen.has(id)) return
    seen.add(id)
    const title =
      a.querySelector('img')?.getAttribute('alt')?.trim() ||
      a.textContent?.trim() ||
      id
    items.push({ id, title, url: href })
  })
  return items
}

const STICKY_ID = 'mx-backup-sticky'

// 顺序翻页抓取，某页没有新条目时结束（100 页兜底）
async function crawlVideos(baseUrl: string, label: string): Promise<VideoItem[]> {
  const all: VideoItem[] = []
  const seen = new Set<string>()
  for (let page = 1; page <= 100; page++) {
    stickyToast(STICKY_ID, `${label}：第 ${page} 页（已抓 ${all.length} 条）`)
    const doc = await fetchDoc(`${baseUrl}?page=${page}`)
    const fresh = parseVideos(doc).filter((i) => !seen.has(i.id))
    fresh.forEach((i) => {
      seen.add(i.id)
      all.push(i)
    })
    if (fresh.length === 0) break
    await sleep(400)
  }
  return all
}

async function crawlPlaylists(lang: string): Promise<PlaylistData[]> {
  // 片单列表本身也分页（12 个/页），某页没有新片单时结束（20 页兜底）
  const map = new Map<string, { name: string; url: string }>()
  for (let page = 1; page <= 20; page++) {
    stickyToast(STICKY_ID, `备份片单列表：第 ${page} 页`)
    const doc = await fetchDoc(`${location.origin}/${lang}/playlists?page=${page}`)
    const before = map.size
    doc.querySelectorAll('a[href*="/playlists/"]').forEach((a) => {
      const href = a.getAttribute('href') || ''
      const m = href.match(/\/playlists\/([a-z0-9]+)\/?$/i)
      if (!m || m[1] === 'create' || map.has(m[1])) return
      // 片单名在链接内第一个 <p>，其余文本是"私人/最后更新"等元信息
      map.set(m[1], {
        name: a.querySelector('p')?.textContent?.trim() || m[1],
        url: href,
      })
    })
    if (map.size === before) break
    await sleep(400)
  }
  const playlists: PlaylistData[] = []
  let i = 0
  for (const [key, { name, url }] of map) {
    i++
    playlists.push({
      key,
      name,
      videos: await crawlVideos(url, `片单 ${i}/${map.size}「${name}」`),
    })
    await sleep(400)
  }
  return playlists
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  })
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

// ---- 快照留存：最近 3 份完整备份，可随时选择导出 ----

interface Snapshot {
  ts: number
  saved: VideoItem[]
  playlists: PlaylistData[]
}

const SNAPSHOTS_KEY = 'backup-snapshots'
const LAST_BACKUP_KEY = 'last-backup-ts'
const MAX_SNAPSHOTS = 5

// 以下快照读取/格式化/下载函数供设置面板的备份子视图（setting.ts）使用

export function readSnapshots(): Snapshot[] {
  return GM_getValue<Snapshot[]>(SNAPSHOTS_KEY, [])
}

function localDay(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fmtTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function snapshotStat(s: Snapshot): string {
  const videos = s.playlists.reduce((n, p) => n + p.videos.length, 0)
  return `收藏 ${s.saved.length} 部 · 片单 ${s.playlists.length} 个 / 共 ${videos} 部`
}

function syncCounts(s: Snapshot): void {
  const counts: Record<string, number> = {}
  s.playlists.forEach((p) => (counts[p.key] = p.videos.length))
  setPlaylistCounts(counts)
}

// 快照按"日"为槽位：与最新快照同日则覆盖（一天最多一份），否则新起一槽
function saveSnapshot(s: Snapshot): void {
  const list = readSnapshots()
  if (list[0] && localDay(list[0].ts) === localDay(s.ts)) list[0] = s
  else list.unshift(s)
  GM_setValue(SNAPSHOTS_KEY, list.slice(0, MAX_SNAPSHOTS))
  GM_setValue(LAST_BACKUP_KEY, s.ts)
  syncCounts(s)
}

// 收藏/片单操作成功后回写最新快照：立即备份一次，后续操作让快照保持近乎最新。
// 没有任何快照时是空操作
export function applyChangeToLatestSnapshot(
  video: { id: string; title: string; url: string },
  added: boolean,
  playlistKey?: string,
): void {
  const list = readSnapshots()
  const latest = list[0]
  if (!latest) return
  if (playlistKey === undefined) {
    latest.saved = added
      ? [video, ...latest.saved.filter((v) => v.id !== video.id)]
      : latest.saved.filter((v) => v.id !== video.id)
  } else {
    const pl = latest.playlists.find((p) => p.key === playlistKey)
    if (!pl) return
    pl.videos = added
      ? [video, ...pl.videos.filter((v) => v.id !== video.id)]
      : pl.videos.filter((v) => v.id !== video.id)
  }
  GM_setValue(SNAPSHOTS_KEY, list)
  syncCounts(latest)
}

// 备份抓取耗时较长，期间挂 beforeunload：
// 关标签会弹浏览器原生"离开页面？"确认，确认离开则抛弃本次备份
function preventUnload(e: BeforeUnloadEvent): void {
  e.preventDefault()
  e.returnValue = ''
}

async function runBackup(): Promise<void> {
  window.addEventListener('beforeunload', preventUnload)
  try {
    const { saved, playlists } = await crawlAll()
    const snap: Snapshot = { ts: Date.now(), saved, playlists }
    saveSnapshot(snap)
    downloadSnapshot(snap)
    stickyToast(STICKY_ID) // 移除常驻进度条
    toast(`备份完成：收藏 ${saved.length} 部，片单 ${playlists.length} 个`)
  } catch (err) {
    stickyToast(STICKY_ID)
    throw err
  } finally {
    window.removeEventListener('beforeunload', preventUnload)
  }
}

export function downloadSnapshot(s: Snapshot): void {
  const d = new Date(s.ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  downloadJson(
    {
      exportedAt: `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      saved: s.saved,
      playlists: s.playlists,
    },
    `missav-backup-${localDate}.json`,
  )
}

async function crawlAll(): Promise<{
  saved: VideoItem[]
  playlists: PlaylistData[]
}> {
  const lang = currentLang() ?? 'cn'
  const saved = await crawlVideos(`${location.origin}/${lang}/saved`, '备份收藏')
  stickyToast(STICKY_ID, `收藏 ${saved.length} 部，开始备份片单`)
  const playlists = await crawlPlaylists(lang)
  return { saved, playlists }
}

// ---- 导出备份选择面板已移至设置弹窗的备份子视图（setting.ts） ----

// 导出备份选择面板已移至设置弹窗的备份子视图（setting.ts）；
// backupNow 供其"立即备份"按钮调用

export async function backupNow(): Promise<void> {
  if (exporting) {
    toast('备份进行中，请稍候')
    return
  }
  // 距最近一次备份（立即或自动）不足 10 分钟时二次确认
  const last = GM_getValue<number>(LAST_BACKUP_KEY, 0)
  const gapMin = Math.round((Date.now() - last) / 60000)
  if (gapMin < 10) {
    const ok = window.confirm(
      `距离上次备份仅 ${gapMin} 分钟，数据可能没什么变化。确定要重新备份吗？`,
    )
    if (!ok) return
  }
  exporting = true
  try {
    await runBackup()
  } catch (err) {
    toast(`备份失败：${err instanceof Error ? err.message : '网络异常'}`)
  } finally {
    exporting = false
  }
}

// ---- 自动备份：距上次超过 3 天则在打开页面时自动导出 ----

const AUTO_INTERVAL = 3 * 24 * 3600 * 1000

export function autoBackup(): void {
  waitDOMContentLoaded(() => {
    // 延迟启动，不与页面首屏加载争抢请求
    setTimeout(() => {
      if (exporting) return
      const last = GM_getValue<number>(LAST_BACKUP_KEY, 0)
      if (Date.now() - last < AUTO_INTERVAL) return
      // 先写入时间戳占位，其他标签页看到新鲜值就会跳过
      GM_setValue(LAST_BACKUP_KEY, Date.now())
      exporting = true
      toast('开始自动备份收藏与片单…')
      runBackup()
        .catch((err) => {
          // 失败则回滚时间戳，下次打开页面重试
          GM_setValue(LAST_BACKUP_KEY, last)
          toast(`自动备份失败：${err instanceof Error ? err.message : '网络异常'}`)
        })
        .finally(() => {
          exporting = false
        })
    }, 8000)
  })
}
