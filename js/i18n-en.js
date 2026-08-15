/**
 * SmoothMotion Web — diccionario Español -> English
 * Se carga DESPUÉS de js/i18n.js.
 * La clave es el texto EXACTO en español que aparece en la página.
 */
(function () {
  'use strict';
  if (!window.SM_WEB_I18N) return;

  window.SM_WEB_I18N.register({

    /* ── Navegación ──────────────────────────────────────────────────── */
    'Paneles': 'Panels',
    'Características': 'Features',
    'Sobre mí': 'About',
    'Precios': 'Pricing',
    'Comprar': 'Buy',
    'Descargar': 'Download',
    'Cambiar idioma': 'Change language',

    /* ── Hero ────────────────────────────────────────────────────────── */
    'La única herramienta que necesitas': 'The only tool you need',
    'para': 'for',
    'editar en After Effects.': 'editing in After Effects.',
    'Motion Graphics.': 'Motion Graphics.',
    'SmoothMotion no es un panel — son 15 paneles profesionales que trabajan como uno solo dentro de After Effects. Curvas de ease, animación de texto ilimitada, carruseles 3D, tipografía, composición, FX, color, alineación, guías y más. Todo tu flujo de trabajo, en una sola suite.':
      'SmoothMotion is not one panel — it is 14 professional panels that work as one inside After Effects. Ease curves, text animation, typography, compositing, FX, color, alignment, guides and more. Your whole Motion Graphics workflow, in a single suite.',
    'Comprar para After Effects': 'Buy for After Effects',
    'Ver los 15 paneles ▸': 'See all 15 panels ▸',
    'paneles': 'panels',
    'animaciones de texto': 'text animations',
    'suite unificada': 'unified suite',

    /* ── Barra de compatibilidad ─────────────────────────────────────── */
    'Compatible con': 'Compatible with',
    'Extensión CEP': 'CEP extension',

    /* ── Playground ──────────────────────────────────────────────────── */
    'La familia SmoothMotion': 'The SmoothMotion family',
    'Dieciséis paneles reales, en tu navegador.': 'Fifteen real panels, in your browser.',
    'No son fotos ni vídeos: es la interfaz real de cada panel corriendo en vivo. Elige uno, navégalo, cambia de pestaña y arrastra la curva. Las acciones que tocan After Effects están en modo demo — pero el HUD es 100% auténtico.':
      'These are not screenshots or videos: it is each panel\'s real interface running live. Pick one, browse it, switch tabs and drag the curve. Actions that touch After Effects are in demo mode — but the HUD is 100% authentic.',
    'Cargando panel…': 'Loading panel…',
    '● en vivo': '● live',
    'Ver paquetes': 'See packages',
    'Consejo: en SmoothCurves arrastra los puntos de la curva; en SmoothComp haz clic en las capas; en SmoothGuides cambia entre pestañas.':
      'Tip: in SmoothCurves drag the curve points; in SmoothComp click the layers; in SmoothGuides switch between tabs.',
    'Consejo:': 'Tip:',

    /* ── Descripciones de paneles (playground) ───────────────────────── */
    'Editor de curvas de ease': 'Ease curve editor',
    'El corazón de SmoothMotion. Edita curvas de aceleración en tiempo real y aplícalas a tus keyframes sin salir del panel.':
      'The heart of SmoothMotion. Edit acceleration curves in real time and apply them to your keyframes without leaving the panel.',
    'Modos Ease, Speed, Elastic, Bounce y Custom': 'Ease, Speed, Elastic, Bounce and Custom modes',
    'Aplica como expresión (EXPR) o horneado (KEYS)': 'Apply as expression (EXPR) or baked (KEYS)',
    'Lee, invierte y aleatoriza curvas · bibliotecas de presets':
      'Read, invert and randomize curves · preset libraries',

    'Animador de texto en vivo': 'Live text animator',
    'Diseña animaciones de texto con vista previa en tiempo real y aplícalas a After Effects con expresiones fieles al preview. Anima por caracteres, palabras o líneas, con entrada y salida.':
      'Design text animations with a real-time preview and apply them to After Effects with expressions faithful to the preview. Animate by characters, words or lines, with in and out.',
    'Easings Smooth, Back, Elastic, Bounce y más': 'Smooth, Back, Elastic, Bounce easings and more',
    'Entrada + salida (Exit) con timing y dirección propios':
      'In + out (Exit) with their own timing and direction',
    'Guarda tus presets y cópialos/pégalos entre proyectos':
      'Save your presets and copy/paste them between projects',

    'Herramientas de tipografía': 'Typography tools',
    'Una barra de herramientas tipográficas para trabajar el texto como en un editor profesional.':
      'A typography toolbar to work with text like in a professional editor.',
    'Crear y dividir texto por líneas, palabras o letras': 'Create and split text by lines, words or letters',
    'Resaltar, subrayar, tachar y buscar/reemplazar': 'Highlight, underline, strike through and find/replace',
    'Contador numérico y máquina de escribir': 'Numeric counter and typewriter',

    'Scripts y utilidades': 'Scripts and utilities',
    'Tu caja de herramientas: una biblioteca de scripts personalizable más utilidades rápidas de flujo de trabajo.':
      'Your toolbox: a customizable script library plus quick workflow utilities.',
    'Biblioteca de scripts con categorías y favoritos': 'Script library with categories and favorites',
    'Renombrar capas en lote y limpiar expresiones': 'Batch rename layers and clean expressions',
    'Alinear/distribuir keys y precomponer inteligente': 'Align/distribute keys and smart precompose',

    'Gestor de capas': 'Layer manager',
    'Controla las capas de tu composición con filtros, colores y notas. La demo trae capas de ejemplo para que lo pruebes.':
      'Control your composition layers with filters, colors and notes. The demo includes sample layers so you can try it.',
    'Filtra por tipo: nulls, sólidos, texto, shapes, cámaras…':
      'Filter by type: nulls, solids, text, shapes, cameras…',
    'Colorea por tipo automáticamente': 'Color by type automatically',
    'Marca capas con keys / expresiones y añade notas': 'Flag layers with keys / expressions and add notes',

    'Efectos de movimiento': 'Motion effects',
    'Efectos de movimiento de uso diario, aplicados en un clic sin bucear en menús.':
      'Everyday motion effects, applied in one click without digging through menus.',
    'Camera Shake enlazado a un nulo': 'Camera Shake parented to a null',
    'Wiggle paramétrico': 'Parametric wiggle',
    'Loop (cycle, ping-pong, continue) y fundidos': 'Loop (cycle, ping-pong, continue) and fades',

    'Gestión de color': 'Color management',
    'Trabaja el color de tu proyecto con una paleta personal y acciones rápidas.':
      'Work your project color with a personal palette and quick actions.',
    'Selector con paleta personal guardable': 'Picker with a savable personal palette',
    'Crea sólidos del tamaño de la comp': 'Create solids the size of the comp',
    'Aplica Fill o crea un control de color por expresiones':
      'Apply Fill or create a color control via expressions',

    'Alinear y distribuir': 'Align and distribute',
    'Orden impecable en segundos: alinea y distribuye capas con precisión respecto a comp, área, selección o capa clave.':
      'Flawless order in seconds: align and distribute layers precisely relative to comp, area, selection or key layer.',
    'Seis alineaciones a bordes y centros': 'Six alignments to edges and centers',
    'Distribución horizontal/vertical y por espacios': 'Horizontal/vertical and spacing distribution',
    'Espaciado personalizado en píxeles': 'Custom spacing in pixels',

    'Guías y safe zones': 'Guides and safe zones',
    'Guías, cuadrículas y safe zones profesionales con vista previa de la composición activa.':
      'Professional guides, grids and safe zones with a preview of the active composition.',
    'Cuadrícula, centro, márgenes y safe zones': 'Grid, center, margins and safe zones',
    'Reglas y presets reutilizables': 'Rulers and reusable presets',
    'Importa y exporta tus configuraciones': 'Import and export your setups',

    'Punto de ancla inteligente': 'Smart anchor point',
    'Reposiciona el punto de ancla en 9 posiciones según el contenido o la máscara, sin que la capa se mueva en pantalla.':
      'Reposition the anchor point to 9 positions based on content or mask, without the layer moving on screen.',
    '9 posiciones instantáneas': '9 instant positions',
    'Detección inteligente por contenido/máscara': 'Smart detection by content/mask',
    'La capa no se desplaza al recolocar el ancla': 'The layer does not shift when relocating the anchor',

    'Render y exportación': 'Render and export',
    'Manda tus composiciones a render con tus plantillas y mantén el proyecto limpio.':
      'Send your compositions to render with your templates and keep the project clean.',
    'Añade comps a la cola de render': 'Add comps to the render queue',
    'Plantillas de ajustes y módulos de salida': 'Settings templates and output modules',
    'Limpia footage sin usar para optimizar el proyecto': 'Clean unused footage to optimize the project',

    'Explorador de archivos': 'File explorer',
    'Un explorador de archivos dentro de After Effects: navega tus carpetas, previsualiza medios e importa con doble clic.':
      'A file explorer inside After Effects: browse your folders, preview media and import with a double click.',
    'Miniaturas de imágenes y video · favoritos de carpetas':
      'Image and video thumbnails · folder favorites',
    'Reproductor de audio para escuchar antes de importar':
      'Audio player to listen before importing',
    'Importa al proyecto o directo a la comp · tamaño de cuadrícula ajustable':
      'Import to the project or straight to the comp · adjustable grid size',

    'Traducir capas de texto': 'Translate text layers',
    'Traduce el texto de la capa seleccionada a decenas de idiomas y aplícalo en una copia, ocultando el original.':
      'Translate the selected layer text into dozens of languages and apply it on a copy, hiding the original.',
    'Detección automática de idioma o manual': 'Automatic or manual language detection',
    'Duplica la capa con la traducción y oculta la original':
      'Duplicates the layer with the translation and hides the original',
    'Edita la traducción antes de aplicarla': 'Edit the translation before applying it',

    'Copiar frame / pegar imagen': 'Copy frame / paste image',
    'Copia el fotograma actual al portapapeles del sistema, o pega una imagen del portapapeles como una capa nueva.':
      'Copy the current frame to the system clipboard, or paste an image from the clipboard as a new layer.',
    'Copia el frame de la comp al portapapeles': 'Copy the comp frame to the clipboard',
    'Pega imágenes del portapapeles como capa': 'Paste clipboard images as a layer',
    'Panel adaptable a cualquier zona de After Effects':
      'Panel that adapts to any area of After Effects',

    /* ── Características ─────────────────────────────────────────────── */
    'Por qué SmoothMotion': 'Why SmoothMotion',
    'Pensado para animar más rápido': 'Built to animate faster',
    'Todo en un panel': 'Everything in one panel',
    'Los 15 paneles conviven en una sola ventana con pestañas, o se acoplan por separado donde quieras dentro de After Effects. Tu espacio de trabajo, tus reglas.':
      'All 14 panels live in a single tabbed window, or dock separately wherever you want inside After Effects. Your workspace, your rules.',
    'Activa la sincronización en vivo y cada ajuste de la curva se aplica automáticamente a los keyframes seleccionados. Sin clics extra.':
      'Turn on live sync and every curve tweak is automatically applied to the selected keyframes. No extra clicks.',
    'EXPR o KEYS, tú eliges': 'EXPR or KEYS, you choose',
    'Aplica curvas como expresión editable y ligera, o "hornéalas" como keyframes puros sin expresiones. Compatible con cualquier pipeline.':
      'Apply curves as a lightweight editable expression, or "bake" them as pure keyframes with no expressions. Compatible with any pipeline.',
    'Bibliotecas de presets': 'Preset libraries',
    'Guarda tus curvas y scripts favoritos, organízalos en bibliotecas e impórtalos o expórtalos para compartir con todo tu equipo.':
      'Save your favorite curves and scripts, organize them into libraries and import or export them to share with your whole team.',
    'Interfaz nativa': 'Native interface',
    'Diseñado con el lenguaje visual de After Effects: oscuro, compacto y sin distracciones. Se siente parte del programa desde el primer día.':
      'Designed with the After Effects visual language: dark, compact and distraction-free. It feels part of the app from day one.',
    'En español': 'In your language',
    'Toda la interfaz, tooltips y descripciones están pensadas en español, con soporte multi-idioma. Nada de adivinar qué hace cada botón.':
      'The whole interface, tooltips and descriptions are available in Spanish and English. No more guessing what each button does.',

    /* ── About ───────────────────────────────────────────────────────── */
    'Quién está detrás': 'Who is behind it',
    'Hola, soy': 'Hi, I\'m',
    'Soy editor de vídeo con 6 años de experiencia y me especializo en After Effects. Llevo mucho tiempo trabajando en esta herramienta para facilitarle la vida a editores como yo.':
      'I\'m a video editor with 6 years of experience and I specialize in After Effects. I\'ve been working on this tool for a long time to make life easier for editors like me.',
    '6 años de experiencia': '6 years of experience',
    'SmoothMotion nace de mi propio flujo de trabajo: cada panel resuelve algo que me hacía perder tiempo en el día a día.':
      'SmoothMotion was born from my own workflow: every panel solves something that used to waste my time day after day.',
    'Ver mis redes ↗': 'See my socials ↗',

    /* ── Precios ─────────────────────────────────────────────────────── */
    'Llévate un panel o toda la familia': 'Take one panel or the whole family',
    'Compra solo lo que necesitas, o ahorra con la suite completa. Pago único vía Ko-fi; tu key se reclama en el Discord.':
      'Buy only what you need, or save with the complete suite. One-time payment via Ko-fi; you claim your key on Discord.',
    'Todos los paquetes son acumulativos · pago único vía Ko-fi · tu key se reclama en el Discord. ¿Empezaste con uno y quieres subir? Paga solo la diferencia.':
      'All packages are cumulative · one-time payment via Ko-fi · you claim your key on Discord. Started with one and want to upgrade? Pay only the difference.',
    'Lo esencial para empezar a animar': 'The essentials to start animating',
    'El flujo completo del motion designer': 'The complete motion designer workflow',
    'Todo SmoothMotion, con actualizaciones futuras': 'All of SmoothMotion, with future updates',
    'Más popular': 'Most popular',
    '/ pago único': '/ one-time',
    'Actualizaciones futuras': 'Future updates',
    'Comprar Starter': 'Buy Starter',
    'Comprar Pro': 'Buy Pro',
    'Comprar Studio': 'Buy Studio',
    'Todo lo de Starter': 'Everything in Starter',
    'Todo lo de Pro': 'Everything in Pro',
    '3 paneles': '3 panels',
    '7 paneles': '7 panels',
    '15 paneles': '15 panels',
    '15 paneles · todo': '15 panels · everything',
    'Desde $30': 'From $30',
    'Desde $50': 'From $50',
    'Desde $70': 'From $70',
    'Incluido en el paquete Starter': 'Included in the Starter package',
    'Incluido en el paquete Pro': 'Included in the Pro package',
    'Incluido en el paquete Studio': 'Included in the Studio package',

    /* ── CTA / Footer / Manual ───────────────────────────────────────── */
    'Empieza a animar con': 'Start animating with',
    'Elige tu panel o la familia completa. Tras la compra en Ko-fi, reclamas tu key en el Discord, la pegas en el panel y a animar — instalación en menos de un minuto.':
      'Choose your panel or the full family. After buying on Ko-fi, you claim your key on Discord, paste it into the panel and start animating — installed in under a minute.',
    'Ver precios y comprar': 'See pricing and buy',
    'Ver manual de usuario': 'View user manual',
    'La única herramienta que necesitas para editar en Adobe After Effects.':
      'The all-in-one Motion Graphics suite for Adobe After Effects.',
    '© 2026 SmoothMotion. Todos los derechos reservados.':
      '© 2026 SmoothMotion. All rights reserved.',
    'Manual de usuario': 'User manual',
    '· Manual de usuario': '· User manual',
    'Abrir aparte ↗': 'Open separately ↗',
    'Cerrar': 'Close',
    'Abrir en pestaña nueva': 'Open in a new tab',
    'Abrir menú': 'Open menu',

    /* ── Meta (SEO) ──────────────────────────────────────────────────── */
    'SmoothMotion — La suite todo-en-uno para Motion Graphics en After Effects':
      'SmoothMotion — The all-in-one Motion Graphics suite for After Effects',
    'SmoothMotion v6: 15 paneles profesionales para After Effects. La única herramienta que necesitas para editar: curvas de ease, texto ilimitado, carruseles 3D, tipografía, composición, FX, color, alineación, guías y export.':
      'SmoothMotion v6: 15 professional panels for After Effects. The only tool you need to edit: ease curves, unlimited text, 3D carousels, typography, compositing, FX, color, alignment, guides and export.',
    'SmoothMotion v5: 14 paneles profesionales para After Effects. Curvas de ease, texto, tipografía, composición, FX, color, alineación, guías, anchor point y export.':
      'SmoothMotion v5: 14 professional panels for After Effects. Ease curves, text, typography, compositing, FX, color, alignment, guides, anchor point and export.',
    '15 paneles profesionales. Todo tu flujo de edición y Motion Graphics en una sola suite.':
      '14 professional panels. The perfect family for Motion Graphics in After Effects.',

    /* --- v6: Smooth3D y textos nuevos --- */
    'Nuevo · Smooth3D — carruseles 3D en un clic': 'New · Smooth3D — 3D carousels in one click',
    'La única herramienta que necesitas para editar en After Effects': 'The only tool you need to edit in After Effects',
    'SmoothMotion — La única herramienta que necesitas para editar en After Effects': 'SmoothMotion — The only tool you need to edit in After Effects',
    'SmoothMotion v6 — La única herramienta que necesitas para editar en After Effects': 'SmoothMotion v6 — The only tool you need to edit in After Effects',
    'Carruseles y orbes 3D animados': 'Animated 3D carousels and orbs',
    'Todo SmoothMotion + cada panel nuevo que saquemos': 'All of SmoothMotion + every new panel we release',
    'Genera composiciones 3D animadas en un clic: carruseles, orbes, slides y muros de tarjetas, con vista previa en vivo y todo controlable despues desde un nulo.': 'Generate animated 3D compositions in one click: carousels, orbs, slides and card walls, with a live preview and everything still controllable from a null afterwards.',
    '11 distribuciones: circulo, slide, helice, esfera, muro, tunel y mas': '11 layouts: circle, slide, helix, sphere, wall, tunnel and more',
    'Un nulo con deslizadores: centra el slot que quieras, radio, giro y camara': 'A null with sliders: center any slot, radius, spin and camera',
    'Auto-rellena los slots con una carpeta de imagenes o videos': 'Auto-fill the slots from a folder of images or videos',
    'Armate tus propias transiciones': 'Build your own transitions',

    /* ── Feedback de la comunidad ── */
    'Comunidad':
      'Community',
    'Feedback de la comunidad':
      'Community feedback',
    'Lo que nos escriben en el Discord, sin retocar ni una coma.':
      'What people write to us on Discord, without changing a single word.',
    'Traducido del español':
      'Translated from Spanish',
    'La verdad me sorprendió bastante lo completo que es SmoothMotion. Pensaba que sería el típico plugin que terminas usando para dos o tres cosas, pero tiene un montón de herramientas que realmente uso a diario con After. Lo recomiendo porque tiene Curvas, animaciones de texto, efectos, herramientas para organizar capas, color, alineación, transiciones, etc. Son cosas que normalmente tendría repartidas entre varios scripts o plugins.':
      'Honestly, how complete SmoothMotion is really surprised me. I thought it would be the typical plugin you end up using for two or three things, but it has a ton of tools I actually use daily with After. I recommend it because it has Curves, text animations, effects, tools to organise layers, colour, alignment, transitions, etc. Things I would normally have scattered across several scripts or plugins.',
    'El apartado de smooth text y smooth typo son mis favoritas y a mi opinión las mas rotas de todos los paneles. Curves es muy intuitivo el uso de dicho panel. Smooth tools tiene muchos apartados muy útiles. El nuevo smooth 3d sin duda fue un buen movimiento de parte del creador, me ahorró el tema de realizarlo manual ya que la mayoría de tutos que buscaba no eran muy eficientes. Sin duda alguna de los mejores plugins para after.':
      'SmoothText and SmoothTypo are my favourites and in my opinion the most insane of all the panels. Curves is really intuitive to use. SmoothTools has a lot of very useful sections. The new Smooth3D was definitely a good move by the creator, it saved me doing it by hand since most of the tutorials I found were not very efficient. Without a doubt one of the best plugins for After.',
    'Smoothmotion lo vi como una opcion muy viable y amigable a la mayoria de problemas que presentaba dia a dia editando. Confie en este gran proyecto y con cada actualizacion me sorprendo mas y admiro la dedicacion de BlackBull. Es un producto muy completo que reemplazo todos mis plugins pagando solo por uno. Ademas de la comunidad que se esta formando':
      'I saw SmoothMotion as a very workable and friendly answer to most of the problems I ran into editing day to day. I trusted this project and with every update I am more surprised, and I admire BlackBull\'s dedication. It is a very complete product that replaced all my plugins while paying for just one. Plus the community that is forming around it.',
    'SmoothMotion a pesar de su gran cantidad de funciones, al menos una ves en la vida tendrás que usar TODAS las funciones que ofrece por que está diseñado para cualquier tipo de situación no importa que tan complejo sea, y constantemente sacan updates mejores que las anteriores':
      'Despite how many features SmoothMotion has, at least once in your life you will end up using ALL of them, because it is designed for any kind of situation no matter how complex, and the updates that keep coming out are better than the last ones.',
    'El plugin es muy bueno, ahorra tiempo, es util, consolida muchas funciones en un solo plugin, una oferta y plugin realmente util y tentador, lo recomiendo. Hay detallitos como que se enfocan mucho en agregar funciones, cuando hay cosas por estabilizar o testear mas rigurosamente, pero eso con el tiempo y entre mas gente lo compre, se iran descubriendo y arreglando.':
      'The plugin is very good, it saves time, it is useful, it brings a lot of features together into a single plugin — a genuinely useful and tempting deal, I recommend it. There are little things, like a lot of focus on adding features when there are things to stabilise or test more thoroughly, but with time and as more people buy it, those will get found and fixed.',
    'la verdad lo recomiendo para hacer lyrics  o cosas en 3d con animaciones y aprendes a como usar cada a partado es super intuitivo,  y gracias al plugin puedo tener 5 novias 😄':
      'honestly I recommend it for doing lyrics or 3d stuff with animations, and you learn how to use every section, it is super intuitive, and thanks to the plugin I can have 5 girlfriends 😄',
    '20% EXTRA de descuento': '20% EXTRA off',
    '20% EXTRA de descuento gracias a': '20% EXTRA off thanks to',
    'en los tres paquetes, encima del precio ya rebajado': 'on all three packages, on top of the already reduced price',
    'Precio normal': 'Regular price',
    'Elegis dos clips y el panel monta la transicion en el corte. No es un pack cerrado: apilas los modulos que quieras y guardas tu combinacion como preset propio.': "Pick two clips and the panel builds the transition right at the cut. It's not a closed pack: stack whichever modules you want and save your combo as your own preset.",
    '11 modulos apilables: deslizar, zoom, giro, glitch, barrido, destello y mas': '11 stackable modules: slide, zoom, spin, glitch, wipe, flash and more',
    'Editor de curva de velocidad, como un mini SmoothCurves': 'A speed-curve editor, like a mini SmoothCurves',
    'Queda todo vivo: un nulo con deslizadores para retocarla despues': 'It stays editable: a null with sliders to tweak it afterwards',
    'Nuevo · SmoothTransition — armate tus propias transiciones': 'New · SmoothTransition — build your own transitions',
  });
})();
