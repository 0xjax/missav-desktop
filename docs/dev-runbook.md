# 开发环境 Runbook

目标：下次继续开发时，按本文档几分钟内恢复到可编码、可实测的状态。

## 一次性环境准备

1. **调试 Chrome**（与日常浏览器隔离，已登录 missav 账号）：
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=D:\chrome-debug-profile
   ```
2. **Tampermonkey**（装在调试 Chrome 上）：
   - 扩展管理页打开「开发者模式」→ 详情里打开「允许运行用户脚本」
   - 安装脚本：开发用指向 dev server 的壳脚本（`bun run dev` 启动后 vite-plugin-monkey 给出的地址），或直接装 `dist/missav-desktop.js`
3. 登录 missav.ai（收藏/片单/备份功能都依赖真实登录态）

## 日常启动

```bash
bun run dev        # 必须占住 5173 端口；被占用会掉到 5174，Tampermonkey 壳脚本会静默失效
```

然后刷新 missav.ai 页面即加载最新 `src/` 代码（无需 build）。

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

要点：

- `<url包含子串>` 用能唯一定位 tab 的片段，如 `sone-669-uncensored`；**注意 `sone-669` 会同时命中原版和 `-uncensored-leak` 两个 tab**
- **验证点击/交互 bug 必须用 `cdp-press.ts`（Input.dispatchMouseEvent 真实输入管线）**：JS 合成 `.click()` 与真实按压的激活序列不同（真实按压 checkbox 全程不派发 change/input），合成点击验证通过不代表用户能点
- 选择器类名含 `:`（如 `lg:flex`）时反斜杠转义会在 heredoc 管道里被吃掉，改用属性过滤规避
- 新开 tab：`curl -X PUT "http://localhost:9222/json/new?<url>"`（必须 PUT）
- 读油猴存储：`localStorage.getItem('gm:<key>')`（gm.ts 双写 localStorage 兜底）
- 调试交互类 bug 先埋点取证（完整事件序列 + 数据/DOM 双侧状态），不要在未复现的情况下按猜测写修复
- **用户的真实环境实测是唯一验收标准**：自己环境"验证通过"而用户仍失败时，一律视为未修复；要怀疑的是验证路径差异（合成事件 ≠ 真实输入），而不是用户的操作
- **同一 bug 两次修复无效 = 止损线**：停止修症状，回头质疑架构（如"把状态同步托付给站点 Alpine effect"这类外部依赖），换接管方案

## 验证闭环

1. `bun run lint && bun run typecheck`
2. 用 CDP 脚本在真实页面上实测功能（交互 bug 用 `cdp-press.ts` 走真实输入管线）
3. 涉及用户交互的修复：**请用户用真实鼠标/键盘验收通过后**再进入下一步
4. `vite.config.js` 版本号递增（高于已发布版号）→ `bun run build`
5. `git add -A && git commit`（中文，Conventional Commits），dist 产物一并提交

## 注意事项

- **测试会动真实账号数据**：收藏/片单操作后必须恢复原状
- 页面 JS 死循环卡死时 Runtime.evaluate 也会超时，用 `cdp-reset.ts` 浏览器级重开
- 调试 Chrome 多开会积累大量 tab，卡顿时先清理
