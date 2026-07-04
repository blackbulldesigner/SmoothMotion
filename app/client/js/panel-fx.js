/**
 * SmoothMotion — SmoothFX
 * Rigs y expresiones: Camera Shake, Wiggle, Loop, Fade.
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;

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

  function num(id, def) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? def : v;
  }

  function call(expr, label, okMsg) {
    if (!csInterface) { toast('CEP no disponible.'); return; }
    csInterface.evalScript(expr, function (res) {
      var r = parseResult(res);
      if (r.ok) {
        var msg = okMsg || label;
        if (typeof r.count === 'number') msg += ' (' + r.count + ' capa' + (r.count === 1 ? '' : 's') + ')';
        toast('\u2713 ' + msg);
      } else if (!r.assumed) {
        toast('\u26A0 ' + (r.error || 'Error.'), 5000);
      }
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }

    var shake = $('fx-shake-apply');
    if (shake) shake.addEventListener('click', function () {
      call(
        'FX_cameraShake(' + num('fx-shake-amount', 20) + ',' + num('fx-shake-freq', 3) + ')',
        'Camera Shake',
        'Camera Shake aplicado y capas parentadas'
      );
    });

    var wiggle = $('fx-wiggle-apply');
    if (wiggle) wiggle.addEventListener('click', function () {
      call('FX_wiggle(' + num('fx-wiggle-amount', 30) + ',' + num('fx-wiggle-freq', 2) + ')', 'Wiggle aplicado');
    });

    var loopCycle = $('fx-loop-cycle');
    if (loopCycle) loopCycle.addEventListener('click', function () { call('FX_loop("cycle")', 'Loop cycle'); });
    var loopPP = $('fx-loop-pingpong');
    if (loopPP) loopPP.addEventListener('click', function () { call('FX_loop("pingpong")', 'Loop ping-pong'); });
    var loopCont = $('fx-loop-continue');
    if (loopCont) loopCont.addEventListener('click', function () { call('FX_loop("continue")', 'Loop continue'); });

    var fade = $('fx-fade-apply');
    if (fade) fade.addEventListener('click', function () {
      call('FX_fade(' + num('fx-fade-in', 12) + ',' + num('fx-fade-out', 12) + ')', 'Fade aplicado');
    });
  }

  window.MB_fx = { init: init };
})();
