/**
 * SmoothMotion — SmoothTools
 * Sub-navegación (Mis Scripts / Herramientas) y Herramientas Rápidas.
 */
(function () {
  'use strict';

  var KEY_SUBPAGE = 'SmoothTools_SubPage';
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

  function call(expr, label) {
    if (!csInterface) { toast('CEP no disponible.'); return; }
    csInterface.evalScript(expr, function (res) {
      var r = parseResult(res);
      if (r.ok) {
        var n = (typeof r.count === 'number') ? (' (' + r.count + ')') : '';
        toast('\u2713 ' + label + n);
      } else if (!r.assumed) {
        toast('\u26A0 ' + (r.error || 'Error.'), 5000);
      }
    });
  }

  function S(v) { return JSON.stringify(v == null ? '' : String(v)); }

  // Portapapeles Windows via Node (CEP tiene --enable-nodejs). Sin ventana visible.
  function runHiddenPs(lines) {
    var fs = require('fs');
    var path = require('path');
    var os = require('os');
    var execSync = require('child_process').execSync;
    var ps1 = path.join(os.tmpdir(), 'sm_clip_' + Date.now() + '.ps1');
    fs.writeFileSync(ps1, lines.join('\r\n'), 'utf8');
    try {
      execSync(
        'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Hidden -File "' + ps1 + '"',
        { windowsHide: true, stdio: 'pipe', timeout: 60000 }
      );
    } finally {
      try { fs.unlinkSync(ps1); } catch (e) {}
    }
  }

  function copyPngToClipboard(pngPath) {
    var safe = pngPath.replace(/'/g, "''");
    runHiddenPs([
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      "$path = '" + safe + "'",
      'if (-not (Test-Path -LiteralPath $path)) { exit 1 }',
      '$bytes = [System.IO.File]::ReadAllBytes($path)',
      '$ms = New-Object System.IO.MemoryStream(,$bytes)',
      '$data = New-Object System.Windows.Forms.DataObject',
      '$data.SetData("PNG", $false, $ms)',
      '$data.SetData("image/png", $false, (New-Object System.IO.MemoryStream(,$bytes)))',
      '$img = [System.Drawing.Image]::FromFile($path)',
      '$data.SetImage($img)',
      '[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)',
      '$img.Dispose()',
      '$ms.Dispose()'
    ]);
  }

  function saveClipboardToPng(destPath) {
    var safe = destPath.replace(/'/g, "''");
    var dir = require('path').dirname(destPath);
    runHiddenPs([
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      "$dest = '" + safe + "'",
      "$dir = '" + dir.replace(/'/g, "''") + "'",
      'if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }',
      '$saved = $false',
      'foreach ($fmt in @("PNG","png","image/png")) {',
      '  if ([System.Windows.Forms.Clipboard]::ContainsData($fmt)) {',
      '    $raw = [System.Windows.Forms.Clipboard]::GetData($fmt)',
      '    if ($raw -is [byte[]]) {',
      '      [System.IO.File]::WriteAllBytes($dest, $raw)',
      '      $saved = $true',
      '      break',
      '    }',
      '    if ($raw -is [System.IO.MemoryStream]) {',
      '      [System.IO.File]::WriteAllBytes($dest, $raw.ToArray())',
      '      $saved = $true',
      '      break',
      '    }',
      '  }',
      '}',
      'if (-not $saved) {',
      '  if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 1 }',
      '  $img = [System.Windows.Forms.Clipboard]::GetImage()',
      '  $w = $img.Width; $h = $img.Height',
      '  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)',
      '  $g = [System.Drawing.Graphics]::FromImage($bmp)',
      '  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))',
      '  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy',
      '  $g.DrawImage($img, 0, 0, $w, $h)',
      '  $g.Dispose()',
      '  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)',
      '  $bmp.Dispose()',
      '  $img.Dispose()',
      '}'
    ]);
  }

  function setSubPage(name) {
    if (name !== 'scripts' && name !== 'quick') name = 'scripts';

    var pScripts = $('tools-page-scripts');
    var pQuick = $('tools-page-quick');
    if (pScripts) pScripts.classList.toggle('active', name === 'scripts');
    if (pQuick) pQuick.classList.toggle('active', name === 'quick');

    var tScripts = $('tools-tab-scripts');
    var tQuick = $('tools-tab-quick');
    if (tScripts) tScripts.classList.toggle('active', name === 'scripts');
    if (tQuick) tQuick.classList.toggle('active', name === 'quick');

    try { localStorage.setItem(KEY_SUBPAGE, name); } catch (e) {}

    if (name === 'scripts' && window.MB_scripts && window.MB_scripts.onShow) {
      window.MB_scripts.onShow();
    }
  }

  function initSubnav() {
    var btns = document.querySelectorAll('.tools-subnav-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        setSubPage(this.getAttribute('data-tools-page'));
      });
    }
    var saved = 'scripts';
    try { saved = localStorage.getItem(KEY_SUBPAGE) || 'scripts'; } catch (e) {}
    setSubPage(saved);
  }

  function initQuickTools() {
    var rnApply = $('tk-rn-apply');
    if (rnApply) rnApply.addEventListener('click', function () {
      var find = $('tk-rn-find').value;
      var replace = $('tk-rn-replace').value;
      var prefix = $('tk-rn-prefix').value;
      var suffix = $('tk-rn-suffix').value;
      var num = $('tk-rn-number').checked ? 'true' : 'false';
      call('STK_renameLayers(' + S(find) + ',' + S(replace) + ',' + S(prefix) + ',' + S(suffix) + ',' + num + ')', 'Capas renombradas');
    });

    var exprDisabled = $('tk-expr-disabled');
    if (exprDisabled) exprDisabled.addEventListener('click', function () {
      call('STK_cleanExpressions(' + S('disabled') + ')', 'Expresiones desactivadas quitadas');
    });
    var exprErrored = $('tk-expr-errored');
    if (exprErrored) exprErrored.addEventListener('click', function () {
      call('STK_cleanExpressions(' + S('errored') + ')', 'Expresiones con error quitadas');
    });
    var exprAll = $('tk-expr-all');
    if (exprAll) exprAll.addEventListener('click', function () {
      call('STK_cleanExpressions(' + S('all') + ')', 'Expresiones quitadas');
    });

    var keysAlign = $('tk-keys-align');
    if (keysAlign) keysAlign.addEventListener('click', function () {
      call('STK_alignKeys()', 'Keys alineadas a In/Out');
    });
    var keysDist = $('tk-keys-distribute');
    if (keysDist) keysDist.addEventListener('click', function () {
      call('STK_distributeKeys()', 'Keys distribuidas');
    });

    var precomp = $('tk-precomp-apply');
    if (precomp) precomp.addEventListener('click', function () {
      var nm = $('tk-precomp-name').value;
      call('STK_precomp(' + S(nm) + ')', 'Precompuesto');
    });

    var copyFrame = $('tk-copy-frame');
    if (copyFrame) copyFrame.addEventListener('click', function () {
      if (!csInterface) { toast('CEP no disponible.'); return; }
      csInterface.evalScript('TOOL_saveFramePng()', function (res) {
        var r = parseResult(res);
        if (!r.ok) { toast('\u26A0 ' + (r.error || 'Error.'), 5000); return; }
        try {
          copyPngToClipboard(r.path);
          toast('\u2713 Frame copiado al portapapeles');
        } catch (e) {
          toast('\u26A0 Error al copiar: ' + (e.message || e), 5000);
        }
      });
    });

    var pasteImage = $('tk-paste-image');
    if (pasteImage) pasteImage.addEventListener('click', function () {
      if (!csInterface) { toast('CEP no disponible.'); return; }
      csInterface.evalScript('TOOL_getPasteImagePath()', function (res) {
        var r = parseResult(res);
        if (!r.ok) {
          toast('\u26A0 ' + (r.error || 'Error.'), 5000);
          return;
        }
        try {
          saveClipboardToPng(r.path);
        } catch (e) {
          toast('\u26A0 No hay imagen en el portapapeles.', 4500);
          return;
        }
        csInterface.evalScript('TOOL_importImage(' + JSON.stringify(r.path) + ')', function (res2) {
          var r2 = parseResult(res2);
          if (r2.ok) toast('\u2713 Imagen pegada (guardada en proyecto)');
          else toast('\u26A0 ' + (r2.error || 'Error.'), 5000);
        });
      });
    });
  }

  function initQuickRail() {
    var map = [
      ['tk-rail-copy', 'tk-copy-frame'],
      ['tk-rail-paste', 'tk-paste-image'],
      ['tk-rail-expr-off', 'tk-expr-disabled'],
      ['tk-rail-expr-err', 'tk-expr-errored'],
      ['tk-rail-keys-align', 'tk-keys-align'],
      ['tk-rail-keys-dist', 'tk-keys-distribute'],
      ['tk-rail-precomp', 'tk-precomp-apply']
    ];
    for (var i = 0; i < map.length; i++) {
      (function (railId, srcId) {
        var rail = $(railId);
        var src = $(srcId);
        if (!rail || !src) return;
        rail.addEventListener('click', function () { src.click(); });
      })(map[i][0], map[i][1]);
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (typeof CSInterface !== 'undefined') {
      try { csInterface = new CSInterface(); } catch (e) { csInterface = null; }
    }
    initSubnav();
    initQuickTools();
    initQuickRail();
  }

  window.MB_tools = { init: init, setSubPage: setSubPage };
})();
