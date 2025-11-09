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

var board, currentTurn, selSquare, validMoves, moveHistory, lastMD, gameOvr;

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
}

function createBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', () => handleSC(row,col));

            if (col === 7) {
                const rank = document.createElement('div');
                rank.className = 'coord coord-rank';
                rank.textContent = 8 - row;
                rank.style.color = isLight ? '#b58863' : '#f0d9b5';
                square.appendChild(rank);
            }
            if (row === 7) {
                const file = document.createElement('div');
                file.className = 'coord coord-file';
                file.textContent = String.fromCharCode(97 + col);
                file.style.color = isLight ? '#b58863' : '#f0d9b5';
                square.appendChild(file);
            }
            boardEl.appendChild(square);
        }
    }
}

function renderBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const piece = board[row][col];
            const coords = square.querySelectorAll('.coord');
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
            square.classList.remove('selected', 'valid-move', 'has-piece', 'last-move');
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
        square.classList.add('selected');
    }

    validMoves.forEach(move => {
        const square=document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
        square.classList.add('valid-move');
        if (board[move.row][move.col]) {
            square.classList.add('has-piece');
        }
    });
    updTI();
}

function updTI() {
    document.getElementById('turnInd').textContent = currentTurn === 'w' ? 'Your turn' : "Opponent's turn";
}

function handleSC(row, col) {
    if (gameOvr) return;
    const piece = board[row][col];
    if (selSquare) {
        const isValidMove = validMoves.some(m => m.row === row && m.col === col);
        if (isValidMove) {
            makeMove(selSquare.row, selSquare.col, row, col);
            selSquare = null;
            validMoves = [];
        } else if (piece && piece[0] === currentTurn) {
            selSquare = {row,col};
            validMoves = getVMs(row, col);
        } else {
            selSquare = null;
            validMoves = [];
        }
    } else {
        if (piece && piece[0] === currentTurn) {
            selSquare = {row, col};
            validMoves = getVMs(row, col);
        }
    }
    renderBoard();
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    board[toRow][toCol] = piece;
    board[fromRow][fromRow] = null;
    lastMD = {fromRow, fromCol, toRow, toCol};
    const from = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`;
    const to = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    moveHistory.push({
        piece,
        from,
        to,
        captured,
        notation: `${from}${to}`
    });
    updMovesLs();
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    if (isCheckmate()) {
        endGame(`${currentTurn === 'w' ? 'Black' : 'White'} wins by a checkmate!`);
    }
}

function updMovesLs() {
    const movesList = document.getElementById('movesLs');
    movesList.innerHTML = '';
    for (let i = 0; i < moveHistory.length; i+= 2) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'move-row';

        const numberDiv = document.createElement('div');
        numberDiv.className = 'move-number';
        numberDiv.textContent = `${Math.floor(i / 2) + 1}`;

        const whiteMove = document.createElement('div');
        whiteMove.className = 'move';
        if (i === moveHistory.length - 1) whiteMove.classList.add('active');
        whiteMove.textContent = moveHistory[i].notation;

        rowDiv.appendChild(numberDiv);
        rowDiv.appendChild(whiteMove);

        if (i + 1 < moveHistory.length) {
            const blackMove = document.createElement('div');
            blackMove.className = 'move';
            if (i + 1 === moveHistory.length - 1) blackMove.classList.add('active');
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
    alert('not implemented yet');
}

function firstMove() {}
function prevMove() {}
function nextMove() {}
function lastMove() {}

initBoard();
createBoard();
renderBoard();