/**
 * Type Tools — main.jsx (motor ExtendScript)
 * Herramientas de texto para After Effects CC 2021+ (v17.5+)
 *
 * Entrada única: tt_run(paramsJSON) donde params = {
 *   op: 'create'|'split'|'import'|'highlight'|'underline'|'strike'|
 *       'replace'|'counter'|'typewriter'|'style'|'clean',
 *   color:[r,g,b], strokeColor:[r,g,b], strokeWidth, hiPad, lineW,
 *   twSpeed, cntFrom, cntTo, cntDur, cntDec
 * }
 * Devuelve 'OK:<msg>' | 'ERR:<msg>'
 */

/* ── Utilidades ─────────────────────────────────────────── */
function tt_activeComp() {
  var c = app.project.activeItem;
  return (c && (c instanceof CompItem)) ? c : null;
}
function tt_parse(json) { return eval('(' + json + ')'); }

/* Capas de texto seleccionadas */
function tt_selText(c) {
  var out = [], sel = c.selectedLayers;
  for (var i = 0; i < sel.length; i++) {
    if (sel[i] instanceof TextLayer) out.push(sel[i]);
  }
  return out;
}

/* Color RGBA (4 canales) para formas */
function tt_rgba(rgb) { return [rgb[0], rgb[1], rgb[2], 1]; }

/* Copia el transform de una capa a otra (alinea el overlay con el texto) */
function tt_copyTransform(from, to) {
  var f = from.property('ADBE Transform Group');
  var t = to.property('ADBE Transform Group');
  t.property('ADBE Anchor Point').setValue(f.property('ADBE Anchor Point').value);
  t.property('ADBE Position').setValue(f.property('ADBE Position').value);
  t.property('ADBE Scale').setValue(f.property('ADBE Scale').value);
  try { t.property('ADBE Rotate Z').setValue(f.property('ADBE Rotate Z').value); } catch (e) {}
}

/* Crea una capa de forma rectangular alineada con el texto L */
function tt_makeBar(c, L, name, l, t, r, b, col, below) {
  var sh = c.layers.addShape();
  sh.name = name;
  tt_copyTransform(L, sh);

  var root = sh.property('ADBE Root Vectors Group');
  var grp  = root.addProperty('ADBE Vector Group');
  var gc   = grp.property('ADBE Vectors Group');

  var pathProp = gc.addProperty('ADBE Vector Shape - Group').property('ADBE Vector Shape');
  var s = new Shape();
  s.vertices = [[l, t], [r, t], [r, b], [l, b]];
  s.closed = true;
  pathProp.setValue(s);

  var fill = gc.addProperty('ADBE Vector Graphic - Fill');
  fill.property('ADBE Vector Fill Color').setValue(tt_rgba(col));

  if (below) sh.moveAfter(L); else sh.moveBefore(L);
  return sh;
}

/* ── Medidor de texto (capa temporal reutilizable) ──────── */
/* Permite medir el ancho de cualquier subcadena con el estilo del texto,
   imprescindible para colocar palabras/letras y subrayados por línea. */
function tt_makeMeasurer(c, doc) {
  var L = c.layers.addText('I');
  var sp = L.property('ADBE Text Properties').property('ADBE Text Document');
  var m = { L: L, sp: sp, doc: doc, iW: 0 };
  m.iW = tt_w(m, c, 'I');
  return m;
}
function tt_w(m, c, s) {
  if (s === '') return 0;
  m.doc.text = s;
  m.sp.setValue(m.doc);
  try { return m.L.sourceRectAtTime(c.time, false).width; } catch (e) { return 0; }
}
/* Ancho de un prefijo, forzando que cuente los espacios finales */
function tt_prefix(m, c, s) { return tt_w(m, c, s + 'I') - m.iW; }

/* Rect completo de una subcadena con el estilo del texto */
function tt_rect(m, c, s) {
  if (s !== '') { m.doc.text = s; m.sp.setValue(m.doc); }
  try { return m.L.sourceRectAtTime(c.time, false); }
  catch (e) { return { left: 0, top: 0, width: 0, height: 0 }; }
}

