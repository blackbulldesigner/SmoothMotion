/**
 * SmoothText — Preset manager (Preset Studio motor)
 */
var SmoothTextPresetManager = (function () {
  'use strict';

  var csInterface = null;
  var extensionPath = '';
  var packs = [];
  var REGISTRY_FILE = 'text-packs-registry.json';

  function init(cs, callback) {
    csInterface = cs;
    extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    loadRegistry(function () {
      if (callback) callback(packs);
    });
  }

  function getRegistryPath() {
    return extensionPath + '/presets/' + REGISTRY_FILE;
  }

  function loadRegistry(callback) {
    var regPath = getRegistryPath();
    csInterface.evalScript('readFileContents("' + regPath.replace(/\\/g, '/').replace(/"/g, '\\"') + '")', function (result) {
      if (result && result !== '' && result !== 'EvalScript error.' && result !== 'undefined') {
        try { packs = JSON.parse(result); } catch (e) { packs = []; }
      } else {
        packs = [];
      }
      if (callback) callback();
    });
  }

  function saveRegistry(callback) {
    var regPath = getRegistryPath();
    var content = JSON.stringify(packs, null, 2);
    content = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    csInterface.evalScript('writeFile("' + regPath.replace(/\\/g, '/').replace(/"/g, '\\"') + '", "' + content + '")', function () {
      if (callback) callback();
    });
  }

  /** Explorador de carpetas nativo de Windows (cep.fs), con fallback AE. */
  function browseFolderNative(callback) {
    if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
      try {
        var result = window.cep.fs.showOpenDialogEx(
          false,
          true,
          'Selecciona la carpeta del pack de presets',
          '',
          []
        );
        if (result.err === window.cep.fs.NO_ERROR && result.data && result.data.length > 0) {
          callback(result.data[0].replace(/\\/g, '/'), null);
          return;
        }
        callback(null, 'Importación cancelada');
        return;
      } catch (e) {
        // fallback below
      }
    }
    csInterface.evalScript('browseForFolder()', function (folderPath) {
      if (!folderPath || folderPath === '' || folderPath === 'undefined') {
        callback(null, 'Importación cancelada');
        return;
      }
      callback(folderPath.replace(/\\/g, '/'), null);
    });
  }

  function readPackJson(folderPath, callback) {
    var packJsonPath = folderPath.replace(/\\/g, '/') + '/pack.json';
    if (window.cep && window.cep.fs) {
      try {
        var r = window.cep.fs.readFile(packJsonPath);
        if (r.err === window.cep.fs.NO_ERROR && r.data) {
          callback(r.data, null);
          return;
        }
      } catch (e) {}
    }
    csInterface.evalScript('readFileContents("' + packJsonPath.replace(/"/g, '\\"') + '")', function (content) {
      callback(content, null);
    });
  }

  function importPack(onComplete) {
    browseFolderNative(function (folderPath, browseError) {
      if (browseError) {
        if (onComplete) onComplete(null, browseError);
        return;
      }
      if (!folderPath) {
        if (onComplete) onComplete(null, 'Importación cancelada');
        return;
      }

      readPackJson(folderPath, function (packJsonContent) {
        if (packJsonContent && packJsonContent !== '' && packJsonContent !== 'undefined' && packJsonContent !== 'EvalScript error.') {
          importWithPackJson(folderPath, packJsonContent, onComplete);
        } else {
          importByScanning(folderPath, onComplete);
        }
      });
    });
  }

  function buildPresetEntry(folderPath, presetName, p, fullCatName) {
    var ffxPath = folderPath + '/' + p.path + '/' + presetName + '.ffx';
    var entry = {
      id: p.id || presetName,
      name: p.name || presetName,
      type: p.type || 'textAnimator',
      path: ffxPath,
      relativePath: p.path + '/' + presetName + '.ffx',
      category: fullCatName,
      thumbPath: folderPath + '/(Preview)/' + presetName + '.jpg'
    };
    if (window.SmoothTextPreviewResolver && extensionPath) {
      entry.previewPath = SmoothTextPreviewResolver.getPreviewUrl(entry, extensionPath);
    }
    return entry;
  }

  function importWithPackJson(folderPath, packJsonContent, onComplete) {
    try {
      var packData = JSON.parse(packJsonContent);
      var pack = {
        id: packData.pack_id || ('pack_' + Date.now()),
        name: packData.name || folderPath.split('/').pop(),
        author: packData.author || 'Unknown',
        version: packData.version || '1.0.0',
        sourcePath: folderPath,
        importDate: new Date().toISOString(),
        categories: {},
        presetCount: 0
      };

      if (packData.presets) {
        for (var catGroup in packData.presets) {
          if (!packData.presets.hasOwnProperty(catGroup)) continue;
          var categories = packData.presets[catGroup];
          for (var catName in categories) {
            if (!categories.hasOwnProperty(catName)) continue;
            var presets = categories[catName];
            var fullCatName = catGroup + ' / ' + catName;
            pack.categories[fullCatName] = [];

            for (var presetName in presets) {
              if (!presets.hasOwnProperty(presetName)) continue;
              var p = presets[presetName];
              pack.categories[fullCatName].push(buildPresetEntry(folderPath, presetName, p, fullCatName));
              pack.presetCount++;
            }
          }
        }
      }

      for (var i = 0; i < packs.length; i++) {
        if (packs[i].name === pack.name) {
          packs.splice(i, 1);
          break;
        }
      }

      packs.push(pack);
      saveRegistry(function () {
        if (onComplete) onComplete(pack, null);
      });
    } catch (e) {
      if (onComplete) onComplete(null, 'Error al leer pack.json: ' + e.message);
    }
  }

  function importByScanning(folderPath, onComplete) {
    csInterface.evalScript('scanPresetsFolder("' + folderPath.replace(/"/g, '\\"') + '")', function (result) {
      try {
        var presetFiles = JSON.parse(result);
        if (presetFiles.length === 0) {
          if (onComplete) onComplete(null, 'No se encontraron archivos .ffx en la carpeta seleccionada.');
          return;
        }

        var folderName = folderPath.split('/').pop();
        var pack = {
          id: 'pack_' + Date.now(),
          name: folderName,
          author: 'Unknown',
          version: '1.0.0',
          sourcePath: folderPath,
          importDate: new Date().toISOString(),
          categories: {},
          presetCount: 0
        };

        for (var i = 0; i < presetFiles.length; i++) {
          var pf = presetFiles[i];
          var catName = pf.folder || 'Presets';
          if (!pack.categories[catName]) pack.categories[catName] = [];
          var entry = {
            id: 'preset_' + i,
            name: pf.name,
            type: 'textAnimator',
            path: pf.path,
            relativePath: pf.relativePath,
            category: catName,
            thumbPath: ''
          };
          if (window.SmoothTextPreviewResolver && extensionPath) {
            entry.previewPath = SmoothTextPreviewResolver.getPreviewUrl(entry, extensionPath);
          }
          pack.categories[catName].push(entry);
          pack.presetCount++;
        }

        for (var j = 0; j < packs.length; j++) {
          if (packs[j].name === pack.name) {
            packs.splice(j, 1);
            break;
          }
        }

        packs.push(pack);
        saveRegistry(function () {
          if (onComplete) onComplete(pack, null);
        });
      } catch (e) {
        if (onComplete) onComplete(null, 'Error al escanear presets: ' + e.message);
      }
    });
  }

  function removePack(packId, callback) {
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === packId) {
        packs.splice(i, 1);
        break;
      }
    }
    saveRegistry(callback);
  }

  function getPacks() { return packs; }

  function searchPresets(query) {
    if (!query || query.trim() === '') return [];
    var q = query.toLowerCase().trim();
    var results = [];
    for (var i = 0; i < packs.length; i++) {
      var pack = packs[i];
      for (var cat in pack.categories) {
        if (!pack.categories.hasOwnProperty(cat)) continue;
        var items = pack.categories[cat];
        for (var j = 0; j < items.length; j++) {
          var preset = items[j];
          var name = preset.name.toLowerCase();
          var catL = cat.toLowerCase();
          var packL = pack.name.toLowerCase();
          if (name.indexOf(q) !== -1 || catL.indexOf(q) !== -1 || packL.indexOf(q) !== -1) {
            results.push({ packName: pack.name, packId: pack.id, category: cat, preset: preset });
          }
        }
      }
    }
    return results;
  }

  function applyPreset(presetPath, isOut, callback) {
    var escapedPath = presetPath.replace(/\\/g, '/').replace(/'/g, "\\'");
    csInterface.evalScript("applyPreset('" + escapedPath + "', " + !!isOut + ')', function (result) {
      try {
        var res = JSON.parse(result);
        if (callback) callback(res);
      } catch (e) {
        if (callback) callback({ success: false, error: 'Error de comunicación con After Effects' });
      }
    });
  }

  function reload(callback) {
    loadRegistry(function () {
      if (callback) callback(packs);
    });
  }

  return {
    init: init,
    reload: reload,
    importPack: importPack,
    removePack: removePack,
    getPacks: getPacks,
    searchPresets: searchPresets,
    applyPreset: applyPreset
  };
})();
