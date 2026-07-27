/**
 * SmoothMotion — SmoothExport
 * Cola de render, plantillas y limpieza de proyecto.
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;
  var loadedTpl = false;

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

  function call(expr, label, after) {
    if (!csInterface) { toast('CEP no disponible.'); return; }
    csInterface.evalScript(expr, function (res) {
      var r = parseResult(res);
      if (r.ok) {
        var extra = (typeof r.count === 'number') ? (' (' + r.count + ')') : (r.name ? (': ' + r.name) : '');
        toast('\u2713 ' + label + extra);
        if (after) after(r);
      } else if (!r.assumed) {
        toast('\u26A0 ' + (r.error || 'Error.'), 5000);
      }
    });
  }

  function fillSelect(sel, items) {
    if (!sel) return;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += '<option value="' + encodeURIComponent(items[i]) + '">' + items[i] + '</option>';
    }
    sel.innerHTML = html;
  }

  function loadTemplates() {
    if (!csInterface) { toast('CEP no disponible.'); return; }
    csInterface.evalScript('EXP_listTemplates()', function (res) {
      var r = parseResult(res);
      if (!r.ok) { toast('\u26A0 ' + (r.error || 'Error.'), 4000); return; }
      fillSelect($('exp-rs'), r.rs || []);
      fillSelect($('exp-om'), r.om || []);
      loadedTpl = true;
      toast('\u2713 Plantillas cargadas');
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }

    var add = $('exp-add');
    if (add) add.addEventListener('click', function () { call('EXP_addToQueue()', 'Añadido a la cola'); });

    var refreshTpl = $('exp-refresh-tpl');
    if (refreshTpl) refreshTpl.addEventListener('click', loadTemplates);

    var addTpl = $('exp-add-tpl');
    if (addTpl) addTpl.addEventListener('click', function () {
      var rs = $('exp-rs').value ? decodeURIComponent($('exp-rs').value) : '';
      var om = $('exp-om').value ? decodeURIComponent($('exp-om').value) : '';
      call('EXP_addWithTemplate(' + JSON.stringify(rs) + ',' + JSON.stringify(om) + ')', 'Añadido con plantilla');
    });

    var cleanUnused = $('exp-clean-unused');
    if (cleanUnused) cleanUnused.addEventListener('click', function () { call('EXP_cleanProject("unused")', 'Footage sin uso quitado'); });
    var cleanCons = $('exp-clean-consolidate');
    if (cleanCons) cleanCons.addEventListener('click', function () { call('EXP_cleanProject("consolidate")', 'Footage consolidado'); });
  }

  function onShow() {
    if (csInterface && !loadedTpl) loadTemplates();
  }

  window.MB_export = { init: init, onShow: onShow };
})();
