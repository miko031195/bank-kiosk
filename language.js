/*!
 * Hospital Kiosk i18n — Extended (AZ/EN/RU)
 * Version: 2.0 (extended)
 * Features:
 *  - Language switching via [data-language-switch="az|en|ru"]
 *  - Text:         [data-translate="key"]
 *  - HTML:         [data-translate-html="key"]
 *  - Attributes:   [data-translate-attr="placeholder,title,aria-label"] (+ per-attr keys)
 *  - Variables:    data-vars='{"amount":"12.50"}'  or  data-var-amount="12.50"
 *  - Title support: <title data-translate="...">
 *  - MutationObserver for dynamic content
 *  - Plurals (az/en simple, ru one/few/many/other)
 *  - Number & currency format helpers
 *  - Date/relative time helpers (Intl.DateTimeFormat, Intl.RelativeTimeFormat)
 *  - Namespaces for dictionaries (window.pageTranslationsNS["ns"])
 *  - Fallback chain: pageTranslationsNS > pageTranslations > key
 *  - Events: 'i18n:languageChanged', 'i18n:applied'
 *  - Storage sync across tabs/windows (language change)
 *  - Debug mode (set window.I18N_DEBUG=true)
 *  - Public API: window.i18n
 *  - Backwards compat: i18n.initLanguage()
 */

