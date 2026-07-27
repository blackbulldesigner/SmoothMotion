/**
 * SmoothText — resuelve miniaturas SVG embebidas en el plugin
 */
var SmoothTextPreviewResolver = (function () {
  'use strict';

  var PREVIEW_DIR = '/client/previews/text/';
  var DEFAULT = 'fade-in-motion.svg';

  function toFileUrl(absPath) {
    return 'file:///' + String(absPath || '').replace(/\\/g, '/');
  }

  function resolveFileName(preset) {
    var name = String(preset.name || '').toLowerCase();
    var cat = String(preset.category || '').toLowerCase();
    var rel = String(preset.relativePath || preset.path || '').toLowerCase();
    var hay = name + ' ' + cat + ' ' + rel;

    if (/máquina de escribir|typewriter/.test(hay)) return 'typewriter.svg';
    if (/\(b\)/.test(name)) return 'bounce.svg';
    if (/tracking/.test(hay)) return 'tracking.svg';
    if (/desenfoque|blur/.test(hay)) {
      return /caracteres|characters|chars/.test(hay) ? 'blur-in-chars.svg' : 'fade-words.svg';
    }
    if (/rotación|rotation/.test(hay)) return 'rotate-in-chars.svg';
    if (/escala|scale/.test(hay)) return 'scale-pop-chars.svg';
    if (/opacidad|opacity/.test(hay)) {
      if (/línea|line/.test(hay)) return 'fade-lines.svg';
      return /caracteres|characters|chars/.test(hay) ? 'fade-up-chars.svg' : 'fade-words.svg';
    }
    if (/aleatorio|random/.test(hay)) return 'random.svg';
    if (/3d|3 d/.test(hay)) return 'position-3d.svg';
    if (/punto ancla|anchor point|anchor/.test(hay)) return 'anchor.svg';
    if (/posición línea|position line/.test(hay)) return 'fade-lines.svg';
    if (/posición|position/.test(hay)) {
      if (/abajo|down/.test(hay)) return 'position-down.svg';
      if (/arriba|up/.test(hay)) return 'position-up.svg';
      if (/izquierda|left/.test(hay)) return 'slide-left-chars.svg';
      if (/derecha|right/.test(hay)) return 'slide-right-chars.svg';
      return /palabras|words/.test(hay) ? 'fade-words.svg' : 'slide-right-chars.svg';
    }
    return DEFAULT;
  }

  function getPreviewUrl(preset, extensionRoot) {
    if (!extensionRoot) return '';
    var file = resolveFileName(preset);
    return toFileUrl(extensionRoot + PREVIEW_DIR + file);
  }

  function collectPreviewUrls(preset, extensionRoot) {
    var urls = [];
    var seen = {};

    function push(url) {
      if (!url || seen[url]) return;
      seen[url] = true;
      urls.push(url);
    }

    // 1. Intentar cargar versión .gif si existe (para animaciones reales)
    if (preset.thumbPath) {
      push(toFileUrl(preset.thumbPath.replace(/\.jpg$/i, '.gif')));
      // 2. Intentar cargar versión .jpg (la ruta original guardada)
      push(toFileUrl(preset.thumbPath));
    }
    
    // 3. Fallbacks del sistema
    if (preset.previewPath) push(preset.previewPath);
    push(getPreviewUrl(preset, extensionRoot));
    return urls;
  }

  return {
    resolveFileName: resolveFileName,
    getPreviewUrl: getPreviewUrl,
    collectPreviewUrls: collectPreviewUrls,
    toFileUrl: toFileUrl
  };
})();
