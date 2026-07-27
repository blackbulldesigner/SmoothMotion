/**
 * SmoothTraductor — motor ExtendScript.
 * Lee el texto de la capa seleccionada y aplica la traducción DUPLICANDO la capa
 * (la traducción va en la copia) y OCULTANDO la original.
 * Devuelve TEXTO PLANO (AE 2025 se come los retornos con JSON).
 *   OK<US>payload   |   ERR<US>mensaje       (US = \x1f)
 */

function STR_textDoc(layer) {
  try { return layer.property('ADBE Text Properties').property('ADBE Text Document'); }
  catch (e) { return null; }
}

function STR_readSelectedText() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return 'ERR\x1fNo hay composición activa.';
    var sel = comp.selectedLayers;
    if (!sel.length) return 'ERR\x1fSelecciona una capa de texto.';
    var st = STR_textDoc(sel[0]);
    if (!st) return 'ERR\x1fLa capa seleccionada no es de texto.';
    var txt = '';
    try { txt = st.value.text; } catch (e2) { return 'ERR\x1fNo se pudo leer el texto de la capa.'; }
    return 'OK\x1f' + txt;
  } catch (e) {
    return 'ERR\x1f' + String(e);
  }
}

function STR_applyTranslation(translated, tag) {
  app.beginUndoGroup('SmoothTraductor: Aplicar traducción');
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) { app.endUndoGroup(); return 'ERR\x1fNo hay composición activa.'; }
    var sel = comp.selectedLayers;
    if (!sel.length) { app.endUndoGroup(); return 'ERR\x1fSelecciona una capa de texto.'; }

    var layer = sel[0];
    if (!STR_textDoc(layer)) { app.endUndoGroup(); return 'ERR\x1fLa capa seleccionada no es de texto.'; }

    // Duplicar (la copia queda encima) y ponerle el texto traducido
    var dup = layer.duplicate();
    var dupST = STR_textDoc(dup);
    if (!dupST) { app.endUndoGroup(); return 'ERR\x1fNo se pudo preparar la capa traducida.'; }

    var td = dupST.value;
    td.text = String(translated);
    dupST.setValue(td);

    var suffix = (tag && String(tag).length) ? (' [' + tag + ']') : ' [traducido]';
    try { dup.name = layer.name + suffix; } catch (eN) {}

    // Ocultar la original
    layer.enabled = false;

    try { layer.selected = false; dup.selected = true; } catch (eSel) {}

    app.endUndoGroup();
    return 'OK\x1f' + dup.name;
  } catch (e) {
    try { app.endUndoGroup(); } catch (ig) {}
    return 'ERR\x1f' + String(e);
  }
}
