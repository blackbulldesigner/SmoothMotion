/**
 * SmoothMotion Web — i18n (Español / English)
 * ==================================================================
 * El HTML del sitio está escrito en español (fuente de la verdad) y aquí solo
 * se mantiene un diccionario ES -> EN (js/i18n-en.js). El motor sustituye el
 * texto directamente en el DOM, así que no hay que marcar el HTML.
 *
 *  - Nodos de texto y atributos (title, placeholder, aria-label, alt…)
 *  - Un MutationObserver traduce también lo que pinta el JS después
 *    (descripciones del playground, tarjetas de precios…).
 *
 * Al cambiar de idioma se recarga la página: así se vuelve al español original
 * sin tener que guardar copias del texto.
 *
 * Para excluir algo: data-no-i18n en el elemento.
 */
(function (global) {
  'use strict';

  var SUPPORTED = ['es', 'en'];
  var LS_KEY = 'smoothmotion_web_lang';

  function normalize(l) {
    l = String(l || '').toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(l) !== -1 ? l : null;
  }

  function readLang() {
    try {
      var saved = normalize(localStorage.getItem(LS_KEY));
      if (saved) return saved;
    } catch (e) {}
    // Sin preferencia guardada: usa el idioma del navegador
    try {
      var nav = normalize((navigator.language || navigator.userLanguage || 'es'));
      if (nav) return nav;
    } catch (e) {}
    return 'es';
  }

  var current = readLang();

  function setLang(lang, reload) {
    var l = normalize(lang);
    if (!l || l === current) return false;
    try { localStorage.setItem(LS_KEY, l); } catch (e) {}
    current = l;
    if (reload !== false) global.location.reload();
    return true;
  }

  function toggle() { setLang(current === 'es' ? 'en' : 'es'); }

  /* ── Diccionario ES -> EN ───────────────────────────────────────────── */
  var MAP = Object.create(null);
  var LOWER = null;

  function keyOf(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function register(dict) {
    if (!dict) return;
    for (var k in dict) {
      if (!Object.prototype.hasOwnProperty.call(dict, k)) continue;
      var kk = keyOf(k);
      if (kk) MAP[kk] = dict[k];
    }
    LOWER = null;
    if (started) apply();
  }

  function lookup(s) {
    var k = keyOf(s);
    if (!k) return null;
    if (MAP[k] != null) return MAP[k];
    if (LOWER === null) {
      LOWER = Object.create(null);
      for (var mk in MAP) LOWER[mk.toLowerCase()] = MAP[mk];
    }
    var hit = LOWER[k.toLowerCase()];
    if (hit == null) return null;
    if (k.length > 1 && k === k.toUpperCase() && k !== k.toLowerCase()) return hit.toUpperCase();
    return hit;
  }

  function t(sp) {
    if (current !== 'en') return sp;
    var hit = lookup(sp);
    return (hit != null) ? hit : sp;
  }

  /* ── Traducción del DOM ─────────────────────────────────────────────── */
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, IFRAME: 1, CANVAS: 1 };
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'content'];

  function skipEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS[el.tagName]) return true;
    if (el.hasAttribute && el.hasAttribute('data-no-i18n')) return true;
    return false;
  }

  function inSkipped(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (skipEl(p)) return true;
    }
    return false;
  }

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var trimmed = keyOf(raw);
    if (!trimmed || trimmed.length > 600) return;
    var hit = lookup(trimmed);
    if (hit == null || hit === trimmed) return;
    if (inSkipped(node)) return;
    var lead = raw.match(/^\s*/)[0];
    var tail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + hit + tail;
  }

  function translateAttrs(el) {
    if (skipEl(el) || !el.getAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      // 'content' solo en <meta name=description|og:*>
      if (a === 'content' && el.tagName !== 'META') continue;
      var v = el.getAttribute(a);
      if (!v) continue;
      var hit = lookup(v);
      if (hit != null && hit !== v) el.setAttribute(a, hit);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) translateAttrs(root);
    var doc = root.ownerDocument || document;
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) translateTextNode(n);
      else translateAttrs(n);
    }
  }

  function apply(root) {
    if (current !== 'en') return;
    walk(root || document.body || document);
    try { document.documentElement.setAttribute('lang', current); } catch (e) {}
  }

  var observer = null;
  function observe() {
    if (current !== 'en' || observer || typeof MutationObserver === 'undefined') return;
    var target = document.body || document.documentElement;
    if (!target) return;
    observer = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') translateTextNode(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    });
    observer.observe(target, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  /* ── Botones de idioma ──────────────────────────────────────────────── */
  function wireToggles() {
    var ids = ['langToggle', 'langToggleMob'];
    for (var i = 0; i < ids.length; i++) {
      var btn = document.getElementById(ids[i]);
      if (!btn) continue;
      // El botón muestra el idioma AL QUE se cambiaría
      btn.textContent = (current === 'es') ? 'EN' : 'ES';
      btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    }
  }

  var started = false;
  function start() {
    started = true;
    apply();
    observe();
    wireToggles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    setTimeout(start, 0);   // deja que i18n-en.js registre el diccionario
  }

  global.SM_WEB_I18N = {
    getLang: function () { return current; },
    setLang: setLang,
    toggle: toggle,
    t: t,
    register: register,
    apply: apply,
  };
})(window);
