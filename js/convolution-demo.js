let actual = [[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.16470587,0.9019608,0.5176471,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.16862744,0.89411765,0.99607843,0.80784315,0.0,0.0,0.0,0.3647059,0.38431373,0.082352936,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.59607846,0.99607843,0.99607843,0.3529412,0.0,0.0,0.1490196,0.9647059,0.99607843,0.21568626,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.015686274,0.49803922,0.99215686,0.99607843,0.6745098,0.06666666,0.0,0.0,0.49019608,0.99607843,0.7490196,0.05098039,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.054901958,0.99607843,0.99607843,0.99607843,0.18823528,0.0,0.0,0.0,0.49019608,0.99607843,0.67058825,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.007843137,0.40392157,0.99607843,0.99607843,0.99607843,0.18823528,0.0,0.0,0.019607842,0.7921569,0.99607843,0.67058825,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.1372549,0.99607843,0.99607843,0.99607843,0.53333336,0.09019607,0.0,0.0,0.027450979,0.99607843,0.99607843,0.67058825,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.6666667,0.99607843,0.99607843,0.34117648,0.0039215684,0.0,0.0,0.0,0.5568628,0.99607843,0.99607843,0.67058825,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.07843137,0.7921569,0.99607843,0.8156863,0.015686274,0.0,0.0,0.07058823,0.41568628,0.9529412,0.99607843,0.99607843,0.7882353,0.07843137,0.0,0.0,0.0],[0.0,0.0,0.082352936,0.72156864,0.99607843,0.99607843,0.9019608,0.8117647,0.8117647,0.8117647,0.84705883,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.654902,0.0,0.0,0.0],[0.0,0.0,0.24313724,0.9529412,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.99607843,0.83137256,0.31764707,0.0,0.0,0.0],[0.0,0.0,0.0,0.26666668,0.7137255,0.89411765,0.99607843,0.9490196,0.8901961,0.8901961,0.78431374,0.41960785,0.99607843,0.99607843,0.73333335,0.04705882,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.02352941,0.43137255,0.24313724,0.0,0.0,0.0,0.109803915,0.99607843,0.99607843,0.5921569,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.109803915,0.99607843,0.99607843,0.5921569,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.33333334,0.99607843,0.99607843,0.07843137,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.6509804,0.99607843,0.99607843,0.05098039,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.6509804,0.99607843,0.99607843,0.05098039,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.56078434,0.99607843,0.99607843,0.14117646,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.10196078,0.9647059,0.99607843,0.5921569,0.0,0.0,0.0,0.0,0.0],[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.5529412,0.45882353,0.27058825,0.0,0.0,0.0,0.0,0.0]];

const DELAYS = [2000, 1000, 500, 100, 50];
const DELAY_TEXT = ['very slow', 'slow', 'medium', 'fast', 'very fast'];

