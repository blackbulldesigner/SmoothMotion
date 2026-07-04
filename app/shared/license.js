/**
 * SmoothMotion suite — motor de licencia (HWID + firma offline).
 * Activación COMPARTIDA entre paneles: además de localStorage, la licencia se
 * guarda/lee en un archivo común (~/.smoothmotion/license.json), de modo que
 * activar un panel activa automáticamente a los demás en el mismo equipo.
 */
(function () {
  'use strict';

  var KEY = 'SmoothMotion_License_v3';
  var MACHINE_KEY = 'SmoothMotion_Machine_v1';
  var PLUGIN_VERSION = '5.0.1';
  var LICENSE_SECRET = 'SmoothMotion-License-v3-2026';
  var HWID_SECRET = LICENSE_SECRET + '-hwid';
  var CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var DISCORD_URL = 'https://discord.gg/eV8xHpq2Np';
  var LICENSE_PATTERN = /^SM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  var HWID_PATTERN = /^[a-f0-9]{32}$/;

  var config = window.SM_LICENSE_CONFIG || {};
  var LICENSE_API_URLS = config.API_URLS || [];
  var ONLINE_TIMEOUT_MS = config.ONLINE_TIMEOUT_MS || 8000;

  var pendingCallback = null;
  var overlay = null;
  var crypto = null;
  var cachedMachineId = null;
  var sharedFile = null;

  try {
    crypto = require('crypto');
  } catch (e) {}

  function $(id) {
    return document.getElementById(id);
  }

  /* ── Licencia compartida entre paneles (archivo común en disco) ───────── */
  function sharedFilePath() {
    if (sharedFile !== null) {
      return sharedFile;
    }
    try {
      var os = require('os');
      var path = require('path');
      sharedFile = {
        dir: path.join(os.homedir(), '.smoothmotion'),
        file: path.join(os.homedir(), '.smoothmotion', 'license.json'),
      };
    } catch (e) {
      sharedFile = { dir: '', file: '' };
    }
    return sharedFile;
  }

  function readSharedLicense() {
    try {
      var fs = require('fs');
      var p = sharedFilePath();
      if (p.file && fs.existsSync(p.file)) {
        return JSON.parse(fs.readFileSync(p.file, 'utf8'));
      }
    } catch (e) {}
    return null;
  }

  function writeSharedLicense(data) {
    try {
      var fs = require('fs');
      var p = sharedFilePath();
      if (!p.file) {
        return;
      }
      if (p.dir && !fs.existsSync(p.dir)) {
        fs.mkdirSync(p.dir, { recursive: true });
      }
      fs.writeFileSync(p.file, JSON.stringify(data), 'utf8');
    } catch (e) {}
  }

  function removeSharedLicense() {
    try {
      var fs = require('fs');
      var p = sharedFilePath();
      if (p.file && fs.existsSync(p.file)) {
        fs.unlinkSync(p.file);
      }
    } catch (e) {}
  }

  function parseVersion(version) {
    return String(version || '0.0.0')
      .split('.')
      .map(function (part) {
        return parseInt(part, 10) || 0;
      });
  }

  function compareSemver(a, b) {
    var pa = parseVersion(a);
    var pb = parseVersion(b);
    var i;
    for (i = 0; i < 3; i += 1) {
      var diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }

  function normalizeLicense(value) {
    return String(value || '').trim().toUpperCase();
  }

  function sigCharsForMachine(rand6, machineId) {
    var digest = crypto
      .createHmac('sha256', HWID_SECRET)
      .update(rand6 + '|' + String(machineId).trim().toLowerCase())
      .digest('hex');
    var i0 = parseInt(digest.slice(0, 8), 16) % CHARSET.length;
    var i1 = parseInt(digest.slice(8, 16), 16) % CHARSET.length;
    return CHARSET[i0] + CHARSET[i1];
  }

  function verifyHardwareBoundLicense(license, machineId) {
    if (!crypto) {
      return false;
    }

    var normalized = normalizeLicense(license);
    var match = normalized.match(/^SM-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    var machine = String(machineId || '').trim().toLowerCase();

    if (!match || !HWID_PATTERN.test(machine)) {
      return false;
    }

    var part1 = match[1];
    var part2 = match[2];
    var rand6 = part1 + part2.slice(0, 2);
    var sig2 = part2.slice(2, 4);

    return sigCharsForMachine(rand6, machine) === sig2;
  }

  function getMachineId() {
    if (cachedMachineId) {
      return cachedMachineId;
    }

    try {
      var stored = localStorage.getItem(MACHINE_KEY);
      if (stored && HWID_PATTERN.test(stored)) {
        cachedMachineId = stored;
        return cachedMachineId;
      }
    } catch (e) {}

    if (!crypto) {
      return '';
    }

    var os = require('os');
    var raw = [
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.arch(),
      os.homedir(),
    ].join('|');

    cachedMachineId = crypto
      .createHmac('sha256', HWID_SECRET)
      .update(raw)
      .digest('hex')
      .slice(0, 32);

    try {
      localStorage.setItem(MACHINE_KEY, cachedMachineId);
    } catch (e2) {}

    return cachedMachineId;
  }

  function formatHwidDisplay(id) {
    if (!id || id.length < 32) {
      return '—';
    }
    return id.slice(0, 8) + '…' + id.slice(-8);
  }

  function updateHwidUI() {
    var el = $('lic-hwid');
    var full = getMachineId();
    if (el) {
      el.textContent = full || 'No disponible';
      el.title = full || '';
    }
  }

  function copyTextWithNode(text) {
    var os = require('os');
    var fs = require('fs');
    var path = require('path');
    var execSync = require('child_process').execSync;
    var platform = process.platform;

    if (platform === 'win32') {
      var ps1 = path.join(os.tmpdir(), 'sm_hwid_' + Date.now() + '.ps1');
      var safe = String(text).replace(/'/g, "''");
      fs.writeFileSync(ps1, [
        'Add-Type -AssemblyName System.Windows.Forms',
        "[System.Windows.Forms.Clipboard]::SetText('" + safe + "')"
      ].join('\r\n'), 'utf8');
      try {
        execSync(
          'powershell.exe -NoProfile -ExecutionPolicy Bypass -Sta -WindowStyle Hidden -File "' + ps1 + '"',
          { windowsHide: true, stdio: 'pipe', timeout: 15000 }
        );
      } finally {
        try { fs.unlinkSync(ps1); } catch (e) {}
      }
      return;
    }

    if (platform === 'darwin') {
      execSync('pbcopy', { input: String(text), timeout: 15000 });
      return;
    }

    throw new Error('unsupported_platform');
  }

  function copyHwidToClipboard(callback) {
    var id = getMachineId();
    if (!id) {
      callback(new Error('No se pudo obtener el ID de equipo.'));
      return;
    }

    function done(err) {
      callback(err || null);
    }

    try {
      if (typeof require === 'function' && typeof process !== 'undefined') {
        copyTextWithNode(id);
        done(null);
        return;
      }
    } catch (e1) {}

    try {
      var el = $('lic-hwid');
      if (el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        if (document.execCommand('copy')) {
          sel.removeAllRanges();
          done(null);
          return;
        }
        sel.removeAllRanges();
      }
    } catch (e2) {}

    try {
      var ta = document.createElement('textarea');
      ta.value = id;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.width = '2em';
      ta.style.height = '2em';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        done(null);
        return;
      }
    } catch (e3) {}

    done(new Error('No se pudo copiar. Selecciona el ID y pulsa Ctrl+C.'));
  }

  function loadStored() {
    /* 1) localStorage de este panel */
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}

    /* 2) licencia compartida: otro panel ya activado en este equipo */
    var shared = readSharedLicense();
    if (shared) {
      try {
        localStorage.setItem(KEY, JSON.stringify(shared));
      } catch (e2) {}
      return shared;
    }

    return null;
  }

  function saveStored(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
    /* Propaga la activación al resto de paneles */
    writeSharedLicense(data);
  }

  function clearStored() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    /* Desactiva también en el resto de paneles */
    removeSharedLicense();
  }

  function isVersionAllowed(maxVersion) {
    return compareSemver(PLUGIN_VERSION, maxVersion) <= 0;
  }

  function isStoredLicenseValid(stored) {
    if (!stored || !stored.license) {
      return false;
    }
    if (!LICENSE_PATTERN.test(stored.license)) {
      return false;
    }
    var machineId = getMachineId();
    if (!verifyHardwareBoundLicense(stored.license, machineId)) {
      return false;
    }
    if (stored.machine_id && stored.machine_id !== machineId) {
      return false;
    }
    return isVersionAllowed(stored.max_version || PLUGIN_VERSION);
  }

  function isActivated() {
    return isStoredLicenseValid(loadStored());
  }

  function getStoredLicense() {
    return loadStored();
  }

  function openDiscord() {
    try {
      if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
        window.cep.util.openURLInDefaultBrowser(DISCORD_URL);
        return;
      }
      if (window.__CSInterface__) {
        new CSInterface().openURLInDefaultBrowser(DISCORD_URL);
        return;
      }
    } catch (e) {}
    window.open(DISCORD_URL, '_blank');
  }

  function setError(message) {
    var errorEl = $('lic-error');
    if (!errorEl) {
      return;
    }
    if (!message) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function setLoading(isLoading) {
    var btn = $('lic-activate');
    var input = $('lic-input');
    if (btn) {
      btn.disabled = !!isLoading;
      btn.textContent = isLoading ? 'Validando…' : 'Activar licencia';
    }
    if (input) {
      input.disabled = !!isLoading;
    }
  }

  function dismissStartupOverlay() {
    var loading = document.getElementById('overlay');
    if (!loading) {
      return;
    }
    loading.style.opacity = '0';
    loading.style.display = 'none';
    setTimeout(function () {
      if (loading.parentNode) {
        loading.parentNode.removeChild(loading);
      }
    }, 450);
  }

  function hideOverlay() {
    overlay = overlay || $('lic-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
    document.body.classList.remove('lic-locked');
  }

  function showOverlay() {
    dismissStartupOverlay();
    overlay = overlay || $('lic-overlay');
    if (overlay) {
      overlay.classList.add('open');
    }
    document.body.classList.add('lic-locked');
    updateHwidUI();

    var stored = loadStored();
    var input = $('lic-input');
    if (input && stored && stored.license) {
      input.value = stored.license;
    }
  }

  function finishActivation() {
    hideOverlay();
    if (pendingCallback) {
      var cb = pendingCallback;
      pendingCallback = null;
      cb();
    }
  }

  function persistActivation(license, maxVersion) {
    var machineId = getMachineId();
    if (!machineId) {
      throw new Error('No se pudo identificar este equipo.');
    }
    if (!verifyHardwareBoundLicense(license, machineId)) {
      throw new Error(
        'Esta licencia no corresponde a este equipo. Reclámala en Discord con tu ID de equipo.'
      );
    }

    var mv = maxVersion || PLUGIN_VERSION;
    if (!isVersionAllowed(mv)) {
      throw new Error(
        'Tu licencia cubre hasta la v' + mv +
        '. Vuelve a reclamar en Discord con membresía activa.'
      );
    }

    var record = {
      license: license,
      max_version: mv,
      machine_id: machineId,
      device_bound: true,
      activated_at: new Date().toISOString(),
      plugin_version: PLUGIN_VERSION,
      validation_mode: 'hwid_offline',
    };

    saveStored(record);
    return { license: license, max_version: mv, valid: true };
  }

  function validateLicense(license, callback) {
    if (!LICENSE_PATTERN.test(license)) {
      callback(new Error('Introduce una licencia válida con formato SM-XXXX-XXXX.'));
      return;
    }

    var machineId = getMachineId();
    if (!machineId) {
      callback(new Error('No se pudo identificar este equipo. Reinicia After Effects.'));
      return;
    }

    if (!verifyHardwareBoundLicense(license, machineId)) {
      callback(new Error(
        'Licencia inválida para este equipo. Copia tu ID de equipo, reclámala en Discord y usa la key que te envíen.'
      ));
      return;
    }

    try {
      callback(null, persistActivation(license, PLUGIN_VERSION));
    } catch (err) {
      callback(err);
    }
  }

  function syncOnlineInBackground() {
    if (!LICENSE_API_URLS.length) {
      return;
    }
    /* Reservado para VPS futuro */
  }

  function activateLicense(callback) {
    var input = $('lic-input');
    var license = normalizeLicense(input ? input.value : '');

    setError('');
    setLoading(true);

    validateLicense(license, function (err, data) {
      setLoading(false);
      if (err) {
        callback(err);
        return;
      }
      callback(null, data);
    });
  }

  function bindOverlayEvents() {
    var activateBtn = $('lic-activate');
    var discordBtn = $('lic-discord');
    var copyBtn = $('lic-copy-hwid');
    var input = $('lic-input');

    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = '1';
      copyBtn.addEventListener('click', function () {
        copyHwidToClipboard(function (err) {
          if (typeof smoothMotionToast === 'function') {
            if (err) {
              smoothMotionToast(err.message || 'No se pudo copiar el ID.', 4500);
              var hw = $('lic-hwid');
              if (hw) {
                try {
                  var range = document.createRange();
                  range.selectNodeContents(hw);
                  var sel = window.getSelection();
                  sel.removeAllRanges();
                  sel.addRange(range);
                } catch (e) {}
              }
            } else {
              smoothMotionToast('ID de equipo copiado.', 2500);
            }
          }
        });
      });
    }

    if (activateBtn && !activateBtn.dataset.bound) {
      activateBtn.dataset.bound = '1';
      activateBtn.addEventListener('click', function () {
        activateLicense(function (err) {
          if (err) {
            setError(err.message);
            return;
          }
          if (typeof smoothMotionToast === 'function') {
            smoothMotionToast('Licencia activada en este equipo.', 3000);
          }
          finishActivation();
        });
      });
    }

    if (discordBtn && !discordBtn.dataset.bound) {
      discordBtn.dataset.bound = '1';
      discordBtn.addEventListener('click', openDiscord);
    }

    if (input && !input.dataset.bound) {
      input.dataset.bound = '1';
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && activateBtn) {
          activateBtn.click();
        }
      });
      input.addEventListener('input', function () {
        input.value = normalizeLicense(input.value);
      });
    }
  }

  function waitForActivation(callback) {
    bindOverlayEvents();
    dismissStartupOverlay();

    if (isActivated()) {
      hideOverlay();
      syncOnlineInBackground();
      callback();
      return;
    }

    pendingCallback = callback;
    showOverlay();
  }

  function revalidateStored(callback) {
    var stored = loadStored();
    if (!stored || !stored.license) {
      callback(new Error('No hay licencia guardada.'));
      return;
    }
    validateLicense(stored.license, callback);
  }

  function deactivate() {
    clearStored();
    showOverlay();
  }

  window.SM_license = {
    PLUGIN_VERSION: PLUGIN_VERSION,
    isActivated: isActivated,
    getStoredLicense: getStoredLicense,
    getMachineId: getMachineId,
    formatHwidDisplay: formatHwidDisplay,
    verifyHardwareBoundLicense: verifyHardwareBoundLicense,
    waitForActivation: waitForActivation,
    activateLicense: activateLicense,
    revalidateStored: revalidateStored,
    deactivate: deactivate,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    openDiscord: openDiscord,
    isVersionAllowed: isVersionAllowed,
    syncOnlineInBackground: syncOnlineInBackground,
  };
})();
