const GRID_CONFIG = [4, 5, 5, 5, 4]; 
const NORMAL_SYMBOLS = 7; 
const SCATTER_ID = 7;     
const WILD_ID = 8; 

const NORMAL_MULTIPLIERS = [1, 2, 3, 5];
const FREE_SPIN_MULTIPLIERS = [2, 4, 6, 10];
let currentMultiplierIndex = 0;

let bgmAudio = null;

// SINKRONISASI SALDO DENGAN PORTAL UTAMA
const currentUser = localStorage.getItem('session_user');

function loadBalanceFromPortal() {
    if (!currentUser) return 100000.00;
    const usersDb = JSON.parse(localStorage.getItem('users_db')) || {};
    return usersDb[currentUser] ? usersDb[currentUser].balance : 100000.00;
}

let balance = loadBalanceFromPortal();   
let currentWin = 0.00;     
let totalFreeSpinWin = 0.00; 

function syncBalanceToPortal(newBalance) {
    if (!currentUser) return;

    let usersDb = JSON.parse(localStorage.getItem('users_db')) || {};
    if (usersDb[currentUser]) {
        usersDb[currentUser].balance = newBalance;
        localStorage.setItem('users_db', JSON.stringify(usersDb));
    }

    if (window.parent) {
        window.parent.postMessage({
            type: 'UPDATE_BALANCE',
            newBalance: newBalance
        }, '*');
    }
}

// MEKANIK TARUHAN
const BASE_BET = 20;
let selectedSize = 0.30;  
let selectedLevel = 2;    
let currentBet = selectedSize * selectedLevel * BASE_BET; 

let isTurboActive = false;
let isAutoActive = false;
let autoSpinCount = 0; 
let temporaryAutoCount = 10;

let isFreeSpinMode = false;
let freeSpinCount = 0;

let gameStateStatus = "IDLE"; 
let activeTimeoutsList = [];  

const MAHJONG_UNICODE = ["🀀", "🀅", "🀐", "🀗", "🀘", "🀜", "🀡", "🀄", "WILD"];
let slotData = [];

let scatterTrackerInCurrentSpin = 0;
let scattersLandedSoFar = 0;

const SIZES_LIST = [0.03, 0.10, 0.30, 0.90];
const LEVELS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// AUDIO ENGINE
let audioCtx = null;
let anticipationNodes = null; 
let masterCompressor = null; 

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        masterCompressor = audioCtx.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-10, audioCtx.currentTime); 
        masterCompressor.knee.setValueAtTime(40, audioCtx.currentTime);      
        masterCompressor.ratio.setValueAtTime(12, audioCtx.currentTime);     
        masterCompressor.attack.setValueAtTime(0, audioCtx.currentTime);     
        masterCompressor.release.setValueAtTime(0.25, audioCtx.currentTime);
        
        masterCompressor.connect(audioCtx.destination);
    }
}

function createNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

function playSynthesizedSFX(type) {
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    switch (type) {
        case 'click': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain); gain.connect(masterCompressor);
            osc.start(now); osc.stop(now + 0.04);
            break;
        }
        case 'spin': {
            for (let i = 0; i < 2; i++) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();

                osc.type = i === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(90 + (i * 30), now);
                osc.frequency.linearRampToValueAtTime(55, now + 0.35);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(250, now);

                gain.gain.setValueAtTime(1.0, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(masterCompressor);

                osc.start(now);
                osc.stop(now + 0.35);
            }
            break;
        }
        case 'stop': {
            const osc = audioCtx.createOscillator();
            const noise = audioCtx.createBufferSource();
            noise.buffer = createNoiseBuffer();
            const noiseFilter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(170, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(950, now);
            noiseFilter.Q.setValueAtTime(4, now);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            noise.connect(noiseFilter); noiseFilter.connect(gain);
            gain.connect(masterCompressor);

            osc.start(now); noise.start(now);
            osc.stop(now + 0.08); noise.stop(now + 0.08);
            break;
        }
        case 'scatter': {
            const freqs = [880, 1046.50, 1318.51];
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.22, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

            freqs.forEach(f => {
                const osc = audioCtx.createOscillator();
                const filter = audioCtx.createBiquadFilter();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now);
                
                filter.type = 'peaking';
                filter.frequency.setValueAtTime(f, now);
                filter.Q.setValueAtTime(12, now);

                osc.connect(filter); filter.connect(gainNode);
                osc.start(now); osc.stop(now + 0.85);
            });
            gainNode.connect(audioCtx.destination);
            break;
        }
        case 'win': {
            const baseFreq = 750 + (currentMultiplierIndex * 240); 
            const clusterFreqs = [baseFreq, baseFreq * 1.2, baseFreq * 1.5];

            clusterFreqs.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const highPass = audioCtx.createBiquadFilter();

                osc.type = idx === 1 ? 'square' : 'sine';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.2);

                highPass.type = 'highpass';
                highPass.frequency.setValueAtTime(1200, now);

                gain.gain.setValueAtTime(idx === 1 ? 0.03 : 0.12, now); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

                osc.connect(highPass);
                highPass.connect(gain);
                gain.connect(masterCompressor);

                osc.start(now);
                osc.stop(now + 0.22);
            });
            break;
        }
        case 'anticipation_start': {
            if (anticipationNodes) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(75, now);
            osc.frequency.linearRampToValueAtTime(115, now + 2.0);
            gain.gain.setValueAtTime(1.0, now);
            osc.connect(gain); gain.connect(masterCompressor);
            osc.start(now);
            anticipationNodes = { osc, gain };
            break;
        }
        case 'anticipation_stop': {
            if (anticipationNodes) {
                try {
                    anticipationNodes.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);
                    anticipationNodes.osc.stop(audioCtx.currentTime + 0.06);
                } catch(e){}
                anticipationNodes = null;
            }
            break;
        }
        case 'fstrigger': {
            const melody = [392.00, 523.25, 659.25, 783.99];
            melody.forEach((note, index) => {
                const noteTime = now + (index * 0.1);
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(note, noteTime);
                gain.gain.setValueAtTime(0.12, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
                
                osc.connect(gain); gain.connect(masterCompressor);
                osc.start(noteTime); osc.stop(noteTime + 0.4);
            });
            break;
        }
    }
}

