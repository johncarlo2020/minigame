// -- Glitch Minigames
// -- Copyright (C) 2024 Glitch
// -- 
// -- This program is free software: you can redistribute it and/or modify
// -- it under the terms of the GNU General Public License as published by
// -- the Free Software Foundation, either version 3 of the License, or
// -- (at your option) any later version.
// -- 
// -- This program is distributed in the hope that it will be useful,
// -- but WITHOUT ANY WARRANTY; without even the implied warranty of
// -- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// -- GNU General Public License for more details.
// -- 
// -- You should have received a copy of the GNU General Public License
// -- along with this program. If not, see <https://www.gnu.org/licenses/>.

const memoryGameState = {
    config: {
        gridSize: 8,
        squareCount: 8,
        rounds: 3,
        showTime: 3000,
        guessTime: 10000, // New: Time limit to guess the pattern
        maxWrongPresses: 3
    },
    currentRound: 0,
    wrongPresses: 0,
    gameStarted: false,
    gameActive: false,
    showingPattern: false,
    selectedSquares: [],
    playerSelected: [],
    timerInterval: null,
    showTimer: null,
    guessTimer: null,
    roundStartTime: 0,
    patternStartTime: 0,
    roundTimes: [],
    totalTime: 0
};

function startMemoryGame(config = {}) {
    // Clear all timers
    clearAllTimers();

    memoryGameState.config = { ...memoryGameState.config, ...config };
    memoryGameState.currentRound = 0;
    memoryGameState.wrongPresses = 0;
    memoryGameState.gameStarted = false;
    memoryGameState.gameActive = false;
    memoryGameState.showingPattern = false;
    memoryGameState.selectedSquares = [];
    memoryGameState.playerSelected = [];
    memoryGameState.roundTimes = [];
    memoryGameState.totalTime = 0;

    $('#memory-container').show();
    $('.memory-grid').hide();
    $('.memory-splash').show();

    updateMemoryUI();

    setTimeout(() => {
        $('.memory-splash').fadeOut(400, () => {
            initializeMemoryGrid();
            $('.memory-grid').fadeIn(400, () => {
                startMemoryRound();
            });
        });
    }, 3000);
}

function clearAllTimers() {
    if (memoryGameState.timerInterval) {
        clearInterval(memoryGameState.timerInterval);
        memoryGameState.timerInterval = null;
    }
    if (memoryGameState.showTimer) {
        clearTimeout(memoryGameState.showTimer);
        memoryGameState.showTimer = null;
    }
    if (memoryGameState.guessTimer) {
        clearInterval(memoryGameState.guessTimer);
        memoryGameState.guessTimer = null;
    }
}

function updateMemoryUI() {
    $('#memory-round-current').text(memoryGameState.currentRound + 1);
    $('#memory-round-total').text(memoryGameState.config.rounds);
    $('#memory-wrong-presses').text(memoryGameState.wrongPresses);
    $('#memory-max-wrong').text(memoryGameState.config.maxWrongPresses);

    // Show average time if available
    if (memoryGameState.roundTimes.length > 0) {
        const avgTime = memoryGameState.roundTimes.reduce((a, b) => a + b, 0) / memoryGameState.roundTimes.length;
        $('#memory-avg-time').text((avgTime / 1000).toFixed(1));
        $('.memory-stats').show();
    }
}

function initializeMemoryGrid() {
    const gridContainer = $('.memory-grid');
    gridContainer.empty();

    const gridSize = memoryGameState.config.gridSize;
    gridContainer.css({
        'display': 'grid',
        'grid-template-columns': `repeat(${gridSize}, 1fr)`,
        'grid-template-rows': `repeat(${gridSize}, 1fr)`,
        'gap': '8px',
        'width': '400px',
        'height': '400px',
        'margin': '0 auto'
    });

    for (let i = 0; i < gridSize * gridSize; i++) {
        const square = $('<div>')
            .addClass('memory-square')
            .attr('data-index', i)
            .on('click', handleMemorySquareClick);

        gridContainer.append(square);
    }

    memoryGameState.gameStarted = true;
}

