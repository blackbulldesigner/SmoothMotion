/* ============================================================
   SmoothGuides — main.js
   UI + canvas preview + puente real con After Effects
   ============================================================ */

'use strict';

const cs = new CSInterface();
const IN_AE = (typeof window.__adobe_cep__ !== 'undefined');

/* ── Estado ─────────────────────────────────────────────── */
const state = {
  compW: 1080,
  compH: 1920,
  compName: '',
  guideColor: '#3b82f6',
  lineStyle: 'solid',
  lineWidth: 1,
  lineOpacity: 0.7,
  showGuides: true,
  realtimePreview: true,
  createGuideLayer: true,    // capa-guía de color (se puede ocultar con el ojito)
  createNativeGuides: true,  // guías nativas de AE (para snapping); el ojito también las alterna
  guidesVisible: true,       // estado actual del ojito (mostrar/ocultar todas las guías)
  hasApplied: false,         // si ya se aplicaron guías en la comp
  // Por defecto, mínimo: solo Reels + Área de texto (preview limpio)
  guides: { center: false, thirds: false, grid: false, diagonals: false, crosshair: false },
  gridCols: 6,
  gridRows: 0,   // 0 = automático (proporcional a la comp)
  safeZones: { action: false, title: false, social: false, reels: true },
  safeDefs: { action: 0.90, title: 0.80, social: 0.88, reels: 0.92 },
  customGuides: [
    { id: 'ta1', type: 'box', w: 74, h: 31, cx: 50, cy: 50, unit: 'pct', name: 'Área de Texto', visible: true },
  ],
  customIdCounter: 10,
};

let modalEditId = null;

/* ── Iconos SVG (módulo que faltaba) ────────────────────── */
const SG_ICONS = {
  trash: (w = 12, h = 12) => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  file:  (w = 12, h = 12) => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  star:  (w = 12, h = 12) => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};
const SG_PRESET_ICONS = {};   // nombres de preset → clave de icono (vacío = usa 'star')

/* ── Guías personalizadas: px / % ───────────────────────── */
function isPctUnit(g) { return g.unit === 'pct' || g.unit === '%'; }

function normalizeGuide(g) {
  if (!g.unit) g.unit = 'px';
  if (g.unit === '%') g.unit = 'pct';
  return g;
}

function resolveV(g, W) {
  return isPctUnit(g) ? (g.value / 100) * W : g.value;
}

function resolveH(g, H) {
  return isPctUnit(g) ? (g.value / 100) * H : g.value;
}

function resolveBox(g, W, H) {
  const pct = isPctUnit(g);
  return {
    w:  pct ? (g.w / 100) * W : g.w,
    h:  pct ? (g.h / 100) * H : g.h,
    cx: g.cx != null ? (pct ? (g.cx / 100) * W : g.cx) : W / 2,
    cy: g.cy != null ? (pct ? (g.cy / 100) * H : g.cy) : H / 2,
  };
}

function guideToSpec(g, W, H) {
  if (g.type === 'vertical')   return { o: 'v', px: Math.round(resolveV(g, W)) };
  if (g.type === 'horizontal') return { o: 'h', px: Math.round(resolveH(g, H)) };
  const b = resolveBox(g, W, H);
  return { o: 'box', w: Math.round(b.w), h: Math.round(b.h), cx: Math.round(b.cx), cy: Math.round(b.cy) };
}

function formatGuidePos(g) {
  const u = isPctUnit(g) ? '%' : 'px';
  if (g.type === 'vertical')   return `X: ${g.value}${u}`;
  if (g.type === 'horizontal') return `Y: ${g.value}${u}`;
  const cx = g.cx != null ? g.cx : (isPctUnit(g) ? 50 : Math.round(state.compW / 2));
  const cy = g.cy != null ? g.cy : (isPctUnit(g) ? 50 : Math.round(state.compH / 2));
  if (isPctUnit(g)) return `Marco ${g.w}%×${g.h}% · centro ${cx}%/${cy}%`;
  return `Marco ${g.w}×${g.h} px`;
}

function presetIconHtml(name) {
  const key = SG_PRESET_ICONS[name] || 'star';
  return `<div class="pc-icon">${SG_ICONS[key](22, 22)}</div>`;
}

/* ── DOM ─────────────────────────────────────────────────── */
const canvas      = document.getElementById('previewCanvas');
const ctx         = canvas.getContext('2d');
const previewWrap = document.getElementById('previewWrap');
const statusText  = document.getElementById('statusText');
const statusBar   = document.getElementById('statusBar');
const customList  = document.getElementById('customList');
const modalEl     = document.getElementById('modalCustom');

/* ============================================================
   PUENTE AE
   ============================================================ */
function jsx(fn, cb) {
  cs.evalScript(fn, function (res) {
    if (cb) cb(res);
  });
}

/* Llama al motor y reporta OK/ERR al status */
function runEngine(call, okMsg) {
  jsx(call, function (res) {
    res = (res || '').toString();
    if (res.indexOf('ERR:') === 0) {
      setStatus(res.replace('ERR:', 'Error: '), false);
    } else if (res.indexOf('OK') === 0) {
      const n = res.split(':')[1];
      setStatus(okMsg + (n ? ` (${n})` : ''), true);
    } else if (res.indexOf('[DEV]') === 0) {
      setStatus('Modo previsualización (fuera de AE)', false);
    } else {
      setStatus(okMsg, true);
    }
  });
}

