/* ============================================================
   SmoothText — motor de animación de texto
   Sin dependencias. Web Animations API + easing linear().
   ============================================================ */

// ---------- Estado ----------
const state = {
  text: "Smooth Text",
  animateBy: "letters",   // letters | words | lines
  direction: "below",     // below | above | left | right | center
  easing: "smooth",
  // core
  duration: 700,          // ms
  stagger: 45,            // ms  (overlap entre elementos)
  distance: 60,           // px
  // more (estados "from")
  opacity: 0,             // %
  scale: 60,              // %
  rotation: 0,            // deg
  blur: 8,                // px
  tracking: 0,            // px (letter-spacing inicial)
  offsetX: 0,             // px
  offsetY: 0,             // px
  // elastic
  elasticForce: 55,       // 0..100
  elasticBounces: 3,      // 1..8
  // global
  speed: 1,               // x
  loop: false,
  // exit / out
  exitMode: "off",        // off | mirror | clone | custom
  exitEasing: "smooth",
  hold: 800,              // ms visible entre entrada y salida
  exitDuration: 600,      // ms
  exitStagger: 45,        // ms
  exitDirection: "above", // hacia dónde sale (custom)
  exitDistance: 60,       // px
  exitOpacity: 0,         // %
  exitScale: 100,         // %
  exitRotation: 0,        // deg
  exitBlur: 0,            // px
  exitOffsetX: 0,         // px
  exitOffsetY: 0,         // px
  // style
  fontSize: 64,
  fontWeight: 800,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  align: "center",
  textColor: "#ffffff",
  bgColor: "#0a0d17",
};

// ---------- Refs ----------
const previewText = document.getElementById("previewText");
const canvas = document.getElementById("canvas");
let units = [];
let loopTimer = null;

// ---------- Easing ----------
const BEZIER = {
  smooth: "cubic-bezier(.16,1,.3,1)",
  inout:  "cubic-bezier(.65,0,.35,1)",
  back:   "cubic-bezier(.34,1.56,.64,1)",
  linear: "linear",
};

// Elastic muelle: fuerza controla el amortiguamiento (overshoot),
// bounces controla cuántas oscilaciones ocurren antes de asentarse.
function elasticEasing(force, bounces) {
  const damping = lerp(7.5, 2.4, clamp(force, 0, 100) / 100); // + fuerza => - amortiguación
  const freq = Math.max(1, bounces);
  const N = 72;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const env = Math.exp(-damping * t);
    let y = 1 - env * Math.cos(2 * Math.PI * freq * t);
    pts.push(+y.toFixed(4));
  }
  pts[0] = 0; pts[N] = 1;
  return "linear(" + pts.join(",") + ")";
}

function bounceEasing() {
  const N = 60, pts = [];
  const b = (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1; return n1 * t * t + 0.984375;
  };
  for (let i = 0; i <= N; i++) pts.push(+b(i / N).toFixed(4));
  pts[N] = 1;
  return "linear(" + pts.join(",") + ")";
}

function easingFor(name) {
  if (name === "elastic") return elasticEasing(state.elasticForce, state.elasticBounces);
  if (name === "bounce") return bounceEasing();
  return BEZIER[name] || BEZIER.smooth;
}
function resolveEasing() { return easingFor(state.easing); }
function resolveExitEasing() { return easingFor(state.exitEasing); }

// ---------- Helpers ----------
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function dirVec(name) {
  switch (name) {
    case "below": return { x: 0, y: 1 };
    case "above": return { x: 0, y: -1 };
    case "left":  return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    default:      return { x: 0, y: 0 };
  }
}

// Estado inicial "from" de cada unidad (entrada)
function fromTransform() {
  const d = dirVec(state.direction);
  const tx = state.offsetX + d.x * state.distance;
  const ty = state.offsetY + d.y * state.distance;
  return `translate(${tx}px, ${ty}px) scale(${state.scale / 100}) rotate(${state.rotation}deg)`;
}

const VISIBLE = { opacity: 1, transform: "translate(0,0) scale(1) rotate(0deg)", filter: "blur(0px)", letterSpacing: "0px" };

// Estado final "to" de la salida, según el modo de Exit
function exitTargetPose() {
  const mode = state.exitMode;
  if (mode === "mirror") {
    // regresa por donde entró (reverso de la entrada)
    return { opacity: state.opacity / 100, transform: fromTransform(), filter: `blur(${state.blur}px)`, letterSpacing: `${state.tracking}px` };
  }
  if (mode === "clone") {
    // continúa en el sentido de la entrada, saliendo por el lado opuesto
    const d = dirVec(state.direction);
    const tx = -(state.offsetX + d.x * state.distance);
    const ty = -(state.offsetY + d.y * state.distance);
    return { opacity: state.opacity / 100, transform: `translate(${tx}px, ${ty}px) scale(${state.scale / 100}) rotate(${state.rotation}deg)`, filter: `blur(${state.blur}px)`, letterSpacing: `${state.tracking}px` };
  }
  // custom
  const d = dirVec(state.exitDirection);
  const tx = state.exitOffsetX + d.x * state.exitDistance;
  const ty = state.exitOffsetY + d.y * state.exitDistance;
  return { opacity: state.exitOpacity / 100, transform: `translate(${tx}px, ${ty}px) scale(${state.exitScale / 100}) rotate(${state.exitRotation}deg)`, filter: `blur(${state.exitBlur}px)`, letterSpacing: `${state.tracking}px` };
}