function startMemoryRound() {
    memoryGameState.showingPattern = true;
    memoryGameState.gameActive = false;
    memoryGameState.playerSelected = [];
    memoryGameState.patternStartTime = Date.now();

    // Clear previous selections
    $('.memory-square').removeClass('lit player-selected correct wrong');

    // Generate random squares
    const totalSquares = memoryGameState.config.gridSize * memoryGameState.config.gridSize;
    const squareCount = Math.min(memoryGameState.config.squareCount, totalSquares);

    memoryGameState.selectedSquares = [];
    while (memoryGameState.selectedSquares.length < squareCount) {
        const randomIndex = Math.floor(Math.random() * totalSquares);
        if (!memoryGameState.selectedSquares.includes(randomIndex)) {
            memoryGameState.selectedSquares.push(randomIndex);
        }
    }

    // Show pattern
    memoryGameState.selectedSquares.forEach(index => {
        $(`.memory-square[data-index="${index}"]`).addClass('lit');
    });

    updateMemoryMessage('memorize');
    updateMemoryTimer(memoryGameState.config.showTime, 'show');

    // Start show timer
    let remainingTime = memoryGameState.config.showTime;
    memoryGameState.showTimer = setTimeout(() => {
        hidePattern();
    }, memoryGameState.config.showTime);

    // Update show timer display
    memoryGameState.timerInterval = setInterval(() => {
        remainingTime -= 100;
        updateMemoryTimer(remainingTime, 'show');

        if (remainingTime <= 0) {
            clearInterval(memoryGameState.timerInterval);
            memoryGameState.timerInterval = null;
        }
    }, 100);
}

function hidePattern() {
    memoryGameState.showingPattern = false;
    memoryGameState.gameActive = true;
    memoryGameState.roundStartTime = Date.now();

    $('.memory-square').removeClass('lit');

    updateMemoryMessage('guess');

    // Reset timer display
    updateMemoryTimer(memoryGameState.config.guessTime, 'guess');

    // Clear show timer
    if (memoryGameState.timerInterval) {
        clearInterval(memoryGameState.timerInterval);
        memoryGameState.timerInterval = null;
    }

    // Start guess timer
    let remainingGuessTime = memoryGameState.config.guessTime;
    memoryGameState.guessTimer = setInterval(() => {
        remainingGuessTime -= 100;
        updateMemoryTimer(remainingGuessTime, 'guess');

        if (remainingGuessTime <= 0) {
            clearInterval(memoryGameState.guessTimer);
            memoryGameState.guessTimer = null;
            // Time's up - fail the round
            handleGuessTimeout();
        }
    }, 100);
}

function handleGuessTimeout() {
    if (!memoryGameState.gameActive) return;

    memoryGameState.gameActive = false;
    const timeTaken = memoryGameState.config.guessTime;
    memoryGameState.roundTimes.push(timeTaken);

    // Show which squares were correct
    memoryGameState.selectedSquares.forEach(index => {
        $(`.memory-square[data-index="${index}"]`).addClass('correct-timeout');
    });

    updateMemoryMessage('timeout');
    playMemorySound('failure');

    setTimeout(() => {
        endMemoryGame(false);
    }, 2000);
}

function updateMemoryTimer(timeMs, type) {
    const maxTime = type === 'show' ? memoryGameState.config.showTime : memoryGameState.config.guessTime;
    const progress = Math.max(0, (timeMs / maxTime) * 100);
    const seconds = (timeMs / 1000).toFixed(1);

    if (type === 'show') {
        $('.memory-timer-progress').css('width', `${progress}%`);
        $('#memory-timer').text(seconds);
    } else {
        $('.memory-timer-progress').css('width', `${progress}%`);
        $('#memory-timer').text(seconds);

        // Color change for urgency
        if (progress < 25) {
            $('.memory-timer-progress').addClass('danger');
        } else {
            $('.memory-timer-progress').removeClass('danger');
        }
    }
}

