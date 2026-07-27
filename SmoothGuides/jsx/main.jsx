/**
 * SmoothGuides — main.jsx  (motor ExtendScript)
 * Corre dentro de After Effects CC 2021+ (v17.5+)
 *
 * Todas las funciones devuelven un string:
 *   "OK"  |  "OK:<n>"  |  "ERR:<mensaje>"  |  JSON
 */

/* ============================================================
   UTILIDADES
   ============================================================ */
function sg_activeComp() {
  var c = app.project.activeItem;
  if (c && (c instanceof CompItem)) return c;
  // fallback: primera comp seleccionada en el proyecto
  try {
    var sel = app.project.selection;
    for (var i = 0; i < sel.length; i++) {
      if (sel[i] instanceof CompItem) return sel[i];
    }
  } catch (e) {}
  return null;
}

function sg_q(s) {
  s = String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return '"' + s + '"';
}

function sg_hex2rgb(hex) {
  hex = String(hex).replace('#', '');
  if (hex.length === 3) {
    hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
  }
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  if (isNaN(r)) r = 0.23; if (isNaN(g)) g = 0.51; if (isNaN(b)) b = 0.96;
  return [r, g, b, 1];
}

/* parse seguro de un objeto pasado como string JSON */
function sg_parse(json) {
  return eval('(' + json + ')');
}

/* ============================================================
   INFO DE LA COMP ACTIVA
   ============================================================ */
function sg_getActiveCompInfo() {
  var c = sg_activeComp();
  if (!c) return '{"ok":false,"error":"No hay composición activa"}';
  return '{"ok":true,"name":' + sg_q(c.name) +
         ',"width":' + c.width +
         ',"height":' + c.height +
         ',"fps":' + c.frameRate +
         ',"duration":' + c.duration + '}';
}

/* ============================================================
   GUÍAS NATIVAS (para snapping / regla)
   orientación AddGuide:  0 = horizontal (pos = Y)   1 = vertical (pos = X)
   ============================================================ */
/* AE no expone numGuides de forma fiable: removemos el índice 0 (o 1)
   repetidamente hasta que removeGuide lance excepción (no quedan guías). */
function sg_clearGuidesInternal(c) {
  var guard = 0, removed;
  while (guard < 10000) {
    removed = false;
    try { c.removeGuide(0); removed = true; } catch (e) {}
    if (!removed) { try { c.removeGuide(1); removed = true; } catch (e2) {} }
    if (!removed) break;
    guard++;
  }
  return guard;
}

function sg_removeGuides() {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';
  app.beginUndoGroup('SmoothGuides: Eliminar guías');
  try { sg_clearGuidesInternal(c); }
  catch (e) { app.endUndoGroup(); return 'ERR:' + e.toString(); }
  app.endUndoGroup();
  return 'OK';
}

/* Añade guías nativas a la comp a partir del spec (sin abrir su propio undo) */
function sg_addGuidesFromSpec(c, s) {
  var W = c.width, H = c.height, added = 0;
  var V = 1, Hh = 0;
  function addV(x) { x = Math.round(x); if (x >= 0 && x <= W) { c.addGuide(V, x); added++; } }
  function addH(y) { y = Math.round(y); if (y >= 0 && y <= H) { c.addGuide(Hh, y); added++; } }
  function addRect(pct) {
    var mx = W * (1 - pct) / 2, my = H * (1 - pct) / 2;
    addV(mx); addV(W - mx); addH(my); addH(H - my);
  }

  if (s.center) { addV(W / 2); addH(H / 2); }
  if (s.thirds) { addV(W / 3); addV(2 * W / 3); addH(H / 3); addH(2 * H / 3); }

  if (s.grid && s.grid.on) {
    var cols = s.grid.cols || 6;
    var rows = s.grid.rows || Math.round(cols * H / W);
    for (var i = 1; i < cols; i++) addV(W * i / cols);
    for (var j = 1; j < rows; j++) addH(H * j / rows);
  }

  if (s.margins && s.margins.on) addRect(s.margins.pct || 0.9);

  if (s.safe && s.safe.length) {
    for (var k = 0; k < s.safe.length; k++) addRect(s.safe[k]);
  }

  if (s.custom && s.custom.length) {
    for (var m = 0; m < s.custom.length; m++) {
      var g = s.custom[m];
      if (g.o === 'v') addV(g.px);
      else if (g.o === 'h') addH(g.px);
      else if (g.o === 'box') {
        var cx = (g.cx != null) ? g.cx : W / 2;
        var cy = (g.cy != null) ? g.cy : H / 2;
        var bx = cx - g.w / 2, by = cy - g.h / 2;
        addV(bx); addV(bx + g.w); addH(by); addH(by + g.h);
      }
    }
  }
  return added;
}