// ---------- Construcción de unidades ----------
function buildUnits() {
  previewText.innerHTML = "";
  units = [];
  const lines = state.text.split("\n");

  lines.forEach((line, li) => {
    const lineWrap = document.createElement("span");
    lineWrap.className = "ln";

    if (state.animateBy === "lines") {
      const u = document.createElement("span");
      u.className = "unit";
      u.textContent = line || " ";
      lineWrap.appendChild(u);
      units.push(u);
    } else if (state.animateBy === "words") {
      const words = line.split(" ");
      words.forEach((w, wi) => {
        const u = document.createElement("span");
        u.className = "unit";
        u.textContent = w;
        lineWrap.appendChild(u);
        units.push(u);
        if (wi < words.length - 1) lineWrap.appendChild(document.createTextNode(" "));
      });
    } else { // letters
      [...line].forEach((ch) => {
        const u = document.createElement("span");
        u.className = "unit";
        u.textContent = ch === " " ? " " : ch;
        lineWrap.appendChild(u);
        units.push(u);
      });
    }
    previewText.appendChild(lineWrap);
  });
}

// ---------- Estilo del preview ----------
function applyStyles() {
  previewText.style.fontSize = state.fontSize + "px";
  previewText.style.fontWeight = state.fontWeight;
  previewText.style.fontFamily = state.fontFamily;
  previewText.style.textAlign = state.align;
  previewText.style.color = state.textColor;
  canvas.style.backgroundColor = state.bgColor;
  if (!canvas.classList.contains("checker")) canvas.style.background = state.bgColor;
}

// ---------- Pose estática "from" (para arrastrar sliders) ----------
function showFromPose() {
  cancelLoop();
  const tf = fromTransform();
  units.forEach((u) => {
    u.getAnimations().forEach((a) => a.cancel());
    u.style.opacity = state.opacity / 100;
    u.style.transform = tf;
    u.style.filter = `blur(${state.blur}px)`;
    u.style.letterSpacing = state.tracking + "px";
  });
}

// Pose estática de salida (para previsualizar sliders del Exit custom)
function showExitPose() {
  cancelLoop();
  const p = exitTargetPose();
  units.forEach((u) => {
    u.getAnimations().forEach((a) => a.cancel());
    u.style.opacity = p.opacity;
    u.style.transform = p.transform;
    u.style.filter = p.filter;
    u.style.letterSpacing = p.letterSpacing;
  });
}

// ============================================================
//  Motor de reproducción del preview
//  elastic/bounce -> KEYFRAMES muestreados (fiel y compatible con
//  el Chromium de CEP, que NO soporta la función de easing linear()).
// ============================================================

function elasticSample(t, force, bounces) {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const damp = lerp(7.5, 2.4, clamp(force, 0, 100) / 100);
  const freq = Math.max(1, bounces);
  return 1 - Math.exp(-damp * t) * Math.cos(2 * Math.PI * freq * t);
}
function bounceSample(t) {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1; return n1 * t * t + 0.984375;
}
const r3 = (v) => Math.round(v * 1000) / 1000;

// Pose numérica -> keyframe CSS (clamps para el overshoot de elastic).
function poseKF(p) {
  return {
    opacity: Math.max(0, Math.min(1, p.opacity)),
    transform: "translate(" + r3(p.tx) + "px, " + r3(p.ty) + "px) scale(" + r3(p.scale) + ") rotate(" + r3(p.rotation) + "deg)",
    filter: "blur(" + Math.max(0, r3(p.blur)) + "px)",
    letterSpacing: r3(p.tracking) + "px",
  };
}
function lerpPose(a, b, e) {
  return {
    opacity: a.opacity + (b.opacity - a.opacity) * e,
    tx: a.tx + (b.tx - a.tx) * e,
    ty: a.ty + (b.ty - a.ty) * e,
    scale: a.scale + (b.scale - a.scale) * e,
    rotation: a.rotation + (b.rotation - a.rotation) * e,
    blur: a.blur + (b.blur - a.blur) * e,
    tracking: a.tracking + (b.tracking - a.tracking) * e,
  };
}

const VIS_POSE = { opacity: 1, tx: 0, ty: 0, scale: 1, rotation: 0, blur: 0, tracking: 0 };

function fromPoseFor(s) {
  const d = dirVec(s.direction);
  return { opacity: s.opacity / 100, tx: s.offsetX + d.x * s.distance, ty: s.offsetY + d.y * s.distance, scale: s.scale / 100, rotation: s.rotation, blur: s.blur, tracking: s.tracking };
}
function exitPoseFor(s) {
  if (s.exitMode === "mirror") {
    const d = dirVec(s.direction);
    return { opacity: s.opacity / 100, tx: s.offsetX + d.x * s.distance, ty: s.offsetY + d.y * s.distance, scale: s.scale / 100, rotation: s.rotation, blur: s.blur, tracking: s.tracking };
  }
  if (s.exitMode === "clone") {
    const d = dirVec(s.direction);
    return { opacity: s.opacity / 100, tx: -(s.offsetX + d.x * s.distance), ty: -(s.offsetY + d.y * s.distance), scale: s.scale / 100, rotation: s.rotation, blur: s.blur, tracking: s.tracking };
  }
  const d = dirVec(s.exitDirection);
  return { opacity: s.exitOpacity / 100, tx: s.exitOffsetX + d.x * s.exitDistance, ty: s.exitOffsetY + d.y * s.exitDistance, scale: s.exitScale / 100, rotation: s.exitRotation, blur: s.exitBlur, tracking: s.tracking };
}

// Anima una unidad de "from" a "to".
// elastic/bounce -> keyframes muestreados; el resto -> cubic-bezier.
function animateUnit(u, fromPose, toPose, easingName, ez, timing) {
  if (easingName === "elastic" || easingName === "bounce") {
    const sample = easingName === "elastic"
      ? function (t) { return elasticSample(t, ez.force, ez.bounces); }
      : bounceSample;
    const N = 60, kf = [];
    for (let i = 0; i <= N; i++) kf.push(poseKF(lerpPose(fromPose, toPose, sample(i / N))));
    return u.animate(kf, { duration: timing.duration, delay: timing.delay, easing: "linear", fill: timing.fill });
  }
  const bez = BEZIER[easingName] || BEZIER.smooth;
  return u.animate([poseKF(fromPose), poseKF(toPose)], { duration: timing.duration, delay: timing.delay, easing: bez, fill: timing.fill });
}

