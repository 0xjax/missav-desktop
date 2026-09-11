import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
    plugins: [
        monkey({
            entry: "src/main.ts",
            userscript: {
                // 默认 @name 必须保持不变：TM 按 @name + @namespace 判定脚本身份，
                // 改默认名会被当成新脚本（老用户重复安装）。英文名走本地化键
                name: { "": "missav 桌面端", en: "MissAV Desktop" },
                namespace: "https://github.com/0xjax/missav-desktop",
                description: {
                    "": "增强 missav 网站的桌面端浏览体验。",
                    en: "Enhanced desktop browsing experience for missav.",
                },
                version: "1.36.23",
                author: "0xjax",
                license: "MIT",
                "run-at": "document-start",
                icon: "https://missav.ws/favicon.ico",
                match: ["https://missav.ws/*", "https://missav.ai/*"],
            },
            build: {
                fileName: "missav-desktop.js", // 输出文件名
                outDir: "dist", // 输出目录
            },
        }),
    ],
});
