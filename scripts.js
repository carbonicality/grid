const PIECES = {
    'wK': './pieces/Chess_klt45.svg',
    'wQ': './pieces/Chess_qlt45.svg',
    'wR': './pieces/Chess_rlt45.svg',
    'wB': './pieces/Chess_blt45.svg',
    'wN': './pieces/Chess_nlt45.svg',
    'wP': './pieces/Chess_plt45.svg',
    'bK': './pieces/Chess_kdt45.svg',
    'bQ': './pieces/Chess_qdt45.svg',
    'bR': './pieces/Chess_rdt45.svg',
    'bB': './pieces/Chess_bdt45.svg',
    'bN': './pieces/Chess_ndt45.svg',
    'bP': './pieces/Chess_pdt45.svg'
};

var board, currentTurn, selSquare, validMoves, moveHistory, lastMD, gameOvr, isAnimating, currentMoveIdx, boardFlipped, promoPending, lastPawnDM;

function initBoard() {
    board = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'] // i used AI for this array primarily cuz im too lazy sorry
    ];
    currentTurn = 'w';
    selSquare = null;
    validMoves = [];
    moveHistory = [];
    lastMD = null;
    gameOvr = false;
    isAnimating = false;
    currentMoveIdx = -1;
    boardFlipped = false;
    promoPending = null;
    lastPawnDM = null;
}

function createBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let row =0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const visualRow = boardFlipped ? 7 - row: row;
            const visualCol = boardFlipped ? 7 - col : col;

            const square = document.createElement('div');
            square.className = 'square';
            const isLight = (visualRow + visualCol) % 2 === 0;
            square.classList.add(isLight ? 'light' : 'dark');
            square.dataset.row = visualRow;
            square.dataset.col = visualCol;
            square.addEventListener('click', () => handleSC(visualRow, visualCol));

            if (col === 7) {
                const rank = document.createElement('div');
                rank.className = 'coord coord-rank';
                rank.textContent = 8 - visualRow;
                rank.style.color = isLight ? '#b58863' : '#f0d9b5';
                square.appendChild(rank);
            }
            if (row === 7) {
                const file = document.createElement('div');
                file.className = 'coord coord-file';
                file.textContent = String.fromCharCode(97 + visualCol);
                file.style.color = isLight ? '#b58863' : '#f0d9b5';
                square.appendChild(file);
            }
            boardEl.appendChild(square);
        }
    }
}

function renderBoard() {
    for (let row = 0; row <8; row++) {
        for (let col=0; col < 8; col++) {
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const piece = board[row][col];
            square.classList.remove('selected', 'valid-move', 'has-piece', 'last-move');
            const coords = Array.from(square.querySelectorAll('.coord'));
            square.innerHTML = '';
            coords.forEach(coord => square.appendChild(coord));

            if (piece) {
                const pieceImg = document.createElement('img');
                pieceImg.src = PIECES[piece];
                pieceImg.style.position = 'relative';
                pieceImg.style.zIndex = '1';
                pieceImg.style.width = '100%';
                pieceImg.style.height = '100%';
                pieceImg.style.pointerEvents = 'none';
                square.appendChild(pieceImg);
            }
        }
    }

    if (lastMD) {
        const fromSquare = document.querySelector(`[data-row="${lastMD.fromRow}"][data-col="${lastMD.fromCol}"]`);
        const toSquare = document.querySelector(`[data-row="${lastMD.toRow}"][data-col="${lastMD.toCol}"]`);
        if (fromSquare) fromSquare.classList.add('last-move');
        if (toSquare) toSquare.classList.add('last-move');
    }

    if (selSquare) {
        const square = document.querySelector(`[data-row="${selSquare.row}"][data-col="${selSquare.col}"]`);
        if (square) square.classList.add('selected');
    }

    validMoves.forEach(move => {
        const square = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
        if (square) {
            square.classList.add('valid-move');
            if (board[move.row][move.col]) {
                square.classList.add('has-piece');
            }
        }
    });
    
    updTI();
}

