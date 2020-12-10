let inside = {
    label: 'inside circle',
    backgroundColor: '#36a2eb',
    radius: 1,
    hoverRadius: 1,
    data: []
};

let outside = {
    label: 'outside circle',
    backgroundColor: '#000000',
    radius: 1,
    hoverRadius: 1,
    data: []
};

let lineData = {
    label: 'estimated pi',
    yAxisID: 'y1',
    fill: false,
    backgroundColor: '#36a2eb',
    borderColor: '#36a2eb',
    pointRadius: 0,
    hoverRadius: 1,
    lineTension: 0,
    borderWidth: 1,
    data: []
}

let piData = {
    label: 'pi',
    yAxisID: 'y1',
    fill: false,
    backgroundColor: '#36eb44',
    borderColor: '#36eb44',
    pointRadius: 0,
    hoverRadius: 1,
    lineTension: 0,
    borderWidth: 1,
    data: []
}

let lineLabels = [];

let errorData = {
    label: '% error',
    yAxisID: 'y2',
    fill: false,
    backgroundColor: '#eb3636',
    borderColor: '#eb3636',
    pointRadius: 0,
    hoverRadius: 1,
    lineTension: 0,
    borderWidth: 1,
    data: []
}

let numIn = 0, numOut=0;

window.onload = () => {
    $('#sim1 .start').onclick = () => {
        $('#sim1 .start').disabled = true;
        $('#sim1 .stop').disabled = false;

        window.sim1IntervalId = setInterval(() => {
            for(let j=0; j<10; j++){
                let x = Math.random()*2 - 1;
                let y = Math.random()*2 - 1;

                if((x*x + y*y) > 1){
                    outside.data.push({
                        x: x, y: y
                    });
                } else {
                    inside.data.push({
                        x: x, y: y
                    });
                }
            }

            window.scatterPlot.update();

            let i = inside.data.length;
            let o = outside.data.length;
            let ratio = i / (i + o);

            $('#num-points').innerText = 'Number of points: ' + (i + o).toLocaleString();
            $('#pct-inside').innerText = '% inside circle: ' + (ratio*100).toFixed(4) + '%';
            $('#pi').innerText = 'Approximate value of pi: ' + ratio*4;
        }, 100);
    };
    $('#sim1 .stop').onclick = () => {
        $('#sim1 .start').disabled = false;
        $('#sim1 .stop').disabled = true;

        clearInterval(window.sim1IntervalId);
    }
    $('#sim2 .start').onclick = () => {
        $('#sim2 .start').disabled = true;
        $('#sim2 .stop').disabled = false;

        let i=numIn; o=numOut;

        window.sim2IntervalId = setInterval(() => {
            for(let j=0; j<10000; j++){
                let x = Math.random()*2 - 1;
                let y = Math.random()*2 - 1;

                if(Math.sqrt(x*x + y*y) > 1){
                    o++;
                } else {
                    i++;
                }
            }

            let ratio = i / (i + o);
            let err = Math.abs(((ratio*4 - Math.PI)/Math.PI)*100);

            $('.num-points').innerText = 'Number of points: ' + (i + o).toLocaleString();
            $('.pi').innerText = 'Approximate value of pi: ' + ratio*4;
            $('.pct-error').innerText = '% error: ' + err.toFixed(4) + '%';

            lineData.data.push(ratio*4);
            lineLabels.push(i + o);
            piData.data.push(3.14159);
            errorData.data.push(err);
            window.lineChart.update();
            numIn = i;
            numOut = o;
        }, 100);
    };
    $('#sim2 .stop').onclick = () => {
        $('#sim2 .start').disabled = false;
        $('#sim2 .stop').disabled = true;

        clearInterval(window.sim2IntervalId);
    }

	window.scatterPlot = Chart.Scatter($('#sim1 canvas').getContext('2d'), {
		data: {
            datasets: [inside, outside]
        },
        options: {
            backgroundColor: '#444',
            pointRadius: 1,
            animation: false,
            scales: {
                xAxes: [{
					ticks: {
						min: -1,
						max: 1
					}
				}],
                yAxes: [{
					ticks: {
						min: -1,
						max: 1
					}
				}]
			},
    		title: {
    			display: false
    		},
            legend: {
                display: false
            },
            tooltips: {
                enabled: false
            },
            responsive:true,
            maintainAspectRatio: false
        }
	});
    window.lineChart = new Chart($('#sim2 canvas').getContext('2d'), {
        type: 'line',
        data: {
            labels: lineLabels,
            datasets: [lineData, piData, errorData]
        },
        options: {
            backgroundColor: '#444',
            pointRadius: 1,
            animation: false,
            responsive: true,
            scales: {
                yAxes: [{
                    id: 'y1',
                    position: 'left',
                    scaleLabel:{
                        labelString: 'value',
                        display: true,
                    },
					ticks: {
						min: 3.12,
						max: 3.16
					}
				},
                {
                    id: 'y2',
                    position: 'right',
                    scaleLabel:{
                        labelString: '% error',
                        display: true,
                    },
                    ticks: {
                        min: -0,
                        max: 0.1
                    }
                }]
			},
            title: {
                display: false
            },
            // legend: {
            //     display: false
            // },
            tooltips: {
                enabled: false
            },
            maintainAspectRatio: false
        }
    });
};

function $(str){
    return document.querySelector(str);
}
