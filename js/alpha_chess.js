const labels = ['abbe', 'abed', 'aced', 'ache', 'aged', 'agha', 'baba', 'babe', 'bach', 'bade', 'bead', 'beef', 'cafe', 'cage', 'ceca', 'cede', 'chad', 'chef', 'dace', 'dada', 'dead', 'deaf', 'deed', 'each', 'edda', 'edge', 'egad', 'face', 'fade', 'feed', 'gaff', 'gaga', 'gage', 'geed', 'ghee', 'head', 'heed'];
const centis = [5, 13, 15, 24, 33, 35, 40, 53, 57, 64, 74, 81, 84, 91, 97, 116, 139, 150, 185, 187, 203, 209, 210, 226, 229, 234, 236, 239, 242, 260, 261, 271, 284, 285, 295, 295, 297];

const data = {
  labels: labels,
  datasets: [{
    data: centis,
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
    'labels': labels
  }).render('heatmap')
};
