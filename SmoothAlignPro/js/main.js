/* ============================================================
   Smooth Align Pro — main.js
   UI + puente con After Effects
   ============================================================ */

'use strict';

const cs = new CSInterface();

const state = {
  ref: 'comp',          // comp | workarea | selection | keylayer
  edges: true,          // alinear a bordes
  includeHidden: false, // incluir capas ocultas
  lock: false,          // bloquear posición tras operar
  customSpace: 120,     // px
};

/* ── Puente AE ── */
function jsx(fn, cb) {
  cs.evalScript(fn, res => { if (cb) cb(res); });
}

let toastTimer = null;
function setStatus(msg, kind) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show ' + (kind || 'ok');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, kind === 'err' ? 2600 : 1600);
}

/* Construye los parámetros para el motor a partir del botón + estado */
function buildParams(btn) {
  const op = btn.dataset.op;
  const p = {
    op,
    ref: state.ref,
    edges: state.edges,
    includeHidden: state.includeHidden,
    lock: state.lock,
  };
  if (op === 'align') {
    p.mode = btn.dataset.mode;        // left | center-h | right | top | middle-v | bottom
  } else if (op === 'distribute') {
    p.axis = btn.dataset.axis;        // x | y
    if (btn.dataset.mode === 'gaps') p.mode = 'gaps';
    else if (btn.dataset.mode === 'edge') { p.mode = 'edge'; p.kind = btn.dataset.kind; }
    else { p.mode = 'key'; p.kind = 'center'; }
  } else if (op === 'space') {
    p.axis = btn.dataset.axis;        // x | y
    p.gap = state.customSpace;
  }
  return p;
}

/* Ejecuta una operación */
function runOp(btn) {
  const p = buildParams(btn);
  const json = JSON.stringify(p);

  jsx(`sa_run(${JSON.stringify(json)})`, res => {
    res = (res || '').toString();
    if (res.indexOf('[DEV]') === 0) { setStatus('Modo previsualización (fuera de AE)', 'warn'); return; }
    if (res.indexOf('ERR:') === 0) { setStatus(res.replace('ERR:', ''), 'err'); return; }
    const n = res.split(':')[1];
    const verb = p.op === 'align' ? 'Alineadas' : p.op === 'distribute' ? 'Distribuidas' : 'Espaciadas';
    setStatus(`${verb} ${n || 0} capa${n === '1' ? '' : 's'}`, 'ok');
  });

  // feedback visual
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 220);
}

/* ── Wiring de botones de operación ── */
document.querySelectorAll('.op-btn').forEach(btn => {
  btn.addEventListener('click', () => runOp(btn));
});

/* ── Referencia (radio) ── */
document.querySelectorAll('.ref-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.ref-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.ref = this.dataset.ref;
  });
});

/* ── Opciones ── */
document.getElementById('optEdges').addEventListener('change', function () { state.edges = this.checked; });
document.getElementById('optHidden').addEventListener('change', function () { state.includeHidden = this.checked; });
document.getElementById('optLock').addEventListener('change', function () { state.lock = this.checked; });

/* ── Espacio personalizado ── */
document.getElementById('customSpace').addEventListener('input', function () {
  const v = parseFloat(this.value);
  state.customSpace = isNaN(v) ? 0 : v;
});

