/**
 * SmoothExplorer — panel independiente.
 * Navega carpetas, previsualiza imágenes/video/audio e importa a After Effects.
 */
(function () {
  'use strict';

  var cs = null;
  var nodeFs = null, nodePath = null, nodeOs = null;

  var currentPath = '';
  var entries = [];
  var filter = 'all';
  var query = '';
  var favorites = [];
  var selectedEntry = null;
  var playerEntry = null;
  var volume = 0.8;
  var gridSize = 92;

  var MAX_RENDER = 400;
  var KEY_PATH = 'smoothexplorer_path_v1';
  var KEY_FAVS = 'smoothexplorer_favs_v1';
  var KEY_VOL  = 'smoothexplorer_vol_v1';
  var KEY_GRID = 'smoothexplorer_grid_v1';

  var TYPES = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'svg', 'tga'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', 'wmv', 'flv', 'mxf'],
    audio: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'aif', 'aiff', 'wma'],
    project: ['aep', 'aepx']
  };

  function $(id) { return document.getElementById(id); }

  var toastTimer = null;
  function toast(msg) {
    var el = $('exp-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, 3000);
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Relleno azul del slider según su valor.
  function updateRangeFill(el) {
    if (!el) return;
    var min = parseFloat(el.min) || 0, max = parseFloat(el.max) || 100, val = parseFloat(el.value) || 0;
    var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    el.style.background = 'linear-gradient(to right, var(--ec-blue) ' + pct + '%, var(--ec-border) ' + pct + '%)';
  }

  function fileType(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    for (var k in TYPES) { if (TYPES.hasOwnProperty(k) && TYPES[k].indexOf(ext) !== -1) return k; }
    return 'other';
  }

  function fileUrl(p) {
    var u = String(p).replace(/\\/g, '/');
    if (u.charAt(0) !== '/') u = '/' + u;
    return 'file://' + encodeURI(u).replace(/#/g, '%23').replace(/\?/g, '%3F');
  }

  // ── Listado ──
  function listDir(path) {
    var out = [];
    var names = nodeFs.readdirSync(path);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (name.charAt(0) === '.') continue;
      var full = nodePath.join(path, name);
      var st;
      try { st = nodeFs.statSync(full); } catch (e) { continue; }
      var isDir = st.isDirectory();
      out.push({ name: name, path: full, isDir: isDir, type: isDir ? 'dir' : fileType(name) });
    }
    out.sort(function (a, b) {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
    return out;
  }

  function navigate(path) {
    if (!nodeFs) return;
    try {
      entries = listDir(path);
      currentPath = path;
      selectedEntry = null;
      try { localStorage.setItem(KEY_PATH, path); } catch (e) {}
      renderPath();
      renderFavs();
      render();
    } catch (err) {
      var list = $('exp-list');
      if (list) list.innerHTML = '<div class="exp-empty">No se pudo abrir la carpeta:<br>' + escHtml(String(err.message || err)) + '</div>';
    }
  }

  function goUp() {
    if (!currentPath) return;
    var parent = nodePath.dirname(currentPath);
    if (parent && parent !== currentPath) navigate(parent);
  }

  // ── Explorador de Windows (elegir carpeta) ──
  function browseFolder() {
    if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
      try {
        var r = window.cep.fs.showOpenDialogEx(false, true, 'Selecciona una carpeta', currentPath || '', []);
        if (r && r.err === window.cep.fs.NO_ERROR) {
          if (r.data && r.data.length) navigate(r.data[0].replace(/\\/g, '/'));
          return;
        }
      } catch (e) {}
    }
    if (cs) cs.evalScript('SEXP_browseFolder()', function (res) {
      var p = (res == null ? '' : String(res)).trim();
      if (p && p !== 'undefined') navigate(p);
    });
  }

  // ── Breadcrumb ──
  function renderPath() {
    var el = $('exp-path');
    if (!el) return;
    el.innerHTML = '';
    var isPosix = currentPath.charAt(0) === '/';
    var parts = currentPath.split(/[\\/]+/).filter(Boolean);
    var cum = '';
    for (var i = 0; i < parts.length; i++) {
      if (i === 0) cum = isPosix ? ('/' + parts[i]) : (parts[i] + nodePath.sep);
      else cum = nodePath.join(cum, parts[i]);
      (function (target, label) {
        var c = document.createElement('span');
        c.className = 'exp-crumb';
        c.textContent = label;
        c.addEventListener('click', function () { navigate(target); });
        el.appendChild(c);
      })(cum, parts[i]);
      if (i < parts.length - 1) {
        var s = document.createElement('span');
        s.className = 'exp-crumb-sep';
        s.textContent = '›';
        el.appendChild(s);
      }
    }
    el.scrollLeft = el.scrollWidth;
  }

  // ── Favoritos ──
  function loadFavs() {
    try { favorites = JSON.parse(localStorage.getItem(KEY_FAVS)) || []; } catch (e) { favorites = []; }
    if (!(favorites instanceof Array)) favorites = [];
  }
  function saveFavs() { try { localStorage.setItem(KEY_FAVS, JSON.stringify(favorites)); } catch (e) {} }

  function renderFavs() {
    var el = $('exp-favs');
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < favorites.length; i++) {
      (function (fav) {
        var chip = document.createElement('span');
        chip.className = 'exp-fav';
        chip.title = fav;
        var label = document.createElement('span');
        label.textContent = fav.split(/[\\/]+/).filter(Boolean).pop() || fav;
        label.addEventListener('click', function () { navigate(fav); });
        var del = document.createElement('span');
        del.className = 'exp-fav-del';
        del.innerHTML = '&times;';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          favorites = favorites.filter(function (f) { return f !== fav; });
          saveFavs(); renderFavs();
        });
        chip.appendChild(label);
        chip.appendChild(del);
        el.appendChild(chip);
      })(favorites[i]);
    }
    var pin = $('exp-pin');
    if (pin) pin.classList.toggle('on', favorites.indexOf(currentPath) !== -1);
  }

  function togglePin() {
    if (!currentPath) return;
    var idx = favorites.indexOf(currentPath);
    if (idx === -1) { favorites.push(currentPath); toast('★ Carpeta anclada'); }
    else { favorites.splice(idx, 1); }
    saveFavs(); renderFavs();
  }

  // ── Grid ──
  var ICON_FOLDER = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  var ICON_AUDIO = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  var ICON_FILE = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var PLAY_BADGE = '<div class="exp-play-badge"><svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.45)"/><polygon points="10 8 16 12 10 16" fill="#fff"/></svg></div>';

  function matches(e) {
    if (filter !== 'all' && !e.isDir && e.type !== filter) return false;
    if (query && e.name.toLowerCase().indexOf(query) === -1) return false;
    return true;
  }

  function render() {
    var list = $('exp-list');
    if (!list) return;
    var visible = entries.filter(matches);

    if (!entries.length) { list.innerHTML = '<div class="exp-empty">Carpeta vacía.</div>'; return; }
    if (!visible.length) { list.innerHTML = '<div class="exp-empty">Nada coincide con el filtro.</div>'; return; }

    var grid = document.createElement('div');
    grid.className = 'exp-grid';
    var count = Math.min(visible.length, MAX_RENDER);

    for (var i = 0; i < count; i++) {
      (function (e) {
        var card = document.createElement('div');
        card.className = 'exp-card' + (selectedEntry && selectedEntry.path === e.path ? ' selected' : '');

        var thumb = document.createElement('div');
        thumb.className = 'exp-thumb' + (e.isDir ? ' is-dir' : '');

        if (e.isDir) {
          thumb.innerHTML = ICON_FOLDER;
        } else if (e.type === 'image') {
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.src = fileUrl(e.path);
          img.onerror = function () { thumb.innerHTML = ICON_FILE; };
          thumb.appendChild(img);
        } else if (e.type === 'video') {
          var vid = document.createElement('video');
          vid.src = fileUrl(e.path);
          vid.muted = true;
          vid.preload = 'metadata';
          thumb.appendChild(vid);
          thumb.insertAdjacentHTML('beforeend', PLAY_BADGE);
          thumb.insertAdjacentHTML('beforeend', '<span class="exp-badge">VID</span>');
        } else if (e.type === 'audio') {
          thumb.innerHTML = ICON_AUDIO + PLAY_BADGE + '<span class="exp-badge">AUDIO</span>';
        } else if (e.type === 'project') {
          thumb.innerHTML = ICON_FILE + '<span class="exp-badge">AEP</span>';
        } else {
          thumb.innerHTML = ICON_FILE;
        }

        var name = document.createElement('div');
        name.className = 'exp-name';
        name.textContent = e.name;
        name.title = e.name;

        card.appendChild(thumb);
        card.appendChild(name);

        card.addEventListener('click', function () { selectEntry(e, card); });
        card.addEventListener('dblclick', function () {
          if (e.isDir) navigate(e.path);
          else importFile(e, false);
        });

        grid.appendChild(card);
      })(visible[i]);
    }

    list.innerHTML = '';
    list.appendChild(grid);
    if (visible.length > MAX_RENDER) {
      var more = document.createElement('div');
      more.className = 'exp-empty';
      more.textContent = 'Mostrando ' + MAX_RENDER + ' de ' + visible.length + ' — filtra para ver el resto.';
      list.appendChild(more);
    }
  }

  function selectEntry(e, card) {
    selectedEntry = e;
    var cards = $('exp-list').querySelectorAll('.exp-card');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
    if (card) card.classList.add('selected');
    if (e.type === 'audio') loadAudio(e);
  }

  // ── Reproductor de audio ──
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function loadAudio(e) {
    var audio = $('exp-audio');
    if (!audio) return;
    playerEntry = e;
    audio.src = fileUrl(e.path);
    audio.volume = volume;
    $('exp-player').classList.add('visible');
    $('exp-player-name').textContent = e.name;
    $('exp-player-seek').value = 0;
    updateRangeFill($('exp-player-seek'));
    $('exp-player-time').textContent = '0:00 / 0:00';
    setPlayIcon(false);
    var p = audio.play();
    if (p && p.then) p.then(function () { setPlayIcon(true); }).catch(function () {});
  }

  function setPlayIcon(playing) {
    var btn = $('exp-player-toggle');
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function togglePlay() {
    var audio = $('exp-audio');
    if (!audio || !playerEntry) return;
    if (audio.paused) { audio.play(); setPlayIcon(true); }
    else { audio.pause(); setPlayIcon(false); }
  }

  // ── Volumen y cuadrícula (ajustes) ──
  function loadPrefs() {
    try { var v = parseFloat(localStorage.getItem(KEY_VOL)); if (!isNaN(v) && v >= 0 && v <= 1) volume = v; } catch (e) {}
    try { var g = parseInt(localStorage.getItem(KEY_GRID), 10); if (!isNaN(g) && g >= 64 && g <= 160) gridSize = g; } catch (e2) {}
  }
  function applyVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    var audio = $('exp-audio');
    if (audio) audio.volume = volume;
    var slider = $('exp-vol'), val = $('exp-vol-val');
    if (slider) { slider.value = Math.round(volume * 100); updateRangeFill(slider); }
    if (val) val.textContent = Math.round(volume * 100) + '%';
    try { localStorage.setItem(KEY_VOL, String(volume)); } catch (e) {}
  }
  function gridLabel(v) { return v <= 76 ? 'Pequeño' : (v <= 116 ? 'Mediano' : 'Grande'); }
  function applyGrid(v) {
    gridSize = Math.max(64, Math.min(160, v));
    document.documentElement.style.setProperty('--exp-grid-size', gridSize + 'px');
    var slider = $('exp-grid'), val = $('exp-grid-val');
    if (slider) { slider.value = gridSize; updateRangeFill(slider); }
    if (val) val.textContent = gridLabel(gridSize);
    try { localStorage.setItem(KEY_GRID, String(gridSize)); } catch (e) {}
  }

  // ── Importar ──
  function importFile(e, addToComp) {
    if (!e || e.isDir) { toast('Selecciona un archivo.'); return; }
    if (!cs) { toast('CEP no disponible.'); return; }
    var script = 'SEXP_import(' + JSON.stringify(e.path) + ', ' + (addToComp ? 'true' : 'false') + ')';
    cs.evalScript(script, function (res) {
      var s = (res == null ? '' : String(res));
      if (s === '' || s === 'undefined') { toast('✓ Importado'); return; }
      var f = s.split('\x1f');
      if (f[0] === 'OK') toast('✓ ' + (f[1] || 'Importado') + (f[2] === '1' ? ' · añadido a la comp' : ''));
      else if (f[0] === 'ERR') toast('⚠ ' + (f[1] || 'Error.'));
      else toast('✓ Importado');
    });
  }

  function importSelected(addToComp) {
    if (!selectedEntry) { toast('Selecciona un archivo primero.'); return; }
    if (selectedEntry.isDir) { navigate(selectedEntry.path); return; }
    importFile(selectedEntry, addToComp);
  }

  function safeExists(p) {
    try { return nodeFs.existsSync(p) && nodeFs.statSync(p).isDirectory(); } catch (e) { return false; }
  }

  // ── Init ──
  function bindUi() {
    $('exp-up').addEventListener('click', goUp);
    $('exp-home').addEventListener('click', function () { navigate(nodeOs.homedir()); });
    $('exp-browse').addEventListener('click', browseFolder);
    $('exp-pin').addEventListener('click', togglePin);
    $('exp-refresh').addEventListener('click', function () { navigate(currentPath); });

    $('exp-search').addEventListener('input', function () { query = this.value.toLowerCase(); render(); });

    var chips = document.querySelectorAll('.exp-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        for (var j = 0; j < chips.length; j++) chips[j].classList.remove('active');
        this.classList.add('active');
        filter = this.getAttribute('data-exp-filter');
        render();
      });
    }

    $('exp-import').addEventListener('click', function () { importSelected(false); });
    $('exp-import-comp').addEventListener('click', function () { importSelected(true); });

    $('exp-player-toggle').addEventListener('click', togglePlay);
    $('exp-player-seek').addEventListener('input', function () {
      var audio = $('exp-audio');
      if (audio && audio.duration) audio.currentTime = (this.value / 1000) * audio.duration;
      updateRangeFill(this);
    });
    var audio = $('exp-audio');
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      var seekEl = $('exp-player-seek');
      seekEl.value = Math.round((audio.currentTime / audio.duration) * 1000);
      updateRangeFill(seekEl);
      $('exp-player-time').textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
    });
    audio.addEventListener('ended', function () { setPlayIcon(false); });

    // Ajustes
    $('exp-settings').addEventListener('click', function () { $('exp-settings-overlay').classList.add('visible'); });
    $('exp-settings-close').addEventListener('click', function () { $('exp-settings-overlay').classList.remove('visible'); });
    $('exp-settings-overlay').addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('visible');
    });
    $('exp-vol').addEventListener('input', function () { applyVolume(this.value / 100); });
    $('exp-grid').addEventListener('input', function () { applyGrid(parseInt(this.value, 10)); });
  }

  function init() {
    try { cs = new CSInterface(); } catch (e) { cs = null; }
    try { nodeFs = require('fs'); nodePath = require('path'); nodeOs = require('os'); } catch (e) {}

    if (!nodeFs) {
      var list = $('exp-list');
      if (list) list.innerHTML = '<div class="exp-empty">El explorador necesita Node habilitado (no disponible).</div>';
      return;
    }

    loadFavs();
    loadPrefs();
    bindUi();
    applyVolume(volume);
    applyGrid(gridSize);

    var start = '';
    try { start = localStorage.getItem(KEY_PATH) || ''; } catch (e) {}
    if (!start || !safeExists(start)) start = nodeOs.homedir();
    navigate(start);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
