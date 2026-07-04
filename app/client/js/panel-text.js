/**
 * SmoothText — UI (Preset Studio motor + estilo SmoothMotion)
 */
(function () {
  'use strict';

  var csInterface = null;
  var initialized = false;
  var extensionPath = '';
  var layerPollTimer = null;
  var searchDebounceTimer = null;
  var currentSearchQuery = '';
  var viewMode = 'all';
  var KEY_FAV = 'SmoothText_Favorites';

  function favKey(path) {
    return String(path || '').replace(/\\/g, '/').toLowerCase();
  }

  function getFavorites() {
    try {
      var v = localStorage.getItem(KEY_FAV);
      return v ? JSON.parse(v) : [];
    } catch (e) { return []; }
  }

  function saveFavorites(list) {
    try { localStorage.setItem(KEY_FAV, JSON.stringify(list)); } catch (e) {}
  }

  function isFavorite(path) {
    return getFavorites().indexOf(favKey(path)) >= 0;
  }

  function toggleFavorite(path) {
    var key = favKey(path);
    var fav = getFavorites();
    var idx = fav.indexOf(key);
    if (idx >= 0) fav.splice(idx, 1);
    else fav.push(key);
    saveFavorites(fav);
    return idx < 0;
  }

  function collectAllPresets() {
    if (!window.SmoothTextPresetManager) return [];
    var packs = SmoothTextPresetManager.getPacks();
    var all = [];
    for (var i = 0; i < packs.length; i++) {
      var pack = packs[i];
      for (var cat in pack.categories) {
        if (!pack.categories.hasOwnProperty(cat)) continue;
        var items = pack.categories[cat];
        for (var j = 0; j < items.length; j++) {
          all.push({
            packName: pack.name,
            packId: pack.id,
            category: cat,
            preset: items[j]
          });
        }
      }
    }
    return all;
  }

  function getFavoritePresets() {
    var favSet = {};
    getFavorites().forEach(function (k) { favSet[k] = true; });
    return collectAllPresets().filter(function (item) {
      return favSet[favKey(item.preset.path)];
    });
  }

  function updateFavToolbarBtn() {
    var btn = $('txt-view-fav');
    if (btn) btn.classList.toggle('active', viewMode === 'favorites');
  }

  function $(id) { return document.getElementById(id); }

  function toast(msg, ms) {
    if (typeof smoothMotionToast === 'function') smoothMotionToast(msg, ms || 3500);
    else alert(msg);
  }

  function escHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function escAttr(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderEmptyState() {
    return '<div class="txt-empty txt-empty-import">' +
      '<div class="txt-empty-icon">📦</div>' +
      '<h3>Sin packs importados</h3>' +
      '<p>Importa la carpeta del pack (con <code>pack.json</code> y archivos <code>.ffx</code>). El plugin no incluye presets para mantener el ZXP ligero.</p>' +
      '<button type="button" class="tk-btn tk-btn-primary" id="txt-empty-import">Importar pack</button>' +
      '</div>';
  }

  function renderPack(pack) {
    var catKeys = Object.keys(pack.categories).sort();
    var html = '<div class="txt-pack expanded" data-pack-id="' + escAttr(pack.id) + '">';
    html += '<div class="txt-pack-head">';
    html += '<span class="txt-pack-arrow">▶</span>';
    html += '<span class="txt-pack-name">' + escHtml(pack.name) + '</span>';
    html += '<span class="txt-pack-count">' + pack.presetCount + '</span>';
    html += '<button type="button" class="txt-pack-remove" data-pack-id="' + escAttr(pack.id) + '" title="Eliminar pack">✕</button>';
    html += '</div><div class="txt-pack-body">';

    for (var c = 0; c < catKeys.length; c++) {
      var catName = catKeys[c];
      var presets = pack.categories[catName];
      var displayName = catName;
      if (displayName.indexOf(' / ') !== -1) {
        var parts = displayName.split(' / ');
        displayName = parts[parts.length - 1];
      }

      html += '<div class="txt-cat expanded">';
      html += '<div class="txt-cat-head"><span class="txt-cat-arrow">▶</span>';
      html += '<span class="txt-cat-name">' + escHtml(displayName) + '</span>';
      html += '<span class="txt-cat-count">' + presets.length + '</span></div>';
      html += '<div class="txt-cat-body"><div class="txt-grid">';

      for (var p = 0; p < presets.length; p++) {
        html += renderPresetCard(presets[p]);
      }

      html += '</div></div></div>';
    }

    html += '</div></div>';
    return html;
  }

  function renderPreviewThumb(preset) {
    var urls = [];
    if (window.SmoothTextPreviewResolver && extensionPath) {
      urls = SmoothTextPreviewResolver.collectPreviewUrls(preset, extensionPath);
    } else if (preset.thumbPath) {
      urls.push('file:///' + String(preset.thumbPath).replace(/\\/g, '/'));
    } else if (preset.previewPath) {
      urls.push(preset.previewPath);
    }

    if (!urls.length) {
      return '<div class="txt-preview-fallback">FFX</div>';
    }

    return '<img src="' + escAttr(urls[0]) + '" alt="" class="txt-preview-img" data-preview-urls="' +
      escAttr(JSON.stringify(urls)) + '" data-preview-idx="0" />' +
      '<div class="txt-preview-fallback" style="display:none">FFX</div>';
  }

  function renderPresetCard(preset) {
    var thumb = renderPreviewThumb(preset);
    var favOn = isFavorite(preset.path);

    return '<div class="txt-card" data-preset-path="' + escAttr(preset.path) + '" title="' + escAttr(preset.name) + '">' +
      '<div class="txt-preview">' + thumb +
        '<div class="txt-apply-overlay"><button type="button" class="tk-btn tk-btn-primary txt-apply-in">Aplicar</button></div>' +
      '</div>' +
      '<div class="txt-card-foot">' +
        '<span class="txt-card-name">' + escHtml(preset.name) + '</span>' +
        '<button type="button" class="txt-fav-btn' + (favOn ? ' on' : '') + '" data-fav-path="' + escAttr(preset.path) + '" title="Favorito">★</button>' +
      '</div>' +
      '</div>';
  }

  function highlightMatch(text, query) {
    if (!query) return escHtml(text);
    var lowerText = text.toLowerCase();
    var lowerQuery = query.toLowerCase();
    var idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return escHtml(text);
    return escHtml(text.substring(0, idx)) +
      '<span class="txt-highlight">' + escHtml(text.substring(idx, idx + query.length)) + '</span>' +
      escHtml(text.substring(idx + query.length));
  }

  function renderSearchResults(results) {
    var content = $('txt-content');
    if (!content) return;

    if (!results.length) {
      var msg = viewMode === 'favorites'
        ? 'No hay favoritos que coincidan con tu búsqueda.'
        : 'Sin resultados para "' + escHtml(currentSearchQuery) + '"';
      content.innerHTML = '<div class="txt-empty"><div class="txt-empty-icon">🔍</div><p>' + msg + '</p></div>';
      return;
    }

    var html = '<div class="txt-list">';
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var preset = item.preset;
      var favOn = isFavorite(preset.path);
      html += '<div class="txt-list-item" data-preset-path="' + escAttr(preset.path) + '">';
      html += '<div class="txt-list-thumb">' + renderPreviewThumb(preset) + '</div>';
      html += '<button type="button" class="txt-list-fav' + (favOn ? ' on' : '') + '" data-fav-path="' + escAttr(preset.path) + '" title="Favorito">★</button>';
      html += '<div class="txt-list-info">';
      html += '<div class="txt-list-name">' + highlightMatch(preset.name, currentSearchQuery) + '</div>';
      html += '<div class="txt-list-path">' + escHtml(item.packName) + ' › ' + escHtml(item.category) + '</div>';
      html += '</div>';
      html += '<button type="button" class="tk-btn tk-btn-primary txt-list-apply">Aplicar</button>';
      html += '</div>';
    }
    html += '</div>';
    content.innerHTML = html;
    bindPresetEvents();
  }

  function renderFavorites() {
    var content = $('txt-content');
    if (!content || !window.SmoothTextPresetManager) return;

    var items = getFavoritePresets();
    if (currentSearchQuery) {
      var q = currentSearchQuery.toLowerCase();
      items = items.filter(function (item) {
        return item.preset.name.toLowerCase().indexOf(q) !== -1 ||
          item.category.toLowerCase().indexOf(q) !== -1 ||
          item.packName.toLowerCase().indexOf(q) !== -1;
      });
    }

    if (!items.length) {
      content.innerHTML = '<div class="txt-empty">' +
        '<div class="txt-empty-icon">★</div>' +
        '<h3>' + (getFavorites().length ? 'Sin coincidencias' : 'Sin favoritos') + '</h3>' +
        '<p>' + (getFavorites().length
          ? 'Prueba otra búsqueda o vuelve a todos los presets.'
          : 'Pulsa ★ en cualquier preset para guardarlo aquí.') +
        '</p></div>';
      return;
    }

    var html = '<div class="txt-fav-section-head">Favoritos · ' + items.length + '</div>';
    html += '<div class="txt-grid" style="padding:0 8px 12px;">';
    for (var i = 0; i < items.length; i++) {
      html += renderPresetCard(items[i].preset);
    }
    html += '</div>';
    content.innerHTML = html;
    bindPresetEvents();
  }

  function renderCurrentView() {
    updateFavToolbarBtn();
    if (viewMode === 'favorites') {
      renderFavorites();
      return;
    }
    if (currentSearchQuery) {
      renderSearchResults(SmoothTextPresetManager.searchPresets(currentSearchQuery));
    } else {
      renderPacks();
    }
  }

  function renderPacks() {
    var content = $('txt-content');
    if (!content || !window.SmoothTextPresetManager) return;

    var packs = SmoothTextPresetManager.getPacks();
    if (!packs.length) {
      content.innerHTML = renderEmptyState();
      var emptyBtn = $('txt-empty-import');
      if (emptyBtn) emptyBtn.addEventListener('click', handleImport);
      return;
    }

    var html = '';
    for (var i = 0; i < packs.length; i++) html += renderPack(packs[i]);
    content.innerHTML = html;
    bindPackEvents();
  }

  function bindPackEvents() {
    document.querySelectorAll('.txt-pack-head').forEach(function (head) {
      head.addEventListener('click', function (e) {
        if (e.target.classList.contains('txt-pack-remove')) return;
        head.parentElement.classList.toggle('expanded');
      });
    });

    document.querySelectorAll('.txt-pack-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleRemovePack(btn.getAttribute('data-pack-id'));
      });
    });

    document.querySelectorAll('.txt-cat-head').forEach(function (head) {
      head.addEventListener('click', function () {
        head.parentElement.classList.toggle('expanded');
      });
    });

    bindPresetEvents();
  }

  function bindPreviewImages() {
    document.querySelectorAll('.txt-preview-img').forEach(function (img) {
      if (img.dataset.previewBound) return;
      img.dataset.previewBound = '1';
      img.addEventListener('error', function () {
        var urls = [];
        try { urls = JSON.parse(img.getAttribute('data-preview-urls') || '[]'); } catch (e) {}
        var idx = parseInt(img.getAttribute('data-preview-idx') || '0', 10) + 1;
        if (idx < urls.length) {
          img.setAttribute('data-preview-idx', String(idx));
          img.src = urls[idx];
          return;
        }
        img.style.display = 'none';
        var fb = img.nextElementSibling;
        if (fb) fb.style.display = 'flex';
      });
    });
  }

  function bindPresetEvents() {
    document.querySelectorAll('.txt-apply-in, .txt-list-apply').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = btn.closest('.txt-card') || btn.closest('.txt-list-item');
        var path = el && el.getAttribute('data-preset-path');
        if (path) handleApplyPreset(path, el);
      });
    });

    document.querySelectorAll('.txt-fav-btn, .txt-list-fav').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var path = btn.getAttribute('data-fav-path');
        if (!path) return;
        var added = toggleFavorite(path);
        btn.classList.toggle('on', added);
        if (viewMode === 'favorites' && !added) {
          renderCurrentView();
        }
      });
    });

    document.querySelectorAll('.txt-card').forEach(function (card) {
      card.addEventListener('dblclick', function (e) {
        if (e.target && e.target.closest('.txt-fav-btn')) return;
        var path = card.getAttribute('data-preset-path');
        if (path) handleApplyPreset(path, card);
      });
    });

    bindPreviewImages();
  }

  function handleApplyPreset(presetPath, el) {
    if (el) {
      el.style.opacity = '0.6';
      el.style.pointerEvents = 'none';
    }
    SmoothTextPresetManager.applyPreset(presetPath, false, function (result) {
      if (el) {
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
      if (result.success) {
        toast('✓ ' + (result.message || 'Preset aplicado'));
      } else {
        toast('⚠ ' + (result.error || 'Error al aplicar'), 5000);
      }
    });
  }

  function handleImport() {
    if (!csInterface || !window.SmoothTextPresetManager) {
      toast('CEP no disponible.');
      return;
    }
    toast('Selecciona la carpeta del pack…');
    SmoothTextPresetManager.importPack(function (pack, error) {
      if (error) {
        toast('⚠ ' + error, 5000);
        return;
      }
      if (pack) {
        toast('✓ Pack "' + pack.name + '" — ' + pack.presetCount + ' presets', 4500);
        currentSearchQuery = '';
        var search = $('txt-search');
        if (search) search.value = '';
        var clearBtn = $('txt-search-clear');
        if (clearBtn) clearBtn.classList.add('hidden');
        viewMode = 'all';
        renderCurrentView();
      }
    });
  }

  function handleRemovePack(packId) {
    var packs = SmoothTextPresetManager.getPacks();
    var packName = '';
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === packId) {
        packName = packs[i].name;
        break;
      }
    }
    if (!confirm('¿Eliminar el pack "' + packName + '" del registro?\n(Los archivos originales no se borran)')) return;
    SmoothTextPresetManager.removePack(packId, function () {
      toast('Pack eliminado');
      renderCurrentView();
    });
  }

  function handleSearch(query) {
    currentSearchQuery = query.trim();
    renderCurrentView();
  }

  function updateLayerInfo() {
    if (!csInterface) return;
    csInterface.evalScript('getSelectedLayerInfo()', function (result) {
      var el = $('txt-footer-text');
      if (!el) return;
      try {
        var info = JSON.parse(result);
        if (!info.hasComp) {
          el.innerHTML = '<span class="txt-footer-muted">Sin composición activa</span>';
          return;
        }
        if (!info.layers.length) {
          el.innerHTML = escHtml(info.compName) + ' — <span class="txt-footer-muted">Sin selección</span>';
          return;
        }
        if (info.layers.length === 1) {
          var layer = info.layers[0];
          el.innerHTML = '<span class="txt-footer-layer">' + escHtml(layer.name) + '</span> <span class="txt-footer-type">(' + escHtml(layer.type) + ')</span>';
        } else {
          el.innerHTML = '<span class="txt-footer-layer">' + info.layers.length + ' capas seleccionadas</span>';
        }
      } catch (e) {
        el.innerHTML = '<span class="txt-footer-muted">—</span>';
      }
    });
  }

  function bindUi() {
    var search = $('txt-search');
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
          handleSearch(search.value);
        }, 200);
        var clearBtn = $('txt-search-clear');
        if (clearBtn) clearBtn.classList.toggle('hidden', !search.value.length);
      });
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          search.value = '';
          handleSearch('');
          var clearBtn = $('txt-search-clear');
          if (clearBtn) clearBtn.classList.add('hidden');
        }
      });
    }

    var clearBtn = $('txt-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var inp = $('txt-search');
        if (inp) inp.value = '';
        handleSearch('');
        clearBtn.classList.add('hidden');
      });
    }

    var importBtn = $('txt-import-btn');
    if (importBtn) importBtn.addEventListener('click', handleImport);

    var favView = $('txt-view-fav');
    if (favView) {
      favView.addEventListener('click', function () {
        viewMode = viewMode === 'favorites' ? 'all' : 'favorites';
        renderCurrentView();
      });
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;

    if (typeof CSInterface !== 'undefined') {
      try {
        csInterface = new CSInterface();
        extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
      } catch (e) {
        csInterface = null;
        extensionPath = '';
      }
    }

    if (!csInterface || !window.SmoothTextPresetManager) {
      var content = $('txt-content');
      if (content) content.innerHTML = '<div class="txt-empty">CEP no disponible.</div>';
      return;
    }

    SmoothTextPresetManager.init(csInterface, function () {
      bindUi();
      renderCurrentView();
      updateLayerInfo();
      if (layerPollTimer) clearInterval(layerPollTimer);
      layerPollTimer = setInterval(updateLayerInfo, 2000);
    });
  }

  function onShow() {
    updateLayerInfo();
  }

  window.MB_text = { init: init, onShow: onShow };
})();
