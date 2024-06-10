let palette = ['#00ff00', '#00c0db', '#ff00ff', '#8a2be2', '#db9900', "#72ffff", "#7affec", "#80ffdb"];

let settings = {
  type:"scatter",
  data:{
    datasets:[]
  },
  options: {
    plugins: {
      legend: {
        display:false
      },
      tooltip: {
        enabled:false
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      },
    },
    animation: {
      easing: 'linear',
      duration: 0
    },
  }
}

window.onload = function(){
  document.querySelector("#demo button").onclick = onStartButtonClicked;
  reset_kmeans();
}

async function onStartButtonClicked() {
  if (window.done){
    reset_kmeans();
    document.querySelector("#demo button").innerText = 'running';
    run_kmeans();
  } else {
    document.querySelector("#demo button").innerText = 'running';
    run_kmeans();
  }
}

async function run_kmeans(){
  while(1){
    window.clusters = assign_clusters();
    let old_centroids = JSON.parse(JSON.stringify(window.centroids));
    update_centroids();

    if(centroids_equal(window.centroids, old_centroids)){
      break;
    }

    await sleep(500);
    draw_clusters();
  }
  window.done = true;
  document.querySelector("#demo button").innerText = 'rerun';
}

function reset_kmeans(){
  window.k = 5;
  for(let i=0; i<window.k; i++){
    settings.data.datasets.push(      {
      label: 'dataset',
      data:[],
      backgroundColor:palette[i],
      borderColor:'transparent',
      order: 1
    });
  }

  window.points = make_points(10000);
  window.centroids = window.points.slice(0, window.k);
  window.clusters = assign_clusters();
  draw_clusters();

  if(!window.chart){
    window.chart = new Chart("myChart", settings);
  }
}

function make_points(count) {
  let points = [];
  while (points.length < count) {
    points.push({x:Math.random(), y:Math.random()});
  }
  return points;
}

function clear_clusters(){
  clusters = [];
  for(let i=0; i<window.k; i++){
    clusters.push([]);
  }
  return clusters;
}

function assign_clusters() {
  let clusters = clear_clusters();

  window.points.forEach(point => {
    let cluster_idx = find_closest_centroid(point);
    clusters[cluster_idx].push(point);
  });

  return clusters;
}

function draw_clusters(){
  window.clusters.forEach((cluster, idx) => {
    settings.data.datasets[idx].data = cluster;
  });

  // draw centroids
  if(settings.data.datasets.length < window.k + 1){
    settings.data.datasets.push({
      label: 'dataset',
      data:window.centroids,
      backgroundColor:'#ffffff',
      borderColor:'transparent'
    });
  } else {
    settings.data.datasets[window.k].data = window.centroids;
  }

  if(window.chart){
    window.chart.update();
  }
}

function find_closest_centroid(point) {
  function calc_distance(p1, p2){
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  let best_idx = 0;
  let best_distance = 1000;
  
  window.centroids.forEach((centroid, idx) => {
    let distance = calc_distance(centroid, point)
    if(distance < best_distance){
      best_idx = idx;
      best_distance = distance;
    }
  });

  return best_idx;
}

function update_centroids() {
  window.centroids = window.clusters.map(cluster => {
    let p = cluster.reduce((a,c) => {
      return {x:a.x + c.x, y:a.y+c.y};
    }, {x:0,y:0});
    return {x:p.x/cluster.length, y:p.y/cluster.length}
  });
}

function centroids_equal(c1, c2) {
  for(let i=0; i<window.k; i++) {
    if(c1[i].x !== c2[i].x || c1[i].y !== c2[i].y) {
      return false;
    }
  }
  return true;
}

function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}
