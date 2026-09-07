import { GM_getValue, GM_setValue } from '../utils/gm.ts'
import { currentLang } from '../utils/lang.ts'
import { toast } from '../utils/toast.ts'
import { waitDOMContentLoaded } from '../utils/wait.ts'

// 收藏与片单的备份导出：顺序抓取自己账号的分页列表页
// （服务端渲染 HTML，无内部列表接口），解析视频卡片后下载 JSON。
// 每页间隔 400ms，与正常翻页浏览相当，避免给服务器额外压力。

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

async function fetchDoc(url: string): Promise<Document> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  return new DOMParser().parseFromString(html, 'text/html')
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

// 顺序翻页抓取，某页没有新条目时结束（100 页兜底）
async function crawlVideos(baseUrl: string): Promise<VideoItem[]> {
  const all: VideoItem[] = []
  const seen = new Set<string>()
  for (let page = 1; page <= 100; page++) {
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
  const doc = await fetchDoc(`${location.origin}/${lang}/playlists`)
  const map = new Map<string, { name: string; url: string }>()
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
  const playlists: PlaylistData[] = []
  for (const [key, { name, url }] of map) {
    toast(`导出片单：${name}`)
    playlists.push({ key, name, videos: await crawlVideos(url) })
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
const LAST_MANUAL_KEY = 'last-manual-export-ts'
const MAX_SNAPSHOTS = 3

function readSnapshots(): Snapshot[] {
  return GM_getValue<Snapshot[]>(SNAPSHOTS_KEY, [])
}

function fmtTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function snapshotStat(s: Snapshot): string {
  const videos = s.playlists.reduce((n, p) => n + p.videos.length, 0)
  return `收藏 ${s.saved.length} 部 · 片单 ${s.playlists.length} 个 / 共 ${videos} 部`
}

function saveSnapshot(s: Snapshot): void {
  const list = [s, ...readSnapshots()].slice(0, MAX_SNAPSHOTS)
  GM_setValue(SNAPSHOTS_KEY, list)
  GM_setValue(LAST_BACKUP_KEY, s.ts)
}

// 备份抓取耗时较长，期间挂 beforeunload：
// 关标签会弹浏览器原生"离开页面？"确认，确认离开则抛弃本次备份
function preventUnload(e: BeforeUnloadEvent): void {
  e.preventDefault()
  e.returnValue = ''
}

async function runBackup(saveSnap: boolean): Promise<void> {
  window.addEventListener('beforeunload', preventUnload)
  try {
    const { saved, playlists } = await crawlAll()
    const snap: Snapshot = { ts: Date.now(), saved, playlists }
    // 快照与自动备份同一体系：只有自动备份写入快照并刷新其时间戳；
    // 手动抓取完全独立，只下载文件
    if (saveSnap) saveSnapshot(snap)
    downloadSnapshot(snap)
    toast(`备份完成：收藏 ${saved.length} 部，片单 ${playlists.length} 个`)
  } finally {
    window.removeEventListener('beforeunload', preventUnload)
  }
}

function downloadSnapshot(s: Snapshot): void {
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
  toast('备份收藏中…')
  const saved = await crawlVideos(`${location.origin}/${lang}/saved`)
  toast(`收藏 ${saved.length} 部，备份片单中…`)
  const playlists = await crawlPlaylists(lang)
  return { saved, playlists }
}

async function crawlFresh(): Promise<void> {
  if (exporting) {
    toast('备份进行中，请稍候')
    return
  }
  // 距最近一次抓取（手动或自动备份）不足 10 分钟时二次确认
  const last = Math.max(
    GM_getValue<number>(LAST_MANUAL_KEY, 0),
    GM_getValue<number>(LAST_BACKUP_KEY, 0),
  )
  const gapMin = Math.round((Date.now() - last) / 60000)
  if (gapMin < 10) {
    const ok = window.confirm(
      `距离上次抓取仅 ${gapMin} 分钟，数据可能没什么变化。确定要重新抓取吗？`,
    )
    if (!ok) return
  }
  exporting = true
  try {
    await runBackup(false)
    GM_setValue(LAST_MANUAL_KEY, Date.now())
  } catch (err) {
    toast(`备份失败：${err instanceof Error ? err.message : '网络异常'}`)
  } finally {
    exporting = false
  }
}

// ---- 导出备份选择面板 ----

export function exportBackup(): void {
  if (document.getElementById('backup-panel')) return
  const snapshots = readSnapshots()
  const panel = Object.assign(document.createElement('div'), {
    id: 'backup-panel',
    innerHTML: `
      <div class="setting-title">导出备份</div>
      <div class="backup-hint">抓取最新数据约需 1–3 分钟，期间请勿关闭本标签页</div>
      <div class="setting-actions backup-latest">
        <button id="backup-latest-btn" type="button">抓取最新数据</button>
      </div>
      ${
        // 固定渲染 3 个槽位，高度恒定
        `<div class="backup-list">${[0, 1, 2]
          .map((i) => {
            const s = snapshots[i]
            if (!s)
              return '<div class="backup-row backup-empty"><span>（空槽位，等待自动备份）</span></div>'
            return `
            <div class="backup-row">
              <span>${fmtTs(s.ts)}<br>${snapshotStat(s)}</span>
              <button type="button" data-i="${i}">下载</button>
            </div>`
          })
          .join('')}</div>`
      }
      <div class="setting-actions">
        <button id="backup-close" type="button">关闭</button>
      </div>
    `,
  })
  document.body.appendChild(panel)

  panel.querySelector('#backup-latest-btn')?.addEventListener('click', () => {
    panel.remove()
    crawlFresh()
  })
  panel.querySelector('#backup-close')?.addEventListener('click', () => {
    panel.remove()
  })
  panel.querySelectorAll<HTMLButtonElement>('.backup-row button').forEach((b) => {
    b.addEventListener('click', () => {
      const s = readSnapshots()[Number(b.dataset.i)]
      if (s) {
        downloadSnapshot(s)
        toast('已导出历史备份')
      }
      panel.remove()
    })
  })
}

// ---- 自动备份：距上次超过 7 天则在打开页面时自动导出 ----

const AUTO_INTERVAL = 7 * 24 * 3600 * 1000

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
      runBackup(true)
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