window.onload = function(){
  let padding = getPadding();
  let kernelSize = getKernelSize();
  let stride = getStride();
  let speed = getSpeed();

  $('#padding .val').innerText = padding;
  $('#kernelsize .val').innerText = kernelSize;
  $('#stride .val').innerText = stride;
  $('#speed .val').innerText = DELAY_TEXT[speed];
  window.delay = DELAYS[speed]

  reset(padding, kernelSize, stride);

  $("#padding input").oninput = function(){
    reset(getPadding(), kernelSize, stride);
    $('#padding .val').innerText = this.value;
  }

  $("#kernelsize input").oninput = function(){
    reset(padding, getKernelSize(), stride);
    $('#kernelsize .val').innerText = this.value;
  }

  $("#stride input").oninput = function(){
    reset(padding, kernelSize, getStride());
    $('#stride .val').innerText = this.value;
  }

  $('#speed input').oninput = function(){
    let speed = getSpeed();
    window.delay = DELAYS[speed];
    $('#speed .val').innerText = DELAY_TEXT[speed];
  }
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

function reset(padding, kernelSize, stride){
  $('#errors').style.display = 'none';
  clearInput();
  let ok = clearOutput(padding, kernelSize, stride);

  clearInterval(window.crawlIntervalId);
  if(!ok) return;

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

function interpolate(num){
  return 'rgba(128,255,219,' + num + ')';
}

function interpolateWindow(num){
  return 'rgba(161,0,255,' + (num*0.6 + .4) + ')';
}

function startCrawl(){
  let padding = getPadding();
  let kernelSize = getKernelSize();
  let stride = getStride();

  let inSize = actual[0].length + 2*padding;
  let outSize = ((actual.length - kernelSize + 2*padding)/stride) + 1;

  window.inGenerator = positionGenerator(inSize, stride, kernelSize);
  window.outGenerator = positionGenerator(outSize, 1, 1);
  window.convWidth = actual[0].length + 2*padding;
  window.convHeight = actual.length + 2*padding;

  window.crawlIntervalId = setInterval(() => {
    // clear old window from input
    eraseWindow(kernelSize);

    window.inPos = window.inGenerator.next().value;
    window.outPos = window.outGenerator.next().value;

    // if(window.started){
    //   window.started = false;
    //   drawInputWindow(kernelSize);
    //   drawOutputWindow(kernelSize, stride);
    //   return;
    // }

    if(!window.inPos){
      clearOutput(padding, kernelSize, stride);
      window.inGenerator = positionGenerator(inSize, stride, kernelSize);
      window.outGenerator = positionGenerator(outSize, 1, 1);
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

  for(let i=0; i<size; i++){
    getSquareAt(x+i, y).classList.add('window-top');
    getSquareAt(x, y+i).classList.add('window-left');

    if(y+size >= actual.length){
      getSquareAt(x+i, y+size-1).classList.add('window-bottom');
    } else {
      getSquareAt(x+i, y+size).classList.add('window-top');
    }

    if(x+size >= actual[0].length){
      getSquareAt(x+size-1, y+i).classList.add('window-right');
    } else {
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

function convolute(x, y, kernelSize){
  let max = -1;
  for(let i=0; i<kernelSize; i++){
    for(let j=0; j<kernelSize; j++){
      max = Math.max(max, actual[y+i][x+j]);
    }
  }

  return max;
}

function eraseWindow(size){
  if(!window.inPos) return;

  let [x, y] = window.inPos;

  for(let i=0; i<size; i++){
    getSquareAt(x+i, y).classList.remove('window-top');
    getSquareAt(x, y+i).classList.remove('window-left');

    if(y+size >= actual.length){
      getSquareAt(x+i, y+size-1).classList.remove('window-bottom');
    } else {
      getSquareAt(x+i, y+size).classList.remove('window-top');
    }

    if(x+size >= actual[0].length){
      getSquareAt(x+size-1, y+i).classList.remove('window-right');
    } else {
      getSquareAt(x+size, y+i).classList.remove('window-left');
    }


  }

  // for(let i=0; i<size; i++){
  //   for(let j=0; j<size; j++){
  //     let [x, y] = window.inPos;
  //     x += j;
  //     y += i;
  //     getSquareAt(x, y).style.background = interpolate(actual[y][x]);
  //   }
  // }
}

function clearInput(){
  drawGrid(actual, $('#input-grid'));
}

function clearOutput(padding, kernelSize, stride){
  if((actual.length - kernelSize + (2 * padding)) % stride !== 0){
    $('#errors').innerHTML = `<p style='font-weight:bold'>Illegal settings</p>
        <p>padding: ${ padding }</p>
        <p>kernel size: ${ kernelSize }</p>
        <p>stride: ${ stride }</p>
      `;
    $('#errors').style.display = 'inline-block';
    return false;
  }

  let size = ((actual.length - kernelSize + 2*padding)/stride) + 1;
  let empty = Array(size).fill(Array(size).fill(0));
  drawGrid(empty, $('#output-grid'));
  return true;
}

function* positionGenerator(size, stride, ks){
  for(let i=0; i+ks-1<size; i+=stride){
    for(let j=0; j+ks-1<size; j+=stride){
      yield [j, i];
    }
  }
}

function getSquareAt(x, y){
  return $('#input-grid').children.item(y).children.item(x);
}

function getOutSquareAt(x, y){
  return $('#output-grid').children.item(y).children.item(x);
}

function $(str){
  return document.querySelector(str);
}
