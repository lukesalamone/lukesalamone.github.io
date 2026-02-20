const container1 = document.getElementById("mapContainer1");
const container2 = document.getElementById("mapContainer2");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else {
      node.setAttribute(key, value);
    }
  });
  children.forEach((child) => node.appendChild(child));
  return node;
}

function buildMapPanel(label) {
  const title = el("h2", { text: label });
  const map = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  map.setAttribute("viewBox", "0 0 1000 600");
  map.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const mapWrap = el("div", { class: "map-wrap" }, [map]);

  const prev = el("button", { text: "Prev" });
  const next = el("button", { text: "Next" });
  const reset = el("button", { text: "Reset" });
  const message = el("span", { class: "message" });
  const controls = el("div", { class: "row" }, [prev, next, reset, message]);

  const statTotal = el("span", { class: "stat-value", text: "0" });
  const statRemoved = el("span", { class: "stat-value", text: "0" });
  const statRemaining = el("span", { class: "stat-value", text: "0" });
  const statNext = el("span", { class: "stat-value", text: "-" });

  const stats = el("div", { class: "row stats" }, [
    el("div", { class: "stat" }, [
      el("span", { class: "stat-label", text: "Total Cities" }),
      statTotal,
    ]),
    el("div", { class: "stat" }, [
      el("span", { class: "stat-label", text: "Removed" }),
      statRemoved,
    ]),
    el("div", { class: "stat" }, [
      el("span", { class: "stat-label", text: "Remaining" }),
      statRemaining,
    ]),
    el("div", { class: "stat" }, [
      el("span", { class: "stat-label", text: "Next" }),
      statNext,
    ]),
  ]);

  const panel = el("section", { class: "map-panel" }, [title, mapWrap, controls, stats]);
  return {
    panel,
    map,
    prev,
    next,
    reset,
    message,
    stats: { total: statTotal, removed: statRemoved, remaining: statRemaining, next: statNext },
  };
}

function buildLayout() {
  if (!container1 || !container2) {
    throw new Error("Missing #mapContainer1 or #mapContainer2 container.");
  }
  const panelA = buildMapPanel("Greedy search graph pruning");
  const panelB = buildMapPanel("Beam search graph pruning");
  container1.appendChild(panelA.panel);
  container2.appendChild(panelB.panel);
  return { panelA, panelB };
}

const { panelA, panelB } = buildLayout();
const mapElA = panelA.map;
const mapElB = panelB.map;
const prevA = panelA.prev;
const nextA = panelA.next;
const resetA = panelA.reset;
const messageA = panelA.message;
const statTotalA = panelA.stats.total;
const statRemovedA = panelA.stats.removed;
const statRemainingA = panelA.stats.remaining;
const statNextA = panelA.stats.next;

const prevB = panelB.prev;
const nextB = panelB.next;
const resetB = panelB.reset;
const messageB = panelB.message;
const statTotalB = panelB.stats.total;
const statRemovedB = panelB.stats.removed;
const statRemainingB = panelB.stats.remaining;
const statNextB = panelB.stats.next;

let landData = null;
let cities = [];
let edges = [];
let nameToIndex = new Map();

const ORDER_A = [
  "dublin",
  "lisbon",
  "london",
  "sofia",
  "helsinki",
  "stockholm",
  "moscow",
  "bucharest",
  "copenhagen",
  "brussels",
  "amsterdam",
  "ankara",
  "kyiv",
  "istanbul",
  "warsaw",
  "berlin",
  "prague",
  "frankfurt",
  "belgrade",
  "budapest",
  "athens",
  "naples",
  "madrid",
  "rome",
  "paris",
  "zurich",
  "geneva",
  "munich",
  "vienna",
  "venice",
];

const ORDER_B = [
  "dublin",
  "lisbon",
  "helsinki",
  "stockholm",
  "london",
  "sofia",
  "brussels",
  "amsterdam",
  "copenhagen",
  "moscow",
  "ankara",
  "istanbul",
  "kyiv",
  "bucharest",
  "madrid",
  "naples",
  "athens",
  "belgrade",
  "rome",
  "paris",
  "geneva",
  "venice",
  "zurich",
  "frankfurt",
  "munich",
  "vienna",
  "budapest",
  "warsaw",
  "prague",
  "berlin",
];

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function setMessage(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "#7a1f16" : "#3a2c1a";
}

function computeCoords(rawCities, bounds) {
  if (rawCities.length && rawCities[0].x !== undefined && rawCities[0].y !== undefined) {
    return rawCities.map((c) => ({ ...c, x: c.x, y: c.y }));
  }
  const lats = rawCities.map((c) => c.lat ?? 0);
  const lngs = rawCities.map((c) => c.lng ?? 0);
  const minLat = bounds?.min_lat ?? Math.min(...lats);
  const maxLat = bounds?.max_lat ?? Math.max(...lats);
  const minLng = bounds?.min_lng ?? Math.min(...lngs);
  const maxLng = bounds?.max_lng ?? Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  return rawCities.map((c) => {
    const x = ((c.lng - minLng) / spanLng) * 1000.0;
    const y = ((maxLat - c.lat) / spanLat) * 600.0;
    return { ...c, x, y };
  });
}

