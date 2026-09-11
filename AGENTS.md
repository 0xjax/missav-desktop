# missav-desktop

missav 网站桌面端增强油猴脚本，vite + vite-plugin-monkey 构建。

## Commands

- 包管理用 **bun**，NEVER npm/npx/pnpm
- `bun run dev` / `build` / `lint`（oxlint）/ `typecheck`（tsc --noEmit）
- 开发环境搭建与实测流程（调试 Chrome、CDP 脚本用法）：[docs/dev-runbook.md](docs/dev-runbook.md)

## Conventions

- 用户通过仓库里的 `dist/` 产物接收更新：改动 `src/` 或版号后必须 `bun run build`，产物一并提交，否则用户收不到更新
- userscript 元数据（含版本号）在 `vite.config.js`，改版本号去那里；新版号必须高于已发布版号，用户才能收到更新提示
- missav 域名可能更换，失效时在 `vite.config.js` 的 `match` 里更新
- GM API 从 `src/utils/gm.ts` 导入（调用时解析 + localStorage 兜底，兼容注入晚/缺 API 的管理器），NEVER 直接访问全局 GM_* 或 window 挂载
- 新增布尔设置项 → `src/setting.ts` 的 `keyValues` 加键（值即面板文案的 i18n 键）；非布尔项（如三选一的 `playlist-sort`）不进 `keyValues`，在面板里单独一行；功能代码用 `GM_getValue(key, default)` 读取
- 样式在 `src/style/*.css`，在 `main.ts` 以副作用导入，由插件内联进产物并经 GM_addStyle 注入
- 代码注释与提交信息用中文；提交信息遵循 Conventional Commits

## Anti-Over-Engineering

- Only make changes that are directly requested or clearly necessary
- Don't add features, refactor code, or make improvements beyond what was asked
- Be extra concise
- State ambiguity explicitly; NEVER silently pick one interpretation over another
- Surface tradeoffs and push back if a simpler approach exists
- No abstractions for single-use code
- No error handling for impossible scenarios
- Don't "improve" adjacent code or formatting
- Match existing style even if you'd do it differently

## Comment Tags

- `CRITICAL`: system-dangerous — errors/crashes/data-loss
- `WARNING`: risks, edge cases, non-obvious side effects
- `TODO`: incomplete work, tech debt
- `NOTE`: non-obvious design decisions, counter-intuitive logic

## Methodology

- Small working increments over big-bang changes
- Adapt approach when requirements shift; never force-fit a stale plan
- After structural changes, update stale descriptions in AGENTS.md proactively
- 语义变更（影响既有行为/入口）→ 先列受影响路径，用户确认后改

## Tool Selection

- **Grep** (default) over `rg`, `grep`, `findstr`, `Select-String`
- **Glob** over `find`, `dir /s`, `Get-ChildItem -Recurse`
- **Read** over `cat`, `type`, `Get-Content`, `head`, `tail`
- **Edit** over `sed`, `awk`
- **Write** over `echo >`, `Set-Content`, `Out-File`
- **Bash** reserved for git, bun, and shell-only operations
- Read/Edit long files in batches — NEVER load entire file at once

## Type Checking

- NEVER per-commit or mid-task
