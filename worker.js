const MAX_DEPTH = 5;
let totalCalcs = 0;
let timers = {};
let caches = {
    'evals': {},
    'winners': {}
};

let debug = [];
let tree = [];

onmessage = event => {
    startClock('totalTime');
    debugger;
    this.totalMoves = event.data.totalMoves;
    this.humanBits = event.data.humanBits;
    this.cpuBits = event.data.cpuBits;
    let size = event.data.matrix.length;

    // this.humanBits = JSBI.BigInt(this.humanBits);
    // this.cpuBits = JSBI.BigInt(this.cpuBits);

    this.humanBits = BigInt(this.humanBits);
    this.cpuBits = BigInt(this.cpuBits);

    let move = bestMove(event.data.matrix, this.humanBits, this.cpuBits);

    console.log('totalCalcs: %s', totalCalcs);
    stopClock('totalTime');

    console.log(tree);
    sendMove(move);
}

function makeTreeNode(move, result, children, isAiTurn, playerBits, opponentBits){
    playerBits = playerBits.toString(2);
    opponentBits = opponentBits.toString(2);

    return {
        move: JSON.stringify(move),
        result: result,
        children: children,
        player: isAiTurn ? 'cpu' : 'human',
        note: (isAiTurn ? 'max' : 'min') + ' value of children',
        cpuBits: isAiTurn ? playerBits : opponentBits,
        humanBits: isAiTurn ? opponentBits : playerBits
    }
}

