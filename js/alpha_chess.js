// const labels = ['abbe', 'abed', 'aced', 'ache', 'aged', 'agha', 'baba', 'babe', 'bach', 'bade', 'bead', 'beef', 'cafe', 'cage', 'ceca', 'cede', 'chad', 'chef', 'dace', 'dada', 'dead', 'deaf', 'deed', 'each', 'edda', 'edge', 'egad', 'face', 'fade', 'feed', 'gaff', 'gaga', 'gage', 'geed', 'ghee', 'head', 'heed'];
// const centis = [111, 84, 40, 59, 22, 175, 806, 700, 679, 705, 52, 507, 269, 450, 285, 160, 23, 114, 16, 205, 59, 23, 221, 78, 1228, 401, 26, 64, 76, 154, 120, 271, 284, 285, 295, 295, 297];

const centis = [['dace', 16],
 ['aged', 22],
 ['chad', 23],
 ['deaf', 23],
 ['egad', 26],
 ['aced', 40],
 ['bead', 52],
 ['ache', 59],
 ['dead', 59],
 ['face', 64],
 ['fade', 76],
 ['each', 78],
 ['abed', 84],
 ['gage', 108],
 ['abbe', 111],
 ['chef', 114],
 ['gaga', 119],
 ['gaff', 120],
 ['head', 125],
 ['geed', 152],
 ['feed', 154],
 ['cede', 160],
 ['agha', 175],
 ['ghee', 180],
 ['dada', 205],
 ['deed', 221],
 ['cafe', 269],
 ['ceca', 285],
 ['heed', 367],
 ['edge', 401],
 ['cage', 450],
 ['beef', 507],
 ['bach', 679],
 ['babe', 700],
 ['bade', 705],
 ['baba', 806],
 ['edda', 1228]];

const data = {
  labels: centis.map(x => x[0]),
  datasets: [{
    data: centis.map(x => x[1]),
    borderWidth: 1,
    backgroundColor: 'rgba(54, 162, 235, 0.2)',
    borderColor: 'rgb(54, 162, 235)',
    categoryPercentage: 0.5
  }]
};

const config = {
  type: 'horizontalBar',
  data: data,
  options: {
    indexAxis: 'y',
    barThickness: 50,
    legend: {
      display: false
    }
  },
};

window.onload = async function(){
  window.chart = new Chart("myChart", config);

  let heatmapData = await fetch('/data/alpha_chess_scores.json');
  heatmapData = await heatmapData.json();

  window.heatmap = new Heatmap(heatmapData, {
    'clientWidth': 720,
    'labels': centis.map(x => x[0]).sort()
  }).render('heatmap')
};
