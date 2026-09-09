# 开发环境 Runbook

目标：下次继续开发时，按本文档几分钟内恢复到可编码、可实测的状态。

## 一次性环境准备

1. **调试 Chrome**（与日常浏览器隔离，已登录 missav 账号）：
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=D:\chrome-debug-profile
   ```
   **WARNING 调试 Chrome 每次冷启动 = 扩展和登录态都可能不齐**，重启后必须先过一遍以下清单，否则后续实测会莫名失败白耗时间：
   - **Tampermonkey 扩展是 CDP `Extensions.loadUnpacked` 临时加载的，重启即丢**，必须重新加载：源用日常 Chrome 的安装目录复制到无空格路径再 load（路径含空格会报 `File path cannot be resolved`，如 `C:\Users\g1169\AppData\Local\Google\Chrome\User Data\...` 要先复制到 `D:\` 下）；复制源：`...User Data\Default\Extensions\dhdgffkkebhmkfjojejmpbldmpobfkfo\<版本>_0`；**path 参数用 `D:/xxx` 正斜杠形式（不带 `file://` 前缀，带前缀反而报 resolve 失败）**
   - 装好后**主动请用户配合**（比脚本摸黑操作快得多）：1) TM 详情页允许运行用户脚本/开发者模式；2) 打开 `.user.js` 安装 URL 后点确认安装
   - **登录自动化**：`bun scripts/dev/login-debug-chrome.ts <tab子串>`——从仓库根 `.env` 读测试账号自动登录，已登录则跳过。新设备：复制 `.env.example` 为 `.env` 填入账号（`.env` 已 gitignore 不进仓库）；没 `.env` 则脚本跳过，请用户手动登录。跑完用 `/cn/saved` 页无「登录」链接确认成功
   - 验证链路齐了再开工：页面里能找到脚本注入痕迹（如 `.mx-segmented`）+ `/api/me` 返回 200
2. **Tampermonkey**（装在调试 Chrome 上）：
   - 扩展管理页打开「开发者模式」→ 详情里打开「允许运行用户脚本」
   - **实测一律装 `dist/missav-desktop.js`（本地静态服务或文件导入），不用 `bun run dev` 的 dev 壳脚本**——历史上多次出现 dev 与 build 产物行为不一致，dev 实测通过不代表生产行为，以 dist 实测为唯一标准
   - 安装方式：`bun run build` 后把 `dist/missav-desktop.js` 复制为 `dist/missav-desktop.user.js`，经本地静态服务（如 `bun -e "Bun.serve(...)"`）以 `.user.js` URL 打开让 TM 捕获安装；每次改代码 → build → 重开安装 URL（TM 同名自动覆盖更新）
   - **省事路径**：`bun scripts/dev/install-dist.ts`——自起临时静态服务（随机端口，不落 `.user.js` 文件）+ 打开安装 URL + 自动点 TM 的「安装/重新安装」弹窗，一条命令搞定；TM 自动更新时安装页自行关闭，脚本按「已自动更新」正常返回
   - **WARNING dev 模式时序失真**：dev 脚本要从 5173 拉模块（loader ~200ms 才启动），站点 SSR 首绘 ~160-310ms，**脚本物理上跑不赢首绘**——凡依赖"先于站点渲染生效"的功能（如图标替换防闪烁、首帧占位）在 dev 模式必然失效/闪现，这不是代码 bug，是 dev 模式固有失真，不构成实测依据
3. 登录 missav.ai（收藏/片单/备份功能都依赖真实登录态）

## 日常启动

```bash
bun run dev        # 仅用于热改代码时快速试；实测必须用 dist（见上）
```

实测标准流程：`bun run build` → `bun scripts/dev/install-dist.ts` → 刷新 missav 页面。
（手工等价步骤：复制 `dist/missav-desktop.js` 为 `.user.js` → 起静态服务 → 打开 `.user.js` URL → TM 弹窗点安装/更新）

## CDP 调试脚本（scripts/cdp/，9222 端口直连）

