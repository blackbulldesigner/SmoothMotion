/**
 * Smooth3D — Preview 3D en canvas
 * ==================================================================
 * Renderiza el orbe en vivo usando la MISMA matemática que el generador de AE
 * (Smooth3D_Orb). Perspectiva simple + painter's algorithm (dibuja de atrás
 * hacia adelante). Rota suave para dar la sensación de "ya animado".
 */
(function (global) {
  'use strict';

  var Orb = global.Smooth3D_Orb;

  // Paleta compartida (misma que usa el generador de AE)
  var PALETTE = (Orb && Orb.PALETTE) ? Orb.PALETTE
    : ['#f43f5e', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
       '#14b8a6', '#ef4444', '#06b6d4', '#84cc16', '#a855f7', '#f97316'];

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function shapePath(c, shape, x, y, w, h) {
    var cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    switch (shape) {
      case 'circle':
        c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.closePath(); break;
      case 'rect':
        c.beginPath(); c.rect(x, y, w, h); c.closePath(); break;
      case 'diamond':
        c.beginPath(); c.moveTo(cx, y); c.lineTo(x + w, cy); c.lineTo(cx, y + h); c.lineTo(x, cy); c.closePath(); break;
      case 'hexagon': {
        c.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = Math.PI / 180 * (60 * i - 30);
          var px = cx + rx * Math.cos(a), py = cy + ry * Math.cos(a) * 0 + ry * Math.sin(a);
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath(); break;
      }
      case 'pill':
        roundRect(c, x, y, w, h, Math.min(w, h) / 2); break;
      case 'star': {
        c.beginPath();
        for (var j = 0; j < 10; j++) {
          var ang = Math.PI / 5 * j - Math.PI / 2;
          var rr = (j % 2 === 0) ? 1 : 0.45;
          var sx = cx + rx * rr * Math.cos(ang), sy = cy + ry * rr * Math.sin(ang);
          if (j === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
        }
        c.closePath(); break;
      }
      default: // card
        roundRect(c, x, y, w, h, Math.min(w, h) * 0.14); break;
    }
  }

  function Preview(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.angle = 0;
    this.spin = true;
    this.raf = null;
    this.dpr = global.devicePixelRatio || 1;
  }

  Preview.prototype.setState = function (state) { this.state = state; };
  Preview.prototype.toggleSpin = function (on) { this.spin = on; };

  Preview.prototype.resize = function () {
    var c = this.canvas, rect = c.getBoundingClientRect();
    this.dpr = global.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(rect.width * this.dpr));
    c.height = Math.max(1, Math.round(rect.height * this.dpr));
  };

  Preview.prototype.start = function () {
    var self = this;
    if (self.raf) return;
    var loop = function () { self.frame(); self.raf = global.requestAnimationFrame(loop); };
    self.raf = global.requestAnimationFrame(loop);
  };
  Preview.prototype.stop = function () { if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = null; } };

  Preview.prototype.frame = function () {
    var c = this.ctx, cv = this.canvas, s = this.state;
    if (!s) return;
    if (this.spin) this.angle += 0.006;

    var W = cv.width, H = cv.height, dpr = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    // escala el mundo para que el orbe entre en el canvas
    var worldSpan = (s.radius || 380) * 2.6;
    var fit = Math.min(W, H) / worldSpan;
    var cam = { distance: (s.camDistance || 1200) };

    var slots = Orb.layout(s);
    var slide = Orb.isSlide && Orb.isSlide(s.distribution);
    // Un slide es plano: no se gira, se ve de frente como en la comp.
    var orbit = slide ? 0 : (s.cameraOrbit ? this.angle : (this.spin ? this.angle : 0));
    // Zoom del slot central (el enfocado). En el preview el foco es el del medio.
    var czoom = (s.centerZoom != null ? s.centerZoom : 100) / 100;
    var midIdx = (slots.length - 1) / 2;

    // proyecta + ordena por profundidad
    var proj = [];
    for (var i = 0; i < slots.length; i++) {
      var p = Orb.rotY(slots[i], orbit);
      p = { x: p.x * fit, y: p.y * fit, z: p.z * fit, ry: slots[i].ry };
      var pr = Orb.project(p, cam, cx, cy);
      proj.push({ i: i, x: pr.x, y: pr.y, s: pr.s, z: p.z });
    }
    // atras primero; en Slide todos comparten z, asi que manda la cercania al
    // centro para que el enfocado quede arriba de sus vecinos.
    if (slide) proj.sort(function (a, b) { return Math.abs(b.i - midIdx) - Math.abs(a.i - midIdx); });
    else proj.sort(function (a, b) { return a.z - b.z; });

    var sw = (s.slotW || 200) * fit, sh = (s.slotH || 280) * fit;

    for (var k = 0; k < proj.length; k++) {
      var q = proj[k];
      // en Slide el slot enfocado crece y los vecinos se achican
      var zf = slide ? (1 + (czoom - 1) * Math.max(0, 1 - Math.abs(q.i - midIdx))) : 1;
      var w = sw * q.s * zf, h = sh * q.s * zf;
      var x = q.x - w / 2, y = q.y - h / 2;
      // profundidad → opacidad/brillo
      var depthT = Math.max(0, Math.min(1, (q.s - 0.55) / 0.9));
      c.globalAlpha = 0.45 + depthT * 0.55;

      // sombra sutil
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.45)';
      c.shadowBlur = 18 * q.s;
      c.shadowOffsetY = 10 * q.s;
      shapePath(c, s.shape || 'card', x, y, w, h);
      c.fillStyle = PALETTE[q.i % PALETTE.length];
      c.fill();
      c.restore();

      // etiqueta del slot
      c.globalAlpha = 0.45 + depthT * 0.55;
      c.fillStyle = 'rgba(255,255,255,0.95)';
      c.font = '700 ' + Math.max(9, Math.round(15 * q.s)) + 'px -apple-system, Segoe UI, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('SLOT ' + (q.i + 1), q.x, q.y);
    }

    // anillo visual opcional
    if (s.ringOn) {
      c.globalAlpha = 0.9;
      c.strokeStyle = s.ringColor || '#3b82f6';
      c.lineWidth = Math.max(1, (s.ringWidth || 4) * fit * 0.5);
      var rr = (s.radius || 380) * fit;
      c.save();
      c.translate(cx, cy);
      c.scale(1, Math.abs(Math.cos(((s.inclineX != null ? s.inclineX : 72)) * Orb.DEG)) || 0.3);
      c.beginPath();
      c.ellipse(0, 0, rr, rr, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    c.globalAlpha = 1;
  };

  global.Smooth3D_Preview = Preview;
})(typeof window !== 'undefined' ? window : this);
