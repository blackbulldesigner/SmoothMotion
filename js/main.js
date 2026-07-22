/* ==========================================
   SmoothMotion — Sitio web oficial
   Mockup interactivo + demo + reveal
   ========================================== */

/* ---------- Reveal on scroll ---------- */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

/* ---------- Hamburger menu ---------- */
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileNav = document.getElementById('mobileNav');

if (hamburgerBtn && mobileNav) {
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = hamburgerBtn.classList.toggle('open');
    mobileNav.classList.toggle('open', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
    mobileNav.setAttribute('aria-hidden', !isOpen);
  });

  // Close menu when a link is clicked
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('open');
      mobileNav.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ==========================================
   Hero — rotación de los 11 paneles reales
   ========================================== */
(function () {
  const frame = document.getElementById('heroFrame');
  const titleEl = document.getElementById('heroTitle');
  const loader = document.getElementById('heroLoader');
  const dotsWrap = document.getElementById('heroDots');
  const wrap = document.getElementById('heroPanel');
  if (!frame || !dotsWrap) return;

  const PANELS = [
    { name: 'SmoothCurves', src: 'app/client/index.html?m=flow' },
    { name: 'SmoothText',   src: 'app/SmoothText/index.html' },
    { name: 'SmoothTypo',   src: 'app/SmoothTypo/index.html' },
    { name: 'SmoothTools',  src: 'app/client/index.html?m=scripts' },
    { name: 'SmoothComp',   src: 'app/client/index.html?m=comp' },
    { name: 'SmoothFX',     src: 'app/client/index.html?m=fx' },
    { name: 'SmoothColor',  src: 'app/client/index.html?m=color' },
    { name: 'SmoothAlign',  src: 'app/SmoothAlignPro/index.html' },
    { name: 'SmoothGuides', src: 'app/SmoothGuides/index.html' },
    { name: 'SmoothAnchor', src: 'app/client/index.html?m=anchor' },
    { name: 'SmoothExport', src: 'app/client/index.html?m=export' },
    { name: 'SmoothExplorer',  src: 'app/SmoothExplorer/index.html' },
    { name: 'SmoothTraductor', src: 'app/SmoothTraductor/index.html' },
    { name: 'SmoothPaste',     src: 'app/SmoothPaste/index.html' },
  ];

  const INTERVAL = 5000;
  let idx = 0, timer = null, paused = false;

  PANELS.forEach((p, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'hero-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', p.name);
    d.addEventListener('click', () => { show(i); restart(); });
    dotsWrap.appendChild(d);
  });
  const dots = [...dotsWrap.children];

  function show(i) {
    idx = i;
    titleEl.textContent = PANELS[i].name;
    dots.forEach((d, j) => d.classList.toggle('active', j === i));
    loader.classList.remove('hidden');
    frame.style.opacity = '0';
    frame.setAttribute('src', PANELS[i].src);
  }
  function next() { if (!paused) show((idx + 1) % PANELS.length); }
  function start() { timer = setInterval(next, INTERVAL); }
  function restart() { clearInterval(timer); start(); }

  frame.addEventListener('load', () => {
    if (!frame.getAttribute('src')) return;
    setTimeout(() => { loader.classList.add('hidden'); frame.style.opacity = '1'; }, 220);
  });

  // Pausa la rotación mientras el ratón está encima (para interactuar)
  if (wrap) {
    wrap.addEventListener('mouseenter', () => { paused = true; });
    wrap.addEventListener('mouseleave', () => { paused = false; });
  }

  show(0);
  start();
})();

/* ==========================================
   Playground — paneles reales embebidos
   ========================================== */
