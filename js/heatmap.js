class Heatmap {
  constructor(data, settings){
    let [height, width] = this.validityCheck(data);

    if(height < 1 || width < 1){
      console.error('invalid data shape');
      return;
    }

    this.height = height;
    this.width = width;
    this.data = this.normalize(data);
    this.settings = settings;
    this.lowColor = settings.lowColor || '#cb31ff';
    this.highColor = settings.highColor || '#ff9300';
    this.lowColor = this.toRGB(this.lowColor.substring(1));
    this.highColor = this.toRGB(this.highColor.substring(1));
    this.labels = settings.labels;
    this.legend = !settings.hideLegend;
  }

  validityCheck(data){
    if(!data || !data.length || !data[0] || !data[0].length){
      return [-1, -1]
    }

    let width = data[0].length;
    let height = data.length;
    for(let i=0; i<height; i++){
      if(data[i].length !== width){
        return [-1, -1];
      }
    }

    return [height, width];
  }

  render(element){
    function getWidth(parent){
      return parent.clientWidth;
    }

    if(!element){
      console.error('element does not exist!');
      return;
    }

    element = document.querySelector('#' + element);
    let chartWidth = this.settings.chartWidth || getWidth(element.parentElement);
    element.style.position = 'relative';
    element.style.width = chartWidth + 'px';
    element.style.height = (chartWidth / this.width) * this.height + 'px';
    let heatmapWidth = chartWidth - 50;
    let cellWidth = heatmapWidth / this.width;
    let cellHeight = cellWidth;

    let holder = document.createElement('div');
    holder.classList.add('heatmap_holder');

    let labelLeft = document.createElement('div');
    labelLeft.classList.add('label_left');
    let labelBottom = document.createElement('div');
    labelBottom.classList.add('label_bottom');

    for(let r=0; r<this.height; r++){
      let row = document.createElement('div');
      row.classList.add('heatmap_row');

      for(let c=0; c<this.width; c++){
        let val = this.data[r][c];
        let cell = document.createElement('div');
        cell.classList.add('heatmap_cell');
        cell.style.backgroundColor = this.interpolate(val);
        cell.style.width = cellWidth + 'px';
        cell.style.height = cellHeight + 'px';
        row.appendChild(cell);
      }

      holder.appendChild(row);
    }

    for(let i=0; i<this.labels.length; i++){
      let label = document.createElement('div');
      label.style.height = cellHeight + 'px'
      let text = document.createElement('span');
      text.innerText = this.labels[i];
      label.appendChild(text);
      let idx = this.labels.indexOf(this.labels[i]);

      let label1 = label.cloneNode(true);
      let label2 = label.cloneNode(true);
      label1.onmouseover = this.highlightLabel(holder, idx);
      label1.onmouseout = this.unhighlightLabel(holder);
      label2.onmouseover = this.highlightLabel(holder, idx);
      label2.onmouseout = this.unhighlightLabel(holder);

      labelLeft.appendChild(label1);
      labelBottom.appendChild(label2);
    }

    if(this.legend){
      let legend = document.createElement('div');
      let legendLeft = document.createElement('div');
      let legendMiddle = document.createElement('div');
      let legendRight = document.createElement('div');
      legend.classList.add('legend');
      legendLeft.classList.add('legend_left');
      legendMiddle.classList.add('legend_middle');
      legendRight.classList.add('legend_right');

      for(let i=0; i<100; i++){
        let m = document.createElement('div');
        m.style.backgroundColor = this.interpolate(1 - (i/100));
        legendMiddle.appendChild(m);
      }

      legendLeft.innerText = 'worse';
      legendRight.innerText = 'better';

      legend.appendChild(legendLeft);
      legend.appendChild(legendMiddle);
      legend.appendChild(legendRight);
      element.appendChild(legend);
    }

    element.appendChild(labelLeft);
    element.appendChild(holder);
    element.appendChild(labelBottom);
  }

  highlightLabel(holder, idx){
    return () =>{
      [...holder.childNodes].forEach((row,y) => {
        [...row.childNodes].forEach((sq,x) => {
          if(y === idx || x === idx) return;
          sq.classList.add('shade');
        });
      });
    };
  }

  unhighlightLabel(holder){
    return () => {
      [...holder.childNodes].forEach(row => {
        [...row.childNodes].forEach(x => {
          x.classList.remove('shade');
        });
      });
    };
  }

  normalize(data){
    let m = this.max(data.map(row => this.max(row)));
    data = data.map(row => {
      return row.map(x => x/m);
    });
    return data;
  }

  max(arr){
    let m = arr[0];
    for(let i=0; i<arr.length; i++){
      m = Math.max(arr[i], m);
    }
    return m;
  }

  interpolate(val){
    let A = this.highColor, B = this.lowColor;

    function colorVal(prop){
      return Math.round(A[prop] * (1 - val) + B[prop] * val)
                  .toString(16)
                  .padStart(2, '0');
    }

    let color = '#' + colorVal('r') + colorVal('g') + colorVal('b');
    return color;
  }

  toRGB(color){
    return {
      'r': parseInt(color.substring(0,2), 16),
      'g': parseInt(color.substring(2,4), 16),
      'b': parseInt(color.substring(4,6), 16)
    }
  }
}
