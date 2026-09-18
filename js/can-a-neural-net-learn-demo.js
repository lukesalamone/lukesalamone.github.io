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

// Network diagram
const NET_PAD = 34;           // side room for the input/output labels
const CIRCLE_LIMIT = 32;      // taller layers draw as a strip of cells
const EDGE_BUDGET = 700;      // strongest weights drawn on a wide canvas
const NET_REDRAW_MS = 120;    // the diagram redraws on a timer, not every frame

const COLOR_GRID   = '#3a3a3d';
const COLOR_AXIS   = '#5b5c62';
const COLOR_BORDER = '#4a4b50';
const COLOR_TICK   = '#ffffff';
const COLOR_TARGET = '#55ef53';
const COLOR_NET    = '#0091df';
const COLOR_NODE   = '#2f3033';
const COLOR_NODE_EDGE = '#a9a9b3';
const COLOR_UNTRAINED = 'rgba(169, 169, 179, 0.35)';

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

const netCanvas = document.getElementById('nn-net-canvas');
const netCtx    = netCanvas.getContext('2d');
const netArea   = netCanvas.parentElement;

function resizeNetCanvas() {
  netCanvas.width  = netCanvas.clientWidth  * DPR;
  netCanvas.height = netCanvas.clientHeight * DPR;
  netCtx.scale(DPR, DPR);
}

new ResizeObserver(() => { resizeCanvas(); draw(); }).observe(graphArea);
new ResizeObserver(() => { resizeNetCanvas(); drawNet(); }).observe(netArea);
resizeCanvas();
resizeNetCanvas();

// ── State ────────────────────────────────────────────────────────────────────
let wasm       = null;   // module exports, null until the module loads
let hasModel   = false;
let hasData    = false;
let isTraining = false;
let epoch      = 0;
let needRebuild = true;
let stepsPerFrame = 1;
let lastNetDraw = 0;
// Until the first training step there is nothing worth showing: an untrained net
// draws a meaningless curve, and coloring random weights implies they mean
// something. So the chart hides its curve and the diagram draws grey.
let trained = false;

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
const netLegend   = document.querySelector('.nn-net-legend');
const netMin      = document.getElementById('nn-net-min');
const netMax      = document.getElementById('nn-net-max');
const netCaption  = document.getElementById('nn-net-caption');

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
  setTrainButton('ready');
  buildModel(true);   // so the page opens on a drawn network, not a blank panel
  draw();
  drawNet();
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