// ---------- Reproducir animación ----------
function play() {
  cancelLoop();
  const n = units.length;
  const hasExit = state.exitMode !== "off";

  const inDur = state.duration / state.speed;
  const inStag = state.stagger / state.speed;
  const entranceTotal = inDur + (n - 1) * inStag;

  const hold = state.hold / state.speed;
  const exDur = state.exitDuration / state.speed;
  const exStag = state.exitStagger / state.speed;
  const exitStart = entranceTotal + hold;

  const fp = fromPoseFor(state);
  const exitP = hasExit ? exitPoseFor(state) : null;
  const ez = { force: state.elasticForce, bounces: state.elasticBounces };

  units.forEach((u, i) => {
    u.getAnimations().forEach((a) => a.cancel());
    u.style.cssText = ""; // limpia poses estáticas previas
    animateUnit(u, fp, VIS_POSE, state.easing, ez, { duration: inDur, delay: i * inStag, fill: "both" });
    if (hasExit) {
      animateUnit(u, VIS_POSE, exitP, state.exitEasing, ez, { duration: exDur, delay: exitStart + i * exStag, fill: "forwards" });
    }
  });

  if (state.loop) {
    const grand = hasExit ? exitStart + exDur + (n - 1) * exStag : entranceTotal;
    loopTimer = setTimeout(play, grand + 500);
  }
}

function cancelLoop() { if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; } }

// ---------- Definición de sliders ----------
const CORE = [
  { key: "duration", label: "Duration", min: 100, max: 3000, step: 50, unit: "ms" },
  { key: "stagger",  label: "Overlap",  min: 0,   max: 200,  step: 5,  unit: "ms" },
  { key: "distance", label: "Distance", min: 0,   max: 400,  step: 2,  unit: "px" },
];
const MORE = [
  { key: "opacity",  label: "Opacity",  min: 0,    max: 100, step: 1, unit: "%" },
  { key: "scale",    label: "Scale",    min: 0,    max: 200, step: 1, unit: "%" },
  { key: "rotation", label: "Rotation", min: -180, max: 180, step: 1, unit: "°" },
  { key: "blur",     label: "Blur",     min: 0,    max: 40,  step: 1, unit: "px" },
  { key: "tracking", label: "Tracking", min: -20,  max: 80,  step: 1, unit: "px" },
  { key: "offsetX",  label: "Offset X", min: -400, max: 400, step: 2, unit: "px" },
  { key: "offsetY",  label: "Offset Y", min: -400, max: 400, step: 2, unit: "px" },
];
const ELASTIC = [
  { key: "elasticForce",   label: "Force",   min: 0, max: 100, step: 1, unit: "" },
  { key: "elasticBounces", label: "Bounces", min: 1, max: 8,   step: 1, unit: "" },
];
const STYLE = [
  { key: "fontSize", label: "Size",  min: 24, max: 160, step: 1, unit: "px", drag: "style" },
  { key: "speed",    label: "Speed", min: 0.25, max: 3, step: 0.05, unit: "x", drag: "none" },
];
const EXIT_TIMING = [
  { key: "hold",         label: "Hold",     min: 0,   max: 3000, step: 50, unit: "ms", drag: "none" },
  { key: "exitDuration", label: "Duration", min: 100, max: 3000, step: 50, unit: "ms", drag: "none" },
  { key: "exitStagger",  label: "Overlap",  min: 0,   max: 200,  step: 5,  unit: "ms", drag: "none" },
];
const EXIT_CUSTOM = [
  { key: "exitDistance", label: "Distance", min: 0,    max: 400, step: 2, unit: "px", drag: "exitPose" },
  { key: "exitOpacity",  label: "Opacity",  min: 0,    max: 100, step: 1, unit: "%",  drag: "exitPose" },
  { key: "exitScale",    label: "Scale",    min: 0,    max: 200, step: 1, unit: "%",  drag: "exitPose" },
  { key: "exitRotation", label: "Rotation", min: -180, max: 180, step: 1, unit: "°",  drag: "exitPose" },
  { key: "exitBlur",     label: "Blur",     min: 0,    max: 40,  step: 1, unit: "px", drag: "exitPose" },
  { key: "exitOffsetX",  label: "Offset X", min: -400, max: 400, step: 2, unit: "px", drag: "exitPose" },
  { key: "exitOffsetY",  label: "Offset Y", min: -400, max: 400, step: 2, unit: "px", drag: "exitPose" },
];

function makeSlider(cfg) {
  const row = document.createElement("div");
  row.className = "slider-row";
  row.innerHTML = `
    <span class="s-label">${cfg.label}</span>
    <input class="s-range" type="range" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state[cfg.key]}" />
    <span class="s-val"><input type="number" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${state[cfg.key]}" /><span class="unit">${cfg.unit}</span></span>`;
  const range = row.querySelector(".s-range");
  const num = row.querySelector(".s-val input");

  const setVal = (v, replayOnRelease) => {
    v = clamp(parseFloat(v), cfg.min, cfg.max);
    if (isNaN(v)) return;
    state[cfg.key] = v;
    range.value = v; num.value = v;
    // qué previsualizar al arrastrar
    if (cfg.drag === "style") applyStyles();
    else if (cfg.drag === "exitPose") showExitPose();
    else if (cfg.drag === "none") { /* solo se ve al soltar (Replay) */ }
    else showFromPose();
  };

  range.addEventListener("input", () => setVal(range.value));
  range.addEventListener("change", () => play());
  num.addEventListener("input", () => setVal(num.value));
  num.addEventListener("change", () => play());
  return row;
}

function renderSliders(containerId, list) {
  const c = document.getElementById(containerId);
  c.innerHTML = "";
  list.forEach((cfg) => c.appendChild(makeSlider(cfg)));
}

