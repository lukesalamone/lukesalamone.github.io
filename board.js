const SIZE = 15;

class Board{
    constructor(parentNode, onSquareClickedCb) {
        this.matrix = [];
        this.parentNode = parentNode;
        this.onSquareClickedCb = onSquareClickedCb;
        this.left = Infinity;
        this.right = -Infinity;
        this.top = Infinity;
        this.bottom = -Infinity;
        this.totalMoves = 0;
        this.boardBitsHuman = new Array(SIZE ** 2).fill(0);
        this.boardBitsCpu = new Array(SIZE ** 2).fill(0);


        this.hMask1 = [1,1,1,1,1, ...new Array(SIZE-5).fill(0)];
        this.hMask2 = [...new Array(SIZE-5).fill(0), 1,1,1,1,1];

        let arr = new Array(SIZE+1).fill(0);
        this.dMask1 = [1, ...arr, 1, ...arr, 1, ...arr, 1, ...arr, 1];
        arr.pop();
        this.vMask = [1, ...arr, 1, ...arr, 1, ...arr, 1, ...arr, 1];
        arr.pop();
        this.dMask2 = [1, ...arr, 1, ...arr, 1, ...arr, 1, ...arr, 1];

        // generate board
        for(let i=0; i<SIZE; i++){
            let r = [];
            let row = document.createElement("div");
            row.classList.add('row');
            row.classList.add(i);

            for(let j=0; j<SIZE; j++){
                let square = new Square(i, j);

                square.setOnClick(onSquareClickedCb(i, j));

                row.appendChild(square.getDomObj());
                r.push(square);
            }

            parentNode.appendChild(row);
            this.matrix.push(r);
        }
    }

    onSquareClicked(row, col){
        this.totalMoves++;
        this.left = Math.min(col, this.left);
        this.right = Math.max(col, this.right);
        this.top = Math.min(row, this.top);
        this.bottom = Math.max(row, this.bottom);
        this.boardBitsHuman[row * SIZE + col] = 1;
        this.matrix[row][col].onHumanSelect();
    }

    onCpuClick(row, col){
        // do stuff
        this.totalMoves++;
        this.left = Math.min(col, this.left);
        this.right = Math.max(col, this.right);
        this.top = Math.min(row, this.top);
        this.bottom = Math.max(row, this.bottom);
        this.boardBitsCpu[row * SIZE + col] = -1;

        this.matrix[row][col].onCpuSelect();
    }

    getTotalMoves(){
        return this.totalMoves;
    }

    getSize(){
        return SIZE;
    }

    getOccupiedSquares(){
        return this.matrix.reduce((arr, row) => {
            arr.push(...row.filter(square => square.isOccupied()));
            return arr;
        }, []);
    }

    getSquare(row, col) {
        try {
            return this.matrix[row][col];
        } catch(e){
            console.log(e);
        }
    }

    // return array of rows of Squares
    getMatrix(){
        return this.matrix;
    }

    // return array of rows of raw values
    getRawMatrix(){
        return this.matrix.reduce((arr, row) => {

            // for each row, reduce to raw values
            row = row.reduce((a, c) => {
                a.push(c.getVal())
                return a;
            }, []);

            arr.push(row);
            return arr;
        }, []);
    }

    getRow(num){
        return this.matrix[num];
    }

