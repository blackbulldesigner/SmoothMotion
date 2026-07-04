/**
 * SmoothMotion — Navegación entre módulos (Flow / Scripts)
 */
(function () {
  'use strict';

  var KEY_MODULE = 'SmoothMotion_ActiveModule';
  var VALID = ['flow', 'scripts', 'comp', 'fx', 'color', 'text', 'anchor', 'export'];
  var MODULE_IDS = {
    flow: 'flowModule', scripts: 'scriptsModule', comp: 'compModule',
    fx: 'fxModule', color: 'colorModule', text: 'textModule',
    anchor: 'anchorModule',
    'export': 'exportModule'
  };

  function standaloneModule() {
    return window.SM_Standalone && window.SM_Standalone.module;
  }

  function setModule(name) {
    var locked = standaloneModule();
    if (locked) name = locked;
    if (VALID.indexOf(name) === -1) name = 'flow';

    for (var key in MODULE_IDS) {
      if (!MODULE_IDS.hasOwnProperty(key)) continue;
      var el = document.getElementById(MODULE_IDS[key]);
      if (el) el.classList.toggle('active', key === name);
    }

    document.querySelectorAll('.mb-nav-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-module') === name);
    });

    try {
      if (!locked) localStorage.setItem(KEY_MODULE, name);
    } catch (e) {}

    if (name === 'scripts' && window.MB_scripts && window.MB_scripts.onShow) {
      window.MB_scripts.onShow();
    }
    if (name === 'comp' && window.MB_comp && window.MB_comp.onShow) {
      window.MB_comp.onShow();
    }
    if (name === 'export' && window.MB_export && window.MB_export.onShow) {
      window.MB_export.onShow();
    }
    if (name === 'text' && window.MB_text && window.MB_text.onShow) {
      window.MB_text.onShow();
    }
    if (name === 'flow' && typeof window.resizeCanvas === 'function') {
      setTimeout(window.resizeCanvas, 50);
    }
  }

  function init() {
    var locked = standaloneModule();

    if (locked) {
      var nav = document.getElementById('mbNav');
      if (nav) nav.style.display = 'none';
      setModule(locked);
      return;
    }

    var saved = 'flow';
    try { saved = localStorage.getItem(KEY_MODULE) || 'flow'; } catch (e) {}
    if (VALID.indexOf(saved) === -1) saved = 'flow';

    document.querySelectorAll('.mb-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setModule(btn.getAttribute('data-module'));
      });
    });

    setModule(saved);
  }

  window.MotionBroNav = { init: init, setModule: setModule };
})();
