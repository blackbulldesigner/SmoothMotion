/**
 * SmoothExplorer — motor ExtendScript.
 * Devuelve TEXTO PLANO (AE 2025 se come los retornos con JSON.stringify).
 *   Importar:  OK<US>nombre<US>added(0/1)  |  ERR<US>mensaje   (US = \x1f)
 */

function SEXP_import(path, addToComp) {
  app.beginUndoGroup('SmoothExplorer: Importar');
  try {
    var f = new File(path);
    if (!f.exists) { app.endUndoGroup(); return 'ERR\x1fArchivo no encontrado.'; }

    var io = new ImportOptions(f);
    try { if (io.canImportAs(ImportAsType.FOOTAGE)) io.importAs = ImportAsType.FOOTAGE; } catch (eIo) {}

    var item = app.project.importFile(io);
    var added = '0';
    if (addToComp === true || addToComp === 'true') {
      var comp = app.project.activeItem;
      if (comp && (comp instanceof CompItem)) { comp.layers.add(item); added = '1'; }
    }
    app.endUndoGroup();
    return 'OK\x1f' + (item.name || '') + '\x1f' + added;
  } catch (e) {
    try { app.endUndoGroup(); } catch (ig) {}
    return 'ERR\x1f' + String(e);
  }
}

// Selector de carpeta nativo (respaldo si cep.fs no está disponible en el panel).
function SEXP_browseFolder() {
  try {
    var folder = Folder.selectDialog('Selecciona una carpeta');
    if (folder) return folder.fsName.replace(/\\/g, '/');
    return '';
  } catch (e) { return ''; }
}
