/**
 * MotionFlow — Curve evaluation & AE export helpers
 * Fórmulas de elastic/bounce tomadas de GraphEditorAE (easeOutElasticControlled,
 * easeOutBounceControlled) y adaptadas al sistema de parámetros de MotionFlow.
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function clamp01(v) { return clamp(v, 0, 1); }

  // ── Bezier helper ──────────────────────────────────────────────────────────

  function cubicAt(t, p0, p1, p2, p3) {
    var mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }
  function cubicDeriv(t, p0, p1, p2, p3) {
    var mt = 1 - t;
    return 3*mt*mt*(p1-p0) + 6*mt*t*(p2-p1) + 3*t*t*(p3-p2);
  }

  function solveCubicX(x, c1x, c2x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var u = x, i, cx, err, d;
    for (i = 0; i < 12; i++) {
      cx  = cubicAt(u, 0, c1x, c2x, 1);
      err = cx - x;
      if (Math.abs(err) < 0.00001) return u;
      d = cubicDeriv(u, 0, c1x, c2x, 1);
      if (Math.abs(d) < 0.000001) break;
      u = clamp01(u - err / d);
    }
    var lo = 0, hi = 1;
    for (i = 0; i < 30; i++) {
      u  = (lo + hi) / 2;
      cx = cubicAt(u, 0, c1x, c2x, 1);
      if (cx < x) lo = u; else hi = u;
    }
    return (lo + hi) / 2;
  }

  function bezierEase(t, x1, y1, x2, y2) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var u = solveCubicX(t, x1, x2);
    return cubicAt(u, 0, y1, y2, 1);
  }

  // ── Elastic ────────────────────────────────────────────────────────────────
  //
  // Resorte amortiguado con ataque suave: sube desde 0, sobrepasa 1 y oscila
  // hasta asentarse. amp = overshoot, freq = densidad de oscilaciones.

  function elasticOut(t, amp, freq) {
    t = clamp01(t);
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    var a = clamp01(amp != null ? amp : 0.6);
    var f = clamp01(freq != null ? freq : 0.4);

    // Factor de oscilación (más amp = más vaivén sobre 1)
    var OS = 0.22 + a * 0.78;
    // Ciclos: freq bajo = lento, freq alto = denso
    var cycles = 0.5 + f * 3.2;
    var w      = Math.PI * 2 * cycles;
    var damp   = 4.8 - a * 2.4;

    function spring(u) {
      return 1 - OS * Math.exp(-damp * u) * Math.cos(w * u);
    }

    // Ataque suave solo al inicio (primeros 7%) — no aplasta el overshoot
    if (t < 0.07) {
      var u = t / 0.07;
      var yEnd = spring(0.07) / Math.max(1e-6, spring(1));
      return u * u * yEnd;
    }

    return spring(t) / Math.max(1e-6, spring(1));
  }

  /** Picos locales por encima de 1 (para handles y auto-fit). */
  function elasticPeaks(amp, freq) {
    var peaks = [], i, t, y, prev, next;
    for (i = 2; i < 140; i++) {
      t    = i / 140;
      y    = elasticOut(t, amp, freq);
      prev = elasticOut((i - 1) / 140, amp, freq);
      next = elasticOut((i + 1) / 140, amp, freq);
      if (y > prev && y >= next && y > 1.01) {
        peaks.push({ t: t, y: y });
      }
    }
    if (!peaks.length) {
      t = 0.28 + (1 - clamp01(freq)) * 0.22;
      peaks.push({ t: t, y: elasticOut(t, amp, freq) });
    }
    return peaks;
  }

  /** Máximo overshoot y primer pico (resumen UI). */
  function elasticStats(amp, freq) {
    var peaks = elasticPeaks(amp, freq);
    var first = peaks[0];
    var maxY  = 1, i, y;
    for (i = 0; i <= 80; i++) {
      y = elasticOut(i / 80, amp, freq);
      if (y > maxY) maxY = y;
    }
    return {
      firstPeak: first,
      maxOvershoot: maxY,
      cycles: (0.5 + clamp01(freq) * 3.2).toFixed(1)
    };
  }

  // ── Bounce ─────────────────────────────────────────────────────────────────
  //
  // Penner ease-out bounce: tramos cuadráticos con caídas bruscas (0.75, 0.94…).
  // Nunca supera 1 — a diferencia de Elastic que oscila por encima del objetivo.

  /** Curva Penner clásica (Robert Penner / CSS ease-out). */
  function pennerBounce(t) {
    var n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  }

  /**
   * amp  (0..1): intensidad del rebote (0 = ease-out suave, 1 = Penner completo)
   * damp (0..1): rebotes visibles (bajo = 2 rebotes, alto = 4 rebotes Penner)
   */
  function bounceOut(t, amp, damp) {
    t = clamp01(t);
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    var a = clamp01(amp != null ? amp : 0.75);
    var d = clamp01(damp != null ? damp : 0.5);

    // warp < 1 → avanza rápido en Penner → menos rebotes; warp > 1 → más rebotes
    var warp = 0.48 + d * 0.62;
    var tw   = Math.pow(t, warp);
    var pen  = pennerBounce(tw);

    // Ease-out cúbico como base (sin oscilación)
    var ease = 1 - Math.pow(1 - t, 3);

    if (a < 0.02) return ease;

    return clamp01(ease * (1 - a) + pen * a);
  }

  /** Detecta los valles locales (puntos de impacto) para los handles. */
  function bounceDips(amp, damp) {
    var dips = [], i, t, y, prevY, nextY;
    for (i = 2; i < 78; i++) {
      t     = i / 80;
      y     = bounceOut(t, amp, damp);
      prevY = bounceOut((i - 1) / 80, amp, damp);
      nextY = bounceOut((i + 1) / 80, amp, damp);
      if (y < prevY && y <= nextY) dips.push({ t: t, y: y });
    }
    if (!dips.length) dips.push({ t: 0.42, y: bounceOut(0.42, amp, damp) });
    return dips;
  }

  // ── Custom ─────────────────────────────────────────────────────────────────

  /**
   * Evalúa un segmento bezier 2D entre dos anchors.
   * u ∈ [0,1], segW = ancho del segmento en espacio de gráfica.
   * Tangentes (outX/outY, inX/inY) son offsets relativos al anchor.
   */
  function evalCustomSegment(u, a, b, segW) {
    var w   = segW > 0 ? segW : 1;
    var c1x = clamp((a.outX != null ? a.outX : w * 0.33) / w, 0, 1);
    var c1y = a.y + (a.outY || 0);
    var c2x = 1 + clamp((b.inX != null ? b.inX : -w * 0.33) / w, -1, 0);
    var c2y = b.y + (b.inY || 0);
    var uu  = solveCubicX(clamp01(u), c1x, c2x);
    return cubicAt(uu, a.y, c1y, c2y, b.y);
  }

  function totalCustomFrames(points, segmentFrames) {
    var frames = segmentFrames || [];
    var i, total = 0;
    for (i = 0; i < (points.length - 1); i++) {
      total += frames[i] > 0 ? frames[i] : 10;
    }
    return total > 0 ? total : 1;
  }

  function customCurve(t, points, segmentFrames) {
    if (!points || points.length < 2) return t;
    var frames = segmentFrames || [];
    var i, total = 0, acc = 0, segF;
    for (i = 0; i < points.length - 1; i++) total += frames[i] > 0 ? frames[i] : 10;
    if (total <= 0) total = (points.length - 1) * 10;
    var target = clamp01(t) * total;
    for (i = 0; i < points.length - 1; i++) {
      segF = frames[i] > 0 ? frames[i] : 10;
      if (target <= acc + segF || i === points.length - 2) {
        var local = segF > 0 ? (target - acc) / segF : 0;
        return evalCustomSegment(clamp01(local), points[i], points[i + 1], segF / total);
      }
      acc += segF;
    }
    return points[points.length - 1].y;
  }

  // ── Unified evaluator ──────────────────────────────────────────────────────

  function evaluateCurve(mode, t, params) {
    t = clamp01(t);
    if (mode === 'elastic') {
      var e = params.elastic || {};
      return elasticOut(t, e.amp, e.freq);
    }
    if (mode === 'bounce') {
      var b = params.bounce || {};
      return bounceOut(t, b.amp, b.damp);
    }
    if (mode === 'custom') {
      return customCurve(t, params.customPoints, params.segmentFrames);
    }
    return bezierEase(t, params.x1, params.y1, params.x2, params.y2);
  }

  // ── Sampling for expression/bake ───────────────────────────────────────────

  /**
   * Muestrea cualquier curva en N+1 puntos normalizados {t, y}.
   * Normaliza el primer punto a {t:0, y:0} y el último a {t:1, y:1}.
   * Luego hace downsample a maxInterior puntos interiores.
   */
  function sampleCurveForExpr(mode, params, totalSamples, maxInterior) {
    var n   = totalSamples || 96;
    var max = maxInterior  || 28;
    var raw = [], i, t, y;

    for (i = 0; i <= n; i++) {
      t = i / n;
      y = evaluateCurve(mode, t, params);
      raw.push({ t: t, y: y });
    }

    // Normalizar extremos para que la expresión siempre empiece en 0 y acabe en 1
    raw[0]             = { t: 0, y: 0 };
    raw[raw.length - 1] = { t: 1, y: 1 };

    // Downsample interior (como GraphEditorAE: BAKE_MAX_INTERIOR = 28)
    var inner = raw.slice(1, -1);
    if (inner.length > max) {
      var step = (inner.length - 1) / (max - 1);
      var pick = [], j;
      for (j = 0; j < max; j++) pick.push(inner[Math.round(j * step)]);
      inner = pick;
    }

    return [raw[0]].concat(inner).concat([raw[raw.length - 1]]);
  }

  // ── Build payload for EC_applyExpression ───────────────────────────────────

  function buildExpressionPayload(mode, params) {
    var pts = sampleCurveForExpr(mode, params, 96, 28);
    var payload = {
      type:   mode,
      points: pts,
      params: {}
    };
    if (mode === 'elastic') payload.params = { amp: params.elastic.amp, freq: params.elastic.freq };
    if (mode === 'bounce')  payload.params = { amp: params.bounce.amp,  damp: params.bounce.damp };
    return payload;
  }

  // ── Bake data for custom (keyframe-per-point mode) ─────────────────────────

  function buildCustomBakeData(points, segmentFrames) {
    if (!points || points.length < 2)
      return { points: [{ t: 0, y: 0 }, { t: 1, y: 1 }] };

    var frames = segmentFrames || [];
    var i, total = 0, acc = 0, segF;
    for (i = 0; i < points.length - 1; i++) total += frames[i] > 0 ? frames[i] : 10;
    if (total <= 0) total = (points.length - 1) * 10;

    var pts = [{ t: 0, y: 0 }];
    for (i = 0; i < points.length - 1; i++) {
      segF = frames[i] > 0 ? frames[i] : 10;
      acc += segF;
      var tNorm = acc / total;
      var yMid  = evalCustomSegment(1, points[i], points[i + 1], segF / total);
      // punto de cruce del segmento = y del anchor siguiente
      pts.push({ t: tNorm, y: points[i + 1].y });
    }
    pts[pts.length - 1].y = 1;
    pts[pts.length - 1].t = 1;

    return { points: pts };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  global.MotionFlowCurves = {
    clamp: clamp,
    clamp01: clamp01,
    cubicAt: cubicAt,
    solveCubicX: solveCubicX,
    bezierEase: bezierEase,
    elasticOut: elasticOut,
    elasticPeaks: elasticPeaks,
    elasticStats: elasticStats,
    bounceOut: bounceOut,
    bounceDips: bounceDips,
    evalCustomSegment: evalCustomSegment,
    customCurve: customCurve,
    evaluateCurve: evaluateCurve,
    sampleCurveForExpr: sampleCurveForExpr,
    buildExpressionPayload: buildExpressionPayload,
    buildCustomBakeData: buildCustomBakeData,
    totalCustomFrames: totalCustomFrames
  };
})(window);