function renderMap(mapEl, removed) {
  if (!mapEl) return;
  mapEl.innerHTML = "";

  if (landData && Array.isArray(landData.paths)) {
    landData.paths.forEach((path) => {
      const land = document.createElementNS("http://www.w3.org/2000/svg", "path");
      land.setAttribute("class", "map-land");
      land.setAttribute("d", path);
      mapEl.appendChild(land);
    });
  }

  edges.forEach(([a, b]) => {
    const ca = cities[a];
    const cb = cities[b];
    if (!ca || !cb) return;
    if (removed.has(normalizeName(ca.name)) || removed.has(normalizeName(cb.name))) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", ca.x);
    line.setAttribute("y1", ca.y);
    line.setAttribute("x2", cb.x);
    line.setAttribute("y2", cb.y);
    line.setAttribute("class", "edge");
    mapEl.appendChild(line);
  });

  cities.forEach((city) => {
    if (removed.has(normalizeName(city.name))) return;
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", city.x);
    node.setAttribute("cy", city.y);
    node.setAttribute("r", 10);
    node.setAttribute("class", "city");
    mapEl.appendChild(node);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", city.x + 12);
    label.setAttribute("y", city.y - 12);
    label.setAttribute("class", "city-label");
    label.textContent = city.name;
    mapEl.appendChild(label);
  });
}

function updateStats(statTotal, statRemoved, statRemaining, statNext, state) {
  statTotal.textContent = cities.length;
  statRemoved.textContent = state.removed.size;
  statRemaining.textContent = Math.max(state.order.length - state.index, 0);
  statNext.textContent = state.order[state.index] || "-";
}

function buildState(orderRaw) {
  const normalized = [];
  const missing = [];
  const seen = new Set();
  orderRaw.forEach((name) => {
    const key = normalizeName(name);
    const idx = nameToIndex.get(key);
    if (idx === undefined) {
      missing.push(name);
      return;
    }
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(cities[idx].name);
  });
  return {
    order: normalized,
    missing,
    index: 0,
    removed: new Set(),
  };
}

function renderState(state, mapEl, messageEl, stats) {
  renderMap(mapEl, state.removed);
  updateStats(stats.total, stats.removed, stats.remaining, stats.next, state);
  if (state.missing.length) {
    setMessage(messageEl, `Unknown: ${state.missing.join(", ")}`, true);
  } else if (state.index >= state.order.length) {
    setMessage(messageEl, "Done.");
  } else {
    setMessage(messageEl, "");
  }
}

function stepForward(state) {
  if (state.index >= state.order.length) return false;
  const name = state.order[state.index];
  state.removed.add(normalizeName(name));
  state.index += 1;
  return true;
}

function stepBack(state) {
  if (state.index <= 0) return false;
  state.index -= 1;
  const name = state.order[state.index];
  state.removed.delete(normalizeName(name));
  return true;
}

async function loadData() {
  const [citiesRes, landRes] = await Promise.all([
    fetch("/data/cities.json"),
    fetch("/data/europe_land.json"),
  ]);
  if (!citiesRes.ok || !landRes.ok) {
    throw new Error("Failed to load map assets.");
  }
  const raw = await citiesRes.json();
  landData = await landRes.json();
  const rawCities = raw.cities || [];
  cities = computeCoords(rawCities, landData?.bounds);
  nameToIndex = new Map(cities.map((c, i) => [normalizeName(c.name), i]));
  edges = (raw.edges || [])
    .map((edge) => {
      const from = nameToIndex.get(normalizeName(edge.from));
      const to = nameToIndex.get(normalizeName(edge.to));
      return [from, to];
    })
    .filter(([from, to]) => from !== undefined && to !== undefined);

  const stateA = buildState(ORDER_A);
  const stateB = buildState(ORDER_B);

  const statsA = {
    total: statTotalA,
    removed: statRemovedA,
    remaining: statRemainingA,
    next: statNextA,
  };
  const statsB = {
    total: statTotalB,
    removed: statRemovedB,
    remaining: statRemainingB,
    next: statNextB,
  };

  renderState(stateA, mapElA, messageA, statsA);
  renderState(stateB, mapElB, messageB, statsB);

  nextA.addEventListener("click", () => {
    if (stepForward(stateA)) {
      setMessage(messageA, `Removed ${stateA.order[stateA.index - 1]}.`);
    }
    renderState(stateA, mapElA, messageA, statsA);
  });

  prevA.addEventListener("click", () => {
    if (stepBack(stateA)) {
      setMessage(messageA, `Restored ${stateA.order[stateA.index]}.`);
    }
    renderState(stateA, mapElA, messageA, statsA);
  });

  resetA.addEventListener("click", () => {
    stateA.index = 0;
    stateA.removed = new Set();
    setMessage(messageA, "Reset.");
    renderState(stateA, mapElA, messageA, statsA);
  });

  nextB.addEventListener("click", () => {
    if (stepForward(stateB)) {
      setMessage(messageB, `Removed ${stateB.order[stateB.index - 1]}.`);
    }
    renderState(stateB, mapElB, messageB, statsB);
  });

  prevB.addEventListener("click", () => {
    if (stepBack(stateB)) {
      setMessage(messageB, `Restored ${stateB.order[stateB.index]}.`);
    }
    renderState(stateB, mapElB, messageB, statsB);
  });

  resetB.addEventListener("click", () => {
    stateB.index = 0;
    stateB.removed = new Set();
    setMessage(messageB, "Reset.");
    renderState(stateB, mapElB, messageB, statsB);
  });
}

loadData().catch(() => {
  setMessage(messageA, "Failed to load map data. Check asset paths.", true);
  setMessage(messageB, "Failed to load map data. Check asset paths.", true);
});