| 命令 | 用途 |
| --- | --- |
| `bun scripts/cdp/cdp-eval.ts <url包含子串> <js文件>` | 在指定 tab 执行 JS（支持 Promise，返回 JSON） |
| `bun scripts/cdp/cdp-eval2.ts <url包含> <js文件>` | 同上，但自动接受原生 confirm 对话框 |
| `bun scripts/cdp/cdp-shot.ts <url包含> <输出路径>` | 截图 |
| `bun scripts/cdp/cdp-nav.ts <url包含> [新url]` | 导航/刷新指定 tab |
| `bun scripts/cdp/cdp-reset.ts <url包含>` | tab JS 死循环卡死时：浏览器级关闭并重开同 URL |
| `bun scripts/cdp/cdp-dl.ts` | 设置调试浏览器下载目录（测备份导出用） |
| `bun scripts/cdp/cdp-press.ts <url包含> <元素id>` | 真实输入管线按压元素并全程事件埋点 |
| `bun scripts/cdp/cdp-clear-emulation.ts <url包含>` | 清除视口 override，恢复自适应 |

要点：

- `<url包含子串>` 用能唯一定位 tab 的片段，如 `sone-669-uncensored`；**注意 `sone-669` 会同时命中原版和 `-uncensored-leak` 两个 tab**
- **验证点击/交互 bug 必须用 `cdp-press.ts`（Input.dispatchMouseEvent 真实输入管线）**：JS 合成 `.click()` 与真实按压的激活序列不同（真实按压 checkbox 全程不派发 change/input），合成点击验证通过不代表用户能点
- 选择器类名含 `:`（如 `lg:flex`）时反斜杠转义会在 heredoc 管道里被吃掉，改用属性过滤规避
- 新开 tab：`curl -X PUT "http://localhost:9222/json/new?<url>"`（必须 PUT）
- 读油猴存储：`localStorage.getItem('gm:<key>')`（gm.ts 双写 localStorage 兜底）
- 调试交互类 bug 先埋点取证（完整事件序列 + 数据/DOM 双侧状态），不要在未复现的情况下按猜测写修复
- **用户的真实环境实测是唯一验收标准**：自己环境"验证通过"而用户仍失败时，一律视为未修复；要怀疑的是验证路径差异（合成事件 ≠ 真实输入），而不是用户的操作
- **同一 bug 两次修复无效 = 止损线**：停止修症状，回头质疑架构（如"把状态同步托付给站点 Alpine effect"这类外部依赖），换接管方案

## 浏览器工具分工：纯 CDP vs agent-browser

**纯 CDP（`scripts/cdp/`、`scripts/dev/`）**：确定性环境脚本——登录、装 dist、清 emulation、导航、截图。要求一条命令可复现、零配置、可入库，不要替换成浏览器代理。

**agent-browser（已全局安装，交互式排查用它）**：

```bash
export AGENT_BROWSER_SESSION=mx-debug            # 命名会话，别用默认共享会话
agent-browser --cdp 9222 snapshot -i -c          # 附着 9222，看交互树 + @eN refs
agent-browser --cdp 9222 click @e5
agent-browser --cdp 9222 wait --text "我的帐户"   # 替代手写轮询确认
agent-browser --cdp 9222 record start /tmp/t.webm # 录屏验证闪烁/布局跳动（需 ffmpeg）
agent-browser --cdp 9222 state save /tmp/auth.json # 存登录态复用
agent-browser --cdp 9222 close                   # 用完关掉，别留常驻进程
```

相比手写探针脚本的收益（都是本仓库实际踩过的坑）：找 SPA 隐藏入口/多表单时一条 `snapshot -i` 顶七八个探针脚本；refs 免去手写选择器；`wait` 替代手写 25×1s 轮询；**布局跳动/闪烁类 bug 用 `record` 录视频，截图证明不了**。

**chrome-devtools-mcp：暂不引入**。强项是 perf trace / network / emulation 深查，但需在 kimi-code 加 MCP 配置且工具 schema 常驻每次对话。真需要时按 `npx chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222 --slim` 加；其 extensions 类工具只支持 pipe 连接、不支持 browserUrl，油猴管理仍归 CDP 脚本。