// ============================================================
//  Presets — entrada + salida, guardado propio y miniatura viva
// ============================================================

// Claves de animación que define un preset (entrada + salida).
// El estilo del texto (fuente, color, tamaño) NO forma parte del preset.
const ANIM_KEYS = [
  "animateBy", "direction", "easing", "duration", "stagger", "distance",
  "opacity", "scale", "rotation", "blur", "tracking", "offsetX", "offsetY",
  "elasticForce", "elasticBounces",
  "exitMode", "exitEasing", "hold", "exitDuration", "exitStagger",
  "exitDirection", "exitDistance", "exitOpacity", "exitScale", "exitRotation",
  "exitBlur", "exitOffsetX", "exitOffsetY",
];

// Snapshot de los valores por defecto (state aún sin mutar en este punto).
const DEFAULT_ANIM = {};
ANIM_KEYS.forEach((k) => { DEFAULT_ANIM[k] = state[k]; });

// La biblioteca arranca vacía: solo los presets que guarde el usuario.

// ---- Persistencia de presets del usuario (este equipo) ----
const LS_KEY = "smoothtext_user_presets";
function loadUserPresets() {
  try { const v = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function persistUserPresets() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(userPresets)); } catch (e) {}
}
let userPresets = loadUserPresets();

function captureSettings() {
  const o = {};
  ANIM_KEYS.forEach((k) => { o[k] = state[k]; });
  return o;
}

function applyPresetSettings(s) {
  ANIM_KEYS.forEach((k) => { if (k in s) state[k] = s[k]; });
  syncUI();
  buildUnits();
  applyStyles();
  play();
}

// Indicador inline persistente de guardado (bien visible en el panel).
let saveStatusTimer = null;
function showSaveStatus(msg) {
  const el = document.getElementById("presetSaveStatus");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  if (saveStatusTimer) clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
}

function saveCurrentPreset(name) {
  name = (name || "").trim();
  if (!name) { showToast("Ponle un nombre al preset"); return false; }
  const settings = captureSettings();
  const idx = userPresets.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  const updated = idx >= 0;
  if (updated) userPresets[idx] = { name: name, settings: settings };
  else userPresets.push({ name: name, settings: settings });
  persistUserPresets();
  renderPresets();
  showSaveStatus((updated ? "✓ Preset «" + name + "» actualizado" : "✓ Preset «" + name + "» guardado"));
  showToast(updated ? "✓ «" + name + "» actualizado" : "✓ «" + name + "» guardado");
  return true;
}

function deleteUserPreset(name) {
  userPresets = userPresets.filter((p) => p.name !== name);
  persistUserPresets();
  renderPresets();
  showToast("Preset «" + name + "» borrado");
}

