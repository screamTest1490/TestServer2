class CasinoGame {
    constructor() {
        this.players = [];
        this.mines = [];
        this.casinoBalance = 0;
        this.generosityLevel = 1;
        this.gameHistory = [];
        this.currentPlayerCells = [];
        this.isGameActive = false;
        
        this.init();
    }

    init() {
        this.createGrid();
        this.updateAvailableCells();
        this.updateUI();
    }

    createGrid() {
        const grid = document.getElementById('gameGrid');
        grid.innerHTML = '';
        
        for (let i = 1; i <= 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = i;
            cell.dataset.cell = i;
            grid.appendChild(cell);
        }
    }

    updateAvailableCells() {
        const container = document.getElementById('availableCells');
        container.innerHTML = '';
        
        for (let i = 1; i <= 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'available-cell';
            cell.textContent = i;
            cell.dataset.cell = i;
            cell.onclick = () => this.toggleCellSelection(i);
            container.appendChild(cell);
        }
    }

    toggleCellSelection(cellNumber) {
        const index = this.currentPlayerCells.indexOf(cellNumber);
        
        if (index > -1) {
            this.currentPlayerCells.splice(index, 1);
        } else {
            if (this.currentPlayerCells.length < 3) {
                this.currentPlayerCells.push(cellNumber);
            }
        }
        
        this.updateCellSelectionUI();
    }

    updateCellSelectionUI() {
        document.querySelectorAll('.available-cell').forEach(cell => {
            const cellNum = parseInt(cell.dataset.cell);
            cell.classList.toggle('selected', this.currentPlayerCells.includes(cellNum));
        });
    }

    addPlayer() {
        const betInput = document.getElementById('playerBet');
        const bet = parseInt(betInput.value);
        
        if (!bet || bet < 10) {
            alert('Минимальная ставка 10₽');
            return;
        }
        
        if (this.currentPlayerCells.length !== 3) {
            alert('Выберите ровно 3 ячейки!');
            return;
        }
        
        const player = {
            id: Date.now(),
            bet: bet,
            cells: [...this.currentPlayerCells],
            order: this.players.length + 1
        };
        
        this.players.push(player);
        this.currentPlayerCells = [];
        betInput.value = '';
        this.updateCellSelectionUI();
        this.updatePlayersList();
    }

    updatePlayersList() {
        const list = document.getElementById('playersList');
        list.innerHTML = '';
        
        this.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player';
            playerEl.innerHTML = `
                <div>
                    <strong>Игрок ${player.order}</strong><br>
                    Ставка: ${player.bet}₽<br>
                    Ячейки: ${player.cells.join(', ')}
                </div>
                <button onclick="game.removePlayer(${player.id})">✕</button>
            `;
            list.appendChild(playerEl);
        });
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.updatePlayersOrder();
        this.updatePlayersList();
    }

    updatePlayersOrder() {
        this.players.forEach((player, index) => {
            player.order = index + 1;
        });
    }

    startGame() {
        if (this.players.length < 1) {
            alert('Добавьте хотя бы одного игрока!');
            return;
        }
        
        this.isGameActive = true;
        this.generateMines();
        this.calculateResults();
        this.updateUI();
        
        document.getElementById('startGame').disabled = true;
        document.getElementById('nextRound').disabled = false;
    }

    generateMines() {
        // Анализируем популярность ячеек
        const cellPopularity = {};
        for (let i = 1; i <= 9; i++) cellPopularity[i] = 0;
        
        this.players.forEach(player => {
            player.cells.forEach(cell => {
                cellPopularity[cell]++;
            });
        });
        
        // Выбираем 3 самые популярные ячейки для мин
        const sortedCells = Object.entries(cellPopularity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => parseInt(entry[0]));
        
        this.mines = sortedCells;
    }

    calculateResults() {
        const totalBank = this.players.reduce((sum, player) => sum + player.bet, 0);
        
        // Динамическое распределение в зависимости от уровня щедрости
        const levelMultipliers = {1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9};
        const playerPercent = levelMultipliers[this.generosityLevel];
        
        const casinoShare = totalBank * (1 - playerPercent);
        const prizeFund = totalBank * playerPercent;
        
        // Определяем победителей (тех, кто избежал все мины)
        const winners = this.players.filter(player => 
            !player.cells.some(cell => this.mines.includes(cell))
        );
        
        // Распределяем призовой фонд
        if (winners.length > 0) {
            const winShare = prizeFund / winners.length;
            winners.forEach(winner => {
                winner.payout = winShare;
                winner.netResult = winShare - winner.bet;
            });
            
            // Помечаем проигравших
            this.players.filter(p => !winners.includes(p)).forEach(loser => {
                loser.payout = 0;
                loser.netResult = -loser.bet;
            });
        } else {
            // Все проиграли
            this.players.forEach(player => {
                player.payout = 0;
                player.netResult = -player.bet;
            });
        }
        
        // Обновляем баланс казино
        const actualCasinoIncome = totalBank - this.players.reduce((sum, p) => sum + (p.payout || 0), 0);
        this.casinoBalance += actualCasinoIncome;
        
        // Обновляем уровень щедрости
        this.updateGenerosityLevel(actualCasinoIncome, casinoShare);
        
        // Сохраняем в историю
        this.saveToHistory(totalBank, actualCasinoIncome, winners.length);
        
        this.displayResults();
    }

    updateGenerosityLevel(actualIncome, expectedIncome) {
        if (actualIncome > expectedIncome * 1.2) {
            // Казино заработало больше ожидаемого - повышаем щедрость
            this.generosityLevel = Math.min(5, this.generosityLevel + 1);
        } else if (actualIncome < expectedIncome * 0.8) {
            // Казино заработало меньше - понижаем щедрость
            this.generosityLevel = Math.max(1, this.generosityLevel - 1);
        }
    }

    displayResults() {
        const resultsDiv = document.getElementById('roundResults');
        resultsDiv.innerHTML = '';
        
        // Показываем мины
        const minesInfo = document.createElement('div');
        minesInfo.className = 'result-item';
        minesInfo.innerHTML = `<strong>Мины в ячейках:</strong> ${this.mines.join(', ')}`;
        resultsDiv.appendChild(minesInfo);
        
        // Показываем результаты игроков
        this.players.forEach(player => {
            const result = document.createElement('div');
            result.className = `result-item ${player.payout > 0 ? 'winner' : 'loser'}`;
            result.innerHTML = `
                <strong>Игрок ${player.order}</strong><br>
                Ставка: ${player.bet}₽ | 
                Выплата: ${player.payout.toFixed(2)}₽<br>
                Результат: <span style="color: ${player.netResult >= 0 ? '#4CAF50' : '#ff4444'}">
                    ${player.netResult >= 0 ? '+' : ''}${player.netResult.toFixed(2)}₽
                </span>
            `;
            resultsDiv.appendChild(result);
        });
        
        // Подсвечиваем ячейки на поле
        this.highlightCells();
    }

    highlightCells() {
        document.querySelectorAll('.cell').forEach(cell => {
            const cellNum = parseInt(cell.dataset.cell);
            if (this.mines.includes(cellNum)) {
                cell.classList.add('mine');
                cell.innerHTML = '💣';
            } else {
                cell.classList.add('safe');
                cell.innerHTML = '💰';
            }
        });
    }

    saveToHistory(totalBank, casinoIncome, winnersCount) {
        const historyItem = {
            date: new Date().toLocaleString(),
            players: this.players.length,
            totalBank,
            casinoIncome,
            winnersCount,
            generosityLevel: this.generosityLevel
        };
        
        this.gameHistory.unshift(historyItem);
        this.updateHistory();
    }

    updateHistory() {
        const historyDiv = document.getElementById('gameHistory');
        historyDiv.innerHTML = '';
        
        this.gameHistory.slice(0, 5).forEach(game => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <strong>${game.date}</strong><br>
                Игроков: ${game.players} | Банк: ${game.totalBank}₽<br>
                Казино: ${game.casinoIncome.toFixed(2)}₽ | Победителей: ${game.winnersCount}<br>
                Уровень щедрости: ${game.generosityLevel}
            `;
            historyDiv.appendChild(item);
        });
    }

    nextRound() {
        this.players = [];
        this.mines = [];
        this.currentPlayerCells = [];
        this.isGameActive = false;
        
        this.createGrid();
        this.updatePlayersList();
        this.updateUI();
        
        document.getElementById('roundResults').innerHTML = '';
        document.getElementById('startGame').disabled = false;
        document.getElementById('nextRound').disabled = true;
    }

    updateUI() {
        document.getElementById('casinoBalance').textContent = this.casinoBalance.toFixed(2);
        document.getElementById('generosityLevel').textContent = this.generosityLevel;
        
        const totalBank = this.players.reduce((sum, player) => sum + player.bet, 0);
        const levelMultipliers = {1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9};
        const prizeFund = totalBank * (levelMultipliers[this.generosityLevel] || 0.5);
        
        document.getElementById('totalBank').textContent = totalBank;
        document.getElementById('prizeFund').textContent = prizeFund.toFixed(2);
    }
}

// Глобальные функции для кнопок
function addPlayer() {
    game.addPlayer();
}

function startGame() {
    game.startGame();
}

function nextRound() {
    game.nextRound();
}

// Инициализация игры
const game = new CasinoGame();