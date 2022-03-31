const DELAYS = [2000, 1000, 500, 100, 50];
const DELAY_TEXT = ['very slow', 'slow', 'medium', 'fast', 'very fast'];

window.onload = async function(){
  $('#padding .val').innerText = getPadding();
  $('#kernelsize .val').innerText = getKernelSize();
  $('#stride .val').innerText = getStride();
  $('#speed .val').innerText = DELAY_TEXT[getSpeed()];
  window.delay = DELAYS[getSpeed()];

  // fetch numbers array
  fetch('/data/handwritten_numbers.json')
    .then(data => data.json())
    .then(data => {
      window.numbers = data;
      reset(getPadding(), getKernelSize(), getStride());
    });

  $('#number select').onchange = () => {
    reset(getPadding(), getKernelSize(), getStride());
  }

  $("#padding input").oninput = function(){
    reset(getPadding(), getKernelSize(), getStride());
    $('#padding .val').innerText = this.value;
  }

  $("#kernelsize input").oninput = function(){
    reset(getPadding(), getKernelSize(), getStride());
    $('#kernelsize .val').innerText = this.value;
  }

  $("#stride input").oninput = function(){
    reset(getPadding(), getKernelSize(), getStride());
    $('#stride .val').innerText = this.value;
  }

  $('#speed input').oninput = function(){
    let speed = getSpeed();
    window.delay = DELAYS[speed];
    $('#speed .val').innerText = DELAY_TEXT[speed];
    reset(getPadding(), getKernelSize(), getStride());
  }
}

function reset(padding, kernelSize, stride){
  window.num = paddedInput();
  $('#errors').style.display = 'none';
  clearInput();
  clearOutput(padding, kernelSize, stride);
  clearInterval(window.crawlIntervalId);

  if(!checkSettings(padding, kernelSize, stride)) return;

  window.highlighted = {input: [], output: []};
  window.started = true;
  startCrawl();
}

function drawGrid(data, parentNode){
  parentNode.innerHTML = '';
  for(let i=0; i<data.length; i++){
    let row = document.createElement('div');
    row.classList.add('row');

    for(let j=0; j<data[i].length; j++){
      let box = document.createElement('div');
      box.style.background = interpolate(data[i][j]);
      row.appendChild(box);
    }

    parentNode.appendChild(row);
  }
}

function startCrawl(){
  let padding = getPadding();
  let kernelSize = getKernelSize();
  let stride = getStride();

  let inSize = window.num.length;
  let outSize = ((window.num.length - kernelSize)/stride) + 1;

  window.inGenerator = positionGenerator(inSize, stride, kernelSize, 'input');
  window.outGenerator = positionGenerator(outSize, 1, 1, 'output');
  window.convWidth = window.num[0].length + 2*padding;
  window.convHeight = window.num.length + 2*padding;

  window.crawlIntervalId = setInterval(() => {
    // clear old window from input
    eraseWindow(kernelSize, 'input');

    window.inPos = window.inGenerator.next().value;
    window.outPos = window.outGenerator.next().value;

    if(!window.inPos){
      clearOutput(padding, kernelSize, stride);
      window.num = paddedInput();
      window.inGenerator = positionGenerator(inSize, stride, kernelSize, 'input');
      window.outGenerator = positionGenerator(outSize, 1, 1, 'output');
      window.inPos = window.inGenerator.next().value;
      window.outPos = window.outGenerator.next().value;
    }

    drawInputWindow(kernelSize);
    drawOutputWindow(kernelSize);
  }, window.delay);
}