function renameUserPreset(oldName, newName) {
  newName = (newName || "").trim();
  const p = userPresets.find((x) => x.name === oldName);
  if (!p) return;
  if (!newName || newName === oldName) { renderPresets(); return; }
  // evita duplicar nombre
  if (userPresets.some((x) => x !== p && x.name.toLowerCase() === newName.toLowerCase())) {
    showToast("Ya existe un preset con ese nombre"); renderPresets(); return;
  }
  p.name = newName;
  persistUserPresets();
  renderPresets();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

function autoSummary(s) {
  const by = { letters: "Letters", words: "Words", lines: "Lines" }[s.animateBy] || s.animateBy;
  const ez = { smooth: "Smooth", inout: "In-Out", back: "Back", elastic: "Elastic", bounce: "Bounce", linear: "Linear" }[s.easing] || s.easing;
  return by + " · " + ez + (s.exitMode && s.exitMode !== "off" ? " · +salida" : "");
}

// ---- Motor de la miniatura viva (self-contained, no toca el preview grande) ----
let miniCards = [];   // [{ sample, settings }]
let miniTimers = [];
let presetsActive = false;

function clearMiniTimers() { miniTimers.forEach((t) => clearTimeout(t)); miniTimers = []; }

function fromTransformS(s) {
  const d = dirVec(s.direction);
  const tx = s.offsetX + d.x * s.distance;
  const ty = s.offsetY + d.y * s.distance;
  return `translate(${tx}px, ${ty}px) scale(${s.scale / 100}) rotate(${s.rotation}deg)`;
}
function easingForS(name, s) {
  if (name === "elastic") return elasticEasing(s.elasticForce, s.elasticBounces);
  if (name === "bounce") return bounceEasing();
  return BEZIER[name] || BEZIER.smooth;
}
function exitPoseS(s) {
  if (s.exitMode === "mirror") {
    return { opacity: s.opacity / 100, transform: fromTransformS(s), filter: `blur(${s.blur}px)`, letterSpacing: `${s.tracking}px` };
  }
  if (s.exitMode === "clone") {
    const d = dirVec(s.direction);
    const tx = -(s.offsetX + d.x * s.distance);
    const ty = -(s.offsetY + d.y * s.distance);
    return { opacity: s.opacity / 100, transform: `translate(${tx}px, ${ty}px) scale(${s.scale / 100}) rotate(${s.rotation}deg)`, filter: `blur(${s.blur}px)`, letterSpacing: `${s.tracking}px` };
  }
  const d = dirVec(s.exitDirection);
  const tx = s.exitOffsetX + d.x * s.exitDistance;
  const ty = s.exitOffsetY + d.y * s.exitDistance;
  return { opacity: s.exitOpacity / 100, transform: `translate(${tx}px, ${ty}px) scale(${s.exitScale / 100}) rotate(${s.exitRotation}deg)`, filter: `blur(${s.exitBlur}px)`, letterSpacing: `${s.tracking}px` };
}

// Escala las distancias/blur/tiempos a la caja pequeña de la card.
function miniAdjust(s) {
  const f = 0.4;
  return Object.assign({}, s, {
    distance: s.distance * f, offsetX: s.offsetX * f, offsetY: s.offsetY * f,
    exitDistance: s.exitDistance * f, exitOffsetX: s.exitOffsetX * f, exitOffsetY: s.exitOffsetY * f,
    blur: Math.min(s.blur, 6) * 0.6, exitBlur: Math.min(s.exitBlur, 6) * 0.6,
    stagger: Math.min(s.stagger, 55), exitStagger: Math.min(s.exitStagger, 55),
    hold: Math.min(s.hold, 600),
  });
}

function miniSampleUnits(sample, s) {
  sample.innerHTML = "";
  const by = s.animateBy;
  const text = by === "words" ? "Smooth Text" : by === "lines" ? "Big\nText" : "Text";
  const units = [];
  text.split("\n").forEach((line) => {
    const ln = document.createElement("span");
    ln.className = "mini-ln";
    if (by === "lines") {
      const u = document.createElement("span"); u.className = "mini-unit"; u.textContent = line;
      ln.appendChild(u); units.push(u);
    } else if (by === "words") {
      const ws = line.split(" ");
      ws.forEach((w, i) => {
        const u = document.createElement("span"); u.className = "mini-unit"; u.textContent = w;
        ln.appendChild(u); units.push(u);
        if (i < ws.length - 1) ln.appendChild(document.createTextNode(" "));
      });
    } else {
      [...line].forEach((ch) => {
        const u = document.createElement("span"); u.className = "mini-unit"; u.textContent = ch;
        ln.appendChild(u); units.push(u);
      });
    }
    sample.appendChild(ln);
  });
  return units;
}

function playMini(units, s) {
  const n = units.length;
  const hasExit = s.exitMode !== "off";
  const entranceTotal = s.duration + (n - 1) * s.stagger;
  const exitStart = entranceTotal + s.hold;
  const fp = fromPoseFor(s);
  const exitP = hasExit ? exitPoseFor(s) : null;
  const ez = { force: s.elasticForce, bounces: s.elasticBounces };

  units.forEach((u, i) => {
    u.getAnimations().forEach((a) => a.cancel());
    animateUnit(u, fp, VIS_POSE, s.easing, ez, { duration: s.duration, delay: i * s.stagger, fill: "both" });
    if (hasExit) {
      animateUnit(u, VIS_POSE, exitP, s.exitEasing, ez, { duration: s.exitDuration, delay: exitStart + i * s.exitStagger, fill: "forwards" });
    }
  });
  return hasExit ? exitStart + s.exitDuration + (n - 1) * s.exitStagger : entranceTotal;
}

function startMini(sample, settings) {
  const ms = miniAdjust(settings);
  const build = () => {
    if (!presetsActive) return;
    const units = miniSampleUnits(sample, ms);
    const grand = playMini(units, ms);
    miniTimers.push(setTimeout(build, grand + 800));
  };
  build();
}
function startAllMinis() { clearMiniTimers(); miniCards.forEach((c) => startMini(c.sample, c.settings)); }
function stopAllMinis() {
  clearMiniTimers();
  miniCards.forEach((c) => c.sample.querySelectorAll(".mini-unit").forEach((u) => u.getAnimations().forEach((a) => a.cancel())));
}

function flashApplied(card) {
  document.querySelectorAll(".preset-card.applied").forEach((c) => c.classList.remove("applied"));
  card.classList.add("applied");
}

function startRename(nameEl, oldName) {
  const input = document.createElement("input");
  input.className = "p-name-edit";
  input.value = oldName;
  input.maxLength = 32;
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const commit = () => { if (done) return; done = true; renameUserPreset(oldName, input.value); };
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { done = true; renderPresets(); }
  });
  input.addEventListener("blur", commit);
  input.addEventListener("click", (e) => e.stopPropagation());
}

function makePresetCard(name, desc, settings, isUser) {
  const card = document.createElement("div");
  card.className = "preset-card";

  const preview = document.createElement("div");
  preview.className = "p-preview";
  const sample = document.createElement("div");
  sample.className = "p-sample";
  preview.appendChild(sample);
  card.appendChild(preview);

  const meta = document.createElement("div");
  meta.className = "p-meta";
  meta.innerHTML = `<div class="p-name">${escapeHtml(name)}</div><div class="p-desc">${escapeHtml(desc || autoSummary(settings))}</div>`;
  card.appendChild(meta);

  card.addEventListener("click", (e) => {
    if (e.target.closest(".p-del") || e.target.closest(".p-name-edit")) return;
    applyPresetSettings(settings);
    flashApplied(card);
  });

  if (isUser) {
    const del = document.createElement("button");
    del.className = "p-del";
    del.title = "Borrar preset";
    del.textContent = "✕";
    del.addEventListener("click", (e) => { e.stopPropagation(); deleteUserPreset(name); });
    card.appendChild(del);

    const nameEl = meta.querySelector(".p-name");
    nameEl.title = "Doble clic para renombrar";
    nameEl.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(nameEl, name); });
  }

  miniCards.push({ sample: sample, settings: settings });
  // Estado estático (texto visible) hasta que se activen las miniaturas.
  miniSampleUnits(sample, miniAdjust(settings));
  return card;
}

function renderPresets() {
  stopAllMinis();
  miniCards = [];

  const ug = document.getElementById("presetGridUser");
  ug.innerHTML = "";
  userPresets.forEach((p) => ug.appendChild(makePresetCard(p.name, null, p.settings, true)));

  const userSection = document.getElementById("userSection");
  if (userSection) userSection.classList.toggle("empty", userPresets.length === 0);

  if (presetsActive) startAllMinis();
}

