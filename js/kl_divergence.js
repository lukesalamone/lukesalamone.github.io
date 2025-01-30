let palette = ["#a100ff", "#893fff", "#7477ff", "#5ac1ff", "#61ebff", "#72ffff", "#7affec", "#80ffdb"];
// let palette = ["#7400b8", "#6930c3", "#5e60ce", "#4ea8de", "#56cfe1", "#64dfdf", "#72efdd", "#80ffdb"];
let logits = [3,70,40,65,55,10,15,12];

let settings = {
  "type":"line",
  "data":{
    "labels":[],
    "datasets":[
      {
        "label": 'expected distribution',
        "data":[],
        "fill":true,
        "backgroundColor":"#a100ff22",
        "borderColor":"#a100ff",
        "borderWidth":1,
        "tension": 0.5,
        "pointRadius": 0
      },
      {
        "label": 'actual distribution',
        "data":[],
        "fill":true,
        "backgroundColor":"#80ffdb22",
        "borderColor":"#80ffdbff",
        "borderWidth":1,
        "tension": 0.5,
        "pointRadius": 0
      },
    ]
  },
  "options":{
    title:{
      display: false,
      text: 'two normal distributions on a chart'
    },
    "scales": {
      "yAxes": [{
        "ticks": {
          "beginAtZero": true,
          "min": 0,
          "max": 0.14
        }
      }],
      "xAxes": [{
        "ticks": {
          "autoSkip": true,
          "min":20,
          "max":70,
          "maxTicksLimit": 5,
        }
      }]
    },
    tooltips: {enabled: false},
    hover: {mode: null},
    // legend: {display:false}
    plugins: {
      legend: {
          position: 'top',
          align: 'end',
          fullWidth: false // This can help in forcing the legend to not take full width
      }
    }
  }
}

window.onload = function(){
  function onSliderChanged() {
    let mean = parseInt($('#mean').value) / 10;
    let variance = parseInt($('#variance').value) / 10;

    window.chart.data.datasets[1].data = build_distribution(mean, variance);
    window.chart.update();

    document.querySelector('#mean_label').innerText = mean.toFixed(1);
    document.querySelector('#variance_label').innerText = variance.toFixed(1);
    document.querySelector('#kl_divergence_label').innerText = 'KL divergence: ' + calc_kl_divergence(
      window.chart.data.datasets[1].data,
      window.chart.data.datasets[0].data,
    );
  }

  document.getElementById("mean").oninput = onSliderChanged;
  document.getElementById("variance").oninput = onSliderChanged;

  window.xs = range(0, 100, 1);
  settings.data.labels = window.xs;
  settings.data.datasets[0].data = build_distribution(50, 30);
  settings.data.datasets[1].data = build_distribution(40, 20);

  window.chart = new Chart("myChart", settings);

  document.querySelector('#kl_divergence_label').innerText = 'KL divergence: ' + calc_kl_divergence(
    window.chart.data.datasets[1].data,
    window.chart.data.datasets[0].data,
  );
}

function build_distribution(mean, variance) {
  const factor = 1 / (Math.sqrt(2 * Math.PI * variance));

  return window.xs.map(x => {
      let exponent = -((x - mean) ** 2) / (2 * variance);
      return factor * Math.exp(exponent);
  });
}

function range(start, end, step) {
  let arr = [];
  let x = start;
  while(x <= end) {
    arr.push(x);
    x += step;
  }

  return arr;
}

function calc_kl_divergence(P, Q) {
  let result = 0;
  for(let i=0; i<P.length; i++) {
    result += P[i] * Math.log(P[i]/Q[i]);
  }

  return result.toFixed(4);
}