function updateMemoryMessage(type) {
    const wrongText = `Wrong presses: ${memoryGameState.wrongPresses}/${memoryGameState.config.maxWrongPresses}`;

    switch (type) {
        case 'memorize':
            $('#memory-message').text(`🧠 Memorize the pattern! (${wrongText})`);
            $('#memory-message').removeClass('error warning success');
            break;
        case 'guess':
            $('#memory-message').text(`⏱️ Click the squares that were lit! (${wrongText})`);
            $('#memory-message').removeClass('error warning success');
            break;
        case 'timeout':
            $('#memory-message').text(`⏰ Time's up! Pattern shown below.`);
            $('#memory-message').addClass('error');
            break;
        case 'wrong':
            $('#memory-message').text(`❌ Wrong press! (${wrongText})`);
            $('#memory-message').addClass('error');
            break;
        case 'success':
            $('#memory-message').text(`✅ Correct! Round complete!`);
            $('#memory-message').addClass('success');
            break;
        case 'round_complete':
            $('#memory-message').text(`🎯 Round complete! Ready for next round...`);
            $('#memory-message').addClass('success');
            break;
        default:
            $('#memory-message').text(wrongText);
    }
}

function handleMemorySquareClick() {
    if (!memoryGameState.gameActive || memoryGameState.showingPattern) {
        return;
    }

    const squareIndex = parseInt($(this).attr('data-index'));

    if (memoryGameState.playerSelected.includes(squareIndex)) {
        return;
    }

    memoryGameState.playerSelected.push(squareIndex);
    $(this).addClass('player-selected');

    playMemorySound('click');

    if (memoryGameState.selectedSquares.includes(squareIndex)) {
        $(this).addClass('correct');

        // Check if all squares have been selected
        if (memoryGameState.playerSelected.length === memoryGameState.selectedSquares.length) {
            const allCorrect = memoryGameState.selectedSquares.every(square =>
                memoryGameState.playerSelected.includes(square)
            );

            if (allCorrect) {
                // Calculate time taken for this round
                const timeTaken = Date.now() - memoryGameState.roundStartTime;
                memoryGameState.roundTimes.push(timeTaken);
                memoryGameState.totalTime += timeTaken;

                memoryGameState.gameActive = false;
                clearInterval(memoryGameState.guessTimer);
                memoryGameState.guessTimer = null;

                updateMemoryMessage('success');
                playMemorySound('success');

                memoryGameState.currentRound++;

                if (memoryGameState.currentRound >= memoryGameState.config.rounds) {
                    setTimeout(() => {
                        endMemoryGame(true);
                    }, 1500);
                } else {
                    setTimeout(() => {
                        updateMemoryUI();
                        $('.memory-square').removeClass('correct player-selected');
                        startMemoryRound();
                    }, 1500);
                }
            }
        }
    } else {
        $(this).addClass('wrong');
        memoryGameState.wrongPresses++;

        updateMemoryMessage('wrong');
        playMemorySound('failure');

        if (memoryGameState.wrongPresses >= memoryGameState.config.maxWrongPresses) {
            memoryGameState.gameActive = false;
            clearInterval(memoryGameState.guessTimer);
            memoryGameState.guessTimer = null;

            setTimeout(() => {
                endMemoryGame(false);
            }, 1500);
            return;
        }

        setTimeout(() => {
            $(this).removeClass('player-selected wrong');
            memoryGameState.playerSelected.pop();
            updateMemoryMessage('guess');
        }, 800);
    }
}

function endMemoryGame(success) {
    memoryGameState.gameActive = false;
    memoryGameState.showingPattern = false;

    clearAllTimers();

    if (success) {
        const avgTime = memoryGameState.totalTime / memoryGameState.config.rounds;
        const timeDisplay = (avgTime / 1000).toFixed(1);
        $('#memory-message').text(`🎉 Memory test completed! Avg time: ${timeDisplay}s`);
        playMemorySound('success');
    } else {
        $('#memory-message').text('❌ Memory test failed!');
        playMemorySound('failure');
    }

    // Show final stats
    showFinalStats(success);

    setTimeout(() => {
        $('#memory-container').hide();
        if (window.invokeNative) {
            fetch(`https://${GetParentResourceName()}/memoryResult`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({
                    success: success,
                    roundTimes: memoryGameState.roundTimes,
                    totalTime: memoryGameState.totalTime,
                    averageTime: memoryGameState.totalTime / memoryGameState.config.rounds,
                    wrongPresses: memoryGameState.wrongPresses,
                    roundsCompleted: memoryGameState.currentRound
                })
            });
        }
    }, 3000);
}

