/* ============================================================
   Type Tools — main.js
   UI + persistencia de ajustes + puente con After Effects
   ============================================================ */

'use strict';

const cs = new CSInterface();

/* ── Ajustes por defecto ── */
const DEFAULTS = {
  color: '#ffd400',       // relleno / resaltado
  strokeColor: '#000000', // trazo
  strokeWidth: 4,         // px
  hiPad: 6,               // relleno del resaltado (px)
  lineW: 3,               // grosor subrayado / tachado (px)
  twSpeed: 0.05,          // s por carácter (máquina de escribir)
  cntFrom: 0,
  cntTo: 100,
  cntDur: 3,              // s
  cntDec: 0,              // decimales
};

const SKEY = 'typeTools.settings.v1';
let settings = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(SKEY);
    if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) {}
  return Object.assign({}, DEFAULTS);
}
function saveSettings() {
  try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {}
}

/* ── Puente AE ── */
function jsx(fn, cb) {
  cs.evalScript(fn, res => { if (cb) cb(res); });
}

/* ── Toast ── */
let toastTimer = null;
function setStatus(msg, kind) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show ' + (kind || 'ok');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, kind === 'err' ? 2800 : 1700);
}

/* Convierte #rrggbb → [r,g,b] en 0..1 para ExtendScript */
function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

/* ── Ejecuta una operación en el motor ── */
function runOp(op, btn, extra) {
  const p = {
    op,
    color: hexToRgb01(settings.color),
    strokeColor: hexToRgb01(settings.strokeColor),
    strokeWidth: Number(settings.strokeWidth) || 0,
    hiPad: Number(settings.hiPad) || 0,
    lineW: Number(settings.lineW) || 1,
    twSpeed: Number(settings.twSpeed) || 0.05,
    cntFrom: Number(settings.cntFrom) || 0,
    cntTo: Number(settings.cntTo) || 0,
    cntDur: Number(settings.cntDur) || 1,
    cntDec: Math.max(0, Math.min(4, Number(settings.cntDec) || 0)),
  };
  if (extra) Object.assign(p, extra);
  const json = JSON.stringify(p);

  jsx(`tt_run(${JSON.stringify(json)})`, res => {
    res = (res || '').toString();
    if (res.indexOf('[DEV]') === 0) { setStatus('Previsualización (fuera de AE)', 'warn'); return; }
    if (res.indexOf('ERR:') === 0)  { setStatus(res.replace('ERR:', ''), 'err'); return; }
    if (res.indexOf('OK:') === 0)   { setStatus(res.replace('OK:', '') || 'Listo', 'ok'); return; }
    setStatus(res || 'Listo', 'ok');
  });

  if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
}

/* ── Wiring de la barra ── */
document.querySelectorAll('.tt-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const op = btn.dataset.op;
    if (op === 'settings') { openSettings(); return; }

    let extra = null;
    if (op === 'split') {
      // modificadores: Ctrl → letras · Shift → palabras · normal → líneas
      const mode = e.ctrlKey ? 'letters' : (e.shiftKey ? 'words' : 'lines');
      extra = { splitMode: mode };
    }
    runOp(op, btn, extra);
  });
});

/* ============================================================
   Modal de Ajustes
   ============================================================ */
const overlay = document.getElementById('overlay');
const fields = {
  color: 'setColor', strokeColor: 'setStrokeColor', strokeWidth: 'setStrokeWidth',
  hiPad: 'setHiPad', lineW: 'setLineW', twSpeed: 'setTwSpeed',
  cntFrom: 'setCntFrom', cntTo: 'setCntTo', cntDur: 'setCntDur', cntDec: 'setCntDec',
};

function fillForm(src) {
  for (const k in fields) {
    const el = document.getElementById(fields[k]);
    if (el) el.value = src[k];
  }
}
function readForm() {
  const out = {};
  for (const k in fields) {
    const el = document.getElementById(fields[k]);
    if (!el) continue;
    out[k] = (el.type === 'color') ? el.value : (parseFloat(el.value));
    if (el.type !== 'color' && isNaN(out[k])) out[k] = DEFAULTS[k];
  }
  return out;
}

function openSettings() { fillForm(settings); overlay.classList.remove('hidden'); }
function closeSettings() { overlay.classList.add('hidden'); }

document.getElementById('closeSettings').addEventListener('click', closeSettings);
overlay.addEventListener('click', e => { if (e.target === overlay) closeSettings(); });

document.getElementById('saveSettings').addEventListener('click', () => {
  settings = Object.assign({}, settings, readForm());
  saveSettings();
  closeSettings();
  setStatus('Ajustes guardados', 'ok');
});

document.getElementById('resetSettings').addEventListener('click', () => {
  fillForm(DEFAULTS);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeSettings();
});