/* Construye el spec que entiende el motor JSX */
function buildSpec(forLayer) {
  const safeList = [];
  const safeColored = [];
  const szColors = { action: '#3b82f6', title: '#22c55e', social: '#8b5cf6', reels: '#f97316' };
  Object.keys(state.safeZones).forEach(k => {
    if (state.safeZones[k]) {
      safeList.push(state.safeDefs[k]);
      safeColored.push({ pct: state.safeDefs[k], color: szColors[k] });
    }
  });

  const W = state.compW, H = state.compH;
  const custom = state.customGuides.filter(g => g.visible).map(g => guideToSpec(g, W, H));

  const base = {
    clearFirst: true,
    color: state.guideColor,
    opacity: state.lineOpacity,
    center:    state.guides.center,
    thirds:    state.guides.thirds,
    crosshair: state.guides.crosshair,
    diagonals: state.guides.diagonals,
    grid:      { on: state.guides.grid, cols: state.gridCols, rows: state.gridRows },
    custom:    custom,
  };

  base.safe = forLayer ? safeColored : safeList;
  return base;
}

/* ============================================================
   ACCIONES PRINCIPALES
   ============================================================ */
function applyGuides(label) {
  if (!state.showGuides) { setStatus('Activa "Mostrar guías" primero', false); return; }
  if (!state.createGuideLayer && !state.createNativeGuides) {
    setStatus('Activa la capa guía o las guías nativas (Ajustes)', false);
    return;
  }

  // Guías nativas de AE (para snapping)
  if (state.createNativeGuides) {
    const spec = JSON.stringify(buildSpec(false));
    runEngine(`sg_apply(${JSON.stringify(spec)})`, label || 'Guías aplicadas');
  }

  // Capa guía de color (ocultable con el ojito)
  if (state.createGuideLayer) {
    const layerSpec = JSON.stringify(buildSpec(true));
    jsx(`sg_applyGuideLayer(${JSON.stringify(layerSpec)})`, res => {
      res = (res || '').toString();
      if (res.indexOf('ERR:') === 0) { setStatus(res.replace('ERR:', 'Error: '), false); return; }
      if (!state.createNativeGuides) setStatus(label || 'Capa guía aplicada', true);
    });
  }

  // Recién aplicadas → visibles
  state.hasApplied = true;
  state.guidesVisible = true;
  state.showGuides = true;
  reflectShowGuidesUI(true);
  refreshCompInfo();
}

function removeGuides() {
  runEngine('sg_removeGuides()', 'Guías eliminadas');
  jsx('sg_removeGuideLayer()', () => { state.hasApplied = false; });
}

/* ── ÚNICO control de visibilidad: "Mostrar guías" ──────────
   Controla la preview Y (si ya se aplicaron) las guías en AE:
   la capa de color + las guías nativas, todo junto. */
function reflectShowGuidesUI(on) {
  const eye = document.getElementById('eyeMain');
  const tog = document.getElementById('togShowGuides');
  if (eye) eye.classList.toggle('on', on);
  if (tog) tog.classList.toggle('on', on);
}

function setShowGuides(on) {
  state.showGuides = on;
  state.guidesVisible = on;
  reflectShowGuidesUI(on);
  drawPreview();
  // Reflejar en After Effects si ya hay guías aplicadas
  if (state.hasApplied) {
    const spec = state.createNativeGuides ? JSON.stringify(buildSpec(false)) : '';
    jsx(`sg_setGuidesVisible(${!!on}, ${JSON.stringify(spec)})`, res => {
      res = (res || '').toString();
      if (res.indexOf('ERR:') === 0) { setStatus(res.replace('ERR:', 'Error: '), false); return; }
      if (res.indexOf('[DEV]') === 0) return;
      setStatus(on ? 'Guías visibles' : 'Guías ocultas', true);
    });
  }
}

/* Sincroniza el toggle "Mostrar guías" con el estado real en AE */
function syncLayerToggle() {
  jsx('sg_getGuideLayerState()', res => {
    res = (res || '').toString();
    if (res.indexOf('[DEV]') === 0) return;
    if (res.indexOf('none') >= 0) { state.hasApplied = false; return; }
    state.hasApplied = true;
    const hidden = res.indexOf('hidden') >= 0;
    state.showGuides = !hidden;
    state.guidesVisible = !hidden;
    reflectShowGuidesUI(!hidden);
  });
}

/* ============================================================
   COMP ACTIVA — lectura automática
   ============================================================ */
function refreshCompInfo() {
  jsx('sg_getActiveCompInfo()', function (res) {
    if (!res || res.indexOf('[DEV]') === 0) {
      updateCompLabel('—  (modo preview)');
      return;
    }
    let info;
    try { info = JSON.parse(res); } catch { return; }
    if (info.ok) {
      state.compW = info.width;
      state.compH = info.height;
      state.compName = info.name;
      document.getElementById('previewDims').textContent = `${info.width}x${info.height}`;
      document.getElementById('previewRatio').textContent = ratioLabel(info.width, info.height);
      updateCompLabel(`${info.name} · ${info.width}×${info.height}`);
      syncRatioButtons(info.width, info.height);
      drawPreview();
    } else {
      updateCompLabel('Sin composición activa');
    }
  });
  syncLayerToggle();
}

