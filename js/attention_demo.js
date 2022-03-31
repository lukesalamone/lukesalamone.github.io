const words = ['I', 'am', 'sitting', 'at', 'the', 'library', 'with', 'my', 'friend'];
const values = [
  [10,8,8,2,1,6,1,3,7],
  [8,10,9,5,2,7,2,2,4],
  [8,9,10,8,2,8,5,1,6],
  [2,5,0,10,0,0,0,0,0],
  [1,2,0,0,10,0,0,0,0],
  [6,7,0,0,0,10,0,0,0],
  [1,2,0,0,0,0,10,0,0],
  [3,2,0,0,0,0,0,10,0],
  [7,4,0,0,0,0,0,0,10]
]


window.onload = function(){
  let container = document.querySelector('#attention_matrix');
  createMatrix(container);






}


function createMatrix(container){
  let sentenceHolder = document.createElement('div');
  let matrixHolder = document.createElement('table');
  sentenceHolder.className = 'sentence';
  matrixHolder.className = 'matrix';
  container.appendChild(sentenceHolder);
  container.appendChild(matrixHolder);

  // create sentence
  words.forEach(word => {
    let elem = document.createElement('span');
    elem.innerHTML = word;
    sentenceHolder.appendChild(elem);
  });

  // create table
  let headerRow = document.createElement('tr');
  ['',...words].forEach(word => {
    let th = document.createElement('th');
    th.innerHTML = word;
    headerRow.appendChild(th);
  });
  matrixHolder.appendChild(headerRow);

  words.forEach((word,i) => {
    let tr = document.createElement('tr');
    let label = document.createElement('td');
    label.innerHTML = word;
    tr.appendChild(label);
    words.forEach((word,j) => {
      let td = document.createElement('td');
      // todo set background color
      tr.appendChild(td);
    });
    matrixHolder.appendChild(tr);
  });
}
