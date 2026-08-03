/* ============================================================================
   SmoothTransition — logica del panel
   La UI de modulos se pinta sola desde SmoothTransition_Core.MODULOS: agregar un
   modulo nuevo es tocar el modelo, no el HTML.
   ========================================================================== */

(function (global) {
    "use strict";

    var C = SmoothTransition_Core;
    var cs = null;
    try { cs = new CSInterface(); } catch (e) { cs = null; }
    var isEN = function () { try { return global.SM_I18N && SM_I18N.getLang() === 'en'; } catch (e) { return false; } };
    var T = function (es, en) { return isEN() ? en : es; };

    var state = C.fill({});
    var vista = null;
    var LS_KEY = 'smoothtrans.presets';

    function $(id) { return document.getElementById(id); }

    /* ── Presets de fabrica: combinaciones, que es de lo que va el panel ──── */
    var FABRICA = [
        { n: 'Whip pan',   en: 'Whip pan',    s: { slideOn: true, slideDir: 'left', slideAmt: 100, dblurOn: true, dblurAmt: 90, curva: [0.16, 1, 0.3, 1], duracion: 0.35 } },
        { n: 'Zoom punch', en: 'Zoom punch',  s: { slideOn: false, zoomOn: true, zoomDir: 'in', zoomAmt: 65, dblurOn: true, dblurAmt: 55, curva: [0.16, 1, 0.3, 1], duracion: 0.4 } },
        { n: 'Glitch',     en: 'Glitch',      s: { slideOn: true, slideAmt: 22, glitchOn: true, glitchAmt: 80, desatOn: true, desatAmt: 50, dblurOn: false, curva: [0.22, 1, 0.36, 1], duracion: 0.32 } },
        { n: 'Destello',   en: 'Flash',       s: { slideOn: false, zoomOn: true, zoomDir: 'in', zoomAmt: 22, flashOn: true, flashAmt: 85, dblurOn: false, curva: [0.45, 0, 0.55, 1], duracion: 0.3 } },
        { n: 'Barrido',    en: 'Wipe',        s: { slideOn: false, dblurOn: false, wipeOn: true, wipeTipo: 'linear', wipeAng: 90, curva: [0.45, 0, 0.55, 1], duracion: 0.55 } },
        { n: 'Iris',       en: 'Iris',        s: { slideOn: false, dblurOn: false, wipeOn: true, wipeTipo: 'iris', curva: [0.45, 0, 0.55, 1], duracion: 0.6 } },
        { n: 'Fundido',    en: 'Dissolve',    s: { slideOn: false, dblurOn: false, wipeOn: true, wipeTipo: 'luma', curva: [0.37, 0, 0.63, 1], duracion: 0.7, overlap: true } },
        { n: 'Sacudida',   en: 'Shake',       s: { slideOn: false, shakeOn: true, shakeAmt: 70, blurOn: true, blurAmt: 40, dblurOn: false, curva: [0.45, 0, 0.55, 1], duracion: 0.35 } },
        { n: 'Giro',       en: 'Spin',        s: { slideOn: false, spinOn: true, spinAmt: 40, zoomOn: true, zoomDir: 'out', zoomAmt: 35, dblurOn: true, dblurAmt: 60, curva: [0.16, 1, 0.3, 1], duracion: 0.45 } },
        { n: 'Caída',      en: 'Drop',        s: { slideOn: true, slideDir: 'down', slideAmt: 90, dblurOn: true, dblurAmt: 70, curva: [0.5, -0.4, 0.3, 1.4], duracion: 0.5 } }
    ];

    /* ── Opciones extra de cada modulo ───────────────────────────────────── */
    var EXTRAS = {
        slide: [{ tipo: 'seg', k: 'slideDir', ops: [
            { v: 'left', es: '←', en: '←' }, { v: 'right', es: '→', en: '→' },
            { v: 'up', es: '↑', en: '↑' }, { v: 'down', es: '↓', en: '↓' }] }],
        zoom: [{ tipo: 'seg', k: 'zoomDir', ops: [
            { v: 'in', es: 'Acercar', en: 'In' }, { v: 'out', es: 'Alejar', en: 'Out' }] }],
        wipe: [
            { tipo: 'seg', k: 'wipeTipo', ops: [
                { v: 'linear', es: 'Lineal', en: 'Linear' }, { v: 'radial', es: 'Radial', en: 'Radial' },
                { v: 'iris', es: 'Iris', en: 'Iris' }, { v: 'luma', es: 'Fundido', en: 'Dissolve' }] },
            { tipo: 'rango', k: 'wipeAng', min: 0, max: 360, paso: 5, es: 'Ángulo', en: 'Angle', u: '°',
              soloSi: function () { return state.wipeTipo === 'linear'; } }
        ],
        flash: [{ tipo: 'seg', k: 'flashColor', ops: [
            { v: 'white', es: 'Blanco', en: 'White' }, { v: 'black', es: 'Negro', en: 'Black' }] }]
    };

    /* ── Pintar los modulos ──────────────────────────────────────────────── */
    function pintarModulos() {
        var cont = $('st-modulos');
        cont.innerHTML = '';
        for (var g = 0; g < C.GRUPOS.length; g++) {
            var gr = C.GRUPOS[g];
            var card = document.createElement('section');
            card.className = 'st-card';
            var h = document.createElement('h3');
            h.className = 'st-h';
            h.textContent = isEN() ? gr.en : gr.es;
            h.setAttribute('data-no-i18n', '');
            card.appendChild(h);

            for (var i = 0; i < C.MODULOS.length; i++) {
                if (C.MODULOS[i].grupo !== gr.id) continue;
                card.appendChild(filaModulo(C.MODULOS[i]));
            }
            cont.appendChild(card);
        }
    }

    function filaModulo(m) {
        var box = document.createElement('div');
        box.className = 'st-mod ' + (state[m.on] ? 'on' : 'off');

        var head = document.createElement('div');
        head.className = 'st-mod-head';

        var sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'st-sw' + (state[m.on] ? ' on' : '');
        sw.addEventListener('click', function () {
            state[m.on] = !state[m.on];
            box.className = 'st-mod ' + (state[m.on] ? 'on' : 'off');
            sw.className = 'st-sw' + (state[m.on] ? ' on' : '');
            cambio();
        });

        var nm = document.createElement('span');
        nm.className = 'st-mod-name';
        nm.textContent = isEN() ? m.en : m.es;
        nm.setAttribute('data-no-i18n', '');

        head.appendChild(sw); head.appendChild(nm);

        // La intensidad va en la cabecera, que es lo que mas se toca.
        if (m.amt) head.appendChild(rango(m.amt, 0, 100, 1, '%'));
        box.appendChild(head);

        var ex = EXTRAS[m.id];
        if (ex) {
            var extra = document.createElement('div');
            extra.className = 'st-mod-extra';
            for (var i = 0; i < ex.length; i++) extra.appendChild(control(ex[i]));
            box.appendChild(extra);
        }
        return box;
    }

    function control(cfg) {
        if (cfg.tipo === 'seg') {
            var seg = document.createElement('div');
            seg.className = 'st-seg';
            cfg.ops.forEach(function (op) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = isEN() ? op.en : op.es;
                b.setAttribute('data-no-i18n', '');
                b.className = (state[cfg.k] === op.v) ? 'on' : '';
                b.addEventListener('click', function () {
                    state[cfg.k] = op.v;
                    [].forEach.call(seg.children, function (x) { x.className = ''; });
                    b.className = 'on';
                    cambio(true);
                });
                seg.appendChild(b);
            });
            return seg;
        }
        var fila = document.createElement('div');
        fila.className = 'st-row';
        var lb = document.createElement('label');
        lb.className = 'st-lb';
        lb.textContent = isEN() ? cfg.en : cfg.es;
        lb.setAttribute('data-no-i18n', '');
        fila.appendChild(lb);
        fila.appendChild(rango(cfg.k, cfg.min, cfg.max, cfg.paso, cfg.u));
        return fila;
    }

    function rango(k, min, max, paso, unidad) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:7px;';
        var r = document.createElement('input');
        r.type = 'range'; r.min = min; r.max = max; r.step = paso || 1;
        r.value = state[k];
        var v = document.createElement('span');
        v.style.cssText = 'flex:0 0 34px;text-align:right;font-size:10px;color:var(--ec-text-muted,#566379);';
        v.textContent = state[k] + (unidad || '');
        r.addEventListener('input', function () {
            state[k] = parseFloat(r.value);
            v.textContent = state[k] + (unidad || '');
            cambio();
        });
        wrap.appendChild(r); wrap.appendChild(v);
        return wrap;
    }

    /* ── Presets ─────────────────────────────────────────────────────────── */
    function leerUser() {
        try { var v = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); return v instanceof Array ? v : []; }
        catch (e) { return []; }
    }
    function guardarUser(l) { try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch (e) {} }

    function pintarPresets() {
        var fab = $('st-presets-fab'); fab.innerHTML = '';
        FABRICA.forEach(function (p) { fab.appendChild(tarjeta(isEN() ? p.en : p.n, p.s, false)); });

        var us = $('st-presets-user'); us.innerHTML = '';
        var lista = leerUser();
        lista.forEach(function (p) { us.appendChild(tarjeta(p.name, p.s, true)); });
        $('st-user-empty').className = 'st-empty' + (lista.length ? ' hide' : '');
    }

    function tarjeta(nombre, ajustes, esUser) {
        var full = C.fill(ajustes);
        var card = document.createElement('div');
        card.className = 'st-preset';

        var cv = document.createElement('canvas');
        card.appendChild(cv);

        var n = document.createElement('div');
        n.className = 'st-preset-n'; n.textContent = nombre;
        n.setAttribute('data-no-i18n', '');
        var d = document.createElement('div');
        d.className = 'st-preset-d'; d.textContent = C.resumen(full, isEN());
        d.setAttribute('data-no-i18n', '');
        card.appendChild(n); card.appendChild(d);

        // El mini-preview corre solo al pasar por encima: con diez tarjetas
        // animando a la vez el panel se arrastra.
        var mini = SmoothTransition_Preview.crear(cv, function () { return full; });
        setTimeout(function () { mini.progreso(0.42); }, 0);
        card.addEventListener('mouseenter', function () { mini.reiniciar(); mini.play(true); mini.arrancar(); });
        card.addEventListener('mouseleave', function () { mini.parar(); mini.progreso(0.42); });

        card.addEventListener('click', function () {
            var k;
            for (k in C.DEFAULTS) if (C.DEFAULTS.hasOwnProperty(k)) state[k] = (full[k] instanceof Array) ? full[k].slice() : full[k];
            pintarModulos(); sincronizarTiempo(); cambio(true);
            toast(T('Preset aplicado: ', 'Preset applied: ') + nombre);
        });

        if (esUser) {
            var x = document.createElement('button');
            x.type = 'button'; x.className = 'st-preset-x'; x.textContent = '×';
            x.title = T('Borrar', 'Delete');
            x.addEventListener('click', function (ev) {
                ev.stopPropagation();
                guardarUser(leerUser().filter(function (p) { return p.name !== nombre; }));
                pintarPresets();
                toast(T('Borrado', 'Deleted'));
            });
            card.appendChild(x);
        }
        return card;
    }

    function guardarActual() {
        var pedir = (global.SM_DIALOG && SM_DIALOG.prompt) ? SM_DIALOG.prompt : null;
        var seguir = function (nombre) {
            nombre = (nombre || '').trim();
            if (!nombre) return;
            var lista = leerUser();
            var copia = {}, k;
            for (k in C.DEFAULTS) if (C.DEFAULTS.hasOwnProperty(k)) copia[k] = (state[k] instanceof Array) ? state[k].slice() : state[k];
            var i = -1;
            for (var j = 0; j < lista.length; j++) {
                if (lista[j].name.toLowerCase() === nombre.toLowerCase()) { i = j; break; }
            }
            if (i >= 0) lista[i] = { name: nombre, s: copia };
            else lista.push({ name: nombre, s: copia });
            guardarUser(lista);
            pintarPresets();
            toast(T('Guardado: ', 'Saved: ') + nombre);
        };
        if (pedir) pedir(T('Nombre del preset', 'Preset name'), '', seguir);
        else seguir(global.prompt(T('Nombre del preset', 'Preset name'), ''));
    }

    /* ── Editor de curva (el mini SmoothCurves) ──────────────────────────── */
    /* Dibuja el bezier con sus dos tiradores y deja arrastrarlos. Es la MISMA
       curva que se emite a las expresiones, asi que lo que se dibuja aca es
       literalmente lo que va a hacer la transicion en AE. */
    var curvaArrastre = -1;
    var TIRADOR = 5.5;              // radio del punto que se dibuja
    var AGARRE = 20;                // radio de agarre, en pixeles de pantalla
    /* Rango VERTICAL visible. El rebote necesita pasarse de 0..1, asi que la
       caja muestra un poco mas — y los tiradores se acotan EXACTAMENTE a lo que
       se ve, para que nunca se escapen fuera del recuadro. */
    var CY0 = -0.35, CY1 = 1.35;

    /* Geometria del editor. Se remide en CADA pintada: el panel de CEP puede
       cambiar de ancho en cualquier momento, y si el lienzo se queda con el
       tamaño viejo el navegador lo estira — de ahi la linea gorda y los
       tiradores ovalados. */
    function curvaGeom() {
        var cv = $('st-curve');
        var r = cv.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        var w = Math.max(80, Math.round(r.width)), h = Math.max(60, Math.round(r.height));
        var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
        if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // El margen deja sitio al tirador entero: asi ni medio punto se corta.
        var m = TIRADOR + 5, W = w - m * 2, H = h - m * 2;
        return {
            cv: cv, ctx: ctx, w: w, h: h, W: W, H: H, m: m, rect: r,
            X: function (u) { return m + u * W; },
            Y: function (v) { return m + (1 - (v - CY0) / (CY1 - CY0)) * H; },
            iX: function (px) { return (px - m) / W; },
            iY: function (py) { return CY0 + (1 - (py - m) / H) * (CY1 - CY0); }
        };
    }

    function pintarCurva() {
        var g = curvaGeom(), ctx = g.ctx, c = state.curva;
        ctx.clearRect(0, 0, g.w, g.h);

        // Banda 0..1: el recorrido "util". Fuera de ella es rebote.
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        ctx.fillRect(g.X(0), g.Y(1), g.W, g.Y(0) - g.Y(1));

        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        ctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
            var u = i / 4;
            ctx.beginPath();
            ctx.moveTo(g.X(u), g.Y(CY1)); ctx.lineTo(g.X(u), g.Y(CY0));
            ctx.moveTo(g.X(0), g.Y(u)); ctx.lineTo(g.X(1), g.Y(u));
            ctx.stroke();
        }

        // Diagonal: como se veria a velocidad constante.
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(1), g.Y(1)); ctx.stroke();
        ctx.setLineDash([]);

        var az = (getComputedStyle(document.body).getPropertyValue('--ec-blue') || '').trim() || '#3b82f6';

        // Varillas de los tiradores
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(c[0]), g.Y(c[1]));
        ctx.moveTo(g.X(1), g.Y(1)); ctx.lineTo(g.X(c[2]), g.Y(c[3]));
        ctx.stroke();

        // La curva
        ctx.strokeStyle = az; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (var k = 0; k <= 80; k++) {
            var t = k / 80, y = C.ease(c, t);
            if (k === 0) ctx.moveTo(g.X(t), g.Y(y)); else ctx.lineTo(g.X(t), g.Y(y));
        }
        ctx.stroke();

        // Extremos fijos + tiradores
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        [[0, 0], [1, 1]].forEach(function (p) {
            ctx.beginPath(); ctx.arc(g.X(p[0]), g.Y(p[1]), 2.5, 0, Math.PI * 2); ctx.fill();
        });
        [[c[0], c[1]], [c[2], c[3]]].forEach(function (p, i) {
            ctx.beginPath();
            ctx.arc(g.X(p[0]), g.Y(p[1]), curvaArrastre === i ? TIRADOR + 1.5 : TIRADOR, 0, Math.PI * 2);
            ctx.fillStyle = az; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.stroke();
        });

        $('st-curve-tag').textContent = c.map(function (v) { return Math.round(v * 100) / 100; }).join(', ');
    }

    function iniciarCurva() {
        var cv = $('st-curve');
        var lim = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

        function local(ev) {
            var r = cv.getBoundingClientRect();
            return [ev.clientX - r.left, ev.clientY - r.top];
        }

        cv.addEventListener('pointerdown', function (ev) {
            var g = curvaGeom(), c = state.curva, p = local(ev);
            var d0 = Math.sqrt(Math.pow(p[0] - g.X(c[0]), 2) + Math.pow(p[1] - g.Y(c[1]), 2));
            var d1 = Math.sqrt(Math.pow(p[0] - g.X(c[2]), 2) + Math.pow(p[1] - g.Y(c[3]), 2));
            var cerca = Math.min(d0, d1);
            // Solo agarra si el clic cae CERCA de un tirador. Antes cualquier
            // clic en el recuadro teletransportaba el punto mas proximo, que es
            // lo que hacia que se sintiera que "se movia solo".
            if (cerca > AGARRE) return;
            curvaArrastre = (d0 <= d1) ? 0 : 1;
            try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
            ev.preventDefault();
            mover(ev);
        });

        cv.addEventListener('pointermove', function (ev) {
            if (curvaArrastre >= 0) { ev.preventDefault(); mover(ev); return; }
            // Sin arrastrar, el cursor avisa cuando hay algo agarrable.
            var g = curvaGeom(), c = state.curva, p = local(ev);
            var d0 = Math.sqrt(Math.pow(p[0] - g.X(c[0]), 2) + Math.pow(p[1] - g.Y(c[1]), 2));
            var d1 = Math.sqrt(Math.pow(p[0] - g.X(c[2]), 2) + Math.pow(p[1] - g.Y(c[3]), 2));
            cv.style.cursor = (Math.min(d0, d1) <= AGARRE) ? 'grab' : 'default';
        });

        // Soltar FUERA del lienzo tambien termina el arrastre. Sin esto, si
        // soltabas afuera el punto se quedaba pegado al cursor.
        function soltar() { if (curvaArrastre >= 0) { curvaArrastre = -1; pintarCurva(); } }
        cv.addEventListener('pointerup', soltar);
        cv.addEventListener('pointercancel', soltar);
        window.addEventListener('pointerup', soltar);
        window.addEventListener('blur', soltar);

        function mover(ev) {
            var g = curvaGeom(), p = local(ev);
            // Acotado EXACTAMENTE al recuadro visible: los tiradores no se
            // pueden ir a donde el usuario no los ve.
            var x = lim(g.iX(p[0]), 0, 1);
            var y = lim(g.iY(p[1]), CY0, CY1);
            if (curvaArrastre === 0) state.curva = [x, y, state.curva[2], state.curva[3]];
            else state.curva = [state.curva[0], state.curva[1], x, y];
            pintarCurva(); cambio();
        }

        var cont = $('st-curve-presets');
        C.CURVAS.forEach(function (cu) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = isEN() ? cu.en : cu.es;
            b.setAttribute('data-no-i18n', '');
            b.addEventListener('click', function () {
                state.curva = cu.c.slice();
                pintarCurva(); cambio();
            });
            cont.appendChild(b);
        });

        // Repintar cuando cambie el tamaño: el lienzo se remide y deja de
        // verse estirado. Es LA causa de que se viera borroso al abrir.
        if (window.ResizeObserver) {
            try { new ResizeObserver(function () { pintarCurva(); }).observe(cv); } catch (e) {}
        }
        window.addEventListener('resize', pintarCurva);
        // Y una pasada mas cuando el layout ya asento del todo.
        setTimeout(pintarCurva, 0);
        setTimeout(pintarCurva, 200);
    }

    /* ── Estado ↔ UI ─────────────────────────────────────────────────────── */
    function sincronizarTiempo() {
        $('st-dur').value = Math.round(state.duracion * 100);
        $('st-dur-n').value = state.duracion;
        pintarCurva();
    }

    function cambio(repintar) {
        if (repintar) pintarModulos();
        $('st-status').textContent = C.resumen(state, isEN());
        if (vista) { if (!vista.tocando()) vista.pintar(); }
    }

    function toast(txt) {
        var el = $('st-toast');
        el.textContent = txt;
        el.className = 'st-toast show';
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.className = 'st-toast'; }, 2600);
    }

    /* ── Aplicar en AE ───────────────────────────────────────────────────── */
    function aplicar() {
        if (!cs) { toast(T('Solo funciona dentro de After Effects.', 'Only works inside After Effects.')); return; }
        var payload = { version: 1, lang: isEN() ? 'en' : 'es', state: state };
        var json = JSON.stringify(payload).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        toast(T('Aplicando…', 'Applying…'));
        cs.evalScript('ST_apply("' + json + '")', function (res) {
            if (res && res.indexOf('OK') === 0) toast(T('Transición aplicada ✓', 'Transition applied ✓'));
            else toast(res || T('No se pudo aplicar', "Couldn't apply"));
        });
    }

    /* ── Aviso de beta ───────────────────────────────────────────────────── */
    var LS_BETA = 'smoothtransition.beta.oculto';
    var DISCORD = 'https://discord.gg/eV8xHpq2Np';

    function abrirURL(url) {
        try { if (cs) { cs.openURLInDefaultBrowser(url); return; } } catch (e) {}
        try { global.open(url, '_blank'); } catch (e2) {}
    }

    function iniciarBeta() {
        var caja = $('st-beta');
        var oculto = false;
        try { oculto = localStorage.getItem(LS_BETA) === '1'; } catch (e) {}
        if (oculto) return;                    // el usuario ya dijo que no

        caja.hidden = false;

        function cerrar() {
            // La casilla se lee AL CERRAR, no al marcarla: si la marca y despues
            // se arrepiente, todavia puede desmarcarla antes de salir.
            try {
                if ($('st-beta-never').checked) localStorage.setItem(LS_BETA, '1');
            } catch (e) {}
            caja.hidden = true;
        }

        $('st-beta-ok').addEventListener('click', cerrar);
        $('st-beta-dc').addEventListener('click', function () { abrirURL(DISCORD); });
        // Clic en el fondo o Escape tambien cierran, como cualquier dialogo.
        caja.addEventListener('click', function (ev) { if (ev.target === caja) cerrar(); });
        document.addEventListener('keydown', function (ev) {
            if (!caja.hidden && ev.key === 'Escape') cerrar();
        });
    }

    /* ── Arranque ────────────────────────────────────────────────────────── */
    function iniciar() {
        pintarModulos();
        pintarPresets();
        iniciarCurva();
        sincronizarTiempo();

        vista = SmoothTransition_Preview.crear($('st-canvas'), function () { return state; });
        vista.arrancar();

        $('st-dur').addEventListener('input', function () {
            state.duracion = Math.round(parseFloat(this.value)) / 100;
            $('st-dur-n').value = state.duracion; cambio();
        });
        $('st-dur-n').addEventListener('change', function () {
            var v = parseFloat(this.value);
            if (!isFinite(v)) return;
            state.duracion = Math.max(0.1, Math.min(2, v));
            sincronizarTiempo(); cambio();
        });

        $('st-play').addEventListener('click', function () {
            var tocando = !vista.tocando();
            vista.play(tocando);
            $('st-play-ico').innerHTML = tocando
                ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
                : '<path d="M8 5v14l11-7z"/>';
        });
        $('st-scrub').addEventListener('input', function () {
            vista.progreso(parseInt(this.value, 10) / 1000);
            $('st-play-ico').innerHTML = '<path d="M8 5v14l11-7z"/>';
        });

        $('st-save').addEventListener('click', guardarActual);
        $('st-apply').addEventListener('click', aplicar);

        cambio();
        iniciarBeta();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

})(window);