**WARNING 任何工具都不许自己起浏览器或 `--profile` 新开实例**：油猴是 CDP `Extensions.loadUnpacked` 临时加载的，新实例既无脚本也无登录态，实测会假失败（空面板误判、847px 小窗口都源于此）。一律附着运行中的 9222（`--cdp 9222` / `--browserUrl`）。

## 验证闭环

1. `bun run lint && bun run typecheck`
2. 用 CDP 脚本在真实页面上实测功能（交互 bug 用 `cdp-press.ts` 走真实输入管线）
3. 涉及用户交互的修复：**请用户用真实鼠标/键盘验收通过后**再进入下一步
4. `vite.config.js` 版本号递增（高于已发布版号）→ `bun run build`
5. `git add -A && git commit`（中文，Conventional Commits），dist 产物一并提交

## 注意事项

- **测试会动真实账号数据**：收藏/片单操作后必须恢复原状
- **fast-save 自 v1.36.15 起是单一实现**：收藏/片单点击无条件拦截、请求一律由脚本发出（keepalive），Alpine 只作状态来源的首选（不再是拦截前提），反馈（跨标签 toast / saved-cache / 备份快照）乐观写在请求发出后。改它必须用 `cdp-press.ts` 真实输入复测勾选/计数/回滚——片单 checkbox 的激活序列（pre-click 翻转 checked、取消后回滚、x-model effect 部分失效）是硬啃出来的，合成点击验证不出来
- **判定收藏是否真的落库**：用 item hash 查 `/api/items/<hash>/view`（hash 在页面 `x-init` 里）；`/cn/saved` 页面 HTML 里的番号字符串会命中推荐位，不能拿它当判据（实测误报）。同一番号的不同版本是**不同条目**（hash 不同），收藏 A 版本不影响 B 版本
- **WARNING `Ctrl+Shift+T` 恢复的 tab 是关闭前的冻结页面**（bfcache/会话恢复，不重新加载）：脚本不重跑、DOM 停在关闭那一刻，所以「重开仍显示未收藏」**不代表请求没送达**——服务器可能早已成功，刷新一次就对了。验证异步操作是否落库必须刷新页面或直接查接口，别拿恢复出来的页面当判据（实测踩坑：为此排查了一轮 keepalive）
- 页面 JS 死循环卡死时 Runtime.evaluate 也会超时，用 `cdp-reset.ts` 浏览器级重开
- 调试 Chrome 多开会积累大量 tab，卡顿时先清理
- **绝不用 `taskkill //IM chrome.exe` 关调试 Chrome**：会误杀用户正在使用的日常浏览器；只允许经 CDP `Browser.close`（只作用于 9222 调试 profile）
- 页面挂 `beforeunload` 确认弹窗（如备份抓取中）时，原生确认框会阻塞该 tab 的 `Runtime.evaluate` 和截图——CDP 全线超时先想到这一层，不是页面死了；长耗时流程（备份）测试中不要导航页面
- Tampermonkey 装到调试 Chrome：Chrome 137+ 已忽略 `--load-extension`，用 CDP `Extensions.loadUnpacked`（browser endpoint，**path 用 `D:/xxx` 正斜杠且不带 `file://` 前缀**；实测带 `file://` 反而报 `File path cannot be resolved`，且源目录不能含空格，需先复制到 `D:\` 下）
- **WARNING `curl -X PUT /json/new` 新开的 tab 可能落在独立小窗口**（实测视口只有 847px），宽屏专属功能（如片单停靠 ≥1024px）会静默不激活，看起来像功能失效。`Browser.setWindowBounds` 对这类 tab 常改不动；可靠做法是在用户已拉大的窗口里新开 tab，或用 `agent-browser --cdp 9222` 直接操作用户当前 tab
- **WARNING CDP `Emulation.setDeviceMetricsOverride`（设备模拟）会跨刷新/跨导航持续生效**：一旦设过，页面刷新后视口仍是固定尺寸（如 1200×800），看起来像"视口不自适应"。这不是脚本 bug，是 DevTools 模拟残留。清除必须走 `cdp-clear-emulation.ts`：先设 0×0（0 = 跟随窗口）再 clear，**直接 clear 对已固定的 tab 常不生效**；清除后可能需改一下窗口尺寸才立即生效
- **WARNING `pref-lang` 会把 URL 弹回偏好语言**：lang-pref 在 document-start 按偏好跳转，所以 `cdp-nav` 到 `/en/xxx` 会被立刻弹回 `/cn/xxx`（实测踩坑）。测非偏好语言的站点必须先用**站点语言切换器**切过去（脚本从菜单项 href 记偏好），**测完切回原语言**，否则调试 Chrome 的偏好被留下改动
- **兄弟源列表以站点版本菜单为准，搜索页只供徽章**：菜单 `[aria-labelledby=download-option-menu-button]` 只在裸番号主条目页的 SSR 里（实测每个番号都有裸页），列的是全部兄弟源（含跨语言字幕版）。搜索页会按语言过滤，而且**部分番号的搜索页一张匹配卡片都不返回**（实测 sdmf-009 / har-050 / umd-971 / har-068）——只用搜索页会漏兄弟源，表现为分段器只剩当前档
- **番号形态不止 `abc-123`**：还有带数字分部的 `gs-372-2` / `id-004-16`（后缀段要允许数字，用 `[a-z-]` 会整条拒掉、分段器完全不显示）；且 `/cn/playlists/create/<番号>` 这类功能页末段也长得像番号——用 URL 判详情页必须要求「番号前一段是语言段」，只靠末段正则会误判
- **测快捷键要把焦点放到真实位置**：播放器进度条/音量条是 `input[type=range]`，点一下焦点就停在它上面——早期 `isTyping()` 把任何 INPUT 都当"正在输入"，于是 S/P 在播放器上失效（实测复现：焦点在 Seek 滑块时按 S 无反应，移到 body 就正常）。改键盘相关逻辑时，焦点场景至少覆盖 body / 播放器滑块 / 文本输入框三种
- **站点搜索是按语言换版本，不是藏视频**：`/cn/search/<kw>` 永远不返回 `-english-subtitle` 卡（`/en/search/<kw>` 会返回它并替换掉裸番号卡），且 `/cn/english-subtitle` 类目页实测为空——**隐藏只发生在搜索/类目这类"发现层"**。同一部片在 /cn 显示中字版、/en 显示英字版，视频本身两边都搜得到（抽 sdmf-051 / ipx-988 / hnd-999 验证裸页都存在且 /cn 能搜到）。**单条目的版本菜单不受此限制**：`/cn/sdmf-050` 的站点下拉实测给出「切换英文字幕 → `/cn/sdmf-050-english-subtitle`」，且该页 200。分段器读的正是这个菜单（见下条），所以能切到英字版。**已决定不往搜索结果里注入英字卡**（会同一部片并列多版本、噪声大，且改站点语义）
- **档位链接一律按当前站点语言拼 `/{lang}/{id}`**：源列表缓存不分语言，若存下别的语言的 href（早期实现踩过），点击会先跳英文页再被 lang-pref 弹回中文，看起来像"页面中英来回跳"
- **字幕档标签按源自己的字幕语言给**（中字/英字），不跟站点语言走：`-english-subtitle` 在中文站若按站点语言标成「中字」，会和真·中字档同名（实测 ipx-988 / sdmf-008 / hnd-577 的英字页都出现两个「中字」）
- **搜索页 SSR 卡片每张只有 1 个徽章 span，详情页推荐卡片每张有 3 个**（中文字幕/英文字幕/无码影片，靠 `x-show` 切换可见性）——判源类型只能在搜索页 SSR 上读徽章 class；读详情页活 DOM 会永远命中第一个 `bg-red-800`，把全部条目判成字幕版
- **版本切换菜单只在裸番号主条目页**：`[aria-labelledby="download-option-menu-button"]` 只出现在 `/{lang}/<裸番号>` 的 SSR HTML 里（变体页实测全无），列的是全部兄弟源（含跨语言字幕版）；但**同语言**源集合与搜索页完全一致（8 个番号实测），故不纳入枚举