// LOGIKA GAME CORE
function initGame() {
    createGridStructure();
    initBetMenuInteraction();
    updateUI(); 
    generateStaticInitialGrid(); 
}

function createGridStructure() {
    const gridContainer = document.getElementById('slot-grid');
    gridContainer.innerHTML = ''; 

    GRID_CONFIG.forEach((rows, colIndex) => {
        const columnDOM = document.createElement('div');
        columnDOM.classList.add('slot-column');
        columnDOM.setAttribute('data-col', colIndex);
        if (rows === 4) columnDOM.style.paddingTop = '41px'; 
        gridContainer.appendChild(columnDOM);
    });
}

function formatKredit(angka) {
    return angka.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function applyTileColor(tileDOM, id) {
    if (id === 1) { 
        tileDOM.style.color = "#008a20";
    } else if (id === 7) {
        tileDOM.style.color = "#cc0000";
    } else if (id === 2 || id === 4) {
        tileDOM.style.color = "#0f3166";
    } else if (id === 3 || id === 5) {
        tileDOM.style.color = "#ba0416";
    } else {
        tileDOM.style.color = "#222222";
    }
}

function updateUI() {
    document.getElementById('balance-display').innerText = formatKredit(balance);
    document.getElementById('bet-display').innerText = formatKredit(currentBet);
    document.getElementById('win-display').innerText = formatKredit(currentWin);
    
    const activeMultSet = isFreeSpinMode ? FREE_SPIN_MULTIPLIERS : NORMAL_MULTIPLIERS;
    const multIds = ['m1', 'm2', 'm3', 'm5'];
    
    multIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = `x${activeMultSet[index]}`;
            if (index === currentMultiplierIndex) el.classList.add('active');
            else el.classList.remove('active');
        }
    });

    const autoTextEl = document.getElementById('auto-text');
    if (autoTextEl) {
        if (isFreeSpinMode) {
            autoTextEl.innerText = `${freeSpinCount} FS`;
            document.getElementById('auto-btn').classList.add('active');
        } else if (isAutoActive && autoSpinCount > 0) {
            autoTextEl.innerText = `${autoSpinCount} AT`;
        } else {
            autoTextEl.innerText = "AUTO";
            if (!isAutoActive) document.getElementById('auto-btn').classList.remove('active');
        }
    }

    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
        if (gameStateStatus === "ROLLING") {
            spinBtn.classList.add('spinning', 'can-skip');
            spinBtn.disabled = false; 
        } else if (gameStateStatus === "EVALUATING") {
            spinBtn.classList.remove('can-skip');
            spinBtn.classList.add('spinning');
            spinBtn.disabled = true; 
        } else {
            spinBtn.classList.remove('spinning', 'can-skip');
            spinBtn.disabled = false;
        }
    }
}

