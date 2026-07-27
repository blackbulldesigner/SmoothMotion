/**
 * SmoothMotion suite — arranque del escudo de licencia (compartido).
 * Lo usan los paneles dockeables que NO comparten el index.html principal
 * (SmoothAlign, SmoothGuides). Muestra el overlay (que bloquea toda la
 * interacción) hasta validar la key, sin tocar el motor del panel: main.js
 * carga aparte y queda cubierto por el overlay mientras no haya licencia.
 */
(function () {
  'use strict';

  /* Toast mínimo y propio para el feedback de la licencia */
  if (typeof window.smoothMotionToast !== 'function') {
    window.smoothMotionToast = function (msg, ms) {
      var el = document.getElementById('sm-lic-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'sm-lic-toast';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.className = 'show';
      clearTimeout(window.__smLicToastTimer);
      window.__smLicToastTimer = setTimeout(function () {
        el.className = '';
      }, ms || 2500);
    };
  }

  function gate() {
    if (window.SM_license && window.SM_license.waitForActivation) {
      window.SM_license.waitForActivation(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gate);
  } else {
    gate();
  }
})();
