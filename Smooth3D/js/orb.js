/**
 * Smooth3D — Motor de layout 3D (fuente de verdad)
 * ==================================================================
 * Calcula la posición/rotación de cada slot en el espacio 3D. Esta MISMA
 * matemática alimenta el preview en canvas y el generador de AE (el panel
 * manda estas transforms al ExtendScript, que solo las aplica). Así lo que
 * ves en el preview es idéntico a lo que se crea en After Effects.
 *
 * Sistema de coordenadas: centrado en el origen, Y hacia ARRIBA, Z hacia la
 * cámara (+Z = más cerca). El proyector (preview) y el host (AE) convierten.
 */
(function (global) {
  'use strict';

  var DEG = Math.PI / 180;

  // Paleta de slots (misma en el preview y en el generador de AE)
  var PALETTE = ['#f43f5e', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
                 '#14b8a6', '#ef4444', '#06b6d4', '#84cc16', '#a855f7', '#f97316'];
  function colorFor(i) { return PALETTE[i % PALETTE.length]; }

  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }; }
  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }; }

  var DISTRIBUTIONS = ['circle', 'slideH', 'slideV', 'helix', 'sphere', 'wall', 'tunnel', 'wave', 'arc', 'cylinder', 'dna'];

  /* Distribuciones que son una fila/columna: el slot enfocado va al centro. */
  function isSlide(d) { return d === 'slideH' || d === 'slideV'; }

  /**
   * Devuelve un array de slots { x, y, z, ry } (ry = giro propio en Y, grados)
   * centrados en el origen. `depthOn`/`depth` separa en Z para el efecto 3D.
   */
  function layout(state) {
    var n = Math.max(1, state.slots | 0);
    var r = state.radius || 380;
    var out = [], i, t, th;

    switch (state.distribution) {
      case 'slideH':
      case 'slideV': {
        // Fila (o columna) de slots. El separador sale del tamano del slot,
        // asi nunca se enciman. La profundidad la aporta "Separacion Z".
        var vert = (state.distribution === 'slideV');
        var gap = (vert ? (state.slotH || 280) : (state.slotW || 200)) * 1.18;
        for (i = 0; i < n; i++) {
          var d0 = (i - (n - 1) / 2) * gap;
          out.push(vert ? { x: 0, y: -d0, z: 0, ry: 0 } : { x: d0, y: 0, z: 0, ry: 0 });
        }
        break;
      }
      case 'helix': {
        // +90° para que el slot 1 arranque de frente a la cámara: así el
        // controlador "Slot al frente" de AE centra el slot pedido.
        var hHeight = r * 1.7, turns = state.turns || 2;
        for (i = 0; i < n; i++) {
          t = n > 1 ? i / (n - 1) : 0.5;
          th = t * Math.PI * 2 * turns + Math.PI / 2;
          out.push({ x: r * Math.cos(th), y: (t - 0.5) * hHeight, z: r * Math.sin(th), ry: -th / DEG + 90 });
        }
        break;
      }
      case 'sphere': {
        var ga = Math.PI * (3 - Math.sqrt(5));   // ángulo áureo (fibonacci sphere)
        for (i = 0; i < n; i++) {
          var yy = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
          var rad = Math.sqrt(Math.max(0, 1 - yy * yy));
          th = ga * i;
          out.push({ x: Math.cos(th) * rad * r, y: yy * r, z: Math.sin(th) * rad * r, ry: (th / DEG) % 360 });
        }
        break;
      }
      case 'wall': {
        var cols = Math.max(1, Math.round(Math.sqrt(n * (state.compW || 1920) / (state.compH || 1080))));
        var rows = Math.ceil(n / cols);
        var gx = (state.slotW || 200) * 1.15, gy = (state.slotH || 280) * 1.15;
        for (i = 0; i < n; i++) {
          var cx = i % cols, cy = Math.floor(i / cols);
          out.push({ x: (cx - (cols - 1) / 2) * gx, y: -(cy - (rows - 1) / 2) * gy, z: 0, ry: 0 });
        }
        break;
      }
      case 'tunnel': {
        var tz = r * 3.2, tturns = state.turns || 2;
        for (i = 0; i < n; i++) {
          t = n > 1 ? i / (n - 1) : 0.5;
          th = t * Math.PI * 2 * tturns;
          out.push({ x: r * Math.cos(th), y: r * Math.sin(th), z: (t - 0.5) * tz, ry: 0 });
        }
        break;
      }
      case 'wave': {
        var wSpan = r * 2.4, amp = r * 0.5;
        for (i = 0; i < n; i++) {
          t = n > 1 ? i / (n - 1) : 0.5;
          out.push({ x: (t - 0.5) * wSpan, y: Math.sin(t * Math.PI * 2 * (state.turns || 2)) * amp, z: Math.cos(t * Math.PI * 2 * (state.turns || 2)) * amp, ry: 0 });
        }
        break;
      }
      case 'arc': {
        var arcDeg = 140, start = -arcDeg / 2;
        for (i = 0; i < n; i++) {
          t = n > 1 ? i / (n - 1) : 0.5;
          th = (start + t * arcDeg) * DEG;
          out.push({ x: r * Math.sin(th), y: 0, z: r * Math.cos(th) - r, ry: -th / DEG });
        }
        break;
      }
      case 'cylinder': {
        var cH = r * 1.4, perRow = Math.max(3, Math.round(n / Math.max(1, Math.round(n / 8))));
        for (i = 0; i < n; i++) {
          var row = Math.floor(i / perRow), inRow = i % perRow;
          th = (inRow / perRow) * Math.PI * 2 + Math.PI / 2;   // slot 1 al frente
          var rowsN = Math.ceil(n / perRow);
          out.push({ x: r * Math.cos(th), y: (rowsN > 1 ? (row / (rowsN - 1) - 0.5) : 0) * cH, z: r * Math.sin(th), ry: -th / DEG + 90 });
        }
        break;
      }
      case 'dna': {
        var dH = r * 2, strand;
        for (i = 0; i < n; i++) {
          t = n > 1 ? i / (n - 1) : 0.5;
          strand = i % 2 === 0 ? 0 : Math.PI;
          th = t * Math.PI * 2 * (state.turns || 3) + strand + Math.PI / 2;  // slot 1 al frente
          out.push({ x: r * Math.cos(th), y: (t - 0.5) * dH, z: r * Math.sin(th), ry: -th / DEG + 90 });
        }
        break;
      }
      default: { // 'circle'
        var tilt = (state.inclineX != null ? state.inclineX : 72) * DEG;
        for (i = 0; i < n; i++) {
          th = (i / n) * Math.PI * 2 - Math.PI / 2;
          var p = { x: r * Math.cos(th), y: r * Math.sin(th), z: 0 };
          p = rotX(p, tilt - Math.PI / 2);       // inclina el anillo
          if (state.depthOn) p.z += (i - (n - 1) / 2) * ((state.depth || 0) * 0.9);
          p.ry = 0;
          out.push(p);
        }
        break;
      }
    }
    return out;
  }

  /** Proyección perspectiva simple para el preview. cx/cy = centro del canvas. */
  function project(p, cam, cx, cy) {
    var camZ = cam.distance || 1200;
    var zc = camZ - p.z; if (zc < 1) zc = 1;
    var s = camZ / zc;
    return { x: cx + p.x * s, y: cy - p.y * s, s: s, z: p.z };
  }

  global.Smooth3D_Orb = {
    layout: layout,
    project: project,
    rotX: rotX,
    rotY: rotY,
    DEG: DEG,
    DISTRIBUTIONS: DISTRIBUTIONS,
    isSlide: isSlide,
    PALETTE: PALETTE,
    colorFor: colorFor,
  };
})(typeof window !== 'undefined' ? window : this);