function updateCompLabel(txt) {
  const el = document.getElementById('activeCompName');
  if (!el) return;
  el.textContent = txt;
  const hasComp = txt.indexOf('Sin composición') === -1 && txt.indexOf('modo preview') === -1 && txt.indexOf('Leyendo') === -1;
  el.classList.toggle('visible', hasComp);
}

function ratioLabel(w, h) {
  const r = w / h;
  const known = { '0.5625': '9:16', '0.8': '4:5', '1': '1:1', '1.7778': '16:9', '2.3704': '21:9' };
  const key = r.toFixed(4);
  for (const k in known) if (Math.abs(parseFloat(k) - r) < 0.01) return known[k];
  return `${w}:${h}`;
}

function syncRatioButtons(w, h) {
  let matched = false;
  document.querySelectorAll('.qbtn[data-w]').forEach(b => {
    const on = (parseInt(b.dataset.w) === w && parseInt(b.dataset.h) === h);
    b.classList.toggle('active', on);
    if (on) matched = true;
  });
  if (!matched) document.querySelectorAll('.qbtn').forEach(b => b.classList.remove('active'));
}

/* ============================================================
   TABS
   ============================================================ */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

/* ============================================================
   TOGGLES
   ============================================================ */
document.addEventListener('click', e => {
  const tog = e.target.closest('.toggle');
  if (!tog) return;
  tog.classList.toggle('on');
  const key = tog.dataset.toggle;
  if (!key) return;
  const on = tog.classList.contains('on');

  switch (key) {
    case 'showGuides':  setShowGuides(on); return;
    case 'center':      state.guides.center = on; break;
    case 'thirds':      state.guides.thirds = on; break;
    case 'grid':        state.guides.grid = on; break;
    case 'diagonals':   state.guides.diagonals = on; break;
    case 'crosshair':   state.guides.crosshair = on; break;
    case 'sz-action':   state.safeZones.action = on; break;
    case 'sz-title':    state.safeZones.title = on; break;
    case 'sz-social':   state.safeZones.social = on; break;
    case 'sz-reels':    state.safeZones.reels = on; break;
    case 'realtime':     state.realtimePreview = on; break;
    case 'hudOverlay':   state.createGuideLayer = on; break;
    case 'nativeGuides': state.createNativeGuides = on; break;
  }
  if (state.realtimePreview) drawPreview();
});

document.getElementById('eyeMain').addEventListener('click', function () {
  setShowGuides(!state.showGuides);
});

document.querySelectorAll('.eye-sm[data-eye]').forEach(btn => {
  btn.addEventListener('click', function () {
    this.classList.toggle('on');
    const g = this.dataset.eye;
    if (g in state.guides) { state.guides[g] = this.classList.contains('on'); drawPreview(); }
  });
});

/* ============================================================
   FORMATOS RÁPIDOS
   ============================================================ */
document.querySelectorAll('.qbtn[data-w]').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.qbtn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.compW = parseInt(this.dataset.w);
    state.compH = parseInt(this.dataset.h);
    document.getElementById('previewDims').textContent = `${state.compW}x${state.compH}`;
    document.getElementById('previewRatio').textContent = this.dataset.label;
    drawPreview();
  });
});

document.getElementById('btnCustomRatio').addEventListener('click', () => {
  const w = prompt('Ancho (px):', state.compW);
  if (!w) return;
  const h = prompt('Alto (px):', state.compH);
  if (!h) return;
  state.compW = parseInt(w) || 1920;
  state.compH = parseInt(h) || 1080;
  document.getElementById('previewDims').textContent = `${state.compW}x${state.compH}`;
  document.getElementById('previewRatio').textContent = 'Custom';
  document.querySelectorAll('.qbtn').forEach(b => b.classList.remove('active'));
  document.getElementById('btnCustomRatio').classList.add('active');
  drawPreview();
});

/* Crear comp con el formato seleccionado */
const btnCreateComp = document.getElementById('btnCreateComp');
if (btnCreateComp) btnCreateComp.addEventListener('click', () => {
  runEngine(`sg_createComp(${state.compW}, ${state.compH}, ${JSON.stringify('SmoothGuides ' + state.compW + 'x' + state.compH)})`, 'Composición creada');
  setTimeout(refreshCompInfo, 400);
});

/* ============================================================
   OPCIONES DE VISUALIZACIÓN
   ============================================================ */
document.getElementById('guideColor').addEventListener('input', function () {
  state.guideColor = this.value;
  document.getElementById('colorHex').textContent = this.value;
  if (state.realtimePreview) drawPreview();
});

document.querySelectorAll('.color-pick').forEach(pick => {
  pick.addEventListener('input', function () {
    const hex = this.nextElementSibling;
    if (hex && hex.classList.contains('color-hex')) hex.textContent = this.value;
  });
});

