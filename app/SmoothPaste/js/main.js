/**
 * SmoothPaste — copiar frame / pegar imagen.
 * Estrategia robusta: primero la API de portapapeles del navegador (corre en el
 * contexto interactivo de AE), y si no está disponible, PowerShell (vía la API de
 * proceso de CEP y, en último caso, Node child_process).
 */
(function () {
  'use strict';

  var cs = null;

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, kind) {
    var el = $('sp-status');
    if (!el) return;
    el.className = 'sp-status' + (kind ? ' ' + kind : '');
    el.innerHTML = (kind === 'busy' ? '<span class="sp-spinner"></span> ' : '') + msg;
  }

  function parsePlain(res) {
    var s = (res == null ? '' : String(res));
    var i = s.indexOf('\x1f');
    return { head: i >= 0 ? s.slice(0, i) : s, rest: i >= 0 ? s.slice(i + 1) : '' };
  }

  function fileExists(p) { try { return require('fs').existsSync(p); } catch (e) { return false; } }

  // ── API de portapapeles del navegador (contexto correcto de AE) ──
  function clipWrite(pngPath) {
    return new Promise(function (resolve, reject) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') {
          reject(new Error('sin Clipboard API')); return;
        }
        var bytes = require('fs').readFileSync(pngPath);
        var blob = new Blob([bytes], { type: 'image/png' });
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  function clipReadToFile(destPath) {
    return new Promise(function (resolve, reject) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) { reject(new Error('sin Clipboard API')); return; }
        navigator.clipboard.read().then(function (items) {
          var found = null, foundType = null;
          for (var i = 0; i < items.length && !found; i++) {
            var types = items[i].types || [];
            for (var j = 0; j < types.length; j++) {
              if (types[j].indexOf('image/') === 0) { found = items[i]; foundType = types[j]; break; }
            }
          }
          if (!found) { reject(new Error('sin imagen')); return; }
          found.getType(foundType).then(function (blob) {
            blob.arrayBuffer().then(function (ab) {
              try { require('fs').writeFileSync(destPath, Buffer.from(new Uint8Array(ab))); resolve(); }
              catch (e) { reject(e); }
            }, reject);
          }, reject);
        }, reject);
      } catch (e) { reject(e); }
    });
  }

  // ── PowerShell (respaldo) ──
  function psExe() {
    try {
      var r = (typeof process !== 'undefined' && (process.env.SystemRoot || process.env.windir)) || 'C:\\Windows';
      var p = r + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      if (require('fs').existsSync(p)) return p;
    } catch (e) {}
    return 'powershell.exe';
  }

  function psRun(lines) {
    var fs = require('fs'), path = require('path'), os = require('os');
    var f = path.join(os.tmpdir(), 'sp_' + Date.now() + '.ps1');
    var body = lines.join('\r\n');
    try { fs.writeFileSync(f, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(body, 'utf8')])); }
    catch (e) { try { fs.writeFileSync(f, body, { encoding: 'utf8' }); } catch (e2) {} }
    var exe = psExe();
    var args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Sta', '-WindowStyle', 'Hidden', '-File', f];
    var out = { code: 0, err: '' };

    // Método A: API de proceso de CEP (nativa de AE — estación/contexto correctos)
    try {
      if (window.cep && window.cep.process && window.cep.process.createProcess) {
        var c = window.cep.process.createProcess(exe, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
        var pid = c && (c.data != null) ? c.data : null;
        if (pid != null) {
          var w = window.cep.process.waitfor(pid);
          var code = (w && w.data != null) ? parseInt(w.data, 10) : 0;
          out.code = isNaN(code) ? 0 : code;
          try { fs.unlinkSync(f); } catch (e) {}
          return out;
        }
      }
    } catch (e) { out.err = String((e && e.message) || e); }

    // Método B: Node child_process
    try {
      require('child_process').execFileSync(exe, args, { windowsHide: true, timeout: 60000, encoding: 'utf8' });
      try { fs.unlinkSync(f); } catch (e) {}
      return out;
    } catch (e) {
      if (e && typeof e.status === 'number') { out.code = e.status; out.err = String(e.stderr || ''); }
      else { out.code = -1; out.err = String((e && (e.stderr || e.message)) || 'PowerShell no respondió'); }
      try { fs.unlinkSync(f); } catch (e2) {}
      return out;
    }
  }

  function psCopy(pngPath) {
    var safe = pngPath.replace(/'/g, "''");
    return psRun([
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      "$p='" + safe + "'",
      'if(-not (Test-Path -LiteralPath $p)){exit 1}',
      '$img=[System.Drawing.Image]::FromFile($p)',
      '[System.Windows.Forms.Clipboard]::SetImage($img)',
      '$img.Dispose()'
    ]);
  }

  function psPaste(destPath) {
    var safe = destPath.replace(/'/g, "''");
    var dir = require('path').dirname(destPath).replace(/'/g, "''");
    return psRun([
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      "$dest='" + safe + "'",
      "$dir='" + dir + "'",
      'if(-not (Test-Path -LiteralPath $dir)){New-Item -ItemType Directory -Path $dir -Force | Out-Null}',
      '$saved=$false',
      'try{ if([System.Windows.Forms.Clipboard]::ContainsImage()){ $i=[System.Windows.Forms.Clipboard]::GetImage(); if($i){ $b=New-Object System.Drawing.Bitmap $i.Width,$i.Height,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb); $g=[System.Drawing.Graphics]::FromImage($b); $g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0)); $g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy; $g.DrawImage($i,0,0,$i.Width,$i.Height); $g.Dispose(); $b.Save($dest,[System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose(); $i.Dispose(); $saved=$true } } }catch{}',
      'if(-not $saved){ foreach($fmt in @("PNG","image/png")){ try{ if([System.Windows.Forms.Clipboard]::ContainsData($fmt)){ $raw=[System.Windows.Forms.Clipboard]::GetData($fmt); if($raw -is [System.IO.MemoryStream]){[System.IO.File]::WriteAllBytes($dest,$raw.ToArray());$saved=$true;break} if($raw -is [byte[]]){[System.IO.File]::WriteAllBytes($dest,$raw);$saved=$true;break} } }catch{} } }',
      'if(-not $saved){ try{ if([System.Windows.Forms.Clipboard]::ContainsFileDropList()){ foreach($file in [System.Windows.Forms.Clipboard]::GetFileDropList()){ if($file -match "\\.(png|jpg|jpeg|gif|bmp|tif|tiff|webp)$"){ $s=[System.Drawing.Image]::FromFile($file); $s.Save($dest,[System.Drawing.Imaging.ImageFormat]::Png); $s.Dispose(); $saved=$true; break } } } }catch{} }',
      'if(-not $saved){exit 2}'
    ]);
  }

  // ── Acciones ──
  function importPng(destPath) {
    cs.evalScript('SP_importImage(' + JSON.stringify(destPath) + ')', function (res) {
      var p = parsePlain(res);
      if (p.head === 'OK') {
        var f = p.rest.split('\x1f');
        setStatus('✓ Imagen pegada' + (f[1] === '1' ? ' y añadida a la comp' : ' (importada al proyecto)'), 'ok');
      } else if (p.head === 'ERR') {
        setStatus('⚠ ' + (p.rest || 'Error al importar.'), 'err');
      } else {
        setStatus('✓ Imagen pegada', 'ok');
      }
    });
  }

  function copyFrame() {
    if (!cs) { setStatus('CEP no disponible.', 'err'); return; }
    setStatus('Exportando frame…', 'busy');
    cs.evalScript('SP_saveFramePng()', function (res) {
      var p = parsePlain(res);
      if (p.head !== 'OK') { setStatus('⚠ ' + (p.rest || 'No se pudo exportar el frame.'), 'err'); return; }
      var png = p.rest;
      setStatus('Copiando al portapapeles…', 'busy');
      clipWrite(png).then(function () {
        setStatus('✓ Frame copiado al portapapeles', 'ok');
      }).catch(function () {
        var ps = psCopy(png);
        if (ps.code === 0) setStatus('✓ Frame copiado al portapapeles', 'ok');
        else setStatus('⚠ No se pudo copiar el frame: ' + (ps.err || 'error'), 'err');
      });
    });
  }

  function pasteImage() {
    if (!cs) { setStatus('CEP no disponible.', 'err'); return; }
    setStatus('Leyendo portapapeles…', 'busy');
    cs.evalScript('SP_pasteTempPath()', function (res) {
      var p = parsePlain(res);
      if (p.head !== 'OK') { setStatus('⚠ ' + (p.rest || 'Error.'), 'err'); return; }
      var dest = p.rest;
      clipReadToFile(dest).then(function () {
        setStatus('Importando…', 'busy'); importPng(dest);
      }).catch(function () {
        var ps = psPaste(dest);
        if (fileExists(dest)) { setStatus('Importando…', 'busy'); importPng(dest); }
        else if (ps.code === 2) setStatus('⚠ No hay ninguna imagen en el portapapeles. Copia una imagen (o un archivo de imagen) y vuelve a intentarlo.', 'err');
        else setStatus('⚠ No se pudo leer el portapapeles: ' + (ps.err || 'sin respuesta'), 'err');
      });
    });
  }

  function init() {
    try { cs = new CSInterface(); } catch (e) { cs = null; }
    var c = $('sp-copy'), p = $('sp-paste');
    if (c) c.addEventListener('click', copyFrame);
    if (p) p.addEventListener('click', pasteImage);
    setStatus('Listo. Copia un frame o pega una imagen.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
