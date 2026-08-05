const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// =========================
// UI ELEMENTS
// =========================

const balanceEl = document.getElementById('balance');
const multiplierEl = document.getElementById('multiplier');
const moonIsland = document.getElementById('moon-island');
const statusEl = document.getElementById('game-status');
const btnAction = document.getElementById('btn-action');
const displayBetAmount = document.getElementById('display-bet-amount');
const cashedProfitEl = document.getElementById('cashed-profit');

// MODAL BET KEYPAD
const betModal = document.getElementById('betModal');
const closeBetModal = document.getElementById('closeBetModal');
const betInputDisplay = document.getElementById('betInputDisplay');

// =========================
// SOUND SYSTEM
// =========================

const soundFly = document.getElementById('soundFly');
const soundIdle = document.getElementById('soundIdle');
const soundCrash = document.getElementById('soundCrash');
const soundCashout = document.getElementById('soundCashout');

soundIdle.volume = 0.3;
soundFly.volume = 0.5;
soundCrash.volume = 0.7;
soundCashout.volume = 1;

// =========================
// BALANCE & PROFILE LOCALSTORAGE SYNC
// =========================

function getActiveUserData() {
    const activeUser = localStorage.getItem('active_session');
    let db = JSON.parse(localStorage.getItem('users_db')) || {};

    if (activeUser && db[activeUser]) {
        return {
            username: db[activeUser].username || activeUser,
            vipLevel: db[activeUser].vipLevel || "VIP Level 1",
            balance: db[activeUser].balance !== undefined ? db[activeUser].balance : 25000
        };
    }

    return {
        username: "Player One",
        vipLevel: "VIP Level 1",
        balance: 25000
    };
}

function updateActiveUserBalance(newBalance) {
    const activeUser = localStorage.getItem('active_session');
    let db = JSON.parse(localStorage.getItem('users_db')) || {};

    if (activeUser && db[activeUser]) {
        db[activeUser].balance = newBalance;
        localStorage.setItem('users_db', JSON.stringify(db));
    }
}

let userData = getActiveUserData();
let balance = userData.balance;

function syncBalanceUI() {
    if (balanceEl) {
        balanceEl.innerText = "Rp " + balance.toLocaleString('id-ID');
    }
    updateActiveUserBalance(balance);
}

function syncProfileUI() {
    const user = getActiveUserData();
    
    const nameEl = document.querySelector('.profile-info .username') || 
                   document.getElementById('profile-username') || 
                   document.querySelector('.username');
                   
    const vipEl = document.querySelector('.profile-info .user-status') || 
                  document.getElementById('profile-vip') || 
                  document.querySelector('.user-status');

    if (nameEl) {
        if (nameEl.tagName === 'INPUT') nameEl.value = user.username;
        else nameEl.innerText = user.username;
    }

    if (vipEl) {
        if (vipEl.tagName === 'INPUT') vipEl.value = user.vipLevel;
        else vipEl.innerText = user.vipLevel;
    }
}

// Pantau perubahan saldo & profil real-time dari menu utama
window.addEventListener('storage', (e) => {
    if (e.key === 'users_db' || e.key === 'active_session') {
        const updatedUser = getActiveUserData();
        balance = updatedUser.balance;
        if (balanceEl) {
            balanceEl.innerText = "Rp " + balance.toLocaleString('id-ID');
        }
        syncProfileUI();
    }
});

// =========================
// GAME STATE
// =========================

let roundCooldown = false;
let resetCountdown = 3;
let countdownInterval;

let crashFlash = 0;
let isCrashState = false;

let currentBet = 10000;
let currentMultiplier = 1.00;
let crashPoint = 0;

let gameInterval;
let gameState = 'idle';
let isCashedOut = false;
let savedTick = 0;
let liveCashoutAmount = 0;

let tempBetValue = "10000";

// =========================
// ASTRONAUT & STARS
// =========================

let astronaut = { radius: 12 };
let starsBase = [];

function createStars() {
    starsBase = [];
    for (let i = 0; i < 50; i++) {
        starsBase.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 1.5 + 0.3
        });
    }
}

