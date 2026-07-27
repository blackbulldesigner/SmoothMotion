/* ============================================================
   SmoothMotion — DEMO SHIM universal (apps separadas)
   Se carga JUSTO ANTES de license-boot.js.
   Ver notas en client/js/demo-shim.js
   ============================================================ */
(function () {
  'use strict';

  // ── 1. Desactivar licencia (antes de que license-boot dispare el gate) ──
  function unlockLicense() {
    if (window.SM_license) {
      window.SM_license.isActivated = function () { return true; };
      window.SM_license.waitForActivation = function (cb) { if (typeof cb === 'function') cb(); };
    }
  }
  unlockLicense();

  // ── 2. Stub del puente After Effects ──
  try {
    if (typeof CSInterface === 'function') {
      var proto = CSInterface.prototype;
      proto.evalScript = function (script, cb) {
        if (typeof cb === 'function') { try { cb('undefined'); } catch (e) {} }
      };
      proto.addEventListener = function () {};
      proto.removeEventListener = function () {};
      proto.getExtensionID = function () { return 'com.smoothmotion.demo'; };
      proto.getHostEnvironment = function () {
        return { appName: 'AEFT', appVersion: '24.0', appLocale: 'es_ES' };
      };
    }
  } catch (e) {}

  // ── 3. Stubs Node / CEP ──
  // Mock de módulos Node para que los paneles nuevos (Explorer/Traductor/Paste)
  // muestren una UI real en la demo, sin acceso real al sistema.
  if (typeof window.require === 'undefined') {
    var DEMO_FS = {
      '/Demo': ['Proyectos', 'Materiales', 'logo.png', 'intro.mp4', 'musica.mp3', 'render.aep'],
      '/Demo/Proyectos': ['escena_01.aep', 'escena_02.aep', 'portada.png'],
      '/Demo/Materiales': ['textura.jpg', 'grano.mov', 'sfx.wav', 'voz.mp3', 'fondo.png']
    };
    var DEMO_MODULES = {
      os: { homedir: function () { return '/Demo'; }, tmpdir: function () { return '/Demo/tmp'; } },
      path: {
        sep: '/',
        join: function () { return Array.prototype.slice.call(arguments).join('/').replace(/\/+/g, '/'); },
        dirname: function (p) { var s = String(p).replace(/\/+$/, '').split('/'); s.pop(); return s.join('/') || '/'; }
      },
      fs: {
        existsSync: function () { return true; },
        statSync: function (p) {
          var name = String(p).split('/').pop();
          var isDir = name.indexOf('.') === -1;
          return { isDirectory: function () { return isDir; }, size: 1024 };
        },
        readdirSync: function (p) { return DEMO_FS[p] ? DEMO_FS[p].slice() : []; },
        readFileSync: function () { return ''; },
        writeFileSync: function () {}, mkdirSync: function () {}, unlinkSync: function () {}
      },
      https: {
        get: function (url, opts, cb) {
          var handlers = {};
          var req = { on: function (ev, fn) { handlers[ev] = fn; return req; }, setTimeout: function () {}, destroy: function () {} };
          setTimeout(function () { if (handlers.error) handlers.error(new Error('modo demo')); }, 300);
          return req;
        }
      },
      child_process: { execFileSync: function () { throw new Error('modo demo'); } },
      buffer: { Buffer: window.Buffer || function () {} }
    };
    window.require = function (m) { return DEMO_MODULES[m] || {}; };
  }
  if (typeof window.cep === 'undefined') {
    window.cep = {
      util: { openURLInDefaultBrowser: function (u) { try { window.open(u, '_blank'); } catch (e) {} } },
      fs: {}
    };
  }

  // ── 4. Etiqueta DEMO + toast en acciones ──
  document.addEventListener('DOMContentLoaded', function () {
    // Ocultar el overlay de licencia por si acaso
    var lic = document.getElementById('lic-overlay');
    if (lic) lic.style.display = 'none';

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

    var tag = document.createElement('div');
    tag.textContent = 'DEMO';
    tag.style.cssText =
      'position:fixed;right:8px;top:8px;background:rgba(59,130,246,0.14);' +
      'border:1px solid rgba(59,130,246,0.4);color:#60a5fa;font:700 9px/1 Inter,system-ui,sans-serif;' +
      'letter-spacing:1.5px;padding:5px 8px;border-radius:20px;z-index:99998;pointer-events:none;';
    document.body.appendChild(tag);

    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('button, .op-btn, .tt-btn, .sa-btn, .t-btn, .wc');
      if (!el) return;
      if (el.closest('#tab-nav, #toolbar-tabs, .ref-grid, .app')) return; // dejar navegación interna (.app = SmoothText, funciona en el navegador)
      demoToast();
    }, true);
  });
})();
