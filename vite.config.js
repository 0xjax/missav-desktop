import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
    plugins: [
        monkey({
            entry: "src/main.ts",
            userscript: {
                name: "missav 桌面端",
                namespace: "https://github.com/0xjax/missav-desktop",
                description: "增强 missav 网站的桌面端浏览体验。",
                version: "1.36.1",
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
