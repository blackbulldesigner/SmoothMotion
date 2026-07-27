/**
 * CSInterface.js — minimal Adobe CEP bridge
 * Handles evalScript communication with After Effects.
 * Falls back gracefully when running outside of CEP.
 */

(function () {
  'use strict';

  function CSInterface() {
    this._isInCEP = (typeof window.__adobe_cep__ !== 'undefined');
  }

  CSInterface.prototype.getHostEnvironment = function () {
    if (!this._isInCEP) return null;
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
  };

  CSInterface.prototype.evalScript = function (script, callback) {
    if (!this._isInCEP) {
      if (typeof callback === 'function') {
        callback('[DEV] CEP not available — running outside After Effects');
      }
      return;
    }
    window.__adobe_cep__.evalScript(script, callback || function () {});
  };

  CSInterface.prototype.addEventListener = function (type, listener) {
    if (!this._isInCEP) return;
    window.__adobe_cep__.addEventListener(type, listener);
  };

  CSInterface.prototype.dispatchEvent = function (event) {
    if (!this._isInCEP) return;
    if (typeof event !== 'string') event = JSON.stringify(event);
    window.__adobe_cep__.dispatchEvent(event);
  };

  CSInterface.prototype.getOSInformation = function () {
    if (!this._isInCEP) return 'Windows 10';
    return window.__adobe_cep__.getOSInformation();
  };

  CSInterface.prototype.closeExtension = function () {
    if (!this._isInCEP) return;
    window.__adobe_cep__.closeExtension();
  };

  window.CSInterface = CSInterface;
})();
