// Neural network playground for "Can a Neural Net Learn It?"
//
// Fits a small ReLU MLP to f(x) on [-1, 1] with MSE loss, redrawing the fit
// every frame. f(x) is parsed with math.js; the network itself runs in a
// hand-rolled Rust/wasm module (nn-train.wasm, ~38 KB) that replaced
// TensorFlow.js — 1.5 MB of JS that was far too slow on phones for a net this
// small. Crate source: can_a_neural_net_learn/neural_net_wasm/nn_train.
//
// Division of work: JS samples the target function and draws; wasm owns the
// training set, the plot inputs, the weights and the predictions. Per frame
// exactly one call crosses the boundary (`run`), returning the loss; the
// predictions are read in place through a view over wasm memory.
//
// Colors:
//   target function  #55ef53  (green)
//   neural network   #0091df  (blue)
//   background       #2f3033  (set on .nn-playground)

(() => {

// ── Constants ────────────────────────────────────────────────────────────────
const PAD    = 48;   // padding for axis labels
const X0 = -1, X1 = 1, Y0 = -1, Y1 = 1;
const N_TRAIN = 1000;
const N_PLOT  = 600;          // plot segments; N_PLOT + 1 points
const LEARNING_RATE = 0.001;  // Adam
const MAX_PARAMS = 2_000_000; // refuse architectures that would exhaust memory
const WASM_URL = '/data/nn-train.wasm';

// Training steps run per animation frame, adapted to fill FRAME_BUDGET_MS. One
// step is a full-batch pass over all N_TRAIN samples.
const FRAME_BUDGET_MS = 10;
const MAX_STEPS_PER_FRAME = 4096;

const COLOR_GRID   = '#3a3a3d';
const COLOR_AXIS   = '#5b5c62';
const COLOR_BORDER = '#4a4b50';
const COLOR_TICK   = '#ffffff';
const COLOR_TARGET = '#55ef53';
const COLOR_NET    = '#0091df';

// ── Canvas setup (HiDPI aware, fills container) ───────────────────────────────
const canvas    = document.getElementById('nn-canvas');
const ctx       = canvas.getContext('2d');
const graphArea = canvas.parentElement;
const DPR       = window.devicePixelRatio || 1;

// Returns current logical dimensions
function logicalW() { return canvas.clientWidth; }
function logicalH() { return canvas.clientHeight; }

function resizeCanvas() {
  canvas.width  = canvas.clientWidth  * DPR;
  canvas.height = canvas.clientHeight * DPR;
  ctx.scale(DPR, DPR);
}

new ResizeObserver(() => { resizeCanvas(); draw(); }).observe(graphArea);
resizeCanvas();

// ── State ────────────────────────────────────────────────────────────────────
let wasm       = null;   // module exports, null until the module loads
let hasModel   = false;
let hasData    = false;
let isTraining = false;
let epoch      = 0;
let needRebuild = true;
let stepsPerFrame = 1;

// Plot inputs, matching the points wasm evaluates in set_domain.
const plotXs = Array.from({ length: N_PLOT + 1 }, (_, i) => X0 + (X1 - X0) * i / N_PLOT);

// ── DOM ──────────────────────────────────────────────────────────────────────
const fnSelect    = document.getElementById('nn-fn-select');
const fnInput     = document.getElementById('nn-fn-input');
const archInput   = document.getElementById('nn-arch-input');
const trainBtn    = document.getElementById('nn-train');
const resetBtn    = document.getElementById('nn-reset');
const copyLinkBtn = document.getElementById('nn-copy-link');
const epochVal    = document.getElementById('nn-epoch');
const lossVal     = document.getElementById('nn-loss');

// ── wasm ─────────────────────────────────────────────────────────────────────
// Predictions live in wasm memory. Growing that memory detaches existing views,
// so the view is rebuilt whenever the buffer changes — which only happens while
// buffers are being allocated, never during a training step.
let predPtr = 0, predView = null, predBuffer = null;

function predictions() {
  if (!predView || predBuffer !== wasm.memory.buffer) {
    predBuffer = wasm.memory.buffer;
    predView = new Float32Array(predBuffer, predPtr, N_PLOT + 1);
  }
  return predView;
}

async function loadWasm() {
  const res = await fetch(WASM_URL);
  const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), {});
  wasm = instance.exports;
  predPtr = wasm.set_domain(X0, X1, N_PLOT + 1);
  predView = null;
  trainBtn.disabled = false;
  trainBtn.textContent = 'train';
  draw();
}