function showFinalStats(success) {
    const statsContainer = $('<div class="memory-final-stats"></div>');

    let statsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;padding:15px;background:rgba(0,0,0,0.3);border-radius:10px;">';
    statsHtml += `<div><strong>Rounds:</strong> ${memoryGameState.currentRound}/${memoryGameState.config.rounds}</div>`;
    statsHtml += `<div><strong>Wrong Presses:</strong> ${memoryGameState.wrongPresses}</div>`;

    if (memoryGameState.roundTimes.length > 0) {
        const avgTime = (memoryGameState.totalTime / memoryGameState.roundTimes.length / 1000).toFixed(1);
        const fastestTime = (Math.min(...memoryGameState.roundTimes) / 1000).toFixed(1);
        const slowestTime = (Math.max(...memoryGameState.roundTimes) / 1000).toFixed(1);

        statsHtml += `<div><strong>Avg Time:</strong> ${avgTime}s</div>`;
        statsHtml += `<div><strong>Fastest:</strong> ${fastestTime}s</div>`;
        statsHtml += `<div><strong>Slowest:</strong> ${slowestTime}s</div>`;
    }

    statsHtml += `<div><strong>Pattern Size:</strong> ${memoryGameState.config.squareCount}</div>`;
    statsHtml += `<div><strong>Grid Size:</strong> ${memoryGameState.config.gridSize}x${memoryGameState.config.gridSize}</div>`;
    statsHtml += '</div>';

    statsContainer.html(statsHtml);
    $('.memory-container').append(statsContainer);
}

function playMemorySound(type) {
    try {
        let audio;
        switch (type) {
            case 'click':
                audio = document.getElementById('sound-click');
                break;
            case 'success':
                audio = document.getElementById('sound-success');
                break;
            case 'failure':
                audio = document.getElementById('sound-failure');
                break;
            default:
                audio = document.getElementById('sound-buttonPress');
        }

        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

// CSS additions for new features
function addMemoryStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .memory-stats {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 10px 0;
            font-size: 14px;
            color: #aaa;
        }
        .memory-stats span {
            background: rgba(255,255,255,0.05);
            padding: 4px 12px;
            border-radius: 12px;
        }
        .memory-timer-container {
            display: flex;
            gap: 20px;
            margin: 15px 0;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }
        .memory-timer-item {
            flex: 1;
        }
        .memory-timer-item .label {
            font-size: 11px;
            color: #888;
            margin-bottom: 4px;
        }
        .memory-timer-item .timer-bar {
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 2px;
        }
        .memory-timer-item .timer-bar .progress {
            height: 100%;
            transition: width 0.1s linear;
            border-radius: 2px;
        }
        .memory-timer-item .timer-bar .progress.show-progress {
            background: linear-gradient(90deg, #00d4ff, #0099cc);
        }
        .memory-timer-item .timer-bar .progress.guess-progress {
            background: linear-gradient(90deg, #ff6b35, #ff4500);
        }
        .memory-timer-item .timer-bar .progress.guess-progress.danger {
            animation: pulseWarning 0.5s ease infinite;
        }
        .memory-timer-item .time-display {
            font-size: 18px;
            font-weight: bold;
            color: #fff;
        }
        .memory-square.correct-timeout {
            background: rgba(255,165,0,0.5) !important;
            border-color: #ffaa00 !important;
            animation: pulseOrange 0.5s ease;
        }
        @keyframes pulseWarning {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes pulseOrange {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); background: rgba(255,165,0,0.8); }
            100% { transform: scale(1); }
        }
        #memory-message.error {
            color: #ff4444;
        }
        #memory-message.success {
            color: #00cc66;
        }
        #memory-message.warning {
            color: #ffaa00;
        }
        .memory-final-stats {
            margin-top: 20px;
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .memory-final-stats div {
            font-size: 13px;
        }
        .memory-final-stats strong {
            color: #00d4ff;
        }
    `;
    document.head.appendChild(style);
}

// Initialize styles
addMemoryStyles();

// Update the HTML structure when creating the game
function createMemoryUI() {
    // This function would be called to create the UI structure
    // But since we're working with existing HTML, we'll just add the new elements via JavaScript
    // when the game starts
}

window.addEventListener('message', function (event) {
    if (event.data.action === 'startMemory') {
        startMemoryGame(event.data.config);
    } else if (event.data.action === 'endMemory') {
        endMemoryGame(false);
    }
});