    // remove empty squares that only necessary squares are evaluated
    // optional padding will be applied around played squares
    static pruneMatrix(matrix, padding){
        let left = this.left, right = this.right, top = this.top, bottom = this.bottom;
        const SIZE = 20;

        if(padding){
            left = Math.max(0, left - padding);
            right = Math.min(SIZE, right + padding);
            top = Math.max(0, top - padding);
            bottom = Math.min(SIZE, bottom + padding);
        }

        // always return square matrix
        // left: 0, right: 10, top: 0, bottom: 8
        if((right-left) - (bottom-top)){
            console.log('normalizing pruned size');
            console.log('left: %s, right: %s, top: %s, bottom: %s', left, right, top, bottom);

            let width = right - left;
            let height = bottom - top;
            let size = Math.max(width, height);

            if(width !== size){
                // add half to left and right
                let x = size - width;
                left = Math.max(0, left - Math.floor(x/2));
                right = Math.min(19, right + Math.floor(x/2));
                x = size - (right - left);

                if(x){
                    if(left){
                        left -= x;
                    } else {
                        right += x;
                    }
                }
            } else if(height !== size){
                let x = size - height;
                top = Math.max(0, top - Math.floor(x/2));
                bottom = Math.min(19, bottom + Math.floor(x/2));
                x = size - (bottom - top);

                if(x){
                    if(top){
                        top -= x;
                    } else {
                        bottom += x;
                    }
                }
            }

            // check results
            if((bottom-top) !== (right-left)){
                console.log('error!! unequal sizes!!!')
            }
        }

        let copy = [];

        for(let i=top; i<=bottom; i++){
            let row = [];

            for(let j=left; j<=right; j++){
                row.push(matrix[i][j]);
            }

            copy.push(row);
        }

        return {
            'matrix': copy,
            'off': {
                'x': left,
                'y': top
            }
        };
    }

    checkWinner(){
        if(this.totalMoves < 9){
            return 0;
        }

        // flatten matrix
        let matrix = this.boardBitsHuman;

        for(let i=0; i<matrix.length; i++){
            if(matchMask(this.boardBitsHuman, this.hMask1, i)) return 1;
            if(matchMask(this.boardBitsHuman, this.hMask2, i)) return 1;
            if(matchMask(this.boardBitsHuman, this.vMask, i)) return 1;
            if(matchMask(this.boardBitsHuman, this.dMask1, i)) return 1;
            if(matchMask(this.boardBitsHuman, this.dMask2, i)) return 1;
            if(matchMask(this.boardBitsCpu, this.hMask1, i)) return -1;
            if(matchMask(this.boardBitsCpu, this.hMask2, i)) return -1;
            if(matchMask(this.boardBitsCpu, this.vMask, i)) return -1;
            if(matchMask(this.boardBitsCpu, this.dMask1, i)) return -1;
            if(matchMask(this.boardBitsCpu, this.dMask2, i)) return -1;
        }

        return 0;

        function matchMask(matrix, mask, start){
            if(matrix.length < mask.length + start){
                return false;
            }

            for(let i=0; i<mask.length; i++){
                if(mask[i] && !matrix[start+i]) return false;
            }

            return true;
        }
    }

    showAnimation(){
        return new Promise(async (resolve, reject) => {
            // twinkle board
            let boardSize = board.getSize();

            // create list of numbers from 0 -> square of board size
            let squareList = Array.from({
                length: boardSize * boardSize
            }, (k,v) => v);

            // shuffle list
            squareList.sort(() => Math.random() - 0.5);

            for(let i=0; i<squareList.length; i+=10){
                let promises = Array.from({length: 10}, (k,v)=>v);
                promises = promises.map(a => {
                    if(i+a >= squareList.length) return Promise.resolve();

                    let num = squareList[i+a];
                    let x = num % boardSize, y = Math.floor(num / boardSize);
                    return board.getSquare(y, x).twinkle();
                });

                // twinkle square
                await Promise.all(promises);
            }

            // shuffle list again
            squareList.sort(() => Math.random() - 0.5);

            for(let i=squareList.length-1; i>0; i-=10){
                let promises = Array.from({length: 10}, (k,v)=>v);
                promises = promises.map(a => {
                    if(i-a < 0) return Promise.resolve();

                    let num = squareList[i-a];
                    let x = num % boardSize, y = Math.floor(num / boardSize);
                    return board.getSquare(y, x).untwinkle();
                });

                // untwinkle squares
                await Promise.all(promises);
            }

            resolve();
        });
    }

    delete(){
        this.parentNode.innerHTML = '';
    }
}
