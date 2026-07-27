/**
 * SmoothPaste — motor ExtendScript.
 * Exporta el frame actual a PNG e importa imágenes. Devuelve TEXTO PLANO.
 *   OK<US>payload  |  ERR<US>mensaje       (US = \x1f)
 */

function SP_saveFramePng() {
  try {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return 'ERR\x1fNo hay composición activa.';

    var stamp = (new Date()).getTime();
    var png = new File(Folder.temp.fsName + '/sp_frame_' + stamp + '.png');
    if (png.exists) png.remove();
    var saved = false;

    // AE 2024+: exportación directa del frame
    if (typeof comp.saveFrameToPng === 'function') {
      try {
        comp.saveFrameToPng(comp.time, png);
        for (var w = 0; w < 150; w++) { if (png.exists) { saved = true; break; } $.sleep(40); }
      } catch (eS) {}
    }

    // Respaldo: render de un frame por la cola de render
    if (!saved) {
      try {
        var rq = app.project.renderQueue;
        var item = rq.items.add(comp);
        item.timeSpanStart = comp.time;
        item.timeSpanDuration = 1 / comp.frameRate;
        var om = item.outputModule(1);
        var tpls = om.templates, ti;
        for (ti = 0; ti < tpls.length; ti++) { if (tpls[ti].indexOf('PNG') !== -1) { om.applyTemplate(tpls[ti]); break; } }
        om.file = png;
        item.render = true;
        app.project.renderQueue.render();
        item.remove();
        if (png.exists) saved = true;
      } catch (eR) {}
    }

    if (!saved) return 'ERR\x1fNo se pudo exportar el frame. Abre la composición en el visor.';
    return 'OK\x1f' + png.fsName;
  } catch (e) {
    return 'ERR\x1f' + String(e);
  }
}

// Ruta temporal donde el panel escribirá la imagen del portapapeles.
function SP_pasteTempPath() {
  try {
    var stamp = (new Date()).getTime();
    return 'OK\x1f' + new File(Folder.temp.fsName + '/sp_paste_' + stamp + '.png').fsName;
  } catch (e) {
    return 'ERR\x1f' + String(e);
  }
}

function SP_importImage(path) {
  app.beginUndoGroup('SmoothPaste: Pegar imagen');
  try {
    var f = new File(path);
    if (!f.exists) { app.endUndoGroup(); return 'ERR\x1fNo se encontró la imagen guardada.'; }
    var io = new ImportOptions(f);
    io.importIntoProject = true;
    try { if (/\.png$/i.test(f.name)) io.alphaMode = AlphaMode.STRAIGHT; } catch (eA) {}
    var item = app.project.importFile(io);
    var comp = app.project.activeItem;
    var added = '0';
    if (comp && (comp instanceof CompItem)) { comp.layers.add(item); added = '1'; }
    app.endUndoGroup();
    return 'OK\x1f' + (item.name || 'imagen') + '\x1f' + added;
  } catch (e) {
    try { app.endUndoGroup(); } catch (ig) {}
    return 'ERR\x1f' + String(e);
  }
}
