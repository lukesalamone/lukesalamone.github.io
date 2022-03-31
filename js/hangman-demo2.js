window.addEventListener('load', async function(){
    $('#demo2 .play').onclick = () => {
        $('#demo2 .play').disabled = true;
        $('#demo2 input').disabled = true;
        playGame($('#demo2 input').value, window.dictionary);
        $('#demo2 .reset').disabled = false;
    };

    $('#demo2 .reset').onclick = () => {
        $('#demo2 input').value = '';
        $('#demo2 input').disabled = false;

        if(window.lineChart){
            window.lineChart.destroy();
            $('#demo2 .canvas-holder').style.display = 'none';
        }

        if(window.lineChartInterval){
            clearInterval(window.lineChartInterval);
        }

        clear();
        $('#demo2 .reset').disabled = true;
        $('#demo2 .play').disabled = false;
    };

    $('#demo2 .reset').disabled = true;

    if(!window.dictionary){
        $('#demo2 input').disabled = true;
        $('#demo2 .play').disabled = true;
        print('loading dictionary...');
        window.dictionary = await fetch('/four-letters.json');
        window.dictionary = await dictionary.json();
        $('#demo2 .play').disabled = false;
        $('#demo2 input').disabled = false;
        clear();
    }
});

function print(str){
    str = str || '\n';
    $('#demo2 .messages span').innerText = str;
}

function clear(){
    $('#demo2 .messages span').innerText = '';
}

function playGame(secret, dictionary){
    $('#demo2 .play').disabled = true;

    if(secret.length !== 4){
        print('secret word must have 4 letters!');
        return;
    }

    secret = secret.toLowerCase();

    if(!dictionary.includes(secret)){
        print(`word "${ secret }" not found in dictionary!`);
        return;
    }

    let result = _playGame2(secret, dictionary);
    print(`found word "${ secret }" after average of ${ result } mistakes`);
}

function _playGame2(secret, dictionary){
    let rounds = 500;

    let total = 0;
    let lineData = {
        label: 'average mistakes',
        yAxisID: 'y1',
        fill: false,
        backgroundColor: '#36a2eb',
        borderColor: '#36a2eb',
        pointRadius: 0,
        hoverRadius: 1,
        lineTension: 0,
        borderWidth: 1,
        data: [],
        max: 10
    };

    $('#demo2 .canvas-holder').style.display = 'block';

    window.lineChart = new Chart($('#demo2 canvas').getContext('2d'), {
        type: 'line',
        data: {
            labels: [...Array(rounds+1).keys()].slice(1),
            datasets: [lineData]
        },
        options:{
            // backgroundColor: '#444',
            pointRadius: 1,
            animation: true,
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
                        min: 0,
                        max: lineData.max + 1
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
            maintainAspectRatio: false
        }
    });

    window.lineChartInterval = setInterval(() => {
        if(lineData.data.length >= rounds){
            clearInterval(window.lineChartInterval);
            return;
        }

        let result = _playRound(secret, dictionary);
        total += result;
        let avg = total / (lineData.data.length+1);
        lineData.data.push(avg);
        lineData.max = Math.max(lineData.max, avg);
        window.lineChart.update();
        print(`round: ${ lineData.data.length }, average mistakes: ${ avg }`);
    }, 50);

    return lineData.data[rounds-1];
}

function _playRound(secret, dictionary){
    let mistakes = 0;
    let solved = false;
    let alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m",
                    "n","o","p","q","r","s","t","u","v","w","x","y","z"];

    // shuffle alphabet
    alphabet.sort((a, b) => Math.random() > 0.5 ? -1 : 1);

    let knownLetters = [];
    let regex = buildRegex(secret, knownLetters);

    while(!solved){
        let probabilities = {};

        // build probabilities
        alphabet.forEach(letter => {
            probabilities[letter] = 0;
        });

        dictionary.forEach(word => {

            // iterate over letters left in alphabet which are in word
            alphabet.forEach(letter => {
                if(word.includes(letter)){
                    probabilities[letter]++;
                }
            })
        });

        maxProb = 0
        let guess = 'z'
        Object.keys(probabilities).forEach(letter => {
            if(probabilities[letter] > maxProb){
                maxProb = probabilities[letter];
                guess = letter;
            }
        })

        alphabet = alphabet.filter(x => x !== guess);

        // guess the letter
        if(secret.includes(guess)){
            knownLetters.push(guess)
            regex = buildRegex(secret, knownLetters)

            if(!regex.includes('.')){
                return mistakes;
            }

            dictionary = dictionary.filter(word => {
                return word.match(regex);
            })

            if(dictionary.length === 1){
                return mistakes;
            }
        } else {
            mistakes += 1
            dictionary = dictionary.filter(word => {
                return !word.includes(guess);
            });
        }
    }
}
