window.onload = function(){

  const config = {
    type: 'pie',
    data: {
      labels: ['words', 'non-word', 'unicode', 'symbols', 'numbers', 'other'],
      datasets: [{
        label: 'My First Dataset',
        data: [36481, 10460, 835, 782, 1691, 8],
        backgroundColor: [
          '#7e0082',
          '#bdef53',
          '#d5e3ac',
          '#96dff4',
          '#f662d1',
          '#ddd'
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      legend: {
        labels: {
          fontColor: '#ccc'
        }
      }
    }
  };

  window.pie = new Chart(document.querySelector('#pie canvas').getContext('2d'), config);
};