// Hidden layer sizes from the input box, e.g. "32 32".
function archSizes() {
  const sizes = archInput.value.trim().split(/\s+/)
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0);
  return sizes.length ? sizes : [32, 32];
}

// Weights plus biases for 1 -> sizes -> 1.
function paramCount(sizes) {
  const all = [1, ...sizes, 1];
  let total = 0;
  for (let i = 0; i + 1 < all.length; i++) total += all[i] * all[i + 1] + all[i + 1];
  return total;
}

function buildModel() {
  const sizes = archSizes();
  if (paramCount(sizes) > MAX_PARAMS) {
    alert(`That network has ${paramCount(sizes).toLocaleString()} parameters. ` +
          `Keep it under ${MAX_PARAMS.toLocaleString()}.`);
    return false;
  }
  const ptr = wasm.arch_buffer(sizes.length);
  new Int32Array(wasm.memory.buffer, ptr, sizes.length).set(sizes);
  wasm.init(sizes.length, LEARNING_RATE, (Math.random() * 2 ** 32) >>> 0);
  predView = null;   // arch_buffer/init may have grown memory
  hasModel = true;
  needRebuild = false;
  epoch = 0;
  stepsPerFrame = 1;
  epochVal.textContent = '0';
  lossVal.textContent = '—';
  return true;
}

// Samples the target function once per function change, straight into the
// training buffer wasm keeps: n inputs followed by n targets.
function loadTrainingData(fn) {
  const xs = [], ys = [];
  let attempts = 0;
  while (xs.length < N_TRAIN && attempts < N_TRAIN * 10) {
    attempts++;
    const x = X0 + Math.random() * (X1 - X0);
    try {
      const y = fn(x);
      if (Number.isFinite(y)) { xs.push(x); ys.push(y); }
    } catch (e) { /* skip */ }
  }
  if (!xs.length) return false;

  const ptr = wasm.train_buffer(xs.length);
  const buf = new Float32Array(wasm.memory.buffer, ptr, 2 * xs.length);
  buf.set(xs, 0);
  buf.set(ys, xs.length);
  predView = null;   // train_buffer may have grown memory
  hasData = true;
  return true;
}

// ── Coordinate helpers ───────────────────────────────────────────────────────
// Plot area fills the full canvas minus padding for axis labels
function plotRect() {
  const W = logicalW(), H = logicalH();
  return { left: PAD, top: PAD / 2, width: W - PAD * 1.5, height: H - PAD * 1.25 };
}
function cx(x) { const { left, width  } = plotRect(); return left + (x - X0) / (X1 - X0) * width;  }
function cy(y) { const { top,  height } = plotRect(); return top  + (1 - (y - Y0) / (Y1 - Y0)) * height; }

// ── Target function ──────────────────────────────────────────────────────────
function getTargetFn() {
  const expr = fnInput.value.trim();
  if (!expr) return null;
  try {
    const compiled = math.compile(expr);
    const fn = x => compiled.evaluate({ x });
    const probe = fn(0.5);  // validate it runs
    if (typeof probe !== 'number') return null;
    return fn;
  } catch (e) { return null; }
}

// ── Drawing ──────────────────────────────────────────────────────────────────
function draw() {
  const W = logicalW(), H = logicalH();
  const { left, top, width, height } = plotRect();

  ctx.clearRect(0, 0, W, H);

  // Minor grid
  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 1;
  for (const v of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
    ctx.beginPath(); ctx.moveTo(cx(v), top); ctx.lineTo(cx(v), top + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, cy(v)); ctx.lineTo(left + width, cy(v)); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = COLOR_AXIS;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx(0), top); ctx.lineTo(cx(0), top + height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(left, cy(0)); ctx.lineTo(left + width, cy(0)); ctx.stroke();

  // Axis tick labels
  ctx.fillStyle = COLOR_TICK;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const v of [-1, -0.5, 0, 0.5, 1]) {
    ctx.fillText(v, cx(v), top + height + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [-1, -0.5, 0, 0.5, 1]) {
    ctx.fillText(v, left - 7, cy(v));
  }

  // Clip to plot area for function curves
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();

  // ── Target function (green) ────────────────────────────────────────
  const fn = getTargetFn();
  if (fn) {
    ctx.strokeStyle = COLOR_TARGET;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let penDown = false;
    let prevY = null;
    for (let i = 0; i <= N_PLOT; i++) {
      const x = plotXs[i];
      let y;
      try { y = fn(x); } catch (e) { y = NaN; }

      if (Number.isFinite(y)) {
        // Break path on large discontinuities (e.g. step function)
        if (prevY !== null && Math.abs(y - prevY) > 1.5) {
          ctx.stroke(); ctx.beginPath(); penDown = false;
        }
        penDown ? ctx.lineTo(cx(x), cy(y)) : ctx.moveTo(cx(x), cy(y));
        penDown = true;
        prevY = y;
      } else {
        ctx.stroke(); ctx.beginPath(); penDown = false; prevY = null;
      }
    }
    ctx.stroke();
  }

  // ── Neural network prediction (blue) ──────────────────────────────
  // Read straight out of wasm memory; nothing is copied per frame.
  if (wasm && hasModel) {
    const ys = predictions();
    ctx.strokeStyle = COLOR_NET;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N_PLOT; i++) {
      i === 0 ? ctx.moveTo(cx(plotXs[i]), cy(ys[i])) : ctx.lineTo(cx(plotXs[i]), cy(ys[i]));
    }
    ctx.stroke();
  }

  ctx.restore();

  // Plot border
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
}