(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // Configuration
  const LANGS = ["az","en","ru"];
  const LS_LANG_KEY = "selectedLanguage";
  const LS_NOTIFY_KEY = "i18n_broadcast";
  const OBSERVE_MUTATIONS = true;
  const OBSERVE_CONFIG = {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
  };
  const DEFAULT_DIR = "ltr"; // All supported langs are LTR

  // Debug flag
  const DEBUG = !!(window.I18N_DEBUG);
  function dbg(...args){ if (DEBUG) try { console.debug("[i18n]", ...args); } catch {} }

  // Event emitter
  function emit(name, detail){
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  }

  // ───────────────────────────────────────────────────────────
  // Utilities
  const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj || {}, k);
  const toStr = (v) => (v == null ? "" : String(v));

  function getElVars(el) {
    let vars = {};
    const j = el.getAttribute("data-vars");
    if (j) {
      try { vars = JSON.parse(j) || {}; } catch (e) { dbg("Bad data-vars JSON", e); }
    }
    for (const { name, value } of Array.from(el.attributes || [])) {
      if (name && name.startsWith("data-var-")) {
        const k = name.slice("data-var-".length);
        vars[k] = value;
      }
    }
    return vars;
  }

  function getLang() {
    const saved = (localStorage.getItem(LS_LANG_KEY) || "").toLowerCase();
    if (LANGS.includes(saved)) return saved;
    const htmlLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (LANGS.includes(htmlLang)) return htmlLang;
    const nav = (navigator.language || "az").split("-")[0].toLowerCase();
    return LANGS.includes(nav) ? nav : "az";
  }

  function setLang(lang) {
    if (!LANGS.includes(lang)) lang = "az";
    const prev = getLang();
    if (prev === lang) { // still re-apply to be safe
      localStorage.setItem(LS_LANG_KEY, lang);
      applyLanguageSideEffects(lang);
      applyTranslations();
      return;
    }
    localStorage.setItem(LS_LANG_KEY, lang);
    applyLanguageSideEffects(lang);
    // Broadcast to other tabs/windows
    try { localStorage.setItem(LS_NOTIFY_KEY, JSON.stringify({ t: Date.now(), lang })); } catch {}
    applyTranslations();
    emit("i18n:languageChanged", { lang, prev });
    dbg("Language changed:", prev, "→", lang);
  }

  function applyLanguageSideEffects(lang){
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", DEFAULT_DIR);
    markActiveButtons(lang);
  }

  function markActiveButtons(lang) {
    document.querySelectorAll("[data-language-switch]").forEach(btn => {
      const isActive = (btn.getAttribute("data-language-switch") || "").toLowerCase() === lang;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  // Dictionary access with namespaces and fallback chain
  function getDict(lang, ns){
    const nsRoot = window.pageTranslationsNS || {};
    const root = window.pageTranslations || {};
    if (ns && has(nsRoot, ns) && has(nsRoot[ns], lang)) return nsRoot[ns][lang];
    if (has(root, lang)) return root[lang];
    return {};
  }

  // Plural rules
  function pluralForm(lang, n) {
    n = Math.abs(Number(n));
    if (lang === "ru") {
      const mod10 = n % 10, mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return "many";
      return "other";
    }
    return (n === 1 ? "one" : "other");
  }

  // Resolve translation key with optional namespace and plural suffixes
  function resolveKey(key, vars, ns){
    const lang = getLang();
    const dict = getDict(lang, ns);
    let candidate = key;
    if (has(vars, "count")) {
      const pf = pluralForm(lang, vars.count);
      const pk = `${key}_${pf}`;
      if (has(dict, pk)) candidate = pk;
      else if (has(dict, `${key}_other`)) candidate = `${key}_other`;
    }
    if (has(dict, candidate)) return dict[candidate];
    if (has(dict, key)) return dict[key];
    // try fallback without namespace if namespace used
    if (ns) {
      const dict2 = getDict(lang, undefined);
      if (has(dict2, candidate)) return dict2[candidate];
      if (has(dict2, key)) return dict2[key];
    }
    return key; // fallback to key
  }

  // Interpolate {placeholders}
  function interpolate(template, vars){
    let out = toStr(template);
    for (const k in (vars || {})) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), toStr(vars[k]));
    }
    return out;
  }

  // Public translator
  function t(key, vars = {}, ns){
    const str = resolveKey(key, vars, ns);
    return interpolate(str, vars);
  }

  // Helpers
  function formatNumber(num, options) {
    try { return new Intl.NumberFormat(getLang(), options || {}).format(num); }
    catch { return String(num); }
  }
  function formatCurrency(num, currency = "AZN") {
    try { return new Intl.NumberFormat(getLang(), { style: "currency", currency }).format(num); }
    catch { return String(num) + " " + currency; }
  }
  function formatDate(d, opts){
    try { return new Intl.DateTimeFormat(getLang(), opts || { year:"numeric", month:"2-digit", day:"2-digit"}).format(d); }
    catch { return new Date(d).toLocaleDateString(); }
  }
  function formatRelative(diffSeconds){
    try {
      const rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: "auto" });
      const abs = Math.abs(diffSeconds);
      const units = [
        ["year",   60*60*24*365],
        ["month",  60*60*24*30],
        ["day",    60*60*24],
        ["hour",   60*60],
        ["minute", 60],
        ["second", 1]
      ];
      for (const [u, s] of units){
        if (abs >= s || u === "second"){
          const val = Math.round(diffSeconds / s);
          return rtf.format(val, u);
        }
      }
    } catch {}
    return diffSeconds + "s";
  }

  // Translate <title>
  function translateTitle(root){
    const el = (root || document).querySelector("title[data-translate]");
    if (!el) return;
    const vars = getElVars(el);
    const ns = el.getAttribute("data-translate-ns") || undefined;
    const txt = t(el.getAttribute("data-translate"), vars, ns);
    el.textContent = txt;
    document.title = txt;
  }

  // Translate nodes inside scope
  function translateInScope(scope){
    const sc = scope instanceof Element ? scope : document;

    // Text content
    sc.querySelectorAll("[data-translate]").forEach(el => {
      if (el.tagName.toLowerCase() === "title") return;
      const vars = getElVars(el);
      const ns = el.getAttribute("data-translate-ns") || undefined;
      el.textContent = t(el.getAttribute("data-translate"), vars, ns);
    });

    // HTML content
    sc.querySelectorAll("[data-translate-html]").forEach(el => {
      const vars = getElVars(el);
      const ns = el.getAttribute("data-translate-ns") || undefined;
      el.innerHTML = t(el.getAttribute("data-translate-html"), vars, ns);
    });

    // Attributes
    sc.querySelectorAll("[data-translate-attr]").forEach(el => {
      const attrs = (el.getAttribute("data-translate-attr") || "").split(",").map(s => s.trim()).filter(Boolean);
      if (!attrs.length) return;
      const vars = getElVars(el);
      const ns = el.getAttribute("data-translate-ns") || undefined;
      const baseKey = el.getAttribute("data-translate") || el.getAttribute("data-translate-html") || "";
      attrs.forEach(attr => {
        // Specific attr key can be supplied via data-translate-{attr} or fallback to baseKey@attr
        let key = el.getAttribute(`data-translate-${attr}`);
        if (!key && baseKey) key = `${baseKey}@${attr}`;
        if (!key) return;
        el.setAttribute(attr, t(key, vars, ns));
      });
    });
  }

  // Apply everything
  function applyTranslations(scope){
    translateTitle(scope);
    translateInScope(scope);
    emit("i18n:applied", { lang: getLang() });
  }

  // Delegated click for language buttons
  function bindLanguageButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-language-switch]");
      if (!btn) return;
      const lang = (btn.getAttribute("data-language-switch") || "").toLowerCase();
      setLang(lang);
    });
  }

  // Observe dynamic changes
  let mo = null;
  function startObserver() {
    if (!OBSERVE_MUTATIONS || typeof MutationObserver === "undefined") return;
    if (mo) mo.disconnect();
    mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach(node => {
            if (node && node.nodeType === 1) {
              applyTranslations(node);
            }
          });
        }
      }
    });
    mo.observe(document.documentElement || document.body, OBSERVE_CONFIG);
  }

  // Cross-tab sync via storage event
  function bindStorageSync(){
    try {
      window.addEventListener("storage", (ev) => {
        if (ev.key === LS_LANG_KEY) {
          // another tab changed language
          const lang = (ev.newValue || "").toLowerCase();
          if (LANGS.includes(lang)) {
            applyLanguageSideEffects(lang);
            applyTranslations();
            emit("i18n:languageChanged", { lang, via: "storage" });
            dbg("Language sync via storage:", lang);
          }
        } else if (ev.key === LS_NOTIFY_KEY) {
          try {
            const payload = JSON.parse(ev.newValue || "{}");
            if (payload && payload.lang && LANGS.includes(payload.lang)) {
              applyLanguageSideEffects(payload.lang);
              applyTranslations();
              emit("i18n:languageChanged", { lang: payload.lang, via: "notify" });
              dbg("Language broadcast received:", payload.lang);
            }
          } catch {}
        }
      });
    } catch {}
  }

  // Public API
  function init(){
    bindLanguageButtons();
    bindStorageSync();
    applyLanguageSideEffects(getLang());
    // to handle pages where dictionaries are injected late:
    setTimeout(() => applyTranslations(), 50);
    startObserver();
  }

  const API = {
    t,
    applyTranslations: () => applyTranslations(),
    setLang,
    getLang,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelative,
    initLanguage: init // backwards compatibility
  };

  window.i18n = API;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();