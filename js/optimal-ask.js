// Monte Carlo simulation for "Optimal Ask"
//
// Customers' max bid is drawn from a Normal(100, 5) distribution.
// The revenue array (12,000 elements) tracks, for every asking price
// between $0.00 and $120.00 in $0.01 increments, the total revenue
// collected if that price were charged. Each customer contributes their
// asking price to every bin whose price is <= their bid.
//
// Colors:
//   revenue curve   #0091df  (blue)
//   bid distribution #770ac2 (purple)
//   background      #2f3033
//   text            #ffffff

const REVENUE_STEP = 0.01;
const MAX_PRICE = 120;
const N_BINS = Math.round(MAX_PRICE / REVENUE_STEP); // 12000

// optimal asking price, updated as customers accumulate
let optimalPrice = 0;

// Downsample for display: plot every 20th bin (i.e. $0.20 resolution)
const CHART_STRIDE = 20;

function normal(mean, std) {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

// Simple centered moving average (window of W=5) to smooth display curves.
function smooth(arr) {
  const W = 5;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, count = 0;
    for (let k = -Math.floor(W / 2); k <= Math.floor(W / 2); k++) {
      const idx = i + k;
      if (idx >= 0 && idx < arr.length) {
        sum += arr[idx];
        count++;
      }
    }
    out[i] = sum / count;
  }
  return out;
}

window.onload = () => {

  // per-$0.01 bin counts of drawn bids (forms the bell curve)
  const bidCounts = new Array(N_BINS).fill(0);

  // per-$0.01 revenue totals (one entry per candidate asking price)
  const revenue = new Array(N_BINS).fill(0);

  // running count of drawn customers
  let totalCustomers = 0;

  const labels = [];
  const bidData = [];
  const revenueData = [];
  for (let i = 0; i < N_BINS; i += CHART_STRIDE) {
    labels.push(+(i * REVENUE_STEP).toFixed(2));
    bidData.push(0);
    revenueData.push(0);
  }

  const bidDataset = {
    label: 'customers',
    yAxisID: 'y-bids',
    fill: true,
    backgroundColor: 'rgba(119, 10, 194, 0.5)',
    borderColor: '#770ac2',
    pointRadius: 0,
    hoverRadius: 0,
    lineTension: 0.4,
    borderWidth: 1,
    data: bidData
  };

  const revenueDataset = {
    label: 'revenue',
    yAxisID: 'y-revenue',
    fill: false,
    backgroundColor: '#0091df',
    borderColor: '#0091df',
    pointRadius: 0,
    hoverRadius: 0,
    lineTension: 0,
    borderWidth: 2,
    data: revenueData
  };

  window.revenueChart = new Chart(document.querySelector('#optimal-ask-canvas').getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [bidDataset, revenueDataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      legend: {
        labels: {
          fontColor: '#ffffff'
        }
      },
      tooltips: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#2f3033',
        titleFontColor: '#ffffff',
        bodyFontColor: '#ffffff'
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'asking price ($)',
            fontColor: '#ffffff'
          },
          ticks: {
            fontColor: '#ffffff',
            autoSkip: false,
            callback: (value) => {
              // show a label only at whole-dollar multiples of $10
              const v = Number(value);
              if (v % 10 === 0) return '$' + v;
              return null;
            }
          },
          gridLines: {
            color: '#3a3a3d'
          }
        }],
        yAxes: [{
          id: 'y-bids',
          position: 'left',
          ticks: {
            display: false
          },
          gridLines: {
            color: '#3a3a3d'
          }
        }, {
          id: 'y-revenue',
          position: 'right',
          ticks: {
            display: false
          },
          gridLines: {
            drawOnChartArea: false
          }
        }]
      }
    }
  });

  const syncChart = () => {
    const rawBid = [];
    const rawRevenue = [];
    for (let i = 0, j = 0; i < N_BINS; i += CHART_STRIDE, j++) {
      rawBid[j] = bidCounts[i];
      rawRevenue[j] = revenue[i];
    }
    // optimal price = the asking price that maximizes revenue
    let bestIdx = 0;
    for (let i = 1; i < N_BINS; i++) {
      if (revenue[i] > revenue[bestIdx]) bestIdx = i;
    }
    optimalPrice = bestIdx * REVENUE_STEP;

    // Smooth each series with a moving average to reduce jaggedness.
    const smoothedBid = smooth(rawBid);
    const smoothedRevenue = smooth(rawRevenue);

    // Normalize each curve so its peak sits at the top, regardless of axis labels.
    const bidMax = Math.max(...smoothedBid);
    const revenueMax = Math.max(...smoothedRevenue);
    for (let j = 0; j < smoothedBid.length; j++) {
      bidData[j] = bidMax > 0 ? smoothedBid[j] / bidMax : 0;
      // scale revenue down slightly so its peak line isn't clipped at the top
      revenueData[j] = revenueMax > 0 ? (smoothedRevenue[j] / revenueMax) * 0.95 : 0;
    }

    // Update the live readouts above the chart.
    document.querySelector('#optimal-ask-customers').innerText =
      'Customers: ' + totalCustomers;
    document.querySelector('#optimal-ask-price').innerText =
      'Optimal asking price: $' + optimalPrice.toFixed(2);
    const errPct = Math.abs((optimalPrice - 90.013) / 90.013) * 100;
    document.querySelector('#optimal-ask-error').innerText =
      '% error: ' + errPct.toFixed(2) + '%';

    window.revenueChart.update();
  };

  const addCustomers = (n) => {
    totalCustomers += n;
    for (let k = 0; k < n; k++) {
      const bid = normal(100, 5);
      if (bid > 0) {
        const bidBin = Math.min(N_BINS - 1, Math.round(bid / REVENUE_STEP));
        bidCounts[bidBin]++;
      }
      // For every asking price <= this customer's bid, add that price to revenue.
      const maxIdx = Math.min(N_BINS - 1, Math.round(bid / REVENUE_STEP));
      for (let p = 0; p <= maxIdx; p++) {
        revenue[p] += p * REVENUE_STEP;
      }
    }
  };

  Chart.pluginService.register({
    id: 'optimalPriceLine',
    afterDatasetsDraw: (chart) => {
      if (optimalPrice <= 0) return;
      const ctx = chart.ctx;
      const xAxis = chart.scales['x-axis-0'];
      if (!xAxis) return;
      // Linear interpolation across the axis: left edge = $0, right edge = $120
      const frac = (optimalPrice - 0) / (120 - 0);
      const x = xAxis.left + frac * (xAxis.right - xAxis.left);
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x, chart.chartArea.top);
      ctx.lineTo(x, chart.chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + optimalPrice.toFixed(2), x - 6, chart.chartArea.top + 16);
      ctx.restore();
    }
  });

  document.querySelector('#optimal-ask-start').onclick = () => {
    document.querySelector('#optimal-ask-start').disabled = true;
    document.querySelector('#optimal-ask-stop').disabled = false;
    window.optimalAskId = setInterval(() => {
      addCustomers(10);
      syncChart();
    }, 10);
  };

  document.querySelector('#optimal-ask-stop').onclick = () => {
    document.querySelector('#optimal-ask-start').disabled = false;
    document.querySelector('#optimal-ask-stop').disabled = true;
    clearInterval(window.optimalAskId);
  };
};