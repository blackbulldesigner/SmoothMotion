/**
 * SmoothMotion — SmoothComp
 * Panel de capas inteligente: filtros, selección, color labels, notas y snapshots.
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;
  var layers = [];
  var filter = 'all';
  var query = '';

  // Colores aproximados de las etiquetas de After Effects (0 = ninguna)
  var LABEL_COLORS = [
    '#5a6172', '#d65b5b', '#e0d24f', '#56c7c7', '#e07ab5', '#b3a0e0',
    '#e0a96d', '#8fd17a', '#5b8fd6', '#7ad19f', '#9b7ad1', '#e08a4f',
    '#b56a4f', '#d14f9b', '#6ad1c4', '#c9b06a', '#4f9b6a'
  ];

  var TYPE_LABEL = {
    camera: 'CAM', light: 'LUZ', shape: 'SHAPE', 'null': 'NULL',
    text: 'TXT', solid: 'SOLID', precomp: 'PRE', footage: 'IMG', other: '—'
  };

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

  function S(v) { return JSON.stringify(v == null ? '' : String(v)); }

  function matchesFilter(lyr) {
    if (filter === 'all') return true;
    if (filter === 'keys') return !!lyr.keys;
    if (filter === 'expr') return !!lyr.expr;
    return lyr.type === filter;
  }

  function matchesQuery(lyr) {
    if (!query) return true;
    return (lyr.name || '').toLowerCase().indexOf(query) !== -1 ||
           (lyr.note || '').toLowerCase().indexOf(query) !== -1;
  }

  function render() {
    var list = $('cmp-list');
    if (!list) return;
    var visible = layers.filter(function (l) { return matchesFilter(l) && matchesQuery(l); });

    if (!layers.length) {
      list.innerHTML = '<div class="cmp-empty">Abre una composición y pulsa refrescar.</div>';
      return;
    }
    if (!visible.length) {
      list.innerHTML = '<div class="cmp-empty">Sin capas que coincidan con el filtro.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < visible.length; i++) {
      var l = visible[i];
      var color = LABEL_COLORS[l.label] || LABEL_COLORS[0];
      var badge = TYPE_LABEL[l.type] || '—';
      var flags = '';
      if (l.keys) flags += '<span class="cmp-flag cmp-flag-k" title="Tiene keyframes">K</span>';
      if (l.expr) flags += '<span class="cmp-flag cmp-flag-e" title="Tiene expresiones">fx</span>';
      var note = l.note ? '<div class="cmp-row-note">' + escapeHtml(l.note) + '</div>' : '';
      html += '' +
        '<div class="cmp-row' + (l.selected ? ' sel' : '') + '" data-index="' + l.index + '">' +
          '<span class="cmp-dot" style="background:' + color + ';"></span>' +
          '<div class="cmp-row-main">' +
            '<div class="cmp-row-name">' + escapeHtml(l.name) + '</div>' + note +
          '</div>' +
          '<span class="cmp-flags">' + flags + '</span>' +
          '<span class="cmp-badge">' + badge + '</span>' +
          '<button type="button" class="cmp-note-btn" data-note="' + l.index + '" title="Nota">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
          '</button>' +
        '</div>';
    }
    list.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function refresh() {
    if (!csInterface) return;
    csInterface.evalScript('COMP_listLayers()', function (res) {
      var r = parseResult(res);
      if (!r.ok && !r.assumed) {
        layers = [];
        render();
        toast('\u26A0 ' + (r.error || 'Error.'), 4000);
        return;
      }
      layers = r.layers || [];
      render();
    });
  }

  function onRowClick(e) {
    var noteBtn = e.target.closest ? e.target.closest('.cmp-note-btn') : null;
    if (noteBtn) {
      e.stopPropagation();
      var idx = parseInt(noteBtn.getAttribute('data-note'), 10);
      editNote(idx);
      return;
    }
    var row = e.target.closest ? e.target.closest('.cmp-row') : null;
    if (!row) return;
    var index = parseInt(row.getAttribute('data-index'), 10);
    var additive = e.ctrlKey || e.metaKey || e.shiftKey;
    csInterface.evalScript('COMP_selectLayer(' + index + ',' + (additive ? 'true' : 'false') + ')', function (res) {
      var r = parseResult(res);
      if (r.ok) {
        for (var i = 0; i < layers.length; i++) {
          if (!additive) layers[i].selected = false;
          if (layers[i].index === index) layers[i].selected = true;
        }
        render();
      }
    });
  }

  function editNote(index) {
    var lyr = null;
    for (var i = 0; i < layers.length; i++) { if (layers[i].index === index) { lyr = layers[i]; break; } }
    var current = lyr ? lyr.note : '';
    var txt = window.prompt('Nota para la capa:', current || '');
    if (txt === null) return;
    csInterface.evalScript('COMP_setNote(' + index + ',' + S(txt) + ')', function (res) {
      var r = parseResult(res);
      if (r.ok) { if (lyr) lyr.note = txt; render(); }
      else toast('\u26A0 ' + (r.error || 'Error.'), 4000);
    });
  }

  function initFilters() {
    var chips = document.querySelectorAll('.cmp-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        var c = document.querySelectorAll('.cmp-chip');
        for (var j = 0; j < c.length; j++) c[j].classList.remove('active');
        this.classList.add('active');
        filter = this.getAttribute('data-cmp-filter');
        render();
      });
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }

    initFilters();

    var search = $('cmp-search');
    if (search) search.addEventListener('input', function () {
      query = this.value.toLowerCase();
      render();
    });

    var refreshBtn = $('cmp-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);

    var list = $('cmp-list');
    if (list) list.addEventListener('click', onRowClick);

    var autolabel = $('cmp-autolabel');
    if (autolabel) autolabel.addEventListener('click', function () {
      csInterface.evalScript('COMP_autoLabel()', function (res) {
        var r = parseResult(res);
        if (r.ok) { toast('\u2713 Capas coloreadas (' + (r.count || 0) + ')'); refresh(); }
        else toast('\u26A0 ' + (r.error || 'Error.'), 4000);
      });
    });

    var snapshot = $('cmp-snapshot');
    if (snapshot) snapshot.addEventListener('click', function () {
      csInterface.evalScript('COMP_snapshot("")', function (res) {
        var r = parseResult(res);
        if (r.ok) toast('\u2713 Snapshot: ' + r.name);
        else toast('\u26A0 ' + (r.error || 'Error.'), 4000);
      });
    });
  }

  function onShow() {
    if (csInterface) refresh();
  }

  window.MB_comp = { init: init, onShow: onShow };
})();
