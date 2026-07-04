/**
 * MotionFlow — Elastic / Bounce / Custom graph modes
 *
 * Custom: la única fuente de verdad de X es segmentFrames (proporciones de tiempo).
 * Apply usa expresión (como Elastic/Bounce) — N puntos muestreados de la curva.
 */
(function (global) {
  'use strict';

  var MFC = global.MotionFlowCurves;
  var MAX_POINTS = 10;
  var MIN_FRAMES = 1;

  // ── Defaults ───────────────────────────────────────────────────────────────

  /** 3 puntos: inicio · centro · fin */
  function defaultCustomPoints() {
    return [
      { x: 0,   y: 0,   outX: 0.12, outY: 0.05 },
      { x: 0.5, y: 0.5, inX: -0.1,  inY: -0.05, outX: 0.1, outY: 0.05 },
      { x: 1,   y: 1,   inX: -0.12, inY: -0.05 }
    ];
  }

  function defaultSegmentFrames(n) {
    var f = [], i;
    for (i = 0; i < n; i++) f.push(12);
    return f;
  }

  function defaultElastic() { return { amp: 0.6, freq: 0.4 }; }
  function defaultBounce()  { return { amp: 0.75, damp: 0.5 }; }

  function isParamMode(mode) {
    return mode === 'elastic' || mode === 'bounce' || mode === 'custom';
  }

  function curveParams(state) {
    return {
      x1: state.x1, y1: state.y1, x2: state.x2, y2: state.y2,
      elastic: state.elastic,
      bounce:  state.bounce,
      customPoints:   state.customPoints,
      segmentFrames:  state.segmentFrames
    };
  }

  // ── Custom: X derivada de frames (proporciones) ────────────────────────────

  function totalCustomFrames(state) {
    return MFC.totalCustomFrames(state.customPoints, state.segmentFrames);
  }

  function syncCustomX(state) {
    var total = totalCustomFrames(state);
    var acc = 0, i;
    state.customPoints[0].x = 0;
    for (i = 0; i < state.segmentFrames.length; i++) {
      acc += state.segmentFrames[i] > 0 ? state.segmentFrames[i] : 10;
      if (state.customPoints[i + 1]) {
        state.customPoints[i + 1].x = acc / total;
      }
    }
    state.customPoints[state.customPoints.length - 1].x = 1;
  }

  // ── Cámara ─────────────────────────────────────────────────────────────────

  function autoFitValueGraph(state, camera, ASPECT) {
    var minY = -0.1, maxY = 1.1, i, p;
    if (state.graphMode === 'custom') {
      for (i = 0; i < state.customPoints.length; i++) {
        p = state.customPoints[i];
        minY = Math.min(minY, p.y + (p.outY || 0), p.y + (p.inY || 0), p.y);
        maxY = Math.max(maxY, p.y + (p.outY || 0), p.y + (p.inY || 0), p.y);
      }
      minY -= 0.18; maxY += 0.18;
    } else if (state.graphMode === 'elastic') {
      minY = 0;
      maxY = 1;
      for (i = 0; i <= 100; i++) {
        p = MFC.elasticOut(i / 100, state.elastic.amp, state.elastic.freq);
        if (p < minY) minY = p;
        if (p > maxY) maxY = p;
      }
      minY = Math.max(-0.08, minY - 0.06);
      maxY = Math.min(1.55, maxY + 0.08);
      if (maxY - minY < 0.45) {
        maxY = 1.2 + MFC.clamp(state.elastic.amp, 0, 1) * 0.35;
        minY = -0.04;
      }
    } else if (state.graphMode === 'bounce') {
      minY = 0; maxY = 1.05;
      for (i = 0; i <= 60; i++) {
        p = MFC.bounceOut(i / 60, state.bounce.amp, state.bounce.damp);
        if (p < minY) minY = p;
      }
      minY -= 0.06;
      maxY = 1.06;
    }
    camera.zoom = ASPECT / Math.max(1.05, maxY - minY);
    camera.ox   = 0.5;
    camera.oy   = (minY + maxY) / 2;
  }

  // ── Dibujo ─────────────────────────────────────────────────────────────────

  /** Línea de referencia y=1 (objetivo del elastic). */
  function drawElasticTarget(c, toPixels) {
    var pL = toPixels(0, 1), pR = toPixels(1, 1);
    c.save();
    c.strokeStyle = 'rgba(96,165,250,0.28)';
    c.lineWidth = 1;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.moveTo(pL.x, pL.y);
    c.lineTo(pR.x, pR.y);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  function drawDiagonalRef(c, toPixels) {
    var p0 = toPixels(0, 0), p1 = toPixels(1, 1);
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 1;
    c.setLineDash([4, 5]);
    c.beginPath();
    c.moveTo(p0.x, p0.y);
    c.lineTo(p1.x, p1.y);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  function drawFilledCurve(c, toPixels, pts, color, fillAlpha) {
    var i, p;
    if (pts.length < 2) return;
    var base0 = toPixels(pts[0].t, 0);
    var baseN = toPixels(pts[pts.length - 1].t, 0);
    c.save();
    c.beginPath();
    c.moveTo(base0.x, base0.y);
    for (i = 0; i < pts.length; i++) {
      p = toPixels(pts[i].t, pts[i].v);
      c.lineTo(p.x, p.y);
    }
    c.lineTo(baseN.x, baseN.y);
    c.closePath();
    c.fillStyle = 'rgba(59,130,246,' + (fillAlpha || 0.12) + ')';
    c.fill();
    c.beginPath();
    p = toPixels(pts[0].t, pts[0].v);
    c.moveTo(p.x, p.y);
    for (i = 1; i < pts.length; i++) {
      p = toPixels(pts[i].t, pts[i].v);
      c.lineTo(p.x, p.y);
    }
    c.strokeStyle = color || '#3b82f6';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  }

  function sampleCurve(mode, state, steps) {
    var pts = [], i, t;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      pts.push({ t: t, v: MFC.evaluateCurve(mode, t, curveParams(state)) });
    }
    return pts;
  }

  function drawCustomPath(c, toPixels, state) {
    var pts = [], i, j, a, b, segW, steps, u;
    for (i = 0; i < state.customPoints.length - 1; i++) {
      a = state.customPoints[i];
      b = state.customPoints[i + 1];
      segW  = Math.max(0.0001, b.x - a.x);
      steps = Math.max(8, Math.round(segW * 90));
      for (j = (i === 0 ? 0 : 1); j <= steps; j++) {
        u = j / steps;
        pts.push({ t: a.x + u * segW, v: MFC.evalCustomSegment(u, a, b, segW) });
      }
    }
    drawFilledCurve(c, toPixels, pts, '#3b82f6', 0.14);
  }

  function drawCustomGuides(c, toPixels, state) {
    var i, a, b, pA, pB, pO, pI;
    c.save();
    c.strokeStyle = 'rgba(96,165,250,0.45)';
    c.lineWidth = 1;
    c.setLineDash([3, 3]);
    for (i = 0; i < state.customPoints.length - 1; i++) {
      a = state.customPoints[i];
      b = state.customPoints[i + 1];
      pA = toPixels(a.x, a.y);
      pO = toPixels(a.x + (a.outX || 0), a.y + (a.outY || 0));
      pI = toPixels(b.x + (b.inX || 0), b.y + (b.inY || 0));
      pB = toPixels(b.x, b.y);
      c.beginPath(); c.moveTo(pA.x, pA.y); c.lineTo(pO.x, pO.y); c.stroke();
      c.beginPath(); c.moveTo(pB.x, pB.y); c.lineTo(pI.x, pI.y); c.stroke();
    }
    c.setLineDash([]);
    c.restore();
  }

  // ── Custom: edición ────────────────────────────────────────────────────────

  function isEndpoint(idx, total) { return idx === 0 || idx === total - 1; }

  function removeCustomPoint(state, idx) {
    if (isEndpoint(idx, state.customPoints.length)) return false;
    if (state.customPoints.length <= 2) return false;
    state.segmentFrames[idx - 1] =
      (state.segmentFrames[idx - 1] || 10) + (state.segmentFrames[idx] || 10);
    state.segmentFrames.splice(idx, 1);
    state.customPoints.splice(idx, 1);
    state.customSelected = (state.customSelected || [])
      .filter(function (i) { return i !== idx; })
      .map(function (i) { return i > idx ? i - 1 : i; });
    syncCustomX(state);
    return true;
  }

  function removeSelectedPoints(state) {
    var sel = (state.customSelected || []).slice().sort(function (a, b) { return b - a; });
    var removed = false;
    for (var i = 0; i < sel.length; i++) {
      if (removeCustomPoint(state, sel[i])) removed = true;
    }
    if (removed) state.customSelected = [];
    return removed;
  }

  function addCustomPoint(state) {
    if (state.customPoints.length >= MAX_POINTS) return false;
    var longest = 0, i;
    for (i = 1; i < state.segmentFrames.length; i++) {
      if (state.segmentFrames[i] > state.segmentFrames[longest]) longest = i;
    }
    var f = state.segmentFrames[longest];
    if (f < MIN_FRAMES * 2) return false;
    var a = state.customPoints[longest];
    var b = state.customPoints[longest + 1];
    var segW = Math.max(0.0001, b.x - a.x);
    var midY = MFC.evalCustomSegment(0.5, a, b, segW);
    var tan  = segW * 0.18;
    var left = Math.floor(f / 2);
    state.segmentFrames.splice(longest, 1, left, f - left);
    state.customPoints.splice(longest + 1, 0, {
      x: 0, y: midY, inX: -tan, inY: 0, outX: tan, outY: 0
    });
    state.customSelected = [];
    syncCustomX(state);
    return true;
  }

  function getAnchorsInRect(state, toPixels, x0, y0, x1, y1) {
    var left = Math.min(x0, x1), right = Math.max(x0, x1);
    var top  = Math.min(y0, y1), bottom = Math.max(y0, y1);
    var found = [], i, p, pix;
    for (i = 1; i < state.customPoints.length - 1; i++) {
      p = state.customPoints[i];
      pix = toPixels(p.x, p.y);
      if (pix.x >= left && pix.x <= right && pix.y >= top && pix.y <= bottom) found.push(i);
    }
    return found;
  }

  function snapshotDragPositions(state, indices) {
    var snap = { points: {}, frames: state.segmentFrames.slice() };
    var i, idx, p;
    for (i = 0; i < indices.length; i++) {
      idx = indices[i];
      p = state.customPoints[idx];
      if (!p) continue;
      snap.points[idx] = { x: p.x, y: p.y, outX: p.outX, outY: p.outY, inX: p.inX, inY: p.inY };
    }
    return snap;
  }

  function onCustomDragAbsolute(state, kind, idx, nx, ny, snap) {
    var p = state.customPoints[idx], s = snap.points[idx];
    if (!p || !s) return;
    if (kind === 'out') {
      p.outX = MFC.clamp(nx - p.x, 0.005, 1);
      p.outY = MFC.clamp(ny - p.y, -2, 2);
      return;
    }
    if (kind === 'in') {
      p.inX = MFC.clamp(nx - p.x, -1, -0.005);
      p.inY = MFC.clamp(ny - p.y, -2, 2);
      return;
    }
    // anchor
    var last = state.customPoints.length - 1;
    var targets = (state.customSelected && state.customSelected.length > 1 &&
                   state.customSelected.indexOf(idx) !== -1)
      ? state.customSelected : [idx];
    var dy = ny - s.y;
    var i, tidx, tp, ts;
    for (i = 0; i < targets.length; i++) {
      tidx = targets[i];
      if (isEndpoint(tidx, last + 1)) continue;
      tp = state.customPoints[tidx];
      ts = snap.points[tidx];
      if (!tp || !ts) continue;
      tp.y = MFC.clamp(ts.y + dy, -1, 2);
    }
    // Redistribución X solo con 1 punto (ajusta proporciones de segmento)
    if (targets.length === 1 && !isEndpoint(idx, last + 1)) {
      var total = 0;
      for (i = 0; i < snap.frames.length; i++) total += snap.frames[i];
      if (total < 1) return;
      var prevX = 0;
      for (i = 0; i < idx - 1; i++) prevX += snap.frames[i];
      prevX /= total;
      var pairFrames = snap.frames[idx - 1] + snap.frames[idx];
      var nextX = prevX + pairFrames / total;
      var minW = MIN_FRAMES / total;
      var cx = MFC.clamp(nx, prevX + minW, nextX - minW);
      var newLeft = Math.round((cx - prevX) * total);
      newLeft = MFC.clamp(newLeft, MIN_FRAMES, pairFrames - MIN_FRAMES);
      state.segmentFrames[idx - 1] = newLeft;
      state.segmentFrames[idx]     = pairFrames - newLeft;
      syncCustomX(state);
    }
  }

  // ── Custom: DOM handles ────────────────────────────────────────────────────

  function renderCustomHandles(container, state, toPixels, handlers) {
    container.innerHTML = '';
    var selected = state.customSelected || [];
    var lastIdx  = state.customPoints.length - 1;

    state.customPoints.forEach(function (p, idx) {
      var locked = isEndpoint(idx, lastIdx + 1);
      var isSel  = selected.indexOf(idx) !== -1;

      var el = document.createElement('div');
      el.className = 'custom-handle' +
        (locked ? ' endpoint locked' : '') +
        (isSel  ? ' selected' : '');
      el.dataset.idx  = idx;
      el.dataset.kind = 'anchor';
      el.innerHTML    = '<span class="pt-label">' + idx + '</span>';
      if (!locked) {
        el.innerHTML += '<span class="pt-del" title="Eliminar">×</span>';
        el.addEventListener('mousedown', function (e) {
          if (e.target.classList.contains('pt-del')) return;
          handlers.onAnchorDown(e, idx);
        });
        var delBtn = el.querySelector('.pt-del');
        if (delBtn) {
          delBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); e.preventDefault(); });
          delBtn.addEventListener('click', function (e) { e.stopPropagation(); handlers.onDelete(idx); });
        }
      }
      container.appendChild(el);

      var hEl;
      if (idx < lastIdx) {
        hEl = document.createElement('div');
        hEl.className = 'custom-handle tangent';
        hEl.dataset.idx = idx; hEl.dataset.kind = 'out';
        hEl.addEventListener('mousedown', function (e) { handlers.onTangentDown(e, 'out', idx); });
        container.appendChild(hEl);
      }
      if (idx > 0) {
        hEl = document.createElement('div');
        hEl.className = 'custom-handle tangent';
        hEl.dataset.idx = idx; hEl.dataset.kind = 'in';
        hEl.addEventListener('mousedown', function (e) { handlers.onTangentDown(e, 'in', idx); });
        container.appendChild(hEl);
      }
    });

    positionCustomHandles(container, state, toPixels);
  }

  function positionCustomHandles(container, state, toPixels) {
    var nodes = container.querySelectorAll('.custom-handle');
    var i, node, idx, kind, p, px, py, pix;
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      idx  = parseInt(node.dataset.idx, 10);
      kind = node.dataset.kind;
      p    = state.customPoints[idx];
      if (!p) continue;
      if (kind === 'anchor') { px = p.x; py = p.y; }
      else if (kind === 'out') { px = p.x + (p.outX || 0); py = p.y + (p.outY || 0); }
      else { px = p.x + (p.inX || 0); py = p.y + (p.inY || 0); }
      pix = toPixels(px, py);
      node.style.left = pix.x + 'px';
      node.style.top  = pix.y + 'px';
    }
  }

  function renderSegmentInputs(container, state, onChange) {
    container.innerHTML = '';
    var i, wrap, lbl, inp;
    for (i = 0; i < state.customPoints.length - 1; i++) {
      var pct = Math.round(state.customPoints[i + 1].x * 100);
      wrap = document.createElement('div');
      wrap.className = 'seg-frame-inp';
      lbl = document.createElement('label');
      lbl.textContent = i + '→' + (i + 1);
      inp = document.createElement('input');
      inp.type  = 'number';
      inp.min   = '1';
      inp.max   = '999';
      inp.value = state.segmentFrames[i] || 12;
      inp.title = 'Punto ' + (i + 1) + ' al ' + pct + '% del tiempo';
      inp.dataset.seg = i;
      inp.addEventListener('change', function () {
        var si = parseInt(this.dataset.seg, 10);
        state.segmentFrames[si] = Math.max(MIN_FRAMES, parseInt(this.value, 10) || 12);
        this.value = state.segmentFrames[si];
        syncCustomX(state);
        onChange();
      });
      wrap.appendChild(lbl);
      wrap.appendChild(inp);
      container.appendChild(wrap);
    }
    var infoEl = document.createElement('span');
    infoEl.className = 'seg-total';
    var pcts = [];
    for (i = 1; i < state.customPoints.length - 1; i++) {
      pcts.push(Math.round(state.customPoints[i].x * 100) + '%');
    }
    infoEl.textContent = pcts.length ? '(' + pcts.join(', ') + ')' : '';
    container.appendChild(infoEl);
  }

  // ── Elastic / Bounce: handles en la curva ─────────────────────────────────
  //
  // Elastic: CP1 en el primer overshoot (horizontal → freq, vertical fijo en curva)
  //          CP2 abajo-izq (vertical → amp / intensidad del overshoot)
  // Bounce:  CP1 en el primer valle (arrastre horizontal → nº rebotes)
  //          CP2 a la izquierda fijo (arrastre vertical → amplitud)

  function updateParamHandles(state, cp1El, cp2El, toPixels) {
    var p1, p2;
    if (state.graphMode === 'elastic') {
      var stats = MFC.elasticStats(state.elastic.amp, state.elastic.freq);
      var peak  = stats.firstPeak;
      p1 = toPixels(MFC.clamp(peak.t, 0.08, 0.88), peak.y);
      p2 = toPixels(0.14, 0.92 - MFC.clamp(state.elastic.amp, 0, 1) * 0.62);
    } else if (state.graphMode === 'bounce') {
      var dips = MFC.bounceDips(state.bounce.amp, state.bounce.damp);
      // Primer valle = impacto principal (caída brusca tras llegar a 1)
      var first = dips[0] || { t: 0.42, y: 0.72 };
      p1 = toPixels(MFC.clamp(first.t, 0.08, 0.92), first.y);
      // Intensidad del rebote (vertical)
      p2 = toPixels(0.14, 0.88 - MFC.clamp(state.bounce.amp, 0, 1) * 0.55);
    } else {
      return;
    }
    cp1El.style.display = 'block';
    cp2El.style.display = 'block';
    cp1El.style.left = p1.x + 'px'; cp1El.style.top = p1.y + 'px';
    cp2El.style.left = p2.x + 'px'; cp2El.style.top = p2.y + 'px';
  }

  function onParamDrag(state, cpIdx, nx, ny) {
    if (state.graphMode === 'elastic') {
      if (cpIdx === 1) {
        // Pico más temprano = más oscilaciones (freq alto)
        state.elastic.freq = MFC.clamp(1 - (nx - 0.14) / 0.72, 0, 1);
      } else {
        // Más arriba = más overshoot
        state.elastic.amp = MFC.clamp((0.92 - ny) / 0.62, 0, 1);
      }
    } else if (state.graphMode === 'bounce') {
      if (cpIdx === 1) {
        // CP1 horizontal → damp (más rebotes Penner)
        state.bounce.damp = MFC.clamp((nx - 0.22) / 0.68, 0, 1);
      } else {
        // CP2 vertical → amp (intensidad Penner vs ease-out)
        state.bounce.amp = MFC.clamp((0.88 - ny) / 0.55, 0, 1);
      }
    }
  }

  // ── Resumen en barra de valores ────────────────────────────────────────────

  function modeSummary(state) {
    if (state.graphMode === 'elastic') {
      var es = MFC.elasticStats(state.elastic.amp, state.elastic.freq);
      return 'Overshoot +' + Math.round((es.maxOvershoot - 1) * 100) + '%' +
             ' · Osc. ~' + es.cycles +
             ' · Amp ' + state.elastic.amp.toFixed(2);
    }
    if (state.graphMode === 'bounce') {
      var warp = 0.48 + state.bounce.damp * 0.62;
      var nb   = warp < 0.65 ? 2 : (warp < 0.85 ? 3 : 4);
      return 'Rebotes ~' + nb + ' · Int. ' + state.bounce.amp.toFixed(2);
    }
    if (state.graphMode === 'custom') {
      var pcts = [];
      for (var i = 1; i < state.customPoints.length - 1; i++) {
        pcts.push(Math.round(state.customPoints[i].x * 100) + '%');
      }
      return state.customPoints.length + ' keys' +
             (pcts.length ? ' · ' + pcts.join(', ') : '');
    }
    return null;
  }

  // ── Persistencia ───────────────────────────────────────────────────────────

  var KEY_PARAMS = 'MotionFlow_ModeParams_v3';

  function saveModeParams(state) {
    try {
      localStorage.setItem(KEY_PARAMS, JSON.stringify({
        elastic:      state.elastic,
        bounce:       state.bounce,
        customPoints: state.customPoints,
        segmentFrames: state.segmentFrames
      }));
    } catch (e) {}
  }

  function loadModeParams(state) {
    try {
      var raw = localStorage.getItem(KEY_PARAMS);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.elastic && typeof d.elastic.amp === 'number') state.elastic = d.elastic;
      if (d.bounce  && typeof d.bounce.amp  === 'number') state.bounce  = d.bounce;
      if (d.customPoints && d.customPoints.length >= 2 &&
          d.segmentFrames && d.segmentFrames.length === d.customPoints.length - 1) {
        state.customPoints   = d.customPoints;
        state.segmentFrames  = d.segmentFrames;
      }
    } catch (e) {}
    syncCustomX(state);
  }

  // ── Presets (todos los modos) ─────────────────────────────────────────────

  var MODE_LABELS = {
    ease: 'Ease', speed: 'Speed', elastic: 'Elastic',
    bounce: 'Bounce', custom: 'Custom'
  };

  function presetMode(preset) {
    return preset.mode || 'ease';
  }

  function defaultCatForMode(mode) {
    if (mode === 'speed')   return 'speed';
    if (mode === 'elastic') return 'elastic';
    if (mode === 'bounce')  return 'bounce';
    if (mode === 'custom')  return 'custom';
    return 'ease';
  }

  function presetParamsFromPreset(preset) {
    var mode = presetMode(preset);
    return {
      x1: preset.x1 != null ? preset.x1 : 0.42,
      y1: preset.y1 != null ? preset.y1 : 0,
      x2: preset.x2 != null ? preset.x2 : 0.58,
      y2: preset.y2 != null ? preset.y2 : 1,
      elastic: preset.elastic || defaultElastic(),
      bounce:  preset.bounce  || defaultBounce(),
      customPoints:  preset.customPoints  || defaultCustomPoints(),
      segmentFrames: preset.segmentFrames || defaultSegmentFrames(2)
    };
  }

  function samplePresetCurve(preset, steps) {
    var mode   = presetMode(preset);
    var params = presetParamsFromPreset(preset);
    var pts = [], i, t;
    for (i = 0; i <= (steps || 32); i++) {
      t = i / (steps || 32);
      pts.push({ t: t, v: MFC.evaluateCurve(mode, t, params) });
    }
    return pts;
  }

  function makePresetSVG(preset) {
    var pts  = samplePresetCurve(preset, 32);
    var minV = 0, maxV = 1, i, range, pad;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].v < minV) minV = pts[i].v;
      if (pts[i].v > maxV) maxV = pts[i].v;
    }
    range = Math.max(0.001, maxV - minV);
    pad   = range * 0.1;
    minV -= pad;
    maxV += pad;
    range = maxV - minV;

    var d = '';
    for (i = 0; i < pts.length; i++) {
      var px = pts[i].t * 50;
      var py = 50 - ((pts[i].v - minV) / range) * 50;
      d += (i === 0 ? 'M' : 'L') + ' ' + px.toFixed(1) + ',' + py.toFixed(1);
    }

    var ns   = 'http://www.w3.org/2000/svg';
    var svg  = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 50 50');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    return svg;
  }

  function snapshotState(state) {
    return {
      graphMode: state.graphMode,
      x1: state.x1, y1: state.y1, x2: state.x2, y2: state.y2,
      elastic: { amp: state.elastic.amp, freq: state.elastic.freq },
      bounce:  { amp: state.bounce.amp,  damp: state.bounce.damp },
      customPoints:   JSON.parse(JSON.stringify(state.customPoints)),
      segmentFrames:  state.segmentFrames.slice(),
      customSelected: (state.customSelected || []).slice()
    };
  }

  function restoreState(state, snap) {
    state.graphMode     = snap.graphMode;
    state.x1 = snap.x1; state.y1 = snap.y1;
    state.x2 = snap.x2; state.y2 = snap.y2;
    state.elastic = { amp: snap.elastic.amp, freq: snap.elastic.freq };
    state.bounce  = { amp: snap.bounce.amp,  damp: snap.bounce.damp };
    state.customPoints   = JSON.parse(JSON.stringify(snap.customPoints));
    state.segmentFrames  = snap.segmentFrames.slice();
    state.customSelected = snap.customSelected.slice();
    syncCustomX(state);
  }

  function capturePreset(state, name, cat) {
    var mode = state.graphMode;
    var preset = {
      name: name,
      mode: mode,
      cat:  cat || defaultCatForMode(mode)
    };
    if (mode === 'ease' || mode === 'speed') {
      preset.x1 = state.x1; preset.y1 = state.y1;
      preset.x2 = state.x2; preset.y2 = state.y2;
    } else if (mode === 'elastic') {
      preset.elastic = { amp: state.elastic.amp, freq: state.elastic.freq };
    } else if (mode === 'bounce') {
      preset.bounce = { amp: state.bounce.amp, damp: state.bounce.damp };
    } else if (mode === 'custom') {
      preset.customPoints   = JSON.parse(JSON.stringify(state.customPoints));
      preset.segmentFrames  = state.segmentFrames.slice();
    }
    return preset;
  }

  function applyPreset(state, preset) {
    var mode = presetMode(preset);
    state.graphMode = mode;
    if (mode === 'ease' || mode === 'speed') {
      state.x1 = preset.x1 != null ? preset.x1 : 0.42;
      state.y1 = preset.y1 != null ? preset.y1 : 0;
      state.x2 = preset.x2 != null ? preset.x2 : 0.58;
      state.y2 = preset.y2 != null ? preset.y2 : 1;
    } else if (mode === 'elastic' && preset.elastic) {
      state.elastic = {
        amp:  preset.elastic.amp,
        freq: preset.elastic.freq
      };
    } else if (mode === 'bounce' && preset.bounce) {
      state.bounce = {
        amp:  preset.bounce.amp,
        damp: preset.bounce.damp
      };
    } else if (mode === 'custom' && preset.customPoints) {
      state.customPoints = JSON.parse(JSON.stringify(preset.customPoints));
      if (preset.segmentFrames &&
          preset.segmentFrames.length === preset.customPoints.length - 1) {
        state.segmentFrames = preset.segmentFrames.slice();
      } else {
        state.segmentFrames = defaultSegmentFrames(state.customPoints.length - 1);
      }
      state.customSelected = [];
      syncCustomX(state);
    }
  }

  function presetMatchesFilter(preset, activeCat) {
    if (activeCat === 'all') return true;
    var mode = presetMode(preset);
    if (activeCat === 'speed' || activeCat === 'elastic') {
      return mode === activeCat;
    }
    if (activeCat === 'bounce') {
      return mode === 'bounce' || (mode === 'ease' && preset.cat === 'bounce');
    }
    if (activeCat === 'custom') {
      return mode === 'custom' || (mode === 'ease' && preset.cat === 'custom');
    }
    if (activeCat === 'ease') return mode === 'ease';
    return mode === 'ease' && preset.cat === activeCat;
  }

  function drawPresetCurve(c, toPixels, preset, color, strokeWidth, dash, withFill) {
    var mode   = presetMode(preset);
    var params = presetParamsFromPreset(preset);
    var pts    = [], i, t, p;
    for (i = 0; i <= 160; i++) {
      t = i / 160;
      pts.push({ t: t, v: MFC.evaluateCurve(mode, t, params) });
    }
    if (withFill !== false) {
      drawFilledCurve(c, toPixels, pts, color || '#3b82f6', 0.12);
    }
    if (strokeWidth) {
      c.save();
      c.strokeStyle = color || '#3b82f6';
      c.lineWidth   = strokeWidth;
      c.lineCap     = 'round';
      c.setLineDash(dash || []);
      c.beginPath();
      for (i = 0; i < pts.length; i++) {
        p = toPixels(pts[i].t, pts[i].v);
        if (i === 0) c.moveTo(p.x, p.y);
        else c.lineTo(p.x, p.y);
      }
      c.stroke();
      c.restore();
    }
  }

  function migratePreset(p) {
    if (!p.mode) p.mode = 'ease';
    return p;
  }

  // ── Apply ──────────────────────────────────────────────────────────────────
  //
  // Elastic, Bounce y Custom: curva muestreada como expresión por segmento.
  // Cada par de keyframes seleccionado guarda su propia curva sin borrar las demás.

  function applyCurveMode(state, cs, dir, callback) {
    var params = curveParams(state);
    var mode = state.graphMode;
    if (mode !== 'elastic' && mode !== 'bounce' && mode !== 'custom') {
      callback('{"ok":false,"error":"Modo inválido"}');
      return;
    }
    var payload = MFC.buildExpressionPayload(mode, params);
    var inner   = JSON.stringify(payload);
    var hostFn  = (state.applyMethod === 'keys') ? 'EC_applyCustomBake' : 'EC_applyExpression';
    cs.evalScript(hostFn + '(' + JSON.stringify(inner) + ')', callback);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  global.MF_modes = {
    defaultCustomPoints:  defaultCustomPoints,
    defaultSegmentFrames: defaultSegmentFrames,
    defaultElastic:       defaultElastic,
    defaultBounce:        defaultBounce,
    isParamMode:          isParamMode,
    curveParams:          curveParams,
    totalCustomFrames:    totalCustomFrames,
    syncCustomX:          syncCustomX,
    autoFitValueGraph:    autoFitValueGraph,
    drawDiagonalRef:      drawDiagonalRef,
    drawElasticTarget:    drawElasticTarget,
    drawFilledCurve:      drawFilledCurve,
    sampleCurve:          sampleCurve,
    drawCustomPath:       drawCustomPath,
    drawCustomGuides:     drawCustomGuides,
    renderCustomHandles:  renderCustomHandles,
    positionCustomHandles: positionCustomHandles,
    renderSegmentInputs:  renderSegmentInputs,
    updateParamHandles:   updateParamHandles,
    onParamDrag:          onParamDrag,
    onCustomDragAbsolute: onCustomDragAbsolute,
    snapshotDragPositions: snapshotDragPositions,
    addCustomPoint:       addCustomPoint,
    removeCustomPoint:    removeCustomPoint,
    removeSelectedPoints: removeSelectedPoints,
    getAnchorsInRect:     getAnchorsInRect,
    modeSummary:          modeSummary,
    saveModeParams:       saveModeParams,
    loadModeParams:       loadModeParams,
    applyCurveMode:       applyCurveMode,
    capturePreset:        capturePreset,
    applyPreset:          applyPreset,
    presetMode:           presetMode,
    presetMatchesFilter:  presetMatchesFilter,
    makePresetSVG:        makePresetSVG,
    drawPresetCurve:      drawPresetCurve,
    snapshotState:        snapshotState,
    restoreState:         restoreState,
    migratePreset:        migratePreset,
    defaultCatForMode:    defaultCatForMode,
    modeLabel: function (mode) { return MODE_LABELS[mode] || mode; },
    evaluate: function (mode, t, state) {
      return MFC.evaluateCurve(mode, t, curveParams(state));
    }
  };
})(window);