// =========================
// INIT & RESIZE
// =========================

syncBalanceUI();
syncProfileUI();
updateBetDisplay();

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();
createStars();

window.addEventListener('resize', () => {
    resizeCanvas();
    createStars();
    drawGame(savedTick);
});

// =========================
// BET SYSTEM
// =========================

function updateBetDisplay() {
    if (displayBetAmount) {
        displayBetAmount.innerText = "Rp " + currentBet.toLocaleString('id-ID');
    }
}

function addBet(amount) {
    if (gameState !== 'idle' && gameState !== 'crashed') return;
    currentBet += amount;
    updateBetDisplay();
}

function doubleBet() {
    if (gameState !== 'idle' && gameState !== 'crashed') return;
    currentBet *= 2;
    updateBetDisplay();
}

function resetBet() {
    if (gameState !== 'idle' && gameState !== 'crashed') return;
    currentBet = 10000;
    updateBetDisplay();
}

function adjustBet(direction) {
    if (gameState !== 'idle' && gameState !== 'crashed') return;
    if (direction === 1) {
        currentBet += 5000;
    } else {
        if (currentBet > 5000) currentBet -= 5000;
    }
    updateBetDisplay();
}

// =========================
// BET MODAL SYSTEM
// =========================

if (displayBetAmount) {
    displayBetAmount.addEventListener('click', () => {
        if (gameState !== 'idle' && gameState !== 'crashed') return;
        tempBetValue = currentBet.toString();
        betInputDisplay.innerText = parseInt(tempBetValue).toLocaleString('id-ID');
        betModal.classList.remove('hidden');
    });
}

if (closeBetModal) {
    closeBetModal.addEventListener('click', () => {
        betModal.classList.add('hidden');
    });
}

function appendBet(number) {
    if (tempBetValue.length >= 9) return;
    if (tempBetValue === "0") tempBetValue = number;
    else tempBetValue += number;
    betInputDisplay.innerText = parseInt(tempBetValue).toLocaleString('id-ID');
}

function deleteBet() {
    tempBetValue = tempBetValue.slice(0, -1);
    if (tempBetValue.length <= 0) tempBetValue = "0";
    betInputDisplay.innerText = parseInt(tempBetValue).toLocaleString('id-ID');
}

function clearBet() {
    tempBetValue = "0";
    betInputDisplay.innerText = "0";
}

function confirmBet() {
    let finalBet = parseInt(tempBetValue);
    if (isNaN(finalBet) || finalBet <= 0) return;
    currentBet = finalBet;
    updateBetDisplay();
    betModal.classList.add('hidden');
}

if (betModal) {
    betModal.addEventListener('click', (e) => {
        if (e.target === betModal) betModal.classList.add('hidden');
    });
}

// =========================
// DRAW GAME ENGINE
// =========================

