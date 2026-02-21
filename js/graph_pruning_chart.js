window.onload = async function(){

  let data = await fetch('/data/greedy_vs_beam.json');
  data = await data.json();

  const greedy = data['greedy'];
  const beam = data['beam'];
  const n = greedy.length;

  const config = {
    type: 'line',
    data: {
      labels: Array(n).fill(0).map((x,i) => n - i - 1),
      datasets: [
        make('greedy search', data['greedy']),
        make('beam search', data['beam']),
      ]
    },
    options: {
      responsive: true,
      interaction: {mode: 'index', intersect: false},
      plugins: {
        legend: {
          labels: { color: '#ccc' }
        },
        title: {
          display: true,
          text: 'Greedy vs Beam Search',
          color: '#ccc',
          font: {
            size: 18
          }
        }
      },
      elements: {
        point: { radius: 0 }
      },
      scales: {
        x: {
          display: true,
          title: {display: true, text: 'cities remaining'}
        },
        y: {
          display: true,
          title: {display: true, text: 'wiener number'},
          suggestedMin: 0,
        }
      }
    }
  };

const beam_advantage = greedy.map((_, i) => greedy[i] - beam[i]);

let running = 0;
const cum_advantage = beam_advantage.map(v => (running += v));

const config2 = JSON.parse(JSON.stringify(config));

config2.data.datasets = [
  {
    label: 'beam search advantage',
    data: beam_advantage,
    yAxisID: 'y',
    borderWidth: 2,
    pointRadius: 0,
    fill: false,
    borderColor: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    tension:0.3
  },
  {
    label: 'cumulative advantage',
    data: cum_advantage,
    yAxisID: 'y1',
    borderColor: '#0091df',
    backgroundColor: 'rgba(77, 191, 253, 0.3)',
    borderWidth: 2,
    pointRadius: 0,
    fill: { target: 'origin' },
    tension: 0.3
  }
];

config2.options.scales.y.title.text = 'difference (higher = beam search better)';
config2.options.scales.y1 = {
  type: 'linear',
  position: 'right',
  title: { display: true, text: 'cumulative advantage' },
  grid: { drawOnChartArea: false }
};

config2.options.plugins.title.text = 'Beam Search Advantage (Greedy - Beam)';

new Chart(document.querySelector('#graph1 canvas').getContext('2d'), config);
new Chart(document.querySelector('#graph2 canvas').getContext('2d'), config2);
};

function make(name, data){
  let colors = {
    'greedy search': '#8d00ee',
    'beam search': '#55ef53'
  };
  return {
    label: name,
    // data: bucket(data[name]),
    data:data,
    borderColor: colors[name],
    borderWidth: 1,
    hoverOffset: 4
  }
}