const PANEL_INFO = {
  flow: {
    num: '01', name: 'SmoothCurves', tag: 'Editor de curvas de ease',
    body: 'El corazón de SmoothMotion. Edita curvas de aceleración en tiempo real y aplícalas a tus keyframes sin salir del panel.',
    list: ['Modos Ease, Speed, Elastic, Bounce y Custom', 'Aplica como expresión (EXPR) o horneado (KEYS)', 'Lee, invierte y aleatoriza curvas · bibliotecas de presets'],
  },
  text: {
    num: '02', name: 'SmoothText', tag: 'Animador de texto en vivo',
    body: 'Diseña animaciones de texto con vista previa en tiempo real y aplícalas a After Effects con expresiones fieles al preview. Anima por caracteres, palabras o líneas, con entrada y salida.',
    list: ['Easings Smooth, Back, Elastic, Bounce y más', 'Entrada + salida (Exit) con timing y dirección propios', 'Guarda tus presets y cópialos/pégalos entre proyectos'],
  },
  typo: {
    num: '03', name: 'SmoothTypo', tag: 'Herramientas de tipografía',
    body: 'Una barra de herramientas tipográficas para trabajar el texto como en un editor profesional.',
    list: ['Crear y dividir texto por líneas, palabras o letras', 'Resaltar, subrayar, tachar y buscar/reemplazar', 'Contador numérico y máquina de escribir'],
  },
  scripts: {
    num: '04', name: 'SmoothTools', tag: 'Scripts y utilidades',
    body: 'Tu caja de herramientas: una biblioteca de scripts personalizable más utilidades rápidas de flujo de trabajo.',
    list: ['Biblioteca de scripts con categorías y favoritos', 'Renombrar capas en lote y limpiar expresiones', 'Alinear/distribuir keys y precomponer inteligente'],
  },
  comp: {
    num: '05', name: 'SmoothComp', tag: 'Gestor de capas',
    body: 'Controla las capas de tu composición con filtros, colores y notas. La demo trae capas de ejemplo para que lo pruebes.',
    list: ['Filtra por tipo: nulls, sólidos, texto, shapes, cámaras…', 'Colorea por tipo automáticamente', 'Marca capas con keys / expresiones y añade notas'],
  },
  fx: {
    num: '06', name: 'SmoothFX', tag: 'Efectos de movimiento',
    body: 'Efectos de movimiento de uso diario, aplicados en un clic sin bucear en menús.',
    list: ['Camera Shake enlazado a un nulo', 'Wiggle paramétrico', 'Loop (cycle, ping-pong, continue) y fundidos'],
  },
  color: {
    num: '07', name: 'SmoothColor', tag: 'Gestión de color',
    body: 'Trabaja el color de tu proyecto con una paleta personal y acciones rápidas.',
    list: ['Selector con paleta personal guardable', 'Crea sólidos del tamaño de la comp', 'Aplica Fill o crea un control de color por expresiones'],
  },
  align: {
    num: '08', name: 'SmoothAlign', tag: 'Alinear y distribuir',
    body: 'Orden impecable en segundos: alinea y distribuye capas con precisión respecto a comp, área, selección o capa clave.',
    list: ['Seis alineaciones a bordes y centros', 'Distribución horizontal/vertical y por espacios', 'Espaciado personalizado en píxeles'],
  },
  guides: {
    num: '09', name: 'SmoothGuides', tag: 'Guías y safe zones',
    body: 'Guías, cuadrículas y safe zones profesionales con vista previa de la composición activa.',
    list: ['Cuadrícula, centro, márgenes y safe zones', 'Reglas y presets reutilizables', 'Importa y exporta tus configuraciones'],
  },
  anchor: {
    num: '10', name: 'SmoothAnchor', tag: 'Punto de ancla inteligente',
    body: 'Reposiciona el punto de ancla en 9 posiciones según el contenido o la máscara, sin que la capa se mueva en pantalla.',
    list: ['9 posiciones instantáneas', 'Detección inteligente por contenido/máscara', 'La capa no se desplaza al recolocar el ancla'],
  },
  export: {
    num: '11', name: 'SmoothExport', tag: 'Render y exportación',
    body: 'Manda tus composiciones a render con tus plantillas y mantén el proyecto limpio.',
    list: ['Añade comps a la cola de render', 'Plantillas de ajustes y módulos de salida', 'Limpia footage sin usar para optimizar el proyecto'],
  },
  explorer: {
    num: '12', name: 'SmoothExplorer', tag: 'Explorador de archivos',
    body: 'Un explorador de archivos dentro de After Effects: navega tus carpetas, previsualiza medios e importa con doble clic.',
    list: ['Miniaturas de imágenes y video · favoritos de carpetas', 'Reproductor de audio para escuchar antes de importar', 'Importa al proyecto o directo a la comp · tamaño de cuadrícula ajustable'],
  },
  translator: {
    num: '13', name: 'SmoothTraductor', tag: 'Traducir capas de texto',
    body: 'Traduce el texto de la capa seleccionada a decenas de idiomas y aplícalo en una copia, ocultando el original.',
    list: ['Detección automática de idioma o manual', 'Duplica la capa con la traducción y oculta la original', 'Edita la traducción antes de aplicarla'],
  },
  paste: {
    num: '14', name: 'SmoothPaste', tag: 'Copiar frame / pegar imagen',
    body: 'Copia el fotograma actual al portapapeles del sistema, o pega una imagen del portapapeles como una capa nueva.',
    list: ['Copia el frame de la comp al portapapeles', 'Pega imágenes del portapapeles como capa', 'Panel adaptable a cualquier zona de After Effects'],
  },
};