document.getElementById('lineStyle').addEventListener('change', function () {
  state.lineStyle = this.value; if (state.realtimePreview) drawPreview();
});
document.getElementById('lineWidth').addEventListener('change', function () {
  state.lineWidth = parseFloat(this.value); if (state.realtimePreview) drawPreview();
});
document.getElementById('lineOpacity').addEventListener('change', function () {
  state.lineOpacity = parseFloat(this.value); if (state.realtimePreview) drawPreview();
});

/* ============================================================
   TOOLBAR PREVIEW
   ============================================================ */
document.querySelectorAll('.t-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', function () {
    this.classList.toggle('active');
    drawPreview();
  });
});

const btnFs = document.getElementById('btnFullscreen');
if (btnFs) btnFs.addEventListener('click', () => {
  if (previewWrap.requestFullscreen) previewWrap.requestFullscreen();
});

/* ============================================================
   BOTONES DE ACCIÓN
   ============================================================ */
document.getElementById('btnApply').addEventListener('click', () => applyGuides());
document.getElementById('btnRemove').addEventListener('click', removeGuides);

document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('¿Limpiar todas las guías de la comp y reiniciar el panel?')) return;
  removeGuides();
  state.customGuides = [];
  renderCustomList();
  drawPreview();
});

document.getElementById('btnLock').addEventListener('click', () =>
  runEngine('sg_lockGuides()', 'Guías bloqueadas'));
document.getElementById('btnUnlock').addEventListener('click', () =>
  runEngine('sg_unlockGuides()', 'Guías desbloqueadas'));

const btnRefresh = document.getElementById('btnRefresh');
if (btnRefresh) btnRefresh.addEventListener('click', refreshCompInfo);

const btnSnap = document.getElementById('btnSnapCenter');
if (btnSnap) btnSnap.addEventListener('click', () =>
  runEngine('sg_centerSelectedLayers()', 'Capas centradas'));

/* ============================================================
   GUÍAS PERSONALIZADAS
   ============================================================ */
document.getElementById('btnAddCustom').addEventListener('click', openModal);

document.addEventListener('click', e => {
  const delBtn = e.target.closest('.cg-btn.cg-del');
  if (delBtn) {
    const item = delBtn.closest('.cg-item');
    const id = item && item.dataset.id;
    state.customGuides = state.customGuides.filter(g => g.id !== id);
    if (item) item.remove();
    drawPreview();
    return;
  }
  const editBtn = e.target.closest('.cg-btn.cg-edit');
  if (editBtn) {
    const item = editBtn.closest('.cg-item');
    const g = state.customGuides.find(x => x.id === item.dataset.id);
    if (g) openModal(g);
    return;
  }
  const eyeBtn = e.target.closest('.cg-item .cg-btn[title="Mostrar/ocultar"]');
  if (eyeBtn) {
    const item = eyeBtn.closest('.cg-item');
    const g = state.customGuides.find(x => x.id === item.dataset.id);
    if (g) { g.visible = !g.visible; eyeBtn.classList.toggle('on', g.visible); drawPreview(); }
  }
});

function syncUnitInputs() {
  const unit = document.getElementById('customUnit').value;
  const pct = unit === 'pct';
  const max = pct ? 100 : 99999;
  const step = pct ? 0.1 : 1;
  ['customX', 'customY', 'boxW', 'boxH', 'boxCx', 'boxCy'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.max = max;
    el.step = step;
    el.min = pct ? 0 : (id === 'boxW' || id === 'boxH' ? 1 : 0);
  });
  const type = document.getElementById('customType').value;
  const lblX = document.getElementById('labelX');
  const lblY = document.getElementById('labelY');
  if (lblX) lblX.textContent = pct ? 'Posición X (%)' : 'Posición X (px)';
  if (lblY) lblY.textContent = pct ? 'Posición Y (%)' : 'Posición Y (px)';
  if (type === 'box' && pct && parseFloat(document.getElementById('boxW').value) > 100) {
    document.getElementById('boxW').value = 74;
    document.getElementById('boxH').value = 31;
  }
}

