/* ============================================================
   SmoothText — host ExtendScript para After Effects
   Recibe la configuración desde el panel y crea una capa de texto
   con animadores + Expression Selector cuya matemática de easing
   es idéntica a la del preview (fidelidad 100%).
   ============================================================ */

// Match names de las propiedades de animador de texto.
// Centralizados aquí por si alguna versión de AE difiere.
var MN = {
  textProps:   "ADBE Text Properties",
  srcText:     "ADBE Text Document",
  moreOptions: "ADBE Text More Options",
  anchorGroup: "ADBE Text Anchor Point Option",
  animators:   "ADBE Text Animators",
  animator:    "ADBE Text Animator",
  animProps:   "ADBE Text Animator Properties",
  selectors:   "ADBE Text Selectors",
  exprSelector:"ADBE Text Expressible Selector",
  exprAmount:  "ADBE Text Expressible Amount",
  basedOn:     "ADBE Text Range Type2",
  position:    "ADBE Text Position 3D",
  scale:       "ADBE Text Scale 3D",
  rotation:    "ADBE Text Rotation",
  opacity:     "ADBE Text Opacity",
  blur:        "ADBE Text Blur",
  tracking:    "ADBE Text Tracking Amount"
};

function SmoothText_apply(cfg) {
  try {
    app.beginUndoGroup("SmoothText: aplicar animación");

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
      app.endUndoGroup();
      return "No hay una composición activa. Abre o crea una composición y selecciónala.";
    }

    // ¿Hay una capa de texto seleccionada? -> se anima esa. Si no -> se crea una.
    var tl = null;
    var sel = comp.selectedLayers;
    for (var s = 0; s < sel.length; s++) {
      if (sel[s] instanceof TextLayer) { tl = sel[s]; break; }
    }
    var created = false;

    // Sin capa seleccionada: si ya existe una capa SmoothText, se REEMPLAZA
    // su animación (uno por otro) en vez de crear otra capa encima.
    if (!tl) tl = findSmoothTextLayer(comp);

    if (!tl) {
      tl = comp.layers.addText(cfg.text || "SmoothText");
      tl.name = "SmoothText";
      created = true;

      // Estilo solo para capa nueva (no tocamos el estilo de una capa existente)
      var srcText = tl.property(MN.textProps).property(MN.srcText);
      var td = srcText.value;
      if (cfg.fontSize) td.fontSize = cfg.fontSize;
      try { td.applyFill = true; if (cfg.fill) td.fillColor = cfg.fill; } catch (e) {}
      try {
        if (cfg.align === "center")      td.justification = ParagraphJustification.CENTER_JUSTIFY;
        else if (cfg.align === "right")  td.justification = ParagraphJustification.RIGHT_JUSTIFY;
        else                             td.justification = ParagraphJustification.LEFT_JUSTIFY;
      } catch (e) {}
      srcText.setValue(td);

      // Centrar la capa nueva en la composición
      try { tl.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]); } catch (e) {}
    }

    // Reaplicar es idempotente: quitamos animadores y marcadores SmoothText previos
    removeSmoothTextAnimators(tl);
    removeSmoothTextMarkers(tl);

    // Anclas por carácter (escala/rotación giran sobre cada letra)
    try {
      var more = tl.property(MN.textProps).property(MN.moreOptions);
      more.property(MN.anchorGroup).setValue(1); // 1 = Character
    } catch (e) {}

    // Construir animadores + recoger errores de expresión (diagnóstico)
    var errs = [];
    var inRes = buildAnimator(tl, "SmoothText In", cfg["in"], cfg.animateBy);
    if (inRes.amt) { var ie = safeExprError(inRes.amt); if (ie) errs.push("IN: " + ie); }

    if (cfg.exit) {
      var outRes = buildAnimator(tl, "SmoothText Out", cfg.exit, cfg.animateBy);
      if (outRes.amt) { var oe = safeExprError(outRes.amt); if (oe) errs.push("OUT: " + oe); }
    }

    // Marcadores IN/OUT para ajustar tiempos/duraciones desde la línea de tiempo
    if (cfg.markers) {
      if (cfg.markers["in"]) addMarker(tl, "SmoothText IN", tl.inPoint + cfg.markers["in"].time, cfg.markers["in"].dur);
      if (cfg.markers.out)   addMarker(tl, "SmoothText OUT", tl.inPoint + cfg.markers.out.time, cfg.markers.out.dur);
    }

    app.endUndoGroup();

    var where = created ? "capa nueva" : "capa sel. (" + tl.name + ")";
    var diag = " · props:" + inRes.count + " · pos:[" + inRes.pos[0] + "," + inRes.pos[1] + "]";
    if (errs.length) return "Aviso [" + where + "]" + diag + " — expr: " + errs.join(" | ");
    return "OK · " + where + diag;
  } catch (err) {
    try { app.endUndoGroup(); } catch (e) {}
    return "Error: " + err.toString() + (err.line ? (" [línea " + err.line + "]") : "");
  }
}

