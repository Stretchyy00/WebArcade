// ==========================================
// CONFIGURATION & DATA GAME (MEGA WHEEL PRAGMATIC PLAY EXACT MATCH)
// ==========================================
const wheelNumbers = [
    40, 1, 2, 5, 1, 2, 1, 10, 1, 2, 
    5, 1, 2, 15, 1, 2, 5, 1, 2, 1, 
    8, 1, 2, 1, 20, 1, 2, 1, 5, 1, 
    2, 1, 10, 1, 2, 5, 1, 2, 1, 15, 
    1, 2, 5, 1, 2, 1, 8, 1, 2, 1, 
    30, 1, 2, 1
];

const colors = {
    1: "#3d0075", 2: "#004085", 5: "#006632", 8: "#9e5d00",
    10: "#8f001d", 15: "#8f006b", 20: "#007a76", 30: "#a38200", 40: "#ffffff"
};
const textColors = { 40: "#05020c" };

// ==========================================
// INTEGRASI SALDO DENGAN MENU UTAMA (LOCALSTORAGE)
// ==========================================
function getCurrentUser() {
    return localStorage.getItem('active_session') || null;
}

function getUserBalance() {
    const user = getCurrentUser();
    if (!user) return 100000; // Fallback jika dijalankan tanpa login
    const db = JSON.parse(localStorage.getItem('users_db')) || {};
    return db[user] ? db[user].balance : 100000;
}

function saveUserBalance(newBalance) {
    const user = getCurrentUser();
    if (!user) return;
    
    let db = JSON.parse(localStorage.getItem('users_db')) || {};
    if (db[user]) {
        db[user].balance = newBalance;
        localStorage.setItem('users_db', JSON.stringify(db));
        
        // Kirim event ke menu utama agar saldo di menu utama langsung berubah
        window.dispatchEvent(new Event('storage'));
        if (window.parent) {
            window.parent.postMessage({ type: 'UPDATE_BALANCE', balance: newBalance }, '*');
        }
    }
}

// Inisialisasi Saldo dari Database Menu Utama
let balance = getUserBalance(); 
const BET_STEP = 10000; 
let currentBets = {};
let isSpinning = false;
let historyLog = [1, 2, 5, 1, 8]; 

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const totalSegments = wheelNumbers.length;
const segmentAngle = (2 * Math.PI) / totalSegments;
const degreesPerSegment = 360 / totalSegments;

let lastPegIndex = -1;  

// Helper Format Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatShortRupiah(amount) {
    if (amount >= 1000000) return (amount / 1000000) + 'jt';
    if (amount >= 1000) return (amount / 1000) + 'rb';
    return amount;
}

// ==========================================
// AUDIO SYNTH ENGINE
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); 
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
        osc.start(); osc.stop(audioCtx.currentTime + 0.06);
    } 
    else if (type === 'tick') {
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(280, audioCtx.currentTime); 
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);      
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02); 
        osc.start(); osc.stop(audioCtx.currentTime + 0.025);
    }
    else if (type === 'win') {
        osc.type = 'sawtooth'; 
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); 
        osc.frequency.setValueAtTime(659.25, now + 0.08); 
        osc.frequency.setValueAtTime(783.99, now + 0.16); 
        osc.frequency.setValueAtTime(1046.50, now + 0.24); 
        gain.gain.setValueAtTime(0.7, now); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(); osc.stop(now + 0.6);
    }
    else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.5); 
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }
}

