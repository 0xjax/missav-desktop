// ==UserScript==
// @name         missav 桌面端
// @namespace    https://github.com/jk278/missav-desktop
// @version      1.0.1
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
	_css("#setting-panel{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:260px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#setting-panel .setting-title{margin-bottom:12px;font-size:16px;font-weight:700}#setting-panel .setting-checkboxes label{cursor:pointer;align-items:center;gap:8px;padding:4px 0;display:flex}#setting-panel .setting-actions{text-align:right;margin-top:12px}#setting-panel button{color:#fff;cursor:pointer;background:#f06292;border:none;border-radius:4px;padding:4px 16px}:is(div:has(>iframe[src*=mayzaent]),div:has(>iframe[src*=rallytrck])){display:none}");
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
		const fn = rawFn("GM_getValue", _GM_getValue);
		if (fn) try {
			return fn(key, defaultValue);
		} catch {
			return defaultValue;
		}
		const stored = localStorage.getItem(`gm:${key}`);
		return stored === null ? defaultValue : JSON.parse(stored);
	}
	function GM_setValue$1(key, value) {
		const fn = rawFn("GM_setValue", _GM_setValue);
		if (fn) try {
			fn(key, value);
			return;
		} catch {}
		localStorage.setItem(`gm:${key}`, JSON.stringify(value));
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
	var keyValues = { "block-ads": "去广告" };
	var keyDefaults = { "block-ads": true };
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
	(function() {
		if (window.top !== window.self) return;
		console.log("MissAV desktop execute!");
		registerSettingMenu();
		if (GM_getValue$1("block-ads", true)) blockAds();
	})();
})();