function updTI() {
    document.getElementById('turnInd').textContent = currentTurn === 'w' ? 'Your turn' : "Opponent's turn";
}

function handleSC(row, col) {
    if (gameOvr || promoPending) return;
    if (currentMoveIdx !== moveHistory.length - 1 && moveHistory.length > 0) {
        currentMoveIdx = moveHistory.length - 1;
        reconstruct();
        return;
    }
    const piece = board[row][col];
    if (selSquare) {
        const isValidMove = validMoves.some(m => m.row === row && m.col === col);
        if (isValidMove) {
            makeMove(selSquare.row,selSquare.col,row,col);
            selSquare = null;
            validMoves= [];
            return;
        } else if (piece && piece[0] === currentTurn) {
            selSquare = {row,col};
            validMoves = getVMs(row,col);
        } else {
            selSquare = null;
            validMoves = [];
        }
    } else {
        if (piece && piece[0] === currentTurn) {
            selSquare = {row,col};
            validMoves = getVMs(row, col);
        }
    }
    renderBoard();
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    const isPwnPromo = piece[1] === 'P' && (toRow === 0 || toRow === 7);
    const fromSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
    const toSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
    const pieceImg = fromSquare.querySelector('img');
    const moveData = validMoves.find(m => m.row === toRow && m.col === toCol);
    const isEnPassant = moveData?.isEnPassant;
    if (isEnPassant) {
        board[fromRow][toCol] = null;
    }
    if (pieceImg) {
        isAnimating = true;
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        const deltaX = toRect.left - fromRect.left;
        const deltaY = toRect.top - fromRect.top;

        const movingPc = pieceImg.cloneNode(true);
        movingPc.style.cssText = `
        position: fixed;
        top: ${fromRect.top}px;
        left: ${fromRect.left}px;
        width: ${fromRect.width}px;
        height: ${fromRect.height}px;
        z-index: 1000;
        pointer-events: none;
        transition: none;`;
        document.body.appendChild(movingPc);
        pieceImg.style.opacity = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                movingPc.style.transition = 'transform 0.25s ease-out';
                movingPc.style.transform = `translate(${deltaX}px,${deltaY}px)`;
            });
        });
        setTimeout(() => {
            board[toRow][toCol] = piece;
            board[fromRow][fromCol] = null;
            if (isPwnPromo) {
                promoPending = {toRow,toCol,piece,captured,fromRow,fromCol};
                showPromo(toRow, toCol);
            } else {
                completeMv(fromRow, fromCol, toRow, toCol, piece,captured);
            }
            movingPc.remove();
            isAnimating = false;
        }, 250);
    } else {
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
        if (isPwnPromo) {
            promoPending = {toRow, toCol, piece, captured, fromRow, fromCol};
            showPromo(toRow, toCol);
        } else {
            completeMv(fromRow, fromCol, toRow, toCol, piece, captured);
        }
    }
}

function completeMv(fromRow, fromCol, toRow, toCol, piece, captured) { // ya get it? cuz mv is move in linux HAHAHA (your sign to laugh to the funny of the day)
    lastMD = {fromRow, fromCol, toRow, toCol};
    const from = `${String.fromCharCode(97 + fromCol)}${8- fromRow}`;
    const to = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    moveHistory.push({
        piece,
        from,
        to,
        captured,
        notation: `${from}${to}`
    });
    currentMoveIdx = moveHistory.length - 1;
    updMovesLs();
    if (piece[1] === 'P' && Math.abs(toRow - fromRow) === 2) {
        lastPawnDM = {row: toRow, col: toCol};
    } else {
        lastPawnDM = null;
    }
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    renderBoard();
    if (isCheckmate()) {
        endGame(`${currentTurn === 'w' ? 'Black' : 'White'} wins by a checkmate!`);
    }
}   

