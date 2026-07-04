/**
 * Parsea respuestas JSON de ExtendScript (evalScript).
 * AE 2026+ a veces devuelve cadena vacía aunque la acción haya funcionado.
 */
(function (global) {
  'use strict';

  function parseHostResult(res) {
    var trimmed = (res == null ? '' : String(res)).trim();

    if (trimmed === 'EvalScript error.') {
      return { ok: false, error: 'ExtendScript error.' };
    }

    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
      return { ok: true, assumed: true };
    }

    try {
      var data = JSON.parse(trimmed);
      if (data && typeof data.ok === 'boolean') {
        return data;
      }
      return { ok: true, data: data };
    } catch (e) {
      if (trimmed.indexOf('ERROR') === 0) {
        return { ok: false, error: trimmed };
      }
      return { ok: true, raw: trimmed };
    }
  }

  global.SmoothMotionHost = { parseResult: parseHostResult };
})(typeof window !== 'undefined' ? window : global);
