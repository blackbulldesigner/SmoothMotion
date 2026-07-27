/**
 * SmoothMotion — Modo panel individual (dockable por extensión CEP)
 * Cada Extension Id del manifest abre el mismo HTML pero solo un módulo.
 */
(function () {
  'use strict';

  var EXTENSIONS = {
    'com.smoothmotion.panel.flow':   { module: 'flow',    title: 'SmoothCurves' },
    'com.smoothmotion.panel.tools':  { module: 'scripts', title: 'SmoothTools' },
    'com.smoothmotion.panel.comp':   { module: 'comp',    title: 'SmoothComp' },
    'com.smoothmotion.panel.fx':     { module: 'fx',      title: 'SmoothFX' },
    'com.smoothmotion.panel.color':  { module: 'color',   title: 'SmoothColor' },
    'com.smoothmotion.panel.text':   { module: 'text',    title: 'SmoothText' },
    'com.smoothmotion.panel.anchor': { module: 'anchor',  title: 'SmoothAnchor' },
    'com.smoothmotion.panel.export': { module: 'export',  title: 'SmoothExport' }
  };

  function detectStandalone() {
    try {
      var cs = new CSInterface();
      var id = cs.getExtensionID();
      if (EXTENSIONS[id]) return EXTENSIONS[id];
    } catch (e) {}
    return null;
  }

  function applyStandaloneShell(info) {
    document.body.classList.add('sm-standalone');
    document.documentElement.setAttribute('data-sm-panel', info.module);
    document.body.setAttribute('data-sm-panel', info.module);

    var bar = document.getElementById('smStandaloneBar');
    if (bar) bar.classList.add('visible');

    var title = document.getElementById('smStandaloneTitle');
    if (title) title.textContent = info.title;

    document.title = info.title + ' — SmoothMotion';
  }

  var info = detectStandalone();
  window.SM_Standalone = info;

  if (info) {
    if (document.body) applyStandaloneShell(info);
    else document.addEventListener('DOMContentLoaded', function () { applyStandaloneShell(info); });
  }
})();
