/**
 * MotionBro — Módulo Scripts (portado desde MotionScripts)
 */
(function () {
  'use strict';

  var KEY_SCRIPTS = 'smoothmotion_scripts_v1';
  var KEY_SCRIPTS_SETTINGS = 'smoothmotion_scripts_settings_v1';
  var ITEMS_PER_PAGE = 12;
  var LAYOUT_RAIL_MAX = 100;
  var LAYOUT_COMPACT_MAX = 210;
  var layoutMode = 'full';
  var savedFullView = 'grid';
  var railActive = false;
  var FILTER_CYCLE = ['all', 'favorites', 'animation', 'cameras', 'layers', 'utilities'];
  var FILTER_RAIL_LABEL = { all: '•', favorites: '★', animation: 'A', cameras: 'C', layers: 'L', utilities: 'U' };

  var i18n = {
    es: {
      search_placeholder: 'Buscar script...',
      tab_all: 'TODO', tab_favorites: 'FAVORITOS', tab_animation: 'ANIMACIÓN', tab_cameras: 'CÁMARAS', tab_layers: 'CAPAS', tab_utilities: 'UTILIDADES',
      auto_apply: 'AutoAplicar', btn_execute_selected: 'EJECUTAR SELECCIONADO', btn_execute: 'EJECUTAR', btn_executing: 'EJECUTANDO...',
      select_script: 'SELECCIONE UN SCRIPT',
      modal_add_title: 'Añadir Nuevo Script', lbl_script_name: 'Nombre del Script', placeholder_name: 'Ej. Mi Script Genial',
      lbl_script_desc: 'Descripción (Opcional)', placeholder_desc: 'Ej. ¿Qué hace este script?',
      lbl_script_file: 'Archivo del Script (.jsx, .jsxbin)', lbl_select_file: 'Seleccionar Archivo',
      lbl_script_icon: 'Icono (PNG, JPG)', lbl_select_icon: 'Seleccionar Icono',
      lbl_script_category: 'Categoría', cat_utilities: 'Utilidades', cat_layers: 'Capas', cat_animation: 'Animación', cat_cameras: 'Cámaras',
      btn_cancel: 'Cancelar', btn_add_script: 'Añadir Script',
      modal_edit_title: 'Editor de Código', placeholder_code: '// Escribe o pega tu código JSX aquí...',
      btn_discard: 'Descartar', btn_save_code: 'Guardar Código',
      modal_settings_title: 'Ajustes de Scripts', lbl_language: 'Idioma', lbl_button_size: 'Tamaño de Botones (Cuadrícula)',
      lbl_size_small: 'Pequeño', lbl_size_large: 'Grande', btn_support: 'Soporte', btn_done: 'Hecho',
      msg_no_code: 'Este script no tiene código ni archivo para ejecutar.',
      msg_delete_confirm: '¿Estás seguro de que quieres eliminar este script?',
      msg_backup_success: 'Backup exportado correctamente a ', msg_backup_error: 'Error al exportar: ',
      msg_import_success: 'Backup importado e instalado correctamente.', msg_import_error: 'El archivo no tiene el formato correcto.', msg_import_fail: 'Error al leer el archivo JSON.',
      msg_name_required: 'Por favor ingresa un nombre para el script.',
      msg_compiled: '// Este script está compilado (.jsxbin) y su código fuente está encriptado.\n// No se puede visualizar ni editar directamente.',
      msg_read_error: '// Error al leer el archivo: ',
      msg_exec_error: 'Error al ejecutar el script.',
      msg_no_project: 'Abre un proyecto en After Effects.',
      page_of: ' DE '
    },
    en: {
      search_placeholder: 'Search script...',
      tab_all: 'ALL', tab_favorites: 'FAVORITES', tab_animation: 'ANIMATION', tab_cameras: 'CAMERAS', tab_layers: 'LAYERS', tab_utilities: 'UTILITIES',
      auto_apply: 'Auto Apply', btn_execute_selected: 'EXECUTE SELECTED', btn_execute: 'EXECUTE', btn_executing: 'EXECUTING...',
      select_script: 'SELECT A SCRIPT',
      modal_add_title: 'Add New Script', lbl_script_name: 'Script Name', placeholder_name: 'E.g. My Awesome Script',
      lbl_script_desc: 'Description (Optional)', placeholder_desc: 'E.g. What does this script do?',
      lbl_script_file: 'Script File (.jsx, .jsxbin)', lbl_select_file: 'Select File',
      lbl_script_icon: 'Icon (PNG, JPG)', lbl_select_icon: 'Select Icon',
      lbl_script_category: 'Category', cat_utilities: 'Utilities', cat_layers: 'Layers', cat_animation: 'Animation', cat_cameras: 'Cameras',
      btn_cancel: 'Cancel', btn_add_script: 'Add Script',
      modal_edit_title: 'Code Editor', placeholder_code: '// Write or paste your JSX code here...',
      btn_discard: 'Discard', btn_save_code: 'Save Code',
      modal_settings_title: 'Script Settings', lbl_language: 'Language', lbl_button_size: 'Button Size (Grid)',
      lbl_size_small: 'Small', lbl_size_large: 'Large', btn_support: 'Support', btn_done: 'Done',
      msg_no_code: 'This script has no code or file to execute.',
      msg_delete_confirm: 'Are you sure you want to delete this script?',
      msg_backup_success: 'Backup successfully exported to ', msg_backup_error: 'Export error: ',
      msg_import_success: 'Backup imported and installed successfully.', msg_import_error: 'The file is not in the correct format.', msg_import_fail: 'Error reading JSON file.',
      msg_name_required: 'Please enter a name for the script.',
      msg_compiled: '// This script is compiled (.jsxbin) and its source code is encrypted.\n// It cannot be viewed or edited directly.',
      msg_read_error: '// Error reading file: ',
      msg_exec_error: 'Error running script.',
      msg_no_project: 'Open a project in After Effects.',
      page_of: ' OF '
    }
  };

  var csInterface = null;
  var scriptsData = [];
  var currentLang = 'es';
  var currentView = 'grid';
  var currentFilter = 'all';
  var searchQuery = '';
  var selectedId = null;
  var currentPage = 1;
  var isAutoApply = false;
  var bundledBase = '';
  var userScriptsBase = '';
  var tempScriptPath = null;
  var tempScriptFile = null;

  var defaultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><polyline points="9 22 15 22"></polyline></svg>';
  var starSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

  function t(key) { return i18n[currentLang][key] || key; }

  function $(id) { return document.getElementById(id); }

  function getExtensionPath() {
    if (!csInterface) return '';
    try {
      var p = csInterface.getSystemPath(SystemPath.EXTENSION);
      if (p && p.indexOf('Invalid') === -1) return p.replace(/\\/g, '/');
    } catch (e) {}
    return '';
  }

  // Node.js (habilitado en el manifest) maneja rutas con acentos;
  // window.cep.fs falla con paths Unicode en Windows.
  var nodeFs = null;
  var nodePath = null;
  try {
    var _req = (typeof window !== 'undefined' && window.require) || null;
    if (_req) {
      nodeFs = _req('fs');
      nodePath = _req('path');
    }
  } catch (e) { nodeFs = null; nodePath = null; }

  function joinPath() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i]) parts.push(arguments[i]);
    }
    if (nodePath) return nodePath.join.apply(nodePath, parts);
    return parts.join('/').replace(/\\/g, '/');
  }

  function ensureDir(dir) {
    if (!dir) return false;
    if (nodeFs) {
      try {
        if (!nodeFs.existsSync(dir)) nodeFs.mkdirSync(dir, { recursive: true });
        return true;
      } catch (e) {}
    }
    if (window.cep && window.cep.fs) {
      var st = window.cep.fs.stat(dir);
      if (st.err === window.cep.fs.NO_ERROR) return true;
      return window.cep.fs.makedir(dir).err === window.cep.fs.NO_ERROR;
    }
    return false;
  }

  /** Carpeta escribible para scripts de usuario (AppData, no la carpeta del ZXP). */
  function getUserScriptsPath() {
    if (userScriptsBase) return userScriptsBase;
    try {
      if (nodePath && typeof process !== 'undefined' && typeof SmoothMotionPaths !== 'undefined') {
        userScriptsBase = SmoothMotionPaths.resolveUserScriptsPath('', nodePath);
      } else if (window.cep && window.cep.fs && typeof SmoothMotionPaths !== 'undefined') {
        userScriptsBase = SmoothMotionPaths.resolveUserScriptsPath(
          window.cep.fs.getHomeDirectory(), null
        );
      }
      if (userScriptsBase) {
        ensureDir(userScriptsBase);
        migrateLegacyUserScripts();
      }
    } catch (e) {}
    return userScriptsBase || '';
  }

  function migrateLegacyUserScripts() {
    var ext = getExtensionPath();
    if (!ext || !userScriptsBase || !nodeFs) return;
    var legacyDir = joinPath(ext, 'user_scripts');
    try {
      if (!nodeFs.existsSync(legacyDir)) return;
      var files = nodeFs.readdirSync(legacyDir);
      var i, f, src, dst, st;
      for (i = 0; i < files.length; i++) {
        f = files[i];
        src = joinPath(legacyDir, f);
        dst = joinPath(userScriptsBase, f);
        st = nodeFs.statSync(src);
        if (st.isFile() && !nodeFs.existsSync(dst)) {
          nodeFs.copyFileSync(src, dst);
        }
      }
    } catch (e) {}
  }

  function copyFileToUserScripts(sourcePath, fileName) {
    var destDir = getUserScriptsPath();
    if (!destDir || !sourcePath || !fileName) return null;
    if (!ensureDir(destDir)) return null;
    var dest = joinPath(destDir, fileName);

    if (nodeFs) {
      try {
        nodeFs.copyFileSync(sourcePath, dest);
        return dest;
      } catch (e) {}
    }

    if (window.cep && window.cep.fs) {
      var r = window.cep.fs.readFile(sourcePath, window.cep.encoding.Base64);
      if (r.err === window.cep.fs.NO_ERROR &&
          window.cep.fs.writeFile(dest, r.data, window.cep.encoding.Base64).err === window.cep.fs.NO_ERROR) {
        return dest;
      }
    }
    return null;
  }

  /** Escribe contenido base64 en AppData/user_scripts. Devuelve la ruta o null. */
  function writeBase64ToUserScripts(b64, fileName) {
    var destDir = getUserScriptsPath();
    if (!destDir || !fileName) return null;
    if (!ensureDir(destDir)) return null;
    var dest = joinPath(destDir, fileName);

    if (nodeFs) {
      try {
        var BufferCtor = (typeof Buffer !== 'undefined' && Buffer) ||
          (window.require && window.require('buffer').Buffer);
        if (BufferCtor) {
          nodeFs.writeFileSync(dest, BufferCtor.from(b64, 'base64'));
          return dest;
        }
      } catch (e) {}
    }

    if (window.cep && window.cep.fs) {
      if (window.cep.fs.writeFile(dest, b64, window.cep.encoding.Base64).err === window.cep.fs.NO_ERROR) {
        return dest;
      }
    }
    return null;
  }

  function saveCatalog() {
    try {
      var slim = scriptsData.map(function (s) {
        var o = {
          id: s.id, name: s.name, description: s.description,
          category: s.category, isFav: s.isFav, code: s.code || '', icon: s.icon
        };
        if (s.bundledFile) o.bundledFile = s.bundledFile;
        else if (s.userFile) o.userFile = s.userFile;
        return o;
      });
      localStorage.setItem(KEY_SCRIPTS, JSON.stringify(slim));
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(KEY_SCRIPTS_SETTINGS, JSON.stringify({
        gridSize: parseInt($('scr-iconSizeSlider').value, 10) || 105,
        isAutoApply: isAutoApply
      }));
    } catch (e) {}
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(KEY_SCRIPTS_SETTINGS);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.gridSize) {
        $('scr-iconSizeSlider').value = s.gridSize;
        document.documentElement.style.setProperty('--scr-grid-size', s.gridSize + 'px');
      }
      if (s.isAutoApply) {
        isAutoApply = true;
        $('scr-autoApplyToggle').classList.add('active');
      }
    } catch (e) {}
  }

  function scriptFileExists(path) {
    if (!path) return false;
    if (nodeFs) {
      try { return nodeFs.existsSync(path); } catch (e) {}
    }
    if (window.cep && window.cep.fs) {
      try {
        var st = window.cep.fs.stat(path);
        return st.err === window.cep.fs.NO_ERROR;
      } catch (e) {}
    }
    return false;
  }

  function resolveScriptPaths() {
    var ext = getExtensionPath();
    bundledBase = ext ? joinPath(ext, 'scripts', 'bundled') : '';
    var userBase = getUserScriptsPath();
    var defaults = (window.MotionBroScriptsData && window.MotionBroScriptsData.defaults) || [];
    var defaultById = {};
    defaults.forEach(function (d) { defaultById[d.id] = d; });

    scriptsData.forEach(function (s) {
      var oldPath = s.filePath;
      if (!s.bundledFile && defaultById[s.id] && defaultById[s.id].bundledFile) {
        s.bundledFile = defaultById[s.id].bundledFile;
        delete s.userFile;
      }
      if (s.bundledFile && bundledBase) {
        s.filePath = joinPath(bundledBase, s.bundledFile);
        return;
      }
      if (s.userFile && userBase) {
        var userPath = joinPath(userBase, s.userFile);
        if (scriptFileExists(userPath)) {
          s.filePath = userPath;
          return;
        }
        if (bundledBase) {
          s.bundledFile = s.userFile;
          delete s.userFile;
          s.filePath = joinPath(bundledBase, s.bundledFile);
          return;
        }
        s.filePath = userPath;
        return;
      }
      if (oldPath) {
        var fn = String(oldPath).split(/[\\/]/).pop();
        if (fn && bundledBase) {
          s.bundledFile = fn;
          s.filePath = joinPath(bundledBase, fn);
        } else if (fn && userBase) {
          s.userFile = fn;
          s.filePath = joinPath(userBase, fn);
        }
      }
    });
  }

  /** Ruta absoluta lista para MB_runScriptFile en AE. */
  function getScriptRunPath(script) {
    if (!script) return null;
    resolveScriptPaths();
    if (script.filePath) return script.filePath;
    var ext = getExtensionPath();
    if (!ext) return null;
    if (script.bundledFile) return joinPath(ext, 'scripts', 'bundled', script.bundledFile);
    if (script.userFile) {
      var userBase = getUserScriptsPath();
      if (userBase) return joinPath(userBase, script.userFile);
    }
    return null;
  }

  function parseHostResult(res) {
    if (window.SmoothMotionHost && window.SmoothMotionHost.parseResult) {
      return window.SmoothMotionHost.parseResult(res);
    }
    var trimmed = (res == null ? '' : String(res)).trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
      return { ok: true, assumed: true };
    }
    if (trimmed === 'EvalScript error.') {
      return { ok: false, error: t('msg_exec_error') };
    }
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      if (trimmed.indexOf('ERROR') === 0) return { ok: false, error: trimmed };
      return { ok: true };
    }
  }

  function showExecError(msg) {
    if (typeof smoothMotionToast === 'function') smoothMotionToast(msg, 5000);
    else if (typeof motionBroToast === 'function') motionBroToast(msg, 5000);
    else if (typeof motionFlowToast === 'function') motionFlowToast(msg, 5000);
    else alert(msg);
  }

  function isCompiledPlaceholder(code) {
    if (!code) return false;
    return code.indexOf('compilado (.jsxbin)') !== -1 || code.indexOf('compiled (.jsxbin)') !== -1;
  }

  function repairCatalogEntry(entry, defaultById) {
    if (!entry) return entry;
    var def = defaultById[entry.id];
    if (def && def.bundledFile) {
      entry.bundledFile = def.bundledFile;
      delete entry.userFile;
      delete entry.filePath;
    }
    return entry;
  }

  function loadCatalog() {
    var defaults = (window.MotionBroScriptsData && window.MotionBroScriptsData.defaults) || [];
    var defaultById = {};
    defaults.forEach(function (d) { defaultById[d.id] = d; });

    try {
      var raw = localStorage.getItem(KEY_SCRIPTS);
      if (raw) {
        var saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) {
          scriptsData = saved.map(function (entry) {
            return repairCatalogEntry(entry, defaultById);
          });
          saveCatalog();
          return;
        }
      }
    } catch (e) {}
    scriptsData = JSON.parse(JSON.stringify(defaults));
  }

  function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-scr-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-scr-i18n');
      if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
    });
    document.querySelectorAll('[data-scr-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-scr-i18n-placeholder');
      if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
    });
    render();
  }

  function getPageSize() {
    var mod = document.getElementById('scriptsModule');
    if (mod && (mod.classList.contains('scr-rail-mode') || mod.classList.contains('scr-compact-mode'))) {
      return 9999;
    }
    return ITEMS_PER_PAGE;
  }

  function setExecuteLabel(text) {
    var btn = $('scr-btnExecute');
    if (!btn) return;
    var span = btn.querySelector('.scr-exec-txt');
    if (span) span.textContent = text;
    else btn.textContent = text;
  }

  function updateRailFilterChip() {
    var chip = $('scr-railFilter');
    if (!chip) return;
    chip.textContent = FILTER_RAIL_LABEL[currentFilter] || '•';
    chip.classList.toggle('active-fav', currentFilter === 'favorites');
  }

  function getLayoutWidth(mod) {
    if (!mod) return 0;
    var rect = mod.getBoundingClientRect();
    if (rect.width > 0) return rect.width;
    var docW = document.documentElement && document.documentElement.clientWidth;
    if (docW > 0) return docW;
    var winW = window.innerWidth;
    if (winW > 0) return winW;
    var panel = mod.querySelector('.scr-panel');
    if (panel && panel.clientWidth > 0) return panel.clientWidth;
    return 0;
  }

  function getGridColCount(w) {
    if (w >= 140) return 3;
    if (w >= 72) return 2;
    return 1;
  }

  function syncViewMode(mod) {
    if (!mod) mod = document.getElementById('scriptsModule');
    if (!mod) return;
    var iconsOnly = layoutMode !== 'full';
    mod.classList.toggle('scr-icons-only', iconsOnly);
    mod.classList.toggle('scr-view-grid', !iconsOnly && currentView === 'grid');
    mod.classList.toggle('scr-view-list', iconsOnly || currentView === 'list');
  }

  function updateGridCols(mod, w) {
    if (!mod) return;
    mod.classList.remove('scr-cols-1', 'scr-cols-2', 'scr-cols-3', 'scr-narrow-ui', 'scr-wide-ui');
    var grid = document.getElementById('scr-gridView');
    if (!w || w <= 0) w = getLayoutWidth(mod);
    var useAdaptive = layoutMode === 'full' && currentView === 'grid';
    if (!useAdaptive) {
      if (grid) {
        grid.style.gridTemplateColumns = '';
        grid.style.width = '';
        grid.style.gap = '';
        grid.style.maxWidth = '';
        grid.style.boxSizing = '';
      }
      return;
    }
    var cols = getGridColCount(w);
    mod.classList.add('scr-cols-' + cols);
    if (w < 140) mod.classList.add('scr-narrow-ui');
    if (w >= 100) mod.classList.add('scr-wide-ui');
    if (grid) {
      grid.style.boxSizing = 'border-box';
      grid.style.gap = layoutMode === 'rail' ? '2px' : '3px';
      grid.style.width = '100%';
      grid.style.maxWidth = '100%';
      grid.style.gridTemplateColumns = cols === 1
        ? 'minmax(0, 1fr)'
        : 'repeat(' + cols + ', minmax(0, 1fr))';
    }
  }

  function updateListLayout(mod) {
    if (!mod) return;
    var list = document.getElementById('scr-listView');
    var content = mod.querySelector('.scr-content');
    if (!list || !content) return;

    list.classList.remove('scr-list-spread', 'scr-list-scroll');
    content.classList.remove('scr-list-scroll-wrap');

    if (layoutMode === 'full') return;

    var items = list.querySelectorAll('.scr-list-item');
    if (!items.length) return;

    var contentH = content.clientHeight;
    if (contentH <= 0) {
      requestAnimationFrame(function () { updateListLayout(mod); });
      return;
    }

    var cellH = layoutMode === 'rail' ? 24 : 30;
    var gap = 2;
    var needed = items.length * cellH + Math.max(0, items.length - 1) * gap;

    if (needed >= contentH - 2) {
      list.classList.add('scr-list-scroll');
      content.classList.add('scr-list-scroll-wrap');
    } else {
      list.classList.add('scr-list-spread');
    }
  }

  function applyLayoutMode(force) {
    var mod = document.getElementById('scriptsModule');
    if (!mod) return;
    var w = getLayoutWidth(mod);
    if (w <= 0) w = mod.getBoundingClientRect().width;
    var prevMode = layoutMode;
    var next = 'full';
    if (w > 0 && w <= LAYOUT_RAIL_MAX) next = 'rail';
    else if (w > 0 && w <= LAYOUT_COMPACT_MAX) next = 'compact';

    var changed = prevMode !== next;
    railActive = next === 'rail';
    layoutMode = next;

    mod.classList.toggle('scr-rail-mode', next === 'rail');
    mod.classList.toggle('scr-compact-mode', next === 'compact');
    mod.classList.toggle('scr-rail-micro', next === 'rail' && w > 0 && w <= 64);

    if (next === 'full') {
      currentView = savedFullView;
      var btnGrid = $('scr-btnGrid');
      var btnList = $('scr-btnList');
      if (btnGrid) btnGrid.classList.toggle('active', currentView === 'grid');
      if (btnList) btnList.classList.toggle('active', currentView === 'list');
    } else {
      if (prevMode === 'full') savedFullView = currentView;
      currentView = 'list';
      var btnGrid2 = $('scr-btnGrid');
      var btnList2 = $('scr-btnList');
      if (btnGrid2) btnGrid2.classList.remove('active');
      if (btnList2) btnList2.classList.add('active');
    }

    syncViewMode(mod);
    updateGridCols(mod, w);

    var iconsOnlyChanged = (prevMode === 'full') !== (next === 'full');
    if (!changed && !force && !iconsOnlyChanged) return;

    if (next !== 'rail') mod.classList.remove('scr-search-expanded');
    updateRailFilterChip();
    render();
  }

  function initRailLayout() {
    var mod = document.getElementById('scriptsModule');
    if (!mod) return;

    var railFilter = $('scr-railFilter');
    if (railFilter) {
      railFilter.addEventListener('click', function () {
        var idx = FILTER_CYCLE.indexOf(currentFilter);
        var nextFilter = FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length];
        currentFilter = nextFilter;
        currentPage = 1;
        document.querySelectorAll('.scr-tab').forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-filter') === nextFilter);
        });
        updateRailFilterChip();
        render();
      });
    }

    var searchBox = document.querySelector('#scriptsModule .scr-search-box');
    if (searchBox) {
      searchBox.addEventListener('click', function (e) {
        if (!railActive) return;
        if (e.target.id === 'scr-searchInput') return;
        mod.classList.toggle('scr-search-expanded');
        if (mod.classList.contains('scr-search-expanded')) {
          var inp = $('scr-searchInput');
          if (inp) inp.focus();
        }
      });
    }

    function scheduleLayout() {
      applyLayoutMode(false);
      var m = document.getElementById('scriptsModule');
      if (!m) return;
      updateGridCols(m, getLayoutWidth(m));
      requestAnimationFrame(function () { updateListLayout(m); });
    }

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(scheduleLayout).observe(mod);
      if (document.documentElement) {
        new ResizeObserver(scheduleLayout).observe(document.documentElement);
      }
    }
    window.addEventListener('resize', function () { applyLayoutMode(true); });
    applyLayoutMode(true);
    setTimeout(function () { applyLayoutMode(true); }, 120);
    setTimeout(function () { applyLayoutMode(true); }, 400);
  }

  function getFilteredData() {
    return scriptsData.filter(function (script) {
      var matchesSearch = script.name.toLowerCase().indexOf(searchQuery) !== -1;
      var matchesTab = currentFilter === 'all' ||
        (currentFilter === 'favorites' && script.isFav) ||
        script.category === currentFilter;
      return matchesSearch && matchesTab;
    });
  }

  function executeSelectedScript() {
    if (!selectedId) return;
    var script = scriptsData.find(function (s) { return s.id === selectedId; });
    if (!script) return;

    if (!csInterface) {
      alert(t('msg_no_code'));
      return;
    }

    resolveScriptPaths();

    var btnExecute = $('scr-btnExecute');
    btnExecute.style.transform = 'scale(0.95)';
    setExecuteLabel(t('btn_executing'));

    function finishExec() {
      setTimeout(function () {
        btnExecute.style.transform = 'none';
        render();
      }, 300);
    }

    function onHostResult(res) {
      var r = parseHostResult(res);
      if (!r.ok && !r.assumed) showExecError(r.error || t('msg_exec_error'));
      finishExec();
    }

    var runPath = getScriptRunPath(script);
    var code = script.code && script.code.trim();
    var hasCode = code && !isCompiledPlaceholder(code);
    var isBin = !!(script.bundledFile || (runPath && runPath.toLowerCase().indexOf('.jsxbin') !== -1));

    // .jsxbin siempre por archivo — AE valida existencia (cep.fs.stat falla con espacios)
    if (isBin && runPath) {
      csInterface.evalScript('MB_runScriptFile(' + JSON.stringify(runPath) + ')', onHostResult);
      return;
    }

    if (hasCode) {
      csInterface.evalScript('MB_runScriptCode(' + JSON.stringify(code) + ')', onHostResult);
      return;
    }

    if (runPath) {
      csInterface.evalScript('MB_runScriptFile(' + JSON.stringify(runPath) + ')', onHostResult);
      return;
    }

    showExecError(t('msg_no_code'));
    finishExec();
  }

  function toggleFavorite(e, id) {
    e.stopPropagation();
    var script = scriptsData.find(function (s) { return s.id === id; });
    if (script) {
      script.isFav = !script.isFav;
      saveCatalog();
      render();
    }
  }

  function selectScript(id) {
    selectedId = id;
    render();
    if (isAutoApply) executeSelectedScript();
  }

  function quickExecuteScript(e, id) {
    if (e) e.stopPropagation();
    if (layoutMode === 'full') return;
    selectedId = id;
    executeSelectedScript();
  }

  window.scrSelectScript = selectScript;
  window.scrToggleFavorite = toggleFavorite;
  window.scrQuickExecute = quickExecuteScript;

  function render() {
    var gridView = $('scr-gridView');
    var listView = $('scr-listView');
    var filtered = getFilteredData();
    var pageSize = getPageSize();
    var maxPages = Math.ceil(filtered.length / pageSize) || 1;

    if (currentPage > maxPages) currentPage = maxPages;
    if (currentPage < 1) currentPage = 1;

    var startIdx = (currentPage - 1) * pageSize;
    var paginated = filtered.slice(startIdx, startIdx + pageSize);
    var iconsOnly = layoutMode !== 'full';

    if (currentView === 'grid' && !iconsOnly) {
      listView.innerHTML = '';
      gridView.innerHTML = paginated.map(function (script, index) {
        return '<div class="scr-card fade-in ' + (selectedId === script.id ? 'selected' : '') + '" style="animation-delay:' + (index * 0.03) + 's" onclick="scrSelectScript(' + script.id + ')" ondblclick="scrQuickExecute(event,' + script.id + ')" title="' + (script.description || script.name).replace(/"/g, '&quot;') + '">' +
          '<div class="scr-card-star ' + (script.isFav ? 'active' : '') + '" onclick="scrToggleFavorite(event, ' + script.id + ')">' + starSvg + '</div>' +
          '<div class="scr-card-icon">' + script.icon + '</div>' +
          '<div class="scr-card-title">' + script.name + '</div></div>';
      }).join('');
    } else {
      gridView.innerHTML = '';
      listView.innerHTML = paginated.map(function (script, index) {
        var dbl = iconsOnly ? ' ondblclick="scrQuickExecute(event,' + script.id + ')"' : '';
        var tip = (script.description || script.name).replace(/"/g, '&quot;');
        if (iconsOnly) {
          return '<div class="scr-list-item fade-in ' + (selectedId === script.id ? 'selected' : '') + '" style="animation-delay:' + (index * 0.02) + 's" onclick="scrSelectScript(' + script.id + ')"' + dbl + ' title="' + tip + '">' +
            '<div class="scr-list-icon">' + script.icon + '</div></div>';
        }
        return '<div class="scr-list-item fade-in ' + (selectedId === script.id ? 'selected' : '') + '" style="animation-delay:' + (index * 0.02) + 's" onclick="scrSelectScript(' + script.id + ')" title="' + tip + '">' +
          '<div class="scr-list-icon">' + script.icon + '</div>' +
          '<div class="scr-list-title">' + script.name + '</div>' +
          '<div class="scr-list-star ' + (script.isFav ? 'active' : '') + '" onclick="scrToggleFavorite(event, ' + script.id + ')">' + starSvg + '</div></div>';
      }).join('');
    }

    $('scr-pageIndicator').textContent = currentPage + t('page_of') + maxPages;
    $('scr-prevPage').style.opacity = currentPage === 1 ? '0.3' : '1';
    $('scr-nextPage').style.opacity = currentPage === maxPages ? '0.3' : '1';

    var btnExecute = $('scr-btnExecute');
    btnExecute.disabled = selectedId === null;
    var hasSelection = selectedId !== null;
    $('scr-btnDeleteScript').style.display = hasSelection ? 'flex' : 'none';
    $('scr-btnEditCode').style.display = hasSelection ? 'flex' : 'none';
    setExecuteLabel(hasSelection
      ? (currentView === 'grid' ? t('btn_execute_selected') : t('btn_execute'))
      : t('select_script'));
    updateRailFilterChip();

    var mod = document.getElementById('scriptsModule');
    if (!mod) return;
    syncViewMode(mod);
    updateGridCols(mod, getLayoutWidth(mod));
    requestAnimationFrame(function () { updateListLayout(mod); });
  }

  function resetModal() {
    $('scr-newScriptName').value = '';
    $('scr-newScriptDescription').value = '';
    $('scr-newScriptFile').value = '';
    $('scr-scriptFileName').textContent = '';
    var scriptBox = $('scr-scriptFileBox');
    if (scriptBox) scriptBox.classList.remove('has-file');
    $('scr-newScriptIcon').value = '';
    $('scr-iconPreview').src = '';
    var iconBox = $('scr-iconFileBox');
    if (iconBox) iconBox.classList.remove('has-icon');
    $('scr-newScriptCategory').value = 'utilities';
    tempScriptPath = null;
    tempScriptFile = null;
  }

  function setupEventListeners() {
    $('scr-searchInput').addEventListener('input', function (e) {
      searchQuery = e.target.value.toLowerCase();
      currentPage = 1;
      render();
    });

    document.querySelectorAll('.scr-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.scr-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        currentPage = 1;
        updateRailFilterChip();
        render();
      });
    });

    $('scr-btnGrid').addEventListener('click', function () {
      currentView = 'grid';
      savedFullView = 'grid';
      $('scr-btnGrid').classList.add('active');
      $('scr-btnList').classList.remove('active');
      render();
    });
    $('scr-btnList').addEventListener('click', function () {
      currentView = 'list';
      savedFullView = 'list';
      $('scr-btnList').classList.add('active');
      $('scr-btnGrid').classList.remove('active');
      render();
    });

    $('scr-autoApplyToggle').addEventListener('click', function () {
      isAutoApply = !isAutoApply;
      $('scr-autoApplyToggle').classList.toggle('active', isAutoApply);
      saveSettings();
    });

    $('scr-btnExecute').addEventListener('click', executeSelectedScript);

    $('scr-prevPage').addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; render(); }
    });
    $('scr-nextPage').addEventListener('click', function () {
      var maxPages = Math.ceil(getFilteredData().length / getPageSize()) || 1;
      if (currentPage < maxPages) { currentPage++; render(); }
    });

    $('scr-btnFavFilter').addEventListener('click', function () {
      if (currentFilter === 'favorites') {
        currentFilter = 'all';
        document.querySelectorAll('.scr-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.scr-tab[data-filter="all"]').classList.add('active');
      } else {
        currentFilter = 'favorites';
        document.querySelectorAll('.scr-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.scr-tab[data-filter="favorites"]').classList.add('active');
      }
      currentPage = 1;
      updateRailFilterChip();
      render();
    });

    $('scr-btnDeleteScript').addEventListener('click', function () {
      if (selectedId && confirm(t('msg_delete_confirm'))) {
        var index = scriptsData.findIndex(function (s) { return s.id === selectedId; });
        if (index !== -1) {
          scriptsData.splice(index, 1);
          selectedId = null;
          saveCatalog();
          render();
        }
      }
    });

    $('scr-btnExport').addEventListener('click', function () {
      resolveScriptPaths();
      var exportData = JSON.parse(JSON.stringify(scriptsData));
      if (csInterface && window.cep) {
        exportData.forEach(function (script) {
          var path = script.filePath;
          if (!path && script.bundledFile && bundledBase) path = bundledBase + '/' + script.bundledFile;
          if (!path && script.userFile) {
            var ub = getUserScriptsPath();
            if (ub) path = ub + '/' + script.userFile;
          }
          if (path && scriptFileExists(path)) {
            var readResult = window.cep.fs.readFile(path, window.cep.encoding.Base64);
            if (readResult.err === window.cep.fs.NO_ERROR) {
              script.fileData = readResult.data;
              script.fileName = path.split(/[\\/]/).pop();
            }
          }
          delete script.filePath;
        });
        var dataStr = JSON.stringify(exportData, null, 2);
        var saveResult = window.cep.fs.showSaveDialogEx('Exportar Backup MotionBro Scripts', '', ['json'], 'MotionBro_Scripts_Backup.json');
        if (saveResult.data) {
          var writeResult = window.cep.fs.writeFile(saveResult.data, dataStr);
          if (writeResult.err === window.cep.fs.NO_ERROR) alert(t('msg_backup_success') + saveResult.data);
          else alert(t('msg_backup_error') + writeResult.err);
        }
      }
    });

    $('scr-btnImport').addEventListener('click', function () { $('scr-importBackupFile').click(); });
    $('scr-importBackupFile').addEventListener('change', function (e) {
      if (!e.target.files.length) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          var importedData = JSON.parse(event.target.result);
          if (!Array.isArray(importedData)) { alert(t('msg_import_error')); return; }
          var userScriptsFolder = getUserScriptsPath();
          if (userScriptsFolder) {
            importedData.forEach(function (script) {
              if (script.fileData && script.fileName) {
                var dest = writeBase64ToUserScripts(script.fileData, script.fileName);
                if (!dest && window.cep && window.cep.fs) {
                  window.cep.fs.writeFile(
                    userScriptsFolder + '/' + script.fileName,
                    script.fileData,
                    window.cep.encoding.Base64
                  );
                }
                script.userFile = script.fileName;
                delete script.fileData;
                delete script.fileName;
                delete script.filePath;
                delete script.bundledFile;
              }
            });
          }
          scriptsData = importedData;
          resolveScriptPaths();
          selectedId = null;
          currentPage = 1;
          saveCatalog();
          render();
          alert(t('msg_import_success'));
        } catch (err) {
          alert(t('msg_import_fail'));
        }
        e.target.value = '';
      };
      reader.readAsText(e.target.files[0]);
    });

    $('scr-btnEditCode').addEventListener('click', function () {
      if (!selectedId) return;
      var script = scriptsData.find(function (s) { return s.id === selectedId; });
      if (!script) return;
      $('scr-editCodeTitle').textContent = script.name;
      var area = $('scr-codeEditorArea');
      var saveBtn = $('scr-saveCodeBtn');
      if (script.code && script.code.trim() !== '') {
        area.value = script.code;
        area.disabled = false;
        saveBtn.style.display = 'block';
      } else if (script.filePath && csInterface) {
        if (script.filePath.toLowerCase().indexOf('.jsxbin') !== -1) {
          area.value = t('msg_compiled');
          area.disabled = true;
          saveBtn.style.display = 'none';
        } else {
          var fileText = null;
          if (nodeFs) {
            try { fileText = nodeFs.readFileSync(script.filePath, 'utf8'); } catch (e) {}
          }
          if (fileText === null && window.cep && window.cep.fs) {
            var readResult = window.cep.fs.readFile(script.filePath);
            if (readResult.err === window.cep.fs.NO_ERROR) fileText = readResult.data;
          }
          if (fileText !== null) {
            script.code = fileText;
            area.value = script.code;
            area.disabled = false;
            saveBtn.style.display = 'block';
          } else {
            area.value = t('msg_read_error') + script.filePath;
            area.disabled = true;
            saveBtn.style.display = 'none';
          }
        }
      } else {
        area.value = '';
        area.disabled = false;
        saveBtn.style.display = 'block';
      }
      $('scr-editCodeModal').classList.add('active');
    });

    function closeEdit() { $('scr-editCodeModal').classList.remove('active'); }
    $('scr-closeEditCodeBtn').addEventListener('click', closeEdit);
    $('scr-cancelEditCodeBtn').addEventListener('click', closeEdit);
    $('scr-saveCodeBtn').addEventListener('click', function () {
      if (selectedId) {
        var script = scriptsData.find(function (s) { return s.id === selectedId; });
        if (script) {
          script.code = $('scr-codeEditorArea').value;
          saveCatalog();
        }
        closeEdit();
      }
    });

    $('scr-btnScriptSettings').addEventListener('click', function () {
      $('scr-settingsModal').classList.add('active');
    });
    function closeSettings() { $('scr-settingsModal').classList.remove('active'); }
    $('scr-closeSettingsBtn').addEventListener('click', closeSettings);
    $('scr-saveSettingsBtn').addEventListener('click', function () { saveSettings(); closeSettings(); });
    $('scr-iconSizeSlider').addEventListener('input', function (e) {
      document.documentElement.style.setProperty('--scr-grid-size', e.target.value + 'px');
      saveSettings();
    });

    $('scr-btnAddScript').addEventListener('click', function () {
      $('scr-addScriptModal').classList.add('active');
      resetModal();
    });
    function closeAdd() { $('scr-addScriptModal').classList.remove('active'); }
    $('scr-closeModalBtn').addEventListener('click', closeAdd);
    $('scr-cancelAddBtn').addEventListener('click', closeAdd);

    $('scr-newScriptFile').addEventListener('change', function (e) {
      var scriptBox = $('scr-scriptFileBox');
      if (e.target.files.length) {
        var file = e.target.files[0];
        $('scr-scriptFileName').textContent = file.name;
        if (scriptBox) scriptBox.classList.add('has-file');
        tempScriptFile = file;
        tempScriptPath = file.path || null;
        if (!$('scr-newScriptName').value) {
          $('scr-newScriptName').value = file.name.replace(/\.[^/.]+$/, '');
        }
      } else {
        $('scr-scriptFileName').textContent = '';
        if (scriptBox) scriptBox.classList.remove('has-file');
        tempScriptFile = null;
        tempScriptPath = null;
      }
    });

    $('scr-newScriptIcon').addEventListener('change', function (e) {
      var iconBox = $('scr-iconFileBox');
      if (e.target.files.length) {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.onload = function (ev) {
          $('scr-iconPreview').src = ev.target.result;
          if (iconBox) iconBox.classList.add('has-icon');
        };
        reader.readAsDataURL(file);
      } else {
        $('scr-iconPreview').src = '';
        if (iconBox) iconBox.classList.remove('has-icon');
      }
    });

    $('scr-saveScriptBtn').addEventListener('click', function () {
      var name = $('scr-newScriptName').value.trim();
      if (!name) { alert(t('msg_name_required')); return; }
      var newId = scriptsData.length ? Math.max.apply(null, scriptsData.map(function (s) { return s.id; })) + 1 : 1;
      var finalIcon = defaultIcon;
      var iconBox = $('scr-iconFileBox');
      var iconSrc = $('scr-iconPreview').src;
      if (iconBox && iconBox.classList.contains('has-icon') && iconSrc) {
        finalIcon = '<img src="' + iconSrc + '" alt="' + name.replace(/"/g, '') + '">';
      }
      var entry = {
        id: newId,
        name: name,
        description: $('scr-newScriptDescription').value.trim(),
        category: $('scr-newScriptCategory').value,
        isFav: false,
        code: '',
        icon: finalIcon
      };

      function finishAdd() {
        scriptsData.push(entry);
        saveCatalog();
        closeAdd();
        selectedId = newId;
        currentFilter = 'all';
        document.querySelectorAll('.scr-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.scr-tab[data-filter="all"]').classList.add('active');
        currentPage = 1;
        render();
      }

      if (!tempScriptFile && !tempScriptPath) {
        finishAdd();
        return;
      }

      var fileName = tempScriptFile ? tempScriptFile.name : tempScriptPath.split(/[\\/]/).pop();

      // 1) Copia directa por ruta (Node.js maneja acentos)
      if (tempScriptPath) {
        var copied = copyFileToUserScripts(tempScriptPath, fileName);
        if (copied) {
          entry.userFile = fileName;
          entry.filePath = copied;
          finishAdd();
          return;
        }
      }

      // 2) Fallback: leer el archivo del propio input (no depende de rutas)
      if (tempScriptFile) {
        var fr = new FileReader();
        fr.onload = function (ev) {
          var b64 = String(ev.target.result).split(',')[1] || '';
          var dest = writeBase64ToUserScripts(b64, fileName);
          if (dest) {
            entry.userFile = fileName;
            entry.filePath = dest;
            finishAdd();
          } else {
            alert(t('msg_backup_error') + 'No se pudo guardar el script. Verifica permisos de escritura.');
          }
        };
        fr.onerror = function () {
          alert(t('msg_backup_error') + 'No se pudo leer el archivo.');
        };
        fr.readAsDataURL(tempScriptFile);
        return;
      }

      alert(t('msg_backup_error') + 'No se pudo guardar el script.');
    });
  }

  function init() {
    try {
      if (typeof CSInterface !== 'undefined') csInterface = new CSInterface();
    } catch (e) {}

    loadCatalog();
    resolveScriptPaths();
    setupEventListeners();
    loadSettings();
    initRailLayout();
    syncViewMode(document.getElementById('scriptsModule'));

    var mainLang = localStorage.getItem('SmoothMotion_Lang') || localStorage.getItem('MotionBro_Lang') || localStorage.getItem('MotionFlow_Lang') || 'es';
    currentLang = mainLang;
    setLanguage(currentLang);
  }

  function onShow() {
    applyLayoutMode(true);
    render();
  }

  window.MB_scripts = { init: init, onShow: onShow, setLanguage: setLanguage };
})();
