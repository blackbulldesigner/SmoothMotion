/**
 * SmoothMotion — Extras transversales
 * Command Palette (Ctrl/Cmd+K), favoritos, perfiles de pestañas y onboarding.
 */
(function () {
  'use strict';

  var KEY_FAV = 'SmoothMotion_FavActions';
  var KEY_HIDDEN = 'SmoothMotion_HiddenModules';
  var KEY_ONB = 'SmoothMotion_Onboarded_v31';

  var initialized = false;
  var favorites = [];
  var hidden = [];
  var activeIndex = 0;
  var currentRows = [];

  // Registro de acciones. mod = módulo destino, sub = subpágina de tools, btn = botón a pulsar.
  var ACTIONS = [
    { id: 'open-curves', mod: 'flow', label: 'SmoothCurves: abrir', tag: 'Curves' },
    { id: 'open-scripts', mod: 'scripts', sub: 'scripts', label: 'SmoothTools: Mis Scripts', tag: 'Tools' },
    { id: 'open-quick', mod: 'scripts', sub: 'quick', label: 'SmoothTools: Herramientas rápidas', tag: 'Tools' },
    { id: 'anchor-center', mod: 'anchor', btn: 'sa-anchor-c', label: 'SmoothAnchor: centrar ancla', tag: 'Anchor' },
    { id: 'open-anchor', mod: 'anchor', label: 'SmoothAnchor: abrir panel', tag: 'Anchor' },
    { id: 'rename', mod: 'scripts', sub: 'quick', btn: 'tk-rn-apply', label: 'Renombrar capas en lote', tag: 'Tools' },
    { id: 'expr-disabled', mod: 'scripts', sub: 'quick', btn: 'tk-expr-disabled', label: 'Quitar expresiones desactivadas', tag: 'Tools' },
    { id: 'expr-errored', mod: 'scripts', sub: 'quick', btn: 'tk-expr-errored', label: 'Quitar expresiones con error', tag: 'Tools' },
    { id: 'keys-align', mod: 'scripts', sub: 'quick', btn: 'tk-keys-align', label: 'Alinear keys a In/Out', tag: 'Tools' },
    { id: 'keys-dist', mod: 'scripts', sub: 'quick', btn: 'tk-keys-distribute', label: 'Distribuir keys uniforme', tag: 'Tools' },
    { id: 'precomp', mod: 'scripts', sub: 'quick', btn: 'tk-precomp-apply', label: 'Precomponer selección', tag: 'Tools' },
    { id: 'comp-refresh', mod: 'comp', btn: 'cmp-refresh', label: 'SmoothComp: refrescar capas', tag: 'Comp' },
    { id: 'comp-label', mod: 'comp', btn: 'cmp-autolabel', label: 'Colorear capas por tipo', tag: 'Comp' },
    { id: 'comp-snap', mod: 'comp', btn: 'cmp-snapshot', label: 'Snapshot del comp', tag: 'Comp' },
    { id: 'fx-shake', mod: 'fx', btn: 'fx-shake-apply', label: 'Crear Camera Shake', tag: 'FX' },
    { id: 'fx-wiggle', mod: 'fx', btn: 'fx-wiggle-apply', label: 'Aplicar Wiggle', tag: 'FX' },
    { id: 'fx-loop', mod: 'fx', btn: 'fx-loop-cycle', label: 'Loop (cycle)', tag: 'FX' },
    { id: 'fx-fade', mod: 'fx', btn: 'fx-fade-apply', label: 'Aplicar Fade', tag: 'FX' },
    { id: 'col-solid', mod: 'color', btn: 'col-solid', label: 'Crear sólido con color', tag: 'Color' },
    { id: 'col-fill', mod: 'color', btn: 'col-fill', label: 'Rellenar selección (Fill)', tag: 'Color' },
    { id: 'col-control', mod: 'color', btn: 'col-control', label: 'Crear control de color', tag: 'Color' },
    { id: 'txt-apply', mod: 'text', label: 'SmoothText: aplicar preset', tag: 'Text' },
    { id: 'type-box', mod: 'type', btn: 'typ-box-apply', label: 'SmoothTypo: Text Box', tag: 'Typo' },
    { id: 'type-split', mod: 'type', btn: 'typ-split-apply', label: 'SmoothTypo: Split Text', tag: 'Typo' },
    { id: 'txt-load', mod: 'text', btn: 'txt-load-btn', label: 'SmoothText: cargar de selección', tag: 'Text' },
    { id: 'exp-add', mod: 'export', btn: 'exp-add', label: 'Añadir comp a la cola de render', tag: 'Export' },
    { id: 'exp-clean', mod: 'export', btn: 'exp-clean-unused', label: 'Limpiar footage sin uso', tag: 'Export' }
  ];

  var MODULES = [
    { id: 'flow', label: 'Curves' },
    { id: 'scripts', label: 'Tools' },
    { id: 'comp', label: 'Comp' },
    { id: 'fx', label: 'FX' },
    { id: 'color', label: 'Color' },
    { id: 'text', label: 'Text' },
    { id: 'type', label: 'Typo' },
    { id: 'anchor', label: 'Anchor' },
    { id: 'export', label: 'Export' }
  ];

  function $(id) { return document.getElementById(id); }

  function load(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function isFav(id) { return favorites.indexOf(id) !== -1; }

  function toggleFav(id) {
    var i = favorites.indexOf(id);
    if (i === -1) favorites.push(id);
    else favorites.splice(i, 1);
    save(KEY_FAV, favorites);
  }

  function standaloneMod() {
    return window.SM_Standalone && window.SM_Standalone.module;
  }

  function isMacOS() {
    try {
      if (typeof CSInterface !== 'undefined') {
        var os = new CSInterface().getOSInformation();
        if (os && os.indexOf('Mac') !== -1) return true;
      }
    } catch (e0) {}
    return /Mac/i.test(navigator.platform || '') || /Mac OS X/i.test(navigator.userAgent || '');
  }

  function modKeyLabel() {
    return isMacOS() ? 'Cmd' : 'Ctrl';
  }

  function registerPaletteShortcut() {
    if (typeof CSInterface === 'undefined') return;
    try {
      var cs = new CSInterface();
      cs.registerKeyEventsInterest(JSON.stringify([
        { keyCode: 75, ctrlKey: true },
        { keyCode: 75, metaKey: true }
      ]));
    } catch (e1) {}
  }

  function isPaletteKey(e) {
    return e.key === 'k' || e.key === 'K' || e.keyCode === 75 || e.which === 75;
  }

  function isPaletteModifier(e) {
    return e.ctrlKey || e.metaKey;
  }

  function updateOnboardingShortcutLabel() {
    var label = modKeyLabel();
    document.querySelectorAll('.onb-kbd-mod').forEach(function (el) {
      el.textContent = label;
    });
  }

  function orderedActions(query) {
    var q = (query || '').toLowerCase();
    var solo = standaloneMod();
    var list = ACTIONS.filter(function (a) {
      if (solo && a.mod !== solo) return false;
      if (!q) return true;
      return a.label.toLowerCase().indexOf(q) !== -1 || a.tag.toLowerCase().indexOf(q) !== -1;
    });
    list.sort(function (a, b) {
      var fa = isFav(a.id) ? 0 : 1;
      var fb = isFav(b.id) ? 0 : 1;
      return fa - fb;
    });
    return list;
  }

  function renderList(query) {
    var list = $('cmdk-list');
    if (!list) return;
    currentRows = orderedActions(query);
    activeIndex = 0;
    if (!currentRows.length) {
      list.innerHTML = '<div class="cmdk-empty">Sin resultados.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < currentRows.length; i++) {
      var a = currentRows[i];
      html += '' +
        '<div class="cmdk-row' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
          '<span class="cmdk-row-mod">' + a.tag + '</span>' +
          '<span class="cmdk-row-label">' + a.label + '</span>' +
          '<button type="button" class="cmdk-star' + (isFav(a.id) ? ' on' : '') + '" data-fav="' + a.id + '">\u2605</button>' +
        '</div>';
    }
    list.innerHTML = html;
  }

  function runAction(a) {
    if (!a) return;
    closePalette();
    var solo = standaloneMod();
    if (a.mod && window.MotionBroNav && (!solo || solo === a.mod)) {
      window.MotionBroNav.setModule(a.mod);
    }
    setTimeout(function () {
      if (a.sub && window.MB_tools && window.MB_tools.setSubPage) window.MB_tools.setSubPage(a.sub);
      if (a.btn) { var b = $(a.btn); if (b) b.click(); }
    }, 70);
  }

  function openPalette() {
    var ov = $('cmdk-overlay');
    if (!ov) return;
    ov.classList.add('open');
    var inp = $('cmdk-input');
    if (inp) { inp.value = ''; inp.focus(); }
    renderList('');
    renderProfiles();
  }

  function closePalette() {
    var ov = $('cmdk-overlay');
    if (ov) ov.classList.remove('open');
  }

  function setActive(i) {
    var rows = document.querySelectorAll('.cmdk-row');
    if (!rows.length) return;
    if (i < 0) i = rows.length - 1;
    if (i >= rows.length) i = 0;
    activeIndex = i;
    for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('active', k === i);
    rows[i].scrollIntoView({ block: 'nearest' });
  }

  /* ── Perfiles (mostrar/ocultar pestañas) ── */
  function applyHidden() {
    for (var i = 0; i < MODULES.length; i++) {
      var btn = document.querySelector('.mb-nav-btn[data-module="' + MODULES[i].id + '"]');
      if (btn) btn.style.display = (hidden.indexOf(MODULES[i].id) !== -1) ? 'none' : '';
    }
    // Si el módulo activo quedó oculto, vuelve a Curves
    var active = null;
    try { active = localStorage.getItem('SmoothMotion_ActiveModule'); } catch (e) {}
    if (active && hidden.indexOf(active) !== -1 && window.MotionBroNav) {
      window.MotionBroNav.setModule('flow');
    }
  }

  function renderProfiles() {
    var wrap = $('cmdk-profile-toggles');
    if (!wrap) return;
    var html = '';
    for (var i = 0; i < MODULES.length; i++) {
      var m = MODULES[i];
      var on = hidden.indexOf(m.id) === -1;
      html += '<button type="button" class="cmdk-prof-chip' + (on ? ' on' : '') + '" data-mod="' + m.id + '">' + m.label + '</button>';
    }
    wrap.innerHTML = html;
  }

  function toggleModuleVisible(id) {
    if (id === 'flow') return; // Curves siempre visible
    var i = hidden.indexOf(id);
    if (i === -1) hidden.push(id);
    else hidden.splice(i, 1);
    save(KEY_HIDDEN, hidden);
    applyHidden();
    renderProfiles();
  }

  function initPaletteEvents() {
    var inp = $('cmdk-input');
    if (inp) inp.addEventListener('input', function () { renderList(this.value); });

    var list = $('cmdk-list');
    if (list) list.addEventListener('click', function (e) {
      var star = e.target.closest ? e.target.closest('.cmdk-star') : null;
      if (star) {
        e.stopPropagation();
        toggleFav(star.getAttribute('data-fav'));
        renderList($('cmdk-input').value);
        return;
      }
      var row = e.target.closest ? e.target.closest('.cmdk-row') : null;
      if (row) runAction(currentRows[parseInt(row.getAttribute('data-i'), 10)]);
    });

    var toggles = $('cmdk-profile-toggles');
    if (toggles) toggles.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.cmdk-prof-chip') : null;
      if (chip) toggleModuleVisible(chip.getAttribute('data-mod'));
    });

    var ov = $('cmdk-overlay');
    if (ov) ov.addEventListener('click', function (e) { if (e.target === ov) closePalette(); });

    document.addEventListener('keydown', function (e) {
      if (isPaletteModifier(e) && isPaletteKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        var open = $('cmdk-overlay') && $('cmdk-overlay').classList.contains('open');
        if (open) closePalette(); else openPalette();
        return;
      }
      if (!$('cmdk-overlay') || !$('cmdk-overlay').classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runAction(currentRows[activeIndex]); }
    });
  }

  /* ── Onboarding ── */
  function initOnboarding() {
    var seen = false;
    try { seen = !!localStorage.getItem(KEY_ONB); } catch (e) {}
    var ov = $('onb-overlay');
    var close = $('onb-close');
    if (close) close.addEventListener('click', function () {
      if (ov) ov.classList.remove('open');
      try { localStorage.setItem(KEY_ONB, '1'); } catch (e) {}
    });
    if (!seen && ov) setTimeout(function () { ov.classList.add('open'); }, 700);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    favorites = load(KEY_FAV, []);
    hidden = load(KEY_HIDDEN, []);
    registerPaletteShortcut();
    updateOnboardingShortcutLabel();
    initPaletteEvents();
    if (!standaloneMod()) {
      applyHidden();
      initOnboarding();
    } else {
      var prof = document.querySelector('.cmdk-profiles');
      if (prof) prof.style.display = 'none';
    }
  }

  window.MB_extras = { init: init, open: openPalette };
})();
