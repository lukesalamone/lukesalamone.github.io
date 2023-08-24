window.onload = async function(){
  let width = 150;
  let height = 150;

  window.pallete = [
    [['#0000', '#00f'], ['#0f0', '#0ff']],
    [['#f00', '#f0f'], ['#ff0', '#fff']]
  ];

  window.pointers = buildGrid($('#game-of-life-container'), width, height);
  window.m1 = createMatrix(width, height);
  window.m2 = createMatrix(width, height);
  window.m3 = createMatrix(width, height);

  $('#game-of-life-controls .start').onclick = onStartClicked;
  $('#game-of-life-controls .pause').onclick = onPauseClicked;
}

function onStartClicked() {
  $('#game-of-life-controls .start').style.display = 'none';
  $('#game-of-life-controls .pause').style.display = 'block';
  startGame();
}

function onPauseClicked() {
  $('#game-of-life-controls .start').style.display = 'block';
  $('#game-of-life-controls .pause').style.display = 'none';
  pauseGame();
}

function startGame() {
  window.playInterval = setInterval(() => {
    window.m1 = runStep(window.m1, [window.m2, window.m3]);
    window.m2 = runStep(window.m2, [window.m1, window.m3]);
    window.m3 = runStep(m3, [window.m2, window.m1]);
    colorGrid([window.m1, window.m2, window.m3], window.pointers);
  }, 100);
}

function pauseGame() {
  if(window.playInterval) {
    clearInterval(window.playInterval);
  }
}

function createMatrix(width, height) {
  let matrix = [];

  for(let i=0; i<height; i++) {
    let row = [];
    for(let j=0; j<width; j++) {
      row.push(Math.random() < 0.5 ? 0 : 1);
    }
    matrix.push(row);
  }
  return matrix;
}

function runStep(matrix, alts) {
  let newMatrix = [];
  function getIndexes(i,j,size) {
    let indexes = [
      [i-1, j-1], [i-1, j], [i-1, j+1],
      [i, j-1], [i, j+1],
      [i+1, j-1], [i+1, j], [i+1, j+1]
    ];
    return indexes.map((v) => {
      return [
        v[0] < 0 ? size - 1 : (v[0] < size ? v[0] : 0),
        v[1] < 0 ? size - 1 : (v[1] < size ? v[1] : 0),
      ];
    });
  }

  function getNeighborCount(matrix,i,j) {
    let count = 0;
    return getIndexes(i,j,matrix.length).reduce((a,c) => {
      let m = c[0];
      let n = c[1];
      return a + matrix[m][n];
    }, 0);
  }

  function getAltCount(alts, i, j) {
    return alts.reduce((a,c) => {
      return a + c[i][j]
    }, 0);
  }

  function getAltNeighborCount(alts, i, j) {
    return alts.reduce((a,c) => {
      return a + getNeighborCount(c, i, j);
    })
  }

  for(let i=0; i<matrix.length; i++) {
    let row = [];
    for(let j=0; j<matrix[0].length; j++) {
      let count = getNeighborCount(matrix, i, j);
      if(matrix[i][j]) {
        row.push((count < 2 || count > 3) ? 0 : 1);
      } else {
        if(count === 3) {
          row.push(1);
        } else {
          let altCount = getNeighborCount(alts[0], i, j) + getNeighborCount(alts[1], i, j);
          if(altCount === 9){
            row.push(1);
          } else {
            row.push(0);
          }
        }
      }
    }
    newMatrix.push(row);
  }
  return newMatrix;
}

function colorGrid(matrices, pointers) {
  const [m1, m2, m3] = matrices;
  for(let i=0; i<m1.length; i++) {
    for(let j=0; j<m1[0].length; j++) {
      pointers[i][j].style.backgroundColor = getColor(m1[i][j], m2[i][j], m3[i][j]);
    }
  }
}

function getColor(r,g,b) {
  return window.pallete[r][g][b];
}

function buildGrid(parent, width, height) {
  let pointers = [];
  for(let i=0; i<height; i++) {
    let row = document.createElement('div');
    row.classList.add('row');
    let ptrRow = [];

    for(let j=0; j<width; j++) {
      let box = document.createElement('div');
      box.classList.add('box');
      row.appendChild(box);
      ptrRow.push(box);
    }
    parent.appendChild(row);
    pointers.push(ptrRow);
  }
  return pointers;
}
