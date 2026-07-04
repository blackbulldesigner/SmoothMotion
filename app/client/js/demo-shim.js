/* ============================================================
   SmoothMotion — DEMO SHIM (solo para la web)
   ------------------------------------------------------------
   Permite que los paneles CEP (pensados para After Effects)
   se rendericen y sean navegables dentro de un navegador normal.

   1. Desactiva el gate de licencia.
   2. Stubbea el puente con After Effects (CSInterface.evalScript),
      devolviendo DATOS DE EJEMPLO para SmoothComp y SmoothText.
   3. Stubbea require() y window.cep.
   4. Fuerza el "modo panel individual" según ?m=<modulo>.
   5. Silencia los toasts de error y muestra un aviso "MODO DEMO".

   Se carga JUSTO ANTES de panel.js.
   ============================================================ */
(function () {
  'use strict';

  var MAP = {
    flow: 'SmoothCurves', scripts: 'SmoothTools', comp: 'SmoothComp',
    fx: 'SmoothFX', color: 'SmoothColor', text: 'SmoothText',
    anchor: 'SmoothAnchor', export: 'SmoothExport'
  };

  var params = new URLSearchParams(location.search);
  var MODULE = params.get('m');

  // ── Datos de ejemplo ──────────────────────────────────────
  var DEMO_LAYERS = {
    ok: true,
    layers: [
      { index: 1,  name: 'Logo',           type: 'shape',   label: 4,  keys: true,  expr: false, selected: true },
      { index: 2,  name: 'Título',         type: 'text',    label: 2,  keys: true,  expr: false, note: 'Animar entrada' },
      { index: 3,  name: 'Subtítulo',      type: 'text',    label: 2,  keys: false, expr: false },
      { index: 4,  name: 'CTRL · Null',    type: 'null',    label: 5,  keys: false, expr: true },
      { index: 5,  name: 'Fondo',          type: 'solid',   label: 1,  keys: false, expr: false },
      { index: 6,  name: 'Cámara 1',       type: 'camera',  label: 6,  keys: true,  expr: false },
      { index: 7,  name: 'Luz Key',        type: 'light',   label: 3,  keys: false, expr: false },
      { index: 8,  name: 'Textura.png',    type: 'footage', label: 8,  keys: false, expr: true },
      { index: 9,  name: 'Precomp · Intro', type: 'precomp', label: 9, keys: true,  expr: false },
      { index: 10, name: 'Partículas',     type: 'shape',   label: 4,  keys: true,  expr: true,  note: 'wiggle' }
    ]
  };

  var DEMO_PACKS = [
    {
      id: 'demo-pack',
      name: 'Presets de ejemplo',
      presetCount: 8,
      categories: {
        'Entrada': [
          { name: 'Fade In',      path: 'demo/entrada/fade-in.ffx' },
          { name: 'Slide Up',     path: 'demo/entrada/slide-up.ffx' },
          { name: 'Scale In',     path: 'demo/entrada/scale-in.ffx' }
        ],
        'Énfasis': [
          { name: 'Bounce',       path: 'demo/enfasis/bounce.ffx' },
          { name: 'Wiggle',       path: 'demo/enfasis/wiggle.ffx' },
          { name: 'Typewriter',   path: 'demo/enfasis/typewriter.ffx' }
        ],
        'Salida': [
          { name: 'Fade Out',     path: 'demo/salida/fade-out.ffx' },
          { name: 'Slide Down',   path: 'demo/salida/slide-down.ffx' }
        ]
      }
    }
  ];

  // ── 1. Desactivar licencia ────────────────────────────────
  if (window.SM_license) {
    window.SM_license.isActivated = function () { return true; };
    window.SM_license.waitForActivation = function (cb) { if (typeof cb === 'function') cb(); };
  }

  // ── 2. Stub del puente AE con datos de ejemplo ────────────
  try {
    if (typeof CSInterface === 'function') {
      var proto = CSInterface.prototype;
      proto.evalScript = function (script, cb) {
        var out = 'undefined';
        var s = String(script || '');
        if (s.indexOf('COMP_listLayers') !== -1)      out = JSON.stringify(DEMO_LAYERS);
        else if (s.indexOf('COMP_selectLayer') !== -1) out = '{"ok":true}';
        else if (s.indexOf('COMP_setNote') !== -1)     out = '{"ok":true}';
        else if (s.indexOf('readFileContents') !== -1 && s.indexOf('text-packs-registry') !== -1) {
          out = JSON.stringify(DEMO_PACKS);
        }
        if (typeof cb === 'function') { try { cb(out); } catch (e) {} }
      };
      proto.addEventListener = function () {};
      proto.removeEventListener = function () {};
      proto.getExtensionID = function () { return 'com.smoothmotion.demo'; };
      proto.getSystemPath = function () { return '/demo'; };
      proto.getHostEnvironment = function () {
        return { appName: 'AEFT', appVersion: '24.0', appLocale: 'es_ES' };
      };
    }
  } catch (e) {}

  // ── 3. Stubs Node / CEP ───────────────────────────────────
  if (typeof window.require === 'undefined') window.require = function () { return {}; };
  if (typeof window.cep === 'undefined') {
    window.cep = {
      util: { openURLInDefaultBrowser: function (u) { try { window.open(u, '_blank'); } catch (e) {} } },
      fs: {}
    };
  }

  // ── 4. Forzar módulo individual ───────────────────────────
  if (MODULE && MAP[MODULE]) {
    window.SM_Standalone = { module: MODULE, title: MAP[MODULE] };
    var applyShell = function () {
      document.body.classList.add('sm-standalone');
      document.body.setAttribute('data-sm-panel', MODULE);
      document.documentElement.setAttribute('data-sm-panel', MODULE);
    };
    if (document.body) applyShell();
    else document.addEventListener('DOMContentLoaded', applyShell);
  }

  // ── 5. Filtro de toasts de error + aviso demo ─────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Silenciar mensajes de error (los paneles avisan de "Error al ejecutar
    // script de AE" porque no hay host; en demo eso no aporta nada).
    if (typeof window.motionFlowToast === 'function') {
      var origToast = window.motionFlowToast;
      window.motionFlowToast = function (msg, ms) {
        if (/error|⚠/i.test(String(msg))) return;
        return origToast(msg, ms);
      };
    }

    // Etiqueta permanente DEMO
    var tag = document.createElement('div');
    tag.textContent = 'DEMO';
    tag.title = 'Panel interactivo de muestra — las acciones se ejecutan dentro de After Effects';
    tag.style.cssText =
      'position:fixed;right:8px;top:8px;background:rgba(59,130,246,0.14);' +
      'border:1px solid rgba(59,130,246,0.4);color:#60a5fa;font:700 9px/1 Inter,system-ui,sans-serif;' +
      'letter-spacing:1.5px;padding:5px 8px;border-radius:20px;z-index:99998;pointer-events:none;';
    document.body.appendChild(tag);

    // Aviso "demo" al pulsar acciones que tocarían After Effects
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('button, .tk-btn, .op-btn, .sa-btn');
      if (!el) return;
      if (el.closest('#mbNav, .tools-subnav, .mode-toggle, #graphModeToggle, .cat-tab, .scr-tab, .cmp-chip, #cmp-list, .txt-pack-head, .txt-cat-head')) return;
      demoToast();
    }, true);

    // SmoothComp: cargar las capas de ejemplo (en standalone no se llama a onShow)
    if (MODULE === 'comp') {
      setTimeout(function () {
        if (window.MB_comp && window.MB_comp.onShow) window.MB_comp.onShow();
      }, 400);
    }
  });

  function demoToast() {
    var t = document.createElement('div');
    t.textContent = 'Modo demo · esta acción funciona dentro de After Effects';
    t.style.cssText =
      'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);' +
      'background:rgba(15,17,23,0.95);color:#93c5fd;border:1px solid rgba(59,130,246,0.4);' +
      'font:600 11px/1.3 Inter,system-ui,sans-serif;padding:8px 14px;border-radius:8px;' +
      'z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.5);pointer-events:none;opacity:0;transition:opacity .2s;';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { if (t.parentNode) t.remove(); }, 250); }, 1800);
  }
})();