function openModal(editGuide) {
  modalEditId = editGuide ? editGuide.id : null;
  document.getElementById('modalCustomTitle').textContent = editGuide ? 'Editar Guía' : 'Nueva Guía Personalizada';
  document.getElementById('modalOk').textContent = editGuide ? 'Guardar' : 'Agregar';
  document.getElementById('customName').value = editGuide ? (editGuide.name || '') : '';

  if (editGuide) {
    document.getElementById('customType').value = editGuide.type;
    document.getElementById('customUnit').value = isPctUnit(editGuide) ? 'pct' : 'px';
    if (editGuide.type === 'vertical') {
      document.getElementById('customX').value = editGuide.value;
    } else if (editGuide.type === 'horizontal') {
      document.getElementById('customY').value = editGuide.value;
    } else {
      document.getElementById('boxW').value = editGuide.w;
      document.getElementById('boxH').value = editGuide.h;
      document.getElementById('boxCx').value = editGuide.cx != null ? editGuide.cx : 50;
      document.getElementById('boxCy').value = editGuide.cy != null ? editGuide.cy : 50;
    }
  } else {
    document.getElementById('customType').value = 'vertical';
    document.getElementById('customUnit').value = 'pct';
    document.getElementById('customX').value = 50;
    document.getElementById('customY').value = 33;
    document.getElementById('boxW').value = 74;
    document.getElementById('boxH').value = 31;
    document.getElementById('boxCx').value = 50;
    document.getElementById('boxCy').value = 50;
  }

  document.getElementById('customType').dispatchEvent(new Event('change'));
  syncUnitInputs();
  modalEl.style.display = 'flex';
}
function closeModal() {
  modalEl.style.display = 'none';
  modalEditId = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalOk').addEventListener('click', saveCustomGuide);
document.getElementById('modalCustom').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('customType').addEventListener('change', function () {
  const v = this.value;
  document.getElementById('rowX').style.display         = v === 'vertical'   ? '' : 'none';
  document.getElementById('rowY').style.display         = v === 'horizontal' ? '' : 'none';
  document.getElementById('rowBox').style.display       = v === 'box'        ? '' : 'none';
  document.getElementById('rowBoxCenter').style.display = v === 'box'        ? '' : 'none';
});

document.getElementById('customUnit').addEventListener('change', syncUnitInputs);

function readGuideFromModal() {
  const type = document.getElementById('customType').value;
  const unit = document.getElementById('customUnit').value;
  const name = document.getElementById('customName').value.trim();
  const num = id => parseFloat(document.getElementById(id).value) || 0;

  if (type === 'vertical') {
    return { type, unit, value: num('customX'), name: name || 'Guía Vertical', visible: true };
  }
  if (type === 'horizontal') {
    return { type, unit, value: num('customY'), name: name || 'Guía Horizontal', visible: true };
  }
  return {
    type, unit,
    w: num('boxW'), h: num('boxH'),
    cx: num('boxCx'), cy: num('boxCy'),
    name: name || 'Área de Texto', visible: true,
  };
}

function saveCustomGuide() {
  const data = readGuideFromModal();
  if (modalEditId) {
    const g = state.customGuides.find(x => x.id === modalEditId);
    if (g) Object.assign(g, data, { id: modalEditId, visible: g.visible });
  } else {
    state.customGuides.push({ id: 'cg_' + (++state.customIdCounter), ...data });
  }
  renderCustomList();
  closeModal();
  drawPreview();
}

function renderCustomList() {
  customList.innerHTML = '';
  state.customGuides.forEach(g => {
    const pos = formatGuidePos(g);
    const barClass = g.type === 'vertical' ? 'cg-v' : g.type === 'horizontal' ? 'cg-h' : 'cg-box';
    const sEdit = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const sEye  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const sDel  = SG_ICONS.trash(11, 11);
    const el = document.createElement('div');
    el.className = 'cg-item';
    el.dataset.id = g.id;
    el.innerHTML = `
      <span class="cg-bar ${barClass}"></span>
      <div class="cg-info"><span class="cg-name">${g.name}</span><span class="cg-pos">${pos}</span></div>
      <div class="cg-btns">
        <button class="cg-btn cg-edit" title="Editar">${sEdit}</button>
        <button class="cg-btn ${g.visible ? 'on' : ''}" title="Mostrar/ocultar">${sEye}</button>
        <button class="cg-btn cg-del" title="Eliminar">${sDel}</button>
      </div>`;
    customList.appendChild(el);
  });
}

/* ============================================================
   REGLAS (tab)
   ============================================================ */
document.querySelectorAll('.rule-card').forEach(card => {
  card.addEventListener('click', function () {
    this.classList.toggle('active');
    const rule = this.dataset.rule;
    if (rule in state.guides) {
      state.guides[rule] = this.classList.contains('active');
      const tog = document.querySelector(`.toggle[data-toggle="${rule}"]`);
      if (tog) tog.classList.toggle('on', state.guides[rule]);
    }
    drawPreview();
  });
});

/* ============================================================
   PLATAFORMAS (Safe Zones tab)
   ============================================================ */
document.querySelectorAll('.btn-pf-apply').forEach(btn => {
  btn.addEventListener('click', function () {
    const card = this.closest('.platform-card');
    const name = card.querySelector('.pf-name').textContent;
    const map = { TikTok: 0.88, Instagram: 0.91, YouTube: 0.92, Broadcast: 0.90 };
    const pct = map[name] || 0.90;
    const spec = JSON.stringify({ clearFirst: false, safe: [pct], color: state.guideColor });
    runEngine(`sg_apply(${JSON.stringify(spec)})`, `Safe zone ${name} aplicada`);
    jsx(`sg_applyGuideLayer(${JSON.stringify(JSON.stringify({ safe: [{ pct, color: '#3b82f6' }], color: state.guideColor, opacity: 0.8 }))})`);
  });
});

/* ============================================================
   PRESETS
   ============================================================ */
/* Cada preset es autocontenido y simétrico.
   - ratio: solo para la preview cuando no hay comp activa (el motor usa la comp real)
   - guides/safe: qué activar
   - grid: divisiones (cols/rows). rows 0 = automático
   - custom: guías en PORCENTAJE → siempre centradas/simétricas en cualquier comp
       v/h:  { o:'v'|'h', pct:0..1 }
       box:  { o:'box', wPct, hPct, cxPct(=0.5), cyPct(=0.5) } */
const PRESETS = {
  'Reel Editor': {
    ratio: [1080, 1920],
    guides: { center: 1, thirds: 1, crosshair: 1 },
    safe:   { action: 1, social: 1 },
  },
  'TikTok Captions': {
    ratio: [1080, 1920],
    guides: { center: 1, thirds: 1 },
    safe:   { title: 1, social: 1 },
    custom: [{ o: 'box', wPct: 0.86, hPct: 0.16, cxPct: 0.5, cyPct: 0.74, name: 'Caption-safe' }],
  },
  'Shorts Clean': {
    ratio: [1080, 1920],
    guides: { center: 1 },
    safe:   { reels: 1 },
  },
  'Cinematic': {
    ratio: [1920, 1080],
    guides: { thirds: 1 },
    safe:   { title: 1 },
    custom: [{ o: 'box', wPct: 1.0, hPct: 0.744, cxPct: 0.5, cyPct: 0.5, name: 'Cinemascope 2.39:1' }],
  },
  'Thumbnail': {
    ratio: [1920, 1080],
    guides: { thirds: 1, center: 1 },
    safe:   { title: 1 },
  },
  'Motion Design': {
    ratio: [1080, 1080],
    guides: { grid: 1, center: 1, thirds: 1 },
    safe:   {},
    grid:   { cols: 6, rows: 6 },
  },
};

/* Convierte una guía de preset (en %) a guía de estado (en px) usando la comp real */
function buildPresetGuide(c, W, H, idx) {
  const id = 'pst_' + idx + '_' + Date.now();
  if (c.o === 'v') {
    if (c.pct != null) return { id, type: 'vertical', value: +(c.pct * 100).toFixed(2), unit: 'pct', name: c.name || 'Guía Vertical', visible: true };
    return { id, type: 'vertical', value: c.px != null ? c.px : Math.round(c.pct * W), unit: 'px', name: c.name || 'Guía Vertical', visible: true };
  }
  if (c.o === 'h') {
    if (c.pct != null) return { id, type: 'horizontal', value: +(c.pct * 100).toFixed(2), unit: 'pct', name: c.name || 'Guía Horizontal', visible: true };
    return { id, type: 'horizontal', value: c.px != null ? c.px : Math.round(c.pct * H), unit: 'px', name: c.name || 'Guía Horizontal', visible: true };
  }
  if (c.wPct != null || c.hPct != null) {
    return {
      id, type: 'box', unit: 'pct',
      w:  +((c.wPct  != null ? c.wPct  * 100 : 80)).toFixed(2),
      h:  +((c.hPct  != null ? c.hPct  * 100 : 60)).toFixed(2),
      cx: +((c.cxPct != null ? c.cxPct * 100 : 50)).toFixed(2),
      cy: +((c.cyPct != null ? c.cyPct * 100 : 50)).toFixed(2),
      name: c.name || 'Área de Texto', visible: true,
    };
  }
  return {
    id, type: 'box', unit: 'px',
    w: c.w || 800, h: c.h || 600,
    cx: c.cx != null ? c.cx : W / 2,
    cy: c.cy != null ? c.cy : H / 2,
    name: c.name || 'Área de Texto', visible: true,
  };
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) { applyGuides(); return; }

  // Leer las dimensiones reales de la comp activa para que todo salga simétrico
  jsx('sg_getActiveCompInfo()', res => {
    let W = state.compW, H = state.compH, nm = '';
    try { const i = JSON.parse(res); if (i && i.ok) { W = i.width; H = i.height; nm = i.name; } } catch {}
    if (!nm && p.ratio) { W = p.ratio[0]; H = p.ratio[1]; }   // sin comp → usar el ratio del preset solo para la preview
    state.compW = W; state.compH = H; if (nm) state.compName = nm;

    // Reset limpio de TODA la configuración
    Object.keys(state.guides).forEach(k => state.guides[k] = !!(p.guides && p.guides[k]));
    Object.keys(state.safeZones).forEach(k => state.safeZones[k] = !!(p.safe && p.safe[k]));
    state.gridCols = (p.grid && p.grid.cols) || 6;
    state.gridRows = (p.grid && p.grid.rows) || 0;
    // Reemplaza las guías custom → elimina las asimétricas por defecto
    state.customGuides = (p.custom || []).map((c, idx) => buildPresetGuide(c, W, H, idx));

    syncUIFromState();
    syncRatioButtons(W, H);
    document.getElementById('previewDims').textContent = `${W}x${H}`;
    document.getElementById('previewRatio').textContent = ratioLabel(W, H);
    updateCompLabel(nm ? `${nm} · ${W}×${H}` : `${ratioLabel(W, H)} · ${W}×${H}`);
    drawPreview();

    applyGuides(`Preset "${name}" aplicado`);
  });
}

