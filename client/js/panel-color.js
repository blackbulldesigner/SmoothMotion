/**
 * SmoothMotion — SmoothColor
 * Selector de color, paleta personalizada, sólido, fill y control de color.
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;
  var swatchClickBound = false;

  var KEY_PALETTE = 'smoothmotion_color_custom_v1';
  var MAX_CUSTOM = 48;

  var DEFAULT_PALETTE = [
    '#ffffff', '#0f1117', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
  ];

  var customColors = [];

  function $(id) { return document.getElementById(id); }

  function toast(msg, ms) {
    if (typeof smoothMotionToast === 'function') smoothMotionToast(msg, ms || 3500);
    else alert(msg);
  }

  function parseResult(res) {
    if (window.SmoothMotionHost && window.SmoothMotionHost.parseResult) {
      return window.SmoothMotionHost.parseResult(res);
    }
    if (!res || res === 'undefined' || res === 'EvalScript error.') {
      return { ok: false, error: 'Error al ejecutar script de AE.' };
    }
    try { return JSON.parse(res); }
    catch (e) { return { ok: false, error: String(res) }; }
  }

  function normalizeHex(hex) {
    var h = String(hex || '').trim().toLowerCase();
    if (!h) return null;
    if (h.charAt(0) !== '#') h = '#' + h;
    if (/^#[0-9a-f]{3}$/.test(h)) {
      h = '#' + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2) + h.charAt(3) + h.charAt(3);
    }
    if (!/^#[0-9a-f]{6}$/.test(h)) return null;
    return h;
  }

  function currentHex() {
    return normalizeHex($('col-hex').value);
  }

  function setActiveColor(hex) {
    var h = normalizeHex(hex);
    if (!h) return;
    $('col-hex').value = h;
    $('col-picker').value = h;
    updateSwatchSelection(h);
  }

  function call(fn, label) {
    var hex = currentHex();
    if (!hex) { toast('\u26A0 Color inválido (usa #RRGGBB).', 4000); return; }
    if (!csInterface) { toast('CEP no disponible.'); return; }
    csInterface.evalScript(fn + '(' + JSON.stringify(hex) + ')', function (res) {
      var r = parseResult(res);
      if (r.ok) {
        var n = (typeof r.count === 'number') ? (' (' + r.count + ')') : '';
        toast('\u2713 ' + label + n);
      } else if (!r.assumed) {
        toast('\u26A0 ' + (r.error || 'Error.'), 5000);
      }
    });
  }

  function syncFromPicker() {
    var hex = normalizeHex($('col-picker').value);
    if (hex) {
      $('col-hex').value = hex;
      updateSwatchSelection(hex);
    }
  }

  function syncFromHex() {
    var hex = currentHex();
    if (hex) {
      $('col-picker').value = hex;
      updateSwatchSelection(hex);
    }
  }

  function loadCustomPalette() {
    customColors = [];
    try {
      var raw = localStorage.getItem(KEY_PALETTE);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      var seen = {};
      for (var i = 0; i < arr.length; i++) {
        var n = normalizeHex(arr[i]);
        if (!n || seen[n]) continue;
        seen[n] = true;
        customColors.push(n);
      }
    } catch (e) {
      customColors = [];
    }
  }

  function saveCustomPalette() {
    try { localStorage.setItem(KEY_PALETTE, JSON.stringify(customColors)); } catch (e) {}
  }

  function colorInPalette(hex) {
    var i;
    for (i = 0; i < DEFAULT_PALETTE.length; i++) {
      if (normalizeHex(DEFAULT_PALETTE[i]) === hex) return true;
    }
    for (i = 0; i < customColors.length; i++) {
      if (customColors[i] === hex) return true;
    }
    return false;
  }

  function addCurrentColor() {
    var hex = currentHex();
    if (!hex) {
      toast('\u26A0 Color inválido (usa #RRGGBB).', 4000);
      return;
    }
    if (colorInPalette(hex)) {
      toast('Ese color ya está en tu paleta.');
      return;
    }
    if (customColors.length >= MAX_CUSTOM) {
      toast('Máximo ' + MAX_CUSTOM + ' colores personalizados.');
      return;
    }
    customColors.push(hex);
    saveCustomPalette();
    renderSwatches();
    toast('\u2713 Color guardado en tu paleta');
  }

  function removeCustomColor(hex) {
    var n = normalizeHex(hex);
    if (!n) return;
    var idx = customColors.indexOf(n);
    if (idx === -1) return;
    customColors.splice(idx, 1);
    saveCustomPalette();
    renderSwatches();
  }

  function swatchHtml(color, isCustom, selected) {
    var cls = 'col-swatch';
    if (isCustom) cls += ' col-swatch-custom';
    if (selected === color) cls += ' col-swatch-active';
    var remove = isCustom
      ? '<button type="button" class="col-swatch-remove" data-remove="' + color + '" title="Quitar de mi paleta">&times;</button>'
      : '';
    return '<div class="' + cls + '" data-color="' + color + '" style="background:' + color + ';" title="' + color + '">' + remove + '</div>';
  }

  function updateSwatchSelection(hex) {
    var wrap = $('col-swatches');
    if (!wrap) return;
    var nodes = wrap.querySelectorAll('.col-swatch');
    for (var i = 0; i < nodes.length; i++) {
      var sw = nodes[i];
      var c = sw.getAttribute('data-color');
      if (c === hex) sw.classList.add('col-swatch-active');
      else sw.classList.remove('col-swatch-active');
    }
  }

  function updatePaletteHint() {
    var hint = $('col-palette-hint');
    if (!hint) return;
    hint.style.display = customColors.length ? 'none' : 'block';
  }

  function renderSwatches() {
    var wrap = $('col-swatches');
    if (!wrap) return;

    var selected = currentHex();
    var html = '';
    var i;

    for (i = 0; i < customColors.length; i++) {
      html += swatchHtml(customColors[i], true, selected);
    }
    for (i = 0; i < DEFAULT_PALETTE.length; i++) {
      html += swatchHtml(DEFAULT_PALETTE[i], false, selected);
    }

    wrap.innerHTML = html;
    updatePaletteHint();

    if (!swatchClickBound) {
      swatchClickBound = true;
      wrap.addEventListener('click', function (e) {
        var removeBtn = e.target.closest ? e.target.closest('.col-swatch-remove') : null;
        if (removeBtn) {
          e.stopPropagation();
          removeCustomColor(removeBtn.getAttribute('data-remove'));
          return;
        }
        var sw = e.target.closest ? e.target.closest('.col-swatch') : null;
        if (!sw) return;
        setActiveColor(sw.getAttribute('data-color'));
      });
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }

    loadCustomPalette();
    renderSwatches();

    var picker = $('col-picker');
    if (picker) picker.addEventListener('input', syncFromPicker);
    var hexInp = $('col-hex');
    if (hexInp) {
      hexInp.addEventListener('input', syncFromHex);
      hexInp.addEventListener('change', syncFromHex);
    }

    var addBtn = $('col-add');
    if (addBtn) addBtn.addEventListener('click', addCurrentColor);

    var solid = $('col-solid');
    if (solid) solid.addEventListener('click', function () { call('COL_applySolid', 'Sólido creado'); });
    var fill = $('col-fill');
    if (fill) fill.addEventListener('click', function () { call('COL_fillSelected', 'Fill aplicado'); });
    var control = $('col-control');
    if (control) control.addEventListener('click', function () { call('COL_colorControl', 'Control de color creado'); });
  }

  window.MB_color = { init: init };
})();
