const MAX_DEPTH = 5;
let totalCalcs = 0;
let timers = {};
let caches = {
    'evals': {},
    'winners': {}
};

let debug = [];

onmessage = event => {
    startClock('totalTime');
    this.totalMoves = event.data.totalMoves;
    this.humanBits = event.data.humanBits;
    this.cpuBits = event.data.cpuBits;
    let size = event.data.matrix.length;

    this.humanBits = BigInt(this.humanBits);
    this.cpuBits = BigInt(this.cpuBits);

    let move = bestMove(event.data.matrix, this.humanBits, this.cpuBits);

    console.log('totalCalcs: %s', totalCalcs);
    stopClock('totalTime');
    sendMove(move);
}

function bestMove(matrix, humanBits, cpuBits){
    let squares = getSquaresToCheck(matrix, 0);
    let move = null;
    let alpha = -Infinity, beta = Infinity, bestScore = -Infinity;

    for(let i=0; i<squares.length; i++){
        let [y, x] = squares[i];
        let pos = BigInt(y*15+x);

        matrix[y][x] = -1;
        cpuBits |= 1n << pos;
        let score = alphabeta(matrix, 1, alpha, beta, false, humanBits, cpuBits);

        matrix[y][x] = 0;
        cpuBits &= ~(1n << pos);

        console.log('%s evaluated to %s', JSON.stringify([y, x]), score);

        // if we find a win, play it immediately
        if(score === 9999){
            sendProgress(1, 1);
            return [y, x];
        }

        sendProgress(i+1, squares.length);

        if(score > bestScore){
            alpha = score;
            bestScore = score;
            move = [y, x];
        }
    }

    return move;
}

function alphabeta(matrix, depth, alpha, beta, isAiTurn, playerBits, opponentBits, parentNode){
    totalCalcs++;
    if(this.checkWinner(opponentBits, depth)){
        return isAiTurn ? -9999 : 9999;
    }

    // stop at MAX_DEPTH
    if(depth >= MAX_DEPTH){
        if(this.checkWinner(playerBits, depth)){
            return isAiTurn ? 9999 : -9999;
        } else {
            let eval = staticEval(playerBits) - staticEval(opponentBits);
            return isAiTurn ? eval : -eval;
        }
    }

    // if AI's turn, we want to maximize score
    let best = isAiTurn ? -9999 : 9999;
    let squares = getSquaresToCheck(matrix, depth);

    for(let i=0; i<squares.length; i++){

        if(i === 0){
            if(depth === 1){
                console.log()
            } else if(depth === 2){
                console.log()
            } else if(depth === 3){
                console.log()
            } else if(depth === 4){
                console.log()
            }
        }

        let [y, x] = squares[i];
        let pos = BigInt(y*15+x);

        matrix[y][x] = (isAiTurn ? -1 : 1);
        playerBits |= 1n << pos;

        let score = alphabeta(matrix, depth+1, alpha, beta, !isAiTurn, opponentBits, playerBits);

        matrix[y][x] = 0;
        playerBits &= ~(1n << pos);

        if(isAiTurn){
            if(score >= beta){
                return score;
            }

            best = Math.max(score, best);
            alpha = Math.max(alpha, score);
        } else {
            if(score <= alpha){
                return score;
            }

            best = Math.min(score, best);
            beta = Math.min(beta, score);
        }

        if(score === 9999 && isAiTurn){
            return score;
        } else if(score === -9999 && !isAiTurn){
            return score;
        }
    }

    return best;
}

// return surrounding squares that are valid
function getSquaresToCheck(matrix, depth){
    let adjacent = new Set();

    startClock('getSquaresToCheck');

    for(let i=0; i<matrix.length; i++){
        for(let j=0; j<matrix[i].length; j++){
            if(!!matrix[i][j]){
                addAdjacent(i, j);
            }
        }
    }

    adjacent = [...adjacent].sort((x, y) => x-y).map(z => {
        return [z >> 4, z & 0x0F];
    });

    stopClock('getSquaresToCheck');
    return adjacent;

    function addAdjacent(i, j){
        put(i+1, j);
        put(i-1, j);
        put(i, j+1);
        put(i, j-1);
        put(i+1, j+1);
        put(i-1, j+1);
        put(i-1, j-1);
        put(i+1, j-1);

        function put(y, x){
            if(x<0 || y<0 || x>matrix.length-2 || y>matrix.length-2 || !!matrix[y][x]){
                return;
            }

            let val = (y << 4) | x;
            adjacent.add(val);
        }
    }
}

function staticEval(matrix){
    startClock('staticEval');

    if(checkCache('evals', matrix)){
        return checkCache('evals', matrix);
    }

    let total = 0;

    let hMask = 3n;
    let vMask = 32769n;
    let d1Mask = 65537n;
    let d2Mask = 16385n;

    total += matchMask(hMask);
    total += matchMask(d1Mask);
    total += matchMask(d2Mask);

    while(vMask <= matrix){
        if((vMask & matrix) === vMask){
            total++;
        }

        vMask *= 2n;
    }

    putCache('evals', matrix, total);

    stopClock('staticEval');
    return total;

    function matchMask(mask){
        let count = 0;

        for(let i=0; mask <= matrix; i++, mask *= 2n){
            if(i%15 > 10) continue;
            if((mask & matrix) === mask) count++;
        }

        return count;
    }
}

function checkWinner(bits, depth){
    if(this.totalMoves + depth < 9){
        return false;
    }

    if(checkCache('winners', bits) !== false){
        return checkCache('winners', bits);
    }

    startClock('checkWinner');

    if(hasWon(bits)){
        putCache('winners', bits, true);
        stopClock('checkWinner');
        return true;
    }

    putCache('winners', bits, false);
    stopClock('checkWinner');
    return false;

    function hasWon(matrix){
        let h = 31n;
        let v = 1152956690052710401n;
        let d1 = 18447025552981295105n;
        let d2 = 1152991877646254096n;

        if(matchBitmask(matrix, h)) return 1;
        if(matchBitmask(matrix, d1)) return 1;
        if(matchBitmask(matrix, d2)) return 1;

        // vertical is a "bit" different :)
        while(v <= matrix){
            if((v & matrix) === v) return 1;
            v *= 2n;
        }

        return 0;

        function matchBitmask(matrix, mask){
            for(let i=0; mask <= matrix; i++, mask *= 2n){
                if(i%15 > 10) continue;
                if((mask & matrix) === mask) return true;
            }

            return false;
        }
    }
}

function checkCache(cacheName, key){
    key = typeof key === 'string' ? key : key.toString();

    if(key in caches[cacheName]){
        return caches[cacheName][key];
    } else {
        return false;
    }
}

function putCache(cacheName, key, val){
    key = typeof key === 'string' ? key : key.toString();
    caches[cacheName][key] = val;
}

function sendMove(move){
    postMessage({
        type: 'move',
        val: move
    });
}

function sendDebug(message){
    postMessage({
        type: 'debug',
        val: message
    });
}

function sendProgress(completed, total){
    postMessage({
        type: 'progress',
        val: {
            completed: completed,
            total: total
        }
    });
}

function sendCache(cacheName, cache){
    postMessage({
        type: 'cache',
        val: {
            name: cacheName,
            cache: cache
        }
    })
}

function startClock(name){
    timers[name] = timers[name] || {start: 0, elapsed: 0};
    timers[name].start = performance.now();
}

function stopClock(name){
    timers[name].elapsed += performance.now() - timers[name].start;
}
