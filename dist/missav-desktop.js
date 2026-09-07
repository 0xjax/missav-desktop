// ==UserScript==
// @name         missav 桌面端
// @namespace    https://github.com/jk278/missav-desktop
// @version      1.0.0
// @author       jk278
// @description  增强 missav 网站的桌面端浏览体验。
// @license      MIT
// @icon         https://missav.ws/favicon.ico
// @match        https://missav.ws/*
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
	_css("#setting-panel{z-index:99999;color:#eee;background:#1e1e1e;border-radius:8px;min-width:260px;padding:16px;font-size:14px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 24px #00000080}#setting-panel .setting-title{margin-bottom:12px;font-size:16px;font-weight:700}#setting-panel .setting-checkboxes label{cursor:pointer;align-items:center;gap:8px;padding:4px 0;display:flex}#setting-panel .setting-actions{text-align:right;margin-top:12px}#setting-panel button{color:#fff;cursor:pointer;background:#f06292;border:none;border-radius:4px;padding:4px 16px}");
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
	var keyValues = {};
	var keyDefaults = {};
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
	(function() {
		if (window.top !== window.self) return;
		console.log("MissAV desktop execute!");
		registerSettingMenu();
	})();
})();