document.querySelectorAll('.btn-pc-apply').forEach(btn => {
  btn.addEventListener('click', function () {
    const name = this.closest('.preset-card').querySelector('.pc-name').textContent;
    applyPreset(name);
  });
});

document.querySelectorAll('.btn-pc-del').forEach(btn => {
  btn.addEventListener('click', function () { this.closest('.preset-card').remove(); });
});

/* Captura las guías custom actuales como porcentajes (simétricas y reutilizables) */
function captureCustomPct() {
  return state.customGuides.map(g => {
    if (g.type === 'vertical') {
      const pct = isPctUnit(g) ? g.value / 100 : g.value / state.compW;
      return { o: 'v', pct: +pct.toFixed(4), name: g.name };
    }
    if (g.type === 'horizontal') {
      const pct = isPctUnit(g) ? g.value / 100 : g.value / state.compH;
      return { o: 'h', pct: +pct.toFixed(4), name: g.name };
    }
    const pct = isPctUnit(g);
    return {
      o: 'box',
      wPct:  +(pct ? g.w / 100 : g.w / state.compW).toFixed(4),
      hPct:  +(pct ? g.h / 100 : g.h / state.compH).toFixed(4),
      cxPct: +(pct ? (g.cx != null ? g.cx : 50) / 100 : (g.cx != null ? g.cx : state.compW / 2) / state.compW).toFixed(4),
      cyPct: +(pct ? (g.cy != null ? g.cy : 50) / 100 : (g.cy != null ? g.cy : state.compH / 2) / state.compH).toFixed(4),
      name: g.name,
    };
  });
}