// `silent` skips the size warning for rebuilds the user did not ask for, such
// as the one on page load.
function buildModel(silent) {
  const sizes = archSizes();
  if (paramCount(sizes) > MAX_PARAMS) {
    if (!silent) {
      alert(`That network has ${paramCount(sizes).toLocaleString()} parameters. ` +
            `Keep it under ${MAX_PARAMS.toLocaleString()}.`);
    }
    hasModel = false;
    layers = [];
    return false;
  }
  const ptr = wasm.arch_buffer(sizes.length);
  new Int32Array(wasm.memory.buffer, ptr, sizes.length).set(sizes);
  wasm.init(sizes.length, LEARNING_RATE, (Math.random() * 2 ** 32) >>> 0);
  predView = null;   // arch_buffer/init may have grown memory
  refreshLayers();
  hasModel = true;
  needRebuild = false;
  trained = false;
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
// f(x) over the plot points, cached: re-running a math.js expression 601 times
// per frame cost more than the training step it was drawn beside.
let targetYs = null;

function refreshTarget() {
  const fn = getTargetFn();
  targetYs = !fn ? null : plotXs.map(x => {
    try {
      const y = fn(x);
      return Number.isFinite(y) ? y : NaN;
    } catch (e) { return NaN; }
  });
}

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
  if (targetYs) {
    ctx.strokeStyle = COLOR_TARGET;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let penDown = false;
    let prevY = null;
    for (let i = 0; i <= N_PLOT; i++) {
      const x = plotXs[i];
      const y = targetYs[i];

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
  // Read straight out of wasm memory; nothing is copied per frame. Before the
  // first training step there is no fit to show, only random initial weights.
  if (wasm && hasModel && trained) {
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

// ── Network diagram ──────────────────────────────────────────────────────────
// Layout and edge budget follow the mnist_visualizer diagram: every unit is
// drawn (circles, or a strip of cells once a layer is too tall for circles) and
// only the strongest edges are stroked, which keeps a 32x32 net legible.
//
// Weights are read in place, like the predictions: one Float32Array per layer
// over wasm memory, rebuilt only when the network is rebuilt.
let layers = [];        // [{ nIn, nOut, w }]
let layersBuffer = null;
let netGeom = null;

function refreshLayers() {
  layers = [];
  const count = wasm.layer_count();
  for (let l = 0; l < count; l++) {
    const nIn = wasm.layer_in(l), nOut = wasm.layer_out(l);
    layers.push({ nIn, nOut, w: new Float32Array(wasm.memory.buffer, wasm.weights_ptr(l), nIn * nOut) });
  }
  layersBuffer = wasm.memory.buffer;
  netGeom = null;
}

// matplotlib's "cool" colormap: cyan at 0, magenta at 1, linear in RGB.
function cool(t, alpha) {
  const c = Math.max(0, Math.min(1, t));
  return `rgba(${Math.round(255 * c)}, ${Math.round(255 * (1 - c))}, 255, ${alpha})`;
}

// Node positions per column: circles while they fit, otherwise a strip of cells
// so even a 128-unit layer shows every unit.
function computeNetGeometry(W, H, sizes) {
  const padTop = 12, padBottom = 22;
  const usableH = H - padTop - padBottom;
  const cols = sizes.length;
  const columns = [];

  for (let c = 0; c < cols; c++) {
    const n = sizes[c];
    const x = cols === 1 ? W / 2 : NET_PAD + (W - 2 * NET_PAD) * c / (cols - 1);
    const nodes = [];
    if (n <= CIRCLE_LIMIT) {
      const spacing = Math.min(usableH / n, 44);
      const r = Math.max(2.5, Math.min(11, spacing * 0.34));
      const top = padTop + (usableH - spacing * n) / 2;
      for (let k = 0; k < n; k++) nodes.push({ x, y: top + spacing * (k + 0.5), off: r, r, cell: false });
    } else {
      const cellH = Math.max(1.5, Math.min(12, usableH / n));
      const cellW = Math.max(8, Math.min(16, cellH * 2.4));
      const top = padTop + (usableH - cellH * n) / 2;
      for (let k = 0; k < n; k++) {
        nodes.push({ x, y: top + cellH * (k + 0.5), off: cellW / 2, cell: true,
                     w: cellW, h: Math.max(1.2, cellH - 1) });
      }
    }
    columns.push({ n, x, nodes, labelY: padTop + usableH + 6 });
  }
  return { W, H, columns, sig: sizes.join(), stride: cols > 1 ? (W - 2 * NET_PAD) / (cols - 1) : W };
}

// The strongest edges, by |weight|, split evenly between the gaps. Returns the
// kept edges plus how many there were in total.
function strongestEdges(budget) {
  // An even split wastes the share of gaps too small to use it — 1 -> 32 has
  // only 32 edges — so hand what they cannot use to the gaps that can.
  const counts = layers.map(l => l.w.length);
  const total = counts.reduce((a, b) => a + b, 0);
  const quota = new Array(layers.length).fill(0);
  let left = budget;
  let claimants = layers.length;
  while (left > 0 && claimants > 0) {
    const share = Math.max(1, Math.floor(left / claimants));
    claimants = 0;
    for (let g = 0; g < layers.length && left > 0; g++) {
      const room = counts[g] - quota[g];
      if (room <= 0) continue;
      const take = Math.min(room, share, left);
      quota[g] += take;
      left -= take;
      if (counts[g] > quota[g]) claimants++;
    }
  }

  const edges = [];
  for (let g = 0; g < layers.length; g++) {
    const layer = layers[g];
    const perGap = quota[g];
    if (perGap === 0) continue;
    const cand = [];
    for (let i = 0; i < layer.nIn; i++) {
      const base = i * layer.nOut;
      for (let o = 0; o < layer.nOut; o++) {
        const w = layer.w[base + o];
        if (w !== 0) cand.push({ g, i, o, w, m: Math.abs(w) });
      }
    }
    cand.sort((p, q) => q.m - p.m);
    const keep = cand.slice(0, perGap);
    // Normalize width and opacity within the gap so later layers stay visible
    // even when their weights are smaller than the first layer's.
    const max = keep.length ? keep[0].m : 1;
    for (const e of keep) { e.norm = e.m / max; edges.push(e); }
  }
  return { edges, total };
}

function drawNet() {
  const W = netCanvas.clientWidth, H = netCanvas.clientHeight;
  netCtx.clearRect(0, 0, W, H);
  if (!wasm || !hasModel || !layers.length) return;
  if (layersBuffer !== wasm.memory.buffer) refreshLayers();

  // Columns: layer 0's inputs, then every layer's outputs.
  const sizes = [layers[0].nIn, ...layers.map(l => l.nOut)];
  const sig = sizes.join();
  if (!netGeom || netGeom.W !== W || netGeom.H !== H || netGeom.sig !== sig) {
    netGeom = computeNetGeometry(W, H, sizes);
  }
  const { columns } = netGeom;

  // One color scale for every edge, so colors compare across layers and match
  // the legend.
  let maxAbs = 0;
  for (const layer of layers) {
    for (let i = 0; i < layer.w.length; i++) {
      const a = Math.abs(layer.w[i]);
      if (a > maxAbs) maxAbs = a;
    }
  }
  if (!(maxAbs > 0)) maxAbs = 1;

  // Edges first, so nodes sit on top of them.
  // Roughly one edge per pixel of width: a phone-width canvas has no room for
  // 700 of them, and drawing them is the most expensive thing on the page.
  const budget = Math.max(200, Math.min(EDGE_BUDGET, Math.round(W)));
  const { edges, total } = strongestEdges(budget);
  netCtx.lineCap = 'round';
  for (const e of edges) {
    const from = columns[e.g].nodes[e.i];
    const to = columns[e.g + 1].nodes[e.o];
    if (!from || !to) continue;
    if (trained) {
      netCtx.strokeStyle = cool((e.w + maxAbs) / (2 * maxAbs), 0.1 + 0.7 * e.norm);
      netCtx.lineWidth = 0.4 + 2.0 * e.norm ** 0.8;
    } else {
      netCtx.strokeStyle = COLOR_UNTRAINED;
      netCtx.lineWidth = 0.8;
    }
    netCtx.beginPath();
    netCtx.moveTo(from.x + from.off, from.y);
    netCtx.lineTo(to.x - to.off, to.y);
    netCtx.stroke();
  }

  // Units.
  netCtx.fillStyle = COLOR_NODE;
  netCtx.strokeStyle = COLOR_NODE_EDGE;
  netCtx.lineWidth = 1;
  for (const col of columns) {
    for (const node of col.nodes) {
      if (node.cell) {
        netCtx.fillRect(node.x - node.w / 2, node.y - node.h / 2, node.w, node.h);
        netCtx.strokeRect(node.x - node.w / 2, node.y - node.h / 2, node.w, node.h);
      } else {
        netCtx.beginPath();
        netCtx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        netCtx.fill();
        netCtx.stroke();
      }
    }
  }

  // Column labels: "input · 1", "hidden 1 · 32", "output · 1", or just the unit
  // count where the full label would not fit.
  netCtx.fillStyle = '#73747b';
  netCtx.font = '10px monospace';
  netCtx.textAlign = 'center';
  netCtx.textBaseline = 'top';
  for (let c = 0; c < columns.length; c++) {
    const name = c === 0 ? 'input' : c === columns.length - 1 ? 'output' : `hidden ${c}`;
    const full = `${name} · ${columns[c].n}`;
    const label = netCtx.measureText(full).width < netGeom.stride - 6 ? full : String(columns[c].n);
    // Keep the end labels inside the canvas instead of letting them clip.
    const half = netCtx.measureText(label).width / 2;
    const x = Math.max(half + 2, Math.min(W - half - 2, columns[c].x));
    netCtx.fillText(label, x, columns[c].labelY);
  }

  const dropped = edges.length < total;
  netLegend.classList.toggle('is-untrained', !trained);
  netMin.textContent = trained ? (-maxAbs).toFixed(2) : '';
  netMax.textContent = trained ? '+' + maxAbs.toFixed(2) : '';
  netCaption.textContent = trained
    ? (dropped ? `weight · strongest ${edges.length.toLocaleString()} of ${total.toLocaleString()}` : 'weight')
    : (dropped ? `untrained · ${edges.length.toLocaleString()} of ${total.toLocaleString()} weights` : 'untrained');
}

// ── Training loop ─────────────────────────────────────────────────────────────
const nextFrame = () => new Promise(requestAnimationFrame);

// 'loading' | 'ready' | 'training'. Green says "press me"; it drops back to the
// default button while training, when the action is "stop".
function setTrainButton(state) {
  trainBtn.disabled = state === 'loading';
  trainBtn.textContent = state === 'loading' ? 'loading…' : state === 'training' ? 'stop' : 'train';
  trainBtn.classList.toggle('nn-go', state === 'ready');
}

async function startTraining() {
  if (!wasm) return;
  const fn = getTargetFn();
  if (!fn) { alert('Please enter a valid function.'); return; }

  if (!hasData && !loadTrainingData(fn)) {
    alert('Function produced no finite values on [−1, 1].');
    return;
  }
  if ((needRebuild || !hasModel) && !buildModel()) return;
  drawNet();

  isTraining = true;
  trained = true;
  setTrainButton('training');

  while (isTraining) {
    const started = performance.now();
    const loss = wasm.run(stepsPerFrame);
    const trainMs = performance.now() - started;

    epoch += stepsPerFrame;
    epochVal.textContent = epoch;
    lossVal.textContent = loss < 0.0001 ? loss.toExponential(2) : loss.toFixed(5);
    draw();
    // The diagram costs more to draw than a training step, and weights shift
    // slowly, so it redraws on a timer instead of every frame.
    const now = performance.now();
    if (now - lastNetDraw > NET_REDRAW_MS) {
      lastNetDraw = now;
      drawNet();
    }

    // Aim at FRAME_BUDGET_MS of training per frame, at most doubling each time
    // so the rate settles instead of oscillating.
    const scale = Math.min(2, FRAME_BUDGET_MS / Math.max(trainMs, 0.05));
    stepsPerFrame = Math.max(1, Math.min(MAX_STEPS_PER_FRAME, Math.round(stepsPerFrame * scale)));

    await nextFrame();
  }

  setTrainButton('ready');
}

// Starts the network over: fresh random weights, drawn grey again. The target
// function stays.
function reset() {
  isTraining = false;
  if (wasm) buildModel(true);
  else { hasModel = false; layers = []; }
  epoch = 0;
  epochVal.textContent = '0';
  lossVal.textContent  = '—';
  draw();
  drawNet();
}

// ── Event listeners ───────────────────────────────────────────────────────────
trainBtn.addEventListener('click', () => {
  isTraining ? (isTraining = false) : startTraining();
});

resetBtn.addEventListener('click', reset);

fnSelect.addEventListener('change', () => {
  fnInput.value = fnSelect.value;
  hasData = false;
  refreshTarget();
  reset();
});

fnInput.addEventListener('change', () => { hasData = false; refreshTarget(); reset(); });
archInput.addEventListener('change', reset);

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
refreshTarget();
setTrainButton('loading');
draw();
loadWasm().catch(e => {
  console.error('neural net demo failed to load', e);
  trainBtn.textContent = 'unavailable';
});

})();