// ==========================================
// RENDER RODA & FISIKA
// ==========================================
function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const radius = canvas.width / 2;
    
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-radius, -radius);

    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#11052C";
    ctx.fill();

    for (let i = 0; i < totalSegments; i++) {
        const angle = i * segmentAngle;
        const num = wheelNumbers[i];

        ctx.beginPath();
        ctx.fillStyle = colors[num];
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius * 0.98, angle, angle + segmentAngle);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + segmentAngle / 2); 
        ctx.rotate(Math.PI / 2); 

        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = "900 24px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = textColors[num] || "#ffffff";
        ctx.fillText(num, 0, -radius * 0.82);
        ctx.restore();
    }

    for (let i = 0; i < totalSegments; i++) {
        const angle = i * segmentAngle;

        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle); 
        
        const pegX = 0;
        const pegY = -radius * 0.95; 

        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.arc(pegX, pegY, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#dcdcdc"; 
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pegX, pegY, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
    }
    ctx.restore(); 

    ctx.beginPath();
    ctx.arc(radius, radius, radius * 0.45, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(4, 1, 12, 0.85)";
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
}

const pointerElem = document.querySelector('.pointer');

function trackWheelPhysics() {
    if (!isSpinning) return;

    const style = window.getComputedStyle(canvas);
    const transform = style.getPropertyValue("transform");
    
    if (transform && transform !== "none") {
        const values = transform.split('(')[1].split(')')[0].split(',');
        const a = parseFloat(values[0]);
        const b = parseFloat(values[1]);
        
        let angleRad = Math.atan2(b, a);
        let angleDeg = angleRad * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        let normalizedAngle = (360 - angleDeg) % 360;
        let currentPegIndex = Math.floor(normalizedAngle / degreesPerSegment) % totalSegments;

        if (currentPegIndex !== lastPegIndex) {
            lastPegIndex = currentPegIndex;
            playSound('tick');
            pointerElem.classList.remove('hit');
            void pointerElem.offsetWidth; 
            pointerElem.classList.add('hit');
        }
    }
    requestAnimationFrame(trackWheelPhysics);
}

// ==========================================
// UI & BETTING HANDLERS
// ==========================================
document.querySelectorAll('.bet-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (isSpinning) return;
        playSound('click'); 
        const value = button.getAttribute('data-value');
        if (balance >= BET_STEP) {
            balance -= BET_STEP;
            saveUserBalance(balance); // Simpan saldo baru
            currentBets[value] = (currentBets[value] || 0) + BET_STEP;
            updateUI();
        }
    });
});

function updateUI() {
    document.getElementById("balance-display").innerText = formatRupiah(balance);
    let totalBet = 0;
    document.querySelectorAll('.bet-btn').forEach(button => {
        const value = button.getAttribute('data-value');
        const betOnThis = currentBets[value] || 0;
        totalBet += betOnThis;
        let chip = button.querySelector('.chip');
        if (betOnThis > 0) {
            if (!chip) {
                chip = document.createElement('span');
                chip.className = 'chip';
                button.appendChild(chip);
            }
            chip.innerText = formatShortRupiah(betOnThis);
        } else if (chip) { chip.remove(); }
    });
    document.getElementById("total-bet-display").innerText = formatRupiah(totalBet);
    updateHistoryUI();
}

function updateHistoryUI() {
    const container = document.getElementById("history-row");
    container.innerHTML = "";
    historyLog.slice(-5).reverse().forEach(num => {
        const badge = document.createElement('div');
        badge.className = 'hist-badge';
        badge.style.backgroundColor = colors[num];
        badge.style.color = textColors[num] || 'white';
        badge.innerText = num;
        container.appendChild(badge);
    });
}

document.getElementById("clear-btn").addEventListener('click', () => {
    if (isSpinning) return;
    playSound('click');
    for (let val in currentBets) { balance += currentBets[val]; }
    saveUserBalance(balance); // Kembalikan saldo yang dibatalkan
    currentBets = {};
    updateUI();
});