function showPromo(row,col) {
    const dialog = document.getElementById('promoDialog');
    const colour = board[row][col][0];
    document.getElementById('promoteQ').innerHTML = `<img src="${PIECES[colour + 'Q']}" style="width:60px;height:60px">`;
    document.getElementById('promoteR').innerHTML = `<img src="${PIECES[colour + 'R']}" style="width:60px;height:60px">`;
    document.getElementById('promoteB').innerHTML = `<img src="${PIECES[colour + 'B']}" style="width:60px;height:60px">`;
    document.getElementById('promoteN').innerHTML = `<img src="${PIECES[colour + 'N']}" style="width:60px;height:60px">`;
    dialog.classList.add('show');
    document.getElementById('overlay').classList.add('show');
}

function promotePawn(pieceType) { //lil lv1 pawn noob is turning into a lv10000 mafia boss pro
    if (!promoPending) return;
    const {toRow, toCol, piece, captured, fromRow, fromCol} = promoPending;
    const colour = piece[0];
    board[toRow][toCol] = colour + pieceType;
    document.getElementById('promoDialog').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
    completeMv(fromRow, fromCol, toRow, toCol, board[toRow][toCol], captured);
    promoPending = null;
}

function updMovesLs() {
    const movesList= document.getElementById('movesLs');
    movesList.innerHTML = '';
    for (let i = 0; i < moveHistory.length; i +=2) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'move-row';
        const numberDiv = document.createElement('div');
        numberDiv.className = 'move-number';
        numberDiv.textContent = `${Math.floor(i /2) + 1}`;
        const whiteMove = document.createElement('div');
        whiteMove.className = 'move';
        if (i === currentMoveIdx) whiteMove.classList.add('active');
        whiteMove.textContent = moveHistory[i].notation;
        rowDiv.appendChild(numberDiv);
        rowDiv.appendChild(whiteMove);
        if (i + 1 < moveHistory.length) {
            const blackMove = document.createElement('div');
            blackMove.className = 'move';
            if (i + 1 === currentMoveIdx) blackMove.classList.add('active');
            blackMove.textContent = moveHistory[i + 1].notation;
            rowDiv.appendChild(blackMove);
        }
        movesList.appendChild(rowDiv);
    }
    movesList.scrollTop = movesList.scrollHeight;
}

function getVMs(row, col) { //vmware ahh
    const piece = board[row][col];
    if (!piece) return [];
    const moves = [];
    const colour = piece[0];
    const type = piece[1];

    if (type === 'P') {
        const direction = colour === 'w' ? -1 : 1;
        const startRow = colour === 'w' ? 6 : 1;
        if (!board[row + direction]?.[col]) {
            moves.push({row: row + direction, col});
            if (row === startRow && !board[row + 2 * direction]?.[col]) {
                moves.push({row: row+2 * direction, col});
            }
        }

        [-1, 1].forEach(dc => {
            const target = board[row + direction]?.[col + dc];
            if (target && target[0] !== colour) {
                moves.push({row: row+direction, col:col+dc});
            }
        });

        if (lastPawnDM) {
            if (row === (colour === 'w' ? 3 : 4)) {
                [-1,1].forEach(dc => {
                    const targetCol = col + dc;
                    if (lastPawnDM.row === row && lastPawnDM.col === targetCol) {
                        const captureRow = row + direction;
                        moves.push({row:captureRow,col:targetCol,isEnPassant:true});
                    }
                });
            }
        }
    }

    if (type === 'R') {
        [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || r > 7 || c < 0 || c > 7) break;
                if (board[r][c]) {
                    if (board[r][c][0] !== colour) moves.push({row: r, col: c});
                    break;
                }
                moves.push({row: r, col: c});
            }
        });
    }

    if (type === 'B') {
        [[1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || r > 7 || c< 0 || c > 7) break;
                if (board[r][c]) {
                    if (board[r][c][0] !== colour) moves.push({row: r, col: c});
                    break;
                }
                moves.push({row: r, col: c});
            }
        });
    }

    if (type === 'Q') {
        [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || r > 7 || c < 0 || c > 7) break;
                if (board[r][c]) {
                    if (board[r][c][0] !== colour) moves.push({row: r,col: c});
                    break;
                }
                moves.push({row: r, col: c});
            }
        });
    }

    if (type === 'K') {
        [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]].forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r <= 7 && c >= 0 && c <=7) {
                if (!board[r][c] || board[r][c][0] !== colour) {
                    moves.push({row: r, col: c});
                }
            }
        });
    }

    if (type === 'N') {
        [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]].forEach(([dr, dc]) => {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                if (!board[r][c] || board[r][c][0] !== colour) {
                    moves.push({row: r, col: c});
                }
            }
        });
    }
    return moves;
}