function changeBetInstant(direction) {
    if (isFreeSpinMode || gameStateStatus !== "IDLE") return;
    playSynthesizedSFX('click');

    const BET_AMOUNTS_LIST = [
        0.60, 1.20, 1.80, 2.00, 2.40, 3.00, 3.60, 4.00, 4.20, 4.80, 
        5.40, 6.00, 8.00, 9.00, 10.00, 12.00, 14.00, 15.00, 16.00, 18.00, 
        20.00, 24.00, 27.00, 30.00, 36.00, 40.00, 45.00, 48.00, 54.00, 60.00, 
        72.00, 90.00, 108.00, 120.00, 126.00, 144.00, 162.00, 180.00, 216.00, 270.00, 
        324.00, 360.00, 432.00, 540.00, 720.00, 900.00, 1080.00, 1260.00, 1440.00, 1620.00, 1800.00
    ];

    let currentBetVal = parseFloat(currentBet.toFixed(2));
    let currentIndex = BET_AMOUNTS_LIST.findIndex(val => Math.abs(val - currentBetVal) < 0.01);
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < BET_AMOUNTS_LIST.length) {
        let targetBet = BET_AMOUNTS_LIST[newIndex];
        
        let foundMatch = false;
        for (let s = 0; s < SIZES_LIST.length; s++) {
            for (let l = 0; l < LEVELS_LIST.length; l++) {
                let calc = SIZES_LIST[s] * LEVELS_LIST[l] * BASE_BET;
                if (Math.abs(calc - targetBet) < 0.01) {
                    selectedSize = SIZES_LIST[s];
                    selectedLevel = LEVELS_LIST[l];
                    currentBet = calc;
                    foundMatch = true;
                    break;
                }
            }
            if (foundMatch) break;
        }

        if (!foundMatch) {
            currentBet = targetBet;
        }
    }

    updateUI();
}

function openBetMenu() {
    if (isFreeSpinMode || gameStateStatus !== "IDLE") return;
    playSynthesizedSFX('click');
    document.getElementById('bet-modal').classList.add('open');
    syncBetModalSelectionVisual();
}

function closeBetMenu() {
    playSynthesizedSFX('click');
    document.getElementById('bet-modal').classList.remove('open');
}

function initBetMenuInteraction() {
    const sizeCol = document.getElementById('size-selector');
    const levelCol = document.getElementById('level-selector');
    const amountCol = document.getElementById('amount-selector');

    if (sizeCol) {
        sizeCol.onscroll = function() {
            detectSelectedFromScroll(sizeCol, (val) => {
                selectedSize = parseFloat(val);
                currentBet = selectedSize * selectedLevel * BASE_BET;
                renderDynamicAmountColumn();
            });
        };
    }

    if (levelCol) {
        levelCol.onscroll = function() {
            detectSelectedFromScroll(levelCol, (val) => {
                selectedLevel = parseInt(val);
                currentBet = selectedSize * selectedLevel * BASE_BET;
                renderDynamicAmountColumn();
            });
        };
    }

    if (amountCol) {
        amountCol.onscroll = function() {
            detectSelectedFromScroll(amountCol, (val) => {
                let targetBet = parseFloat(val);
                let foundMatch = false;
                for (let s = 0; s < SIZES_LIST.length; s++) {
                    for (let l = 0; l < LEVELS_LIST.length; l++) {
                        let calc = SIZES_LIST[s] * LEVELS_LIST[l] * BASE_BET;
                        if (Math.abs(calc - targetBet) < 0.01) {
                            selectedSize = SIZES_LIST[s];
                            selectedLevel = LEVELS_LIST[l];
                            currentBet = calc;
                            foundMatch = true;
                            break;
                        }
                    }
                    if (foundMatch) break;
                }

                if (foundMatch) {
                    scrollToTargetValue(sizeCol, selectedSize);
                    scrollToTargetValue(levelCol, selectedLevel);
                }
            });
        };
    }
}

function detectSelectedFromScroll(columnDOM, updateCallback) {
    const options = columnDOM.querySelectorAll('.bet-opt');
    const colBounds = columnDOM.getBoundingClientRect();
    const centerY = colBounds.top + (colBounds.height / 2); 

    let closestOpt = null;
    let minDistance = Infinity;

    options.forEach(opt => {
        const optBounds = opt.getBoundingClientRect();
        const optCenterY = optBounds.top + (optBounds.height / 2);
        const distance = Math.abs(centerY - optCenterY);

        if (distance < minDistance) {
            minDistance = distance;
            closestOpt = opt;
        }
    });

    if (closestOpt && !closestOpt.classList.contains('selected')) {
        options.forEach(o => o.classList.remove('selected'));
        closestOpt.classList.add('selected');
        updateCallback(closestOpt.getAttribute('data-val'));
    }
}

function renderDynamicAmountColumn() {
    const amountCol = document.getElementById('amount-selector');
    if (!amountCol) return;
    
    amountCol.innerHTML = '';

    const BET_AMOUNTS_LIST = [
        0.60, 1.20, 1.80, 2.00, 2.40, 3.00, 3.60, 4.00, 4.20, 4.80, 
        5.40, 6.00, 8.00, 9.00, 10.00, 12.00, 14.00, 15.00, 16.00, 18.00, 
        20.00, 24.00, 27.00, 30.00, 36.00, 40.00, 45.00, 48.00, 54.00, 60.00, 
        72.00, 90.00, 108.00, 120.00, 126.00, 144.00, 162.00, 180.00, 216.00, 270.00, 
        324.00, 360.00, 432.00, 540.00, 720.00, 900.00, 1080.00, 1260.00, 1440.00, 1620.00, 1800.00
    ];

    let currentBetVal = parseFloat(currentBet.toFixed(2));

    BET_AMOUNTS_LIST.forEach(amt => {
        const amtDiv = document.createElement('div');
        amtDiv.classList.add('bet-opt', 'amount-val');
        amtDiv.setAttribute('data-val', amt);
        amtDiv.innerText = formatKredit(amt);
        
        if (Math.abs(amt - currentBetVal) < 0.01) {
            amtDiv.classList.add('selected');
        }
        amountCol.appendChild(amtDiv);
    });
}

