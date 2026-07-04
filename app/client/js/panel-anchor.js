/**
 * SmoothAnchor — panel CEP (motor Smart Anchor v1.3 via SA_apply)
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;
  var resizeTimer = null;
  var lastPos = 'MC';

  function $(sel) { return document.querySelector(sel); }
  function $id(id) { return document.getElementById(id); }

  function toastError(msg) {
    if (typeof smoothMotionToast === 'function') smoothMotionToast('\u26A0 ' + msg, 4500);
    else if (msg) alert(msg);
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

  function evalHost(expr, cb) {
    if (!csInterface) {
      toastError('CEP no disponible.');
      if (cb) cb({ ok: false });
      return;
    }
    csInterface.evalScript(expr, function (res) {
      var r = parseResult(res);
      if (cb) cb(r);
    });
  }

  function flashBtn(btn, ok) {
    if (!btn) return;
    btn.classList.remove('sa-flash', 'sa-flash-error');
    void btn.offsetWidth;
    btn.classList.add(ok ? 'sa-flash' : 'sa-flash-error');
    setTimeout(function () {
      btn.classList.remove('sa-flash', 'sa-flash-error');
    }, ok ? 420 : 520);
  }

  function setActive(posId) {
    lastPos = posId || lastPos;
    var btns = document.querySelectorAll('#anchorModule .sa-btn[data-pos]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('sa-btn-active', btns[i].getAttribute('data-pos') === lastPos);
    }
  }

  function applyPos(posId, btn) {
    evalHost('SA_apply("' + posId + '")', function (r) {
      if (r.ok) {
        setActive(r.lastPos || posId);
        flashBtn(btn, true);
      } else if (!r.assumed) {
        flashBtn(btn, false);
        toastError(r.error || 'Error.');
      }
    });
  }

  function syncSettings() {
    evalHost('SA_getSettings()', function (r) {
      if (!r.ok) return;
      var move = $id('sa-move-pos');
      var dbg = $id('sa-debug');
      if (move) move.checked = !!r.movePos;
      if (dbg) dbg.checked = !!r.debug;
      if (r.lastPos) setActive(r.lastPos);
    });
  }

  function initGrid() {
    var btns = document.querySelectorAll('#anchorModule .sa-btn[data-pos]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        applyPos(this.getAttribute('data-pos'), this);
      });
    }
  }

  function initOptions() {
    var move = $id('sa-move-pos');
    var dbg = $id('sa-debug');
    var raw = $id('sa-center-raw');

    if (move) {
      move.addEventListener('change', function () {
        evalHost('SA_setMovePos(' + (move.checked ? 'true' : 'false') + ')');
      });
    }
    if (dbg) {
      dbg.addEventListener('change', function () {
        evalHost('SA_setDebug(' + (dbg.checked ? 'true' : 'false') + ')');
      });
    }
    if (raw) {
      raw.addEventListener('click', function () {
        evalHost('SA_centerRaw()', function (r) {
          if (r.ok) flashBtn($id('sa-anchor-c'), true);
          else if (!r.assumed) toastError(r.error || 'Error.');
        });
      });
    }
  }

  function isStandalone() {
    return document.body.classList.contains('sm-standalone') &&
      document.documentElement.getAttribute('data-sm-panel') === 'anchor';
  }

  function fitLayout() {
    var mod = document.getElementById('anchorModule');
    if (!mod) return;
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    mod.classList.toggle('sa-compact', w < 220 || h < 240);
    mod.classList.toggle('sa-micro', w < 110 || h < 110);
  }

  function scheduleLayout() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitLayout, 16);
  }

  function initLayoutWatch() {
    window.addEventListener('resize', scheduleLayout);
    var wrap = $('#anchorModule .sa-wrap');
    if (wrap && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(scheduleLayout).observe(wrap);
    }
    scheduleLayout();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }
    initGrid();
    initOptions();
    initLayoutWatch();
    syncSettings();
    evalHost('SA_ping()');
  }

  window.MB_anchor = { init: init, fitLayout: fitLayout };
})();
