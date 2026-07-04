# SmoothMotion — Sitio web

Web de presentación de **SmoothMotion**, la suite de 11 paneles para After Effects.
Incluye una emulación real de cada panel (modo demo) navegable desde el navegador.

## Ver en local

Como los paneles se cargan en `iframe`, **no** funciona abriendo `index.html` con doble clic
(`file://`). Usa un servidor local:

- **Windows:** doble clic en `INICIAR-WEB.bat` → abre `http://localhost:8080`
- **Manual:** `node serve.js` en esta carpeta

## Subir a GitHub Pages (gratis)

Todo el sitio es **estático**, así que funciona tal cual en GitHub Pages.

1. Crea un repositorio en GitHub (ej. `smoothmotion-web`).
2. Sube **todo el contenido de esta carpeta** a la raíz del repo
   (incluido el archivo oculto **`.nojekyll`** — es imprescindible).
3. En el repo: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
   rama `main`, carpeta `/ (root)` → **Save**.
4. En 1-2 minutos estará en `https://TU-USUARIO.github.io/smoothmotion-web/`.

### ¿Por qué `.nojekyll`?
GitHub Pages procesa los sitios con Jekyll, que **ignora los archivos que empiezan por `_`**.
Un panel usa `app/client/css/_variables.css` (sus colores). El archivo `.nojekyll` desactiva
Jekyll para que **todo** se sirva tal cual. Sin él, los paneles se verían sin estilo.

### Notas
- Funciona igual en la raíz (`usuario.github.io`) o en subcarpeta (`usuario.github.io/repo/`):
  todas las rutas son relativas.
- `serve.js` y `INICIAR-WEB.bat` son solo para uso local; en la nube no se usan (puedes dejarlos).
- Alternativas equivalentes: **Netlify**, **Vercel** o **Cloudflare Pages** (arrastrar la carpeta y listo).

## Estructura

```
index.html          · página principal
css/style.css       · estilos (paleta idéntica al plugin)
js/main.js          · hero rotatorio + playground + extras
app/                · paneles reales del plugin (modo demo)
  client/           · panel combinado (8 módulos vía ?m=)
  SmoothTypo/  SmoothAlignPro/  SmoothGuides/   · paneles independientes
  shared/           · licencia + demo-shim compartido
manual/             · manual de usuario
```