/* ==========================================================
   TIENDA — precios y enlaces de Ko-fi
   ----------------------------------------------------------
   👉 EDITA AQUÍ cuando tengas tu Ko-fi y los productos creados:
   - kofiShop: tu tienda general (se usa si un panel no tiene 'url').
   - currency: símbolo de moneda.
   - family.url / panels.<id>.url: enlace directo del producto en Ko-fi
     (ej. https://ko-fi.com/s/xxxxxxxx). Déjalo '' para usar la tienda general.
   - price: número; cámbialos a tu gusto.
   ========================================================== */
const STORE = {
  kofiShop: 'https://ko-fi.com/TU_USUARIO/shop',
  currency: '$',
  // Paquetes acumulativos (cada uno incluye los paneles del anterior).
  // 👉 EDITA precios y pega la 'url' del producto en Ko-fi cuando lo tengas.
  tiers: [
    {
      id: 'starter', name: 'Starter', price: 30, originalPrice: 45,
      tagline: 'Lo esencial para empezar a animar',
      panels: ['flow', 'anchor', 'translator'],
      url: 'https://ko-fi.com/s/d3a82513cf',
    },
    {
      id: 'pro', name: 'Pro', price: 50, originalPrice: 75, popular: true,
      tagline: 'El flujo completo del motion designer',
      panels: ['flow', 'anchor', 'translator', 'typo', 'fx', 'comp', 'scripts'],
      url: 'https://ko-fi.com/s/11bb63c8cd',
    },
    {
      id: 'studio', name: 'Studio', price: 70, originalPrice: 110,
      tagline: 'Todo SmoothMotion, con actualizaciones futuras',
      panels: ['flow', 'text', 'anchor', 'typo', 'fx', 'comp', 'scripts', 'color', 'align', 'guides', 'export', 'explorer', 'translator', 'paste'],
      allAndUpdates: true,
      url: 'https://ko-fi.com/s/9811ac8619',
    },
  ],
};
function storeUrl(u) { return (u && u.trim()) ? u.trim() : STORE.kofiShop; }
// Paquete más barato que incluye un panel dado
function tierForPanel(id) {
  return STORE.tiers.find((t) => t.panels.indexOf(id) !== -1) || null;
}

(function () {
  const frame = document.getElementById('pgFrame');
  const loader = document.getElementById('pgLoader');
  const titleEl = document.getElementById('pgTitle');
  const chips = [...document.querySelectorAll('.pg-chip')];
  if (!frame || chips.length === 0) return;

  const dNum = document.getElementById('pgDescNum');
  const dTitle = document.getElementById('pgDescTitle');
  const dTag = document.getElementById('pgDescTag');
  const dBody = document.getElementById('pgDescBody');
  const dList = document.getElementById('pgDescList');
  const dPrice = document.getElementById('pgPrice');
  const dBuy = document.getElementById('pgBuy');
  const dTier = document.getElementById('pgTier');

  let loaded = false;

  function showLoader() { loader && loader.classList.remove('hidden'); }
  function hideLoader() { loader && loader.classList.add('hidden'); }

  // El panel dibuja con requestAnimationFrame; damos un pequeño margen
  // tras 'load' para que pinte antes de ocultar el loader.
  frame.addEventListener('load', () => {
    if (frame.getAttribute('src')) setTimeout(hideLoader, 250);
  });

  function updateDesc(id) {
    const info = PANEL_INFO[id];
    if (!info) return;
    dNum.textContent = info.num;
    dTitle.textContent = info.name;
    dTag.textContent = info.tag;
    dBody.textContent = info.body;
    dList.innerHTML = info.list.map((li) => '<li>' + li + '</li>').join('');
    if (dPrice) {
      const tier = tierForPanel(id);
      dPrice.textContent = tier ? 'Desde ' + STORE.currency + tier.price : '';
      if (dTier) dTier.textContent = tier ? 'Incluido en el paquete ' + tier.name : '';
    }
  }

  function select(chip) {
    chips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    titleEl.textContent = chip.textContent.trim();
    updateDesc(chip.getAttribute('data-id'));
    showLoader();
    frame.setAttribute('src', chip.getAttribute('data-src'));
  }

  // Descripción inicial (sin cargar aún el iframe)
  updateDesc((chips.find((c) => c.classList.contains('active')) || chips[0]).getAttribute('data-id'));

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('active') && loaded) return;
      loaded = true;
      select(chip);
    });
  });

  // Carga diferida: solo montamos el primer panel cuando el playground
  // entra en pantalla, para no penalizar la carga inicial de la web.
  const pgObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !loaded) {
          loaded = true;
          const active = chips.find((c) => c.classList.contains('active')) || chips[0];
          select(active);
          pgObserver.disconnect();
        }
      });
    },
    { threshold: 0.01, rootMargin: '300px 0px' }
  );
  pgObserver.observe(document.getElementById('pgWindow'));
})();