// ---------- Sincronizar UI con estado ----------
function syncUI() {
  renderSliders("coreSliders", CORE);
  renderSliders("moreSliders", MORE);
  renderSliders("elasticSliders", ELASTIC);
  renderSliders("styleSliders", STYLE);
  renderSliders("exitTimingSliders", EXIT_TIMING);
  renderSliders("exitCustomSliders", EXIT_CUSTOM);
  setSeg("animateBy", state.animateBy);
  setSeg("direction", state.direction);
  setSeg("align", state.align);
  setSeg("exitMode", state.exitMode);
  setSeg("exitDirection", state.exitDirection);
  document.getElementById("easing").value = state.easing;
  document.getElementById("exitEasing").value = state.exitEasing;
  document.getElementById("elasticGroup").hidden = state.easing !== "elastic";
  document.getElementById("fontWeight").value = state.fontWeight;
  document.getElementById("loop").checked = state.loop;
  updateExitVisibility();
}

function updateExitVisibility() {
  document.getElementById("exitControls").hidden = state.exitMode === "off";
  document.getElementById("exitCustom").hidden = state.exitMode !== "custom";
}

function setSeg(id, val) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    b.classList.toggle("is-active", b.dataset.val === String(val));
  });
}

// ---------- Eventos de UI ----------
function bindSegmented(id, key, opts = {}) {
  document.getElementById(id).addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state[key] = btn.dataset.val;
    setSeg(id, state[key]);
    if (opts.rebuild) buildUnits();
    if (opts.style) applyStyles();
    play();
  });
}

function bindTabs() {
  document.getElementById("tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".tab-page").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`.tab-page[data-page="${tab.dataset.tab}"]`).classList.add("is-active");

    presetsActive = tab.dataset.tab === "presets";
    if (presetsActive) startAllMinis(); else stopAllMinis();
  });
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

// ============================================================
//  Puente con After Effects (CEP)
// ============================================================
const isCEP = typeof window !== "undefined" && !!window.__adobe_cep__;
let cs = null;
if (isCEP) { try { cs = new CSInterface(); } catch (e) { cs = null; } }

function hexToRgb01(hex) {
  const m = hex.replace("#", "");
  return [
    parseInt(m.substring(0, 2), 16) / 255,
    parseInt(m.substring(2, 4), 16) / 255,
    parseInt(m.substring(4, 6), 16) / 255,
  ];
}
const r2 = (n) => Math.round(n * 100) / 100;

// Cuerpo de easing como llamada JS válida en expresiones de AE.
// Usa los MISMOS parámetros que el preview → fidelidad exacta.
function easingCall(name) {
  switch (name) {
    case "smooth": return "cb(p,0.16,1,0.3,1)";
    case "inout":  return "cb(p,0.65,0,0.35,1)";
    case "back":   return "cb(p,0.34,1.56,0.64,1)";
    case "linear": return "p";
    case "bounce": return "bnc(p)";
    case "elastic": {
      const damp = lerp(7.5, 2.4, clamp(state.elasticForce, 0, 100) / 100);
      const freq = Math.max(1, state.elasticBounces);
      return "elo(p," + damp.toFixed(4) + "," + freq + ")";
    }
    default: return "cb(p,0.16,1,0.3,1)";
  }
}

// Funciones de easing inyectadas en cada expresión (elastic, bounce, bézier).
const EASE_HELPERS =
  "function cb(p,x1,y1,x2,y2){if(p<=0)return 0;if(p>=1)return 1;var t=p;for(var k=0;k<8;k++){var u=1-t;var x=3*u*u*t*x1+3*u*t*t*x2+t*t*t;var d=3*u*u*x1+6*u*t*(x2-x1)+3*t*t*(1-x2);if(Math.abs(x-p)<0.0005)break;if(d==0)break;t=t-(x-p)/d;if(t<0)t=0;if(t>1)t=1;}var w=1-t;return 3*w*w*t*y1+3*w*t*t*y2+t*t*t;}\n" +
  "function elo(p,damp,freq){if(p<=0)return 0;if(p>=1)return 1;return 1-Math.exp(-damp*p)*Math.cos(2*Math.PI*freq*p);}\n" +
  "function bnc(p){var n1=7.5625,d1=2.75;if(p<1/d1)return n1*p*p;else if(p<2/d1){p-=1.5/d1;return n1*p*p+0.75;}else if(p<2.5/d1){p-=2.25/d1;return n1*p*p+0.9375;}else{p-=2.625/d1;return n1*p*p+0.984375;}}\n";

// Helpers de marcadores: leen tiempo/duración de un marcador por su comentario.
const MARKER_HELPERS =
  "function mkT(nm,def){var m=thisLayer.marker;for(var k=1;k<=m.numKeys;k++){if(m.key(k).comment==nm)return m.key(k).time;}return def;}\n" +
  "function mkD(nm,def){var m=thisLayer.marker;for(var k=1;k<=m.numKeys;k++){if(m.key(k).comment==nm){var d=m.key(k).duration;return d>0?d:def;}}return def;}\n";

// Selector de ENTRADA: amount 1 = pose "from", 0 = visible.
// El tiempo de inicio y la duración se leen del marcador "SmoothText IN".
function inSelectorExpr() {
  const dur = (state.duration / 1000).toFixed(4);
  const stag = (state.stagger / 1000).toFixed(4);
  return EASE_HELPERS + MARKER_HELPERS +
    "var i=textIndex-1;\n" +
    "var start=mkT('SmoothText IN',thisLayer.inPoint);\n" +
    "var dur=mkD('SmoothText IN'," + dur + ");\n" +
    "var stag=" + stag + ";\n" +
    "var p=dur<=0?1:(time-start-i*stag)/dur;\n" +
    "if(p<0)p=0;if(p>1)p=1;\n" +
    "var e=" + easingCall(state.easing) + ";\n" +
    "((1-e)*100);"; // El Expression Selector de AE trabaja en 0..100 (%)
}

