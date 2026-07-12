/**
 * SmoothTraductor — panel independiente.
 * Traduce el texto de la capa seleccionada (Google, gratis) y lo aplica en una
 * copia de la capa, ocultando la original.
 */
(function () {
  'use strict';

  var cs = null;
  var lastDetected = '';

  function $(id) { return document.getElementById(id); }

  var toastTimer = null;
  function toast(msg, isErr) {
    var el = $('tr-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, isErr ? 5000 : 3000);
  }

  // ── HTTP por Node (evita CORS del endpoint de Google) ──
  function httpsGet(url, cb) {
    try {
      var https = require('https');
      var req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 SmoothMotion' } }, function (res) {
        if (res.statusCode >= 300) { cb(new Error('HTTP ' + res.statusCode)); res.resume(); return; }
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function (c) { data += c; });
        res.on('end', function () { cb(null, data); });
      });
      req.on('error', function (e) { cb(e); });
      req.setTimeout(15000, function () { req.destroy(new Error('Tiempo de espera agotado')); });
    } catch (e) { cb(e); }
  }

  function translate(text, sl, tl, cb) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx' +
      '&sl=' + encodeURIComponent(sl) + '&tl=' + encodeURIComponent(tl) +
      '&dt=t&q=' + encodeURIComponent(text);
    httpsGet(url, function (err, body) {
      if (err) { cb(err); return; }
      try {
        var data = JSON.parse(body);
        var out = '';
        if (data && data[0]) {
          for (var i = 0; i < data[0].length; i++) {
            if (data[0][i] && data[0][i][0] != null) out += data[0][i][0];
          }
        }
        cb(null, { text: out, detected: (data && data[2]) || sl });
      } catch (e) { cb(e); }
    });
  }

  // ── Host ──
  function readSelection() {
    if (!cs) { toast('CEP no disponible.', true); return; }
    cs.evalScript('STR_readSelectedText()', function (res) {
      var s = (res == null ? '' : String(res));
      var i = s.indexOf('\x1f');
      var head = i >= 0 ? s.slice(0, i) : s;
      var body = i >= 0 ? s.slice(i + 1) : '';
      if (head === 'OK') {
        $('tr-source').value = body;
        $('tr-detected').textContent = '';
        $('tr-result').value = '';
        toast('✓ Texto leído de la capa');
      } else {
        toast('⚠ ' + (body || 'No se pudo leer la capa.'), true);
      }
    });
  }

  function doTranslate() {
    var text = $('tr-source').value;
    if (!text || !text.trim()) { toast('No hay texto que traducir.', true); return; }
    var sl = $('tr-src').value;
    var tl = $('tr-dst').value;

    var btn = $('tr-translate');
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="tr-spinner"></span> Traduciendo…';

    translate(text, sl, tl, function (err, r) {
      btn.disabled = false;
      btn.innerHTML = original;
      if (err) {
        toast('⚠ No se pudo traducir: ' + (err.message || err) + '. Revisa tu conexión.', true);
        return;
      }
      $('tr-result').value = r.text;
      lastDetected = r.detected || '';
      if (sl === 'auto' && lastDetected) {
        $('tr-detected').textContent = 'Detectado: ' + lastDetected;
      } else {
        $('tr-detected').textContent = '';
      }
      toast('✓ Traducido');
    });
  }

  function apply() {
    var translated = $('tr-result').value;
    if (!translated || !translated.trim()) { toast('Primero traduce (o escribe) el texto.', true); return; }
    if (!cs) { toast('CEP no disponible.', true); return; }
    var tag = ($('tr-dst').value || '').toUpperCase();
    var payload = JSON.stringify(translated) + ', ' + JSON.stringify(tag);
    cs.evalScript('STR_applyTranslation(' + payload + ')', function (res) {
      var s = (res == null ? '' : String(res));
      var i = s.indexOf('\x1f');
      var head = i >= 0 ? s.slice(0, i) : s;
      var body = i >= 0 ? s.slice(i + 1) : '';
      if (head === 'OK') toast('✓ Aplicado en una copia: ' + body);
      else if (head === 'ERR') toast('⚠ ' + (body || 'Error al aplicar.'), true);
      else toast('✓ Aplicado');
    });
  }

  function swap() {
    var src = $('tr-src'), dst = $('tr-dst');
    var s = src.value;
    if (s === 'auto') s = lastDetected || 'es';
    src.value = dst.value;
    dst.value = s;
    // Intercambia también los textos (traducción inversa cómoda)
    var a = $('tr-source').value;
    $('tr-source').value = $('tr-result').value;
    $('tr-result').value = a;
    $('tr-detected').textContent = '';
  }

  function init() {
    try { cs = new CSInterface(); } catch (e) { cs = null; }
    $('tr-read').addEventListener('click', readSelection);
    $('tr-translate').addEventListener('click', doTranslate);
    $('tr-apply').addEventListener('click', apply);
    $('tr-swap').addEventListener('click', swap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
