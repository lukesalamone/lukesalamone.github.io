window.onload = async function(){

  let data = await fetch('/data/prediction_accuracies.json');
  data = await data.json();

  ['gpt2', 'gpt2-medium', 'bert-base-uncased', 'bert-base-cased', 'bert-large-uncased', 'bert-large-cased']

  const config = {
    type: 'line',
    data: {
      labels: Array(20).fill(0).map((x,i) => i*5),
      datasets: [
        make('gpt2', data), make('gpt2-medium', data),
        make('bert-base-cased', data),make('bert-base-uncased', data),
        make('bert-large-cased', data),make('bert-large-uncased', data)]
    },
    options: {
      responsive: true,
      interaction: {mode: 'index', intersect: false},
      legend: {labels: {fontColor: '#ccc'}},
      elements: {
        point: {
          radius: 0
        }
      },
      scales: {
        x: {
          display: true,
          title: {display: true, text: 'position'}
        },
        y: {
          display: true,
          title: {display: true, text: 'accuracy'},
          suggestedMin: 0,
        }
      }
    }
  };

  const config2 = {
    type: 'line',
    data: {
      labels: Array(10).fill(0).map((x,i) => i+91),
      datasets: [
        make2('gpt2', data), make2('gpt2-medium', data),
        make2('bert-base-cased', data),make2('bert-base-uncased', data),
        make2('bert-large-cased', data),make2('bert-large-uncased', data)]
    },
    options: {
      responsive: true,
      interaction: {mode: 'index', intersect: false},
      legend: {labels: {fontColor: '#ccc'}},
      elements: {
        point: {
          radius: 0
        }
      },
      scales: {
        x: {
          display: true,
          title: {display: true, text: 'position'},
          grid: {display: false}
        },
        y: {
          display: true,
          title: {display: true, text: 'accuracy'},
          suggestedMin: 0,
          suggestedMax: 0.9,
          grid: {display: false}
        }
      }
    }
  };

  new Chart(document.querySelector('#graph1 canvas').getContext('2d'), config);
  new Chart(document.querySelector('#graph2 canvas').getContext('2d'), config2);

};

function make(name, data){
  let colors = {'gpt2':'#c800cf', 'gpt2-medium': '#8d00ee',
                'bert-base-uncased': '#e5ef53', 'bert-base-cased': '#a6ef53',
                'bert-large-uncased': '#55ef53', 'bert-large-cased': '#efb953'};
  return {
    label: name,
    data: bucket(data[name]),
    borderColor: colors[name],
    borderWidth: 1,
    hoverOffset: 4
  }
}

function make2(name, data){
  let colors = {'gpt2':'#c800cf', 'gpt2-medium': '#8d00ee',
                'bert-base-uncased': '#e5ef53', 'bert-base-cased': '#a6ef53',
                'bert-large-uncased': '#55ef53', 'bert-large-cased': '#efb953'};
  return {
    label: name,
    data: data[name].slice(-10),
    borderColor: colors[name],
    borderWidth: 1,
    hoverOffset: 4
  }
}

function bucket(data){
  // return data;

  let buckets = [...Array(20)].map(x=>Array(0).fill(0));
  for(let i=0; i<data.length; i++){
    buckets[Math.floor(i/5)].push(data[i]);
  }

  return buckets.map(x => mean(x));

  function mean(nums){
    return nums.reduce((a,c) => a+c) / nums.length;
  }
}
