/* ============================================================================
   SmoothTransition — preview en canvas
   ----------------------------------------------------------------------------
   Dibuja dos clips de muestra y les aplica EXACTAMENTE lo que devuelve
   SmoothTransition_Core.sample(). No hay matematica propia aca: si el preview y la
   composicion no coinciden, el error esta en el modelo, no en dos sitios.
   ========================================================================== */

var SmoothTransition_Preview = (function () {
    "use strict";

    function crear(canvas, getState) {
        var ctx = canvas.getContext('2d');
        var p = 0, tocando = true, ultimo = 0, raf = null;
        var duracionCiclo = 0;      // se recalcula con el estado
        var pausaFinal = 0.45;      // segundos de respiro entre vueltas
        var esperando = 0;

        /* Clips de muestra: dos degradados con su numero, para que se vea de un
           golpe cual es cual sin depender de imagenes externas. */
        var CLIPS = [
            { c1: '#f43f5e', c2: '#7c3aed', et: 'A' },
            { c1: '#0ea5e9', c2: '#10b981', et: 'B' }
        ];

        function tam() {
            var r = canvas.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            var w = Math.max(120, Math.round(r.width)), h = Math.max(80, Math.round(r.height));
            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr; canvas.height = h * dpr;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w: w, h: h };
        }

        function dibujarClip(d, clip, tr, esA, st) {
            ctx.save();

            // El barrido recorta ANTES de transformar, asi el corte se queda
            // pegado al cuadro y no viaja con el clip.
            if (esA && tr.wipe !== undefined && tr.wipe > 0) {
                recortarBarrido(d, tr.wipe, st);
            }

            ctx.globalAlpha = Math.max(0, Math.min(1, tr.op));
            var filtros = [];
            if (tr.blur > 0.2) filtros.push('blur(' + tr.blur.toFixed(1) + 'px)');
            if (filtros.length) ctx.filter = filtros.join(' ');

            ctx.translate(d.w / 2 + tr.x * d.w, d.h / 2 + tr.y * d.h);
            ctx.rotate(tr.rot * Math.PI / 180);
            ctx.scale(tr.esc, tr.esc);

            var g = ctx.createLinearGradient(-d.w / 2, -d.h / 2, d.w / 2, d.h / 2);
            g.addColorStop(0, clip.c1); g.addColorStop(1, clip.c2);
            ctx.fillStyle = g;
            ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);

            ctx.globalAlpha *= 0.9;
            ctx.fillStyle = 'rgba(255,255,255,.92)';
            ctx.font = '600 ' + Math.round(Math.min(d.w, d.h) * 0.26) + 'px system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(clip.et, 0, 0);

            ctx.restore();
        }

        /* Recorta lo que TODAVIA queda de A. Solo se le aplica a A: B esta
           debajo, entero, y va apareciendo a medida que A se va. */
        function recortarBarrido(d, q, st) {
            ctx.beginPath();
            if (st.wipeTipo === 'radial') {
                var ang = -Math.PI / 2;
                ctx.moveTo(d.w / 2, d.h / 2);
                ctx.arc(d.w / 2, d.h / 2, Math.hypot(d.w, d.h),
                        ang + q * Math.PI * 2, ang + Math.PI * 2);
                ctx.closePath();
            } else if (st.wipeTipo === 'iris') {
                ctx.arc(d.w / 2, d.h / 2, Math.hypot(d.w, d.h) / 2 * (1 - q), 0, Math.PI * 2);
            } else {
                // Lineal: queda el semiplano que todavia no barrio el frente.
                // El borde recorre de una punta a la otra de la DIAGONAL, asi
                // que a q=0 cubre el cuadro entero y a q=1 no queda nada.
                var largo = Math.hypot(d.w, d.h);
                var off = (q - 0.5) * largo;
                ctx.save();
                ctx.translate(d.w / 2, d.h / 2);
                ctx.rotate((st.wipeAng || 90) * Math.PI / 180);
                ctx.rect(-largo, off, largo * 2, largo * 2);
                ctx.restore();
            }
            ctx.clip();
        }

        function capaEncima(d, fx) {
            // Glitch: rebanadas horizontales desplazadas. Es lo mismo que hace
            // el desplazamiento turbulento en AE, en version barata.
            if (fx.glitch > 0.01) {
                var n = 12, alto = d.h / n;
                var img = null;
                try { img = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (e) {}
                if (img) {
                    for (var i = 0; i < n; i++) {
                        var dx = SmoothTransition_Core.noise(i * 3.3 + Math.floor(p * 30), 7) * fx.glitch * d.w * 0.16;
                        if (Math.abs(dx) < 0.5) continue;
                        ctx.drawImage(canvas, 0, i * alto * (window.devicePixelRatio || 1),
                            canvas.width, alto * (window.devicePixelRatio || 1),
                            dx, i * alto, d.w, alto);
                    }
                }
            }
            if (fx.desat > 0.01 || fx.expo > 0.01) {
                ctx.save();
                if (fx.desat > 0.01) {
                    ctx.globalCompositeOperation = 'saturation';
                    ctx.fillStyle = 'hsl(0,' + Math.round((1 - fx.desat) * 100) + '%,50%)';
                    ctx.fillRect(0, 0, d.w, d.h);
                }
                if (fx.expo > 0.01) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = 'rgba(255,255,255,' + (fx.expo * 0.5).toFixed(3) + ')';
                    ctx.fillRect(0, 0, d.w, d.h);
                }
                ctx.restore();
            }
            if (fx.flash > 0.01) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, fx.flash);
                ctx.fillStyle = fx.flashColor === 'black' ? '#000' : '#fff';
                ctx.fillRect(0, 0, d.w, d.h);
                ctx.restore();
            }
        }

        function pintar() {
            var st = SmoothTransition_Core.fill(getState());
            var d = tam();
            var s = SmoothTransition_Core.sample(st, p);

            ctx.clearRect(0, 0, d.w, d.h);
            ctx.save();
            ctx.fillStyle = '#0b0f17';
            ctx.fillRect(0, 0, d.w, d.h);

            // (La sacudida ya viene sumada en la posicion de cada clip desde el
            //  modelo, para que el generador pueda hacer exactamente lo mismo.)

            // El desenfoque direccional del modelo se reparte en los dos clips:
            // en canvas no hay blur con angulo, asi que se aproxima con blur.
            var extra = s.fx.dblur * 14 + s.fx.blur * 12;

            var solapa = st.overlap || st.wipeOn;
            if (solapa) {
                dibujarClip(d, CLIPS[1], conBlur(s.b, extra), false, st);
                dibujarClip(d, CLIPS[0], conBlur(s.a, extra), true, st);
            } else if (p < 0.5) {
                dibujarClip(d, CLIPS[0], conBlur(s.a, extra), true, st);
            } else {
                dibujarClip(d, CLIPS[1], conBlur(s.b, extra), false, st);
            }
            ctx.restore();

            capaEncima(d, s.fx);
        }

        function conBlur(tr, extra) {
            var o = {}; for (var k in tr) if (tr.hasOwnProperty(k)) o[k] = tr[k];
            o.blur = (o.blur || 0) + extra;
            return o;
        }

        function bucle(ahora) {
            raf = requestAnimationFrame(bucle);
            if (!ultimo) ultimo = ahora;
            var dt = Math.min(0.05, (ahora - ultimo) / 1000);
            ultimo = ahora;

            if (tocando) {
                var st = SmoothTransition_Core.fill(getState());
                duracionCiclo = Math.max(0.15, st.duracion);
                if (esperando > 0) {
                    esperando -= dt;
                    if (esperando <= 0) p = 0;
                } else {
                    p += dt / duracionCiclo;
                    if (p >= 1) { p = 1; esperando = pausaFinal; }
                }
            }
            pintar();
        }

        function arrancar() { if (!raf) { ultimo = 0; raf = requestAnimationFrame(bucle); } }
        function parar() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

        return {
            arrancar: arrancar,
            parar: parar,
            pintar: pintar,
            reiniciar: function () { p = 0; esperando = 0; },
            play: function (v) { tocando = v; if (v) { esperando = 0; } },
            tocando: function () { return tocando; },
            progreso: function (v) {
                if (v === undefined) return p;
                p = SmoothTransition_Core.clamp01(v); tocando = false; pintar();
            }
        };
    }

    return { crear: crear };
})();