// ¿La capa ya tiene animadores SmoothText aplicados?
function layerHasSmoothText(L) {
  try {
    var an = L.property(MN.textProps).property(MN.animators);
    for (var k = 1; k <= an.numProperties; k++) {
      var a = an.property(k);
      if (a && a.name && a.name.indexOf("SmoothText") === 0) return true;
    }
  } catch (e) {}
  return false;
}

// Busca en la comp una capa de texto que ya tenga SmoothText (para reemplazar).
// Prioriza la que tenga animadores; si no, la llamada exactamente "SmoothText".
function findSmoothTextLayer(comp) {
  var byName = null;
  for (var i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (!(L instanceof TextLayer)) continue;
    if (layerHasSmoothText(L)) return L;
    if (!byName && L.name === "SmoothText") byName = L;
  }
  return byName;
}

function removeSmoothTextAnimators(tl) {
  try {
    var animators = tl.property(MN.textProps).property(MN.animators);
    for (var k = animators.numProperties; k >= 1; k--) {
      var a = animators.property(k);
      if (a && a.name && a.name.indexOf("SmoothText") === 0) a.remove();
    }
  } catch (e) {}
}

function safeExprError(prop) {
  try { return prop.expressionError && prop.expressionError.length ? prop.expressionError : ""; }
  catch (e) { return ""; }
}

function addMarker(tl, name, timeSec, durSec) {
  try {
    var mp = tl.property("ADBE Marker");
    var mv = new MarkerValue(name);
    if (durSec && durSec > 0) mv.duration = durSec;
    mp.setValueAtTime(timeSec, mv);
  } catch (e) {}
}

function removeSmoothTextMarkers(tl) {
  try {
    var mp = tl.property("ADBE Marker");
    for (var k = mp.numKeys; k >= 1; k--) {
      var c = mp.keyValue(k).comment;
      if (c && c.indexOf("SmoothText") === 0) mp.removeKey(k);
    }
  } catch (e) {}
}

// Fija un valor respetando la dimensión real de la propiedad (2D vs 3D).
function setDim(prop, x, y, third) {
  var n = 1;
  try { n = prop.value.length; } catch (e) { n = 1; }
  if (n >= 3) prop.setValue([x, y, third]);
  else if (n === 2) prop.setValue([x, y]);
  else prop.setValue(x);
}

function buildAnimator(tl, name, v, animateBy) {
  var animators = tl.property(MN.textProps).property(MN.animators);
  var anim = animators.addProperty(MN.animator);
  anim.name = name;

  var props = anim.property(MN.animProps);
  var posRead = [0, 0];

  // Propiedades animables = valores "from" (entrada) / "target" (salida)
  if (v.position) {
    var posProp = props.addProperty(MN.position);
    setDim(posProp, v.position[0], v.position[1], 0);
    try { posRead = [Math.round(posProp.value[0]), Math.round(posProp.value[1])]; } catch (e) {}
  }
  if (v.scale) {
    var scProp = props.addProperty(MN.scale);
    setDim(scProp, v.scale[0], v.scale[1], 100);
  }
  if (typeof v.rotation === "number") {
    props.addProperty(MN.rotation).setValue(v.rotation);
  }
  if (typeof v.opacity === "number") {
    props.addProperty(MN.opacity).setValue(v.opacity);
  }
  if (v.blur) {
    try { setDim(props.addProperty(MN.blur), v.blur[0], v.blur[1], 0); } catch (e) {}
  }
  if (typeof v.tracking === "number" && v.tracking !== 0) {
    try { props.addProperty(MN.tracking).setValue(v.tracking); } catch (e) {}
  }

  // Selector de expresión (misma matemática que el preview)
  var sels = anim.property(MN.selectors);
  // Quitar cualquier Range Selector por defecto para que solo mande la expresión
  while (sels.numProperties > 0) {
    try { sels.property(1).remove(); } catch (e) { break; }
  }
  var esel = sels.addProperty(MN.exprSelector);

  // Basado en: caracteres / palabras / líneas
  try {
    var basedOn = 1; // 1 = Characters
    if (animateBy === "words") basedOn = 3;
    else if (animateBy === "lines") basedOn = 4;
    esel.property(MN.basedOn).setValue(basedOn);
  } catch (e) {}

  var amt = esel.property(MN.exprAmount);
  amt.expression = v.expr;
  try { amt.expressionEnabled = true; } catch (e) {}
  return { amt: amt, pos: posRead, count: props.numProperties };
}