// Selector de SALIDA: amount 0 antes de salir, 1 en pose de salida.
// El tiempo de inicio y la duración se leen del marcador "SmoothText OUT".
function outSelectorExpr() {
  const inDur = (state.duration / 1000).toFixed(4);
  const inStag = (state.stagger / 1000).toFixed(4);
  const hold = (state.hold / 1000).toFixed(4);
  const exDur = (state.exitDuration / 1000).toFixed(4);
  const exStag = (state.exitStagger / 1000).toFixed(4);
  return EASE_HELPERS + MARKER_HELPERS +
    "var i=textIndex-1;\n" +
    "var fallback=thisLayer.inPoint+" + inDur + "+(textTotal-1)*" + inStag + "+" + hold + ";\n" +
    "var start=mkT('SmoothText OUT',fallback);\n" +
    "var dur=mkD('SmoothText OUT'," + exDur + ");\n" +
    "var stag=" + exStag + ";\n" +
    "var p=dur<=0?1:(time-start-i*stag)/dur;\n" +
    "if(p<0)p=0;if(p>1)p=1;\n" +
    "var e=" + easingCall(state.exitEasing) + ";\n" +
    "(e*100);"; // El Expression Selector de AE trabaja en 0..100 (%)
}

function buildAEPayload() {
  const d = dirVec(state.direction);
  const tx = state.offsetX + d.x * state.distance;
  const ty = state.offsetY + d.y * state.distance;

  const inVals = {
    expr: inSelectorExpr(),
    position: [r2(tx), r2(ty)],
    scale: [state.scale, state.scale],
    rotation: state.rotation,
    opacity: state.opacity,
    blur: [state.blur, state.blur],
    tracking: state.tracking,
  };

  let exit = null;
  if (state.exitMode !== "off") {
    let px, py, sc, ro, op, bl;
    if (state.exitMode === "mirror") {
      px = tx; py = ty; sc = state.scale; ro = state.rotation; op = state.opacity; bl = state.blur;
    } else if (state.exitMode === "clone") {
      px = -tx; py = -ty; sc = state.scale; ro = state.rotation; op = state.opacity; bl = state.blur;
    } else { // custom
      const ed = dirVec(state.exitDirection);
      px = state.exitOffsetX + ed.x * state.exitDistance;
      py = state.exitOffsetY + ed.y * state.exitDistance;
      sc = state.exitScale; ro = state.exitRotation; op = state.exitOpacity; bl = state.exitBlur;
    }
    exit = {
      expr: outSelectorExpr(),
      position: [r2(px), r2(py)],
      scale: [sc, sc],
      rotation: ro,
      opacity: op,
      blur: [bl, bl],
      tracking: state.tracking,
    };
  }

  // Marcadores IN/OUT (tiempos relativos al inPoint de la capa, en segundos)
  const inDurSec = state.duration / 1000;
  const stagSec = state.stagger / 1000;
  const unitCount = (typeof units !== "undefined" && units.length) ? units.length : 1;
  const entranceTotalSec = inDurSec + (unitCount - 1) * stagSec;
  const markers = {
    "in": { time: 0, dur: r2(inDurSec) },
    out: exit ? { time: r2(entranceTotalSec + state.hold / 1000), dur: r2(state.exitDuration / 1000) } : null,
  };

  return {
    text: state.text,
    fontSize: state.fontSize,
    fill: hexToRgb01(state.textColor),
    align: state.align,
    animateBy: state.animateBy,
    "in": inVals,
    exit: exit,
    markers: markers,
  };
}

// Carga el JSX host fresco (para que los cambios se apliquen sin reiniciar AE)
function loadHostJSX(done) {
  if (!cs) { done(); return; }
  try {
    const ext = cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
    cs.evalScript('$.evalFile("' + ext + '/host/SmoothText.jsx")', () => done());
  } catch (e) { done(); }
}

function applyToAE() {
  if (!cs) { showToast("Abre el panel dentro de After Effects para aplicar a la línea de tiempo"); return; }
  const payload = buildAEPayload();
  const call = "SmoothText_apply(" + JSON.stringify(payload) + ")";
  loadHostJSX(() => {
    cs.evalScript(call, (res) => {
      if (res && res.indexOf("OK") === 0) showToast("✓ " + res);
      else if (res === "" || res === "undefined") showToast("✓ Aplicado");
      else showToast(String(res));
    });
  });
}

// ============================================================
//  Copiar / Pegar ajustes (portátiles entre capas, paneles o equipos)
// ============================================================

// Feedback visual en un botón: texto temporal "✓ …" y clase de éxito.
function flashButton(btn, msg, ms) {
  if (!btn) return;
  if (btn._flashTimer) clearTimeout(btn._flashTimer);
  else btn._flashOrig = btn.textContent;
  btn.textContent = msg;
  btn.classList.add("flash-ok");
  btn._flashTimer = setTimeout(function () {
    btn.textContent = btn._flashOrig;
    btn.classList.remove("flash-ok");
    btn._flashTimer = null;
  }, ms || 1200);
}

// Config portátil = animación (entrada+salida) + texto + estilo.
function exportConfig() {
  return {
    __smoothtext: 1, v: 1,
    settings: captureSettings(),
    text: state.text,
    style: {
      fontSize: state.fontSize, fontWeight: state.fontWeight, fontFamily: state.fontFamily,
      align: state.align, textColor: state.textColor, bgColor: state.bgColor,
    },
  };
}

function applyImportedConfig(obj) {
  if (obj.settings) ANIM_KEYS.forEach(function (k) { if (k in obj.settings) state[k] = obj.settings[k]; });
  if (typeof obj.text === "string") {
    state.text = obj.text;
    var ti = document.getElementById("textInput"); if (ti) ti.value = obj.text;
  }
  if (obj.style) {
    ["fontSize", "fontWeight", "fontFamily", "align", "textColor", "bgColor"].forEach(function (k) {
      if (k in obj.style) state[k] = obj.style[k];
    });
  }
  syncUI();
  // Campos de estilo que syncUI no cubre
  var ff = document.getElementById("fontFamily"); if (ff) ff.value = state.fontFamily;
  var tc = document.getElementById("textColor"); if (tc) tc.value = state.textColor;
  var bc = document.getElementById("bgColor"); if (bc) bc.value = state.bgColor;
  buildUnits();
  applyStyles();
  play();
}

