// Neural network playground for "Can a Neural Net Learn It?"
//
// Trains a small ReLU MLP (tf.js) to fit f(x) on [-1, 1] with MSE loss and
// redraws the fit after every epoch. f(x) is parsed with math.js.
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
const N_PLOT  = 600;

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
let model      = null;
let isTraining = false;
let epoch      = 0;
let needRebuild = true;

// ── DOM ──────────────────────────────────────────────────────────────────────
const fnSelect    = document.getElementById('nn-fn-select');
const fnInput     = document.getElementById('nn-fn-input');
const archInput   = document.getElementById('nn-arch-input');
const trainBtn    = document.getElementById('nn-train');
const resetBtn    = document.getElementById('nn-reset');
const copyLinkBtn = document.getElementById('nn-copy-link');
const epochVal    = document.getElementById('nn-epoch');
const lossVal     = document.getElementById('nn-loss');

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

// ── Training data ────────────────────────────────────────────────────────────
function sampleBatch(fn) {
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
  return { xs, ys, ok: xs.length > 0 };
}

// ── Model ────────────────────────────────────────────────────────────────────
function buildModel(archStr) {
  if (model) { model.dispose(); model = null; }

  let sizes = archStr.trim().split(/\s+/)
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0);
  if (sizes.length === 0) sizes = [32, 32];

  const m = tf.sequential();
  m.add(tf.layers.dense({
    inputShape: [1], units: sizes[0],
    activation: 'relu', kernelInitializer: 'heNormal'
  }));
  for (let i = 1; i < sizes.length; i++) {
    m.add(tf.layers.dense({
      units: sizes[i], activation: 'relu', kernelInitializer: 'heNormal'
    }));
  }
  m.add(tf.layers.dense({ units: 1, activation: 'linear' }));
  m.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  return m;
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
      const x = X0 + (X1 - X0) * i / N_PLOT;
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
  if (model) {
    const xs = [];
    for (let i = 0; i <= N_PLOT; i++) xs.push(X0 + (X1 - X0) * i / N_PLOT);

    const inp = tf.tensor2d(xs, [xs.length, 1]);
    const out = model.predict(inp);
    const ys  = out.dataSync();
    inp.dispose(); out.dispose();

    ctx.strokeStyle = COLOR_NET;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N_PLOT; i++) {
      i === 0 ? ctx.moveTo(cx(xs[i]), cy(ys[i])) : ctx.lineTo(cx(xs[i]), cy(ys[i]));
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
async function startTraining() {
  const fn = getTargetFn();
  if (!fn) { alert('Please enter a valid function.'); return; }

  if (needRebuild || !model) {
    model = buildModel(archInput.value);
    epoch = 0;
    epochVal.textContent = '0';
    lossVal.textContent = '—';
    needRebuild = false;
  }

  isTraining = true;
  trainBtn.textContent = 'stop';

  while (isTraining) {
    const { xs, ys, ok } = sampleBatch(fn);
    if (!ok) { alert('Function produced no finite values on [−1, 1].'); break; }
    const txs = tf.tensor2d(xs, [xs.length, 1]);
    const tys = tf.tensor2d(ys, [ys.length, 1]);
    const h = await model.fit(txs, tys, {
      epochs: 1, batchSize: 64, shuffle: true, verbose: 0
    });
    txs.dispose(); tys.dispose();
    epoch++;
    const loss = h.history.loss[0];
    epochVal.textContent = epoch;
    lossVal.textContent  = loss < 0.0001
      ? loss.toExponential(2)
      : loss.toFixed(5);
    draw();
    await tf.nextFrame();
  }

  trainBtn.textContent = 'train';
}

function reset() {
  isTraining = false;
  if (model) { model.dispose(); model = null; }
  epoch = 0;
  epochVal.textContent = '0';
  lossVal.textContent  = '—';
  needRebuild = true;
  draw();
}

// ── Event listeners ───────────────────────────────────────────────────────────
trainBtn.addEventListener('click', () => {
  isTraining ? (isTraining = false) : startTraining();
});

resetBtn.addEventListener('click', reset);

fnSelect.addEventListener('change', () => {
  fnInput.value = fnSelect.value;
  reset();
});

fnInput.addEventListener('change', reset);
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
draw();

})();