/* x de inicio de una línea según su justificación (en espacio de capa) */
function tt_lineStartX(block, lineW, just) {
  if (just === ParagraphJustification.RIGHT_JUSTIFY) return (block.left + block.width) - lineW;
  if (just === ParagraphJustification.CENTER_JUSTIFY) return (block.left + block.width / 2) - lineW / 2;
  return block.left;
}

/* Métricas por línea: x inicial, ancho, línea base y ascenso (espacio de capa).
   Estima el interlineado a partir del alto del bloque y de la 1ª línea. */
function tt_lineInfos(m, c, block, lines, just) {
  var n = lines.length, infos = [];
  var h0 = 0;
  for (var a = 0; a < n; a++) { if (lines[a].length) { h0 = tt_rect(m, c, lines[a]).height; break; } }
  if (h0 <= 0) h0 = block.height / (n || 1);
  var leading = (n > 1) ? (block.height - h0) / (n - 1) : 0;

  for (var i = 0; i < n; i++) {
    var line = lines[i];
    var rc = tt_rect(m, c, line.length ? line : 'Hg');
    var lineW = line.length ? rc.width : 0;
    var inkTop = block.top + i * leading;
    infos.push({
      line: line,
      lineW: lineW,
      startX: tt_lineStartX(block, lineW, just),
      baseline: inkTop - rc.top,   // rc.top es negativo (tinta sobre la línea base)
      ascent: -rc.top
    });
  }
  return infos;
}

/* ── 1 · Crear texto ────────────────────────────────────── */
function tt_create(c) {
  var L = c.layers.addText('Texto');
  L.property('ADBE Transform Group').property('ADBE Position').setValue([c.width / 2, c.height / 2]);
  return 'OK:Capa de texto creada';
}

/* ── 2 · Dividir: líneas / palabras / letras ────────────── */
/* mode = 'lines' | 'words' | 'letters' (lo decide Shift/Ctrl en la UI).
   Cada fragmento se coloca en su posición real (texto de punto, sin
   rotación/escala). */
function tt_split(c, p) {
  var layers = tt_selText(c);
  if (!layers.length) return 'ERR:Selecciona una capa de texto';
  var mode = p.splitMode || 'lines';
  var made = 0;

  for (var k = 0; k < layers.length; k++) {
    var L = layers[k];
    var src = L.property('ADBE Text Properties').property('ADBE Text Document');
    var doc = src.value;
    var tg = L.property('ADBE Transform Group');
    var P = tg.property('ADBE Position').value;
    var A = tg.property('ADBE Anchor Point').value;

    var block;
    try { block = L.sourceRectAtTime(c.time, false); } catch (e) { continue; }

    var lines = doc.text.split(/\r\n|\r|\n/);
    var n = lines.length;
    var just = doc.justification;

    var m = tt_makeMeasurer(c, doc);
    var infos = tt_lineInfos(m, c, block, lines, just); // sólo para la línea base (Y)
    doc.justification = ParagraphJustification.LEFT_JUSTIFY; // los fragmentos quedan alineados a su origen

    for (var i = 0; i < n; i++) {
      var line = lines[i];
      if (line.length === 0) continue;
      var baseline = infos[i].baseline;

      // Centinela: cualquier letra estable. Se cancela al restar dos medidas,
      // así que su propio bearing/kerning no afecta al resultado.
      var sent = 'o';
      var sentW = tt_w(m, c, sent);
      var advLine = tt_w(m, c, line + sent) - sentW; // avance total de la línea (para justificación)

      // Origen de pluma de la línea (x=0 de la capa = punto de justificación)
      var penStart;
      if (just === ParagraphJustification.RIGHT_JUSTIFY) penStart = -advLine;
      else if (just === ParagraphJustification.CENTER_JUSTIFY) penStart = -advLine / 2;
      else penStart = 0;

      // construir lista de fragmentos con su índice de inicio en la línea
      var tokens = [];
      if (mode === 'words') {
        var re = /\S+/g, mt;
        while ((mt = re.exec(line)) !== null) tokens.push({ t: mt[0], idx: mt.index });
      } else if (mode === 'letters') {
        for (var ci = 0; ci < line.length; ci++) {
          if (line.charAt(ci) !== ' ') tokens.push({ t: line.charAt(ci), idx: ci });
        }
      } else {
        tokens.push({ t: line, idx: 0 });
      }

      for (var ti = 0; ti < tokens.length; ti++) {
        var tok = tokens[ti];
        var tok1 = tok.t.charAt(0);
        var pre = line.substring(0, tok.idx);
        // Origen de pluma del fragmento capturando el kerning con el carácter
        // previo: avance("prefijo+1ªletra+centinela") − avance("1ªletra+centinela").
        // El centinela (y su seam de kerning) se cancela → resultado exacto.
        var penOrigin = tt_w(m, c, pre + tok1 + sent) - tt_w(m, c, tok1 + sent);
        var penX = penStart + penOrigin;
        var targetX = P[0] - A[0] + penX;
        var targetY = P[1] - A[1] + baseline;

        var nl = c.layers.addText(tok.t);
        doc.text = tok.t;
        nl.property('ADBE Text Properties').property('ADBE Text Document').setValue(doc);

        // ancla en el origen de pluma (0,0 = línea base izquierda) → posición exacta
        var ntg = nl.property('ADBE Transform Group');
        ntg.property('ADBE Anchor Point').setValue([0, 0]);
        ntg.property('ADBE Position').setValue([targetX, targetY]);
        nl.name = (mode === 'letters') ? tok.t : tok.t.substr(0, 24);
        nl.moveBefore(L);
        made++;
      }
    }
    m.L.remove();
    L.enabled = false;
    L.locked = false;
    L.remove();
  }

  if (!made) return 'ERR:Nada que dividir';
  var w = (mode === 'words') ? 'palabras' : (mode === 'letters' ? 'letras' : 'líneas');
  return 'OK:' + made + ' ' + w + ' separadas';
}