function sg_apply(specJson) {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa. Selecciona o crea una comp.';

  var s;
  try { s = sg_parse(specJson); }
  catch (e) { return 'ERR:spec inválido — ' + e.toString(); }

  var added = 0;
  app.beginUndoGroup('SmoothGuides: Aplicar guías');
  try {
    if (s.clearFirst) sg_clearGuidesInternal(c);
    added = sg_addGuidesFromSpec(c, s);
  } catch (e) {
    app.endUndoGroup();
    return 'ERR:' + e.toString();
  }

  app.endUndoGroup();
  return 'OK:' + added;
}

/* ============================================================
   CAPA-GUÍA CON COLORES (overlay sobre el visor)
   Dibuja safe zones de color, tercios, centro, diagonales, etc.
   Se marca como guideLayer (no renderiza), locked y shy.
   ============================================================ */
var SG_LAYER_NAME = 'SMOOTH_GUIDES';

function sg_removeGuideLayerInternal(c) {
  for (var i = c.numLayers; i >= 1; i--) {
    var L = c.layer(i);
    if (L.name === SG_LAYER_NAME) {
      try { L.locked = false; } catch (e) {}   // una capa bloqueada no se puede borrar
      try { L.remove(); } catch (e2) {}
    }
  }
}

function sg_removeGuideLayer() {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';
  app.beginUndoGroup('SmoothGuides: Eliminar capa guía');
  sg_removeGuideLayerInternal(c);
  app.endUndoGroup();
  return 'OK';
}

/* Busca la capa guía en la comp activa */
function sg_findGuideLayer(c) {
  for (var i = 1; i <= c.numLayers; i++) {
    if (c.layer(i).name === SG_LAYER_NAME) return c.layer(i);
  }
  return null;
}

/* EL OJITO: muestra/oculta TODAS las guías en AE — la capa de color Y las nativas.
   visible=false → oculta la capa (enabled) + borra las guías nativas.
   visible=true  → muestra la capa + re-crea las guías nativas desde el spec.
   specJson puede ir vacío ('') cuando no se usan guías nativas. */
function sg_setGuidesVisible(visible, specJson) {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';
  visible = (visible === true || visible === 'true' || visible === 1 || visible === '1');

  app.beginUndoGroup('SmoothGuides: ' + (visible ? 'Mostrar' : 'Ocultar') + ' guías');
  try {
    // 1) Capa de color (el ojito real de la timeline)
    var L = sg_findGuideLayer(c);
    if (L) {
      var wasLocked = L.locked;
      L.locked = false;
      L.enabled = visible;
      L.locked = wasLocked;
    }
    // 2) Guías nativas de AE
    if (specJson) {
      sg_clearGuidesInternal(c);               // ocultar = quitarlas
      if (visible) {                           // mostrar = volver a crearlas
        sg_addGuidesFromSpec(c, sg_parse(specJson));
      }
    }
  } catch (e) { app.endUndoGroup(); return 'ERR:' + e.toString(); }
  app.endUndoGroup();
  return visible ? 'OK:visible' : 'OK:hidden';
}

/* Estado actual de las guías: visible | hidden | none */
function sg_getGuideLayerState() {
  var c = sg_activeComp();
  if (!c) return 'none';
  var L = sg_findGuideLayer(c);
  if (!L) return 'none';
  return L.enabled ? 'visible' : 'hidden';
}

