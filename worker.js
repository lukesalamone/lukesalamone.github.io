const MAX_DEPTH = 4;
let totalCalcs = 0;
let timers = {};

onmessage = event => {
    startClock('totalTime');
    this.totalMoves = event.data.totalMoves;
    this.humanBits = event.data.humanBits;
    this.cpuBits = event.data.cpuBits;

    let size = event.data.matrix.length;
    let move = bestMove(event.data.matrix, this.humanBits, this.cpuBits);

    console.log('totalCalcs: %s', totalCalcs);
    stopClock('totalTime');

    console.table(timers);
    sendMove(move);
}

function bestMove(matrix, humanBits, cpuBits){
    let bestScore = -Infinity;
    let squares = getSquaresToCheck(matrix, 0);

    if(squares.length === 1){
        sendProgress(1, 1);
        return squares[0];
    }

    let move = null;

    for(let i=0; i<squares.length; i++){
        let [y, x] = squares[i];

        matrix[y][x] = -1;
        let score = alphabeta(matrix, 1, -Infinity, Infinity, false, humanBits, cpuBits);
        matrix[y][x] = 0;

        console.log('%s evaluated to %s', JSON.stringify([y, x]), score);

        if(score === 9999){
            sendProgress(1, 1);
            return [y, x];
        }

        sendProgress(i+1, squares.length);

        if(score > bestScore){
            bestScore = score;
            move = [y, x];
        }
    }

    return move;
}

function alphabeta(matrix, depth, alpha, beta, isAiTurn, playerBits, opponentBits){
    totalCalcs++;
    if(this.checkWinner(opponentBits, depth)){
        return isAiTurn ? -9999 : 9999;
    }

    // stop at MAX_DEPTH
    if(depth >= MAX_DEPTH){
        let eval = staticEval(matrix);
        return eval;
    }

    // if AI's turn, we want to maximize score
    let best = isAiTurn ? -Infinity : Infinity;
    let squares = getSquaresToCheck(matrix, depth);

    for(let i=0; i<squares.length; i++){
        let [y, x] = squares[i];
        let pos = y*15+x;

        matrix[y][x] = (isAiTurn ? -1 : 1);
        playerBits |= 1n << BigInt(pos);

        let score = alphabeta(matrix, depth+1, alpha, beta, !isAiTurn, opponentBits, playerBits);
        best = isAiTurn ? Math.max(score, best) : Math.min(score, best);

        if(isAiTurn){
            alpha = Math.max(alpha, best);
        } else {
            beta = Math.min(beta, best);
        }

        matrix[y][x] = 0;
        playerBits &= ~(1n << BigInt(pos));

        if(alpha >= beta){
            // console.log('alpha beta pruned at %s', JSON.stringify([y, x]));
            break;
        }
    }

    return best;
}

// enhance by checking for forced wins first
// i.e. squares which can complete a 5 in a row
function getSquaresToCheck(matrix, depth){
    let forcedWins = [];
    let adjacent = new Set();

    startClock('getSquaresToCheck');

    for(let i=0; i<matrix.length; i++){
        for(let j=0; j<matrix[i].length; j++){
            if(!!matrix[i][j]){
                addAdjacent(i, j);
            }
        }
    }

    adjacent = [...adjacent].map(z => {
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

        function put(x, y){
            if(x<0 || y<0 || x>matrix.length-2 || y>matrix.length-2){
                return;
            }

            let val = (x << 4) | y;
            adjacent.add(val);
        }
    }
}

function staticEval(matrix){
    startClock('staticEval');
    let a = horizontalScore(matrix) || 0;
    let b = verticalScore(matrix) || 0;
    let c = diagonalScore(matrix) || 0;

    stopClock('staticEval');
    return a + b + c;

    // perform static analysis on the rows of the board
    function horizontalScore(matrix){
        let score = 0;

        for(let i=0; i<matrix.length; i++){
            let current = 0;
            let streak = 0;

            for(let j=0; j<matrix[i].length; j++){
                ({current, streak, score} = scoreConsecutive(matrix[i][j], current, streak, score));
            }

            if(current !== 0){
                score += current * adjacentBlockScore(streak);
            }
        }

        return -1 * score;
    }

    // static analysis on columns
    function verticalScore(matrix){
        let score = 0;

        for(let i=0; i<matrix[0].length; i++){
            let current = 0;
            let streak = 0;

            for(let j=0; j<matrix.length; j++){
                ({current, streak, score} = scoreConsecutive(matrix[j][i], current, streak, score));
            }

            if(current !== 0){
                score += current * adjacentBlockScore(streak);
            }
        }

        return -1 * score;
    }

    // static analysis on diagonals
    function diagonalScore(matrix){
        // return 0;

        let len = matrix.length, score = 0;
        let res = {d1: {}, d2: {}, d3: {}, d4: {}};

        for(let i=4; i<len; i++){

            // set current and streak to 0 for each diagonal
            for(let key in res){
                res[key] = {streak: 0, current: 0, score: 0};
            }

            for(let j=0; j<=i; j++){
                let x = i-j;
                let y = j;
                res.d1 = process(matrix[i-j][j], res.d1);

                x = len-1-j;
                y = i-j;
                res.d2 = process(matrix[len-1-j][i-j], res.d2);

                x = j;
                y = len-1-i+j;
                res.d3 = process(matrix[j][len-1-i+j], res.d3);

                x = len-1-i;
                y = len - 1 - j;
                res.d4 = process(matrix[len-1-i+j][len-1-j], res.d4);
            }

            score += res.d1.score + res.d2.score +
                res.d3.score + res.d4.score;
        }

        return -1 * score;

        function process(block, obj){
            return scoreConsecutive(block, obj.current, obj.streak, obj.score);
        }
    }

    // score a consecutive group of blocks
    function scoreConsecutive(block, current, streak, score){
        if(block !== current){
            if(current === 0){
                current = block;
                streak = 1;
            } else {
                score += current * adjacentBlockScore(streak);
                current = block;
                streak = 1;
            }
        } else {
            if(block !== 0) streak++;
        }

        return {
            'current': current,
            'streak': streak,
            'score': score
        };
    }

    /** *
        * score a consecutive group of blocks
        *   count:  number in a row
        *
    */
    function adjacentBlockScore(count){
        const scoreMatrix = [0, 2, 4, 8, 16, 32];

        try {
            return scoreMatrix[count];
        } catch(e){
            return -1;
        }
    }
}

function checkWinner(bits, depth){
    if(this.totalMoves + depth < 9){
        return false;
    }

    startClock('checkWinner')

    if(hasWon(bits)){
        stopClock('checkWinner');
        return true;
    }

    stopClock('checkWinner');
    return false;

    function hasWon(matrix){
        let h  = 31n;
        let v   = 1152956690052710401n;
        let d1  = 18447025552981295105n;
        let d2  = 1152991877646254096n;

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
            for(let i=0; mask<=matrix; i++, mask*=2n){
                if(i%15 > 10) continue;
                if((mask & matrix) === mask) return true;
            }

            return false;
        }
    }
}

// enhance cache by excluding depth and turn as keys
// since both will be the same for a given matrix key
function checkCache(matrix){
    matrix = matrix.toString();

    if(this.cache.has(matrix)){
        cacheHits++;
        return this.cache.get(matrix);
    } else {
        cacheMisses++;
        return false;
    }
}

function putCache(matrix, result){
    if(typeof result !== 'number' || isNaN(result)){
        console.error('cannot put "%s" in cache', result);
        return;
    }

    this.cache.set(matrix.toString(), result);
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