function isCheckmate() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece[0] === currentTurn) {
                const moves = getVMs(row, col);
                if (moves.length > 0) return false;
            }
        }
    }
    return true;
}

function endGame(message) {
    gameOvr = true;
    document.getElementById('goTxt').textContent = message;
    document.getElementById('gameOvr').classList.add('show');
    document.getElementById('overlay').classList.add('show');
}

function resetGame() {
    initBoard();
    createBoard();
    renderBoard(); // ts the 3 building blocks of this bruh
    document.getElementById('movesLs').innerHTML = '';
    document.getElementById('gameOvr').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
}

function resign() {
    endGame(`${currentTurn === 'w' ? 'Black' : 'White'} wins by resignation!`);
}

function offerDraw() {
    if (confirm('Offer a draw?')) {
        endGame('Game drawn by agreement.');
    }
}

function flipBoard() {
    boardFlipped = !boardFlipped;
    createBoard();
    renderBoard();
}

function firstMove() {
    if (moveHistory.length === 0) return;
    currentMoveIdx = -1;
    reconstruct();
}

function prevMove() {
    if (currentMoveIdx > -1) {
        currentMoveIdx--;
        reconstruct();
    }
}

function nextMove() {
    if (currentMoveIdx < moveHistory.length - 1) {
        currentMoveIdx++;
        reconstruct();
    }
}

function lastMove() {
    if (moveHistory.length === 0) return;
    currentMoveIdx = moveHistory.length - 1;
    reconstruct();
}

function reconstruct() {
    board = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ]; // i used AI for this array, sorry

    for (let i = 0; i <= currentMoveIdx; i++) {
        const move = moveHistory[i];
        const fromCol = move.from.charCodeAt(0) - 97;
        const fromRow = 8 - parseInt(move.from[1]);
        const toCol = move.to.charCodeAt(0) - 97;
        const toRow = 8 - parseInt(move.to[1]);
        board[toRow][toCol] = board[fromRow][fromCol];
        board[fromRow][fromCol] = null;
    }

    if (currentMoveIdx >= 0) {
        const move = moveHistory[currentMoveIdx];
        const fromCol = move.from.charCodeAt(0) -97;
        const fromRow = 8 - parseInt(move.from[1]);
        const toCol = move.to.charCodeAt(0) - 97;
        const toRow = 8 - parseInt(move.to[1]);
        lastMD = {fromRow,fromCol,toRow,toCol};
    } else {
        lastMD = null;
    }

    currentTurn = (currentMoveIdx + 1) % 2 === 0 ? 'w' : 'b';
    selSquare = null;
    validMoves = [];
    renderBoard();
    updMLH();
}

function updMLH() {
    const allMoves = document.querySelectorAll('.move');
    allMoves.forEach((move, index) => {
        if (index === currentMoveIdx) {
            move.classList.add('active');
        } else {
            move.classList.remove('active');
        }
    });
}

function claimTimeout() {
    if (confirm('Claim win on time? (lmao theres no timer but still)')) { // ts is kinda redundant cuz there isnt even a timer :sob:
        endGame(`${currentTurn === 'w' ? 'White' : 'Black'} wins on time!`);
    }
}

initBoard();
createBoard();
renderBoard();