class CasinoGame {
    constructor() {
        this.players = [];
        this.mine = null;
        this.casinoBalance = 1000; // Стартовый баланс 1,000 TON
        this.gameHistory = [];
        this.currentPlayerCell = null;
        this.isGameActive = false;
    }

    init() {
        this.createGrid();
        this.updateUI();
        
        // Добавляем обработчики событий после инициализации DOM
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('nextRound').addEventListener('click', () => this.nextRound());
    }

    createGrid() {
        const grid = document.getElementById('gameGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (let i = 1; i <= 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerHTML = `<span>${i}</span>`;
            cell.dataset.cell = i;
            cell.addEventListener('click', () => this.selectCell(i));
            grid.appendChild(cell);
        }
    }

    selectCell(cellNumber) {
        if (this.isGameActive) return;
        
        this.currentPlayerCell = cellNumber;
        this.updateCellSelectionUI();
    }

    updateCellSelectionUI() {
        const selectedCellElement = document.getElementById('selectedCell');
        if (selectedCellElement) {
            selectedCellElement.textContent = this.currentPlayerCell ? this.currentPlayerCell : '-';
        }
        
        // Подсвечиваем выбранную ячейку на поле
        document.querySelectorAll('.cell').forEach(cell => {
            const cellNum = parseInt(cell.dataset.cell);
            cell.classList.toggle('selected', cellNum === this.currentPlayerCell);
        });
    }

    addPlayer() {
        if (this.isGameActive) {
            alert('Игра уже началась! Дождитесь окончания раунда.');
            return;
        }
        
        const betInput = document.getElementById('playerBet');
        const bet = parseInt(betInput.value);
        
        if (!bet || bet < 1) {
            alert('Минимальная ставка 1 TON');
            return;
        }
        
        if (!this.currentPlayerCell) {
            alert('Выберите ячейку для ставки!');
            return;
        }
        
        const player = {
            id: Date.now(),
            bet: bet,
            cell: this.currentPlayerCell,
            order: this.players.length + 1
        };
        
        this.players.push(player);
        this.currentPlayerCell = null;
        betInput.value = '';
        this.updateCellSelectionUI();
        this.updatePlayersList();
        this.updateUI();
    }