/* ==========================================
   Extras — conteo de stats + scrollspy nav
   ========================================== */
(function () {
  // Conteo animado de las cifras del hero (11, 100+, 1)
  const nums = [...document.querySelectorAll('.hero-stats .stat strong')];
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const raw = el.textContent.trim();
      const target = parseInt(raw, 10) || 0;
      const suffix = raw.replace(/[0-9]/g, '');
      const dur = 900;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => countObs.observe(n));

  // Scrollspy: resalta el enlace del nav de la sección visible
  const links = [...document.querySelectorAll('.nav-links a:not(.btn)')];
  const map = {};
  links.forEach((a) => {
    const id = (a.getAttribute('href') || '').replace('#', '');
    if (id) map[id] = a;
  });
  const sections = Object.keys(map)
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('active'));
      const a = map[e.target.id];
      if (a) a.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
})();

/* ==========================================
   Modal — Manual de usuario (sin salir del sitio)
   ========================================== */
(function () {
  const modal = document.getElementById('manualModal');
  const openBtn = document.getElementById('openManual');
  const closeBtn = document.getElementById('closeManual');
  const frame = document.getElementById('manualFrame');
  const loader = document.getElementById('manualLoader');
  if (!modal || !openBtn || !frame) return;

  const SRC = 'manual/manual-de-usuario.html';
  let loaded = false;

  frame.addEventListener('load', () => {
    if (frame.getAttribute('src')) loader && loader.classList.add('hidden');
  });

  function open() {
    if (!loaded) { loaded = true; loader && loader.classList.remove('hidden'); frame.setAttribute('src', SRC); }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  openBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', close);
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
})();

/* ==========================================
   Precios — paquetes (Starter / Pro / Studio) vía Ko-fi
   ========================================== */
(function () {
  const grid = document.getElementById('tiersGrid');
  if (!grid) return;
  const name = (id) => (PANEL_INFO[id] || {}).name || id;

  grid.innerHTML = STORE.tiers.map((t, i) => {
    const prev = STORE.tiers[i - 1];
    const newPanels = prev ? t.panels.filter((p) => prev.panels.indexOf(p) === -1) : t.panels;

    const items = [];
    if (prev) items.push('<li class="tier-inherit">Todo lo de ' + prev.name + '</li>');
    newPanels.forEach((p) => items.push('<li>' + name(p) + '</li>'));
    if (t.allAndUpdates) items.push('<li class="tier-extra">Actualizaciones futuras</li>');

    return '' +
      '<article class="tier-card' + (t.popular ? ' popular' : '') + '">' +
        (t.popular ? '<span class="tier-badge">Más popular</span>' : '') +
        '<h3 class="tier-name">' + t.name + '</h3>' +
        '<p class="tier-tagline">' + t.tagline + '</p>' +
        '<div class="tier-price">' + 
          (t.originalPrice ? '<span class="tier-original-price">' + STORE.currency + t.originalPrice + '</span>' : '') +
          STORE.currency + t.price +
          '<span class="tier-per">/ pago único</span></div>' +
        '<div class="tier-count">' + t.panels.length + ' paneles' + (t.allAndUpdates ? ' · todo' : '') + '</div>' +
        '<a class="btn ' + (t.popular ? 'btn-primary' : 'btn-ghost') + ' tier-buy" href="' +
          storeUrl(t.url) + '" target="_blank" rel="noopener">Comprar ' + t.name + '</a>' +
        '<ul class="tier-list">' + items.join('') + '</ul>' +
      '</article>';
  }).join('');
})();