function bestMove(matrix, humanBits, cpuBits){
    let bestScore = -9999;
    let alpha = -9999;
    let beta = 9999;
    let squares = getSquaresToCheck(matrix, 0);

    if(squares.length === 1){
        sendProgress(1, 1);
        return squares[0];
    }

    let move = null;

    for(let i=0; i<squares.length; i++){
        let [y, x] = squares[i];
        // let pos = JSBI.BigInt(y*15+x);
        let pos = BigInt(y*15+x);

        matrix[y][x] = -1;
        // cpuBits = JSBI.bitwiseOr(cpuBits, JSBI.leftShift(JSBI.one, pos));
        cpuBits |= 1n << pos;

        let treenode = makeTreeNode([y, x], undefined, [], true, cpuBits, humanBits);
        let score = alphabeta(matrix, 1, alpha, beta, false, humanBits, cpuBits, treenode);
        treenode.result = score;
        tree.push(treenode);

        alpha = Math.max(alpha, score);

        matrix[y][x] = 0;
        // cpuBits = JSBI.bitwiseAnd(cpuBits, JSBI.bitwiseNot(JSBI.leftShift(JSBI.one, pos)));
        cpuBits &= ~(1n << pos);

        console.log('%s evaluated to %s', JSON.stringify([y, x]), score);

        treenode.children[treenode.children.length - 1].result = score;

        // if we find a win, play it immediately
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
        // let pos = JSBI.BigInt(y*15+x);
        let pos = BigInt(y*15+x);

        matrix[y][x] = (isAiTurn ? -1 : 1);
        // playerBits = JSBI.bitwiseOr(playerBits, JSBI.leftShift(JSBI.one, pos));
        playerBits |= 1n << pos;

        let treenode = makeTreeNode([y, x], undefined, [], isAiTurn, playerBits, opponentBits);
        let score = alphabeta(matrix, depth+1, alpha, beta, !isAiTurn, opponentBits, playerBits, treenode);
        treenode.result = score;
        parentNode.children.push(treenode);

        if(isAiTurn){
            best = Math.max(score, best);
            alpha = Math.max(alpha, score);
        } else {
            best = Math.min(score, best);
            beta = Math.min(score, beta);
        }

        matrix[y][x] = 0;
        // playerBits = JSBI.bitwiseAnd(playerBits, JSBI.bitwiseNot(JSBI.leftShift(JSBI.one, pos)));
        playerBits &= ~(1n << pos);

        if(alpha >= beta){
            break;
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
    // let hMask = JSBI.BigInt('3');
    // let vMask = JSBI.BigInt('32769');
    // let d1Mask = JSBI.BigInt('65537');
    // let d2Mask = JSBI.BigInt('16385');

    let hMask = 3n;
    let vMask = 32769n;
    let d1Mask = 65537n;
    let d2Mask = 16385n;

    total += matchMask(hMask);
    total += matchMask(d1Mask);
    total += matchMask(d2Mask);

    // while(JSBI.lessThanOrEqual(vMask, matrix)){
    while(vMask <= matrix){
        // if(JSBI.equal(JSBI.bitwiseAnd(vMask, matrix), vMask)){
        if((vMask & matrix) === vMask){
            total++;
        }

        // vMask = JSBI.leftShift(vMask, JSBI.one);
        vMask *= 2n;
    }

    putCache('evals', matrix, total);

    stopClock('staticEval');
    return total;

    function matchMask(mask){
        let count = 0;

        // for(let i=0; JSBI.lessThanOrEqual(mask, matrix); i++, mask = JSBI.leftShift(mask, JSBI.one)){
        for(let i=0; mask <= matrix; i++, mask *= 2n){
            if(i%15 > 10) continue;
            // if(JSBI.equal(JSBI.bitwiseAnd(mask, matrix), mask)) count++;
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
        // let h = JSBI.BigInt('31');
        // let v = JSBI.BigInt('1152956690052710401');
        // let d1 = JSBI.BigInt('18447025552981295105');
        // let d2 = JSBI.BigInt('1152991877646254096');

        let h = 31n;
        let v = 1152956690052710401n;
        let d1 = 18447025552981295105n;
        let d2 = 1152991877646254096n;

        if(matchBitmask(matrix, h)) return 1;
        if(matchBitmask(matrix, d1)) return 1;
        if(matchBitmask(matrix, d2)) return 1;

        // vertical is a "bit" different :)
        // while(JSBI.lessThanOrEqual(v, matrix)){
        while(v <= matrix){
            // if(JSBI.equal(JSBI.bitwiseAnd(v, matrix), v)) return 1;
            if((v & matrix) === v) return 1;
            // v = JSBI.leftShift(v, JSBI.one);
            v *= 2n;
        }

        return 0;

        function matchBitmask(matrix, mask){
            // for(let i=0; JSBI.lessThanOrEqual(mask, matrix); i++, mask = JSBI.leftShift(mask, JSBI.one)){
            for(let i=0; mask <= matrix; i++, mask *= 2n){
                if(i%15 > 10) continue;
                // if(JSBI.equal(JSBI.bitwiseAnd(mask, matrix), mask)) return true;
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

///////////////////////////////////////////////////////////////////////////////
class JSBI extends Array{constructor(a,b){if(a>JSBI.__kMaxLength)throw new RangeError("Maximum BigInt size exceeded");super(a),this.sign=b}static BigInt(a){var b=Math.floor,c=Number.isFinite;if("number"==typeof a){if(0===a)return JSBI.__zero();if((0|a)===a)return 0>a?JSBI.__oneDigit(-a,!0):JSBI.__oneDigit(a,!1);if(!c(a)||b(a)!==a)throw new RangeError("The number "+a+" cannot be converted to BigInt because it is not an integer");return JSBI.__fromDouble(a)}if("string"==typeof a){const b=JSBI.__fromString(a);if(null===b)throw new SyntaxError("Cannot convert "+a+" to a BigInt");return b}if("boolean"==typeof a)return!0===a?JSBI.__oneDigit(1,!1):JSBI.__zero();if("object"==typeof a){if(a.constructor===JSBI)return a;const b=JSBI.__toPrimitive(a);return JSBI.BigInt(b)}throw new TypeError("Cannot convert "+a+" to a BigInt")}toDebugString(){const a=["BigInt["];for(const b of this)a.push((b?(b>>>0).toString(16):b)+", ");return a.push("]"),a.join("")}toString(a=10){if(2>a||36<a)throw new RangeError("toString() radix argument must be between 2 and 36");return 0===this.length?"0":0==(a&a-1)?JSBI.__toStringBasePowerOfTwo(this,a):JSBI.__toStringGeneric(this,a,!1)}static toNumber(a){var b=Math.clz32;const c=a.length;if(0===c)return 0;if(1===c){const b=a.__unsignedDigit(0);return a.sign?-b:b}const d=a.__digit(c-1),e=b(d),f=32*c-e;if(1024<f)return a.sign?-Infinity:1/0;let g=f-1,h=d,i=c-1;const j=e+1;let k=32===j?0:h<<j;k>>>=12;const l=j-12;let m=12<=j?0:h<<20+j,n=20+j;0<l&&0<i&&(i--,h=a.__digit(i),k|=h>>>32-l,m=h<<l,n=l),0<n&&0<i&&(i--,h=a.__digit(i),m|=h>>>32-n,n-=32);const o=JSBI.__decideRounding(a,n,i,h);if((1===o||0===o&&1==(1&m))&&(m=m+1>>>0,0==m&&(k++,0!=k>>>20&&(k=0,g++,1023<g))))return a.sign?-Infinity:1/0;const p=a.sign?-2147483648:0;return g=g+1023<<20,JSBI.__kBitConversionInts[1]=p|g|k,JSBI.__kBitConversionInts[0]=m,JSBI.__kBitConversionDouble[0]}static unaryMinus(a){if(0===a.length)return a;const b=a.__copy();return b.sign=!a.sign,b}static bitwiseNot(a){return a.sign?JSBI.__absoluteSubOne(a).__trim():JSBI.__absoluteAddOne(a,!0)}static exponentiate(a,b){if(b.sign)throw new RangeError("Exponent must be positive");if(0===b.length)return JSBI.__oneDigit(1,!1);if(0===a.length)return a;if(1===a.length&&1===a.__digit(0))return a.sign&&0==(1&b.__digit(0))?JSBI.unaryMinus(a):a;if(1<b.length)throw new RangeError("BigInt too big");let c=b.__unsignedDigit(0);if(1===c)return a;if(c>=JSBI.__kMaxLengthBits)throw new RangeError("BigInt too big");if(1===a.length&&2===a.__digit(0)){const b=1+(c>>>5),d=a.sign&&0!=(1&c),e=new JSBI(b,d);e.__initializeDigits();const f=1<<(31&c);return e.__setDigit(b-1,f),e}let d=null,e=a;for(0!=(1&c)&&(d=a),c>>=1;0!==c;c>>=1)e=JSBI.multiply(e,e),0!=(1&c)&&(null===d?d=e:d=JSBI.multiply(d,e));return d}static multiply(a,b){if(0===a.length)return a;if(0===b.length)return b;let c=a.length+b.length;32<=a.__clzmsd()+b.__clzmsd()&&c--;const d=new JSBI(c,a.sign!==b.sign);d.__initializeDigits();for(let c=0;c<a.length;c++)JSBI.__multiplyAccumulate(b,a.__digit(c),d,c);return d.__trim()}static divide(a,b){if(0===b.length)throw new RangeError("Division by zero");if(0>JSBI.__absoluteCompare(a,b))return JSBI.__zero();const c=a.sign!==b.sign,d=b.__unsignedDigit(0);let e;if(1===b.length&&65535>=d){if(1===d)return c===a.sign?a:JSBI.unaryMinus(a);e=JSBI.__absoluteDivSmall(a,d,null)}else e=JSBI.__absoluteDivLarge(a,b,!0,!1);return e.sign=c,e.__trim()}static remainder(a,b){if(0===b.length)throw new RangeError("Division by zero");if(0>JSBI.__absoluteCompare(a,b))return a;const c=b.__unsignedDigit(0);if(1===b.length&&65535>=c){if(1===c)return JSBI.__zero();const b=JSBI.__absoluteModSmall(a,c);return 0===b?JSBI.__zero():JSBI.__oneDigit(b,a.sign)}const d=JSBI.__absoluteDivLarge(a,b,!1,!0);return d.sign=a.sign,d.__trim()}static add(a,b){const c=a.sign;return c===b.sign?JSBI.__absoluteAdd(a,b,c):0<=JSBI.__absoluteCompare(a,b)?JSBI.__absoluteSub(a,b,c):JSBI.__absoluteSub(b,a,!c)}static subtract(a,b){const c=a.sign;return c===b.sign?0<=JSBI.__absoluteCompare(a,b)?JSBI.__absoluteSub(a,b,c):JSBI.__absoluteSub(b,a,!c):JSBI.__absoluteAdd(a,b,c)}static leftShift(a,b){return 0===b.length||0===a.length?a:b.sign?JSBI.__rightShiftByAbsolute(a,b):JSBI.__leftShiftByAbsolute(a,b)}static signedRightShift(a,b){return 0===b.length||0===a.length?a:b.sign?JSBI.__leftShiftByAbsolute(a,b):JSBI.__rightShiftByAbsolute(a,b)}static unsignedRightShift(){throw new TypeError("BigInts have no unsigned right shift; use >> instead")}static lessThan(a,b){return 0>JSBI.__compareToBigInt(a,b)}static lessThanOrEqual(a,b){return 0>=JSBI.__compareToBigInt(a,b)}static greaterThan(a,b){return 0<JSBI.__compareToBigInt(a,b)}static greaterThanOrEqual(a,b){return 0<=JSBI.__compareToBigInt(a,b)}static equal(a,b){if(a.sign!==b.sign)return!1;if(a.length!==b.length)return!1;for(let c=0;c<a.length;c++)if(a.__digit(c)!==b.__digit(c))return!1;return!0}static notEqual(a,b){return!JSBI.equal(a,b)}static bitwiseAnd(a,b){var c=Math.max;if(!a.sign&&!b.sign)return JSBI.__absoluteAnd(a,b).__trim();if(a.sign&&b.sign){const d=c(a.length,b.length)+1;let e=JSBI.__absoluteSubOne(a,d);const f=JSBI.__absoluteSubOne(b);return e=JSBI.__absoluteOr(e,f,e),JSBI.__absoluteAddOne(e,!0,e).__trim()}return a.sign&&([a,b]=[b,a]),JSBI.__absoluteAndNot(a,JSBI.__absoluteSubOne(b)).__trim()}static bitwiseXor(a,b){var c=Math.max;if(!a.sign&&!b.sign)return JSBI.__absoluteXor(a,b).__trim();if(a.sign&&b.sign){const d=c(a.length,b.length),e=JSBI.__absoluteSubOne(a,d),f=JSBI.__absoluteSubOne(b);return JSBI.__absoluteXor(e,f,e).__trim()}const d=c(a.length,b.length)+1;a.sign&&([a,b]=[b,a]);let e=JSBI.__absoluteSubOne(b,d);return e=JSBI.__absoluteXor(e,a,e),JSBI.__absoluteAddOne(e,!0,e).__trim()}static bitwiseOr(a,b){var c=Math.max;const d=c(a.length,b.length);if(!a.sign&&!b.sign)return JSBI.__absoluteOr(a,b).__trim();if(a.sign&&b.sign){let c=JSBI.__absoluteSubOne(a,d);const e=JSBI.__absoluteSubOne(b);return c=JSBI.__absoluteAnd(c,e,c),JSBI.__absoluteAddOne(c,!0,c).__trim()}a.sign&&([a,b]=[b,a]);let e=JSBI.__absoluteSubOne(b,d);return e=JSBI.__absoluteAndNot(e,a,e),JSBI.__absoluteAddOne(e,!0,e).__trim()}static asIntN(a,b){if(0===b.length)return b;if(0===a)return JSBI.__zero();if(a>=JSBI.__kMaxLengthBits)return b;const c=a+31>>>5;if(b.length<c)return b;const d=b.__unsignedDigit(c-1),e=1<<(31&a-1);if(b.length===c&&d<e)return b;if(!((d&e)===e))return JSBI.__truncateToNBits(a,b);if(!b.sign)return JSBI.__truncateAndSubFromPowerOfTwo(a,b,!0);if(0==(d&e-1)){for(let d=c-2;0<=d;d--)if(0!==b.__digit(d))return JSBI.__truncateAndSubFromPowerOfTwo(a,b,!1);return b.length===c&&d===e?b:JSBI.__truncateToNBits(a,b)}return JSBI.__truncateAndSubFromPowerOfTwo(a,b,!1)}static asUintN(a,b){if(0===b.length)return b;if(0===a)return JSBI.__zero();if(b.sign){if(a>JSBI.__kMaxLengthBits)throw new RangeError("BigInt too big");return JSBI.__truncateAndSubFromPowerOfTwo(a,b,!1)}if(a>=JSBI.__kMaxLengthBits)return b;const c=a+31>>>5;if(b.length<c)return b;const d=31&a;if(b.length==c){if(0==d)return b;const a=b.__digit(c-1);if(0==a>>>d)return b}return JSBI.__truncateToNBits(a,b)}static ADD(a,b){if(a=JSBI.__toPrimitive(a),b=JSBI.__toPrimitive(b),"string"==typeof a)return"string"!=typeof b&&(b=b.toString()),a+b;if("string"==typeof b)return a.toString()+b;if(a=JSBI.__toNumeric(a),b=JSBI.__toNumeric(b),JSBI.__isBigInt(a)&&JSBI.__isBigInt(b))return JSBI.add(a,b);if("number"==typeof a&&"number"==typeof b)return a+b;throw new TypeError("Cannot mix BigInt and other types, use explicit conversions")}static LT(a,b){return JSBI.__compare(a,b,0)}static LE(a,b){return JSBI.__compare(a,b,1)}static GT(a,b){return JSBI.__compare(a,b,2)}static GE(a,b){return JSBI.__compare(a,b,3)}static EQ(a,b){for(;;){if(JSBI.__isBigInt(a))return JSBI.__isBigInt(b)?JSBI.equal(a,b):JSBI.EQ(b,a);if("number"==typeof a){if(JSBI.__isBigInt(b))return JSBI.__equalToNumber(b,a);if("object"!=typeof b)return a==b;b=JSBI.__toPrimitive(b)}else if("string"==typeof a){if(JSBI.__isBigInt(b))return a=JSBI.__fromString(a),null!==a&&JSBI.equal(a,b);if("object"!=typeof b)return a==b;b=JSBI.__toPrimitive(b)}else if("boolean"==typeof a){if(JSBI.__isBigInt(b))return JSBI.__equalToNumber(b,+a);if("object"!=typeof b)return a==b;b=JSBI.__toPrimitive(b)}else if("symbol"==typeof a){if(JSBI.__isBigInt(b))return!1;if("object"!=typeof b)return a==b;b=JSBI.__toPrimitive(b)}else if("object"==typeof a){if("object"==typeof b&&b.constructor!==JSBI)return a==b;a=JSBI.__toPrimitive(a)}else return a==b}}static NE(a,b){return!JSBI.EQ(a,b)}static __zero(){return new JSBI(0,!1)}static __oneDigit(a,b){const c=new JSBI(1,b);return c.__setDigit(0,a),c}__copy(){const a=new JSBI(this.length,this.sign);for(let b=0;b<this.length;b++)a[b]=this[b];return a}__trim(){let a=this.length,b=this[a-1];for(;0===b;)a--,b=this[a-1],this.pop();return 0===a&&(this.sign=!1),this}__initializeDigits(){for(let a=0;a<this.length;a++)this[a]=0}static __decideRounding(a,b,c,d){if(0<b)return-1;let e;if(0>b)e=-b-1;else{if(0===c)return-1;c--,d=a.__digit(c),e=31}let f=1<<e;if(0==(d&f))return-1;if(f-=1,0!=(d&f))return 1;for(;0<c;)if(c--,0!==a.__digit(c))return 1;return 0}static __fromDouble(a){JSBI.__kBitConversionDouble[0]=a;const b=2047&JSBI.__kBitConversionInts[1]>>>20,c=b-1023,d=(c>>>5)+1,e=new JSBI(d,0>a);let f=1048575&JSBI.__kBitConversionInts[1]|1048576,g=JSBI.__kBitConversionInts[0];const h=20,i=31&c;let j,k=0;if(i<20){const a=h-i;k=a+32,j=f>>>a,f=f<<32-a|g>>>a,g<<=32-a}else if(i===20)k=32,j=f,f=g;else{const a=i-h;k=32-a,j=f<<a|g>>>32-a,f=g<<a}e.__setDigit(d-1,j);for(let b=d-2;0<=b;b--)0<k?(k-=32,j=f,f=g):j=0,e.__setDigit(b,j);return e.__trim()}static __isWhitespace(a){return!!(13>=a&&9<=a)||(159>=a?32==a:131071>=a?160==a||5760==a:196607>=a?(a&=131071,10>=a||40==a||41==a||47==a||95==a||4096==a):65279==a)}static __fromString(a,b=0){let c=0;const e=a.length;let f=0;if(f===e)return JSBI.__zero();let g=a.charCodeAt(f);for(;JSBI.__isWhitespace(g);){if(++f===e)return JSBI.__zero();g=a.charCodeAt(f)}if(43===g){if(++f===e)return null;g=a.charCodeAt(f),c=1}else if(45===g){if(++f===e)return null;g=a.charCodeAt(f),c=-1}if(0===b){if(b=10,48===g){if(++f===e)return JSBI.__zero();if(g=a.charCodeAt(f),88===g||120===g){if(b=16,++f===e)return null;g=a.charCodeAt(f)}else if(79===g||111===g){if(b=8,++f===e)return null;g=a.charCodeAt(f)}else if(66===g||98===g){if(b=2,++f===e)return null;g=a.charCodeAt(f)}}}else if(16===b&&48===g){if(++f===e)return JSBI.__zero();if(g=a.charCodeAt(f),88===g||120===g){if(++f===e)return null;g=a.charCodeAt(f)}}for(;48===g;){if(++f===e)return JSBI.__zero();g=a.charCodeAt(f)}const h=e-f;let i=JSBI.__kMaxBitsPerChar[b],j=JSBI.__kBitsPerCharTableMultiplier-1;if(h>1073741824/i)return null;const k=i*h+j>>>JSBI.__kBitsPerCharTableShift,l=new JSBI(k+31>>>5,!1),n=10>b?b:10,o=10<b?b-10:0;if(0==(b&b-1)){i>>=JSBI.__kBitsPerCharTableShift;const b=[],c=[];let d=!1;do{let h=0,j=0;for(;;){let b;if(g-48>>>0<n)b=g-48;else if((32|g)-97>>>0<o)b=(32|g)-87;else{d=!0;break}if(j+=i,h=h<<i|b,++f===e){d=!0;break}if(g=a.charCodeAt(f),32<j+i)break}b.push(h),c.push(j)}while(!d);JSBI.__fillFromParts(l,b,c)}else{l.__initializeDigits();let c=!1,h=0;do{let k=0,p=1;for(;;){let i;if(g-48>>>0<n)i=g-48;else if((32|g)-97>>>0<o)i=(32|g)-87;else{c=!0;break}const d=p*b;if(4294967295<d)break;if(p=d,k=k*b+i,h++,++f===e){c=!0;break}g=a.charCodeAt(f)}j=32*JSBI.__kBitsPerCharTableMultiplier-1;const q=i*h+j>>>JSBI.__kBitsPerCharTableShift+5;l.__inplaceMultiplyAdd(p,k,q)}while(!c)}if(f!==e){if(!JSBI.__isWhitespace(g))return null;for(f++;f<e;f++)if(g=a.charCodeAt(f),!JSBI.__isWhitespace(g))return null}return 0!=c&&10!==b?null:(l.sign=-1==c,l.__trim())}static __fillFromParts(a,b,c){let d=0,e=0,f=0;for(let g=b.length-1;0<=g;g--){const h=b[g],i=c[g];e|=h<<f,f+=i,32===f?(a.__setDigit(d++,e),f=0,e=0):32<f&&(a.__setDigit(d++,e),f-=32,e=h>>>i-f)}if(0!==e){if(d>=a.length)throw new Error("implementation bug");a.__setDigit(d++,e)}for(;d<a.length;d++)a.__setDigit(d,0)}static __toStringBasePowerOfTwo(a,b){var c=Math.clz32;const d=a.length;let e=b-1;e=(85&e>>>1)+(85&e),e=(51&e>>>2)+(51&e),e=(15&e>>>4)+(15&e);const f=e,g=b-1,h=a.__digit(d-1),i=c(h);let j=0|(32*d-i+f-1)/f;if(a.sign&&j++,268435456<j)throw new Error("string too long");const k=Array(j);let l=j-1,m=0,n=0;for(let c=0;c<d-1;c++){const b=a.__digit(c),d=(m|b<<n)&g;k[l--]=JSBI.__kConversionChars[d];const e=f-n;for(m=b>>>e,n=32-e;n>=f;)k[l--]=JSBI.__kConversionChars[m&g],m>>>=f,n-=f}const o=(m|h<<n)&g;for(k[l--]=JSBI.__kConversionChars[o],m=h>>>f-n;0!==m;)k[l--]=JSBI.__kConversionChars[m&g],m>>>=f;if(a.sign&&(k[l--]="-"),-1!=l)throw new Error("implementation bug");return k.join("")}static __toStringGeneric(a,b,c){var d=Math.clz32;const e=a.length;if(0===e)return"";if(1===e){let d=a.__unsignedDigit(0).toString(b);return!1===c&&a.sign&&(d="-"+d),d}const f=32*e-d(a.__digit(e-1)),g=JSBI.__kMaxBitsPerChar[b],h=g-1;let i=f*JSBI.__kBitsPerCharTableMultiplier;i+=h-1,i=0|i/h;const j=i+1>>1,k=JSBI.exponentiate(JSBI.__oneDigit(b,!1),JSBI.__oneDigit(j,!1));let l,m;const n=k.__unsignedDigit(0);if(1===k.length&&65535>=n){l=new JSBI(a.length,!1),l.__initializeDigits();let c=0;for(let b=2*a.length-1;0<=b;b--){const d=c<<16|a.__halfDigit(b);l.__setHalfDigit(b,0|d/n),c=0|d%n}m=c.toString(b)}else{const c=JSBI.__absoluteDivLarge(a,k,!0,!0);l=c.quotient;const d=c.remainder.__trim();m=JSBI.__toStringGeneric(d,b,!0)}l.__trim();let o=JSBI.__toStringGeneric(l,b,!0);for(;m.length<j;)m="0"+m;return!1===c&&a.sign&&(o="-"+o),o+m}static __unequalSign(a){return a?-1:1}static __absoluteGreater(a){return a?-1:1}static __absoluteLess(a){return a?1:-1}static __compareToBigInt(a,b){const c=a.sign;if(c!==b.sign)return JSBI.__unequalSign(c);const d=JSBI.__absoluteCompare(a,b);return 0<d?JSBI.__absoluteGreater(c):0>d?JSBI.__absoluteLess(c):0}static __compareToNumber(a,b){if(b|!0){const c=a.sign,d=0>b;if(c!==d)return JSBI.__unequalSign(c);if(0===a.length){if(d)throw new Error("implementation bug");return 0===b?0:-1}if(1<a.length)return JSBI.__absoluteGreater(c);const e=Math.abs(b),f=a.__unsignedDigit(0);return f>e?JSBI.__absoluteGreater(c):f<e?JSBI.__absoluteLess(c):0}return JSBI.__compareToDouble(a,b)}static __compareToDouble(a,b){var c=Math.clz32;if(b!==b)return b;if(b===1/0)return-1;if(b===-Infinity)return 1;const d=a.sign;if(d!==0>b)return JSBI.__unequalSign(d);if(0===b)throw new Error("implementation bug: should be handled elsewhere");if(0===a.length)return-1;JSBI.__kBitConversionDouble[0]=b;const e=2047&JSBI.__kBitConversionInts[1]>>>20;if(2047==e)throw new Error("implementation bug: handled elsewhere");const f=e-1023;if(0>f)return JSBI.__absoluteGreater(d);const g=a.length;let h=a.__digit(g-1);const i=c(h),j=32*g-i,k=f+1;if(j<k)return JSBI.__absoluteLess(d);if(j>k)return JSBI.__absoluteGreater(d);let l=1048576|1048575&JSBI.__kBitConversionInts[1],m=JSBI.__kBitConversionInts[0];const n=20,o=31-i;if(o!==(j-1)%31)throw new Error("implementation bug");let p,q=0;if(20>o){const a=n-o;q=a+32,p=l>>>a,l=l<<32-a|m>>>a,m<<=32-a}else if(20===o)q=32,p=l,l=m;else{const a=o-n;q=32-a,p=l<<a|m>>>32-a,l=m<<a}if(h>>>=0,p>>>=0,h>p)return JSBI.__absoluteGreater(d);if(h<p)return JSBI.__absoluteLess(d);for(let c=g-2;0<=c;c--){0<q?(q-=32,p=l>>>0,l=m,m=0):p=0;const b=a.__unsignedDigit(c);if(b>p)return JSBI.__absoluteGreater(d);if(b<p)return JSBI.__absoluteLess(d)}if(0!==l||0!==m){if(0===q)throw new Error("implementation bug");return JSBI.__absoluteLess(d)}return 0}static __equalToNumber(a,b){var c=Math.abs;return b|0===b?0===b?0===a.length:1===a.length&&a.sign===0>b&&a.__unsignedDigit(0)===c(b):0===JSBI.__compareToDouble(a,b)}static __comparisonResultToBool(a,b){switch(b){case 0:return 0>a;case 1:return 0>=a;case 2:return 0<a;case 3:return 0<=a;}throw new Error("unreachable")}static __compare(a,b,c){if(a=JSBI.__toPrimitive(a),b=JSBI.__toPrimitive(b),"string"==typeof a&&"string"==typeof b)switch(c){case 0:return a<b;case 1:return a<=b;case 2:return a>b;case 3:return a>=b;}if(JSBI.__isBigInt(a)&&"string"==typeof b)return b=JSBI.__fromString(b),null!==b&&JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a,b),c);if("string"==typeof a&&JSBI.__isBigInt(b))return a=JSBI.__fromString(a),null!==a&&JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a,b),c);if(a=JSBI.__toNumeric(a),b=JSBI.__toNumeric(b),JSBI.__isBigInt(a)){if(JSBI.__isBigInt(b))return JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a,b),c);if("number"!=typeof b)throw new Error("implementation bug");return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(a,b),c)}if("number"!=typeof a)throw new Error("implementation bug");if(JSBI.__isBigInt(b))return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(b,a),2^c);if("number"!=typeof b)throw new Error("implementation bug");return 0===c?a<b:1===c?a<=b:2===c?a>b:3===c?a>=b:void 0}__clzmsd(){return Math.clz32(this[this.length-1])}static __absoluteAdd(a,b,c){if(a.length<b.length)return JSBI.__absoluteAdd(b,a,c);if(0===a.length)return a;if(0===b.length)return a.sign===c?a:JSBI.unaryMinus(a);let d=a.length;(0===a.__clzmsd()||b.length===a.length&&0===b.__clzmsd())&&d++;const e=new JSBI(d,c);let f=0,g=0;for(;g<b.length;g++){const c=b.__digit(g),d=a.__digit(g),h=(65535&d)+(65535&c)+f,i=(d>>>16)+(c>>>16)+(h>>>16);f=i>>>16,e.__setDigit(g,65535&h|i<<16)}for(;g<a.length;g++){const b=a.__digit(g),c=(65535&b)+f,d=(b>>>16)+(c>>>16);f=d>>>16,e.__setDigit(g,65535&c|d<<16)}return g<e.length&&e.__setDigit(g,f),e.__trim()}static __absoluteSub(a,b,c){if(0===a.length)return a;if(0===b.length)return a.sign===c?a:JSBI.unaryMinus(a);const d=new JSBI(a.length,c);let e=0,f=0;for(;f<b.length;f++){const c=a.__digit(f),g=b.__digit(f),h=(65535&c)-(65535&g)-e;e=1&h>>>16;const i=(c>>>16)-(g>>>16)-e;e=1&i>>>16,d.__setDigit(f,65535&h|i<<16)}for(;f<a.length;f++){const b=a.__digit(f),c=(65535&b)-e;e=1&c>>>16;const g=(b>>>16)-e;e=1&g>>>16,d.__setDigit(f,65535&c|g<<16)}return d.__trim()}static __absoluteAddOne(a,b,c=null){const d=a.length;null===c?c=new JSBI(d,b):c.sign=b;let e=!0;for(let f,g=0;g<d;g++){f=a.__digit(g);const b=-1===f;e&&(f=0|f+1),e=b,c.__setDigit(g,f)}return e&&c.__setDigitGrow(d,1),c}static __absoluteSubOne(a,b){const c=a.length;b=b||c;const d=new JSBI(b,!1);let e=!0;for(let f,g=0;g<c;g++){f=a.__digit(g);const b=0===f;e&&(f=0|f-1),e=b,d.__setDigit(g,f)}for(let e=c;e<b;e++)d.__setDigit(e,0);return d}static __absoluteAnd(a,b,c=null){let d=a.length,e=b.length,f=e;if(d<e){f=d;const c=a,g=d;a=b,d=e,b=c,e=g}let g=f;null===c?c=new JSBI(g,!1):g=c.length;let h=0;for(;h<f;h++)c.__setDigit(h,a.__digit(h)&b.__digit(h));for(;h<g;h++)c.__setDigit(h,0);return c}static __absoluteAndNot(a,b,c=null){const d=a.length,e=b.length;let f=e;d<e&&(f=d);let g=d;null===c?c=new JSBI(g,!1):g=c.length;let h=0;for(;h<f;h++)c.__setDigit(h,a.__digit(h)&~b.__digit(h));for(;h<d;h++)c.__setDigit(h,a.__digit(h));for(;h<g;h++)c.__setDigit(h,0);return c}static __absoluteOr(a,b,c=null){let d=a.length,e=b.length,f=e;if(d<e){f=d;const c=a,g=d;a=b,d=e,b=c,e=g}let g=d;null===c?c=new JSBI(g,!1):g=c.length;let h=0;for(;h<f;h++)c.__setDigit(h,a.__digit(h)|b.__digit(h));for(;h<d;h++)c.__setDigit(h,a.__digit(h));for(;h<g;h++)c.__setDigit(h,0);return c}static __absoluteXor(a,b,c=null){let d=a.length,e=b.length,f=e;if(d<e){f=d;const c=a,g=d;a=b,d=e,b=c,e=g}let g=d;null===c?c=new JSBI(g,!1):g=c.length;let h=0;for(;h<f;h++)c.__setDigit(h,a.__digit(h)^b.__digit(h));for(;h<d;h++)c.__setDigit(h,a.__digit(h));for(;h<g;h++)c.__setDigit(h,0);return c}static __absoluteCompare(a,b){const c=a.length-b.length;if(0!=c)return c;let d=a.length-1;for(;0<=d&&a.__digit(d)===b.__digit(d);)d--;return 0>d?0:a.__unsignedDigit(d)>b.__unsignedDigit(d)?1:-1}static __multiplyAccumulate(a,b,c,d){var e=Math.imul;if(0===b)return;const f=65535&b,g=b>>>16;let h=0,j=0,k=0;for(let l=0;l<a.length;l++,d++){let b=c.__digit(d),i=65535&b,m=b>>>16;const n=a.__digit(l),o=65535&n,p=n>>>16,q=e(o,f),r=e(o,g),s=e(p,f),t=e(p,g);i+=j+(65535&q),m+=k+h+(i>>>16)+(q>>>16)+(65535&r)+(65535&s),h=m>>>16,j=(r>>>16)+(s>>>16)+(65535&t)+h,h=j>>>16,j&=65535,k=t>>>16,b=65535&i|m<<16,c.__setDigit(d,b)}for(;0!=h||0!==j||0!==k;d++){let a=c.__digit(d);const b=(65535&a)+j,e=(a>>>16)+(b>>>16)+k+h;j=0,k=0,h=e>>>16,a=65535&b|e<<16,c.__setDigit(d,a)}}static __internalMultiplyAdd(a,b,c,d,e){var f=Math.imul;let g=c,h=0;for(let j=0;j<d;j++){const c=a.__digit(j),d=f(65535&c,b),i=(65535&d)+h+g;g=i>>>16;const k=f(c>>>16,b),l=(65535&k)+(d>>>16)+g;g=l>>>16,h=k>>>16,e.__setDigit(j,l<<16|65535&i)}if(e.length>d)for(e.__setDigit(d++,g+h);d<e.length;)e.__setDigit(d++,0);else if(0!==g+h)throw new Error("implementation bug")}__inplaceMultiplyAdd(a,b,c){var e=Math.imul;c>this.length&&(c=this.length);const f=65535&a,g=a>>>16;let h=0,j=65535&b,k=b>>>16;for(let l=0;l<c;l++){const a=this.__digit(l),b=65535&a,c=a>>>16,d=e(b,f),i=e(b,g),m=e(c,f),n=e(c,g),o=j+(65535&d),p=k+h+(o>>>16)+(d>>>16)+(65535&i)+(65535&m);j=(i>>>16)+(m>>>16)+(65535&n)+(p>>>16),h=j>>>16,j&=65535,k=n>>>16;this.__setDigit(l,65535&o|p<<16)}if(0!=h||0!==j||0!==k)throw new Error("implementation bug")}static __absoluteDivSmall(a,b,c){null===c&&(c=new JSBI(a.length,!1));let d=0;for(let e,f=2*a.length-1;0<=f;f-=2){e=(d<<16|a.__halfDigit(f))>>>0;const g=0|e/b;d=0|e%b,e=(d<<16|a.__halfDigit(f-1))>>>0;const h=0|e/b;d=0|e%b,c.__setDigit(f>>>1,g<<16|h)}return c}static __absoluteModSmall(a,b){let c=0;for(let d=2*a.length-1;0<=d;d--){const e=(c<<16|a.__halfDigit(d))>>>0;c=0|e%b}return c}static __absoluteDivLarge(a,b,d,e){var f=Math.imul;const g=b.__halfDigitLength(),h=b.length,c=a.__halfDigitLength()-g;let i=null;d&&(i=new JSBI(c+2>>>1,!1),i.__initializeDigits());const k=new JSBI(g+2>>>1,!1);k.__initializeDigits();const l=JSBI.__clz16(b.__halfDigit(g-1));0<l&&(b=JSBI.__specialLeftShift(b,l,0));const m=JSBI.__specialLeftShift(a,l,1),n=b.__halfDigit(g-1);let o=0;for(let l,p=c;0<=p;p--){l=65535;const a=m.__halfDigit(p+g);if(a!==n){const c=(a<<16|m.__halfDigit(p+g-1))>>>0;l=0|c/n;let d=0|c%n;const e=b.__halfDigit(g-2),h=m.__halfDigit(p+g-2);for(;f(l,e)>>>0>(d<<16|h)>>>0&&(l--,d+=n,!(65535<d)););}JSBI.__internalMultiplyAdd(b,l,0,h,k);let e=m.__inplaceSub(k,p,g+1);0!==e&&(e=m.__inplaceAdd(b,p,g),m.__setHalfDigit(p+g,m.__halfDigit(p+g)+e),l--),d&&(1&p?o=l<<16:i.__setDigit(p>>>1,o|l))}return e?(m.__inplaceRightShift(l),d?{quotient:i,remainder:m}:m):d?i:void 0}static __clz16(a){return Math.clz32(a)-16}__inplaceAdd(a,b,c){let d=0;for(let e=0;e<c;e++){const c=this.__halfDigit(b+e)+a.__halfDigit(e)+d;d=c>>>16,this.__setHalfDigit(b+e,c)}return d}__inplaceSub(a,b,c){let d=0;if(1&b){b>>=1;let e=this.__digit(b),f=65535&e,g=0;for(;g<c-1>>>1;g++){const c=a.__digit(g),h=(e>>>16)-(65535&c)-d;d=1&h>>>16,this.__setDigit(b+g,h<<16|65535&f),e=this.__digit(b+g+1),f=(65535&e)-(c>>>16)-d,d=1&f>>>16}const h=a.__digit(g),i=(e>>>16)-(65535&h)-d;d=1&i>>>16,this.__setDigit(b+g,i<<16|65535&f);if(b+g+1>=this.length)throw new RangeError("out of bounds");0==(1&c)&&(e=this.__digit(b+g+1),f=(65535&e)-(h>>>16)-d,d=1&f>>>16,this.__setDigit(b+a.length,4294901760&e|65535&f))}else{b>>=1;let e=0;for(;e<a.length-1;e++){const c=this.__digit(b+e),f=a.__digit(e),g=(65535&c)-(65535&f)-d;d=1&g>>>16;const h=(c>>>16)-(f>>>16)-d;d=1&h>>>16,this.__setDigit(b+e,h<<16|65535&g)}const f=this.__digit(b+e),g=a.__digit(e),h=(65535&f)-(65535&g)-d;d=1&h>>>16;let i=0;0==(1&c)&&(i=(f>>>16)-(g>>>16)-d,d=1&i>>>16),this.__setDigit(b+e,i<<16|65535&h)}return d}__inplaceRightShift(a){if(0===a)return;let b=this.__digit(0)>>>a;const c=this.length-1;for(let e=0;e<c;e++){const c=this.__digit(e+1);this.__setDigit(e,c<<32-a|b),b=c>>>a}this.__setDigit(c,b)}static __specialLeftShift(a,b,c){const d=a.length,e=new JSBI(d+c,!1);if(0===b){for(let b=0;b<d;b++)e.__setDigit(b,a.__digit(b));return 0<c&&e.__setDigit(d,0),e}let f=0;for(let g=0;g<d;g++){const c=a.__digit(g);e.__setDigit(g,c<<b|f),f=c>>>32-b}return 0<c&&e.__setDigit(d,f),e}static __leftShiftByAbsolute(a,b){const c=JSBI.__toShiftAmount(b);if(0>c)throw new RangeError("BigInt too big");const e=c>>>5,f=31&c,g=a.length,h=0!==f&&0!=a.__digit(g-1)>>>32-f,j=g+e+(h?1:0),k=new JSBI(j,a.sign);if(0===f){let b=0;for(;b<e;b++)k.__setDigit(b,0);for(;b<j;b++)k.__setDigit(b,a.__digit(b-e))}else{let b=0;for(let a=0;a<e;a++)k.__setDigit(a,0);for(let c=0;c<g;c++){const g=a.__digit(c);k.__setDigit(c+e,g<<f|b),b=g>>>32-f}if(h)k.__setDigit(g+e,b);else if(0!=b)throw new Error("implementation bug")}return k.__trim()}static __rightShiftByAbsolute(a,b){const c=a.length,d=a.sign,e=JSBI.__toShiftAmount(b);if(0>e)return JSBI.__rightShiftByMaximum(d);const f=e>>>5,g=31&e;let h=c-f;if(0>=h)return JSBI.__rightShiftByMaximum(d);let i=!1;if(d){if(0!=(a.__digit(f)&(1<<g)-1))i=!0;else for(let b=0;b<f;b++)if(0!==a.__digit(b)){i=!0;break}}if(i&&0===g){const b=a.__digit(c-1);0==~b&&h++}let j=new JSBI(h,d);if(0===g)for(let b=f;b<c;b++)j.__setDigit(b-f,a.__digit(b));else{let b=a.__digit(f)>>>g;const d=c-f-1;for(let c=0;c<d;c++){const e=a.__digit(c+f+1);j.__setDigit(c,e<<32-g|b),b=e>>>g}j.__setDigit(d,b)}return i&&(j=JSBI.__absoluteAddOne(j,!0,j)),j.__trim()}static __rightShiftByMaximum(a){return a?JSBI.__oneDigit(1,!0):JSBI.__zero()}static __toShiftAmount(a){if(1<a.length)return-1;const b=a.__unsignedDigit(0);return b>JSBI.__kMaxLengthBits?-1:b}static __toPrimitive(a,b="default"){if("object"!=typeof a)return a;if(a.constructor===JSBI)return a;const c=a[Symbol.toPrimitive];if(c){const a=c(b);if("object"!=typeof a)return a;throw new TypeError("Cannot convert object to primitive value")}const d=a.valueOf;if(d){const b=d.call(a);if("object"!=typeof b)return b}const e=a.toString;if(e){const b=e.call(a);if("object"!=typeof b)return b}throw new TypeError("Cannot convert object to primitive value")}static __toNumeric(a){return JSBI.__isBigInt(a)?a:+a}static __isBigInt(a){return"object"==typeof a&&a.constructor===JSBI}static __truncateToNBits(a,b){const c=a+31>>>5,d=new JSBI(c,b.sign),e=c-1;for(let c=0;c<e;c++)d.__setDigit(c,b.__digit(c));let f=b.__digit(e);if(0!=(31&a)){const b=32-(31&a);f=f<<b>>>b}return d.__setDigit(e,f),d.__trim()}static __truncateAndSubFromPowerOfTwo(a,b,c){var d=Math.min;const e=a+31>>>5,f=new JSBI(e,c);let g=0;const h=e-1;let j=0;for(const e=d(h,b.length);g<e;g++){const a=b.__digit(g),c=0-(65535&a)-j;j=1&c>>>16;const d=0-(a>>>16)-j;j=1&d>>>16,f.__setDigit(g,65535&c|d<<16)}for(;g<h;g++)f.__setDigit(g,0|-j);let k=h<b.length?b.__digit(h):0;const l=31&a;let m;if(0==l){const a=0-(65535&k)-j;j=1&a>>>16;const b=0-(k>>>16)-j;m=65535&a|b<<16}else{const a=32-l;k=k<<a>>>a;const b=1<<32-a,c=(65535&b)-(65535&k)-j;j=1&c>>>16;const d=(b>>>16)-(k>>>16)-j;m=65535&c|d<<16,m&=b-1}return f.__setDigit(h,m),f.__trim()}__digit(a){return this[a]}__unsignedDigit(a){return this[a]>>>0}__setDigit(a,b){this[a]=0|b}__setDigitGrow(a,b){this[a]=0|b}__halfDigitLength(){const a=this.length;return 65535>=this.__unsignedDigit(a-1)?2*a-1:2*a}__halfDigit(a){return 65535&this[a>>>1]>>>((1&a)<<4)}__setHalfDigit(a,b){const c=a>>>1,d=this.__digit(c),e=1&a?65535&d|b<<16:4294901760&d|65535&b;this.__setDigit(c,e)}static __digitPow(a,b){let c=1;for(;0<b;)1&b&&(c*=a),b>>>=1,a*=a;return c}}JSBI.__kMaxLength=33554432,JSBI.__kMaxLengthBits=JSBI.__kMaxLength<<5,JSBI.__kMaxBitsPerChar=[0,0,32,51,64,75,83,90,96,102,107,111,115,119,122,126,128,131,134,136,139,141,143,145,147,149,151,153,154,156,158,159,160,162,163,165,166],JSBI.__kBitsPerCharTableShift=5,JSBI.__kBitsPerCharTableMultiplier=1<<JSBI.__kBitsPerCharTableShift,JSBI.__kConversionChars=["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"],JSBI.__kBitConversionBuffer=new ArrayBuffer(8),JSBI.__kBitConversionDouble=new Float64Array(JSBI.__kBitConversionBuffer),JSBI.__kBitConversionInts=new Int32Array(JSBI.__kBitConversionBuffer),JSBI.one=JSBI.BigInt(1);