document.getElementById('btnNewPreset').addEventListener('click', () => {
  const name = prompt('Nombre del preset:', 'Mi Preset');
  if (!name) return;
  PRESETS[name] = {
    ratio: [state.compW, state.compH],
    guides: { ...mapBool(state.guides) },
    safe: { ...mapBool(state.safeZones) },
    grid: { cols: state.gridCols, rows: state.gridRows },
    custom: captureCustomPct(),
  };
  const grid = document.querySelector('.preset-grid');
  const card = document.createElement('div');
  card.className = 'preset-card';
  card.innerHTML = `
    ${presetIconHtml(name)}
    <div class="pc-name">${name}</div>
    <div class="pc-desc">Configuración personalizada</div>
    <div class="pc-tags"><span class="tag">Custom</span></div>
    <div class="pc-btns"><button class="btn-pc-apply">Aplicar</button><button class="btn-pc-del" title="Eliminar">${SG_ICONS.trash(13, 13)}</button></div>`;
  grid.appendChild(card);
  card.querySelector('.btn-pc-apply').addEventListener('click', () => applyPreset(name));
  card.querySelector('.btn-pc-del').addEventListener('click', () => card.remove());
});

function mapBool(obj) { const o = {}; Object.keys(obj).forEach(k => { if (obj[k]) o[k] = 1; }); return o; }

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
document.getElementById('btnExportPreset').addEventListener('click', () =>
  downloadFile('SmoothGuides_preset.json', JSON.stringify(buildSpec(true), null, 2)));
document.getElementById('btnExportAll').addEventListener('click', () =>
  downloadFile('SmoothGuides_all.json', JSON.stringify({ state, version: '1.0.2', exported: new Date().toISOString() }, null, 2)));
document.getElementById('btnShare').addEventListener('click', () => {
  const data = JSON.stringify(state, null, 2);
  if (navigator.clipboard) navigator.clipboard.writeText(data).then(() => alert('Configuración copiada al portapapeles.'));
});

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) readImportFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', function () { if (this.files[0]) readImportFile(this.files[0]); });

function readImportFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.state) {
        Object.assign(state, data.state);
        if (state.customGuides) state.customGuides = state.customGuides.map(normalizeGuide);
      }
      else if (data.guides || data.safe) {
        if (data.guides) Object.assign(state.guides, data.guides);
      }
      syncUIFromState();
      drawPreview();
      addBackupItem(file.name);
      alert(`Archivo "${file.name}" importado.`);
    } catch { alert('Error al leer el JSON.'); }
  };
  reader.readAsText(file);
}

function syncUIFromState() {
  Object.keys(state.guides).forEach(k => {
    const t = document.querySelector(`.toggle[data-toggle="${k}"]`);
    if (t) t.classList.toggle('on', state.guides[k]);
    // ojito pequeño de cada guía de composición
    const eye = document.querySelector(`.eye-sm[data-eye="${k}"]`);
    if (eye) eye.classList.toggle('on', state.guides[k]);
    // tarjetas de la pestaña REGLAS
    document.querySelectorAll(`.rule-card[data-rule="${k}"]`).forEach(c => c.classList.toggle('active', state.guides[k]));
  });
  Object.keys(state.safeZones).forEach(k => {
    const t = document.querySelector(`.toggle[data-toggle="sz-${k}"]`);
    if (t) t.classList.toggle('on', state.safeZones[k]);
  });
  renderCustomList();
}

function addBackupItem(name) {
  const list = document.getElementById('backupList');
  const item = document.createElement('div');
  item.className = 'backup-item';
  item.innerHTML = `<span class="backup-icon">${SG_ICONS.file(16, 16)}</span><span class="backup-name">${name}</span>
    <div class="backup-btns"><button class="btn-restore">Restaurar</button><button class="btn-backup-del" title="Eliminar">${SG_ICONS.trash(13, 13)}</button></div>`;
  list.prepend(item);
  item.querySelector('.btn-backup-del').addEventListener('click', () => item.remove());
}

function downloadFile(name, data) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   EDITAR SAFE ZONES → tab
   ============================================================ */