function syncBetModalSelectionVisual() {
    const sizeCol = document.getElementById('size-selector');
    const levelCol = document.getElementById('level-selector');

    scrollToTargetValue(sizeCol, selectedSize);
    scrollToTargetValue(levelCol, selectedLevel);
    
    renderDynamicAmountColumn();
}

function scrollToTargetValue(columnDOM, targetValue) {
    if (!columnDOM) return;
    const options = columnDOM.querySelectorAll('.bet-opt');
    options.forEach(opt => {
        opt.classList.remove('selected');
        if (parseFloat(opt.getAttribute('data-val')) === targetValue) {
            opt.classList.add('selected');
            setTimeout(() => {
                columnDOM.scrollTo({
                    top: opt.offsetTop - 60, 
                    behavior: 'smooth'
                });
            }, 40);
        }
    });
}

function selectMaxBet() {
    playSynthesizedSFX('click');
    selectedSize = SIZES_LIST[SIZES_LIST.length - 1];
    selectedLevel = LEVELS_LIST[LEVELS_LIST.length - 1];
    syncBetModalSelectionVisual();
}

function confirmBetSelection() {
    playSynthesizedSFX('click');
    currentBet = selectedSize * selectedLevel * BASE_BET;
    updateUI();
    closeBetMenu();
}

function showCustomModal(title, message, buttonsConfig, isScatterTrigger = false) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    
    const giantBox = document.getElementById('giant-spin-count');
    const footerText = document.getElementById('modal-footer-tip');
    
    if (isScatterTrigger) {
        if (giantBox) giantBox.classList.remove('hidden'); 
        if (footerText) footerText.innerText = "PUTARAN GRATIS DIMULAI SEKARANG!";
    } else {
        if (giantBox) giantBox.classList.add('hidden');    
        if (footerText) footerText.innerText = "";
    }

    const buttonsContainer = document.getElementById('modal-buttons');
    buttonsContainer.innerHTML = ''; 

    buttonsConfig.forEach(btn => {
        const btnDOM = document.createElement('button');
        btnDOM.className = `modal-btn ${btn.type}`;
        btnDOM.innerText = btn.text;
        btnDOM.onclick = () => {
            playSynthesizedSFX('click');
            closeCustomModal();
            if (btn.action) btn.action();
        };
        buttonsContainer.appendChild(btnDOM);
    });
    document.getElementById('custom-modal').classList.add('open');
}

function closeCustomModal() {
    document.getElementById('custom-modal').classList.remove('open');
}

function openAutoMenu() {
    if (isAutoActive) {
        playSynthesizedSFX('click');
        isAutoActive = false;
        autoSpinCount = 0;
        gameStateStatus = "IDLE"; 
        updateUI();
        return; 
    }

    if (isFreeSpinMode || gameStateStatus !== "IDLE") {
        return; 
    }
    
    playSynthesizedSFX('click');
    temporaryAutoCount = 10;
    
    const options = document.querySelectorAll('.auto-spin-opt');
    options.forEach(opt => {
        if (parseInt(opt.getAttribute('data-count')) === temporaryAutoCount) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });

    document.getElementById('auto-spin-modal').classList.add('open');
}

function closeAutoMenu() {
    playSynthesizedSFX('click');
    document.getElementById('auto-spin-modal').classList.remove('open');
}

