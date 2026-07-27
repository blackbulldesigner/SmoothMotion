/**
 * MotionFlow — Panel Controller
 */

(function () {
  'use strict';

  // ── 1. CEP Bridge ─────────────────────────────────────────────────────────
  var cs = new CSInterface();
  var MF = window.MF_modes;

  function parseEvalResult(res) {
    if (window.SmoothMotionHost && window.SmoothMotionHost.parseResult) {
      return window.SmoothMotionHost.parseResult(res);
    }
    try {
      return JSON.parse(res);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // ── 2. Default Preset Library ──────────────────────────────────────────────
  var DEFAULT_PRESETS = [
    // Ease
    { name: 'Linear',     mode: 'ease', x1: 0.0,   y1: 0.0,   x2: 1.0,   y2: 1.0,   cat: 'ease' },
    { name: 'Ease',       mode: 'ease', x1: 0.25,  y1: 0.1,   x2: 0.25,  y2: 1.0,   cat: 'ease' },
    { name: 'Ease In',    mode: 'ease', x1: 0.42,  y1: 0.0,   x2: 1.0,   y2: 1.0,   cat: 'ease' },
    { name: 'Ease Out',   mode: 'ease', x1: 0.0,   y1: 0.0,   x2: 0.58,  y2: 1.0,   cat: 'ease' },
    { name: 'Ease InOut', mode: 'ease', x1: 0.42,  y1: 0.0,   x2: 0.58,  y2: 1.0,   cat: 'ease' },
    { name: 'Smooth',     mode: 'ease', x1: 0.45,  y1: 0.0,   x2: 0.55,  y2: 1.0,   cat: 'ease' },
    // Power
    { name: 'Quad In',    mode: 'ease', x1: 0.55,  y1: 0.085, x2: 0.68,  y2: 0.53,  cat: 'power' },
    { name: 'Quad Out',   mode: 'ease', x1: 0.25,  y1: 0.46,  x2: 0.45,  y2: 0.94,  cat: 'power' },
    { name: 'Cubic In',   mode: 'ease', x1: 0.55,  y1: 0.055, x2: 0.675, y2: 0.19,  cat: 'power' },
    { name: 'Cubic Out',  mode: 'ease', x1: 0.215, y1: 0.61,  x2: 0.355, y2: 1.0,   cat: 'power' },
    { name: 'Quart In',   mode: 'ease', x1: 0.895, y1: 0.03,  x2: 0.685, y2: 0.22,  cat: 'power' },
    { name: 'Quart Out',  mode: 'ease', x1: 0.165, y1: 0.84,  x2: 0.44,  y2: 1.0,   cat: 'power' },
    // Back
    { name: 'Back In',    mode: 'ease', x1: 0.6,   y1: -0.28, x2: 0.735, y2: 0.045, cat: 'back' },
    { name: 'Back Out',   mode: 'ease', x1: 0.175, y1: 0.885, x2: 0.32,  y2: 1.275, cat: 'back' },
    { name: 'Back InOut', mode: 'ease', x1: 0.68,  y1: -0.55, x2: 0.265, y2: 1.55,  cat: 'back' },
    { name: 'Anticipate', mode: 'ease', x1: 0.5,   y1: -0.3,  x2: 0.6,   y2: 1.0,   cat: 'back' },
    // Cinematic
    { name: 'Film Enter', mode: 'ease', x1: 0.0,   y1: 0.0,   x2: 0.2,   y2: 1.0,   cat: 'cinematic' },
    { name: 'Film Exit',  mode: 'ease', x1: 0.8,   y1: 0.0,   x2: 1.0,   y2: 1.0,   cat: 'cinematic' },
    { name: 'Dramatic',   mode: 'ease', x1: 0.7,   y1: 0.0,   x2: 0.3,   y2: 1.0,   cat: 'cinematic' },
    { name: 'Snappy',     mode: 'ease', x1: 0.2,   y1: 0.0,   x2: 0.0,   y2: 1.0,   cat: 'cinematic' },
    // Bounce (ease bezier style)
    { name: 'Overshoot',  mode: 'ease', x1: 0.34,  y1: 1.56,  x2: 0.64,  y2: 1.0,   cat: 'bounce' },
    { name: 'Spring',     mode: 'ease', x1: 0.175, y1: 0.885, x2: 0.32,  y2: 1.275, cat: 'bounce' },
    { name: 'Settle',     mode: 'ease', x1: 0.36,  y1: 0.0,   x2: 0.66,  y2: -0.56, cat: 'bounce' },
    { name: 'Pop',        mode: 'ease', x1: 0.2,   y1: 1.4,   x2: 0.6,   y2: 1.0,   cat: 'bounce' }
  ];

  // ── 3. Application State ───────────────────────────────────────────────────
  var state = {
    x1: 0.42, y1: 0.0, x2: 0.58, y2: 1.0,

    // Drag state
    dragging: false, dragTarget: null,
    dragStartX: 0, dragStartY: 0,
    dragStartX1: 0, dragStartY1: 0,
    dragStartX2: 0, dragStartY2: 0,
    dragStartZoom: 1,

    // Canvas size
    cw: 0, ch: 0,

    // Library state
    libraries: [], libIndex: 0,
    activeCat: 'all',
    selectedPreset: -1,
    dragPresetIdx: -1,

    // Preview RAF handle
    previewRaf: null,

    // History / pan / zoom
    recentCurves: [],
    panning: false, userZoomed: false,
    panStartX: 0, panStartY: 0,
    camStartOX: 0, camStartOY: 0, camStartZoom: 1,
    speedZoomed: false,

    // Graph display mode
    graphMode: 'ease',
    applyMethod: 'expr',   // 'expr' | 'keys' (Elastic/Bounce/Custom)

    elastic: MF.defaultElastic(),   // { amp, freq }
    bounce:  MF.defaultBounce(),    // { amp, damp }
    customPoints: MF.defaultCustomPoints(),
    segmentFrames: MF.defaultSegmentFrames(2),
    customSelected: [],
    customDrag: null,
    dragSnap: null,
    marquee: null
  };

  // Camera
  var camera = { ox: 0.5, oy: 0.5, zoom: 1.0 };
  var ASPECT = 1.36;       // aspect ratio scale constant

  // Speed graph viewport (estilo AE — escala estable, no auto-fit a picos)
  var SPEED_PAD = { left: 34, top: 10, right: 8, bottom: 12 };
  var speedView = { minY: 0, maxY: 2, peak: 0, labelTop: 200 };

  // Orientation cache
  var activeOrientation = null;

  // Storage keys
  var KEY_LIBRARIES = 'smoothmotion_v3_libraries';
  var KEY_RECENT    = 'smoothmotion_v3_recent';
  var KEY_LIBRARIES_LEGACY = 'flowease_v2_libraries';
  var KEY_LIBRARIES_LEGACY2 = 'easecraft_v1_libraries';
  var KEY_RECENT_LEGACY    = 'flowease_v2_recent';
  var KEY_RECENT_LEGACY2    = 'easecraft_v1_recent';
  var KEY_GRAPH_MODE       = 'SmoothMotion_GraphMode';
  var KEY_APPLY_METHOD     = 'SmoothMotion_ApplyMethod';

  // Preset card size (matches CSS grid minmax)
  var CARD_SIZE = 56;

  // ── 4. DOM Cache ───────────────────────────────────────────────────────────
  var canvas        = document.getElementById('canvas');
  var canvasLast    = document.getElementById('canvasLast');
  var ctx           = canvas.getContext('2d');
  var ctxLast       = canvasLast.getContext('2d');

  var cp1El         = document.getElementById('CP1');
  var cp2El         = document.getElementById('CP2');
  var canvasWrapper = document.getElementById('canvas-wrapper');
  var coordsBadge   = document.getElementById('coordsBadge');
  var previewBall   = document.getElementById('previewBall');
  var bezierValues  = document.getElementById('bezierValues');
  var presetsGrid   = document.getElementById('presetsGrid');
  var ddLibraries   = document.getElementById('ddLibraries');
  var overlay       = document.getElementById('overlay');
  var container     = document.getElementById('container');
  var graphPanel    = document.getElementById('graphPanel');
  var chkLiveSync   = document.getElementById('chk-live-sync');
  var customHandles = document.getElementById('customHandles');
  var customSegBar  = document.getElementById('customSegmentsBar');
  var customSegInp  = document.getElementById('customSegmentsInputs');
  var marqueeBox    = document.getElementById('marqueeBox');

  // ── 5. Camera / Coordinate helpers ────────────────────────────────────────

  /** Redondea el máximo del eje Y a un valor legible (estilo AE). */
  function niceSpeedMax(val) {
    if (val <= 0.6)  return 0.75;
    if (val <= 0.9)  return 1.0;
    if (val <= 1.4)  return 1.5;
    if (val <= 1.9)  return 2.0;
    if (val <= 2.8)  return 3.0;
    if (val <= 3.8)  return 4.0;
    if (val <= 6)    return 5.0;
    if (val <= 9)    return 8.0;
    if (val <= 14)   return 12.0;
    if (val <= 22)   return 20.0;
    return Math.ceil(val / 10) * 10;
  }

  /** Calcula escala Y: el pico siempre cabe al ~75% del alto (sin mesetas artificiales). */
  function updateSpeedView() {
    var peak = 0;
    var i, t, v;
    for (i = 0; i <= 100; i++) {
      t = i / 100.0;
      v = Math.max(0, velocityAtTime(t));
      if (v > peak) peak = v;
    }

    var maxY;
    if (peak < 0.02) {
      maxY = 1.0;
    } else {
      maxY = Math.max(peak / 0.75, 0.75);
    }

    if (state.speedZoomed && speedView.maxY > 0) {
      maxY = Math.max(speedView.maxY, peak / 0.75);
    } else {
      maxY = niceSpeedMax(maxY);
      if (peak >= 0.02) maxY = Math.max(maxY, peak / 0.75);
    }

    speedView.peak     = peak;
    speedView.minY     = 0;
    speedView.maxY     = maxY;
    speedView.labelTop = Math.max(51, Math.round(maxY * 51));
  }

  /** Área útil del plot de velocidad. */
  function speedPlotRect() {
    return {
      x: SPEED_PAD.left,
      y: SPEED_PAD.top,
      w: Math.max(1, state.cw - SPEED_PAD.left - SPEED_PAD.right),
      h: Math.max(1, state.ch - SPEED_PAD.top - SPEED_PAD.bottom)
    };
  }

  /** Coordenadas velocidad (tiempo, speed) → píxeles canvas. */
  function toPixelsSpeed(x, y) {
    var plot = speedPlotRect();
    var maxY = speedView.maxY || 1;
    return {
      x: plot.x + (x / 1.0) * plot.w,
      y: plot.y + plot.h - (Math.max(0, y) / maxY) * plot.h
    };
  }

  /** Píxeles canvas → coordenadas velocidad. */
  function toCoordsSpeed(px, py) {
    var plot = speedPlotRect();
    var maxY = speedView.maxY || 1;
    return {
      x: Math.max(0, Math.min(1, (px - plot.x) / plot.w)),
      y: maxY * (1.0 - (py - plot.y) / plot.h)
    };
  }

  /** Auto-fits camera to show entire curve without user having zoomed. */
  function autoFitZoom() {
    if (state.graphMode === 'speed') {
      updateSpeedView();
      return;
    }
    if (MF.isParamMode(state.graphMode)) {
      if (state.userZoomed || state.dragging || state.panning) return;
      MF.autoFitValueGraph(state, camera, ASPECT);
      return;
    }
    if (state.userZoomed) return;
    var minX = Math.min(0.0, state.x1, state.x2);
    var maxX = Math.max(1.0, state.x1, state.x2);
    var minY = Math.min(0.0, state.y1, state.y2);
    var maxY = Math.max(1.0, state.y1, state.y2);
    var maxDelta = Math.max(maxX - minX, maxY - minY, 1.0);
    camera.zoom = ASPECT / Math.max(maxDelta, 0.36);
    camera.ox   = (minX + maxX) / 2.0;
    camera.oy   = (minY + maxY) / 2.0;
  }

  /** Curve-space → canvas pixels. */
  function toPixels(x, y) {
    var s = state.cw / (ASPECT / camera.zoom);
    return {
      x: state.cw / 2.0 + (x - camera.ox) * s,
      y: state.ch / 2.0 - (y - camera.oy) * s
    };
  }

  /** Canvas pixels → curve-space. */
  function toCoords(px, py) {
    var s = state.cw / (ASPECT / camera.zoom);
    return {
      x: camera.ox + (px - state.cw / 2.0) / s,
      y: camera.oy - (py - state.ch / 2.0) / s
    };
  }

  var customHandleHandlers = {
    onAnchorDown: function (e, idx) {
      var sel = state.customSelected || [];
      if (e.shiftKey) {
        var pos = sel.indexOf(idx);
        if (pos === -1) sel.push(idx);
        else sel.splice(pos, 1);
        state.customSelected = sel;
        refreshCustomUI();
        if (pos !== -1) return;
      } else if (sel.indexOf(idx) === -1) {
        state.customSelected = [idx];
        refreshCustomUI();
      }
      startCustomPointerDrag(e, 'anchor', idx);
    },
    onTangentDown: function (e, kind, idx) {
      state.customSelected = [idx];
      refreshCustomUI();
      startCustomPointerDrag(e, kind, idx);
    },
    onDelete: function (idx) {
      if (MF.removeCustomPoint(state, idx)) {
        refreshCustomUI();
        redrawAll();
        runPreviewAnimation();
        MF.saveModeParams(state);
      }
    }
  };

  /** Moves CP1/CP2 DOM handles to their pixel positions. */
  function updateHandles() {
    if (state.graphMode === 'custom') {
      if (state.dragging && customHandles.childElementCount) {
        MF.positionCustomHandles(customHandles, state, toPixels);
      } else {
        MF.renderCustomHandles(customHandles, state, toPixels, customHandleHandlers);
      }
      return;
    }
    if (MF.isParamMode(state.graphMode)) {
      MF.updateParamHandles(state, cp1El, cp2El, toPixels);
      return;
    }
    var p1, p2;
    if (state.graphMode === 'speed') {
      p1 = toPixelsSpeed(state.x1, 0);
      p2 = toPixelsSpeed(state.x2, 0);
    } else {
      p1 = toPixels(state.x1, state.y1);
      p2 = toPixels(state.x2, state.y2);
    }
    cp1El.style.display = '';
    cp2El.style.display = '';
    cp1El.style.top  = p1.y + 'px';
    cp1El.style.left = p1.x + 'px';
    cp2El.style.top  = p2.y + 'px';
    cp2El.style.left = p2.x + 'px';
  }

  // ── 6. Bezier Math ────────────────────────────────────────────────────────

  /** Returns Bezier Y value at parameter t. */
  function bezierYatT(t) {
    var mt = 1.0 - t;
    return 3.0 * mt * mt * t * state.y1 +
           3.0 * mt * t  * t * state.y2 +
           t * t * t;
  }

  /** Newton-Raphson: find t parameter for given x on the Bezier. */
  function solveTforX(x) {
    var t = x;
    for (var i = 0; i < 10; i++) {
      var mt  = 1.0 - t;
      var cx  = 3.0 * mt * mt * t * state.x1 + 3.0 * mt * t * t * state.x2 + t * t * t;
      var err = cx - x;
      if (Math.abs(err) < 0.00001) break;
      var d = 3.0 * mt * mt * state.x1 +
              6.0 * mt * t * (state.x2 - state.x1) +
              3.0 * t  * t * (1.0 - state.x2);
      if (Math.abs(d) < 0.0001) break;
      t -= err / d;
      t  = Math.max(0.0, Math.min(1.0, t));
    }
    return t;
  }

  /** Normalized outgoing speed (AE speed graph, keyframe izquierdo). */
  function getNsOut() {
    return state.x1 > 0.001 ? state.y1 / state.x1 : 0.0;
  }

  /** Normalized incoming speed (AE speed graph, keyframe derecho). */
  function getNsIn() {
    var span = 1.0 - state.x2;
    return span > 0.001 ? (1.0 - state.y2) / span : 0.0;
  }

  /** Velocidad instantánea dy/dt en tiempo lineal normalizado [0,1]. */
  function velocityAtTime(t) {
    var u  = solveTforX(t);
    var mt = 1.0 - u;
    var dx = 3.0 * mt * mt * state.x1 +
             6.0 * mt * u * (state.x2 - state.x1) +
             3.0 * u * u * (1.0 - state.x2);
    var dy = 3.0 * mt * mt * state.y1 +
             6.0 * mt * u * (state.y2 - state.y1) +
             3.0 * u * u * (1.0 - state.y2);
    if (Math.abs(dx) < 0.00001) return 0.0;
    return dy / dx;
  }

  // ── 7. Canvas Rendering ────────────────────────────────────────────────────

  function clearCtx(c) { c.clearRect(0, 0, state.cw, state.ch); }

  /** Draws the dotted grid and blue tint box. */
  function drawGrid(c) {
    c.save();
    var cMin = toCoords(0, state.ch);
    var cMax = toCoords(state.cw, 0);

    // Fine grid lines
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth   = 1;

    var sx = Math.floor(cMin.x * 5.0) / 5.0;
    for (var gx = sx; gx <= cMax.x + 0.05; gx += 0.2) {
      var px = toPixels(gx, 0).x;
      c.beginPath(); c.moveTo(px, 0); c.lineTo(px, state.ch); c.stroke();
    }
    var sy = Math.floor(cMin.y * 5.0) / 5.0;
    for (var gy = sy; gy <= cMax.y + 0.05; gy += 0.2) {
      var py = toPixels(0, gy).y;
      c.beginPath(); c.moveTo(0, py); c.lineTo(state.cw, py); c.stroke();
    }

    // 0→1 box fill
    var pTL = toPixels(0, 1);
    var pBR = toPixels(1, 0);
    var pTR = toPixels(1, 1);
    c.fillStyle = 'rgba(59,130,246,0.04)';
    c.fillRect(pTL.x, pTL.y, pTR.x - pTL.x, pBR.y - pTL.y);

    // Axis dashed lines
    c.strokeStyle = 'rgba(59,130,246,0.3)';
    c.lineWidth   = 1;
    c.setLineDash([5, 4]);

    var pO  = toPixels(0, 0);
    var pX1 = toPixels(1, 0);
    var pY1 = toPixels(0, 1);

    c.beginPath(); c.moveTo(0, pO.y);  c.lineTo(state.cw, pO.y);  c.stroke();  // y=0
    c.beginPath(); c.moveTo(0, pY1.y); c.lineTo(state.cw, pY1.y); c.stroke();  // y=1
    c.beginPath(); c.moveTo(pO.x,  0); c.lineTo(pO.x,  state.ch); c.stroke();  // x=0
    c.beginPath(); c.moveTo(pX1.x, 0); c.lineTo(pX1.x, state.ch); c.stroke();  // x=1

    c.setLineDash([]);
    c.restore();
  }

  /** Draws dashed lines from endpoints to control points. */
  function drawGuides() {
    if (state.graphMode === 'speed') {
      drawVelocityGuides();
      return;
    }

    var pS   = toPixels(0, 0);
    var pE   = toPixels(1, 1);
    var pCP1 = toPixels(state.x1, state.y1);
    var pCP2 = toPixels(state.x2, state.y2);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(pS.x, pS.y); ctx.lineTo(pCP1.x, pCP1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pE.x, pE.y); ctx.lineTo(pCP2.x, pCP2.y); ctx.stroke();
    ctx.restore();
  }

  /** Etiquetas numéricas del eje Y (estilo AE: 51, 102, 153…). */
  function drawSpeedAxisLabels(c) {
    var plot = speedPlotRect();
    var top  = speedView.labelTop;
    var ticks = [
      { frac: 0.25, val: Math.round(top * 0.25) },
      { frac: 0.50, val: Math.round(top * 0.50) },
      { frac: 0.75, val: Math.round(top * 0.75) },
      { frac: 1.00, val: top }
    ];
    var i, p, label;

    c.save();
    c.fillStyle = 'rgba(148,163,184,0.75)';
    c.font      = '9px Inter, sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'middle';

    for (i = 0; i < ticks.length; i++) {
      p = toPixelsSpeed(0, speedView.maxY * ticks[i].frac);
      label = String(ticks[i].val);
      c.fillText(label, plot.x - 5, p.y);
    }
    c.restore();
  }

  /** Guías de influencia: solo 2 handles horizontales sobre la línea base. */
  function drawVelocityGuides() {
    var pK1  = toPixelsSpeed(0, 0);
    var pK2  = toPixelsSpeed(1, 0);
    var pCP1 = toPixelsSpeed(state.x1, 0);
    var pCP2 = toPixelsSpeed(state.x2, 0);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);

    // Línea base
    ctx.beginPath();
    ctx.moveTo(pK1.x, pK1.y);
    ctx.lineTo(pK2.x, pK2.y);
    ctx.stroke();

    // Influencia: keyframe → handle (solo horizontal)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(pK1.x, pK1.y); ctx.lineTo(pCP1.x, pCP1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pK2.x, pK2.y); ctx.lineTo(pCP2.x, pCP2.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Rejilla del modo velocidad con divisiones proporcionales (estilo AE). */
  function drawSpeedGrid(c) {
    var plot = speedPlotRect();
    var i, frac, pL, pR, p;

    c.save();

    // Fondo del área de plot
    c.fillStyle = 'rgba(59,130,246,0.035)';
    c.fillRect(plot.x, plot.y, plot.w, plot.h);

    // Rejilla horizontal (4 divisiones como AE)
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth   = 1;
    for (i = 1; i <= 3; i++) {
      frac = i / 4.0;
      p = toPixelsSpeed(0, speedView.maxY * frac);
      c.beginPath();
      c.moveTo(plot.x, p.y);
      c.lineTo(plot.x + plot.w, p.y);
      c.stroke();
    }

    // Rejilla vertical (tiempo)
    for (i = 1; i <= 3; i++) {
      frac = i / 4.0;
      p = toPixelsSpeed(frac, 0);
      c.beginPath();
      c.moveTo(p.x, plot.y);
      c.lineTo(p.x, plot.y + plot.h);
      c.stroke();
    }

    // Borde del plot
    c.strokeStyle = 'rgba(59,130,246,0.22)';
    c.lineWidth   = 1;
    c.strokeRect(plot.x, plot.y, plot.w, plot.h);

    // Línea base (speed = 0)
    pL = toPixelsSpeed(0, 0);
    pR = toPixelsSpeed(1, 0);
    c.strokeStyle = 'rgba(59,130,246,0.35)';
    c.beginPath();
    c.moveTo(pL.x, pL.y);
    c.lineTo(pR.x, pR.y);
    c.stroke();

    drawSpeedAxisLabels(c);
    c.restore();
  }

  /** Muestrea la curva de velocidad e incluye el pico exacto. */
  function buildSpeedCurvePoints() {
    var steps = 200;
    var pts   = [];
    var i, t, v, peakV = 0, peakT = 0;

    for (i = 0; i <= steps; i++) {
      t = i / steps;
      v = Math.max(0, velocityAtTime(t));
      pts.push({ t: t, v: v });
      if (v > peakV) { peakV = v; peakT = t; }
    }

    // Refinar alrededor del pico para evitar artefactos en agujas
    if (peakT > 0.01 && peakT < 0.99) {
      var fine = 12;
      var lo = Math.max(0, peakT - 0.06);
      var hi = Math.min(1, peakT + 0.06);
      for (i = 0; i <= fine; i++) {
        t = lo + (hi - lo) * (i / fine);
        v = Math.max(0, velocityAtTime(t));
        pts.push({ t: t, v: v });
      }
    }

    pts.sort(function (a, b) { return a.t - b.t; });
    return pts;
  }

  /** Reduce puntos y conserva el pico para trazo suave (sin línea vertical). */
  function decimateSpeedPoints(pts) {
    if (pts.length <= 3) return pts.slice();
    var peakIdx = 0, peakV = 0, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].v > peakV) { peakV = pts[i].v; peakIdx = i; }
    }

    var step = Math.max(1, Math.floor(pts.length / 28));
    var out  = [];
    var seen = {};

    function add(idx) {
      var key = pts[idx].t.toFixed(4);
      if (!seen[key]) { seen[key] = true; out.push(pts[idx]); }
    }

    add(0);
    for (i = step; i < pts.length - 1; i += step) add(i);
    add(pts.length - 1);
    add(peakIdx);
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  /** Trazo suave con curvas cuadráticas (evita paredes verticales en el pico). */
  function traceSmoothSpeedPath(c, smooth, closeToBase) {
    var i, p, pBaseL, pBaseR, first, last, prev, curr, mx, my;

    if (smooth.length < 2) return;

    first = toPixelsSpeed(smooth[0].t, smooth[0].v);
    pBaseL = toPixelsSpeed(0, 0);
    pBaseR = toPixelsSpeed(1, 0);

    if (closeToBase) c.moveTo(pBaseL.x, pBaseL.y);
    c.lineTo(first.x, first.y);

    for (i = 1; i < smooth.length; i++) {
      prev = toPixelsSpeed(smooth[i - 1].t, smooth[i - 1].v);
      curr = toPixelsSpeed(smooth[i].t, smooth[i].v);
      mx   = (prev.x + curr.x) * 0.5;
      my   = (prev.y + curr.y) * 0.5;
      c.quadraticCurveTo(prev.x, prev.y, mx, my);
    }

    last = toPixelsSpeed(smooth[smooth.length - 1].t, smooth[smooth.length - 1].v);
    c.quadraticCurveTo(last.x, last.y, last.x, last.y);

    if (closeToBase) {
      c.lineTo(pBaseR.x, pBaseR.y);
      c.closePath();
    }
  }

  /** Curva de velocidad con escala estable y relleno suave. */
  function drawVelocityCurve(c, color, width, dash) {
    var plot   = speedPlotRect();
    var pts    = buildSpeedCurvePoints();
    var smooth = decimateSpeedPoints(pts);

    c.save();
    c.beginPath();
    c.rect(plot.x, plot.y, plot.w, plot.h);
    c.clip();

    c.lineCap  = 'round';
    c.lineJoin = 'round';
    c.setLineDash(dash || []);

    // Relleno bajo la curva (trazo suave)
    c.beginPath();
    traceSmoothSpeedPath(c, smooth, true);
    c.fillStyle = 'rgba(59,130,246,0.12)';
    c.fill();

    // Trazo principal
    c.beginPath();
    traceSmoothSpeedPath(c, smooth, false);
    c.strokeStyle = color || '#3b82f6';
    c.lineWidth   = width || 2.5;
    c.stroke();
    c.restore();
  }

  /** Draws a cubic Bezier path on canvas context c. */
  function drawCurve(c, x1, y1, x2, y2, color, width, dash) {
    var pS   = toPixels(0, 0);
    var pE   = toPixels(1, 1);
    var pCP1 = toPixels(x1, y1);
    var pCP2 = toPixels(x2, y2);

    c.save();
    c.strokeStyle = color  || '#3b82f6';
    c.lineWidth   = width  || 2;
    c.lineCap     = 'round';
    c.setLineDash(dash || []);
    c.beginPath();
    c.moveTo(pS.x, pS.y);
    c.bezierCurveTo(pCP1.x, pCP1.y, pCP2.x, pCP2.y, pE.x, pE.y);
    c.stroke();
    c.restore();
  }

  /** Updates the small coordinate badge while dragging. */
  function updateCoordsBadge() {
    if (state.dragging && !state.marquee) {
      var summary = MF.modeSummary(state);
      if (summary) {
        coordsBadge.textContent = summary;
      } else if (state.graphMode === 'speed') {
        coordsBadge.textContent =
          'Inf Out ' + state.x1.toFixed(2) + ' · Inf In ' + (1.0 - state.x2).toFixed(2);
      } else {
        coordsBadge.textContent =
          state.x1.toFixed(2) + ', ' + state.y1.toFixed(2) + ' · ' +
          state.x2.toFixed(2) + ', ' + state.y2.toFixed(2);
      }
      coordsBadge.classList.add('visible');
    } else {
      coordsBadge.classList.remove('visible');
    }
  }

  /** Refreshes the bezier values text display (o resumen del modo activo). */
  function updateBezierText() {
    if (!bezierValues) return;
    var summary = MF.modeSummary(state);
    if (summary) {
      bezierValues.textContent = summary;
      return;
    }
    bezierValues.textContent =
      state.x1.toFixed(2) + ', ' + state.y1.toFixed(2) + ', ' +
      state.x2.toFixed(2) + ', ' + state.y2.toFixed(2);
  }

  /** Full canvas redraw. */
  function redrawAll() {
    if (!state.cw || !state.ch) return;
    autoFitZoom();
    clearCtx(ctx);

    if (state.graphMode === 'speed') {
      drawSpeedGrid(ctx);
      drawVelocityCurve(ctx, '#3b82f6', 2);
      drawVelocityGuides();
    } else if (state.graphMode === 'elastic') {
      drawGrid(ctx);
      MF.drawElasticTarget(ctx, toPixels);
      MF.drawFilledCurve(ctx, toPixels, MF.sampleCurve('elastic', state, 220), '#3b82f6', 0.14);
    } else if (state.graphMode === 'bounce') {
      drawGrid(ctx);
      MF.drawDiagonalRef(ctx, toPixels, state.cw, state.ch);
      MF.drawFilledCurve(ctx, toPixels, MF.sampleCurve('bounce', state, 180), '#3b82f6', 0.14);
    } else if (state.graphMode === 'custom') {
      drawGrid(ctx);
      MF.drawDiagonalRef(ctx, toPixels, state.cw, state.ch);
      MF.drawCustomGuides(ctx, toPixels, state);
      MF.drawCustomPath(ctx, toPixels, state);
    } else {
      drawGrid(ctx);
      drawGuides();
      drawCurve(ctx, state.x1, state.y1, state.x2, state.y2, '#3b82f6', 2);
    }

    updateHandles();
    updateCoordsBadge();
    updateBezierText();
  }

  function refreshCustomUI() {
    if (state.graphMode !== 'custom') return;
    MF.renderCustomHandles(customHandles, state, toPixels, customHandleHandlers);
    MF.renderSegmentInputs(customSegInp, state, function () {
      refreshCustomUI();
      redrawAll();
      runPreviewAnimation();
      MF.saveModeParams(state);
    });
  }

  function hideMarqueeBox() {
    if (marqueeBox) marqueeBox.style.display = 'none';
  }

  function updateMarqueeBox(x0, y0, x1, y1) {
    if (!marqueeBox) return;
    var left = Math.min(x0, x1);
    var top  = Math.min(y0, y1);
    marqueeBox.style.display = 'block';
    marqueeBox.style.left   = left + 'px';
    marqueeBox.style.top    = top + 'px';
    marqueeBox.style.width  = Math.abs(x1 - x0) + 'px';
    marqueeBox.style.height = Math.abs(y1 - y0) + 'px';
  }

  /** Sincroniza clase CSS y visibilidad según modo de gráfica. */
  function updateGraphModeUI() {
    var mode = state.graphMode;
    var isSpeed = mode === 'speed';
    canvasWrapper.classList.toggle('velocity-mode', isSpeed);
    canvasWrapper.classList.toggle('custom-mode', mode === 'custom');
    canvasWrapper.classList.toggle('elastic-mode', mode === 'elastic');
    canvasWrapper.classList.toggle('bounce-mode', mode === 'bounce');
    customSegBar.classList.toggle('hidden', mode !== 'custom');
    ['graph-ease', 'graph-speed', 'graph-elastic', 'graph-bounce', 'graph-custom'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.checked = (el.value === mode);
    });
    var amToggle = document.getElementById('applyMethodToggle');
    if (amToggle) amToggle.classList.toggle('hidden', !MF.isParamMode(mode));
    if (mode === 'custom') {
      if (!state.customSelected) state.customSelected = [];
      refreshCustomUI();
    } else {
      customHandles.innerHTML = '';
      state.customSelected = [];
      hideMarqueeBox();
    }
  }

  // ── 8. Preview Animation ──────────────────────────────────────────────────

  function runPreviewAnimation() {
    if (state.previewRaf) cancelAnimationFrame(state.previewRaf);

    var track    = document.getElementById('previewTrack');
    var margin   = 5;
    var duration = 1800;  // ms
    var delay    = 500;   // ms pause between loops
    var startTime = null;

    function frame(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      if (elapsed > duration + delay) { startTime = ts; elapsed = 0; }

      var progress = Math.min(elapsed / duration, 1.0);
      var trackW   = track.clientWidth - margin * 4;
      var yVal;
      if (state.graphMode === 'ease' || state.graphMode === 'speed') {
        yVal = bezierYatT(solveTforX(progress));
      } else {
        yVal = MF.evaluate(state.graphMode, progress, state);
      }
      var xPx      = margin + yVal * trackW;
      xPx = Math.max(-margin, Math.min(trackW + margin * 3, xPx));
      previewBall.style.left = xPx + 'px';

      state.previewRaf = requestAnimationFrame(frame);
    }
    state.previewRaf = requestAnimationFrame(frame);
  }

  // ── 9. Library / Storage ──────────────────────────────────────────────────

  function migrateLibraryPresets(lib) {
    if (!lib || !lib.presets) return;
    lib.presets.forEach(function (p) { MF.migratePreset(p); });
  }

  function loadLibraries() {
    try {
      var raw = localStorage.getItem(KEY_LIBRARIES);
      state.libraries = raw ? JSON.parse(raw) : [];
    } catch (e) { state.libraries = []; }

    state.libraries.forEach(migrateLibraryPresets);

    if (state.libraries.length === 0) {
      try {
        var legacy = localStorage.getItem(KEY_LIBRARIES_LEGACY) ||
          localStorage.getItem(KEY_LIBRARIES_LEGACY2);
        if (legacy) state.libraries = JSON.parse(legacy);
      } catch (e) {}
    }
    if (state.libraries.length === 0) {
      state.libraries.push({ name: 'SmoothMotion Defaults', presets: DEFAULT_PRESETS.slice() });
    }
    renderLibraryDropdown();
    renderPresetsGrid();
  }

  function saveLibraries() {
    try { localStorage.setItem(KEY_LIBRARIES, JSON.stringify(state.libraries)); } catch (e) {}
  }

  function getActiveLib() { return state.libraries[state.libIndex] || null; }

  function renderLibraryDropdown() {
    ddLibraries.innerHTML = '';
    state.libraries.forEach(function (lib, i) {
      var opt = document.createElement('option');
      opt.value      = i;
      opt.textContent = lib.name;
      if (i === state.libIndex) opt.selected = true;
      ddLibraries.appendChild(opt);
    });
  }

  // Library selector change
  ddLibraries.addEventListener('change', function () {
    state.libIndex = parseInt(this.value, 10);
    state.selectedPreset = -1;
    renderPresetsGrid();
  });

  // New library
  document.getElementById('btn-new-lib').addEventListener('click', function () {
    var name = prompt('Library name:', 'My Library');
    if (!name || !name.trim()) return;
    state.libraries.push({ name: name.trim(), presets: [] });
    state.libIndex = state.libraries.length - 1;
    saveLibraries();
    renderLibraryDropdown();
    renderPresetsGrid();
  });

  // Convert a .flow preset entry → SmoothMotion preset object
  function flowEntryToPreset(entry) {
    if (!entry || !Array.isArray(entry.value) || entry.value.length < 4) return null;
    return {
      name: String(entry.name || 'Preset'),
      mode: 'ease',
      x1: +entry.value[0],
      y1: +entry.value[1],
      x2: +entry.value[2],
      y2: +entry.value[3],
      cat: 'imported'
    };
  }

  // Parse raw text → library object; supports .json (our format) and .flow
  function parseImportedLibrary(text, fileName) {
    var data = JSON.parse(text);
    var baseName = fileName.replace(/\.(json|flow)$/i, '');

    // Native .flow format: array of { _id, name, value:[x1,y1,x2,y2] }
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].value)) {
      var presets = [];
      data.forEach(function (entry) {
        var p = flowEntryToPreset(entry);
        if (p) presets.push(p);
      });
      if (!presets.length) throw new Error('No hay presets válidos en el archivo .flow');
      return { name: baseName, presets: presets };
    }

    // Our JSON library format: { name, presets: [...] }
    if (!Array.isArray(data) && data.name && Array.isArray(data.presets)) {
      return data;
    }

    // Bare JSON array of our preset objects
    if (Array.isArray(data)) {
      return { name: baseName, presets: data };
    }

    throw new Error('Formato no reconocido');
  }

  // Import library (.json or .flow)
  document.getElementById('btn-import-lib').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.flow';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = parseImportedLibrary(ev.target.result, file.name);
          if (!data.name || !Array.isArray(data.presets)) throw new Error('Formato inválido');
          migrateLibraryPresets(data);
          state.libraries.push(data);
          state.libIndex = state.libraries.length - 1;
          saveLibraries();
          renderLibraryDropdown();
          renderPresetsGrid();
          motionFlowToast('✓ ' + data.presets.length + ' presets importados — ' + data.name, 3500);
        } catch (err) {
          alert('Error al importar: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // Export library — abre el explorador nativo de guardar (ExtendScript File.saveDialog)
  document.getElementById('btn-export-lib').addEventListener('click', function () {
    var lib = getActiveLib();
    if (!lib) return;
    var jsonStr  = JSON.stringify(lib, null, 2);
    var fileName = lib.name.replace(/\s+/g, '_') + '.json';

    // ExtendScript abre el diálogo nativo y devuelve la ruta elegida (fsName) o vacío si cancela
    var dialogScript =
      '(function(){' +
      '  var f = File.saveDialog("Exportar biblioteca SmoothMotion", "JSON:*.json,Todos:*.*");' +
      '  if (!f) return "";' +
      '  var p = f.fsName || decodeURIComponent(f.absoluteURI.replace(/^\\/c\\//, "c:/").replace(/\\//g,"/"));' +
      '  if (p && !/\\.json$/i.test(p)) p += ".json";' +
      '  return p;' +
      '})()';

    cs.evalScript(dialogScript, function (chosenPath) {
      // evalScript devuelve 'undefined' (string) si cancela o hay error
      if (!chosenPath || chosenPath === 'undefined' || chosenPath.trim() === '') return;

      try {
        var fs = require('fs');
        // Normalizar separadores en Windows
        chosenPath = chosenPath.replace(/\//g, require('path').sep);
        fs.writeFileSync(chosenPath, jsonStr, 'utf8');
        motionFlowToast('✓ Exportado: ' + require('path').basename(chosenPath), 3500);
      } catch (e) {
        alert('No se pudo guardar el archivo:\n' + e.message);
      }
    });
  });

  // Delete library
  document.getElementById('btn-delete-lib').addEventListener('click', function () {
    if (state.libraries.length <= 1) { alert('Cannot delete the last library.'); return; }
    var lib = getActiveLib();
    if (!lib) return;
    if (!confirm('Delete library "' + lib.name + '"?')) return;
    state.libraries.splice(state.libIndex, 1);
    state.libIndex = Math.max(0, state.libIndex - 1);
    saveLibraries();
    renderLibraryDropdown();
    renderPresetsGrid();
  });

  // ── 10. Preset Cards Rendering ────────────────────────────────────────────

  /** Carga un preset en el estado y refresca la UI. */
  function loadPreset(preset) {
    MF.applyPreset(state, preset);
    state.userZoomed  = false;
    state.speedZoomed = false;
    try { localStorage.setItem(KEY_GRAPH_MODE, state.graphMode); } catch (e) {}
    state.dragStartX1 = state.x1; state.dragStartY1 = state.y1;
    state.dragStartX2 = state.x2; state.dragStartY2 = state.y2;
    updateGraphModeUI();
    if (state.graphMode === 'custom') refreshCustomUI();
    redrawAll();
    runPreviewAnimation();
    MF.saveModeParams(state);
  }

  /** Dibuja preview del preset en capa fantasma. */
  function drawPresetPreview(preset) {
    var snap = MF.snapshotState(state);
    MF.applyPreset(state, preset);
    autoFitZoom();
    clearCtx(ctxLast);
    MF.drawPresetCurve(ctxLast, toPixels, preset, 'rgba(59,130,246,0.85)', 2, null, true);
    MF.restoreState(state, snap);
    autoFitZoom();
  }

  /** Limpia la capa fantasma. */
  function clearPresetPreview() {
    clearCtx(ctxLast);
  }

  /** Renders all preset cards (re-uses .preset / .svgContainer / .deleteBtn / span CSS). */
  function renderPresetsGrid() {
    var searchEl = document.getElementById('search-presets');
    var query    = (searchEl ? searchEl.value : '').trim().toLowerCase();
    presetsGrid.innerHTML = '';

    var lib = getActiveLib();
    if (!lib) return;

    lib.presets.forEach(function (preset, idx) {
      MF.migratePreset(preset);
      if (!MF.presetMatchesFilter(preset, state.activeCat)) return;
      if (query && preset.name.toLowerCase().indexOf(query) === -1) return;

      var card = document.createElement('div');
      card.className    = 'preset' + (idx === state.selectedPreset ? ' selected' : '');
      card.dataset.index = idx;
      card.title = MF.modeLabel(MF.presetMode(preset)) + ' · ' + preset.name;

      var svgWrap = document.createElement('div');
      svgWrap.className = 'svgContainer';
      svgWrap.style.width  = CARD_SIZE + 'px';
      svgWrap.style.height = CARD_SIZE + 'px';
      svgWrap.appendChild(MF.makePresetSVG(preset));

      var modeBadge = document.createElement('span');
      modeBadge.className = 'preset-mode-badge';
      modeBadge.textContent = MF.modeLabel(MF.presetMode(preset)).slice(0, 3);

      var nameSpan = document.createElement('span');
      nameSpan.textContent = preset.name;

      // Delete button — class "deleteBtn" matches preset.css
      var delBtn = document.createElement('button');
      delBtn.className = 'deleteBtn';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        lib.presets.splice(idx, 1);
        if (state.selectedPreset === idx) state.selectedPreset = -1;
        saveLibraries();
        renderPresetsGrid();
      });

      svgWrap.appendChild(modeBadge);
      card.appendChild(svgWrap);
      card.appendChild(nameSpan);
      card.appendChild(delBtn);

      card.addEventListener('mouseenter', function () { drawPresetPreview(preset); });
      card.addEventListener('mouseleave', function () { clearPresetPreview(); });

      card.addEventListener('click', function () {
        state.selectedPreset = idx;
        loadPreset(preset);
        renderPresetsGrid();
      });

      card.addEventListener('dblclick', function (e) {
        e.preventDefault();
        loadPreset(preset);
        applyEase(false);
      });

      // ── Drag-and-drop reordering ──
      card.setAttribute('draggable', 'true');

      card.addEventListener('dragstart', function (e) {
        state.dragPresetIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(function () { card.classList.add('dragging'); }, 0);
      });

      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        presetsGrid.querySelectorAll('.preset').forEach(function (c) {
          c.classList.remove('drag-over');
        });
      });

      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var src = state.dragPresetIdx;
        if (src !== -1 && src !== idx) {
          presetsGrid.querySelectorAll('.preset').forEach(function (c) {
            c.classList.remove('drag-over');
          });
          card.classList.add('drag-over');
        }
      });

      card.addEventListener('drop', function (e) {
        e.preventDefault();
        var src = state.dragPresetIdx;
        if (src !== -1 && src !== idx) {
          var moved = lib.presets.splice(src, 1)[0];
          lib.presets.splice(idx, 0, moved);
          if (state.selectedPreset === src) state.selectedPreset = idx;
          saveLibraries();
          renderPresetsGrid();
        }
        state.dragPresetIdx = -1;
      });

      presetsGrid.appendChild(card);
    });
  }

  // ── 11. Recent Curves ─────────────────────────────────────────────────────

  function loadRecentCurves() {
    try {
      var raw = localStorage.getItem(KEY_RECENT);
      if (!raw) raw = localStorage.getItem(KEY_RECENT_LEGACY);
      if (!raw) raw = localStorage.getItem(KEY_RECENT_LEGACY2);
      state.recentCurves = raw ? JSON.parse(raw) : [];
    } catch (e) { state.recentCurves = []; }
    renderRecentRow();
  }

  function addRecentCurve(x1, y1, x2, y2) {
    // Remove near-duplicates (tolerance 0.001)
    state.recentCurves = state.recentCurves.filter(function (c) {
      return !(Math.abs(c.x1 - x1) < 0.001 && Math.abs(c.y1 - y1) < 0.001 &&
               Math.abs(c.x2 - x2) < 0.001 && Math.abs(c.y2 - y2) < 0.001);
    });
    state.recentCurves.unshift({ mode: 'ease', x1: x1, y1: y1, x2: x2, y2: y2 });
    if (state.recentCurves.length > 8) state.recentCurves.length = 8;
    try { localStorage.setItem(KEY_RECENT, JSON.stringify(state.recentCurves)); } catch (e) {}
    renderRecentRow();
  }

  function renderRecentRow() {
    var row = document.getElementById('recent-row');
    if (!row) return;
    row.innerHTML = '';
    if (state.recentCurves.length === 0) { row.style.display = 'none'; return; }
    row.style.display = 'flex';

    state.recentCurves.forEach(function (curve) {
      var card = document.createElement('div');
      card.className = 'recent-card';
      card.title = curve.x1.toFixed(2) + ', ' + curve.y1.toFixed(2) + ', ' +
                   curve.x2.toFixed(2) + ', ' + curve.y2.toFixed(2);

      card.appendChild(MF.makePresetSVG(curve));

      card.addEventListener('mouseenter', function () { drawPresetPreview(curve); });
      card.addEventListener('mouseleave', function () { clearPresetPreview(); });
      card.addEventListener('click', function () {
        loadPreset(curve);
      });

      row.appendChild(card);
    });
  }

  // ── 12. Apply Ease to After Effects ───────────────────────────────────────

  function applyEase(isLiveSync) {
    if (!isLiveSync && (state.graphMode === 'ease' || state.graphMode === 'speed')) {
      addRecentCurve(state.x1, state.y1, state.x2, state.y2);
    }

    var dir = document.querySelector('input[name="easeDir"]:checked').value;
    if (dir === 'both') dir = 'all';

    function onResult(res) {
      var data = parseEvalResult(res);
      if (data && data.ok) {
        if (!isLiveSync) flashApply();
      } else if (!isLiveSync) {
        alert('Apply failed: ' + (data ? data.error : 'Unknown error'));
      }
    }

    if (state.graphMode === 'elastic' || state.graphMode === 'bounce' || state.graphMode === 'custom') {
      MF.applyCurveMode(state, cs, dir, onResult);
      return;
    }

    var script = 'EC_applyEase(' +
      state.x1 + ',' + state.y1 + ',' +
      state.x2 + ',' + state.y2 + ',' +
      '"' + dir + '")';
    cs.evalScript(script, onResult);
  }

  function flashApply() {
    var btn = document.getElementById('btn-apply');
    if (!btn) return;
    btn.classList.add('apply-success');
    setTimeout(function () { btn.classList.remove('apply-success'); }, 600);
  }

  /** Master "set curve values" — updates state, redraws, triggers live sync. */
  function setValues(x1, y1, x2, y2) {
    state.x1 = +x1; state.y1 = +y1;
    state.x2 = +x2; state.y2 = +y2;

    state.dragStartX1 = state.x1; state.dragStartY1 = state.y1;
    state.dragStartX2 = state.x2; state.dragStartY2 = state.y2;
    state.speedZoomed = false;

    redrawAll();
    runPreviewAnimation();
    if (chkLiveSync.checked && state.graphMode !== 'custom') applyEase(true);
  }

  // ── 13. Control Point Drag ────────────────────────────────────────────────

  function startDrag(e, cpIdx) {
    e.preventDefault();
    e.stopPropagation();

    state.dragStartX1 = state.x1; state.dragStartY1 = state.y1;
    state.dragStartX2 = state.x2; state.dragStartY2 = state.y2;
    state.dragging    = true;
    state.dragTarget  = cpIdx;
    if (state.graphMode === 'speed') state.speedZoomed = false;

    var rect = canvasWrapper.getBoundingClientRect();
    state.dragStartX    = e.clientX - rect.left;
    state.dragStartY    = e.clientY - rect.top;
    state.dragStartZoom = camera.zoom;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  }

  var lastSyncTime = 0;
  function debouncedLiveSync() {
    if (!chkLiveSync.checked) return;
    if (state.graphMode === 'custom') return;
    var now = Date.now();
    if (now - lastSyncTime > 100) { applyEase(true); lastSyncTime = now; }
  }

  function beginPointerDrag(e) {
    state.dragging = true;
    var rect = canvasWrapper.getBoundingClientRect();
    state.dragStartX    = e.clientX - rect.left;
    state.dragStartY    = e.clientY - rect.top;
    state.dragStartZoom = camera.zoom;
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  }

  function startCustomPointerDrag(e, kind, idx) {
    e.preventDefault();
    e.stopPropagation();
    state.customDrag = { kind: kind, idx: idx };
    state.marquee    = null;
    var indices = kind === 'anchor' && state.customSelected && state.customSelected.length > 1
      ? state.customSelected.slice()
      : [idx];
    state.dragSnap = MF.snapshotDragPositions(state, indices);
    beginPointerDrag(e);
  }

  function startMarquee(e) {
    e.preventDefault();
    var rect = canvasWrapper.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;
    state.marquee = { startX: sx, startY: sy, addTo: e.shiftKey };
    state.customDrag = null;
    state.dragging = true;
    updateMarqueeBox(sx, sy, sx, sy);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  }

  function onDragMove(e) {
    var rect  = canvasWrapper.getBoundingClientRect();
    var curX  = e.clientX - rect.left;
    var curY  = e.clientY - rect.top;

    // Pan mode (middle-click or Alt+left-click) — solo en modo Ease
    if (state.panning) {
      if (state.graphMode !== 'speed') {
        var dx    = curX - state.panStartX;
        var dy    = curY - state.panStartY;
        var scale = state.cw / (ASPECT / state.camStartZoom);
        camera.ox = state.camStartOX - dx / scale;
        camera.oy = state.camStartOY + dy / scale;
      }
      redrawAll();
      return;
    }

    if (state.marquee) {
      updateMarqueeBox(state.marquee.startX, state.marquee.startY, curX, curY);
      return;
    }

    if (!state.dragging) return;

    var dxPx  = curX - state.dragStartX;
    var dyPx  = curY - state.dragStartY;
    var newX, newY;
    var scale, dxC, dyC, coords;

    if (state.customDrag) {
      coords = toCoords(
        state.dragStartX + dxPx,
        state.dragStartY + dyPx
      );
      MF.onCustomDragAbsolute(
        state,
        state.customDrag.kind,
        state.customDrag.idx,
        coords.x,
        coords.y,
        state.dragSnap
      );
      redrawAll();
      return;
    }

    if (state.graphMode === 'elastic' || state.graphMode === 'bounce') {
      scale = state.cw / (ASPECT / state.dragStartZoom);
      dxC = dxPx / scale;
      dyC = -dyPx / scale;
      coords = toCoords(
        state.dragStartX + dxPx,
        state.dragStartY + dyPx
      );
      MF.onParamDrag(state, state.dragTarget, coords.x, coords.y);
      redrawAll();
      debouncedLiveSync();
      return;
    }

    if (state.graphMode === 'speed') {
      // Solo movimiento horizontal (influencia)
      var plot   = speedPlotRect();
      var dxNorm = dxPx / plot.w;
      newX = (state.dragTarget === 1 ? state.dragStartX1 : state.dragStartX2) + dxNorm;
      if (e.shiftKey) newX = Math.round(newX * 10) / 10;
      if (state.dragTarget === 1) {
        state.x1 = Math.max(0.0, Math.min(1.0, newX));
      } else {
        state.x2 = Math.max(0.0, Math.min(1.0, newX));
      }
      redrawAll();
      debouncedLiveSync();
      return;
    }

    var scale = state.cw / (ASPECT / state.dragStartZoom);
    var dxC   =  dxPx / scale;
    var dyC   = -dyPx / scale;
    newX = (state.dragTarget === 1 ? state.dragStartX1 : state.dragStartX2) + dxC;
    newY = (state.dragTarget === 1 ? state.dragStartY1 : state.dragStartY2) + dyC;

    if (e.shiftKey) {
      newX = Math.round(newX * 10) / 10;
      newY = Math.round(newY * 10) / 10;
    }

    if (state.dragTarget === 1) {
      state.x1 = Math.max(0.0, Math.min(1.0, newX));
      state.y1 = newY;
    } else {
      state.x2 = Math.max(0.0, Math.min(1.0, newX));
      state.y2 = newY;
    }

    redrawAll();
    debouncedLiveSync();
  }

  function onDragEnd(e) {
    if (state.marquee) {
      var rect = canvasWrapper.getBoundingClientRect();
      var endX = e ? e.clientX - rect.left : state.marquee.startX;
      var endY = e ? e.clientY - rect.top  : state.marquee.startY;
      var found = MF.getAnchorsInRect(
        state, toPixels,
        state.marquee.startX, state.marquee.startY, endX, endY
      );
      if (state.marquee.addTo) {
        found.forEach(function (idx) {
          if (state.customSelected.indexOf(idx) === -1) {
            state.customSelected.push(idx);
          }
        });
      } else {
        state.customSelected = found;
      }
      state.marquee = null;
      hideMarqueeBox();
      refreshCustomUI();
    }
    if (state.panning) {
      state.panning = false;
      document.body.style.cursor = '';
    } else if (state.dragging) {
      var wasCustomDrag = !!state.customDrag;
      state.dragging   = false;
      state.dragTarget = null;
      state.customDrag = null;
      state.dragSnap   = null;
      if (MF.isParamMode(state.graphMode)) {
        MF.saveModeParams(state);
        if (wasCustomDrag) refreshCustomUI();
      }
      if (chkLiveSync.checked && state.graphMode !== 'custom') applyEase(true);
    }
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragEnd);
    redrawAll();
    runPreviewAnimation();
  }

  cp1El.addEventListener('mousedown', function (e) { startDrag(e, 1); });
  cp2El.addEventListener('mousedown', function (e) { startDrag(e, 2); });

  // Pan (middle-click or Alt+left-click) / marquee (custom mode)
  canvasWrapper.addEventListener('mousedown', function (e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      state.panning    = true;
      state.userZoomed = true;
      var rect = canvasWrapper.getBoundingClientRect();
      state.panStartX  = e.clientX - rect.left;
      state.panStartY  = e.clientY - rect.top;
      state.camStartOX = camera.ox;
      state.camStartOY = camera.oy;
      state.camStartZoom = camera.zoom;
      document.body.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup',   onDragEnd);
      return;
    }
    if (state.graphMode === 'custom' && e.button === 0) {
      var t = e.target;
      if (t === canvas || t === canvasLast || t === canvasWrapper || t.id === 'marqueeBox') {
        if (!e.shiftKey) state.customSelected = [];
        startMarquee(e);
      }
    }
  });

  // Zoom on scroll
  canvasWrapper.addEventListener('wheel', function (e) {
    e.preventDefault();
    state.userZoomed = true;

    if (state.graphMode === 'speed') {
      state.speedZoomed = true;
      updateSpeedView();
      var step = e.deltaY > 0 ? 1.15 : 0.85;
      speedView.maxY = Math.max(speedView.peak / 0.75, speedView.maxY * step);
      speedView.maxY = Math.max(0.5, Math.min(speedView.maxY, (speedView.peak || 1) * 4));
      speedView.maxY = niceSpeedMax(speedView.maxY);
      speedView.labelTop = Math.max(51, Math.round(speedView.maxY * 51));
      redrawAll();
      return;
    }

    var rect  = canvasWrapper.getBoundingClientRect();
    var atX   = e.clientX - rect.left;
    var atY   = e.clientY - rect.top;
    var atC   = toCoords(atX, atY);
    var step  = e.deltaY > 0 ? 0.85 : 1.15;
    camera.zoom *= step;
    camera.zoom = Math.max(0.1, Math.min(camera.zoom, 15.0));
    var s     = state.cw / (ASPECT / camera.zoom);
    camera.ox = atC.x - (atX - state.cw / 2.0) / s;
    camera.oy = atC.y + (atY - state.ch / 2.0) / s;
    redrawAll();
  }, { passive: false });

  // Double-click resets zoom
  canvasWrapper.addEventListener('dblclick', function (e) {
    if (e.target === cp1El || e.target === cp2El) return;
    state.userZoomed  = false;
    state.speedZoomed = false;
    autoFitZoom();
    redrawAll();
  });

  // ── 14. Divider drag (resize graph / library panels) ──────────────────────

  var divider        = document.getElementById('divider');
  var isDivDragging  = false;
  var divStartPos    = 0;
  var divStartSize   = 0;
  var divLandscape   = false;

  divider.addEventListener('mousedown', function (e) {
    isDivDragging = true;
    divLandscape  = container.classList.contains('landscape');
    divStartPos   = divLandscape ? e.clientX : e.clientY;
    divStartSize  = divLandscape ? graphPanel.offsetWidth : graphPanel.offsetHeight;
    document.body.style.cursor = divLandscape ? 'ew-resize' : 'ns-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDivDragging) return;
    var cur   = divLandscape ? e.clientX : e.clientY;
    var total = divLandscape ? window.innerWidth : window.innerHeight;
    var size  = Math.max(160, Math.min(total - 160, divStartSize + (cur - divStartPos)));
    if (divLandscape) {
      graphPanel.style.width = size + 'px';
    } else {
      graphPanel.style.height = size + 'px';
    }
    graphPanel.style.flex = 'none';
    resizeCanvas();
  });

  document.addEventListener('mouseup', function () {
    if (!isDivDragging) return;
    isDivDragging = false;
    document.body.style.cursor = '';
  });

  // ── 15. Modals ────────────────────────────────────────────────────────────

  var editModal     = document.getElementById('modal-overlay');
  var saveModal     = document.getElementById('save-modal-overlay');
  var settingsModal = document.getElementById('settings-modal-overlay');

  // Bezier values → edit modal (solo en modos bezier)
  bezierValues.addEventListener('click', function () {
    if (MF.isParamMode(state.graphMode)) return;
    editModal.classList.add('open');
    document.getElementById('inp-x1').value = state.x1;
    document.getElementById('inp-y1').value = state.y1;
    document.getElementById('inp-x2').value = state.x2;
    document.getElementById('inp-y2').value = state.y2;
  });

  document.getElementById('modal-cancel').addEventListener('click', function () {
    editModal.classList.remove('open');
  });
  document.getElementById('modal-ok').addEventListener('click', function () {
    var x1 = parseFloat(document.getElementById('inp-x1').value);
    var y1 = parseFloat(document.getElementById('inp-y1').value);
    var x2 = parseFloat(document.getElementById('inp-x2').value);
    var y2 = parseFloat(document.getElementById('inp-y2').value);
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      alert('Invalid numbers entered.'); return;
    }
    setValues(x1, y1, x2, y2);
    editModal.classList.remove('open');
  });
  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) editModal.classList.remove('open');
  });

  // Save preset modal
  document.getElementById('btn-save').addEventListener('click', function () {
    saveModal.classList.remove('hidden');
    saveModal.style.display = 'flex';
    document.getElementById('preset-name-inp').value = '';
    var catInp = document.getElementById('preset-cat-inp');
    var defaultCat = MF.defaultCatForMode(state.graphMode);
    var i, opts = catInp.options;
    for (i = 0; i < opts.length; i++) {
      if (opts[i].value === defaultCat) { catInp.selectedIndex = i; break; }
    }
    var modeLbl = document.getElementById('save-preset-mode');
    if (modeLbl) modeLbl.textContent = MF.modeLabel(state.graphMode);
  });
  document.getElementById('save-modal-cancel').addEventListener('click', function () {
    saveModal.classList.add('hidden');
    saveModal.style.display = 'none';
  });
  document.getElementById('save-modal-ok').addEventListener('click', function () {
    var name = document.getElementById('preset-name-inp').value.trim();
    var cat  = document.getElementById('preset-cat-inp').value;
    if (!name) { alert('Please enter a preset name.'); return; }
    var lib = getActiveLib();
    if (!lib) return;
    lib.presets.push(MF.capturePreset(state, name, cat));
    saveLibraries();
    renderPresetsGrid();
    saveModal.classList.add('hidden');
    saveModal.style.display = 'none';
  });
  saveModal.addEventListener('click', function (e) {
    if (e.target === saveModal) { saveModal.classList.add('hidden'); saveModal.style.display = 'none'; }
  });

  // Settings modal
  function updateLicenseStatusUI() {
    var statusEl = document.getElementById('settings-license-status');
    if (!statusEl || !window.SM_license) return;
    var stored = window.SM_license.getStoredLicense();
    if (stored && stored.license && window.SM_license.isActivated()) {
      statusEl.textContent = stored.license + ' · v' + stored.max_version;
      statusEl.style.color = 'var(--ec-text-primary)';
    } else if (stored && stored.license) {
      statusEl.textContent = stored.license + ' · requiere actualización';
      statusEl.style.color = '#f0ad4e';
    } else {
      statusEl.textContent = 'No activada';
      statusEl.style.color = 'var(--ec-text-muted)';
    }
  }

  document.getElementById('btn-settings').addEventListener('click', function () {
    settingsModal.classList.remove('hidden');
    settingsModal.style.display = 'flex';
    updateLicenseStatusUI();
  });
  document.getElementById('settings-modal-close').addEventListener('click', function () {
    settingsModal.classList.add('hidden');
    settingsModal.style.display = 'none';
  });
  settingsModal.addEventListener('click', function (e) {
    if (e.target === settingsModal) { settingsModal.classList.add('hidden'); settingsModal.style.display = 'none'; }
  });

  var DISCORD_SUPPORT_URL = 'https://discord.gg/eV8xHpq2Np';
  document.getElementById('btn-support-discord').addEventListener('click', function () {
    if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
      window.cep.util.openURLInDefaultBrowser(DISCORD_SUPPORT_URL);
    } else {
      cs.openURLInDefaultBrowser(DISCORD_SUPPORT_URL);
    }
  });

  var btnChangeLicense = document.getElementById('btn-change-license');
  if (btnChangeLicense && window.SM_license) {
    btnChangeLicense.addEventListener('click', function () {
      settingsModal.classList.add('hidden');
      settingsModal.style.display = 'none';
      window.SM_license.deactivate();
    });
  }

  // ESC / Enter / Delete global shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      editModal.classList.remove('open');
      saveModal.classList.add('hidden'); saveModal.style.display = 'none';
      settingsModal.classList.add('hidden'); settingsModal.style.display = 'none';
      if (state.graphMode === 'custom') {
        state.customSelected = [];
        refreshCustomUI();
      }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.graphMode === 'custom') {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;
      if (MF.removeSelectedPoints(state)) {
        refreshCustomUI();
        redrawAll();
        runPreviewAnimation();
        MF.saveModeParams(state);
      }
      e.preventDefault();
    }
    if (e.key === 'Enter') {
      if (editModal.classList.contains('open')) {
        document.getElementById('modal-ok').click();
      } else if (saveModal.style.display === 'flex') {
        document.getElementById('save-modal-ok').click();
      }
    }
  });

  // ── 16. Control Buttons ───────────────────────────────────────────────────

  function rnd(lo, hi) { return Math.round((lo + Math.random() * (hi - lo)) * 100) / 100; }

  document.getElementById('btn-randomize').addEventListener('click', function () {
    if (state.graphMode === 'elastic') {
      state.elastic = { amp: rnd(0.35, 0.92), freq: rnd(0.15, 0.85) };
      MF.saveModeParams(state);
      redrawAll(); runPreviewAnimation();
      return;
    }
    if (state.graphMode === 'bounce') {
      state.bounce = { amp: rnd(0.25, 0.90), damp: rnd(0.15, 0.80) };
      MF.saveModeParams(state);
      redrawAll(); runPreviewAnimation();
      return;
    }
    if (state.graphMode === 'custom') {
      for (var i = 1; i < state.customPoints.length - 1; i++) {
        state.customPoints[i].y = rnd(-0.2, 1.3);
      }
      MF.saveModeParams(state);
      refreshCustomUI(); redrawAll(); runPreviewAnimation();
      return;
    }
    setValues(rnd(0, 0.9), rnd(-0.5, 1.5), rnd(0.1, 1.0), rnd(-0.5, 1.5));
  });

  document.getElementById('btn-invert').addEventListener('click', function () {
    if (MF.isParamMode(state.graphMode)) return;
    setValues(1 - state.x2, 1 - state.y2, 1 - state.x1, 1 - state.y1);
  });

  document.getElementById('btn-apply').addEventListener('click', function () {
    applyEase(false);
  });

  // Read keyframe from AE (btn is hidden in DOM but wired up)
  document.getElementById('btn-read').addEventListener('click', function () {
    cs.evalScript('EC_readKeyframe()', function (res) {
      var data = parseEvalResult(res);
      if (data && data.ok && typeof data.x1 === 'number') {
        setValues(data.x1, data.y1, data.x2, data.y2);
      } else if (data && !data.ok && !data.assumed) {
        alert('Could not read keyframes: ' + (data.error || 'Unknown error'));
      }
    });
  });

  // Search
  var searchEl = document.getElementById('search-presets');
  if (searchEl) searchEl.addEventListener('input', function () { renderPresetsGrid(); });

  // Category tabs
  document.querySelectorAll('.cat-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.cat-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      state.activeCat = tab.dataset.cat;
      renderPresetsGrid();
    });
  });

  // ── 17. Language / Translations ───────────────────────────────────────────

  var TRANSLATIONS = {
    en: {
      apply: 'Apply',   lang: 'Language:',
      support: 'Support', close: 'Close', invert: 'Invert Curve',
      tAll: 'All', tEase: 'Ease', tSpeed: 'Speed', tElastic: 'Elastic',
      tPower: 'Power', tBack: 'Back', tFilm: 'Film', tBounce: 'Bounce', tCustom: 'Custom',
      graphEase: 'Ease', graphSpeed: 'Speed', graphElastic: 'Elastic',
      graphBounce: 'Bounce', graphCustom: 'Custom',
      tipGraphEase: 'Easing curve', tipGraphSpeed: 'Speed graph (AE style)',
      tipGraphElastic: 'Elastic curve (expression)', tipGraphBounce: 'Bounce curve (expression)',
      tipGraphCustom: 'Custom curve: inserts keyframes proportionally', customSeg: 'Seg. weight:',
      navFlow: 'SmoothCurves', navScripts: 'SmoothTools'
    },
    es: {
      apply: 'APLICAR', lang: 'Idioma:',
      support: 'Soporte', close: 'Cerrar', invert: 'Invertir Curva',
      tAll: 'Todo', tEase: 'Suave', tSpeed: 'Vel.', tElastic: 'Elastic',
      tPower: 'Fuerza', tBack: 'Atrás', tFilm: 'Cine', tBounce: 'Bounce', tCustom: 'Custom',
      graphEase: 'Curva', graphSpeed: 'Vel.', graphElastic: 'Elastic',
      graphBounce: 'Bounce', graphCustom: 'Custom',
      tipGraphEase: 'Curva de easing', tipGraphSpeed: 'Gráfica de velocidad (estilo AE)',
      tipGraphElastic: 'Curva elástica (expresión)', tipGraphBounce: 'Curva rebote (expresión)',
      tipGraphCustom: 'Curva personalizada: inserta keys proporcionales', customSeg: 'Peso seg.:',
      navFlow: 'SmoothCurves', navScripts: 'SmoothTools'
    }
  };

  var langSelect  = document.getElementById('lang-select');
  var activeLang  = localStorage.getItem('SmoothMotion_Lang') ||
    localStorage.getItem('MotionBro_Lang') ||
    localStorage.getItem('MotionFlow_Lang') ||
    localStorage.getItem('FlowEase_Lang') ||
    localStorage.getItem('EC_Lang') ||
    'es';
  langSelect.value = activeLang;

  function applyTranslations() {
    var d = TRANSLATIONS[activeLang] || TRANSLATIONS['en'];
    document.getElementById('btn-apply').textContent = d.apply;
    document.getElementById('txt-lang').textContent  = d.lang;
    document.getElementById('settings-modal-close').textContent = d.close;
    document.getElementById('txt-support').textContent = d.support;
    document.getElementById('btn-invert').setAttribute('data-tooltip', d.invert);

    document.querySelector('.cat-tab[data-cat="all"]').textContent        = d.tAll;
    document.querySelector('.cat-tab[data-cat="ease"]').textContent       = d.tEase;
    document.querySelector('.cat-tab[data-cat="speed"]').textContent      = d.tSpeed;
    document.querySelector('.cat-tab[data-cat="elastic"]').textContent    = d.tElastic;
    document.querySelector('.cat-tab[data-cat="bounce"]').textContent     = d.tBounce;
    document.querySelector('.cat-tab[data-cat="custom"]').textContent    = d.tCustom;
    document.querySelector('.cat-tab[data-cat="power"]').textContent     = d.tPower;
    document.querySelector('.cat-tab[data-cat="back"]').textContent       = d.tBack;
    document.querySelector('.cat-tab[data-cat="cinematic"]').textContent  = d.tFilm;

    document.getElementById('lbl-graph-ease').textContent    = d.graphEase;
    document.getElementById('lbl-graph-speed').textContent   = d.graphSpeed;
    document.getElementById('lbl-graph-elastic').textContent = d.graphElastic;
    document.getElementById('lbl-graph-bounce').textContent  = d.graphBounce;
    document.getElementById('lbl-graph-custom').textContent  = d.graphCustom;
    document.getElementById('lbl-graph-ease').setAttribute('data-tooltip', d.tipGraphEase);
    document.getElementById('lbl-graph-speed').setAttribute('data-tooltip', d.tipGraphSpeed);
    document.getElementById('lbl-graph-elastic').setAttribute('data-tooltip', d.tipGraphElastic);
    document.getElementById('lbl-graph-bounce').setAttribute('data-tooltip', d.tipGraphBounce);
    document.getElementById('lbl-graph-custom').setAttribute('data-tooltip', d.tipGraphCustom);
      var lcs = document.getElementById('lbl-custom-segments');
      if (lcs) lcs.textContent = d.customSeg;
    var navFlow = document.getElementById('mb-nav-flow');
    var navScripts = document.getElementById('mb-nav-scripts');
    if (navFlow) navFlow.textContent = d.navFlow;
    if (navScripts) navScripts.textContent = d.navScripts;
  }

  document.querySelectorAll('input[name="graphMode"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!this.checked) return;
      var prevMode = state.graphMode;
      state.graphMode = this.value;
      state.userZoomed  = false;
      state.speedZoomed = false;
      try { localStorage.setItem(KEY_GRAPH_MODE, state.graphMode); } catch (e) {}
      updateGraphModeUI();
      redrawAll();
      clearCtx(ctxLast);
      runPreviewAnimation();
      if (MF.isParamMode(prevMode) && (state.graphMode === 'ease' || state.graphMode === 'speed')) {
        cs.evalScript('EC_clearSelectedExpressions()', function () { applyEase(true); });
      }
    });
  });

  function setApplyMethod(method) {
    state.applyMethod = (method === 'keys') ? 'keys' : 'expr';
    try { localStorage.setItem(KEY_APPLY_METHOD, state.applyMethod); } catch (e) {}
    var bExpr = document.getElementById('am-expr');
    var bKeys = document.getElementById('am-keys');
    if (bExpr) bExpr.classList.toggle('active', state.applyMethod === 'expr');
    if (bKeys) bKeys.classList.toggle('active', state.applyMethod === 'keys');
  }

  ['am-expr', 'am-keys'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function () {
        setApplyMethod(this.getAttribute('data-method'));
      });
    }
  });

  try { setApplyMethod(localStorage.getItem(KEY_APPLY_METHOD) || 'expr'); } catch (e) {}

  document.getElementById('btn-add-custom-point').addEventListener('click', function () {
    if (MF.addCustomPoint(state)) {
      refreshCustomUI();
      redrawAll();
      runPreviewAnimation();
      MF.saveModeParams(state);
    }
  });

  document.getElementById('btn-del-custom-point').addEventListener('click', function () {
    if (MF.removeSelectedPoints(state)) {
      refreshCustomUI();
      redrawAll();
      runPreviewAnimation();
      MF.saveModeParams(state);
    }
  });

  langSelect.addEventListener('change', function () {
    activeLang = this.value;
    localStorage.setItem('SmoothMotion_Lang', activeLang);
    localStorage.setItem('MotionBro_Lang', activeLang);
    localStorage.setItem('MotionFlow_Lang', activeLang);
    applyTranslations();
    if (window.MB_scripts && window.MB_scripts.setLanguage) {
      window.MB_scripts.setLanguage(activeLang);
    }
  });
  applyTranslations();

  // ── 18. Canvas Resize / Orientation ───────────────────────────────────────

  var resizePending = false;
  function resizeCanvas() {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(function () {
      var parent = document.getElementById('graphPanel-top');
      if (!parent) { resizePending = false; return; }
      var width  = parent.clientWidth;
      var height = parent.clientHeight;
      var side   = Math.min(width - 16, height - 16);

      if (side <= 0) { resizePending = false; return; }

      state.cw = side;
      state.ch = side;
      canvas.width     = side; canvas.height     = side;
      canvasLast.width = side; canvasLast.height = side;

      var wrap   = document.getElementById('canvas-wrapper');
      wrap.style.width    = side + 'px';
      wrap.style.height   = side + 'px';
      wrap.style.position = 'absolute';
      wrap.style.left     = ((width  - side) / 2) + 'px';
      wrap.style.top      = ((height - side) / 2) + 'px';

      redrawAll();
      resizePending = false;
    });
  }

  function checkOrientation() {
    var w  = window.innerWidth;
    var h  = window.innerHeight;
    var or = w > h * 1.1 ? 'landscape' : 'portrait';

    if (or !== activeOrientation) {
      graphPanel.style.width  = '';
      graphPanel.style.height = '';
      graphPanel.style.flex   = '';
      if (or === 'landscape') container.classList.add('landscape');
      else                    container.classList.remove('landscape');
      activeOrientation = or;
    }
    resizeCanvas();
  }

  window.resizeCanvas = resizeCanvas;

  window.addEventListener('resize', function () {
    checkOrientation();
    runPreviewAnimation();
  });

  // ── 19. Initializer ───────────────────────────────────────────────────────

  function hideLoadingOverlay() {
    var loading = document.getElementById('overlay');
    if (!loading) return;
    loading.style.opacity = '0';
    loading.style.display = 'none';
    setTimeout(function () {
      if (loading.parentNode) loading.parentNode.removeChild(loading);
    }, 450);
  }

  function init() {
    try {
      hideLoadingOverlay();

      var standalone = window.SM_Standalone && window.SM_Standalone.module;
      var isFlowPanel = !standalone || standalone === 'flow';

      function shouldInit(mod) {
        return !standalone || standalone === mod;
      }

      if (isFlowPanel) {
        var savedGraphMode = localStorage.getItem(KEY_GRAPH_MODE);
        var validModes = ['ease', 'speed', 'elastic', 'bounce', 'custom'];
        if (validModes.indexOf(savedGraphMode) !== -1) {
          state.graphMode = savedGraphMode;
        }
        MF.loadModeParams(state);
        updateGraphModeUI();
        loadLibraries();
        loadRecentCurves();
        checkOrientation();
        redrawAll();
        runPreviewAnimation();
      }

      if (shouldInit('scripts') && window.MB_scripts && window.MB_scripts.init) window.MB_scripts.init();
      if (shouldInit('scripts') && window.MB_tools && window.MB_tools.init) window.MB_tools.init();
      if (shouldInit('comp') && window.MB_comp && window.MB_comp.init) window.MB_comp.init();
      if (shouldInit('fx') && window.MB_fx && window.MB_fx.init) window.MB_fx.init();
      if (shouldInit('color') && window.MB_color && window.MB_color.init) window.MB_color.init();
      if (shouldInit('text') && window.MB_text && window.MB_text.init) window.MB_text.init();
      if (shouldInit('type') && window.MB_type && window.MB_type.init) window.MB_type.init();
      if (shouldInit('anchor') && window.MB_anchor && window.MB_anchor.init) window.MB_anchor.init();
      if (shouldInit('export') && window.MB_export && window.MB_export.init) window.MB_export.init();
      if (window.MotionBroNav && window.MotionBroNav.init) window.MotionBroNav.init();
      if (window.MB_extras && window.MB_extras.init) window.MB_extras.init();

      if (isFlowPanel) {
        setTimeout(function () {
          checkOrientation();
          redrawAll();
          runPreviewAnimation();
        }, 200);
      }
    } catch (err) {
      var ov = document.getElementById('overlay');
      if (ov) ov.style.display = 'block';
      alert('SmoothMotion — error al iniciar\n' + err.message);
    }
  }

  function boot() {
    hideLoadingOverlay();

    if (window.SM_license && window.SM_license.waitForActivation) {
      window.SM_license.waitForActivation(init);
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
