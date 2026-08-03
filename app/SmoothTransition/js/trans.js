/* ============================================================================
   SmoothTransition — modelo de la transicion (UNICA fuente de verdad)
   ----------------------------------------------------------------------------
   Igual que en Smooth3D: la matematica vive aca una sola vez y la usan LOS DOS
   lados — el preview del panel y el generador de AE. El preview la ejecuta en
   JavaScript; el generador la traduce a expresiones que hacen exactamente lo
   mismo. Si algo cambia aca, cambia en los dos sitios a la vez.

   MODELO DE TIEMPO
   La transicion ocupa una ventana de `duracion` segundos centrada en el CORTE.
   El progreso p va de 0 a 1 en toda la ventana, y el corte cae en p = 0.5:

        p=0            p=0.5           p=1
         |--------------|--------------|
         |   sale  A    |   entra  B   |
                     CORTE

   Por eso NO hace falta que los clips se solapen: A hace su salida en sus
   ultimos fotogramas y B su entrada en los primeros. El montaje del usuario no
   se toca. (Con `overlap` los clips se estiran para cruzarse de verdad, que es
   lo que necesitan el fundido y algunos barridos.)
   ========================================================================== */

var SmoothTransition_Core = (function () {
    "use strict";

    /* ── Curva: un bezier cubico, igual que el editor de graficos de AE ───── */
    /* Antes eran siete formulas con nombre. Ahora es UNA curva continua que el
       usuario mueve con dos tiradores — el mini SmoothCurves del panel. Y no es
       solo cosmetico: esta misma curva se aplica como VELOCIDAD de los
       fotogramas de "Progreso" en AE, asi que la curva del panel y la de la
       composicion son literalmente la misma, y se puede retocar despues en el
       editor de graficos sin que nada se desincronice. */

    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    function bezX(u, x1, x2) { var v = 1 - u; return 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u; }
    function bezY(u, y1, y2) { var v = 1 - u; return 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u; }
    function bezDX(u, x1, x2) {
        var v = 1 - u;
        return 3 * v * v * x1 + 6 * v * u * (x2 - x1) + 3 * u * u * (1 - x2);
    }

    /** y de la curva para una x dada. Newton-Raphson: 8 vueltas bastan de
        sobra para el error que se puede ver en pantalla. */
    function ease(c, t) {
        t = clamp01(t);
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        var u = t, i, x, d;
        for (i = 0; i < 8; i++) {
            x = bezX(u, c[0], c[2]) - t;
            if (Math.abs(x) < 1e-6) break;
            d = bezDX(u, c[0], c[2]);
            if (Math.abs(d) < 1e-6) break;
            u -= x / d;
        }
        return bezY(u, c[1], c[3]);
    }

    /* Curvas de partida. La de por defecto es la de un movimiento que arranca
       decidido y frena largo: es la que hace que una transicion se sienta
       "smooth" en vez de mecanica. */
    var CURVAS = [
        { id: 'smooth', es: 'Smooth',     en: 'Smooth',     c: [0.22, 1, 0.36, 1] },
        { id: 'snap',   es: 'Golpe seco', en: 'Snap',       c: [0.16, 1, 0.3, 1] },
        { id: 'suave',  es: 'Suave',      en: 'Gentle',     c: [0.45, 0, 0.55, 1] },
        { id: 'inout',  es: 'Simetrica',  en: 'Symmetric',  c: [0.65, 0, 0.35, 1] },
        { id: 'back',   es: 'Con rebote', en: 'Overshoot',  c: [0.5, -0.4, 0.3, 1.4] },
        { id: 'lineal', es: 'Lineal',     en: 'Linear',     c: [0.33, 0.33, 0.67, 0.67] }
    ];

    /* Campana centrada en el corte: 0 en los extremos, 1 en p=0.5. `sharp`
       sube el pico (1 = suave, 3 = golpe seco). La usan los modulos que son un
       GOLPE y no un desplazamiento: glitch, flash, shake, desenfoque. */
    function bell(p, sharp) {
        var b = Math.sin(clamp01(p) * Math.PI);
        return Math.pow(b, sharp || 1);
    }

    /* Ruido determinista: mismo valor para el mismo t en el preview y en AE
       (AE tiene random() pero cambia en cada evaluacion; esto no). */
    function noise(t, semilla) {
        var x = Math.sin(t * 127.1 + (semilla || 0) * 311.7) * 43758.5453;
        return (x - Math.floor(x)) * 2 - 1;      // -1 .. 1
    }

    /* ── Direcciones ─────────────────────────────────────────────────────── */
    var DIRS = {
        left:  [-1,  0],
        right: [ 1,  0],
        up:    [ 0, -1],
        down:  [ 0,  1]
    };

    /* ── Estado por defecto ──────────────────────────────────────────────── */
    /* Cada modulo es independiente y se apila con los demas: esa es la gracia
       del panel. Los presets no son mas que combinaciones guardadas de esto. */
    var DEFAULTS = {
        duracion: 0.5,
        curva: [0.22, 1, 0.36, 1],      // los 4 numeros del bezier
        overlap: false,

        // Movimiento
        slideOn: true,  slideDir: 'left', slideAmt: 100,   // % del cuadro
        zoomOn:  false, zoomDir: 'in',    zoomAmt: 40,     // % extra de escala
        spinOn:  false, spinAmt: 25,                       // grados

        // Distorsion
        glitchOn: false, glitchAmt: 60,
        dblurOn:  true,  dblurAmt: 70,                     // desenfoque direccional
        shakeOn:  false, shakeAmt: 40,
        blurOn:   false, blurAmt: 50,

        // Corte
        wipeOn: false, wipeTipo: 'linear', wipeAng: 90,    // linear|radial|iris|luma

        // Color
        flashOn: false, flashColor: 'white', flashAmt: 70,
        expoOn:  false, expoAmt: 50,
        desatOn: false, desatAmt: 60
    };

    /* Orden y metadatos de los modulos: los usa la UI para pintarse sola y el
       generador para saber que crear. */
    var MODULOS = [
        { grupo: 'mov',  id: 'slide',  on: 'slideOn',  amt: 'slideAmt',  es: 'Deslizar',    en: 'Slide' },
        { grupo: 'mov',  id: 'zoom',   on: 'zoomOn',   amt: 'zoomAmt',   es: 'Zoom',        en: 'Zoom' },
        { grupo: 'mov',  id: 'spin',   on: 'spinOn',   amt: 'spinAmt',   es: 'Giro',        en: 'Spin' },
        { grupo: 'dist', id: 'glitch', on: 'glitchOn', amt: 'glitchAmt', es: 'Glitch',      en: 'Glitch' },
        { grupo: 'dist', id: 'dblur',  on: 'dblurOn',  amt: 'dblurAmt',  es: 'Motion blur', en: 'Motion blur' },
        { grupo: 'dist', id: 'shake',  on: 'shakeOn',  amt: 'shakeAmt',  es: 'Sacudida',    en: 'Shake' },
        { grupo: 'dist', id: 'blur',   on: 'blurOn',   amt: 'blurAmt',   es: 'Desenfoque',  en: 'Blur' },
        { grupo: 'cut',  id: 'wipe',   on: 'wipeOn',   amt: null,        es: 'Barrido',     en: 'Wipe' },
        { grupo: 'col',  id: 'flash',  on: 'flashOn',  amt: 'flashAmt',  es: 'Destello',    en: 'Flash' },
        { grupo: 'col',  id: 'expo',   on: 'expoOn',   amt: 'expoAmt',   es: 'Exposicion',  en: 'Exposure' },
        { grupo: 'col',  id: 'desat',  on: 'desatOn',  amt: 'desatAmt',  es: 'Desaturar',   en: 'Desaturate' }
    ];

    var GRUPOS = [
        { id: 'mov',  es: 'Movimiento', en: 'Movement' },
        { id: 'dist', es: 'Distorsion', en: 'Distortion' },
        { id: 'cut',  es: 'Corte',      en: 'Cut' },
        { id: 'col',  es: 'Color',      en: 'Color' }
    ];

    /* ── Muestreo ────────────────────────────────────────────────────────── */
    /**
     * Estado visual completo en el progreso p (0..1).
     *
     *   a  = clip SALIENTE  ·  b = clip ENTRANTE
     *        x,y en fraccion del cuadro (1 = un ancho entero)
     *        escala 1 = tamaño original · rot en grados · op 0..1 · blur en px
     *   fx = lo que va en la capa de encima (golpes centrados en el corte)
     *
     * Nota sobre continuidad: si A sale hacia la izquierda, B entra DESDE la
     * derecha. Asi el ojo lee un unico movimiento que atraviesa el corte, que
     * es lo que hace que una transicion se sienta bien y no como dos animaciones
     * pegadas.
     */
    function sample(st, p) {
        st = fill(st);
        p = clamp01(p);

        var ta = ease(st.curva, p / 0.5);              // salida de A
        var tb = ease(st.curva, (1 - p) / 0.5);        // entrada de B (espejo)

        var a = { x: 0, y: 0, esc: 1, rot: 0, op: 1, blur: 0 };
        var b = { x: 0, y: 0, esc: 1, rot: 0, op: 1, blur: 0 };

        if (st.slideOn) {
            var d = DIRS[st.slideDir] || DIRS.left;
            var amt = st.slideAmt / 100;
            a.x += d[0] * amt * ta;   a.y += d[1] * amt * ta;
            b.x -= d[0] * amt * tb;   b.y -= d[1] * amt * tb;
        }

        if (st.zoomOn) {
            var z = st.zoomAmt / 100 * (st.zoomDir === 'out' ? -1 : 1);
            a.esc *= 1 + z * ta;
            b.esc *= 1 + z * tb;
        }

        if (st.spinOn) {
            a.rot += st.spinAmt * ta;
            b.rot -= st.spinAmt * tb;
        }

        // BARRIDO Y FUNDIDO trabajan SOLAPADOS y sobre la ventana COMPLETA:
        // los dos clips se ven a la vez, A encima, y lo que se anima es como A
        // desaparece dejando ver B. Antes cada uno hacia media transicion por
        // su lado y nunca habia un instante con los dos en pantalla — o sea que
        // no habia nada que revelar, y por eso no se veia transicion ninguna.
        if (st.wipeOn) {
            var tw = ease(st.curva, p);
            // El fundido NO recorta: solo baja la opacidad. Si ademas se le
            // pusiera `wipe`, se le sumaria un barrido lineal encima.
            if (st.wipeTipo === 'luma') a.op = 1 - tw;
            else a.wipe = tw;                     // 0 = entero, 1 = barrido del todo
        }

        var fx = {
            glitch: st.glitchOn ? st.glitchAmt / 100 * bell(p, 2) : 0,
            dblur:  st.dblurOn  ? st.dblurAmt  / 100 * bell(p, 1) : 0,
            blur:   st.blurOn   ? st.blurAmt   / 100 * bell(p, 1) : 0,
            flash:  st.flashOn  ? st.flashAmt  / 100 * bell(p, 3) : 0,
            expo:   st.expoOn   ? st.expoAmt   / 100 * bell(p, 2) : 0,
            desat:  st.desatOn  ? st.desatAmt  / 100 * bell(p, 1) : 0,
            flashColor: st.flashColor,
            shake: [0, 0]
        };

        // La sacudida mueve LOS DOS clips lo mismo: eso se lee como la camara
        // temblando. Va en la posicion de cada clip (no en una capa aparte)
        // para que el generador pueda hacer exactamente esto mismo.
        if (st.shakeOn) {
            var s = st.shakeAmt / 100 * bell(p, 2) * 0.06;   // fraccion del cuadro
            fx.shake = [noise(p * 40, 1) * s, noise(p * 40, 2) * s];
            a.x += fx.shake[0];  a.y += fx.shake[1];
            b.x += fx.shake[0];  b.y += fx.shake[1];
        }

        // El desenfoque direccional apunta hacia donde va el movimiento.
        fx.dblurAng = 0;
        if (st.slideOn) {
            var dd = DIRS[st.slideDir] || DIRS.left;
            fx.dblurAng = Math.round(Math.atan2(dd[0], -dd[1]) * 180 / Math.PI);
        }

        return { a: a, b: b, fx: fx, p: p };
    }

    /** Completa el estado con los valores por defecto que falten. */
    function fill(st) {
        var o = {}, k;
        for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) o[k] = DEFAULTS[k];
        if (st) for (k in st) if (st.hasOwnProperty(k) && st[k] !== undefined) o[k] = st[k];
        return o;
    }

    /** Resumen legible de los modulos activos (para las tarjetas de preset). */
    function resumen(st, en) {
        st = fill(st);
        var partes = [];
        for (var i = 0; i < MODULOS.length; i++) {
            var m = MODULOS[i];
            if (st[m.on]) partes.push(en ? m.en : m.es);
        }
        if (!partes.length) return en ? 'Straight cut' : 'Corte seco';
        return partes.join(' · ');
    }

    return {
        DEFAULTS: DEFAULTS,
        MODULOS: MODULOS,
        GRUPOS: GRUPOS,
        DIRS: DIRS,
        CURVAS: CURVAS,
        ease: ease,
        sample: sample,
        fill: fill,
        bell: bell,
        noise: noise,
        clamp01: clamp01,
        resumen: resumen
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SmoothTransition_Core;
