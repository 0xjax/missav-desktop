// ==UserScript==
// @name         missav 桌面端
// @namespace    https://github.com/jk278/missav-desktop
// @version      1.13.2
// @author       jk278
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
	_css("#setting-panel{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:260px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#setting-panel .setting-title{margin-bottom:12px;font-size:16px;font-weight:700}#setting-panel .setting-checkboxes label{cursor:pointer;align-items:center;gap:8px;padding:4px 0;display:flex}#setting-panel .setting-actions{text-align:right;margin-top:12px}#setting-panel button{color:#fff;cursor:pointer;background:#f06292;border:none;border-radius:4px;padding:4px 16px}#setting-panel button#setting-export{background:#444;margin-right:8px}#setting-panel button:disabled{opacity:.5;cursor:default}#backup-panel{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:300px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#backup-panel .setting-title{margin-bottom:8px;font-size:16px;font-weight:700}#backup-panel .backup-hint{color:#999;margin-bottom:10px;font-size:12px}#backup-panel .backup-list{margin:10px 0}#backup-panel .backup-row{border-top:1px solid #333;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;font-size:13px;line-height:1.5;display:flex}#backup-panel .backup-empty{color:#555}#backup-panel button{color:#fff;cursor:pointer;white-space:nowrap;background:#f06292;border:none;border-radius:4px;padding:4px 16px}#backup-panel #backup-close{background:#444}#backup-panel .backup-latest{text-align:left}.mx-sources{justify-content:center;align-items:center;gap:8px;margin-top:8px;font-size:12px;display:flex}.mx-sources-label{color:#d8dee9;opacity:.6}.mx-src{color:#e5e9f0;opacity:.65;border-radius:8px;padding:4px 8px;text-decoration:none;transition:opacity .15s}.mx-src:hover{opacity:1}.mx-src.current{opacity:1;cursor:default;outline:1px solid #88c0d0}.mx-loading{opacity:.4;background:0 0}#shortcut-help{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:240px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#shortcut-help .help-title{margin-bottom:12px;font-size:16px;font-weight:700}#shortcut-help .help-list{grid-template-columns:auto 1fr;align-items:center;gap:8px 12px;display:grid}#shortcut-help kbd{text-align:center;background:#333;border:1px solid #555;border-radius:4px;padding:2px 8px;font-family:inherit}#mx-toast-box{z-index:99999;pointer-events:none;flex-direction:column;align-items:center;gap:8px;display:flex;position:fixed;bottom:32px;left:50%;transform:translate(-50%)}.mx-toast{color:#eee;opacity:.95;background:#1e1e1e;border-radius:6px;padding:8px 20px;font-size:14px;transition:opacity .4s;box-shadow:0 4px 16px #0006}.mx-toast-out{opacity:0}:is(div:has(>iframe[src*=mayzaent]),div:has(>iframe[src*=rallytrck])){display:none}.mx-pl-grid{grid-template-columns:repeat(3,minmax(0,1fr));column-gap:1.5rem;display:grid}@media (width<=1280px){.mx-pl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.mx-pl-count{color:#d8dee9;opacity:.5;margin-left:.3rem;font-size:.75rem}");
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
	var waitDOMContentLoaded = (callback) => {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback);
		else callback();
	};
	var LANG_RE = /^(cn|en|ja|ko|ms|th|de|fr|vi|id|pt)$/;
	function currentLang() {
		return location.pathname.split("/").filter(Boolean).find((s) => LANG_RE.test(s)) ?? null;
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
		const domOrder = rows.map((r) => r.el);
		rows.sort((a, b) => tier(a) - tier(b) || (b.count ?? -1) - (a.count ?? -1) || a.name.localeCompare(b.name, "zh"));
		const grid = fieldset.querySelector(":scope > .mx-pl-grid");
		const orderSame = !!grid && rows.every((r, i) => r.el === domOrder[i]);
		const spansOk = rows.every((r) => {
			if (r.count === void 0) return true;
			return r.el.querySelector(".mx-pl-count")?.textContent === `(${r.count})`;
		});
		if (orderSame && spansOk) return;
		const container = grid ?? Object.assign(document.createElement("div"), { className: "mx-pl-grid" });
		for (const r of rows) {
			container.appendChild(r.el);
			const label = r.el.querySelector("label");
			if (!label || r.count === void 0) continue;
			let span = r.el.querySelector(".mx-pl-count");
			if (!span) {
				span = Object.assign(document.createElement("span"), { className: "mx-pl-count" });
				label.after(span);
			}
			span.textContent = `(${r.count})`;
		}
		if (!grid) fieldset.appendChild(container);
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
		const res = await fetch(url, { credentials: "include" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const html = await res.text();
		return new DOMParser().parseFromString(html, "text/html");
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
	async function crawlVideos(baseUrl) {
		const all = [];
		const seen = new Set();
		for (let page = 1; page <= 100; page++) {
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
		for (const [key, { name, url }] of map) {
			toast(`导出片单：${name}`);
			playlists.push({
				key,
				name,
				videos: await crawlVideos(url)
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
		return `收藏 ${s.saved.length} 部 · 片单 ${s.playlists.length} 个 / 共 ${videos} 部`;
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
			toast(`备份完成：收藏 ${saved.length} 部，片单 ${playlists.length} 个`);
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
		toast("备份收藏中…");
		const saved = await crawlVideos(`${location.origin}/${lang}/saved`);
		toast(`收藏 ${saved.length} 部，备份片单中…`);
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
	function exportBackup() {
		if (document.getElementById("backup-panel")) return;
		const snapshots = readSnapshots();
		const panel = Object.assign(document.createElement("div"), {
			id: "backup-panel",
			innerHTML: `
      <div class="setting-title">导出备份</div>
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
              <span>${fmtTs(s.ts)}<br>${snapshotStat(s)}</span>
              <button type="button" data-i="${i}">下载</button>
            </div>`;
			}).join("")}</div>`}
      <div class="setting-actions">
        <button id="backup-close" type="button">关闭</button>
      </div>
    `
		});
		document.body.appendChild(panel);
		panel.querySelector("#backup-latest-btn")?.addEventListener("click", () => {
			panel.remove();
			backupNow();
		});
		panel.querySelector("#backup-close")?.addEventListener("click", () => {
			panel.remove();
		});
		panel.querySelectorAll(".backup-row button").forEach((b) => {
			b.addEventListener("click", () => {
				const s = readSnapshots()[Number(b.dataset.i)];
				if (s) {
					downloadSnapshot(s);
					toast("已导出历史备份");
				}
				panel.remove();
			});
		});
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
		"playlist-panel": "片单面板优化"
	};
	var keyDefaults = {
		"block-ads": true,
		"lang-pref": true,
		"search-pref": true,
		"shortcut-keys": true,
		"fast-save": true,
		"auto-backup": true,
		"sources": true,
		"playlist-panel": true
	};
	function createSettingPanel() {
		const panel = Object.assign(document.createElement("div"), {
			id: "setting-panel",
			innerHTML: `
      <div class="setting-title">脚本设置</div>
      <div class="setting-checkboxes">
        ${Object.entries(keyValues).map(([key, label]) => `
          <label><input type="checkbox" data-key="${key}"><span>${label}</span></label>
        `).join("")}
      </div>
      <div class="setting-actions">
        <button id="setting-export" type="button">导出备份</button>
        <button id="setting-save" type="button">保存</button>
      </div>
    `
		});
		const checkboxes = panel.querySelectorAll(".setting-checkboxes input[type=\"checkbox\"]");
		checkboxes.forEach((checkbox) => {
			const key = checkbox.dataset.key;
			checkbox.checked = GM_getValue$1(key, keyDefaults[key] ?? false);
		});
		panel.querySelector("#setting-export")?.addEventListener("click", () => {
			exportBackup();
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
		window.open = (...args) => {
			console.warn("[missav-desktop] 已拦截 window.open:", args[0]);
			return null;
		};
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
				if (r.status === 401) openLoginModal(data);
				else toast("操作失败，请重试");
			}
		}).catch(() => {
			item.is_added = !target;
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
		"无码影片",
		"#1e40af"
	], [
		"-chinese-subtitle",
		"中文字幕",
		"#991b1b"
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
	function renderSwitcher(sources, currentId, loading) {
		const h1 = document.querySelector("h1");
		if (!h1) return;
		const row = document.querySelector(".mx-sources") ?? Object.assign(document.createElement("div"), { className: "mx-sources" });
		row.innerHTML = "<span class=\"mx-sources-label\">源</span>" + sources.map((s) => `<a class="mx-src${s.id === currentId ? " current" : ""}" style="background:${s.color}" href="${s.href}">${s.label}</a>`).join("") + (loading ? "<span class=\"mx-src mx-loading\">…</span>" : "");
		row.querySelector(".mx-src.current")?.removeAttribute("href");
		if (!row.isConnected) h1.after(row);
	}
	function sources() {
		let done = false;
		const init = () => {
			if (done) return true;
			if (![...document.querySelectorAll("button")].some((b) => b.getAttributeNames().some((n) => n.startsWith("@click") && (b.getAttribute(n) || "").includes("toggleSave")))) return false;
			done = true;
			const id = location.pathname.split("/").filter(Boolean).pop() || "";
			const parsed = parseVideoId(id);
			if (!parsed) return true;
			const curDef = [ORIGINAL, ...SUFFIXES].find(([s]) => s === parsed.suffix);
			const current = {
				id,
				label: curDef[1],
				color: curDef[2],
				href: location.href
			};
			renderSwitcher([current], id, true);
			const cached = readCache()[parsed.base];
			const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL;
			if (cacheFresh) renderSwitcher(cached.list, id, false);
			(async () => {
				try {
					const lang = currentLang() ?? "cn";
					const list = await fetchSources(parsed.base, lang);
					if (!list.length) list.push(current);
					writeCache(parsed.base, list);
					if (!cacheFresh || list.map((s) => s.id).join() !== cached.list.map((s) => s.id).join()) renderSwitcher(list, id, false);
				} catch {
					if (!cacheFresh) renderSwitcher([current], id, false);
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
			subtree: true
		});
		setTimeout(() => obs.disconnect(), 15e3);
	}
	(function() {
		if (window.top !== window.self) return;
		console.log("MissAV desktop execute!");
		registerSettingMenu();
		if (GM_getValue$1("block-ads", true)) blockAds();
		if (GM_getValue$1("lang-pref", true)) preferLang();
		if (GM_getValue$1("search-pref", true)) searchPref();
		if (GM_getValue$1("shortcut-keys", true)) shortcuts();
		if (GM_getValue$1("fast-save", true)) fastSave();
		if (GM_getValue$1("auto-backup", true)) autoBackup();
		if (GM_getValue$1("sources", true)) sources();
		if (GM_getValue$1("playlist-panel", true)) playlistPanel();
	})();
})();