function sg_addLine(contents, x1, y1, x2, y2, rgb, w, op) {
  var grp = contents.addProperty('ADBE Vector Group');
  var vg  = grp.property('ADBE Vectors Group');
  var sh  = vg.addProperty('ADBE Vector Shape - Group');
  var path = new Shape();
  path.vertices = [[x1, y1], [x2, y2]];
  path.inTangents = [[0, 0], [0, 0]];
  path.outTangents = [[0, 0], [0, 0]];
  path.closed = false;
  sh.property('ADBE Vector Shape').setValue(path);
  var st = vg.addProperty('ADBE Vector Graphic - Stroke');
  st.property('ADBE Vector Stroke Color').setValue(rgb);
  st.property('ADBE Vector Stroke Width').setValue(w);
  st.property('ADBE Vector Stroke Opacity').setValue(op);
  return grp;
}

function sg_addRectShape(contents, x, y, rw, rh, rgb, w, op) {
  var grp = contents.addProperty('ADBE Vector Group');
  var vg  = grp.property('ADBE Vectors Group');
  var sh  = vg.addProperty('ADBE Vector Shape - Group');
  var path = new Shape();
  path.vertices = [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]];
  path.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  path.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  path.closed = true;
  sh.property('ADBE Vector Shape').setValue(path);
  var st = vg.addProperty('ADBE Vector Graphic - Stroke');
  st.property('ADBE Vector Stroke Color').setValue(rgb);
  st.property('ADBE Vector Stroke Width').setValue(w);
  st.property('ADBE Vector Stroke Opacity').setValue(op);
  return grp;
}

function sg_applyGuideLayer(specJson) {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';

  var s;
  try { s = sg_parse(specJson); }
  catch (e) { return 'ERR:spec inválido — ' + e.toString(); }

  var W = c.width, H = c.height;
  var strokeW = Math.max(1.5, W / 540);
  var baseOp  = (s.opacity != null ? s.opacity : 0.7) * 100;

  app.beginUndoGroup('SmoothGuides: Capa guía');
  try {
    sg_removeGuideLayerInternal(c);

    var sl = c.layers.addShape();
    sl.name = SG_LAYER_NAME;

    // Hacer que el espacio de la capa == espacio de la comp
    var tr = sl.property('ADBE Transform Group');
    tr.property('ADBE Anchor Point').setValue([0, 0]);
    tr.property('ADBE Position').setValue([0, 0]);

    var contents = sl.property('ADBE Root Vectors Group');
    var mainRGB = sg_hex2rgb(s.color || '#3b82f6');

    // Safe zones de color
    if (s.safe && s.safe.length) {
      for (var k = 0; k < s.safe.length; k++) {
        var z = s.safe[k];
        var mx = W * (1 - z.pct) / 2, my = H * (1 - z.pct) / 2;
        sg_addRectShape(contents, mx, my, W - 2 * mx, H - 2 * my,
                        sg_hex2rgb(z.color), strokeW, 85);
      }
    }

    // Grid
    if (s.grid && s.grid.on) {
      var cols = s.grid.cols || 6;
      var rows = s.grid.rows || Math.round(cols * H / W);
      for (var i = 1; i < cols; i++) sg_addLine(contents, W * i / cols, 0, W * i / cols, H, mainRGB, strokeW * 0.6, 25);
      for (var j = 1; j < rows; j++) sg_addLine(contents, 0, H * j / rows, W, H * j / rows, mainRGB, strokeW * 0.6, 25);
    }

    // Diagonales
    if (s.diagonals) {
      sg_addLine(contents, 0, 0, W, H, mainRGB, strokeW, 40);
      sg_addLine(contents, W, 0, 0, H, mainRGB, strokeW, 40);
    }

    // Tercios
    if (s.thirds) {
      sg_addLine(contents, W / 3, 0, W / 3, H, mainRGB, strokeW, baseOp);
      sg_addLine(contents, 2 * W / 3, 0, 2 * W / 3, H, mainRGB, strokeW, baseOp);
      sg_addLine(contents, 0, H / 3, W, H / 3, mainRGB, strokeW, baseOp);
      sg_addLine(contents, 0, 2 * H / 3, W, 2 * H / 3, mainRGB, strokeW, baseOp);
    }

    // Centro / crosshair
    if (s.center || s.crosshair) {
      sg_addLine(contents, W / 2, 0, W / 2, H, [0.58, 0.64, 0.72, 1], strokeW, 70);
      sg_addLine(contents, 0, H / 2, W, H / 2, [0.58, 0.64, 0.72, 1], strokeW, 70);
    }

    // Guías personalizadas
    if (s.custom && s.custom.length) {
      for (var m = 0; m < s.custom.length; m++) {
        var g = s.custom[m];
        if (g.o === 'v')      sg_addLine(contents, g.px, 0, g.px, H, mainRGB, strokeW, baseOp);
        else if (g.o === 'h') sg_addLine(contents, 0, g.px, W, g.px, [0.13, 0.77, 0.37, 1], strokeW, baseOp);
        else if (g.o === 'box') {
          var cx = (g.cx != null) ? g.cx : W / 2;
          var cy = (g.cy != null) ? g.cy : H / 2;
          sg_addRectShape(contents, cx - g.w / 2, cy - g.h / 2, g.w, g.h, [0.55, 0.36, 0.96, 1], strokeW, baseOp);
        }
      }
    }

    sl.guideLayer = true;
    sl.locked = true;
    sl.shy = true;
    sl.enabled = true;
  } catch (e) {
    app.endUndoGroup();
    return 'ERR:' + e.toString();
  }

  app.endUndoGroup();
  return 'OK';
}