function selectAutoCount(count) {
    playSynthesizedSFX('click');
    temporaryAutoCount = count;
    
    const options = document.querySelectorAll('.auto-spin-opt');
    options.forEach(opt => {
        if (parseInt(opt.getAttribute('data-count')) === count) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function confirmAutoSpinSelection() {
    playSynthesizedSFX('click');
    document.getElementById('auto-spin-modal').classList.remove('open');
    
    isAutoActive = true;
    autoSpinCount = temporaryAutoCount;
    updateUI();
    
    if (gameStateStatus === "IDLE") {
        handleSpin();
    }
}

function toggleTurbo() {
    playSynthesizedSFX('click');
    isTurboActive = !isTurboActive;
    const turboBtn = document.getElementById('turbo-btn');
    if (isTurboActive) turboBtn.classList.add('active');
    else turboBtn.classList.remove('active');
}

function getRandomSymbol(colIndex, currentColumnSymbols = []) {
    const r = Math.random();
    const trackingScatterDiKolomIni = currentColumnSymbols.some(tile => tile && tile.id === SCATTER_ID);

    if (r < 0.019 && scatterTrackerInCurrentSpin < 4 && !trackingScatterDiKolomIni) {
        scatterTrackerInCurrentSpin++;
        return { id: SCATTER_ID, goldFrame: false, isNew: true };
    }

    let symId;
    const weights = Math.random();
    
    if (weights < 0.18) symId = 0;
    else if (weights < 0.36) symId = 1;
    else if (weights < 0.54) symId = 2;
    else if (weights < 0.70) symId = 3;
    else if (weights < 0.84) symId = 4;
    else if (weights < 0.93) symId = 5;
    else symId = 6;

    let isGold = false;
    if (colIndex === 1 || colIndex === 2 || colIndex === 3) {
        if (isFreeSpinMode) isGold = Math.random() < 0.32; 
        else isGold = Math.random() < 0.12; 
    }
    return { id: symId, goldFrame: isGold, isNew: true };
}

function generateStaticInitialGrid() {
    slotData = [];
    for (let col = 0; col < GRID_CONFIG.length; col++) {
        const columnSymbols = [];
        for (let row = 0; row < GRID_CONFIG[col]; row++) {
            let symbol = getRandomSymbol(col, columnSymbols);
            symbol.isNew = false;
            columnSymbols.push(symbol);
        }
        slotData.push(columnSymbols);
    }
    renderGridStatic();
}

function renderGridStatic() {
    for (let col = 0; col < slotData.length; col++) {
        const columnDOM = document.querySelector(`[data-col="${col}"]`);
        if (!columnDOM) continue;
        columnDOM.innerHTML = '';
        slotData[col].forEach((tileObj, rowIndex) => {
            if (!tileObj) return;
            const tileDOM = document.createElement('div');
            tileDOM.classList.add('tile');
            tileDOM.setAttribute('data-row', rowIndex);
            
            if(tileObj.id === WILD_ID) {
                tileDOM.innerHTML = `
                    <div class="wild-emoji">⚡</div>
                    <div class="wild-text-bottom">WILD</div>
                `;
            } else {
                tileDOM.innerHTML = MAHJONG_UNICODE[tileObj.id];
                applyTileColor(tileDOM, tileObj.id);
            }

            if (tileObj.id === SCATTER_ID) tileDOM.classList.add('scatter-tile');
            if (tileObj.id === WILD_ID) tileDOM.classList.add('wild-tile');
            if (tileObj.goldFrame) tileDOM.classList.add('gold-framed');
            
            columnDOM.appendChild(tileDOM);
        });
    }
}

function clickSpinController() {
    if (gameStateStatus === "IDLE") handleSpin();
    else if (gameStateStatus === "ROLLING") triggerInstantSkipReel(); 
}

let rollingCallbackGlobalStore = null;
let currentTargetResultStore = [];

function startTrueRollingProcess(callbackOnComplete) {
    gameStateStatus = "ROLLING";
    rollingCallbackGlobalStore = callbackOnComplete;
    activeTimeoutsList = []; 
    scattersLandedSoFar = 0; 

    playSynthesizedSFX('spin'); 

    currentTargetResultStore = [];
    for (let col = 0; col < GRID_CONFIG.length; col++) {
        const colSymbols = [];
        for (let row = 0; row < GRID_CONFIG[col]; row++) {
            colSymbols.push(getRandomSymbol(col, colSymbols));
        }
        currentTargetResultStore.push(colSymbols);
    }

    for (let col = 0; col < GRID_CONFIG.length; col++) {
        const columnDOM = document.querySelector(`[data-col="${col}"]`);
        if (!columnDOM) continue;
        columnDOM.innerHTML = '';

        let extendedSymbols = [...currentTargetResultStore[col]];
        let dummyArrayBuild = [];
        for (let dummy = 0; dummy < 12; dummy++) {
            dummyArrayBuild.push(getRandomSymbol(col, dummyArrayBuild));
        }
        extendedSymbols = extendedSymbols.concat(dummyArrayBuild);

        extendedSymbols.forEach((tileObj, rowIndex) => {
            const tileDOM = document.createElement('div');
            tileDOM.classList.add('tile');
            
            if(tileObj.id === WILD_ID) {
                tileDOM.innerHTML = `
                    <div class="wild-emoji">⚡</div>
                    <div class="wild-text-bottom">WILD</div>
                `;
            } else {
                tileDOM.innerHTML = MAHJONG_UNICODE[tileObj.id];
                applyTileColor(tileDOM, tileObj.id);
            }

            if (tileObj.id === SCATTER_ID) tileDOM.classList.add('scatter-tile');
            if (tileObj.id === WILD_ID) tileDOM.classList.add('wild-tile');
            if (tileObj.goldFrame) tileDOM.classList.add('gold-framed');
            columnDOM.appendChild(tileDOM);
        });

        columnDOM.classList.remove('stopping', 'anticipation-roll');
        columnDOM.classList.add('rolling');
    }

    updateUI();
    triggerColumnStopWithScatterCheck(0);
}

function triggerColumnStopWithScatterCheck(colIndex) {
    if (colIndex >= GRID_CONFIG.length) return;

    let baseDelay = isTurboActive ? 50 : 240;

    if (scattersLandedSoFar >= 2 && colIndex >= 2 && !isTurboActive) {
        baseDelay = 2000; 
        const columnDOM = document.querySelector(`[data-col="${colIndex}"]`);
        if (columnDOM) {
            columnDOM.classList.add('anticipation-roll'); 
            playSynthesizedSFX('anticipation_start'); 
        }
    }

    let tID = setTimeout(() => {
        playSynthesizedSFX('anticipation_stop'); 
        stopSingleColumnVisual(colIndex);
        
        let scatterInThisCol = currentTargetResultStore[colIndex].filter(tile => tile.id === SCATTER_ID).length;
        scattersLandedSoFar += scatterInThisCol;

        if (scatterInThisCol > 0) {
            playSynthesizedSFX('scatter'); 
        } else {
            playSynthesizedSFX('stop'); 
        }

        if (scattersLandedSoFar >= 3) {
            document.getElementById('slot-grid').classList.add('scatter-locked');
        }

        triggerColumnStopWithScatterCheck(colIndex + 1);
    }, colIndex === 0 ? (isTurboActive ? 100 : 550) : baseDelay);

    activeTimeoutsList.push(tID);
}

function stopSingleColumnVisual(colIndex) {
    const columnDOM = document.querySelector(`[data-col="${colIndex}"]`);
    if (!columnDOM || (!columnDOM.classList.contains('rolling') && !columnDOM.classList.contains('anticipation-roll'))) return; 

    columnDOM.classList.remove('rolling', 'anticipation-roll');
    columnDOM.classList.add('stopping');
    columnDOM.style.transform = 'translateY(-10px)'; 
    
    setTimeout(() => {
        columnDOM.style.transform = 'translateY(0)';
        if (colIndex === GRID_CONFIG.length - 1 && gameStateStatus === "ROLLING") {
            document.getElementById('slot-grid').classList.remove('scatter-locked');
            completeRollingPhase();
        }
    }, 100);
}

function triggerInstantSkipReel() {
    activeTimeoutsList.forEach(id => clearTimeout(id));
    activeTimeoutsList = [];
    playSynthesizedSFX('anticipation_stop');

    for (let col = 0; col < GRID_CONFIG.length; col++) {
        const columnDOM = document.querySelector(`[data-col="${col}"]`);
        if (columnDOM && (columnDOM.classList.contains('rolling') || columnDOM.classList.contains('anticipation-roll'))) {
            columnDOM.classList.remove('rolling', 'anticipation-roll');
            columnDOM.classList.add('stopping');
            columnDOM.style.transform = 'translateY(0)';
        }
    }
    document.getElementById('slot-grid').classList.remove('scatter-locked');
    playSynthesizedSFX('stop');
    completeRollingPhase();
}

function completeRollingPhase() {
    gameStateStatus = "EVALUATING"; 
    slotData = currentTargetResultStore;
    renderGridStatic();
    updateUI();
    setTimeout(() => { processGameCycle(); }, isTurboActive ? 100 : 350);
}

function evaluateWaysCombinations() {
    let winningCoords = [];
    let totalWinPayoutThisStep = 0;
    let allSymbols = [];
    
    slotData.forEach(column => {
        column.forEach(tile => { if (tile) allSymbols.push(tile.id); });
    });
    
    const baseSymbols = [...new Set(allSymbols)].filter(id => id !== SCATTER_ID && id !== WILD_ID);

    baseSymbols.forEach(symbolId => {
        let matchDataPerColumn = []; 
        for (let col = 0; col < GRID_CONFIG.length; col++) {
            let matchesInCol = [];
            for (let row = 0; row < slotData[col].length; row++) {
                const currentTile = slotData[col][row];
                if (currentTile && (currentTile.id === symbolId || currentTile.id === WILD_ID)) {
                    matchesInCol.push({ col, row, symbolId: currentTile.id });
                }
            }
            if (matchesInCol.length > 0) matchDataPerColumn.push(matchesInCol);
            else break; 
        }

        if (matchDataPerColumn.length >= 3) {
            let waysMultiplier = 1;
            let validComboCoords = [];
            matchDataPerColumn.forEach(columnMatches => {
                waysMultiplier *= columnMatches.length;
                validComboCoords = validComboCoords.concat(columnMatches);
            });

            const baseOddsTable = [10, 15, 20, 30, 40, 60, 80];
            const chosenOdds = baseOddsTable[symbolId] || 10;
            let comboPayout = (currentBet / 20) * chosenOdds * waysMultiplier;
            totalWinPayoutThisStep += comboPayout;
            winningCoords = winningCoords.concat(validComboCoords);
        }
    });

    let finalUniqueCoords = [];
    winningCoords.forEach(c => {
        if (!finalUniqueCoords.some(u => u.col === c.col && u.row === c.row)) finalUniqueCoords.push(c);
    });
    return { coords: finalUniqueCoords, payout: totalWinPayoutThisStep };
}

function checkScatters() {
    let scatterCount = 0;
    for (let col = 0; col < slotData.length; col++) {
        for (let row = 0; row < slotData[col].length; row++) {
            if (slotData[col][row] && slotData[col][row].id === SCATTER_ID) scatterCount++;
        }
    }
    return scatterCount;
}

function applyCascade(winningCoords, payoutThisStep) {
    const activeMultSet = isFreeSpinMode ? FREE_SPIN_MULTIPLIERS : NORMAL_MULTIPLIERS;
    const activeMultiplier = activeMultSet[currentMultiplierIndex];
    const finalStepPayout = payoutThisStep * activeMultiplier;

    currentWin += finalStepPayout;
    balance += finalStepPayout;
    
    syncBalanceToPortal(balance);

    if (isFreeSpinMode) totalFreeSpinWin += finalStepPayout;
    updateUI();

    let goldTilesPerColumn = {};
    winningCoords.forEach(coord => {
        const targetTile = slotData[coord.col][coord.row];
        if (targetTile && targetTile.goldFrame) {
            if (!goldTilesPerColumn[coord.col]) goldTilesPerColumn[coord.col] = [];
            goldTilesPerColumn[coord.col].push({ row: coord.row, id: targetTile.id });
        }
    });

    winningCoords.sort((a, b) => b.row - a.row);
    winningCoords.forEach(coord => { slotData[coord.col][coord.row] = null; });

    for (let colStr in goldTilesPerColumn) {
        let col = parseInt(colStr);
        let items = goldTilesPerColumn[col];
        let groupsByID = {};
        items.forEach(item => {
            if (!groupsByID[item.id]) groupsByID[item.id] = [];
            groupsByID[item.id].push(item.row);
        });
        for (let imgId in groupsByID) {
            let targetRows = groupsByID[imgId];
            let bestWildRow = Math.max(...targetRows); 
            slotData[col][bestWildRow] = { id: WILD_ID, goldFrame: false, isNew: false };
        }
    }

    for (let col = 0; col < slotData.length; col++) {
        let remainingTiles = slotData[col].filter(tile => tile !== null);
        remainingTiles.forEach(tile => { tile.isNew = false; });
        const missingCount = GRID_CONFIG[col] - remainingTiles.length;
        const newSymbols = [];
        for (let i = 0; i < missingCount; i++) {
            newSymbols.push(getRandomSymbol(col, newSymbols)); 
        }
        slotData[col] = [...newSymbols, ...remainingTiles];
    }

    if (currentMultiplierIndex < 3) currentMultiplierIndex++;
    renderGridStatic();

    for (let col = 0; col < slotData.length; col++) {
        slotData[col].forEach((tileObj, rowIndex) => {
            if (tileObj && tileObj.isNew) {
                const tileDOM = document.querySelector(`[data-col="${col}"] [data-row="${rowIndex}"]`);
                if (tileDOM) {
                    tileDOM.classList.add('new-tile-anim');
                    let duration = isTurboActive ? 0.14 : 0.42;
                    let delay = isTurboActive ? (col * 0.012) : (col * 0.04);
                    tileDOM.style.setProperty('--fall-duration', `${duration}s`);
                    tileDOM.style.animationDelay = `${delay}s`;
                }
            }
        });
    }
    updateUI();
    setTimeout(() => { processGameCycle(); }, isTurboActive ? 200 : 600); 
}

function processGameCycle() {
    const results = evaluateWaysCombinations();
    const gridDOM = document.getElementById('slot-grid');

    if (results.coords.length > 0) {
        gridDOM.classList.add('is-winning');
        playSynthesizedSFX('win'); 

        results.coords.forEach(coord => {
            const tileDOM = document.querySelector(`[data-col="${coord.col}"] [data-row="${coord.row}"]`);
            if (tileDOM) tileDOM.classList.add('pop');
        });

        setTimeout(() => {
            gridDOM.classList.remove('is-winning');
            applyCascade(results.coords, results.payout);
        }, isTurboActive ? 450 : 1200); 
        
    } else {
        gridDOM.classList.remove('is-winning');
        const scatterTotal = checkScatters();
        
        if (scatterTotal >= 3) {
            let calculatedFSGained = 10 + ((scatterTotal - 3) * 2);
            playSynthesizedSFX('fstrigger'); 

            if (!isFreeSpinMode) {
                isFreeSpinMode = true;
                freeSpinCount = calculatedFSGained; 
                totalFreeSpinWin = 0.00;
                gameStateStatus = "IDLE";
                updateUI();
                
                const giantX = document.getElementById('giant-x');
                if (giantX) giantX.innerText = "x";
                const giantNum = document.getElementById('giant-num');
                if (giantNum) giantNum.innerText = calculatedFSGained.toString();
                
                showCustomModal("BONUS TERPICU", `${scatterTotal} SCATTER! MEMASUKI ${calculatedFSGained} PUTARAN GRATIS!`, [
                    { text: "MULAI", type: "primary", action: () => { executeFreeSpinLoop(); } }
                ], true);
                return;
            } else {
                freeSpinCount += calculatedFSGained;
                updateUI();
                showCustomModal("RE-TRIGGER!", `${scatterTotal} SCATTER TAMBAHAN! MENDAPATKAN +${calculatedFSGained} SPIN GRATIS!`, [
                    { text: "LANJUT", type: "primary", action: () => { if (freeSpinCount > 0) executeFreeSpinLoop(); } }
                ], false);
                return;
            }
        }
        
        if (isFreeSpinMode) {
            freeSpinCount--;
            updateUI();
            if (freeSpinCount > 0) {
                setTimeout(() => { executeFreeSpinLoop(); }, isTurboActive ? 300 : 800);
            } else {
                gameStateStatus = "IDLE";
                playSynthesizedSFX('fstrigger'); 

                showCustomModal("SESI SELESAI", "TOTAL KEMENANGAN GRATIS ANDA:", [
                    { text: "AMBIL HADIAH", type: "primary", action: () => {
                        isFreeSpinMode = false;
                        updateUI();
                    }}
                ], true);

                const giantBox = document.getElementById('giant-spin-count');
                const giantNum = document.getElementById('giant-num');
                const giantX = document.getElementById('giant-x');
                const footerText = document.getElementById('modal-footer-tip');
                
                if (footerText) footerText.innerText = "LUAR BIASA! KEMENANGAN BESAR!";
                if (giantBox && giantNum) {
                    if (giantX) giantX.innerText = ""; 
                    giantNum.innerText = "Rp 0.00"; 
                    
                    let startValue = 0;
                    let endValue = totalFreeSpinWin;
                    let duration = 2000; 
                    let startTime = null;

                    function animateNumber(timestamp) {
                        if (!startTime) startTime = timestamp;
                        let progress = timestamp - startTime;
                        let run = Math.min(progress / duration, 1);
                        let currentCount = startValue + run * (endValue - startValue);
                        giantNum.innerText = "Rp " + formatKredit(currentCount);

                        if (run < 1) requestAnimationFrame(animateNumber);
                        else giantNum.innerText = "Rp " + formatKredit(endValue);
                    }
                    requestAnimationFrame(animateNumber);
                }
            }
            return;
        }

        if (isAutoActive && autoSpinCount > 0) {
            autoSpinCount--;
            updateUI();
            if (autoSpinCount > 0 && isAutoActive) {
                setTimeout(() => { if (isAutoActive) handleSpin(); }, isTurboActive ? 300 : 900);
                return;
            } else {
                isAutoActive = false;
            }
        }

        gameStateStatus = "IDLE";
        updateUI();
    }
}

function executeFreeSpinLoop() {
    gameStateStatus = "ROLLING";
    currentMultiplierIndex = 0; 
    currentWin = 0.00;
    scatterTrackerInCurrentSpin = 0; 
    updateUI();
    startTrueRollingProcess(() => {
        setTimeout(() => { processGameCycle(); }, isTurboActive ? 100 : 350);
    });
}

function handleSpin() {
    balance = loadBalanceFromPortal();

    if (balance < currentBet) {
        showCustomModal("SALDO HABIS", "Saldo Anda tidak mencukupi.", [{ text: "OK", type: "secondary", action: null }], false);
        isAutoActive = false; autoSpinCount = 0; gameStateStatus = "IDLE"; updateUI();
        return;
    }

    scatterTrackerInCurrentSpin = 0; 
    currentMultiplierIndex = 0;
    
    balance -= currentBet;
    currentWin = 0.00;

    syncBalanceToPortal(balance);

    startTrueRollingProcess(() => {
        setTimeout(() => { processGameCycle(); }, isTurboActive ? 100 : 350);
    });
}

// LOGIKA DUA TAHAP LOADING SCREEN
function startLoadingSequence() {
    const pragmaticLoader = document.getElementById('pragmatic-loader');
    const mahjongLoader = document.getElementById('mahjong-loader');
    const progressBar = document.getElementById('mahjong-bar');
    const progressPercent = document.getElementById('mahjong-percent');
    const getStartedBtn = document.getElementById('get-started-btn');

    initGame();

    setTimeout(() => {
        pragmaticLoader.classList.remove('active');
        mahjongLoader.classList.add('active');

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.floor(Math.random() * 5) + 2;
            
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);

                document.querySelector('.mahjong-progress-container').classList.add('hidden');
                progressPercent.classList.add('hidden');
                getStartedBtn.classList.remove('hidden');
            }

            progressBar.style.width = currentProgress + '%';
            progressPercent.innerText = currentProgress + '%';
        }, 60);

    }, 2500);
}

function startGameSession() {
    playSynthesizedSFX('click');
    const mahjongLoader = document.getElementById('mahjong-loader');
    mahjongLoader.classList.remove('active');
}

window.onload = startLoadingSequence;
