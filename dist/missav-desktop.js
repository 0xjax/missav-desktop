// ==UserScript==
// @name         missav 桌面端
// @namespace    https://github.com/jk278/missav-desktop
// @version      1.4.2
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
	_css("#setting-panel{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:260px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#setting-panel .setting-title{margin-bottom:12px;font-size:16px;font-weight:700}#setting-panel .setting-checkboxes label{cursor:pointer;align-items:center;gap:8px;padding:4px 0;display:flex}#setting-panel .setting-actions{text-align:right;margin-top:12px}#setting-panel button{color:#fff;cursor:pointer;background:#f06292;border:none;border-radius:4px;padding:4px 16px}#shortcut-help{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:240px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#shortcut-help .help-title{margin-bottom:12px;font-size:16px;font-weight:700}#shortcut-help .help-list{grid-template-columns:auto 1fr;align-items:center;gap:8px 12px;display:grid}#shortcut-help kbd{text-align:center;background:#333;border:1px solid #555;border-radius:4px;padding:2px 8px;font-family:inherit}:is(div:has(>iframe[src*=mayzaent]),div:has(>iframe[src*=rallytrck])){display:none}");
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
	var keyValues = {
		"block-ads": "去广告",
		"lang-pref": "语言偏好",
		"search-pref": "搜索偏好",
		"shortcut-keys": "快捷操作"
	};
	var keyDefaults = {
		"block-ads": true,
		"lang-pref": true,
		"search-pref": true,
		"shortcut-keys": true
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
        <button id="setting-save" type="button">保存</button>
      </div>
    `
		});
		const checkboxes = panel.querySelectorAll(".setting-checkboxes input[type=\"checkbox\"]");
		checkboxes.forEach((checkbox) => {
			const key = checkbox.dataset.key;
			checkbox.checked = GM_getValue$1(key, keyDefaults[key] ?? false);
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
		"snaptrckr.fun"
	];
	var AD_SELECTORS = ["[id^=\"ts_ms_\"]", "iframe[width=\"1\"][height=\"1\"]:not([src])"];
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
	function scanAndRemove(root) {
		root.querySelectorAll(`iframe[src], a[href], ${AD_SELECTORS.join(", ")}`).forEach((el) => {
			if (matchAdEl(el)) removeAd(el);
		});
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
					if (matchAdEl(el)) removeAd(el);
					else scanAndRemove(el);
				});
				if (hasAdded) scanFloatingAds();
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
	var LANG_RE = /^(cn|en|ja|ko|ms|th|de|fr|vi|id|pt)$/;
	function currentLang() {
		return location.pathname.split("/").filter(Boolean).find((s) => LANG_RE.test(s)) ?? null;
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
		["Esc", "退出搜索输入"],
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
					case "KeyB":
						gotoPage("/saved");
						break;
					case "KeyH": gotoPage("/history");
				}
			});
		});
	}
	(function() {
		if (window.top !== window.self) return;
		console.log("MissAV desktop execute!");
		registerSettingMenu();
		if (GM_getValue$1("block-ads", true)) blockAds();
		if (GM_getValue$1("lang-pref", true)) preferLang();
		if (GM_getValue$1("search-pref", true)) searchPref();
		if (GM_getValue$1("shortcut-keys", true)) shortcuts();
	})();
})();