/* ============================================================
   CREAR COMPOSICIÓN CON UN FORMATO
   ============================================================ */
function sg_createComp(w, h, name) {
  w = parseInt(w) || 1080;
  h = parseInt(h) || 1920;
  try {
    var comp = app.project.items.addComp(
      name || ('SmoothGuides ' + w + 'x' + h),
      w, h, 1.0, 10, 30
    );
    comp.openInViewer();
    return 'OK:' + w + 'x' + h;
  } catch (e) { return 'ERR:' + e.toString(); }
}

/* ============================================================
   SNAP / CENTRAR CAPAS SELECCIONADAS
   ============================================================ */
function sg_centerSelectedLayers() {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';
  var moved = 0;
  app.beginUndoGroup('SmoothGuides: Centrar capas');
  try {
    for (var i = 1; i <= c.numLayers; i++) {
      var L = c.layer(i);
      if (L.selected) {
        var p = L.property('ADBE Transform Group').property('ADBE Position');
        if (p && p.canSetExpression !== undefined) {
          var v = p.value;
          if (v.length === 3) p.setValue([c.width / 2, c.height / 2, v[2]]);
          else p.setValue([c.width / 2, c.height / 2]);
          moved++;
        }
      }
    }
  } catch (e) { app.endUndoGroup(); return 'ERR:' + e.toString(); }
  app.endUndoGroup();
  return moved > 0 ? ('OK:' + moved) : 'ERR:No hay capas seleccionadas';
}

function sg_snapSelectedToGuide(type, value) {
  var c = sg_activeComp();
  if (!c) return 'ERR:No hay composición activa';
  value = parseFloat(value);
  var moved = 0;
  app.beginUndoGroup('SmoothGuides: Snap a guía');
  try {
    for (var i = 1; i <= c.numLayers; i++) {
      var L = c.layer(i);
      if (L.selected) {
        var p = L.property('ADBE Transform Group').property('ADBE Position');
        var v = p.value;
        if (type === 'vertical')   v[0] = value;
        if (type === 'horizontal') v[1] = value;
        p.setValue(v);
        moved++;
      }
    }
  } catch (e) { app.endUndoGroup(); return 'ERR:' + e.toString(); }
  app.endUndoGroup();
  return 'OK:' + moved;
}

/* ============================================================
   BLOQUEAR / DESBLOQUEAR GUÍAS (preferencia global)
   ============================================================ */
function sg_lockGuides() {
  try {
    app.preferences.savePrefAsBool('Views', 'Lock Guides', true, PREFType.PREF_Type_MACHINE_SPECIFIC);
    return 'OK';
  } catch (e) { return 'ERR:' + e.toString(); }
}

function sg_unlockGuides() {
  try {
    app.preferences.savePrefAsBool('Views', 'Lock Guides', false, PREFType.PREF_Type_MACHINE_SPECIFIC);
    return 'OK';
  } catch (e) { return 'ERR:' + e.toString(); }
}
