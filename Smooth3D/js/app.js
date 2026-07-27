/**
 * Smooth3D — App / UI
 * ==================================================================
 * Une los controles con el estado y el preview en vivo (Smooth3D_Preview).
 * "Generar" arma un payload (estado + slots ya calculados por Smooth3D_Orb) y
 * lo manda al ExtendScript S3_generate() que construye la comp en AE.
 */
(function (global) {
  'use strict';

  var cs = null; try { cs = new CSInterface(); } catch (e) { cs = null; }
  var isEN = function () { try { return global.SM_I18N && SM_I18N.getLang() === 'en'; } catch (e) { return false; } };

  /* ── Estado ─────────────────────────────────────────────────────────── */
  var state = {
    compW: 1920, compH: 1080, fps: 30, dur: 12,
    slots: 10, radius: 380, inclineX: 72, turns: 2, slotW: 200, slotH: 280,
    distribution: 'circle',
    depthOn: false, depth: 40,
    ringOn: false, ringColor: '#3b82f6', ringWidth: 4, ringAnim: true, ringTime: 1.5,
    camDistance: 1200, cameraOrbit: false, dof: false,
    shape: 'card',
    anim: 'rotacion', velocity: 'ease', loop: false, autoRotate: true,
    centerZoom: 140,
    autoMatte: true, contentFolder: '', importContent: true,
  };

  function $(id) { return document.getElementById(id); }
  function svg(inner) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; }

  /* ── Catálogos ──────────────────────────────────────────────────────── */
  var DIST = [
    { id: 'circle',   es: 'Círculo',  en: 'Circle',   ic: svg('<ellipse cx="12" cy="12" rx="9" ry="4"/><circle cx="3" cy="12" r="1.3" fill="currentColor"/><circle cx="21" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="8" r="1.3" fill="currentColor"/>') },
    { id: 'slideH',   es: 'Slide H',  en: 'Slide H',  ic: svg('<rect x="9" y="5" width="6" height="14" rx="1.5"/><rect x="2.5" y="8" width="4.5" height="8" rx="1.2"/><rect x="17" y="8" width="4.5" height="8" rx="1.2"/>') },
    { id: 'slideV',   es: 'Slide V',  en: 'Slide V',  ic: svg('<rect x="5" y="9" width="14" height="6" rx="1.5"/><rect x="8" y="2.5" width="8" height="4.5" rx="1.2"/><rect x="8" y="17" width="8" height="4.5" rx="1.2"/>') },
    { id: 'helix',    es: 'Hélice',   en: 'Helix',    ic: svg('<path d="M7 3c8 2 8 4 0 6s-8 4 0 6 8 4 0 6"/>') },
    { id: 'sphere',   es: 'Esfera',   en: 'Sphere',   ic: svg('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="3.5" ry="9"/>') },
    { id: 'wall',     es: 'Muro',     en: 'Wall',     ic: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>') },
    { id: 'tunnel',   es: 'Túnel',    en: 'Tunnel',   ic: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/><rect x="10" y="10" width="4" height="4"/>') },
    { id: 'wave',     es: 'Onda',     en: 'Wave',     ic: svg('<path d="M3 12c3-6 6 6 9 0s6-6 9 0"/>') },
    { id: 'arc',      es: 'Arco',     en: 'Arc',      ic: svg('<path d="M4 16a8 8 0 0 1 16 0"/><circle cx="4" cy="16" r="1.3" fill="currentColor"/><circle cx="20" cy="16" r="1.3" fill="currentColor"/>') },
    { id: 'cylinder', es: 'Cilindro', en: 'Cylinder', ic: svg('<ellipse cx="12" cy="5" rx="7" ry="2.6"/><path d="M5 5v14M19 5v14"/><ellipse cx="12" cy="19" rx="7" ry="2.6"/>') },
    { id: 'dna',      es: 'ADN',      en: 'DNA',      ic: svg('<path d="M8 3c0 6 8 6 8 12s-8 6-8 6"/><path d="M16 3c0 6-8 6-8 12s8 6 8 6"/>') },
  ];
  var SHAPES = [
    { id: 'card',    es: 'Card',     en: 'Card',    ic: svg('<rect x="4" y="4" width="16" height="16" rx="4"/>') },
    { id: 'circle',  es: 'Círculo',  en: 'Circle',  ic: svg('<circle cx="12" cy="12" r="8"/>') },
    { id: 'rect',    es: 'Rect',     en: 'Rect',    ic: svg('<rect x="4" y="6" width="16" height="12"/>') },
    { id: 'diamond', es: 'Diamante', en: 'Diamond', ic: svg('<path d="M12 3l9 9-9 9-9-9z"/>') },
    { id: 'hexagon', es: 'Hexágono', en: 'Hexagon', ic: svg('<path d="M7 4h10l4 8-4 8H7l-4-8z"/>') },
    { id: 'pill',    es: 'Píldora',  en: 'Pill',    ic: svg('<rect x="3" y="8" width="18" height="8" rx="4"/>') },
    { id: 'star',    es: 'Estrella', en: 'Star',    ic: svg('<path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3.1 1.3-6.2L3 9.6l6.3-.7z"/>') },
  ];
  var ANIMS = [
    { id: 'carrusel',   es: ['Carrusel', 'Recorre los slots: cada uno pasa por el centro'], en: ['Carousel', 'Steps through the slots, centering each one'], tag: 'new' },
    { id: 'plano3d',    es: ['Plano → 3D', 'Empieza plano y se vuelve tridimensional'], en: ['Flat → 3D', 'Starts flat then becomes 3D'], tag: 'epic' },
    { id: 'aparicion',  es: ['Aparición 3D', 'Cada slot aparece y se acomoda en el orbe'], en: ['3D Reveal', 'Each slot pops in and settles'], tag: 'top' },
    { id: 'reveal',     es: ['Reveal escalonado', 'Aparecen uno por uno y se despliega'], en: ['Staggered reveal', 'They appear one by one'], tag: '' },
    { id: 'rotacion',   es: ['Rotación constante', 'Giro suave y continuo, ideal para loops'], en: ['Constant rotation', 'Smooth continuous spin'], tag: '' },
    { id: 'scalein',    es: ['Scale In', 'Crecen desde el centro hacia afuera'], en: ['Scale In', 'Grow from the center out'], tag: '' },
    { id: 'aceleracion',es: ['Aceleración', 'Arranca lento y luego explota'], en: ['Acceleration', 'Starts slow then bursts'], tag: 'fx' },
    { id: 'pendulo',    es: ['Péndulo', 'Oscila de lado a lado, ideal loops'], en: ['Pendulum', 'Swings side to side'], tag: '' },
  ];

  /* ── Preview ────────────────────────────────────────────────────────── */
  var preview = new Smooth3D_Preview($('s3-canvas'));
  preview.setState(state);
  function refresh() { preview.setState(state); updateStatus(); }
  function updateStatus() {
    var d = DIST.filter(function (x) { return x.id === state.distribution; })[0];
    var txt = state.slots + ' slots · ' + (d ? (isEN() ? d.en : d.es).toLowerCase() : state.distribution);
    var el = $('s3-status'); if (el) el.textContent = txt;
    var sum = $('s3-sum'); if (sum) sum.textContent = txt;
  }

  /* ── Chips ──────────────────────────────────────────────────────────── */
  function renderChips(host, items, current, onPick) {
    host.innerHTML = '';
    items.forEach(function (it) {
      var el = document.createElement('div');
      el.className = 's3-chip' + (it.id === current() ? ' on' : '');
      el.setAttribute('data-no-i18n', '');
      el.innerHTML = it.ic + '<span>' + (isEN() ? it.en : it.es) + '</span>';
      el.addEventListener('click', function () {
        onPick(it.id);
        host.querySelectorAll('.s3-chip').forEach(function (c) { c.classList.remove('on'); });
        el.classList.add('on');
      });
      host.appendChild(el);
    });
  }

  /* ── Presets de animación ───────────────────────────────────────────── */
  function renderAnims() {
    var host = $('s3-anim'); host.innerHTML = '';
    ANIMS.forEach(function (a) {
      var txt = isEN() ? a.en : a.es;
      var el = document.createElement('div');
      el.className = 's3-anim-item' + (a.id === state.anim ? ' on' : '');
      el.setAttribute('data-no-i18n', '');
      el.innerHTML =
        '<span class="rad"></span>' +
        '<span class="ax">' +
          '<span class="n">' + txt[0] + (a.tag ? ' <b class="tg ' + a.tag + '">' + a.tag.toUpperCase() + '</b>' : '') + '</span>' +
          '<span class="d">' + txt[1] + '</span>' +
        '</span>';
      el.addEventListener('click', function () {
        state.anim = a.id;
        host.querySelectorAll('.s3-anim-item').forEach(function (c) { c.classList.remove('on'); });
        el.classList.add('on');
      });
      host.appendChild(el);
    });
  }

  /* ── Binding de sliders + números ───────────────────────────────────── */
  function bindPair(sliderId, numId, key, isFloat) {
    var sl = $(sliderId), nu = $(numId);
    function set(v) {
      v = isFloat ? parseFloat(v) : parseInt(v, 10);
      if (isNaN(v)) return;
      state[key] = v;
      if (sl) sl.value = v; if (nu) nu.value = v;
      refresh();
    }
    if (sl) sl.addEventListener('input', function () { set(sl.value); });
    if (nu) nu.addEventListener('input', function () { set(nu.value); });
  }
  function bindNum(id, key, isFloat) {
    var el = $(id); if (!el) return;
    el.addEventListener('input', function () { var v = isFloat ? parseFloat(el.value) : parseInt(el.value, 10); if (!isNaN(v)) { state[key] = v; refresh(); } });
  }
  function bindToggle(id, key, onChange) {
    var el = $(id); if (!el) return;
    if (state[key]) el.classList.add('on');
    el.addEventListener('click', function () {
      state[key] = !state[key];
      el.classList.toggle('on', state[key]);
      if (onChange) onChange(state[key]);
      refresh();
    });
  }

  /* ── Toast ──────────────────────────────────────────────────────────── */
  var tTimer;
  function toast(msg) { var t = $('s3-toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(tTimer); tTimer = setTimeout(function () { t.classList.remove('show'); }, 3200); }
  global.smoothMotionToast = function (m) { toast(m); };

  /* ── Auto-rellenar desde carpeta ────────────────────────────────────── */
  function pickFolder() {
    if (!cs) { toast(isEN() ? 'Only works inside After Effects.' : 'Solo funciona dentro de After Effects.'); return; }
    // El dialogo lo abre ExtendScript: es el que se lleva bien con AE.
    cs.evalScript('S3_pickFolder()', function (res) {
      var d = null;
      try { d = JSON.parse(res); } catch (e) {}
      if (!d || !d.ok) {
        if (d && d.msg) toast(d.msg);
        else if (res && res.indexOf('ERR') === 0) toast(res);
        return;   // cancelado: sin ruido
      }
      state.contentFolder = d.path;
      var lbl = document.querySelector('#ct-folder span');
      if (lbl) lbl.textContent = (isEN() ? 'Folder: ' : 'Carpeta: ') + d.name + ' (' + d.count + ')';
      toast((isEN() ? 'Found ' : 'Encontré ') + d.count + (isEN() ? ' files' : ' archivos'));
    });
  }

  /* ── Generar ────────────────────────────────────────────────────────── */
  function buildPayload() {
    var slots = Smooth3D_Orb.layout(state);   // posiciones 3D (misma matemática que el preview)
    var colors = [];
    for (var i = 0; i < slots.length; i++) colors.push(Smooth3D_Orb.colorFor(i));
    return { version: 1, state: state, slots: slots, colors: colors };
  }
  function generate() {
    var payload = buildPayload();
    if (!cs) { toast(isEN() ? 'Only works inside After Effects.' : 'Solo funciona dentro de After Effects.'); return; }
    var json = JSON.stringify(payload).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    toast(isEN() ? 'Generating orb…' : 'Generando orbe…');
    cs.evalScript('S3_generate("' + json + '")', function (res) {
      if (res && res.indexOf('OK') === 0) toast(isEN() ? 'Orb created ✓' : 'Orbe creado ✓');
      else toast((isEN() ? 'AE: ' : 'AE: ') + (res || 'error'));
    });
  }

  /* ── Init ───────────────────────────────────────────────────────────── */
  function init() {
    // chips
    renderChips($('s3-dist'), DIST, function () { return state.distribution; }, function (id) { state.distribution = id; refresh(); });
    renderChips($('s3-shape'), SHAPES, function () { return state.shape; }, function (id) { state.shape = id; refresh(); });
    renderAnims();

    // composición
    bindNum('c-w', 'compW'); bindNum('c-h', 'compH'); bindNum('c-fps', 'fps'); bindNum('c-dur', 'dur');
    // orbe
    bindPair('o-slots', 'o-slots-n', 'slots');
    bindPair('o-radius', 'o-radius-n', 'radius');
    bindPair('o-incline', 'o-incline-n', 'inclineX');
    bindPair('o-turns', 'o-turns-n', 'turns', true);
    bindPair('o-sw', 'o-sw-n', 'slotW');
    bindPair('o-sh', 'o-sh-n', 'slotH');
    // profundidad
    bindToggle('d-on', 'depthOn');
    bindPair('d-amt', 'd-amt-n', 'depth');
    // anillo
    bindToggle('r-on', 'ringOn');
    var rc = $('r-color'); if (rc) rc.addEventListener('input', function () { state.ringColor = rc.value; refresh(); });
    bindPair('r-w', 'r-w-n', 'ringWidth');
    bindToggle('r-anim', 'ringAnim');
    bindPair('r-time', 'r-time-n', 'ringTime', true);
    // cámara
    bindPair('cam-dist', 'cam-dist-n', 'camDistance');
    bindToggle('cam-orbit', 'cameraOrbit');
    bindToggle('cam-dof', 'dof');
    // animación
    var vel = $('s3-vel');
    if (vel) vel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.velocity = b.getAttribute('data-v');
      vel.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    bindToggle('a-loop', 'loop');
    bindToggle('a-rot', 'autoRotate', function (on) {
      preview.spin = on;
      var t = $('s3-spin-txt'); if (t) t.textContent = on ? (isEN() ? 'Spin' : 'Girar') : (isEN() ? 'Paused' : 'Quieto');
    });
    bindPair('z-center', 'z-center-n', 'centerZoom');
    // contenido
    bindToggle('ct-import', 'importContent');
    bindToggle('ct-matte', 'autoMatte');
    var fld = $('ct-folder'); if (fld) fld.addEventListener('click', pickFolder);

    // pestañas del rail lateral
    var rail = $('s3-rail');
    if (rail) rail.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      var tab = b.getAttribute('data-tab');
      rail.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.s3-tab').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-pane') === tab); });
    });

    // spin
    var spinBtn = $('s3-spin');
    if (spinBtn) spinBtn.addEventListener('click', function () {
      preview.spin = !preview.spin;
      var t = $('s3-spin-txt'); if (t) t.textContent = preview.spin ? (isEN() ? 'Spin' : 'Girar') : (isEN() ? 'Pause' : 'Pausar');
    });

    // generar
    var gen = $('s3-generate'); if (gen) gen.addEventListener('click', generate);

    // preview
    preview.resize();
    preview.setState(state);
    preview.start();
    updateStatus();
    global.addEventListener('resize', function () { preview.resize(); });
    // re-pinta chips si cambia el idioma (por si acaso)
    global.addEventListener('sm-theme-changed', function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
