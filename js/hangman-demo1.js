window.onload = async function(){
    $('#play').onclick = () => {
        $('#play').disabled = true;
        $('#demo1 input').disabled = true;
        playGame($('#demo1 input').value, window.dictionary);
        $('#reset').disabled = false;
    };

    $('#reset').onclick = () => {
        $('#demo1 input').value = '';
        $('#demo1 input').disabled = false;
        clear();
        $('#reset').disabled = true;
        $('#play').disabled = false;
    };

    $('#reset').disabled = true;

    if(!window.dictionary){
        $('#demo1 input').disabled = true;
        $('#play').disabled = true;
        print('loading dictionary...');
        window.dictionary = await fetch('/four-letters.json');
        window.dictionary = await dictionary.json();
        $('#play').disabled = false;
        $('#demo1 input').disabled = false;
        clear();
    }
}

function print(str){
    str = str || '\n';

    let elem = document.createElement('div');
    elem.innerText = str;
    $('#output').appendChild(elem);
}

function clear(){
    while ($('#output').firstChild) {
        $('#output').removeChild($('#output').firstChild);
    }
}

function $(str){
    return document.querySelector(str);
}

function playGame(secret, dictionary){
    clear();
    $('#play').disabled = true;

    if(secret.length !== 4){
        print('secret word must have 4 letters!')
        return;
    }

    secret = secret.toLowerCase();

    if(!dictionary.includes(secret)){
        print(`word "${ secret }" not found in dictionary!`);
        return;
    }

    let result = _playGame(secret, dictionary);
    print('\n\n');
    print(`found word "${ secret }" after ${ result } mistakes`);
}

function _playGame(secret, dictionary){
    let mistakes = 0;
    let solved = false;
    let alphabet = {'a':1,'b':1,'c':1,'d':1,'e':1,'f':1,'g':1,'h':1,'i':1,'j':1,'k':1,'l':1,
        'm':1,'n':1,'o':1,'p':1,'q':1,'r':1,'s':1,'t':1,'u':1,'v':1,'w':1,'x':1,'y':1,'z':1};
    let knownLetters = [];
    let regex = buildRegex(secret, knownLetters);

    while(!solved){
        print('regex: ' + regex)
        print(dictionary.length + ' possible words')

        let probabilities = {};

        // build probabilities
        Object.keys(alphabet).forEach(letter => {
            probabilities[letter] = 0;
        });

        dictionary.forEach(word => {

            // iterate over letters left in alphabet which are in word
            Object.keys(alphabet).forEach(letter => {
                if(word.includes(letter)){
                    probabilities[letter]++;
                }
            })
        });

        // find letter with highest probability
        maxProb = 0
        guess = 'z'
        Object.keys(probabilities).forEach(letter => {
            if(probabilities[letter] > maxProb){
                maxProb = probabilities[letter];
                guess = letter;
            }
        })

        print('guessing letter ' + guess);
        delete alphabet[guess];

        // guess the letter
        if(secret.includes(guess)){
            print('letter ' + guess + ': CORRECT')
            knownLetters.push(guess)
            regex = buildRegex(secret, knownLetters)

            if(!regex.includes('.')){
                return mistakes;
            }

            dictionary = dictionary.filter(word => {
                return word.match(regex);
            })

            if(dictionary.length === 1){
                print('one word left in dictionary: ' + dictionary[0]);
                print('total mistakes: ' + mistakes);
            }
        } else {
            print('letter ' + guess + ': INCORRECT')
            mistakes += 1
            dictionary = dictionary.filter(word => {
                return !word.includes(guess);
            });
        }

        print('')
    }
}

function buildRegex(secret, knownLetters){
    return secret.split('').map(letter => {
        return knownLetters.includes(letter) ? letter : '.';
    }).join('');
}
