/**
 * Smooth Align Pro — main.jsx (motor ExtendScript)
 * Alineación y distribución de capas en After Effects CC 2021+ (v17.5+)
 *
 * Entrada única: sa_run(paramsJSON) donde params = {
 *   op: 'align' | 'distribute' | 'space',
 *   mode: <según op>,
 *   axis: 'x' | 'y',            // para distribute/space
 *   ref: 'comp' | 'workarea' | 'selection' | 'keylayer',
 *   edges: bool,                // alinear por bordes visibles (true) o por anchor (false)
 *   includeHidden: bool,
 *   lock: bool,                 // bloquear capas tras la operación
 *   gap: number                 // px para 'space'
 * }
 * Devuelve 'OK:<n>' | 'ERR:<msg>'
 */

/* ── Utilidades ─────────────────────────────────────────── */
function sa_activeComp() {
  var c = app.project.activeItem;
  return (c && (c instanceof CompItem)) ? c : null;
}

function sa_q(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function sa_parse(json) { return eval('(' + json + ')'); }

/* Info de comp + selección (para la UI) */
function sa_getInfo() {
  var c = sa_activeComp();
  if (!c) return '{"ok":false,"error":"No hay composición activa"}';
  var sel = c.selectedLayers;
  return '{"ok":true,"name":' + sa_q(c.name) +
         ',"width":' + c.width + ',"height":' + c.height +
         ',"selected":' + sel.length + '}';
}

/* ── Capas objetivo ─────────────────────────────────────── */
function sa_getTargetLayers(c, includeHidden) {
  var out = [];
  var sel = c.selectedLayers;
  for (var i = 0; i < sel.length; i++) {
    var L = sel[i];
    if (L.locked) continue;                       // una capa bloqueada no se puede mover
    if (!includeHidden && !L.enabled) continue;   // ocultas
    out.push(L);
  }
  return out;
}

/* ── Bounds de una capa en espacio de COMP ───────────────── */
/* useEdges=false → usa el punto de posición (anchor en comp).
   useEdges=true  → caja delimitadora visible (sourceRect + transform). */
function sa_layerRect(L, time, useEdges) {
  var posProp = L.property('ADBE Transform Group').property('ADBE Position');
  var pos = posProp.value;
  var px = pos[0], py = pos[1];

  if (!useEdges) {
    return { l: px, t: py, r: px, b: py, cx: px, cy: py };
  }

  var rect;
  try { rect = L.sourceRectAtTime(time, false); }
  catch (e) { return { l: px, t: py, r: px, b: py, cx: px, cy: py }; }

  var anchor = L.property('ADBE Transform Group').property('ADBE Anchor Point').value;
  var scale  = L.property('ADBE Transform Group').property('ADBE Scale').value;
  var rotP   = L.property('ADBE Transform Group').property('ADBE Rotate Z');
  var rot    = rotP ? rotP.value : 0;

  var sx = scale[0] / 100, sy = scale[1] / 100;
  var rad = rot * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);

  var corners = [
    [rect.left, rect.top],
    [rect.left + rect.width, rect.top],
    [rect.left + rect.width, rect.top + rect.height],
    [rect.left, rect.top + rect.height]
  ];

  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (var i = 0; i < 4; i++) {
    var lx = (corners[i][0] - anchor[0]) * sx;
    var ly = (corners[i][1] - anchor[1]) * sy;
    var cx = px + (lx * cos - ly * sin);
    var cy = py + (lx * sin + ly * cos);
    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
  }
  return { l: minX, t: minY, r: maxX, b: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/* Caja que engloba varias capas */
function sa_groupRect(layers, time, useEdges) {
  var l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (var i = 0; i < layers.length; i++) {
    var B = sa_layerRect(layers[i], time, useEdges);
    if (B.l < l) l = B.l; if (B.t < t) t = B.t;
    if (B.r > r) r = B.r; if (B.b > b) b = B.b;
  }
  return { l: l, t: t, r: r, b: b, cx: (l + r) / 2, cy: (t + b) / 2 };
}

/* Rectángulo de referencia según el modo */
function sa_refRect(c, layers, p, time) {
  if (p.ref === 'comp') {
    return { l: 0, t: 0, r: c.width, b: c.height, cx: c.width / 2, cy: c.height / 2 };
  }
  if (p.ref === 'workarea') {
    try {
      var roi = c.regionOfInterest;  // [left, top, width, height]
      if (roi && roi.length === 4 && roi[2] > 0 && roi[3] > 0) {
        return { l: roi[0], t: roi[1], r: roi[0] + roi[2], b: roi[1] + roi[3],
                 cx: roi[0] + roi[2] / 2, cy: roi[1] + roi[3] / 2 };
      }
    } catch (e) {}
    return { l: 0, t: 0, r: c.width, b: c.height, cx: c.width / 2, cy: c.height / 2 };
  }
  if (p.ref === 'keylayer') {
    var k = layers[layers.length - 1];  // capa clave = última seleccionada
    return sa_layerRect(k, time, p.edges);
  }
  // 'selection'
  return sa_groupRect(layers, time, p.edges);
}

/* ── Mover una capa por delta (comp space) ──────────────── */
function sa_moveLayer(L, dx, dy) {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return false;
  try {
    var pp = L.property('ADBE Transform Group').property('ADBE Position');
    var v = pp.value;
    if (v.length === 3) pp.setValue([v[0] + dx, v[1] + dy, v[2]]);
    else pp.setValue([v[0] + dx, v[1] + dy]);
    return true;
  } catch (e) { return false; }
}

/* ── ALINEAR ────────────────────────────────────────────── */
function sa_align(c, layers, p, time) {
  var R = sa_refRect(c, layers, p, time);
  var moved = 0;
  for (var i = 0; i < layers.length; i++) {
    var B = sa_layerRect(layers[i], time, p.edges);
    var dx = 0, dy = 0;
    switch (p.mode) {
      case 'left':     dx = R.l  - B.l;  break;
      case 'center-h': dx = R.cx - B.cx; break;
      case 'right':    dx = R.r  - B.r;  break;
      case 'top':      dy = R.t  - B.t;  break;
      case 'middle-v': dy = R.cy - B.cy; break;
      case 'bottom':   dy = R.b  - B.b;  break;
    }
    if (sa_moveLayer(layers[i], dx, dy)) moved++;
  }
  return moved;
}

/* ── DISTRIBUIR CAPAS ───────────────────────────────────── */
function sa_keyOf(B, axis, kind) {
  if (axis === 'x') {
    if (kind === 'min') return B.l;
    if (kind === 'max') return B.r;
    return B.cx;
  } else {
    if (kind === 'min') return B.t;
    if (kind === 'max') return B.b;
    return B.cy;
  }
}

function sa_distribute(c, layers, p, time) {
  if (layers.length < 3) return 0;

  var items = [];
  for (var i = 0; i < layers.length; i++) {
    items.push({ L: layers[i], B: sa_layerRect(layers[i], time, p.edges) });
  }

  var axis = p.axis;        // 'x' | 'y'
  var moved = 0;

  if (p.mode === 'gaps') {
    /* espaciado uniforme entre bordes (respeta tamaños) */
    items.sort(function (a, b) { return sa_keyOf(a.B, axis, 'min') - sa_keyOf(b.B, axis, 'min'); });
    var sizeOf = function (B) { return axis === 'x' ? (B.r - B.l) : (B.b - B.t); };
    var first = items[0].B, last = items[items.length - 1].B;
    var span = sa_keyOf(last, axis, 'max') - sa_keyOf(first, axis, 'min');
    var totalSize = 0;
    for (var s = 0; s < items.length; s++) totalSize += sizeOf(items[s].B);
    var gap = (span - totalSize) / (items.length - 1);
    var cursor = sa_keyOf(first, axis, 'min');
    for (var j = 0; j < items.length; j++) {
      var curMin = sa_keyOf(items[j].B, axis, 'min');
      var d = cursor - curMin;
      if (axis === 'x') { if (sa_moveLayer(items[j].L, d, 0)) moved++; }
      else { if (sa_moveLayer(items[j].L, 0, d)) moved++; }
      cursor += sizeOf(items[j].B) + gap;
    }
    return moved;
  }

  /* distribuir por una "llave" (centro / borde) — extremos fijos */
  var kind = p.kind || 'center';   // 'min' | 'center' | 'max'
  items.sort(function (a, b) { return sa_keyOf(a.B, axis, kind) - sa_keyOf(b.B, axis, kind); });
  var k0 = sa_keyOf(items[0].B, axis, kind);
  var kN = sa_keyOf(items[items.length - 1].B, axis, kind);
  var step = (kN - k0) / (items.length - 1);
  for (var m = 1; m < items.length - 1; m++) {
    var target = k0 + step * m;
    var cur = sa_keyOf(items[m].B, axis, kind);
    var dd = target - cur;
    if (axis === 'x') { if (sa_moveLayer(items[m].L, dd, 0)) moved++; }
    else { if (sa_moveLayer(items[m].L, 0, dd)) moved++; }
  }
  return moved;
}

/* ── DISTRIBUIR ESPACIO (gap fijo en px) ────────────────── */
function sa_space(c, layers, p, time) {
  if (layers.length < 2) return 0;
  var axis = p.axis;
  var gap = (p.gap != null) ? p.gap : 0;

  var items = [];
  for (var i = 0; i < layers.length; i++) {
    items.push({ L: layers[i], B: sa_layerRect(layers[i], time, p.edges) });
  }
  items.sort(function (a, b) { return sa_keyOf(a.B, axis, 'min') - sa_keyOf(b.B, axis, 'min'); });
  var sizeOf = function (B) { return axis === 'x' ? (B.r - B.l) : (B.b - B.t); };

  var moved = 0;
  var cursor = sa_keyOf(items[0].B, axis, 'min') + sizeOf(items[0].B); // borde de la 1ª (fija)
  for (var j = 1; j < items.length; j++) {
    var targetMin = cursor + gap;
    var curMin = sa_keyOf(items[j].B, axis, 'min');
    var d = targetMin - curMin;
    if (axis === 'x') { if (sa_moveLayer(items[j].L, d, 0)) moved++; }
    else { if (sa_moveLayer(items[j].L, 0, d)) moved++; }
    cursor = targetMin + sizeOf(items[j].B);
  }
  return moved;
}

/* ── Bloquear capas tras la operación ───────────────────── */
function sa_lockLayers(layers) {
  for (var i = 0; i < layers.length; i++) {
    try { layers[i].locked = true; } catch (e) {}
  }
}

/* ── ENTRADA PRINCIPAL ──────────────────────────────────── */
function sa_run(paramsJson) {
  var c = sa_activeComp();
  if (!c) return 'ERR:No hay composición activa';

  var p;
  try { p = sa_parse(paramsJson); }
  catch (e) { return 'ERR:params inválidos — ' + e.toString(); }

  var layers = sa_getTargetLayers(c, p.includeHidden);
  if (layers.length === 0) return 'ERR:No hay capas seleccionadas (o están bloqueadas)';

  var time = c.time;
  var moved = 0;

  app.beginUndoGroup('Smooth Align Pro: ' + p.op + (p.mode ? ' (' + p.mode + ')' : ''));
  try {
    if (p.op === 'align')           moved = sa_align(c, layers, p, time);
    else if (p.op === 'distribute') moved = sa_distribute(c, layers, p, time);
    else if (p.op === 'space')      moved = sa_space(c, layers, p, time);
    else { app.endUndoGroup(); return 'ERR:operación desconocida'; }

    if (p.lock) sa_lockLayers(layers);
  } catch (e) {
    app.endUndoGroup();
    return 'ERR:' + e.toString();
  }
  app.endUndoGroup();

  if (p.op === 'distribute' && layers.length < 3) return 'ERR:Selecciona al menos 3 capas para distribuir';
  return 'OK:' + moved;
}
