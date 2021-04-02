let palette = ["#a100ff", "#893fff", "#7477ff", "#5ac1ff", "#61ebff", "#72ffff", "#7affec", "#80ffdb"];
// let palette = ["#7400b8", "#6930c3", "#5e60ce", "#4ea8de", "#56cfe1", "#64dfdf", "#72efdd", "#80ffdb"];
let logits = [3,70,40,65,55,10,15,12];

let settings = {
  "type":"bar",
  "data":{
    "labels":["cat", "cheese", "pizza", "cookie", "fondue", "banana", "baguette", "cake"],
    "datasets":[
      {
        "label":"My First Dataset",
        "data":[],
        "fill":false,
        "backgroundColor":[],
        "borderColor":[],
        "borderWidth":1
      }
    ]
  },
  "options":{
    title:{
      display: true,
      text: 'what did the mouse eat?'
    },
    scales:{yAxes:[{
      ticks:{
        beginAtZero:true,
        min: 0,
        max: 1
      }
    }]},
    tooltips: {enabled: false},
    hover: {mode: null},
    legend: {display:false},
    plugins: {
        datalabels: {
          display: true,
          align: 'center',
          anchor: 'center',
          color: palette,
          font: {
            weight: 'bold'
          },
          formatter: function(value) {
          	return value.toFixed(2);
          }
        }
    }
  }
}

window.onload = function(){
  document.getElementById("myRange").oninput = function(){
    let x = parseInt(this.value);
    let y = x/10;

    window.chart.data.datasets[0].data = softmax(logits, y);
    window.chart.update();

    document.querySelector('#temperature').innerText = y.toFixed(1);
  }

  settings.data.datasets[0].backgroundColor = palette.map(x => x + '30');
  settings.data.datasets[0].borderColor = palette;
  settings.data.datasets[0].data = softmax(logits, 25);

  window.chart = new Chart("myChart", settings);
}

function softmax(list, y){
  let cooked = logits.map(z => Math.exp(z/y));
  let sum = cooked.reduce((a, c) => a+c);
  return cooked.map(z => z/sum);
}