/* ── 3 · Importar texto desde .txt ──────────────────────── */
function tt_import(c) {
  var f = File.openDialog('Selecciona un archivo de texto', 'Texto:*.txt;*.csv;*.md,Todos:*.*');
  if (!f) return 'ERR:Importación cancelada';
  f.open('r'); f.encoding = 'UTF-8';
  var content = f.read(); f.close();
  var lines = content.split(/\r\n|\r|\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (!lines.length) return 'ERR:El archivo está vacío';

  var layers = tt_selText(c), n = 0;
  if (layers.length) {
    var count = Math.min(layers.length, lines.length);
    for (var i = 0; i < count; i++) {
      var src = layers[i].property('ADBE Text Properties').property('ADBE Text Document');
      var doc = src.value; doc.text = lines[i]; src.setValue(doc); n++;
    }
    return 'OK:' + n + ' capa(s) actualizada(s)';
  }
  // sin selección: crear una capa por línea
  for (var j = 0; j < lines.length; j++) {
    var L = c.layers.addText(lines[j]);
    L.property('ADBE Transform Group').property('ADBE Position')
      .setValue([c.width / 2, c.height * 0.3 + j * 80]);
    n++;
  }
  return 'OK:' + n + ' capa(s) creada(s)';
}

/* ── 4/5/6 · Resaltar / Subrayar / Tachar ───────────────── */
function tt_bars(c, p, kind) {
  var layers = tt_selText(c);
  if (!layers.length) return 'ERR:Selecciona una capa de texto';
  var done = 0;

  for (var i = 0; i < layers.length; i++) {
    var L = layers[i];
    var block;
    try { block = L.sourceRectAtTime(c.time, false); } catch (e) { continue; }

    var doc = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    var txtCol = (doc.applyFill && doc.fillColor) ? doc.fillColor : p.color;

    // El resaltado cubre todo el bloque (una sola caja)
    if (kind === 'highlight') {
      var pad = p.hiPad;
      tt_makeBar(c, L, 'TT Highlight',
        block.left - pad, block.top - pad,
        block.left + block.width + pad, block.top + block.height + pad, p.color, true);
      done++;
      continue;
    }

    // Subrayado / tachado: una barra POR LÍNEA, ajustada a su ancho y línea base
    var lines = doc.text.split(/\r\n|\r|\n/);
    var n = lines.length;
    var just = doc.justification;
    var m = tt_makeMeasurer(c, doc);
    var infos = tt_lineInfos(m, c, block, lines, just);

    for (var li = 0; li < n; li++) {
      if (lines[li].length === 0) continue;
      var inf = infos[li];
      var lx = inf.startX;
      var rx = inf.startX + inf.lineW;

      if (kind === 'underline') {
        var yU = inf.baseline + Math.max(p.lineW, inf.ascent * 0.12); // justo bajo la línea base
        tt_makeBar(c, L, 'TT Underline', lx, yU - p.lineW / 2, rx, yU + p.lineW / 2, txtCol, true);
      } else { // strike: a media altura de x (≈ 1/3 del ascenso sobre la base)
        var yS = inf.baseline - inf.ascent * 0.33;
        tt_makeBar(c, L, 'TT Strike', lx, yS - p.lineW / 2, rx, yS + p.lineW / 2, txtCol, false);
      }
      done++;
    }
    m.L.remove();
  }

  var name = kind === 'highlight' ? 'resaltado' : (kind === 'underline' ? 'subrayado' : 'tachado');
  return 'OK:' + done + ' ' + name + '(s) aplicado(s)';
}

/* ── 7 · Buscar y reemplazar ────────────────────────────── */
function tt_replace(c) {
  var layers = tt_selText(c);
  if (!layers.length) return 'ERR:Selecciona capas de texto';
  var find = prompt('Buscar texto:', '');
  if (find === null || find === '') return 'ERR:Reemplazo cancelado';
  var rep = prompt('Reemplazar con:', '');
  if (rep === null) return 'ERR:Reemplazo cancelado';

  var changed = 0;
  for (var i = 0; i < layers.length; i++) {
    var src = layers[i].property('ADBE Text Properties').property('ADBE Text Document');
    var doc = src.value;
    if (doc.text.indexOf(find) === -1) continue;
    doc.text = doc.text.split(find).join(rep);
    src.setValue(doc); changed++;
  }
  return 'OK:' + changed + ' capa(s) modificada(s)';
}

/* ── 8 · Contador numérico ──────────────────────────────── */
function tt_counter(c, p) {
  var layers = tt_selText(c);
  if (!layers.length) { layers = [c.layers.addText(String(p.cntFrom))]; }
  var done = 0, lastErr = '';
  for (var i = 0; i < layers.length; i++) {
    try {
      var L = layers[i];
      var fx = L.property('ADBE Effect Parade').addProperty('ADBE Slider Control');
      fx.name = 'TT Counter';
      var sl = fx.property(1); // el deslizador (índice, no nombre → independiente del idioma)
      sl.setValueAtTime(c.time, p.cntFrom);
      sl.setValueAtTime(c.time + p.cntDur, p.cntTo);

      // La expresión también referencia el efecto y su parámetro por índice
      var expr =
        'var s = thisLayer.effect("TT Counter")(1).value;\n' +
        'var d = ' + p.cntDec + ';\n' +
        'var out = (d > 0) ? s.toFixed(d) : Math.round(s).toString();\n' +
        'out;';
      L.property('ADBE Text Properties').property('ADBE Text Document').expression = expr;
      done++;
    } catch (e) { lastErr = e.toString(); }
  }
  if (!done) return 'ERR:Contador — ' + lastErr;
  return 'OK:' + done + ' contador(es) creado(s)';
}

/* ── 9 · Máquina de escribir ────────────────────────────── */
function tt_typewriter(c, p) {
  var layers = tt_selText(c);
  if (!layers.length) return 'ERR:Selecciona una capa de texto';
  var done = 0;
  for (var i = 0; i < layers.length; i++) {
    var L = layers[i];
    var doc = L.property('ADBE Text Properties').property('ADBE Text Document').value;
    var nChars = doc.text.length || 1;
    var dur = Math.max(0.1, nChars * p.twSpeed);

    var anim = L.property('ADBE Text Properties')
                .property('ADBE Text Animators').addProperty('ADBE Text Animator');
    anim.name = 'TT Typewriter';
    anim.property('ADBE Text Animator Properties').addProperty('ADBE Text Opacity').setValue(0);

    var sel = anim.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
    var start = sel.property('ADBE Text Percent Start');
    start.setValueAtTime(c.time, 0);
    start.setValueAtTime(c.time + dur, 100);
    done++;
  }
  return 'OK:' + done + ' máquina(s) de escribir';
}

/* ── 10 · Estilo (relleno + trazo) ──────────────────────── */
function tt_style(c, p) {
  var layers = tt_selText(c);
  if (!layers.length) return 'ERR:Selecciona capas de texto';
  var done = 0;
  for (var i = 0; i < layers.length; i++) {
    var src = layers[i].property('ADBE Text Properties').property('ADBE Text Document');
    var doc = src.value;
    doc.applyFill = true;
    doc.fillColor = p.color;
    if (p.strokeWidth > 0) {
      doc.applyStroke = true;
      doc.strokeColor = p.strokeColor;
      doc.strokeWidth = p.strokeWidth;
      doc.strokeOverFill = true;
    }
    src.setValue(doc); done++;
  }
  return 'OK:Estilo aplicado a ' + done + ' capa(s)';
}

/* ── 11 · Limpiar añadidos de Type Tools ────────────────── */
function tt_clean(c) {
  var sel = c.selectedLayers, removed = 0;
  for (var i = sel.length - 1; i >= 0; i--) {
    var L = sel[i];
    // capas de overlay creadas por Type Tools
    if (L.name && L.name.indexOf('TT ') === 0 && (L instanceof ShapeLayer)) {
      try { L.locked = false; L.remove(); removed++; continue; } catch (e) {}
    }
    if (L instanceof TextLayer) {
      // efecto contador
      try {
        var fx = L.property('ADBE Effect Parade').property('TT Counter');
        if (fx) { fx.remove(); removed++; }
      } catch (e) {}
      // animador máquina de escribir
      try {
        var anims = L.property('ADBE Text Properties').property('ADBE Text Animators');
        for (var a = anims.numProperties; a >= 1; a--) {
          var an = anims.property(a);
          if (an.name === 'TT Typewriter') { an.remove(); removed++; }
        }
      } catch (e2) {}
      // expresión del contador
      try {
        var st = L.property('ADBE Text Properties').property('ADBE Text Document');
        if (st.expressionEnabled) { st.expression = ''; removed++; }
      } catch (e3) {}
    }
  }
  if (!removed) return 'ERR:Nada que limpiar en la selección';
  return 'OK:' + removed + ' elemento(s) eliminado(s)';
}

/* ── ENTRADA PRINCIPAL ──────────────────────────────────── */
function tt_run(paramsJson) {
  var c = tt_activeComp();
  if (!c) return 'ERR:No hay composición activa';

  var p;
  try { p = tt_parse(paramsJson); }
  catch (e) { return 'ERR:params inválidos — ' + e.toString(); }

  var res;
  app.beginUndoGroup('Type Tools: ' + p.op);
  try {
    switch (p.op) {
      case 'create':     res = tt_create(c); break;
      case 'split':      res = tt_split(c, p); break;
      case 'import':     res = tt_import(c); break;
      case 'highlight':  res = tt_bars(c, p, 'highlight'); break;
      case 'underline':  res = tt_bars(c, p, 'underline'); break;
      case 'strike':     res = tt_bars(c, p, 'strike'); break;
      case 'replace':    res = tt_replace(c); break;
      case 'counter':    res = tt_counter(c, p); break;
      case 'typewriter': res = tt_typewriter(c, p); break;
      case 'style':      res = tt_style(c, p); break;
      case 'clean':      res = tt_clean(c); break;
      default:           res = 'ERR:operación desconocida';
    }
  } catch (e) {
    app.endUndoGroup();
    return 'ERR:' + e.toString();
  }
  app.endUndoGroup();
  return res;
}
