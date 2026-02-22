(function () {
  const container = document.getElementById('gmm-demo');
  if (!container) return;

  const svg = container.querySelector('svg');
  const slider = container.querySelector('#gmm-demo-slider');
  const chevron = container.querySelector('#gmm-demo-chevron');
  const guide = container.querySelector('.gmm-demo-guide');
  const probEls = container.querySelectorAll('[data-prob]');
  const probLabels = container.querySelectorAll('[data-prob-label]');

  const width = 600;
  const height = 200;
  const padding = 24;
  const plotHeight = height - padding * 2;
  const baseY = height - padding;

  const means = [2.2, 5.0, 7.8];
  const sigmas = [0.55, 1.1, 0.75];

  function gaussian(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return (1 / sigma) * Math.exp(-0.5 * z * z);
  }

  function maxCurveHeight() {
    const steps = 600;
    let max = 0;
    for (let i = 0; i <= steps; i += 1) {
      const x = (i / steps) * 10;
      const value = Math.max(
        gaussian(x, means[0], sigmas[0]),
        gaussian(x, means[1], sigmas[1]),
        gaussian(x, means[2], sigmas[2])
      );
      if (value > max) max = value;
    }
    return max || 1;
  }

  const maxY = maxCurveHeight();

  function buildLinePath(mu, sigma) {
    const steps = 240;
    let d = '';
    for (let i = 0; i <= steps; i += 1) {
      const x = (i / steps) * 10;
      const y = gaussian(x, mu, sigma) / maxY;
      const px = (x / 10) * width;
      const py = baseY - y * plotHeight;
      d += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)} `;
    }
    return d.trim();
  }

  function buildAreaPath(mu, sigma) {
    const steps = 240;
    let d = '';
    for (let i = 0; i <= steps; i += 1) {
      const x = (i / steps) * 10;
      const y = gaussian(x, mu, sigma) / maxY;
      const px = (x / 10) * width;
      const py = baseY - y * plotHeight;
      d += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)} `;
    }
    d += `L ${width} ${baseY} L 0 ${baseY} Z`;
    return d.trim();
  }

  const areaPaths = svg.querySelectorAll('.gmm-area');
  const linePaths = svg.querySelectorAll('.gmm-curve');

  areaPaths[0].setAttribute('d', buildAreaPath(means[0], sigmas[0]));
  areaPaths[1].setAttribute('d', buildAreaPath(means[1], sigmas[1]));
  areaPaths[2].setAttribute('d', buildAreaPath(means[2], sigmas[2]));

  linePaths[0].setAttribute('d', buildLinePath(means[0], sigmas[0]));
  linePaths[1].setAttribute('d', buildLinePath(means[1], sigmas[1]));
  linePaths[2].setAttribute('d', buildLinePath(means[2], sigmas[2]));

  function update(val) {
    const x = parseFloat(val);
    const px = (x / 10) * width;
    chevron.setAttribute('transform', `translate(${px.toFixed(2)} ${baseY})`);
    if (guide) {
      guide.setAttribute('x1', px.toFixed(2));
      guide.setAttribute('x2', px.toFixed(2));
    }

    const raw = means.map((mu, idx) => gaussian(x, mu, sigmas[idx]));
    const total = raw.reduce((acc, v) => acc + v, 0) || 1;
    const probs = raw.map((v) => v / total);

    probEls.forEach((el, idx) => {
      const pct = (probs[idx] * 100).toFixed(1);
      el.style.width = `${pct}%`;
    });
    probLabels.forEach((label, idx) => {
      const pct = (probs[idx] * 100).toFixed(1);
      label.textContent = `${pct}%`;
    });
  }

  slider.addEventListener('input', (e) => update(e.target.value));
  update(slider.value);
})();