document.getElementById('btnEditSz').addEventListener('click', () => {
  document.querySelector('.tab[data-tab="safezones"]').click();
});

/* ============================================================
   STATUS
   ============================================================ */
function setStatus(msg, success) {
  statusText.textContent = msg;
  const ok = success !== false;
  statusBar.style.borderColor = ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.3)';
  statusBar.style.background  = ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
  const svg = statusBar.querySelector('svg');
  if (svg) svg.setAttribute('stroke', ok ? '#22c55e' : '#ef4444');
}

/* ============================================================
   CANVAS PREVIEW
   ============================================================ */
function resizeCanvas() {
  const wrapW = previewWrap.clientWidth  - 24;
  const wrapH = previewWrap.clientHeight - 24;
  const aspect = state.compW / state.compH;
  let cw, ch;
  if (wrapW / wrapH > aspect) { ch = wrapH; cw = ch * aspect; }
  else { cw = wrapW; ch = cw / aspect; }
  canvas.width = Math.max(20, Math.floor(cw));
  canvas.height = Math.max(20, Math.floor(ch));
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}

function drawPreview() {
  resizeCanvas();
  const W = canvas.width, H = canvas.height;
  const sx = W / state.compW, sy = H / state.compH;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#121820';
  ctx.fillRect(0, 0, W, H);

  const cell = 10;
  ctx.fillStyle = '#161d28';
  for (let r = 0; r < Math.ceil(H / cell); r++)
    for (let c = 0; c < Math.ceil(W / cell); c++)
      if ((r + c) % 2 === 0) ctx.fillRect(c * cell, r * cell, cell, cell);

  if (!state.showGuides) { drawBorder(W, H); return; }

  const szColors = { action: ['#3b82f6', 0.55], title: ['#22c55e', 0.55], social: ['#8b5cf6', 0.45], reels: ['#f97316', 0.45] };
  Object.keys(state.safeZones).forEach(k => {
    if (state.safeZones[k]) drawSafeRect(W, H, state.safeDefs[k], szColors[k][0], szColors[k][1]);
  });

  if (state.guides.diagonals) {
    setLine(state.guideColor, 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke();
  }
  if (state.guides.thirds) {
    setLine(state.guideColor, state.lineOpacity * 0.85); ctx.setLineDash([]);
    [W / 3, 2 * W / 3].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
    [H / 3, 2 * H / 3].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
  }
  if (state.guides.grid) {
    ctx.strokeStyle = hexA(state.guideColor, 0.15); ctx.lineWidth = 0.5; ctx.setLineDash([]);
    const cols = state.gridCols || 6;
    const rows = state.gridRows || Math.round(cols * H / W);
    for (let i = 1; i < cols; i++) { const x = W / cols * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let i = 1; i < rows; i++) { const y = H / rows * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  if (state.guides.center || state.guides.crosshair) {
    ctx.strokeStyle = hexA('#94a3b8', 0.6); ctx.lineWidth = state.lineWidth; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = hexA(state.guideColor, 0.9);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  const compW = state.compW, compH = state.compH;
  state.customGuides.filter(g => g.visible).forEach(g => {
    ctx.setLineDash([]); ctx.lineWidth = state.lineWidth;
    if (g.type === 'vertical') {
      const x = resolveV(g, compW) * sx; ctx.strokeStyle = hexA(state.guideColor, state.lineOpacity);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    } else if (g.type === 'horizontal') {
      const y = resolveH(g, compH) * sy; ctx.strokeStyle = hexA('#22c55e', state.lineOpacity);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    } else {
      const b = resolveBox(g, compW, compH);
      const bw = b.w * sx, bh = b.h * sy;
      const cx = b.cx * sx, cy = b.cy * sy;
      const bx = cx - bw / 2, by = cy - bh / 2;
      ctx.strokeStyle = hexA('#8b5cf6', state.lineOpacity); ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, by, bw, bh); ctx.setLineDash([]);
    }
  });

  drawBorder(W, H);
}

function setLine(color, alpha) {
  ctx.strokeStyle = hexA(color, alpha == null ? state.lineOpacity : alpha);
  ctx.lineWidth = state.lineWidth;
  if (state.lineStyle === 'dashed') ctx.setLineDash([6, 4]);
  else if (state.lineStyle === 'dotted') ctx.setLineDash([2, 3]);
  else ctx.setLineDash([]);
}
function drawSafeRect(W, H, pct, color, alpha) {
  const mx = W * (1 - pct) / 2, my = H * (1 - pct) / 2;
  ctx.strokeStyle = hexA(color, alpha); ctx.lineWidth = 1.2; ctx.setLineDash([5, 3]);
  ctx.strokeRect(mx, my, W - mx * 2, H - my * 2); ctx.setLineDash([]);
}
function drawBorder(W, H) {
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ============================================================
   RESIZE OBSERVER + INIT
   ============================================================ */
new ResizeObserver(() => drawPreview()).observe(previewWrap);

function init() {
  state.customGuides = state.customGuides.map(normalizeGuide);
  syncUIFromState();   // aplica los defaults (solo Reels + texto) a los toggles del HTML
  drawPreview();
  refreshCompInfo();
  window.addEventListener('focus', refreshCompInfo);
}
window.addEventListener('load', init);