function drawInputWindow(size){
  if(!window.inPos) return;
  let [x, y] = window.inPos;
  window.highlighted.input = [];

  for(let i=0; i<size; i++){
    window.highlighted.input.push({'x':x+i, 'y':y});
    window.highlighted.input.push({'x':x, 'y':y+i});

    let square = getSquareAt(x+i, y);
    if(square) square.classList.add('window-top');
    square = getSquareAt(x, y+i);
    if(square) square.classList.add('window-left');

    if(y+size >= window.num.length){
      window.highlighted.input.push({'x':x+i, 'y':y+size-1});
      getSquareAt(x+i, y+size-1).classList.add('window-bottom');
    } else {
      window.highlighted.input.push({'x':x+i, 'y':y+size});
      getSquareAt(x+i, y+size).classList.add('window-top');
    }

    if(x+size >= window.num[0].length){
      window.highlighted.input.push({'x':x+size-1, 'y':y+i});
      getSquareAt(x+size-1, y+i).classList.add('window-right');
    } else {
      window.highlighted.input.push({'x':x+size, 'y':y+i});
      getSquareAt(x+size, y+i).classList.add('window-left');
    }
  }
}

function drawOutputWindow(kernelSize){
  let [inX, inY] = window.inPos;
  let [outX, outY] = window.outPos;
  let value = convolute(inX, inY, kernelSize);
  getOutSquareAt(outX, outY).style.background = interpolate(value);
}

function eraseWindow(size, type){
  if(!window.inPos) return;

  window.highlighted[type].forEach(s => {
    let square = type === 'input' ? getSquareAt(s.x, s.y) : getOutSquareAt(s.x, s.y);
    if(!square) return;

    square.classList.remove('window-top');
    square.classList.remove('window-bottom');
    square.classList.remove('window-left');
    square.classList.remove('window-right');
  });
}

function clearInput(){
  drawGrid(window.num, $('#input-grid'));
}

function clearOutput(padding, kernelSize, stride){
  if(!checkSettings(padding, kernelSize, stride)){
    return false;
  }

  let size = ((window.num.length - kernelSize)/stride) + 1;
  let empty = Array(size).fill(Array(size).fill(0));
  drawGrid(empty, $('#output-grid'));
  return true;
}

function paddedInput(){
  window.num = deepCopy(window.numbers[getNumber()]);
  let padding = getPadding();
  if(!padding) return window.num;

  let newSize = window.num.length + 2*padding;
  let padded = Array(padding).fill(Array(newSize).fill(0));

  let pad = Array(padding).fill(0);
  window.num.forEach(row => {
    padded.push(pad.concat(row).concat(pad));
  });

  pad.forEach(() => padded.push(Array(newSize).fill(0)));
  window.num = padded;
  return padded;
}

function* positionGenerator(size, stride, ks, type){
  for(let i=0; i+ks-1<size; i+=stride){
    for(let j=0; j+ks-1<size; j+=stride){
      yield [j, i];
    }
  }
}

function checkSettings(padding, kernelSize, stride){
  if((window.num.length - kernelSize + (2 * padding)) % stride === 0){
    return true;
  }

  $('#errors td').innerHTML = 'Illegal settings!';
  $('#errors').style.display = 'table-row';
  clearInterval(window.crawlIntervalId);
  return false;
}

function getSquareAt(x, y){
  if(!$('#input-grid').children.item(y)) return null;
  return $('#input-grid').children.item(y).children.item(x);
}

function getOutSquareAt(x, y){
   let node = $('#output-grid').children.item(y).children.item(x);
   if(!node) throw `Could not find node at x=${x}, y=${y}`;
   return node;
}

function interpolate(num){
  return 'rgba(128,255,219,' + num + ')';
}

function interpolateWindow(num){
  return 'rgba(161,0,255,' + (num*0.6 + .4) + ')';
}

function convolute(x, y, kernelSize){
  let max = -1;
  for(let i=0; i<kernelSize; i++){
    for(let j=0; j<kernelSize; j++){
      max = Math.max(max, window.num[y+i][x+j]);
    }
  }

  return max;
}

function getNumber(){
  return $('#number select').selectedIndex;
}

function getPadding(){
  return parseInt($('#padding input').value);
}

function getKernelSize(){
  return parseInt($('#kernelsize input').value);
}

function getStride(){
  return parseInt($('#stride input').value);
}

function getSpeed(){
  return parseInt($('#speed input').value) - 1;
}
