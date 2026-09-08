// ==UserScript==
// @name         missav 桌面端
// @namespace    https://github.com/0xjax/missav-desktop
// @version      1.35.1
// @author       0xjax
// @description  增强 missav 网站的桌面端浏览体验。
// @license      MIT
// @icon         https://missav.ws/favicon.ico
// @match        https://missav.ws/*
// @match        https://missav.ai/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	_css("#setting-panel{z-index:99999;color:#eee;background:#1e1e1e;border:1px solid #555;border-radius:8px;flex-direction:column;width:448px;max-width:calc(100vw - 32px);height:500px;max-height:calc(100vh - 48px);padding:20px 20px 18px;font-size:15px;display:flex;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#setting-panel #setting-view,#setting-panel #backup-view,#setting-panel .backup-render{flex-direction:column;flex:1;min-height:0;display:flex}#setting-panel .setting-checkboxes{flex:1;min-height:0;overflow-y:auto}#setting-panel .dialog-header{align-items:center;gap:10px;margin-bottom:12px;display:flex}#setting-panel .dialog-header .setting-title{margin-bottom:0}#setting-panel .dialog-back{color:#ccc;cursor:pointer;background:#444;border:none;border-radius:4px;padding:2px 10px;font-size:13px}#setting-panel .dialog-back:hover{color:#fff;background:#555}#setting-panel .dialog-footer{gap:8px;margin-top:auto;padding-top:12px;display:flex}#setting-panel .dialog-footer .dialog-cancel{background:#444;margin-right:auto}#setting-panel .setting-title{margin-bottom:14px;font-size:17px;font-weight:700}#setting-panel .setting-checkboxes{flex-direction:column;justify-content:space-evenly;display:flex}#setting-panel .setting-checkboxes label{cursor:pointer;align-items:center;gap:10px;padding:5px 2px;display:flex}#setting-panel .setting-checkboxes input{width:16px;height:16px}#setting-panel .setting-actions{text-align:right;margin-top:12px}#setting-panel button{color:#fff;cursor:pointer;background:#f06292;border:none;border-radius:4px;padding:6px 18px;transition:filter .15s}#setting-panel button:hover:not(:disabled){filter:brightness(1.15)}#setting-panel button:active:not(:disabled){filter:brightness(.95)}#setting-panel button#setting-export{background:#444;margin-right:8px}#setting-panel button:disabled{opacity:.5;cursor:default}#setting-panel .backup-hint{color:#999;margin-bottom:14px;font-size:13px;line-height:1.5}#setting-panel .backup-list{flex:1;min-height:0;margin:6px 0 0;overflow-y:auto}#setting-panel .backup-row{border-top:1px solid #333;justify-content:space-between;align-items:center;gap:12px;padding:10px 2px;font-size:13px;line-height:1.4;display:flex}#setting-panel .backup-row>span{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}#setting-panel .backup-row>span b{color:#fff;font-weight:600}#setting-panel .backup-row button{white-space:nowrap;padding:4px 14px;font-size:13px}#setting-panel .backup-empty{color:#555;padding:10px 2px}#setting-panel #backup-view .setting-actions.dialog-footer{margin-top:auto}#setting-panel .backup-latest{text-align:left}.mx-segmented{background:#2e3440;border:1px solid #4c566a;border-radius:10px;align-items:center;gap:2px;padding:2px;display:flex}.mx-seg{color:#e5e9f0;opacity:.7;white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:8px;padding:2px 10px;font-size:12px;line-height:18px;transition:opacity .15s,background .15s}.mx-seg:hover{opacity:1;background:#3b4252}.mx-seg-current{opacity:1;cursor:default;color:#fff}.mx-seg-locked{opacity:.85}.mx-seg-skeleton{cursor:default;color:#d8dee9}[x-show*=showLocaleSwitcher]{max-height:45vh!important}#shortcut-help{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:240px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#shortcut-help .help-title{margin-bottom:12px;font-size:16px;font-weight:700}#shortcut-help .help-list{grid-template-columns:auto 1fr;align-items:center;gap:8px 12px;display:grid}#shortcut-help kbd{text-align:center;background:#333;border:1px solid #555;border-radius:4px;padding:2px 8px;font-family:inherit}#mx-toast-box{z-index:99999;pointer-events:none;flex-direction:column;align-items:center;gap:8px;display:flex;position:fixed;bottom:32px;left:50%;transform:translate(-50%)}.mx-toast{color:#eee;opacity:.95;background:#1e1e1e;border-radius:6px;padding:8px 20px;font-size:14px;transition:opacity .4s;box-shadow:0 4px 16px #0006}.mx-toast-out{opacity:0}.mx-toast-sticky{border-left:3px solid #e8a0bf}:is(div:has(>iframe[src*=mayzaent]),div:has(>iframe[src*=rallytrck])){display:none}fieldset.mx-pl-grid{grid-template-columns:repeat(3,minmax(0,1fr));column-gap:1.5rem;display:grid}fieldset.mx-pl-grid>hr,fieldset.mx-pl-grid>a{order:-1;grid-column:1/-1}@media (width<=1280px){fieldset.mx-pl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.mx-pl-count{color:#d8dee9;opacity:.5;margin-left:.3rem;font-size:.75rem}");
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	function rawFn(name, imported) {
		if (typeof imported === "function") return imported;
		const g = globalThis;
		if (typeof g[name] === "function") return g[name];
		const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : void 0;
		if (w && typeof w[name] === "function") return w[name];
	}
	function GM_getValue$1(key, defaultValue) {
		const stored = localStorage.getItem(`gm:${key}`);
		const backup = stored === null ? defaultValue : JSON.parse(stored);
		const fn = rawFn("GM_getValue", _GM_getValue);
		if (fn) try {
			const value = fn(key, defaultValue);
			if (value === void 0 || value === defaultValue && stored !== null) return backup;
			return value;
		} catch {
			return backup;
		}
		return backup;
	}
	function GM_setValue$1(key, value) {
		localStorage.setItem(`gm:${key}`, JSON.stringify(value));
		const fn = rawFn("GM_setValue", _GM_setValue);
		if (fn) try {
			fn(key, value);
		} catch {}
	}
	function GM_registerMenuCommand$1(name, callback) {
		const fn = rawFn("GM_registerMenuCommand", _GM_registerMenuCommand);
		if (fn) try {
			fn(name, callback);
		} catch {}
	}
	function hijackMainWorld(name, replacement) {
		const w = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis;
		try {
			w[name] = replacement;
		} catch {
			globalThis[name] = replacement;
		}
	}
	function toast(msg) {
		let box = document.getElementById("mx-toast-box");
		if (!box) {
			box = Object.assign(document.createElement("div"), { id: "mx-toast-box" });
			document.body.appendChild(box);
		}
		const el = Object.assign(document.createElement("div"), {
			className: "mx-toast",
			textContent: msg
		});
		box.appendChild(el);
		setTimeout(() => el.classList.add("mx-toast-out"), 1800);
		setTimeout(() => {
			el.remove();
			if (!box.children.length) box.remove();
		}, 2200);
	}
	var TOAST_CHANNEL = "gm:mx-toast";
	var lastToastTs = 0;
	function toastBroadcast(msg) {
		toast(msg);
		lastToastTs = Date.now();
		localStorage.setItem(TOAST_CHANNEL, JSON.stringify({
			text: msg,
			ts: lastToastTs
		}));
	}
	function stickyToast(id, msg) {
		let el = document.getElementById(id);
		if (!el) {
			if (msg === void 0) return;
			let box = document.getElementById("mx-toast-box");
			if (!box) {
				box = Object.assign(document.createElement("div"), { id: "mx-toast-box" });
				document.body.appendChild(box);
			}
			el = Object.assign(document.createElement("div"), { id });
			el.className = "mx-toast mx-toast-sticky";
			box.appendChild(el);
		}
		if (msg === void 0) el.remove();
		else el.textContent = msg;
	}
	function listenToastChannel() {
		window.addEventListener("storage", (e) => {
			if (e.key !== TOAST_CHANNEL || !e.newValue) return;
			try {
				const { text, ts } = JSON.parse(e.newValue);
				if (ts <= lastToastTs) return;
				lastToastTs = ts;
				toast(text);
			} catch {}
		});
	}
	var waitDOMContentLoaded = (callback) => {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback);
		else callback();
	};
	var LANG_RE = /^(cn|en|ja|ko|ms|th|de|fr|vi|id|pt)$/;
	function currentLang() {
		return location.pathname.split("/").filter(Boolean).find((s) => LANG_RE.test(s)) ?? null;
	}
	var COUNTS_KEY = "playlist-counts";
	var ITEM_SEL = "input[x-model=\"playlist.is_added\"]";
	function readPlaylistCounts() {
		const map = GM_getValue$1(COUNTS_KEY, {});
		if (Object.keys(map).length) return map;
		GM_getValue$1("backup-snapshots", [])[0]?.playlists?.forEach((p) => map[p.key] = p.videos.length);
		return map;
	}
	function setPlaylistCounts(map) {
		GM_setValue$1(COUNTS_KEY, map);
	}
	function adjustPlaylistCount(key, delta) {
		const map = readPlaylistCounts();
		if (!(key in map)) return;
		map[key] = Math.max(0, map[key] + delta);
		GM_setValue$1(COUNTS_KEY, map);
		const span = document.querySelector(`input[id="${key}"]`)?.closest("div.relative")?.querySelector(".mx-pl-count");
		if (span) span.textContent = `(${map[key]})`;
	}
	function enhancePanel(fieldset) {
		const inputs = [...fieldset.querySelectorAll(ITEM_SEL)];
		if (!inputs.length) return;
		const counts = readPlaylistCounts();
		const title = (document.querySelector("h1")?.textContent || "").toUpperCase();
		const videoId = (location.pathname.split("/").filter(Boolean).pop() || "").toUpperCase();
		const rows = [];
		for (const input of inputs) {
			const el = input.closest("div.flex")?.parentElement;
			if (!el || !el.classList.contains("relative")) continue;
			const name = el.querySelector("label")?.textContent?.trim() || "";
			rows.push({
				el,
				key: input.id,
				name,
				checked: input.checked,
				count: counts[input.id]
			});
		}
		if (!rows.length) return;
		const matched = (name) => name.length >= 2 && (title.includes(name.toUpperCase()) || videoId.startsWith(name.toUpperCase() + "-"));
		const tier = (r) => r.checked ? 0 : matched(r.name) ? 1 : 2;
		rows.sort((a, b) => tier(a) - tier(b) || (b.count ?? -1) - (a.count ?? -1) || a.name.localeCompare(b.name, "zh"));
		const orderSame = fieldset.classList.contains("mx-pl-grid") && rows.every((r, i) => r.el.style.order === String(i));
		const spansOk = rows.every((r) => {
			if (r.count === void 0) return true;
			return r.el.querySelector(".mx-pl-count")?.textContent === `(${r.count})`;
		});
		if (orderSame && spansOk) return;
		fieldset.classList.add("mx-pl-grid");
		rows.forEach((r, i) => {
			r.el.style.order = String(i);
			const label = r.el.querySelector("label");
			if (!label || r.count === void 0) return;
			let span = r.el.querySelector(".mx-pl-count");
			if (!span) {
				span = Object.assign(document.createElement("span"), { className: "mx-pl-count" });
				label.after(span);
			}
			span.textContent = `(${r.count})`;
		});
	}
	function scan(root) {
		const input = root instanceof Element && root.matches(ITEM_SEL) ? root : root.querySelector?.(ITEM_SEL);
		if (!input) return;
		const fieldset = input.closest("fieldset");
		if (fieldset) enhancePanel(fieldset);
	}
	function playlistPanel() {
		waitDOMContentLoaded(() => {
			scan(document);
			new MutationObserver((mutations) => {
				for (const m of mutations) m.addedNodes.forEach((n) => {
					if (n.nodeType === Node.ELEMENT_NODE) scan(n);
				});
			}).observe(document.body, {
				childList: true,
				subtree: true
			});
		});
	}
	var exporting = false;
	var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	async function fetchDoc(url) {
		const delays = [
			2e3,
			5e3,
			1e4,
			2e4
		];
		let lastStatus = 0;
		for (let attempt = 0; attempt <= delays.length; attempt++) {
			if (attempt > 0) await sleep(delays[attempt - 1]);
			const res = await fetch(url, { credentials: "include" });
			if (res.ok) return new DOMParser().parseFromString(await res.text(), "text/html");
			lastStatus = res.status;
			if (res.status !== 403) break;
		}
		throw new Error(`HTTP ${lastStatus}（重试后仍被拒绝）`);
	}
	function parseVideos(doc) {
		const items = [];
		const seen = new Set();
		doc.querySelectorAll(".thumbnail a[href]").forEach((a) => {
			const href = a.getAttribute("href") || "";
			const m = href.match(/\/([a-z0-9-]+)\/?$/i);
			if (!m) return;
			const id = m[1];
			if (seen.has(id)) return;
			seen.add(id);
			const title = a.querySelector("img")?.getAttribute("alt")?.trim() || a.textContent?.trim() || id;
			items.push({
				id,
				title,
				url: href
			});
		});
		return items;
	}
	var STICKY_ID = "mx-backup-sticky";
	async function crawlVideos(baseUrl, label) {
		const all = [];
		const seen = new Set();
		for (let page = 1; page <= 100; page++) {
			stickyToast(STICKY_ID, `${label}：第 ${page} 页（已抓 ${all.length} 条）`);
			const fresh = parseVideos(await fetchDoc(`${baseUrl}?page=${page}`)).filter((i) => !seen.has(i.id));
			fresh.forEach((i) => {
				seen.add(i.id);
				all.push(i);
			});
			if (fresh.length === 0) break;
			await sleep(400);
		}
		return all;
	}
	async function crawlPlaylists(lang) {
		const map = new Map();
		for (let page = 1; page <= 20; page++) {
			stickyToast(STICKY_ID, `备份片单列表：第 ${page} 页`);
			const doc = await fetchDoc(`${location.origin}/${lang}/playlists?page=${page}`);
			const before = map.size;
			doc.querySelectorAll("a[href*=\"/playlists/\"]").forEach((a) => {
				const href = a.getAttribute("href") || "";
				const m = href.match(/\/playlists\/([a-z0-9]+)\/?$/i);
				if (!m || m[1] === "create" || map.has(m[1])) return;
				map.set(m[1], {
					name: a.querySelector("p")?.textContent?.trim() || m[1],
					url: href
				});
			});
			if (map.size === before) break;
			await sleep(400);
		}
		const playlists = [];
		let i = 0;
		for (const [key, { name, url }] of map) {
			i++;
			playlists.push({
				key,
				name,
				videos: await crawlVideos(url, `片单 ${i}/${map.size}「${name}」`)
			});
			await sleep(400);
		}
		return playlists;
	}
	function downloadJson(data, filename) {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const a = Object.assign(document.createElement("a"), {
			href: URL.createObjectURL(blob),
			download: filename
		});
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
	}
	var SNAPSHOTS_KEY = "backup-snapshots";
	var LAST_BACKUP_KEY = "last-backup-ts";
	var MAX_SNAPSHOTS = 5;
	function readSnapshots() {
		return GM_getValue$1(SNAPSHOTS_KEY, []);
	}
	function localDay(ts) {
		const d = new Date(ts);
		const pad = (n) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}
	function fmtTs(ts) {
		const d = new Date(ts);
		const pad = (n) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	function snapshotStat(s) {
		const videos = s.playlists.reduce((n, p) => n + p.videos.length, 0);
		return `${s.saved.length} 收藏 · ${s.playlists.length} 片单 · ${videos} 片`;
	}
	function syncCounts(s) {
		const counts = {};
		s.playlists.forEach((p) => counts[p.key] = p.videos.length);
		setPlaylistCounts(counts);
	}
	function saveSnapshot(s) {
		const list = readSnapshots();
		if (list[0] && localDay(list[0].ts) === localDay(s.ts)) list[0] = s;
		else list.unshift(s);
		GM_setValue$1(SNAPSHOTS_KEY, list.slice(0, MAX_SNAPSHOTS));
		GM_setValue$1(LAST_BACKUP_KEY, s.ts);
		syncCounts(s);
	}
	function applyChangeToLatestSnapshot(video, added, playlistKey) {
		const list = readSnapshots();
		const latest = list[0];
		if (!latest) return;
		if (playlistKey === void 0) latest.saved = added ? [video, ...latest.saved.filter((v) => v.id !== video.id)] : latest.saved.filter((v) => v.id !== video.id);
		else {
			const pl = latest.playlists.find((p) => p.key === playlistKey);
			if (!pl) return;
			pl.videos = added ? [video, ...pl.videos.filter((v) => v.id !== video.id)] : pl.videos.filter((v) => v.id !== video.id);
		}
		GM_setValue$1(SNAPSHOTS_KEY, list);
		syncCounts(latest);
	}
	function preventUnload(e) {
		e.preventDefault();
		e.returnValue = "";
	}
	async function runBackup() {
		window.addEventListener("beforeunload", preventUnload);
		try {
			const { saved, playlists } = await crawlAll();
			const snap = {
				ts: Date.now(),
				saved,
				playlists
			};
			saveSnapshot(snap);
			downloadSnapshot(snap);
			stickyToast(STICKY_ID);
			toast(`备份完成：收藏 ${saved.length} 部，片单 ${playlists.length} 个`);
		} catch (err) {
			stickyToast(STICKY_ID);
			throw err;
		} finally {
			window.removeEventListener("beforeunload", preventUnload);
		}
	}
	function downloadSnapshot(s) {
		const d = new Date(s.ts);
		const pad = (n) => String(n).padStart(2, "0");
		const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		downloadJson({
			exportedAt: `${localDate}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
			saved: s.saved,
			playlists: s.playlists
		}, `missav-backup-${localDate}.json`);
	}
	async function crawlAll() {
		const lang = currentLang() ?? "cn";
		const saved = await crawlVideos(`${location.origin}/${lang}/saved`, "备份收藏");
		stickyToast(STICKY_ID, `收藏 ${saved.length} 部，开始备份片单`);
		return {
			saved,
			playlists: await crawlPlaylists(lang)
		};
	}
	async function backupNow() {
		if (exporting) {
			toast("备份进行中，请稍候");
			return;
		}
		const last = GM_getValue$1(LAST_BACKUP_KEY, 0);
		const gapMin = Math.round((Date.now() - last) / 6e4);
		if (gapMin < 10) {
			if (!window.confirm(`距离上次备份仅 ${gapMin} 分钟，数据可能没什么变化。确定要重新备份吗？`)) return;
		}
		exporting = true;
		try {
			await runBackup();
		} catch (err) {
			toast(`备份失败：${err instanceof Error ? err.message : "网络异常"}`);
		} finally {
			exporting = false;
		}
	}
	var AUTO_INTERVAL = 2592e5;
	function autoBackup() {
		waitDOMContentLoaded(() => {
			setTimeout(() => {
				if (exporting) return;
				const last = GM_getValue$1(LAST_BACKUP_KEY, 0);
				if (Date.now() - last < AUTO_INTERVAL) return;
				GM_setValue$1(LAST_BACKUP_KEY, Date.now());
				exporting = true;
				toast("开始自动备份收藏与片单…");
				runBackup().catch((err) => {
					GM_setValue$1(LAST_BACKUP_KEY, last);
					toast(`自动备份失败：${err instanceof Error ? err.message : "网络异常"}`);
				}).finally(() => {
					exporting = false;
				});
			}, 8e3);
		});
	}
	var keyValues = {
		"block-ads": "去广告",
		"lang-pref": "语言偏好",
		"search-pref": "搜索偏好",
		"shortcut-keys": "快捷操作",
		"fast-save": "收藏片单增强",
		"auto-backup": "自动备份（每 3 天）",
		"sources": "多源显示切换",
		"playlist-panel": "片单面板优化",
		"topbar-ui": "顶栏增强（设置入口 + 图标统一）"
	};
	var keyDefaults = {
		"block-ads": true,
		"lang-pref": true,
		"search-pref": true,
		"shortcut-keys": true,
		"fast-save": true,
		"auto-backup": true,
		"sources": true,
		"playlist-panel": true,
		"topbar-ui": true
	};
	function createSettingPanel() {
		const panel = Object.assign(document.createElement("div"), {
			id: "setting-panel",
			innerHTML: `
      <div id="setting-view">
        <div class="setting-title">脚本设置</div>
        <div class="setting-checkboxes">
          ${Object.entries(keyValues).map(([key, label]) => `
            <label><input type="checkbox" data-key="${key}"><span>${label}</span></label>
          `).join("")}
        </div>
        <div class="setting-actions dialog-footer">
          <button class="dialog-cancel" type="button">取消</button>
          <button id="setting-export" type="button">导出备份</button>
          <button id="setting-save" type="button">保存</button>
        </div>
      </div>
      <div id="backup-view" style="display: none"></div>
    `
		});
		const checkboxes = panel.querySelectorAll(".setting-checkboxes input[type=\"checkbox\"]");
		checkboxes.forEach((checkbox) => {
			const key = checkbox.dataset.key;
			checkbox.checked = GM_getValue$1(key, keyDefaults[key] ?? false);
		});
		panel.querySelector(".dialog-cancel")?.addEventListener("click", () => {
			panel.remove();
		});
		panel.querySelector("#setting-export")?.addEventListener("click", () => {
			showBackupView(panel);
		});
		panel.querySelector("#setting-save")?.addEventListener("click", () => {
			checkboxes.forEach((checkbox) => {
				const key = checkbox.dataset.key;
				if (checkbox.checked !== GM_getValue$1(key, keyDefaults[key] ?? false)) GM_setValue$1(key, checkbox.checked);
			});
			panel.remove();
			location.reload();
		});
		return panel;
	}
	function showBackupView(panel) {
		const backupView = panel.querySelector("#backup-view");
		const settingView = panel.querySelector("#setting-view");
		if (!backupView || backupView.style.display !== "none") return;
		const render = () => {
			const snapshots = readSnapshots();
			const view = Object.assign(document.createElement("div"), {
				className: "backup-render",
				innerHTML: `
        <div class="dialog-header">
          <button class="dialog-back" type="button">← 返回</button>
          <span class="setting-title">导出备份</span>
        </div>
        <div class="backup-hint">立即备份约需 1–3 分钟，期间请勿关闭本标签页；完成后会覆盖今日快照并下载</div>
        <div class="setting-actions backup-latest">
          <button id="backup-latest-btn" type="button">立即备份</button>
        </div>
        ${`<div class="backup-list">${[
					0,
					1,
					2,
					3,
					4
				].map((i) => {
					const s = snapshots[i];
					if (!s) return "<div class=\"backup-row backup-empty\"><span>（空槽位，等待自动备份）</span></div>";
					return `
              <div class="backup-row">
                <span><b>${fmtTs(s.ts)}</b> · ${snapshotStat(s)}</span>
                <button type="button" data-i="${i}">下载</button>
              </div>`;
				}).join("")}</div>`}
        <div class="setting-actions dialog-footer">
          <button class="dialog-cancel" type="button">取消</button>
        </div>
      `
			});
			view.querySelector(".dialog-back")?.addEventListener("click", () => {
				view.style.display = "none";
				backupView.style.display = "none";
				settingView.style.display = "";
			});
			view.querySelector(".dialog-cancel")?.addEventListener("click", () => {
				panel.remove();
			});
			view.querySelector("#backup-latest-btn")?.addEventListener("click", () => {
				panel.remove();
				backupNow();
			});
			view.querySelectorAll(".backup-row button").forEach((b) => {
				b.addEventListener("click", () => {
					const s = readSnapshots()[Number(b.dataset.i)];
					if (s) {
						downloadSnapshot(s);
						toast("已导出历史备份");
					}
					panel.remove();
				});
			});
			return view;
		};
		settingView.style.display = "none";
		backupView.style.display = "";
		backupView.replaceChildren(render());
	}
	function toggleSettingPanel() {
		const exist = document.getElementById("setting-panel");
		if (exist) {
			exist.remove();
			return;
		}
		document.body.appendChild(createSettingPanel());
	}
	function registerSettingMenu() {
		GM_registerMenuCommand$1("脚本设置", () => {
			waitDOMContentLoaded(toggleSettingPanel);
		});
	}
	var svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-6 w-6">${inner}</svg>`;
	var GEAR_SVG = svg(`<path fill-rule="evenodd" clip-rule="evenodd" d="M11.4892 3.17094C11.1102 1.60969 8.8898 1.60969 8.51078 3.17094C8.26594 4.17949 7.11045 4.65811 6.22416 4.11809C4.85218 3.28212 3.28212 4.85218 4.11809 6.22416C4.65811 7.11045 4.17949 8.26593 3.17094 8.51078C1.60969 8.8898 1.60969 11.1102 3.17094 11.4892C4.17949 11.7341 4.65811 12.8896 4.11809 13.7758C3.28212 15.1478 4.85218 16.7179 6.22417 15.8819C7.11045 15.3419 8.26594 15.8205 8.51078 16.8291C8.8898 18.3903 11.1102 18.3903 11.4892 16.8291C11.7341 15.8205 12.8896 15.3419 13.7758 15.8819C15.1478 16.7179 16.7179 15.1478 15.8819 13.7758C15.3419 12.8896 15.8205 11.7341 16.8291 11.4892C18.3903 11.1102 18.3903 8.8898 16.8291 8.51078C15.8205 8.26593 15.3419 7.11045 15.8819 6.22416C16.7179 4.85218 15.1478 3.28212 13.7758 4.11809C12.8896 4.65811 11.7341 4.17949 11.4892 3.17094ZM10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z"/>`);
	var GLOBE_SVG = svg(`<path fill-rule="evenodd" clip-rule="evenodd" d="M4.08296 9H6.02863C6.11783 7.45361 6.41228 6.02907 6.86644 4.88228C5.41752 5.77135 4.37513 7.25848 4.08296 9ZM10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 4C9.92395 4 9.76787 4.03173 9.5347 4.26184C9.29723 4.4962 9.03751 4.8849 8.79782 5.44417C8.40914 6.3511 8.12491 7.58559 8.03237 9H11.9676C11.8751 7.58559 11.5909 6.3511 11.2022 5.44417C10.2321 4.03173 10.076 4 10 4ZM13.9714 9C13.8822 7.45361 13.5877 6.02907 13.1336 4.88228C14.5825 5.77135 15.6249 7.25848 15.917 9H13.9714ZM11.9676 11H8.03237C8.12491 12.4144 8.40914 13.6489 8.79782 14.5558C9.03751 15.1151 9.29723 15.5038 9.5347 15.7382C9.76787 15.9683 9.92395 16 10 16C10.076 16 10.2321 15.9683 10.4653 15.7382C10.7028 15.5038 10.9625 15.1151 11.2022 14.5558C11.5909 13.6489 11.8751 12.4144 11.9676 11ZM13.1336 15.1177C13.5877 13.9709 13.8822 12.5464 13.9714 11H15.917C15.6249 12.7415 14.5825 14.2287 13.1336 15.1177ZM6.86644 15.1177C6.41228 13.9709 6.11783 12.5464 6.02863 11H4.08296C4.37513 12.7415 5.41752 14.2287 6.86644 15.1177Z"/>`);
	var MENU_SVG = svg(`<path fill-rule="evenodd" clip-rule="evenodd" d="M3 5C3 4.44772 3.44772 4 4 4H16C16.5523 4 17 4.44772 17 5C17 5.55228 16.5523 6 16 6H4C3.44772 6 3 5.55228 3 5Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 10C3 9.44772 3.44772 9 4 9H16C16.5523 9 17 9.44772 17 10C17 10.5523 16.5523 11 16 11H4C3.44772 11 3 10.5523 3 10Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 15C3 14.4477 3.44772 14 4 14H16C16.5523 14 17 14.4477 17 15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15Z"/>`);
	function injectSettingIcon(container) {
		const groups = new Set();
		for (const a of container.querySelectorAll("a")) if (a.getAttributeNames().some((n) => (a.getAttribute(n) || "").includes("toggleSearch"))) groups.add(a.parentElement);
		if (!groups.size) return false;
		for (const group of groups) {
			if (group.querySelector(":scope > [data-setting-icon]")) continue;
			const icon = Object.assign(document.createElement("a"), {
				href: "#",
				innerHTML: GEAR_SVG
			});
			icon.setAttribute("data-setting-icon", "");
			icon.setAttribute("class", "rounded-md text-nord6 hover:text-primary focus:outline-none");
			icon.setAttribute("alt", "脚本设置");
			icon.addEventListener("click", (e) => {
				e.preventDefault();
				toggleSettingPanel();
			});
			group.appendChild(icon);
		}
		return true;
	}
	function unifyIcons(container) {
		let touched = false;
		for (const a of container.querySelectorAll("a")) {
			const actions = a.getAttributeNames().map((n) => a.getAttribute(n) || "").join(" ");
			if (actions.includes("showLocaleSwitcher")) {
				const img = a.querySelector("img");
				if (img && !a.querySelector("[data-mx-icon]")) {
					a.setAttribute("class", "rounded-md text-nord6 hover:text-primary focus:outline-none");
					const node = Object.assign(document.createElement("span"), { innerHTML: GLOBE_SVG }).firstElementChild;
					node.setAttribute("data-mx-icon", "lang");
					node.setAttribute("alt", img.getAttribute("alt") || "语言");
					img.replaceWith(node);
					touched = true;
				}
			}
			if (actions.includes("showDropdown") && a.closest("[class*=\"xl:hidden\"]")) {
				const old = a.querySelector("svg");
				if (old && !old.hasAttribute("data-mx-icon")) {
					const node = Object.assign(document.createElement("span"), { innerHTML: MENU_SVG }).firstElementChild;
					node.setAttribute("data-mx-icon", "menu");
					old.replaceWith(node);
					touched = true;
				}
			}
			if (actions.includes("howDropdown") && actions.includes("jav")) {
				const span = a.querySelector("span");
				if (span && span.textContent.trim() === "观看日本 AV") {
					span.textContent = "日本 AV";
					touched = true;
				}
			}
		}
		return touched;
	}
	var ANTIFLICKER_CSS = "a:not([class*=\"block\"]) > img[src*=\"/img/flags/\"]:not([data-mx-icon]),a > svg[fill=\"none\"][viewBox=\"0 0 24 24\"]:not([data-mx-icon]){visibility:hidden!important}";
	function installAntiFlicker() {
		const inject = () => {
			if (document.querySelector("style[data-mx-antiflicker]")) return true;
			if (!document.documentElement) return false;
			const st = document.createElement("style");
			st.setAttribute("data-mx-antiflicker", "");
			st.textContent = ANTIFLICKER_CSS;
			document.documentElement.appendChild(st);
			return true;
		};
		if (inject()) return;
		const obs = new MutationObserver(() => {
			if (inject()) obs.disconnect();
		});
		obs.observe(document, { childList: true });
	}
	function registerSettingIcon() {
		const injectAll = () => {
			const containers = [document.querySelector("div.sm\\:container"), document.querySelector("nav")];
			let injected = 0;
			for (const c of containers) {
				if (!c) return false;
				if (injectSettingIcon(c)) injected++;
				unifyIcons(c);
			}
			if (!injected) {
				const bar = document.querySelector("div[class*=\"fixed z-max\"]");
				if (bar && injectSettingIcon(bar)) injected++;
			}
			return injected === containers.length;
		};
		if (injectAll()) return;
		const obs = new MutationObserver(() => {
			if (injectAll()) obs.disconnect();
		});
		obs.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true
		});
		setTimeout(() => obs.disconnect(), 15e3);
	}
	var AD_HOSTS = [
		"mayzaent.com",
		"rallytrck.website",
		"myavlive.com",
		"snaptrckr.fun",
		"bit.ly",
		"jerkdolls.com",
		"theporndude.com",
		"tsyndicate.com"
	];
	var RENAME_LINKS = [["mycomic.com", "漫画"]];
	function renameLink(el) {
		if (el.tagName !== "A") return false;
		const href = el.getAttribute("href");
		const hit = RENAME_LINKS.find(([host]) => href?.includes(host));
		if (!hit) return false;
		if (el.textContent?.trim() !== hit[1]) el.textContent = hit[1];
		return true;
	}
	var AD_SELECTORS = [
		"[id^=\"ts_ms_\"]",
		"iframe[width=\"1\"][height=\"1\"]:not([src])",
		"ul.list-none.text-nord14"
	];
	var AD_MENU_TEXTS = ["更多好站"];
	function matchAdMenu(el) {
		if (el.tagName !== "A") return false;
		const text = el.textContent?.trim() ?? "";
		return AD_MENU_TEXTS.some((t) => text.startsWith(t));
	}
	function isAdUrl(url) {
		return !!url && AD_HOSTS.some((host) => url.includes(host));
	}
	function removeWithWrapper(el) {
		let target = el;
		for (let i = 0; i < 2; i++) {
			const parent = target.parentElement;
			if (!parent || parent === document.body) break;
			if (Array.from(parent.children).filter((c) => c !== target).length > 0 || parent.textContent?.trim()) break;
			target = parent;
		}
		target.remove();
	}
	function matchAdUrl(el) {
		return isAdUrl(el.getAttribute("src") ?? el.getAttribute("href"));
	}
	function matchAdEl(el) {
		return matchAdUrl(el) || AD_SELECTORS.some((sel) => el.matches(sel));
	}
	function isFloatingShell(el) {
		if (el.id === "setting-panel") return false;
		const cs = getComputedStyle(el);
		return cs.position === "fixed" && parseInt(cs.zIndex) >= 1e6;
	}
	function scanFloatingAds() {
		document.body.querySelectorAll(":scope > div").forEach((el) => {
			if (!isFloatingShell(el)) return;
			if (el.querySelector("iframe") !== null || Array.from(el.querySelectorAll("a[href]")).some(matchAdUrl)) el.remove();
		});
	}
	function removeAd(el) {
		const shell = el.closest("body > div");
		if (shell && shell !== el && isFloatingShell(shell)) shell.remove();
		else removeWithWrapper(el);
	}
	function removeAdMenu(el) {
		const wrapper = el.closest("nav div.relative");
		if (wrapper && matchAdMenu(wrapper.querySelector("a") ?? el)) wrapper.remove();
		else removeWithWrapper(el);
	}
	function isEmptyAdWrapper(el) {
		if (el.tagName !== "DIV") return false;
		const cls = (el.className || "").toString();
		if (!/\bspace-y-\d/.test(cls) || !/\bmb-\d/.test(cls)) return false;
		if (el.children.length > 0 || el.textContent?.trim()) return false;
		return !el.getAttributeNames().some((n) => n.startsWith("x-") || n.startsWith("@"));
	}
	function removeEmptyAdWrappers(root) {
		root.querySelectorAll("div[class*=\"space-y-\"]").forEach((el) => {
			if (isEmptyAdWrapper(el)) el.remove();
		});
	}
	function scanAndRemove(root) {
		root.querySelectorAll(`iframe[src], script[src], a[href], ${AD_SELECTORS.join(", ")}`).forEach((el) => {
			if (renameLink(el)) return;
			if (matchAdMenu(el)) removeAdMenu(el);
			else if (matchAdEl(el)) removeAd(el);
		});
		removeEmptyAdWrappers(root === document ? document.body : root);
		if (root === document) scanFloatingAds();
	}
	function observeAds() {
		new MutationObserver((mutations) => {
			try {
				let hasAdded = false;
				for (const mutation of mutations) mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== Node.ELEMENT_NODE) return;
					hasAdded = true;
					const el = node;
					if (renameLink(el)) return;
					if (matchAdMenu(el)) removeAdMenu(el);
					else if (matchAdEl(el)) removeAd(el);
					else scanAndRemove(el);
				});
				if (hasAdded) {
					scanFloatingAds();
					removeEmptyAdWrappers(document.body);
				}
			} catch (e) {
				console.error("[missav-desktop] 去广告观察器异常:", e);
			}
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function hijackWindowOpen() {
		const blocked = (...args) => {
			console.warn("[missav-desktop] 已拦截 window.open:", args[0]);
			return null;
		};
		hijackMainWorld("open", blocked);
	}
	function interceptAdClicks() {
		document.addEventListener("click", (e) => {
			const a = e.target.closest?.("a[target=\"_blank\"]");
			if (a && matchAdUrl(a)) {
				e.preventDefault();
				e.stopPropagation();
				console.warn("[missav-desktop] 已拦截广告跳转:", a.getAttribute("href"));
			}
		}, true);
	}
	function blockAds() {
		hijackWindowOpen();
		interceptAdClicks();
		waitDOMContentLoaded(() => {
			scanAndRemove(document);
			observeAds();
		});
	}
	var LANGS = [
		"cn",
		"en",
		"ja",
		"ko",
		"ms",
		"th",
		"de",
		"fr",
		"vi",
		"id",
		"pt"
	];
	var LANG_NAMES = {
		简体中文: "cn",
		English: "en",
		日本語: "ja",
		한국의: "ko",
		Melayu: "ms",
		ไทย: "th",
		Deutsch: "de",
		Français: "fr",
		"Tiếng Việt": "vi",
		"Bahasa Indonesia": "id",
		Português: "pt"
	};
	function parsePath(pathname) {
		const segs = pathname.split("/").filter(Boolean);
		let shard = null;
		let lang = null;
		if (segs[0] && /^dm\d+$/.test(segs[0])) shard = segs.shift();
		if (segs[0] && LANGS.includes(segs[0])) lang = segs.shift();
		return {
			shard,
			lang,
			rest: segs
		};
	}
	function watchSwitcher() {
		document.addEventListener("click", (e) => {
			const a = e.target.closest?.("a[href]");
			if (!a) return;
			const lang = LANG_NAMES[a.textContent?.trim() ?? ""];
			if (!lang) return;
			if (parsePath(new URL(a.href, location.origin).pathname).lang === lang && LANGS.includes(lang)) GM_setValue$1("pref-lang", lang);
		}, true);
	}
	function preferLang() {
		watchSwitcher();
		const pref = GM_getValue$1("pref-lang", null);
		if (!pref || !LANGS.includes(pref)) return;
		const { shard, lang, rest } = parsePath(location.pathname);
		if (lang === pref) return;
		const key = `lang-redirected:${pref}:${location.pathname}`;
		if (sessionStorage.getItem(key)) return;
		sessionStorage.setItem(key, "1");
		const target = "/" + [
			shard,
			pref,
			...rest
		].filter(Boolean).join("/");
		location.replace(target + location.search + location.hash);
	}
	function watchParamLinks() {
		document.addEventListener("click", (e) => {
			const a = e.target.closest?.("a[href*=\"/search/\"]");
			if (!a) return;
			const params = new URL(a.href, location.origin).searchParams;
			if (!params.has("filters") && !params.has("sort")) return;
			GM_setValue$1("search-filters", params.get("filters"));
			GM_setValue$1("search-sort", params.get("sort"));
		}, true);
	}
	function recordHistory(keyword) {
		try {
			const raw = window.Cookies?.get("search_history");
			const history = raw ? JSON.parse(raw) : [];
			const i = history.indexOf(keyword);
			if (i !== -1) history.splice(i, 1);
			history.unshift(keyword);
			window.Cookies?.set("search_history", JSON.stringify(history), { expires: 365 });
		} catch {}
	}
	function navigateWithPrefs(keyword) {
		const kw = encodeURIComponent(keyword.trim().replace("\\", ""));
		if (!kw) return;
		recordHistory(kw);
		const lang = currentLang() ?? GM_getValue$1("pref-lang", null);
		const filters = GM_getValue$1("search-filters", null);
		const sort = GM_getValue$1("search-sort", null);
		const params = new URLSearchParams();
		if (filters) params.set("filters", filters);
		if (sort) params.set("sort", sort);
		const qs = params.toString();
		location.href = `${lang ? `/${lang}` : ""}/search/${kw}${qs ? `?${qs}` : ""}`;
	}
	function interceptSearch() {
		document.addEventListener("submit", (e) => {
			const form = e.target;
			if (!form.getAttribute("@submit.prevent")?.includes("search(")) return;
			const input = form.querySelector("input[type=\"text\"]");
			if (!input) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			navigateWithPrefs(input.value);
		}, true);
		document.addEventListener("click", (e) => {
			const a = e.target.closest?.("a[href=\"#\"]");
			if (!a?.getAttribute("@click.prevent")?.includes("search(")) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			navigateWithPrefs(a.textContent ?? "");
		}, true);
	}
	function applyPrefsToBareSearch() {
		if (!/\/search\/[^/]+/.test(location.pathname)) return;
		if (/[?&](filters|sort)=/.test(location.search)) return;
		const filters = GM_getValue$1("search-filters", null);
		const sort = GM_getValue$1("search-sort", null);
		if (!filters && !sort) return;
		const key = `search-redirected:${filters}:${sort}:${location.pathname}`;
		if (sessionStorage.getItem(key)) return;
		sessionStorage.setItem(key, "1");
		const params = new URLSearchParams();
		if (filters) params.set("filters", filters);
		if (sort) params.set("sort", sort);
		location.replace(`${location.pathname}?${params}${location.hash}`);
	}
	function searchPref() {
		applyPrefsToBareSearch();
		waitDOMContentLoaded(() => {
			watchParamLinks();
			interceptSearch();
		});
	}
	function isTyping() {
		const el = document.activeElement;
		return !!el && ([
			"INPUT",
			"TEXTAREA",
			"SELECT"
		].includes(el.tagName) || el.isContentEditable);
	}
	function clickByAlpineAction(action) {
		const els = Array.from(document.querySelectorAll("button, a")).filter((e) => e.getAttributeNames().some((n) => n.startsWith("@click") && (e.getAttribute(n) || "").includes(action)));
		const el = els.find((e) => e.offsetParent !== null) ?? els[0];
		if (!el) return false;
		el.click();
		return true;
	}
	function focusSearch() {
		const visibleInput = () => [...document.querySelectorAll("form.w-full input[type=\"text\"], input[x-ref=\"search\"]")].find((i) => i.offsetParent !== null);
		const input = visibleInput();
		if (input) {
			input.focus();
			input.select();
			return;
		}
		if (clickByAlpineAction("toggleSearch")) setTimeout(() => {
			const el = visibleInput();
			el?.focus();
			el?.select();
		}, 200);
	}
	function gotoPage(path) {
		const lang = currentLang() ?? GM_getValue$1("pref-lang", null);
		location.href = `${lang ? `/${lang}` : ""}${path}`;
	}
	function togglePlay() {
		const video = document.querySelector(".plyr video") ?? document.querySelector("video");
		if (!video) return;
		if (video.paused) video.play();
		else video.pause();
	}
	var shortcutList = [
		["Space", "播放 / 暂停"],
		["S", "收藏 / 取消收藏"],
		["P", "展开 / 收起片单"],
		["/", "聚焦搜索框"],
		["G", "回到首页"],
		["B", "打开我的收藏"],
		["H", "打开观看历史"],
		[",", "脚本设置"],
		["?", "快捷键帮助"],
		["F", "全屏（站点自带）"]
	];
	function toggleHelpPanel() {
		const exist = document.getElementById("shortcut-help");
		if (exist) {
			exist.remove();
			return;
		}
		const panel = Object.assign(document.createElement("div"), {
			id: "shortcut-help",
			innerHTML: `
      <div class="help-title">快捷键</div>
      <div class="help-list">
        ${shortcutList.map(([key, desc]) => `<kbd>${key}</kbd><span>${desc}</span>`).join("")}
      </div>
    `
		});
		document.body.appendChild(panel);
	}
	function shortcuts() {
		waitDOMContentLoaded(() => {
			window.addEventListener("keyup", (e) => {
				if (e.code === "Space" && !isTyping()) e.stopImmediatePropagation();
			}, true);
			window.addEventListener("keydown", (e) => {
				if (e.code === "Escape") {
					if (isTyping()) document.activeElement.blur();
					if (document.querySelector(".content-with-search")) clickByAlpineAction("toggleSearch");
					return;
				}
				if (e.ctrlKey || e.metaKey || e.altKey || isTyping()) return;
				switch (e.code) {
					case "Space":
						if (e.target.closest?.(".plyr")) return;
						e.preventDefault();
						togglePlay();
						break;
					case "KeyS":
						clickByAlpineAction("toggleSave");
						break;
					case "KeyP":
						clickByAlpineAction("togglePlaylist");
						break;
					case "Slash":
						e.preventDefault();
						if (e.shiftKey) toggleHelpPanel();
						else focusSearch();
						break;
					case "Comma":
						toggleSettingPanel();
						break;
					case "KeyG":
						gotoPage("/");
						break;
					case "KeyB":
						gotoPage("/saved");
						break;
					case "KeyH": gotoPage("/history");
				}
			});
		});
	}
	function alpine() {
		return window.Alpine;
	}
	var SAVED_CACHE_KEY = "saved-cache";
	function readCache$1() {
		return GM_getValue$1(SAVED_CACHE_KEY, {});
	}
	function writeCache$1(dvdId, saved) {
		const cache = readCache$1();
		cache[dvdId] = saved;
		const keys = Object.keys(cache);
		if (keys.length > 800) keys.slice(0, 200).forEach((k) => delete cache[k]);
		GM_setValue$1(SAVED_CACHE_KEY, cache);
	}
	function dvdIdOf(el) {
		const fromUrl = location.pathname.split("/").filter(Boolean).pop() ?? null;
		let cur = el;
		while (cur) {
			const matches = [...(cur.getAttribute?.("x-data") || "").matchAll(/dvdId:\s*'([^']+)'/g)].map((m) => m[1]);
			if (matches.length) return matches.find((m) => m === fromUrl) ?? matches.sort((a, b) => b.length - a.length)[0];
			cur = cur.parentElement;
		}
		return fromUrl;
	}
	function currentVideo(dvdId) {
		return {
			id: dvdId,
			title: document.querySelector("h1")?.textContent?.trim() || dvdId,
			url: location.href
		};
	}
	function apiFetch(url, method, body) {
		const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
		const headers = {
			"X-Requested-With": "XMLHttpRequest",
			Accept: "application/json"
		};
		if (xsrf) headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrf);
		if (body) headers["Content-Type"] = "application/json";
		return fetch(url, {
			method,
			credentials: "include",
			keepalive: true,
			headers,
			body: body ? JSON.stringify(body) : void 0
		});
	}
	function openLoginModal(data) {
		const req = data.requireLogin;
		if (typeof req === "function") {
			req(() => {});
			return;
		}
		[...document.querySelectorAll("button, a")].find((el) => el.getAttributeNames().some((n) => n.startsWith("@click") && (el.getAttribute(n) || "").includes("showLoginModal")))?.click();
	}
	function alpineAction(el, action) {
		return el.getAttributeNames().some((n) => n.startsWith("@click") && (el.getAttribute(n) || "").includes(action));
	}
	function findSaveUrl(btn) {
		let el = btn;
		while (el) {
			const m = (el.getAttribute?.("x-data") || "").match(/https:\/\/[^'"]+\/api\/items\/[^'"]+\/save/);
			if (m) return m[0];
			el = el.parentElement;
		}
		return null;
	}
	function onSaveClick(e, btn) {
		const alp = alpine();
		if (!alp) return;
		const data = alp.$data(btn);
		const url = findSaveUrl(btn);
		if (!data || !url) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		const target = !data.saved;
		const dvdId = dvdIdOf(btn);
		data.saved = target;
		data.loading = true;
		apiFetch(url, target ? "POST" : "DELETE").then((r) => {
			data.loading = false;
			if (r.ok) {
				if (dvdId) {
					writeCache$1(dvdId, target);
					applyChangeToLatestSnapshot(currentVideo(dvdId), target);
				}
				toastBroadcast(target ? "已收藏" : "已取消收藏");
			} else {
				data.saved = !target;
				if (r.status === 401) openLoginModal(data);
				else toast("操作失败，请重试");
			}
		}).catch(() => {
			data.loading = false;
			data.saved = !target;
			toast("网络错误，操作未生效");
		});
	}
	function onPlaylistOpenClick(e, btn) {
		const alp = alpine();
		if (!alp) return;
		const data = alp.$data(btn);
		if (!data || data.user || typeof data.togglePanel !== "function") return;
		e.preventDefault();
		e.stopImmediatePropagation();
		data.togglePanel("playlist");
	}
	function onPlaylistToggle(e, input) {
		e.preventDefault();
		e.stopImmediatePropagation();
		const alp = alpine();
		if (!alp) return;
		const data = alp.$data(input);
		const item = data.playlists?.find((p) => p.key === input.id);
		const dvdId = dvdIdOf(input);
		if (!item || !dvdId) return;
		const target = !item.is_added;
		item.is_added = target;
		setTimeout(() => {
			item.is_added = target;
			input.checked = target;
		}, 0);
		apiFetch(`${location.origin}/api/playlists/${target ? "add" : "remove"}`, "POST", {
			dvdId,
			key: item.key
		}).then((r) => {
			if (r.ok) {
				adjustPlaylistCount(item.key, target ? 1 : -1);
				if (dvdId) applyChangeToLatestSnapshot(currentVideo(dvdId), target, item.key);
				toastBroadcast(target ? "已加入片单" : "已移出片单");
			} else {
				item.is_added = !target;
				input.checked = !target;
				if (r.status === 401) openLoginModal(data);
				else toast("操作失败，请重试");
			}
		}).catch(() => {
			item.is_added = !target;
			input.checked = !target;
			toast("网络错误，操作未生效");
		});
	}
	function fastSave() {
		waitDOMContentLoaded(() => {
			listenToastChannel();
			const timer = setInterval(() => {
				const alp = alpine();
				const btn = [...document.querySelectorAll("button")].find((b) => alpineAction(b, "toggleSave"));
				if (!alp || !btn) return;
				clearInterval(timer);
				if (performance.getEntriesByType("resource").some((r) => r.name.includes("/view"))) return;
				const dvdId = dvdIdOf(btn);
				if (!dvdId) return;
				const cache = readCache$1();
				if (dvdId in cache) {
					const data = alp.$data(btn);
					if (data && data.saved === false) data.saved = cache[dvdId];
				}
			}, 100);
			setTimeout(() => clearInterval(timer), 3e3);
			document.addEventListener("click", (e) => {
				const target = e.target;
				const box = target.closest?.("input[x-model=\"playlist.is_added\"]");
				if (box) {
					onPlaylistToggle(e, box);
					return;
				}
				const el = target.closest?.("button, a");
				if (!el) return;
				if (el.tagName === "BUTTON" && alpineAction(el, "toggleSave")) onSaveClick(e, el);
				else if (alpineAction(el, "togglePlaylist")) onPlaylistOpenClick(e, el);
			}, true);
		});
	}
	var SUFFIXES = [[
		"-uncensored-leak",
		"无码",
		"#2563eb"
	], [
		"-chinese-subtitle",
		"中字",
		"#dc2626"
	]];
	var ORIGINAL = [
		"",
		"原版",
		"#4c566a"
	];
	var CACHE_KEY = "sources-cache";
	var CACHE_TTL = 6048e5;
	function readCache() {
		return GM_getValue$1(CACHE_KEY, {});
	}
	function writeCache(base, list) {
		const cache = readCache();
		cache[base] = {
			ts: Date.now(),
			list
		};
		const keys = Object.keys(cache);
		if (keys.length > 500) keys.slice(0, 100).forEach((k) => delete cache[k]);
		GM_setValue$1(CACHE_KEY, cache);
	}
	function parseVideoId(id) {
		if (id.startsWith("fc2-")) return null;
		for (const [suffix] of SUFFIXES) if (id.endsWith(suffix)) return {
			base: id.slice(0, -suffix.length),
			suffix
		};
		return {
			base: id,
			suffix: ""
		};
	}
	async function fetchSources(base, lang) {
		const res = await fetch(`${location.origin}/${lang}/search/${base}?filters=individual`, { credentials: "include" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const doc = new DOMParser().parseFromString(await res.text(), "text/html");
		const found = new Map();
		doc.querySelectorAll(".thumbnail a[href]").forEach((a) => {
			const href = a.getAttribute("href") || "";
			const id = href.split("/").filter(Boolean).pop() || "";
			if (id === base || SUFFIXES.some(([s]) => id === base + s)) {
				if (!found.has(id)) found.set(id, href);
			}
		});
		const sources = [];
		for (const [suffix, label, color] of [ORIGINAL, ...SUFFIXES]) {
			const id = base + suffix;
			const href = found.get(id);
			if (href) sources.push({
				id,
				label,
				color,
				href
			});
		}
		return sources;
	}
	function renderSegmented(sources, currentId, loading) {
		const groups = new Set();
		for (const a of document.querySelectorAll("a")) if (a.getAttributeNames().some((n) => (a.getAttribute(n) || "").includes("toggleSearch"))) groups.add(a.parentElement);
		if (!groups.size) return;
		for (const group of groups) {
			let seg = group.querySelector("[data-mx-seg]");
			if (!seg) {
				seg = document.createElement("div");
				seg.setAttribute("data-mx-seg", "");
				const searchA = [...group.querySelectorAll("a")].find((a) => a.getAttributeNames().some((n) => (a.getAttribute(n) || "").includes("toggleSearch")));
				group.insertBefore(seg, searchA ?? group.querySelector("[data-setting-icon]"));
			}
			if (loading && !sources.length) {
				seg.className = "";
				seg.innerHTML = "<span class=\"mx-seg mx-seg-skeleton\">…</span>";
				continue;
			}
			seg.className = "mx-segmented";
			seg.replaceChildren(...sources.map((s) => {
				const b = document.createElement("button");
				b.type = "button";
				const isCurrent = s.id === currentId;
				b.className = "mx-seg" + (isCurrent ? " mx-seg-current" : "");
				b.textContent = s.label;
				if (isCurrent) {
					b.style.background = s.color;
					b.disabled = true;
					if (sources.length < 2) b.classList.add("mx-seg-locked");
				} else b.addEventListener("click", () => {
					location.href = s.href;
				});
				return b;
			}));
		}
	}
	var ID_RE = /^[a-z]{2,6}-\d{2,6}(-[a-z-]+)?$/;
	var FC2_RE = /^fc2(-\d+)?(-[a-z-]+)?$/;
	var RESERVED = new Set([
		"search",
		"new",
		"best",
		"genres",
		"actresses",
		"series",
		"makers",
		"leak",
		"ranking",
		"settings",
		"login",
		"register",
		"dm4",
		"dm539"
	]);
	function isVideoPath() {
		const parts = location.pathname.split("/").filter(Boolean);
		const id = parts[parts.length - 1] || "";
		if (!id || RESERVED.has(id)) return false;
		return ID_RE.test(id) || FC2_RE.test(id);
	}
	function sources() {
		if (!isVideoPath()) return;
		const id = location.pathname.split("/").filter(Boolean).pop() || "";
		const parsed = parseVideoId(id);
		if (!parsed) return;
		const curDef = [ORIGINAL, ...SUFFIXES].find(([s]) => s === parsed.suffix);
		const current = {
			id,
			label: curDef[1],
			color: curDef[2],
			href: location.href
		};
		let injected = false;
		const init = () => {
			if (injected) return true;
			if (![...document.querySelectorAll("a")].some((a) => a.getAttributeNames().some((n) => (a.getAttribute(n) || "").includes("toggleSearch")))) return false;
			injected = true;
			renderSegmented([], id, true);
			const cached = readCache()[parsed.base];
			const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL;
			if (cacheFresh && cached.list.length) renderSegmented(cached.list, id, false);
			(async () => {
				try {
					const lang = currentLang() ?? "cn";
					const list = await fetchSources(parsed.base, lang);
					if (!list.length) list.push(current);
					writeCache(parsed.base, list);
					if (!cacheFresh || list.map((s) => s.id).join() !== cached.list.map((s) => s.id).join()) renderSegmented(list, id, false);
				} catch {
					if (!cacheFresh) renderSegmented(cached?.list ?? [], id, false);
				}
			})();
			return true;
		};
		if (init()) return;
		const obs = new MutationObserver(() => {
			if (init()) obs.disconnect();
		});
		obs.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true
		});
		setTimeout(() => obs.disconnect(), 15e3);
	}
	var t0 = performance.now();
	var log = [];
	var MAX = 500;
	function rec(ev, detail) {
		if (log.length >= MAX) return;
		log.push({
			t: Math.round(performance.now() - t0),
			ev,
			detail
		});
		try {
			localStorage.setItem("gm:playlist-debug-log", JSON.stringify(log));
		} catch {}
	}
	function describe(e) {
		const el = e.target;
		return {
			type: e.type,
			tag: el?.tagName,
			id: el?.id || void 0,
			xmodel: el?.getAttribute?.("x-model"),
			xclick: el?.getAttributeNames?.().filter((n) => n.startsWith("@click")).map((n) => `${n}=${el.getAttribute(n)}`),
			checked: el?.checked,
			trusted: e.isTrusted,
			defaultPrevented: e.defaultPrevented
		};
	}
	function installEventTap() {
		const types = [
			"pointerdown",
			"mousedown",
			"pointerup",
			"mouseup",
			"click",
			"change",
			"input"
		];
		const handler = (e) => {
			const el = e.target;
			if (el?.closest?.("input[x-model=\"playlist.is_added\"]") || el?.getAttributeNames?.().some((n) => n.startsWith("@click") && (el.getAttribute(n) || "").includes("togglePlaylist"))) rec("dom-event", describe(e));
		};
		for (const t of types) document.addEventListener(t, handler, { capture: true });
	}
	function installFetchTap() {
		const orig = window.fetch.bind(window);
		window.fetch = (...args) => {
			const url = String(args[0]);
			const isPl = /\/api\/playlists\/(add|remove)/.test(url);
			if (isPl) rec("fetch-start", {
				url,
				keepalive: args[1]?.keepalive
			});
			return orig(...args).then((r) => {
				if (isPl) rec("fetch-done", {
					url,
					status: r.status,
					ok: r.ok
				});
				return r;
			}, (err) => {
				if (isPl) rec("fetch-error", {
					url,
					msg: String(err)
				});
				throw err;
			});
		};
	}
	function installFastSaveProbe() {
		document.addEventListener("click", (e) => {
			const box = e.target.closest?.("input[x-model=\"playlist.is_added\"]");
			if (!box) return;
			const input = box;
			rec("fastsave-hit", {
				id: input.id,
				checked: input.checked
			});
			const alp = window.Alpine;
			if (!alp) {
				rec("fastsave-no-alpine");
				return;
			}
			const data = alp.$data(input);
			const list = data?.playlists;
			const item = list?.find((p) => p.key === input.id);
			rec("fastsave-data", {
				hasData: !!data,
				hasList: !!list,
				listLen: list?.length,
				hasItem: !!item,
				itemIsAdded: item?.is_added,
				dvdId: data?.dvdId ?? data.videoCode
			});
			setTimeout(() => {
				rec("fastsave-after-tick", {
					checked: input.checked,
					itemIsAdded: item?.is_added
				});
			}, 0);
		}, true);
		document.addEventListener("click", (e) => {
			const box = e.target.closest?.("input[x-model=\"playlist.is_added\"]");
			if (!box) return;
			rec("fastsave-bubble", {
				defaultPrevented: e.defaultPrevented,
				checked: box.checked
			});
		}, false);
	}
	function installPanelWatcher() {
		waitDOMContentLoaded(() => {
			const snapshot = () => {
				const boxes = document.querySelectorAll("input[x-model=\"playlist.is_added\"]");
				if (!boxes.length) return;
				const fieldset = boxes[0].closest("fieldset");
				rec("panel-snap", {
					boxes: boxes.length,
					fieldsetGrid: fieldset?.classList.contains("mx-pl-grid"),
					order: [...boxes].slice(0, 3).map((b) => b.closest("div.relative")?.style.order)
				});
			};
			snapshot();
			const iv = setInterval(() => {
				if (!document.querySelector("input[x-model=\"playlist.is_added\"]")) return;
				snapshot();
			}, 2e3);
			document.addEventListener("click", (e) => {
				const t = e.target;
				if (t?.getAttributeNames?.().some((n) => n.startsWith("@click") && (t.getAttribute(n) || "").includes("togglePanel"))) setTimeout(() => {
					if (!document.querySelector("input[x-model=\"playlist.is_added\"]")) clearInterval(iv);
				}, 500);
			}, true);
		});
	}
	function playlistDebug() {
		installEventTap();
		installFetchTap();
		installFastSaveProbe();
		installPanelWatcher();
		rec("debug-installed", { href: location.href });
		GM_registerMenuCommand$1("📋 复制片单诊断日志", () => {
			const text = log.map((l) => `${l.t}ms ${l.ev} ${l.detail !== void 0 ? JSON.stringify(l.detail) : ""}`).join("\n");
			navigator.clipboard.writeText(text).then(() => alert(`已复制 ${log.length} 条日志`)).catch(() => {
				prompt("手动复制：", text);
			});
		});
	}
	(function() {
		if (window.top !== window.self) return;
		console.log("MissAV desktop execute!");
		registerSettingMenu();
		if (GM_getValue$1("topbar-ui", true)) {
			installAntiFlicker();
			registerSettingIcon();
		}
		if (GM_getValue$1("block-ads", true)) blockAds();
		if (GM_getValue$1("lang-pref", true)) preferLang();
		if (GM_getValue$1("search-pref", true)) searchPref();
		if (GM_getValue$1("shortcut-keys", true)) shortcuts();
		if (GM_getValue$1("fast-save", true)) fastSave();
		if (GM_getValue$1("auto-backup", true)) autoBackup();
		if (GM_getValue$1("sources", true)) sources();
		if (GM_getValue$1("playlist-panel", true)) playlistPanel();
		playlistDebug();
	})();
})();