// ── Training loop ─────────────────────────────────────────────────────────────
const nextFrame = () => new Promise(requestAnimationFrame);

async function startTraining() {
  if (!wasm) return;
  const fn = getTargetFn();
  if (!fn) { alert('Please enter a valid function.'); return; }

  if (!hasData && !loadTrainingData(fn)) {
    alert('Function produced no finite values on [−1, 1].');
    return;
  }
  if ((needRebuild || !hasModel) && !buildModel()) return;

  isTraining = true;
  trainBtn.textContent = 'stop';

  while (isTraining) {
    const started = performance.now();
    const loss = wasm.run(stepsPerFrame);
    const elapsed = performance.now() - started;

    epoch += stepsPerFrame;
    epochVal.textContent = epoch;
    lossVal.textContent = loss < 0.0001 ? loss.toExponential(2) : loss.toFixed(5);
    draw();

    // Aim at FRAME_BUDGET_MS of training per frame, at most doubling each time
    // so the rate settles instead of oscillating.
    const scale = Math.min(2, FRAME_BUDGET_MS / Math.max(elapsed, 0.05));
    stepsPerFrame = Math.max(1, Math.min(MAX_STEPS_PER_FRAME, Math.round(stepsPerFrame * scale)));

    await nextFrame();
  }

  trainBtn.textContent = 'train';
}

// Drops the trained weights. The target function stays; its samples are reloaded
// on the next train, since they are what the model is rebuilt against.
function reset() {
  isTraining = false;
  hasModel = false;
  needRebuild = true;
  epoch = 0;
  epochVal.textContent = '0';
  lossVal.textContent  = '—';
  draw();
}

// ── Event listeners ───────────────────────────────────────────────────────────
trainBtn.addEventListener('click', () => {
  isTraining ? (isTraining = false) : startTraining();
});

resetBtn.addEventListener('click', reset);

fnSelect.addEventListener('change', () => {
  fnInput.value = fnSelect.value;
  hasData = false;
  reset();
});

fnInput.addEventListener('change', () => { hasData = false; reset(); });
archInput.addEventListener('change', () => { needRebuild = true; });

// ── Share via URL ─────────────────────────────────────────────────────────────
function encodeState() {
  return btoa(JSON.stringify({ fn: fnInput.value.trim(), arch: archInput.value.trim() }));
}

function syncURL() {
  const url = new URL(location.href);
  url.searchParams.set('s', encodeState());
  url.hash = 'nn-playground';  // shared links scroll to the demo
  history.replaceState(null, '', url);
}

function loadFromURL() {
  const param = new URLSearchParams(location.search).get('s');
  if (!param) return;
  try {
    const { fn, arch } = JSON.parse(atob(param));
    if (fn)   fnInput.value   = fn;
    if (arch) archInput.value = arch;
    // sync dropdown selection if it matches
    const match = [...fnSelect.options].find(o => o.value === fn);
    if (match) fnSelect.value = match.value;
  } catch (e) { /* ignore malformed param */ }
}

copyLinkBtn.addEventListener('click', () => {
  syncURL();
  navigator.clipboard.writeText(location.href).then(() => {
    copyLinkBtn.textContent = 'copied!';
    setTimeout(() => { copyLinkBtn.textContent = 'copy link'; }, 1500);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadFromURL();
trainBtn.disabled = true;
trainBtn.textContent = 'loading…';
draw();
loadWasm().catch(e => {
  console.error('neural net demo failed to load', e);
  trainBtn.textContent = 'unavailable';
});

})();
