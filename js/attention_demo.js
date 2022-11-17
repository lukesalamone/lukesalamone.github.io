const words = ['I', 'am', 'sitting', 'at', 'the', 'library', 'with', 'my', 'friend'];
const values = [
  [10, 6, 5, 0, 0, 2, 0, 1, 2],
  [4, 10, 6, 1, 1, 2, 0, 0, 0],
  [4, 7, 10, 5, 1, 4, 2, 0, 1],
  [0, 1, 0, 10, 4, 5, 2, 1, 1],
  [0, 0, 0, 0, 10, 9, 0, 0, 1],
  [3, 0, 4, 9, 1, 10, 7, 0, 6],
  [0, 0, 1, 0, 1, 2, 10, 4, 4],
  [4, 0, 0, 0, 0, 0, 1, 10, 4],
  [4, 1, 0, 0, 1, 0, 5, 10, 8]
];

let container = document.querySelector('#attention_demo');
createMatrix(container);

function createMatrix(container){
  let sentenceHolder = document.createElement('div');
  // let matrixHolder = document.createElement('table');
  sentenceHolder.className = 'sentence';
  // matrixHolder.className = 'matrix';
  //
  //
  // // create sentence
  words.forEach((word, i) => {
    let elem = document.createElement('span');
    elem.innerHTML = word;
    elem.onmouseover = wordFocus(i);
    elem.onmouseout = wordBlur();
    sentenceHolder.appendChild(elem);
  });

  // create table
  let table = document.createElement('div');
  table.classList.add('table');
  window.amounts = [];
  words.forEach(word => {
    let row = document.createElement('div');
    row.classList.add('row');
    let label = document.createElement('div');
    label.classList.add('label');
    label.innerHTML = word;
    let amountHolder = document.createElement('div');
    amountHolder.classList.add('amountHolder');
    let amount = document.createElement('div');
    amount.classList.add('amount');
    window.amounts.push(amount);
    amountHolder.appendChild(amount);
    row.appendChild(label);
    row.appendChild(amountHolder);
    table.appendChild(row);
  });

  container.appendChild(sentenceHolder);
  container.appendChild(table);
}

function wordFocus(idx){
  return () => {
    let sizes = values[idx];
    sizes.forEach((size, i) => {
      let w = 600 * size / 10;
      window.amounts[i].style.width = w + 'px';
    });
    $('#attention_demo').classList.add('focused');
  }
}

function wordBlur(){
  return () => {
    window.amounts.forEach(amount => {
      amount.style.width = '600px';
    });
    $('#attention_demo').classList.remove('focused');
  }
}