// ---- Portapapeles: robusto dentro de AE (Node) y en navegador (web) ----
function execCopy(s) {
  try {
    var ta = document.createElement("textarea");
    ta.value = s; ta.style.position = "fixed"; ta.style.top = "-1000px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    var ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
  } catch (e) { return false; }
}
function clipboardWrite(text) {
  var s = String(text);
  return new Promise(function (resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).then(function () { resolve(true); }, function () { resolve(execCopy(s)); });
    } else { resolve(execCopy(s)); }
  });
}
function readClipboardNode() {
  try {
    var execSync = require("child_process").execSync;
    if (process.platform === "darwin") return String(execSync("pbpaste", { timeout: 15000 }));
    return String(execSync('powershell -NoProfile -Command "[Console]::Out.Write((Get-Clipboard -Raw))"', { timeout: 15000, windowsHide: true }));
  } catch (e) { return null; }
}
function promptPaste() {
  try { return window.prompt("Pega aquí los ajustes copiados de SmoothText:") || ""; }
  catch (e) { return ""; }
}
function clipboardRead() {
  return new Promise(function (resolve) {
    if (isCEP) { var v = readClipboardNode(); if (v != null && v !== "") { resolve(v); return; } }
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { resolve(t); }, function () { resolve(promptPaste()); });
      return;
    }
    resolve(promptPaste());
  });
}

function doCopySettings(btn) {
  clipboardWrite(JSON.stringify(exportConfig())).then(function (ok) {
    if (ok) { showToast("✓ Ajustes copiados — pégalos en otro SmoothText"); flashButton(btn, "✓ Copiado"); }
    else showToast("No se pudo copiar al portapapeles");
  });
}
function doPasteSettings(btn) {
  clipboardRead().then(function (txt) {
    txt = (txt || "").trim();
    if (!txt) { showToast("Portapapeles vacío"); return; }
    var obj = null; try { obj = JSON.parse(txt); } catch (e) { obj = null; }
    if (!obj || obj.__smoothtext !== 1) { showToast("El portapapeles no tiene ajustes de SmoothText"); return; }
    applyImportedConfig(obj);
    showToast("✓ Ajustes aplicados");
    flashButton(btn, "✓ Pegado");
  });
}

// ---------- Init ----------
function init() {
  syncUI();
  buildUnits();
  applyStyles();

  bindSegmented("animateBy", "animateBy", { rebuild: true });
  bindSegmented("direction", "direction");
  bindSegmented("align", "align", { style: true });
  bindTabs();
  renderPresets();

  // Guardar ajustes actuales como preset propio (entrada + salida)
  const presetNameInput = document.getElementById("presetName");
  const trySave = () => {
    if (saveCurrentPreset(presetNameInput.value)) {
      presetNameInput.value = "";
      flashButton(document.getElementById("savePreset"), "✓ Guardado", 1300);
    }
  };
  document.getElementById("savePreset").addEventListener("click", trySave);
  presetNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); trySave(); } });

  // texto
  document.getElementById("textInput").addEventListener("input", (e) => {
    state.text = e.target.value;
    buildUnits();
    showFromPose();
  });
  document.getElementById("textInput").addEventListener("change", play);

  // easing
  document.getElementById("easing").addEventListener("change", (e) => {
    state.easing = e.target.value;
    document.getElementById("elasticGroup").hidden = state.easing !== "elastic";
    play();
  });

  // exit
  document.getElementById("exitMode").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.exitMode = btn.dataset.val;
    setSeg("exitMode", state.exitMode);
    updateExitVisibility();
    play();
  });
  document.getElementById("exitDirection").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.exitDirection = btn.dataset.val;
    setSeg("exitDirection", state.exitDirection);
    showExitPose();
  });
  document.getElementById("exitEasing").addEventListener("change", (e) => {
    state.exitEasing = e.target.value;
    play();
  });

  // estilo (selects / colores)
  document.getElementById("fontWeight").addEventListener("change", (e) => { state.fontWeight = e.target.value; applyStyles(); });
  document.getElementById("fontFamily").addEventListener("change", (e) => { state.fontFamily = e.target.value; applyStyles(); });
  document.getElementById("textColor").addEventListener("input", (e) => { state.textColor = e.target.value; applyStyles(); });
  document.getElementById("bgColor").addEventListener("input", (e) => { state.bgColor = e.target.value; if (!canvas.classList.contains("checker")) applyStyles(); });

  // toggles
  document.getElementById("checkerboard").addEventListener("change", (e) => {
    canvas.classList.toggle("checker", e.target.checked);
    applyStyles();
  });
  document.getElementById("loop").addEventListener("change", (e) => {
    state.loop = e.target.checked;
    if (state.loop) play(); else cancelLoop();
  });

  // more
  document.getElementById("moreToggle").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    document.getElementById("moreSliders").hidden = open;
  });

  // botones
  document.getElementById("replay").addEventListener("click", play);
  const applyBtn = document.getElementById("applyBtn");
  if (isCEP) {
    applyBtn.textContent = "Apply to AE";
    applyBtn.title = "Crea la capa de texto animada en la composición activa";
    applyBtn.addEventListener("click", applyToAE);
  } else {
    applyBtn.textContent = "Apply (preview)";
    applyBtn.addEventListener("click", play);
  }
  document.getElementById("copyConfig").addEventListener("click", (e) => doCopySettings(e.currentTarget));
  const pasteBtn = document.getElementById("pasteConfig");
  if (pasteBtn) pasteBtn.addEventListener("click", (e) => doPasteSettings(e.currentTarget));

  // atajo: barra espaciadora = replay
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
      e.preventDefault(); play();
    }
  });

  // primera reproducción
  play();
}

init();
