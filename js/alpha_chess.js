const labels = [
  'dace', 'aged', 'chad', 'deaf', 'egad', 'aced', 'bead', 'ache', 'dead', 'face',
  'fade', 'each', 'abed', 'gage', 'abbe', 'chef', 'gaga', 'gaff', 'head', 'geed',
  'feed', 'cede', 'agha', 'ghee', 'dada', 'deed', 'cafe', 'ceca', 'heed', 'edge',
  'cage', 'beef', 'bach', 'babe', 'bade','baba','edda']

window.onload = async function(){
  let heatmapData = await fetch('/data/alpha_chess_scores.json');
  heatmapData = await heatmapData.json();

  window.heatmap = new Heatmap(heatmapData, {
    'clientWidth': 720,
    'labels': labels
  }).render('heatmap')
};