function showWinModal(winningNumber, isWin, payoutAmount, hasMultiplier) {
    const modal = document.getElementById("win-modal");
    const title = document.getElementById("modal-title");
    const winNumSpan = document.getElementById("modal-winning-num");
    const payoutSpan = document.getElementById("modal-payout");
    const glow = document.querySelector(".modal-glow");

    winNumSpan.innerText = winningNumber;
    winNumSpan.style.backgroundColor = colors[winningNumber];
    winNumSpan.style.color = textColors[winningNumber] || "white";

    if (isWin) {
        playSound('win'); 
        title.innerText = hasMultiplier ? "MEGA WIN!" : "MENANG!";
        title.style.color = hasMultiplier ? "#ffcc00" : "#00ffcc";
        glow.style.background = hasMultiplier ? "#ffcc00" : "#00ffcc";
        payoutSpan.innerText = formatRupiah(payoutAmount);
        payoutSpan.style.color = "#ffcc00";
    } else {
        playSound('lose'); 
        title.innerText = "KALAH";
        title.style.color = "#ff0055";
        glow.style.background = "#ff0055";
        payoutSpan.innerText = "Rp 0";
        payoutSpan.style.color = "#6a5885";
    }
    modal.classList.add("show");
}

document.getElementById("modal-close-btn").addEventListener("click", () => {
    playSound('click');
    document.getElementById("win-modal").classList.remove("show");
});

// ==========================================
// SPIN EXECUTION
// ==========================================
document.getElementById("spin-btn").addEventListener('click', () => {
    let totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);
    if (totalBet === 0 || isSpinning) return; 

    isSpinning = true;
    document.getElementById("spin-btn").disabled = true;
    playSound('click');
    
    const box = document.querySelector(".multiplier-box");
    const screenValue = document.getElementById("multiplier-screen");
    box.classList.remove("active");
    screenValue.innerText = "—";

    let multiplier = 1;
    let targetMultNumber = null;
    
    if (Math.random() < 0.6) { 
        const uniqueNumbers = [1, 2, 5, 8, 10, 15, 20, 30, 40];
        targetMultNumber = uniqueNumbers[Math.floor(Math.random() * uniqueNumbers.length)];
        const multiplierOptions = [5, 10, 15, 20, 25, 50, 100, 250, 500];
        multiplier = multiplierOptions[Math.floor(Math.random() * multiplierOptions.length)];
        
        setTimeout(() => {
            box.classList.add("active");
            screenValue.innerText = `${targetMultNumber} (x${multiplier})`;
            playSound('win'); 
        }, 1000);
    }

    const winningIndex = Math.floor(Math.random() * totalSegments);
    const winningNumber = wheelNumbers[winningIndex];

    const maxOffset = (degreesPerSegment / 2) * 0.4; 
    const randomOffset = (Math.random() * (maxOffset * 2)) - maxOffset; 

    const targetAngleDegree = (winningIndex * degreesPerSegment) + (degreesPerSegment / 2) + randomOffset;
    const extraSpins = 7 * 360; 
    const totalRotation = extraSpins + (360 - targetAngleDegree);

    lastPegIndex = -1; 
    requestAnimationFrame(trackWheelPhysics);

    canvas.style.transition = "transform 7s cubic-bezier(0.1, 0.85, 0.1, 1)";
    canvas.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        document.getElementById("spin-btn").disabled = false;

        canvas.style.transition = "none";
        canvas.style.transform = `rotate(${totalRotation % 360}deg)`;

        let finalMultiplier = (winningNumber === targetMultNumber) ? multiplier : 1;
        let userBetOnWinningNumber = currentBets[winningNumber] || 0;

        historyLog.push(winningNumber);

        let isWin = userBetOnWinningNumber > 0;
        let winAmount = 0;
        if (isWin) {
            winAmount = userBetOnWinningNumber + (userBetOnWinningNumber * winningNumber * finalMultiplier);
            balance += winAmount;
            saveUserBalance(balance); // Simpan kemenangan ke database
        }

        showWinModal(winningNumber, isWin, winAmount, finalMultiplier > 1);
        currentBets = {};
        updateUI();
    }, 7000); 
});

drawWheel();
updateUI();
