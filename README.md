# missav-desktop

增强 missav 网站的桌面端浏览体验的油猴脚本。

## 安装

构建产物为 `dist/missav-desktop.js`，用 Tampermonkey / Violentmonkey 等管理器安装。

## 开发

```bash
bun install
bun run dev        # 开发模式（管理器中安装 dev 脚本后热更新）
bun run build      # 构建到 dist/
bun run lint       # oxlint
bun run typecheck  # tsc --noEmit
```

## 目录结构

```
src/
├── main.ts        # 入口：顶级窗口检查、样式导入、功能分发
├── setting.ts     # 设置项注册与设置面板（keyValues 加键即新增开关）
├── utils/
│   ├── gm.ts      # GM API 兜底层（调用时解析 + localStorage 兜底）
│   └── wait.ts    # DOM 就绪等通用工具
└── style/
    └── main.css   # 样式，副作用导入后经 GM_addStyle 注入
```