    updatePlayersList() {
        const list = document.getElementById('playersList');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player';
            playerEl.innerHTML = `
                <div>
                    <strong>Игрок ${player.order}</strong><br>
                    Ставка: ${player.bet} TON<br>
                    Ячейка: ${player.cell}
                </div>
                <button class="remove-player-btn" data-id="${player.id}">✕</button>
            `;
            list.appendChild(playerEl);
        });

        // Добавляем обработчики для кнопок удаления
        document.querySelectorAll('.remove-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseInt(e.target.dataset.id);
                this.removePlayer(playerId);
            });
        });
    }

    removePlayer(playerId) {
        if (this.isGameActive) {
            alert('Нельзя удалять игроков во время игры!');
            return;
        }
        
        this.players = this.players.filter(p => p.id !== playerId);
        this.updatePlayersOrder();
        this.updatePlayersList();
        this.updateUI();
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
        this.generateMine();
        this.calculateResults();
        this.updateUI();
        
        const startGameBtn = document.getElementById('startGame');
        const nextRoundBtn = document.getElementById('nextRound');
        if (startGameBtn) startGameBtn.disabled = true;
        if (nextRoundBtn) nextRoundBtn.disabled = false;
    }

    generateMine() {
        // Собираем статистику по ячейкам
        const cellStats = {};
        for (let i = 1; i <= 9; i++) {
            cellStats[i] = { totalBet: 0, players: 0 };
        }
        
        this.players.forEach(player => {
            cellStats[player.cell].totalBet += player.bet;
            cellStats[player.cell].players += 1;
        });
        
        // Находим ячейки, на которые делали ставки
        const usedCells = Object.entries(cellStats)
            .filter(([cell, stats]) => stats.players > 0)
            .map(([cell, stats]) => ({
                cell: parseInt(cell),
                totalBet: stats.totalBet,
                players: stats.players
            }));
        
        // Применяем алгоритм определения мины
        if (usedCells.length === 1) {
            // Все поставили на одну ячейку
            this.mine = usedCells[0].cell;
        } else if (usedCells.length === 2) {
            // Поставили на две разные ячейки
            const cell1 = usedCells[0];
            const cell2 = usedCells[1];
            
            // Проверяем соотношение ставок
            const ratio1 = cell1.totalBet / cell2.totalBet;
            const ratio2 = cell2.totalBet / cell1.totalBet;
            
            if (ratio1 <= 2 && ratio2 <= 2) {
                // Разница не более чем в 2 раза - выбираем ячейку с меньшей суммой
                this.mine = cell1.totalBet < cell2.totalBet ? cell1.cell : cell2.cell;
            } else {
                // Разница больше чем в 2 раза - выбираем ячейку с большей суммой
                this.mine = cell1.totalBet > cell2.totalBet ? cell1.cell : cell2.cell;
            }
        } else {
            // Три или более ячеек - выбираем случайную из наименее популярных
            const minPlayers = Math.min(...usedCells.map(cell => cell.players));
            const leastPopularCells = usedCells.filter(cell => cell.players === minPlayers);
            
            // Случайный выбор среди наименее популярных
            const randomIndex = Math.floor(Math.random() * leastPopularCells.length);
            this.mine = leastPopularCells[randomIndex].cell;
        }
    }

    calculateResults() {
        const totalBank = this.players.reduce((sum, player) => sum + player.bet, 0);
        
        // Определяем победителей (тех, кто не попал на мину)
        const winners = this.players.filter(player => 
            player.cell !== this.mine
        );
        
        // Определяем проигравших (тех, кто попал на мину)
        const losers = this.players.filter(player => 
            player.cell === this.mine
        );
        
        // Сумма проигранных ставок (фонд)
        const lostAmount = losers.reduce((sum, player) => sum + player.bet, 0);
        
        // Сумма бонусов для победителей (25% от их ставок)
        const totalBonus = winners.reduce((sum, player) => sum + (player.bet * 0.25), 0);
        
        // Распределяем выигрыш с коэффициентом 1.25x
        winners.forEach(winner => {
            const bonus = winner.bet * 0.25;
            winner.payout = winner.bet + bonus; // Ставка + 25% бонус
            winner.netResult = bonus; // Чистый выигрыш (только бонус)
        });
        
        // Помечаем проигравших
        losers.forEach(loser => {
            loser.payout = 0;
            loser.netResult = -loser.bet;
        });
        
        // Доход казино = проигранные ставки - выплаченные бонусы
        this.casinoIncome = lostAmount - totalBonus;
        
        // Обновляем баланс казино
        this.casinoBalance += this.casinoIncome;
        
        // Сохраняем в историю
        this.saveToHistory(totalBank, this.casinoIncome, winners.length);
        
        this.displayResults();
    }

    displayResults() {
        const resultsDiv = document.getElementById('roundResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        
        // Показываем коэффициент
        const coefficientInfo = document.createElement('div');
        coefficientInfo.className = 'algorithm-info';
        coefficientInfo.innerHTML = `<strong>🎯 Коэффициент для всех игроков:</strong> <span class="coefficient-badge">1.25x</span>`;
        resultsDiv.appendChild(coefficientInfo);
        
        // Показываем алгоритм выбора мины
        const algorithmInfo = document.createElement('div');
        algorithmInfo.className = 'algorithm-info';
        algorithmInfo.innerHTML = `<strong>🤖 Алгоритм выбора мины:</strong> ${this.getAlgorithmExplanation()}`;
        resultsDiv.appendChild(algorithmInfo);
        
        // Показываем мину
        const mineInfo = document.createElement('div');
        mineInfo.className = 'result-item';
        mineInfo.innerHTML = `<strong>💣 Мина в ячейке:</strong> ${this.mine}`;
        resultsDiv.appendChild(mineInfo);
        
        // Показываем фонд проигравших
        const losers = this.players.filter(player => player.cell === this.mine);
        const lostAmount = losers.reduce((sum, player) => sum + player.bet, 0);
        const fundInfo = document.createElement('div');
        fundInfo.className = 'result-item';
        fundInfo.innerHTML = `<strong>💰 Фонд проигравших:</strong> ${lostAmount.toFixed(2)} TON`;
        resultsDiv.appendChild(fundInfo);
        
        // Показываем результаты игроков
        this.players.forEach(player => {
            const result = document.createElement('div');
            result.className = `result-item ${player.payout > player.bet ? 'winner' : 'loser'}`;
            
            const isWinner = player.payout > player.bet;
            const resultClass = isWinner ? 'win-text' : 'lose-text';
            const resultSymbol = isWinner ? '+' : '';
            
            if (isWinner) {
                const bonus = player.bet * 0.25;
                result.innerHTML = `
                    <strong>Игрок ${player.order}</strong> (Выиграл)<br>
                    Ставка: ${player.bet} TON + Выигрыш: ${bonus.toFixed(2)} TON = <strong>${player.payout.toFixed(2)} TON</strong><br>
                    Результат: <span class="${resultClass}">${resultSymbol}${player.netResult.toFixed(2)} TON</span>
                `;
            } else {
                result.innerHTML = `
                    <strong>Игрок ${player.order}</strong> (Проиграл)<br>
                    Ставка: ${player.bet} TON | Выплата: 0 TON<br>
                    Результат: <span class="${resultClass}">${resultSymbol}${player.netResult.toFixed(2)} TON</span>
                `;
            }
            resultsDiv.appendChild(result);
        });
        
        // Показываем доход казино
        const casinoResult = document.createElement('div');
        casinoResult.className = 'result-item';
        casinoResult.innerHTML = `<strong>🏦 Доход казино:</strong> ${this.casinoIncome.toFixed(2)} TON`;
        resultsDiv.appendChild(casinoResult);
        
        // Подсвечиваем ячейки на поле
        this.highlightCells();
    }

    getAlgorithmExplanation() {
        // Собираем статистику по ячейкам
        const cellStats = {};
        for (let i = 1; i <= 9; i++) {
            cellStats[i] = { totalBet: 0, players: 0 };
        }
        
        this.players.forEach(player => {
            cellStats[player.cell].totalBet += player.bet;
            cellStats[player.cell].players += 1;
        });
        
        const usedCells = Object.entries(cellStats)
            .filter(([cell, stats]) => stats.players > 0)
            .map(([cell, stats]) => ({
                cell: parseInt(cell),
                totalBet: stats.totalBet,
                players: stats.players
            }));
        
        if (usedCells.length === 1) {
            return "Все игроки поставили на одну ячейку → мина там";
        } else if (usedCells.length === 2) {
            const cell1 = usedCells[0];
            const cell2 = usedCells[1];
            const ratio1 = cell1.totalBet / cell2.totalBet;
            const ratio2 = cell2.totalBet / cell1.totalBet;
            
            if (ratio1 <= 2 && ratio2 <= 2) {
                return `Разница ставок ≤ 2x → мина в ячейке с меньшей суммой (${this.mine})`;
            } else {
                return `Разница ставок > 2x → мина в ячейке с большей суммой (${this.mine})`;
            }
        } else {
            return `Много ячеек → мина в наименее популярной ячейке (${this.mine})`;
        }
    }

    highlightCells() {
        document.querySelectorAll('.cell').forEach(cell => {
            const cellNum = parseInt(cell.dataset.cell);
            if (cellNum === this.mine) {
                cell.classList.add('mine');
                cell.innerHTML = '💣<br><small>' + cellNum + '</small>';
            } else {
                cell.classList.add('safe');
                cell.innerHTML = '💰<br><small>' + cellNum + '</small>';
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
            mine: this.mine
        };
        
        this.gameHistory.unshift(historyItem);
        this.updateHistory();
    }

    updateHistory() {
        const historyDiv = document.getElementById('gameHistory');
        if (!historyDiv) return;
        
        historyDiv.innerHTML = '';
        
        this.gameHistory.slice(0, 5).forEach(game => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <strong>${game.date}</strong><br>
                Игроков: ${game.players} | Банк: ${game.totalBank} TON<br>
                Казино: ${game.casinoIncome.toFixed(2)} TON | Победителей: ${game.winnersCount}<br>
                Мина: ${game.mine}
            `;
            historyDiv.appendChild(item);
        });
    }

    nextRound() {
        this.players = [];
        this.mine = null;
        this.currentPlayerCell = null;
        this.isGameActive = false;
        
        this.createGrid();
        this.updatePlayersList();
        this.updateUI();
        
        const resultsDiv = document.getElementById('roundResults');
        const startGameBtn = document.getElementById('startGame');
        const nextRoundBtn = document.getElementById('nextRound');
        
        if (resultsDiv) resultsDiv.innerHTML = '';
        if (startGameBtn) startGameBtn.disabled = false;
        if (nextRoundBtn) nextRoundBtn.disabled = true;
    }

    updateUI() {
        const casinoBalanceElement = document.getElementById('casinoBalance');
        const totalBankElement = document.getElementById('totalBank');
        const playersCountElement = document.getElementById('playersCount');
        
        if (casinoBalanceElement) casinoBalanceElement.textContent = this.casinoBalance.toFixed(2);
        
        const totalBank = this.players.reduce((sum, player) => sum + player.bet, 0);
        
        if (totalBankElement) totalBankElement.textContent = totalBank;
        if (playersCountElement) playersCountElement.textContent = this.players.length;
    }
}

// Создаем глобальную переменную для игры
let game;

// Инициализация игры после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    game = new CasinoGame();
    game.init();
    
    // Добавляем обработчик для кнопки добавления игрока
    const addPlayerBtn = document.querySelector('.add-player button');
    if (addPlayerBtn) {
        addPlayerBtn.addEventListener('click', () => game.addPlayer());
    }
});