function drawGame(progress) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let bg = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.6, 50,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width
    );
    bg.addColorStop(0, '#1a0b3d');
    bg.addColorStop(0.4, '#0b1020');
    bg.addColorStop(1, '#050510');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height / 4,
        canvas.width / 2, canvas.height / 2, canvas.height
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120,180,255,0.15)';
        ctx.fill();
    }

    const astronautX = canvas.width / 2;
    const startY = canvas.height - 50;

    // --- POSISI ROKET MENTOK DI BAWAH BULAN ---
    let moonCenterY = canvas.height * 0.30;
    if (moonIsland) {
        const moonRect = moonIsland.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        if (moonRect.height > 0) {
            moonCenterY = (moonRect.top - canvasRect.top) + (moonRect.height / 2);
        }
    }
    const moonRadius = 45;
    const stopY = moonCenterY + moonRadius + astronaut.radius + 15;

    let astronautY = startY;

    if (gameState === 'idle') {
        astronautY = startY;
    } else {
        astronautY = startY - (progress * 2.2);
        if (astronautY < stopY) astronautY = stopY; // Mentok di bawah bulan
    }

    ctx.beginPath();
    ctx.arc(astronautX, astronautY, astronaut.radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    let flameSize = 35 + Math.sin(progress * 0.4) * 8;
    ctx.beginPath();
    ctx.arc(astronautX, astronautY + 25, 18 + Math.sin(progress * 0.3) * 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,120,0,0.18)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(astronautX - 8, astronautY + 10);
    ctx.lineTo(astronautX + 8, astronautY + 10);
    ctx.lineTo(astronautX, astronautY + flameSize);
    ctx.closePath();

    let flameGrad = ctx.createLinearGradient(astronautX, astronautY + 10, astronautX, astronautY + flameSize);
    flameGrad.addColorStop(0, '#fff176');
    flameGrad.addColorStop(0.5, '#ff9800');
    flameGrad.addColorStop(1, '#ff3d00');

    ctx.fillStyle = flameGrad;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff6600';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(astronautX - 4, astronautY + 12);
    ctx.lineTo(astronautX + 4, astronautY + 12);
    ctx.lineTo(astronautX, astronautY + flameSize - 10);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < 5; i++) {
        let randomX = (Math.random() - 0.5) * 12;
        let randomY = Math.random() * 25;
        ctx.beginPath();
        ctx.arc(astronautX + randomX, astronautY + flameSize + randomY, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${120 + Math.random() * 100},0,0.8)`;
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(astronautX, astronautY, astronaut.radius, 0, Math.PI * 2);
    let bodyGrad = ctx.createLinearGradient(astronautX, astronautY - 15, astronautX, astronautY + 15);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(1, '#cfd8dc');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(astronautX + 3, astronautY - 3, 6, 0, Math.PI * 2);
    let visorGrad = ctx.createLinearGradient(astronautX, astronautY - 10, astronautX, astronautY + 10);
    visorGrad.addColorStop(0, '#9be7ff');
    visorGrad.addColorStop(1, '#0288d1');
    ctx.fillStyle = visorGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(astronautX - 10, astronautY + 5);
    ctx.lineTo(astronautX - 18, astronautY + 12);
    ctx.lineTo(astronautX - 10, astronautY - 2);
    ctx.closePath();
    ctx.fillStyle = '#90a4ae';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(astronautX + 10, astronautY + 5);
    ctx.lineTo(astronautX + 18, astronautY + 12);
    ctx.lineTo(astronautX + 10, astronautY - 2);
    ctx.closePath();
    ctx.fillStyle = '#90a4ae';
    ctx.fill();

    if (crashFlash > 0) {
        ctx.fillStyle = 'rgba(255,0,0,0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        crashFlash--;
    }

    if (isCrashState) {
        moonIsland.classList.add("moon-crash");
        multiplierEl.classList.add("text-crash");
    } else {
        moonIsland.classList.remove("moon-crash");
        multiplierEl.classList.remove("text-crash");
    }

    if (gameState === 'crashed') {
        ctx.beginPath();
        ctx.arc(astronautX, astronautY, astronaut.radius + 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,0,80,0.25)';
        ctx.fill();
    }
}

drawGame(0);

function enterGame(){
    const landingPage = document.getElementById("landingPage");
    const mainGame = document.getElementById("mainGame");

    if (landingPage) {
        landingPage.style.opacity = "0";
        landingPage.style.pointerEvents = "none";
    }

    setTimeout(() => {
        if (landingPage) landingPage.style.display = "none";
        if (mainGame) mainGame.style.display = "flex";
        resizeCanvas();
        syncProfileUI();

        gameState = 'idle';
        savedTick = 0;
        drawGame(0);
        soundIdle.play();

        multiplierEl.innerText = "1.00x";
        moonIsland.className = "moon-container moon-default";
        multiplierEl.className = "moon-multiplier text-orange";
    }, 300);
}

function updateMultiplierTheme() {
    moonIsland.className = "moon-container";
    multiplierEl.className = "moon-multiplier";

    if (currentMultiplier < 2) {
        moonIsland.classList.add("moon-default");
        multiplierEl.classList.add("text-orange");
    } else if (currentMultiplier >= 2 && currentMultiplier < 5) {
        moonIsland.classList.add("moon-green");
        multiplierEl.classList.add("text-green");
    } else if (currentMultiplier >= 5 && currentMultiplier < 10) {
        moonIsland.classList.add("moon-blue");
        multiplierEl.classList.add("text-blue");
    } else if (currentMultiplier >= 10 && currentMultiplier < 50) {
        moonIsland.classList.add("moon-purple");
        multiplierEl.classList.add("text-purple");
    } else {
        moonIsland.classList.add("moon-gold");
        multiplierEl.classList.add("text-gold");
    }

    if (isCrashState) {
        moonIsland.className = "moon-container moon-crash";
        multiplierEl.className = "moon-multiplier text-crash";
    }
}

// =========================
// START GAME
// =========================

function startGame() {
    if (gameState === 'running') return;

    isCrashState = false;
    isCashedOut = false;

    balance = getActiveUserData().balance;

    if (isNaN(currentBet) || currentBet <= 0 || currentBet > balance) {
        showAlert("BET FAILED", "Jumlah taruhan tidak valid atau saldo tidak cukup!");
        return;
    }

    clearInterval(gameInterval);
    savedTick = 0;
    currentMultiplier = 1.00;

    balance -= currentBet;
    syncBalanceUI();

    gameState = 'running';

    soundIdle.pause();
    soundIdle.currentTime = 0;
    soundFly.currentTime = 0;
    soundFly.play();

    soundFly.addEventListener('timeupdate', () => {
        if (soundFly.currentTime >= soundFly.duration - 0.15) {
            soundFly.currentTime = 0;
            soundFly.play();
        }
    });

    statusEl.className = 'status-display';
    statusEl.innerText = '';

    liveCashoutAmount = currentBet;
    cashedProfitEl.innerText = "Rp " + liveCashoutAmount.toLocaleString('id-ID');

    moonIsland.className = "moon-container moon-default";
    multiplierEl.className = "moon-multiplier text-orange";

    btnAction.innerHTML = `<span class="check-icon"><i class="fa-solid fa-check"></i></span> CASH OUT`;
    btnAction.classList.add('cashout-mode');

    const rand = Math.random();
    if (rand < 0.12) crashPoint = parseFloat((1.00 + Math.random() * 0.50).toFixed(2));
    else if (rand < 0.70) crashPoint = parseFloat((1.50 + Math.random() * 2.00).toFixed(2));
    else if (rand < 0.90) crashPoint = parseFloat((3 + Math.random() * 5).toFixed(2));
    else if (rand < 0.98) crashPoint = parseFloat((8 + Math.random() * 20).toFixed(2));
    else if (rand < 0.997) crashPoint = parseFloat((30 + Math.random() * 120).toFixed(2));
    else crashPoint = parseFloat((100 + Math.random() * 900).toFixed(2));

    gameInterval = setInterval(() => {
        savedTick++;
        currentMultiplier += 0.005 + (savedTick * 0.000025);
        multiplierEl.innerText = currentMultiplier.toFixed(2) + "x";
        updateMultiplierTheme();

        liveCashoutAmount = Math.floor(currentBet * currentMultiplier);

        if (!isCashedOut) {
            cashedProfitEl.innerText = "Rp " + liveCashoutAmount.toLocaleString('id-ID');
        }

        drawGame(savedTick);

        if (currentMultiplier >= crashPoint) {
            isCrashState = true;
            crashFlash = 2;
            soundFly.pause();
            soundFly.currentTime = 0;
            soundCrash.currentTime = 0;
            soundCrash.play();
            endGame();
        }
    }, 50);
}

// =========================
// END GAME
// =========================

function endGame() {
    clearInterval(gameInterval);
    gameState = 'crashed';
    roundCooldown = true;

    btnAction.disabled = true;
    btnAction.style.pointerEvents = "none";
    btnAction.style.opacity = "0.5";

    multiplierEl.innerText = crashPoint.toFixed(2) + "x";
    multiplierEl.classList.add("text-crash");
    moonIsland.classList.add("moon-crash");

    statusEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:4px; width:100%;">
            <span style="color:#ff3b3b; font-size:28px; font-weight:900; letter-spacing:1px; text-shadow:0 0 15px rgba(255,0,0,0.7);">CRASHED</span>
            <span style="color:#ffffff; font-size:16px; font-weight:700; text-shadow:0 0 8px rgba(255,255,255,0.4);">${crashPoint.toFixed(2)}x</span>
        </div>
    `;
    statusEl.className = 'status-display';
    drawGame(savedTick);

    setTimeout(() => {
        isCrashState = false;
        moonIsland.classList.remove("moon-crash");
        multiplierEl.classList.remove("text-crash");

        resetCountdown = 3;
        statusEl.className = 'status-display status-next-round';

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            statusEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <span style="color:#ffffff; font-size:20px; font-weight:700;">NEXT ROUND</span>
                    <span style="color:#00ff9d; font-size:50px; font-weight:900; text-shadow:0 0 10px #00ff9d, 0 0 20px #00ff9d, 0 0 35px #00ff9d;">${resetCountdown}</span>
                </div>
            `;
            resetCountdown--;

            if (resetCountdown < 0) {
                clearInterval(countdownInterval);

                roundCooldown = false;
                gameState = 'idle';
                isCashedOut = false;
                isCrashState = false;
                savedTick = 0;
                currentMultiplier = 1.00;
                liveCashoutAmount = currentBet;
                crashFlash = 0;

                multiplierEl.innerText = "1.00x";
                multiplierEl.className = "moon-multiplier text-orange";
                moonIsland.className = "moon-container moon-default";
                statusEl.innerText = '';
                statusEl.className = 'status-display';

                cashedProfitEl.innerText = "Rp " + currentBet.toLocaleString('id-ID');

                btnAction.disabled = false;
                btnAction.style.pointerEvents = "auto";
                btnAction.style.opacity = "1";
                btnAction.style.cursor = "pointer";
                btnAction.classList.remove('cashout-mode');
                btnAction.innerHTML = `<span class="check-icon"><i class="fa-solid fa-check"></i></span> CONFIRM BET`;

                drawGame(0);
                soundIdle.play();
            }
        }, 1000);
    }, 500);
}

function showAlert(title, message) {
    const alertBox = document.getElementById('customAlert');
    if (!alertBox) return;

    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    alertBox.classList.add('show');

    clearTimeout(window.alertTimeout);
    window.alertTimeout = setTimeout(() => closeAlert(), 3000);
}

function closeAlert() {
    const alertBox = document.getElementById('customAlert');
    if (!alertBox) return;
    alertBox.classList.remove('show');
}

if (btnAction) {
    btnAction.addEventListener('click', () => {
        if (roundCooldown) return;

        if (gameState === 'idle') {
            startGame();
            return;
        }

        if (gameState === 'running' && !isCashedOut) {
            isCashedOut = true;

            soundCashout.currentTime = 0;
            soundCashout.play();

            let winAmount = Math.floor(currentBet * currentMultiplier);

            balance += winAmount;
            syncBalanceUI();

            statusEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:4px; width:100%;">
                    <span style="color:#00ff9d; font-size:28px; font-weight:900; letter-spacing:1px; text-shadow:0 0 15px rgba(0,255,157,0.7);">CASH OUT</span>
                    <span style="color:#ffffff; font-size:16px; font-weight:700; text-shadow:0 0 8px rgba(255,255,255,0.4);">Rp ${winAmount.toLocaleString('id-ID')}</span>
                </div>
            `;
            statusEl.className = 'status-display';
            cashedProfitEl.innerText = "Rp " + winAmount.toLocaleString('id-ID');

            btnAction.disabled = true;
            btnAction.style.opacity = "0.6";
            btnAction.style.cursor = "not-allowed";
            btnAction.innerHTML = `<span class="check-icon"><i class="fa-solid fa-check"></i></span> CASHED OUT`;
        }
    });
}
