// ==========================================
// WEB AUDIO API SYSTEM (EFEK SUARA SINTESIS)
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

const SFX = {
    // Suara putaran reel
    spinClick: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
    },

    // Suara saat reel berhenti satu per satu
    reelStop: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    },

    // Suara Menang Biasa / Medium Match
    winReward: () => {
        if (!audioCtx) return;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C tinggi
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + idx * 0.08);
            osc.stop(audioCtx.currentTime + idx * 0.08 + 0.2);
        });
    },

    // Suara Jackpot Besar
    jackpot: () => {
        if (!audioCtx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + idx * 0.1);
            osc.stop(audioCtx.currentTime + idx * 0.1 + 0.3);
        });
    },

    // Suara Scatter / Trigger Bonus
    scatterTrigger: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
};

// ==========================================
// VARIABLE & DEKLARASI GAME
// ==========================================
const simbolList = ['♦️', '🍋', '🍊', '🍇', '🍉', '🍒'];
let totalSaldo = 50000;
let sedangBerputar = false;

// Variable Mode Free Spin, Auto Spin & Waterfall
let sisaFreeSpin = 0;
let modeFreeSpinAktif = false;
let akumulasiMenangFreeSpin = 0;
let isAutoSpin = false;
let callbackSetelahModalTutup = null;
let waterfallIntervalId = null;

// DOM Elements
const cabinet = document.getElementById('slot-cabinet');
const saldoDisplay = document.getElementById('saldo-display');
const creditsLabel = document.getElementById('credits-label');
const taruhanInput = document.getElementById('taruhan-input');
const winDisplay = document.getElementById('win-display');
const message = document.getElementById('message');
const lightBar = document.getElementById('light-bar'); 
const coinsEffect = document.getElementById('coins-effect');
const spinBtn = document.getElementById('spin-btn');
const autoBtn = document.getElementById('auto-spin-btn');
const leverTrigger = document.getElementById('lever-trigger');

// Modal Elements
const bonusModal = document.getElementById('bonus-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalBadge = document.getElementById('modal-badge');
const modalBtn = document.getElementById('modal-btn');
const waterfallContainer = document.getElementById('waterfall-container');

const reelContainers = [
    document.querySelectorAll('.reel-container')[0],
    document.querySelectorAll('.reel-container')[1],
    document.querySelectorAll('.reel-container')[2],
    document.querySelectorAll('.reel-container')[3],
    document.querySelectorAll('.reel-container')[4]
];

const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
    document.getElementById('reel4'),
    document.getElementById('reel5')
];

// Event Listeners
document.getElementById('paytable-btn').addEventListener('click', togglePaytable);
document.getElementById('close-paytable').addEventListener('click', togglePaytable);
document.getElementById('overlay-bg').addEventListener('click', togglePaytable);
document.getElementById('bet-plus').addEventListener('click', () => ubahTaruhan(1000));
document.getElementById('bet-minus').addEventListener('click', () => ubahTaruhan(-1000));
document.getElementById('max-bet-btn').addEventListener('click', pasangMaxBet);
document.getElementById('auto-spin-btn').addEventListener('click', toggleAutoSpin);
document.getElementById('refill-btn').addEventListener('click', isiUlangSaldo);
document.getElementById('modal-btn').addEventListener('click', tutupModalBonus);
spinBtn.addEventListener('click', tarikTuas);
if (leverTrigger) leverTrigger.addEventListener('click', tarikTuas);

function togglePaytable() {
    initAudio();
    if (sedangBerputar) return;
    const paytable = document.getElementById('pop-paytable');
    const overlay = document.getElementById('overlay-bg');
    paytable.classList.toggle('active');
    overlay.classList.toggle('active');
}

function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function ubahTaruhan(jumlah) {
    initAudio();
    if (sedangBerputar || modeFreeSpinAktif) return;
    let currentBet = parseInt(taruhanInput.value) || 1000;
    let newBet = currentBet + jumlah;
    if (newBet >= 1000 && newBet <= 20000) {
        taruhanInput.value = newBet;
    }
}

function pasangMaxBet() {
    initAudio();
    if (sedangBerputar || modeFreeSpinAktif) return;
    let maxPossible = Math.min(20000, totalSaldo > 1000 ? totalSaldo : 20000);
    taruhanInput.value = Math.max(1000, maxPossible);
    ubahPesan("🔥 MAX BET SET!", '#ff9500');
}

function toggleAutoSpin() {
    initAudio();
    if (modeFreeSpinAktif) return;
    isAutoSpin = !isAutoSpin;
    if (isAutoSpin) {
        autoBtn.classList.add('active');
        autoBtn.innerText = "AUTO: ON";
        if (!sedangBerputar) tarikTuas();
    } else {
        autoBtn.classList.remove('active');
        autoBtn.innerText = "AUTO: OFF";
    }
}

function acakSimbol() {
    return simbolList[Math.floor(Math.random() * simbolList.length)];
}

function resetHighlightReel() {
    reelContainers.forEach(container => {
        container.classList.remove('winning-reel');
    });
}

function mulaiAirTerjunKoin(durasiMilidetik) {
    stopAirTerjunKoin();
    coinsEffect.classList.add('active');

    waterfallIntervalId = setInterval(() => {
        const koin = document.createElement('div');
        koin.classList.add('waterfall-coin');
        koin.innerText = '🪙';
        
        const lebarKontainer = waterfallContainer.offsetWidth || 300;
        const posisiAcakX = Math.floor(Math.random() * (lebarKontainer - 20));
        koin.style.position = 'absolute';
        koin.style.left = `${posisiAcakX}px`;
        koin.style.top = '0px';
        waterfallContainer.appendChild(koin);

        setTimeout(() => { koin.remove(); }, 600);
    }, 80);

    setTimeout(() => { stopAirTerjunKoin(); }, durasiMilidetik);
}

function stopAirTerjunKoin() {
    if (waterfallIntervalId) {
        clearInterval(waterfallIntervalId);
        waterfallIntervalId = null;
    }
    setTimeout(() => { coinsEffect.classList.remove('active'); }, 300);
}

function bukaModalBonus(icon, title, desc, badgeText, btnText, isWinTotal, aksiCallback) {
    modalIcon.innerText = icon;
    modalTitle.innerText = title;
    modalDesc.innerText = desc;
    modalBadge.innerText = badgeText;
    modalBtn.innerText = btnText;
    callbackSetelahModalTutup = aksiCallback;

    if (isWinTotal) {
        modalBadge.classList.add('win-total-style');
    } else {
        modalBadge.classList.remove('win-total-style');
    }

    bonusModal.classList.add('show');
}

function tutupModalBonus() {
    initAudio();
    bonusModal.classList.remove('show');
    if (callbackSetelahModalTutup) {
        const tempCallback = callbackSetelahModalTutup;
        callbackSetelahModalTutup = null;
        setTimeout(() => { tempCallback(); }, 300);
    } else {
        sedangBerputar = false;
    }
}

function animasiAngkaMeningkat(targetNilai, elemenBadge, durasi) {
    let waktuMulai = null;
    function langkahAnimasi(waktuSekarang) {
        if (!waktuMulai) waktuMulai = waktuSekarang;
        const progress = waktuSekarang - waktuMulai;
        const rasio = Math.min(progress / durasi, 1);
        const nilaiSekarang = Math.floor(rasio * targetNilai);
        
        elemenBadge.innerText = formatRupiah(nilaiSekarang);
        if (rasio < 1) requestAnimationFrame(langkahAnimasi);
        else elemenBadge.innerText = formatRupiah(targetNilai);
    }
    requestAnimationFrame(langkahAnimasi);
}

function tarikTuas() {
    initAudio();
    if (sedangBerputar) return;

    let taruhan = parseInt(taruhanInput.value) || 1000;

    if (!modeFreeSpinAktif) {
        if (taruhan < 1000) {
            ubahPesan("❌ TARUHAN MINIMAL Rp 1.000!", '#ff3b30');
            matikanAutoSpin();
            return;
        }
        if (taruhan > totalSaldo) {
            ubahPesan("❌ CREDITS NOT ENOUGH!", '#ff3b30');
            matikanAutoSpin();
            return;
        }
    }
    
    // Reset highlight kuning reel setiap kali spin baru dimulai
    resetHighlightReel();

    if (!modeFreeSpinAktif) {
        lightBar.classList.remove('jackpot-blink');
        lightBar.innerText = "🎰 ROLLING FRUITS 🎰";
        lightBar.style.color = "#e5c158";
        winDisplay.innerText = "Rp 0";
    }

    document.getElementById('pop-paytable').classList.remove('active');
    document.getElementById('overlay-bg').classList.remove('active');

    sedangBerputar = true;
    cabinet.classList.add('lever-pulled'); 

    reels.forEach(reel => reel.classList.remove('scatter-heartbeat'));

    if (modeFreeSpinAktif) {
        sisaFreeSpin--;
        updateOledDisplayBonus();
        ubahPesan(`🔥 FREE SPIN PLAYING! REMAINING: ${sisaFreeSpin} 🔥`, '#ff453a');
    } else {
        totalSaldo -= taruhan;
        saldoDisplay.innerText = formatRupiah(totalSaldo);
        ubahPesan("GOOD LUCK! SPINNING THE REELS...", '#e5c158');
    }

    reels.forEach(reel => reel.classList.add('spinning'));

    let slotGlowInterval = setInterval(() => {
        SFX.spinClick();
        reels.forEach(reel => {
            if(reel.classList.contains('spinning')) reel.innerText = acakSimbol();
        });
    }, 60);

    setTimeout(() => { cabinet.classList.remove('lever-pulled'); }, 500);

    let hasilAkhir = [];
    let counterSelesai = 0;
    
    reels.forEach((reel, indeks) => {
        setTimeout(() => {
            reel.classList.remove('spinning');
            SFX.reelStop();
            
            let hasilReel = acakSimbol();
            reel.innerText = hasilReel;
            hasilAkhir[indeks] = hasilReel;
            counterSelesai++;

            if (counterSelesai === reels.length) {
                clearInterval(slotGlowInterval);
                setTimeout(() => { hitungSkorAnywhereLineup(hasilAkhir, taruhan); }, 200);
            }
        }, 500 + (indeks * 200));
    });
}

function matikanAutoSpin() {
    isAutoSpin = false;
    autoBtn.classList.remove('active');
    autoBtn.innerText = "AUTO: OFF";
}

// FUNGSI PERHITUNGAN SKOR & UTAMA HIGHLIGHT REEL
function hitungSkorAnywhereLineup(hasil, taruhan) {
    resetHighlightReel();

    // 1. Cari urutan Scatter (♦️) terpanjang secara berturut-turut
    let maxScatterBerurutan = 0;
    let tempScatter = 0;
    let scatterStartIndex = -1;
    let scatterBestStart = -1;

    for (let i = 0; i < hasil.length; i++) {
        if (hasil[i] === '♦️') {
            if (tempScatter === 0) scatterStartIndex = i;
            tempScatter++;
            if (tempScatter > maxScatterBerurutan) {
                maxScatterBerurutan = tempScatter;
                scatterBestStart = scatterStartIndex;
            }
        } else {
            tempScatter = 0;
        }
    }

    // 2. Cari urutan simbol biasa terpanjang secara berturut-turut
    let hitunganMaksimal = 1;
    let simbolPemenang = hasil[0];
    let hitunganSekarang = 1;
    let tempStart = 0;
    let bestStart = 0;

    for (let i = 1; i < hasil.length; i++) {
        if (hasil[i] === hasil[i - 1]) {
            hitunganSekarang++;
        } else {
            if (hitunganSekarang > hitunganMaksimal) {
                hitunganMaksimal = hitunganSekarang;
                simbolPemenang = hasil[i - 1];
                bestStart = tempStart;
            }
            hitunganSekarang = 1; 
            tempStart = i;
        }
    }
    if (hitunganSekarang > hitunganMaksimal) {
        hitunganMaksimal = hitunganSekarang;
        simbolPemenang = hasil[hasil.length - 1];
        bestStart = tempStart;
    }

    let multiplier = 0;
    let teksHasil = "";
    let warnaTeks = "#fff";
    let dapatBonusSpinBaru = false;
    let jumlahBonusSpinDidapat = 0;

    // SCATTER HARUS BERURUTAN
    if (maxScatterBerurutan >= 2) {
        dapatBonusSpinBaru = true;
        jumlahBonusSpinDidapat = maxScatterBerurutan * 5;
        teksHasil = `♦️ ${maxScatterBerurutan} SCATTER BERURUTAN! BONUS FREE SPINS! ♦️`;
        warnaTeks = "#ff453a";

        // Tandai reel Scatter yang berurutan
        for (let k = scatterBestStart; k < scatterBestStart + maxScatterBerurutan; k++) {
            if (reelContainers[k]) reelContainers[k].classList.add('winning-reel');
        }
    }
    // REWARD BUAH & SIMBOL
    else if (hitunganMaksimal >= 2 && simbolPemenang !== '♦️') {
        const daftarMultiplier = {
            '🍉': { 2: 2,  3: 20, 4: 50, 5: 200 },
            '🍇': { 2: 2,  3: 12, 4: 30, 5: 100 },
            '🍊': { 2: 1.5,3: 8,  4: 20, 5: 50  },
            '🍋': { 2: 1,  3: 4,  4: 10, 5: 25  },
            '🍒': { 2: 1,  3: 5,  4: 15, 5: 35  }
        };

        if (daftarMultiplier[simbolPemenang]) {
            multiplier = daftarMultiplier[simbolPemenang][hitunganMaksimal] || 0;
            
            // Tandai reel pemenang berurutan dengan warna kuning
            for (let k = bestStart; k < bestStart + hitunganMaksimal; k++) {
                if (reelContainers[k]) reelContainers[k].classList.add('winning-reel');
            }

            if (hitunganMaksimal === 5) {
                teksHasil = `🏆 5x ${simbolPemenang} SUPREME JACKPOT! 🏆`;
                warnaTeks = "#ffd700";
            } else if (hitunganMaksimal === 4) {
                teksHasil = `🔥 4x ${simbolPemenang} QUAD MATCH!`;
            } else if (hitunganMaksimal === 3) {
                teksHasil = `✨ 3x ${simbolPemenang} TRIPLE MATCH!`;
            } else if (hitunganMaksimal === 2) {
                teksHasil = `👍 2x ${simbolPemenang} PAIR MATCH!`;
            }
        }
    } else {
        teksHasil = modeFreeSpinAktif ? "FREE SPIN BLANK • KEEP ROLLING" : "NO LINE MATCHED • TRY AGAIN";
        warnaTeks = modeFreeSpinAktif ? "#ffaa1d" : "#8c7647";
    }

    let totalMenangSekarang = taruhan * multiplier;

    // TRIGGER SCATTER
    if (dapatBonusSpinBaru) {
        SFX.scatterTrigger();
        sisaFreeSpin += jumlahBonusSpinDidapat;
        sedangBerputar = true; 

        hasil.forEach((simbol, idx) => {
            if (simbol === '♦️') reels[idx].classList.add('scatter-heartbeat');
        });

        lightBar.className = "win-light-bar freespin-mode-active";
        lightBar.innerText = "SCATTER LOCK-IN DETECTED";
        ubahPesan("SCATTER BOOM! HOLD ON YOUR HEARTBEAT...", "#ff3b30");

        setTimeout(() => {
            mulaiAirTerjunKoin(2500);
            bukaModalBonus(
                "♦️",
                "FREE SPINS FEATURE",
                `Luar biasa! Kombinasi ${maxScatterBerurutan} Scatter Berurutan terdeteksi!`,
                `+${jumlahBonusSpinDidapat} SPINS`,
                "START FREE SPINS",
                false,
                function() {
                    modeFreeSpinAktif = true;
                    lightBar.className = "win-light-bar freespin-mode-active";
                    lightBar.innerText = `🔥 BONUS FREE SPIN ACTIVE 🔥`;
                    updateOledDisplayBonus();
                    sedangBerputar = false;
                    tarikTuas();
                }
            );
        }, 2000); 
        return; 
    }

    // TRIGGER SFX WIN & JACKPOT
    if (totalMenangSekarang > 0) {
        if (hitunganMaksimal >= 4) {
            SFX.jackpot();
        } else {
            SFX.winReward();
        }

        winDisplay.innerText = formatRupiah(totalMenangSekarang);
        akumulasiMenangFreeSpin += totalMenangSekarang;
        if (!modeFreeSpinAktif) {
            totalSaldo += totalMenangSekarang;
            saldoDisplay.innerText = formatRupiah(totalSaldo);
            lightBar.className = "win-light-bar jackpot-blink";
            lightBar.innerText = "💰 WINNER COIN DROP 💰";
            mulaiAirTerjunKoin(2000);
        } else {
            mulaiAirTerjunKoin(1000); 
        }
        ubahPesan(`${teksHasil} (+${formatRupiah(totalMenangSekarang)})`, warnaTeks);
    } else {
        ubahPesan(teksHasil, warnaTeks);
    }

    setTimeout(() => {
        if (modeFreeSpinAktif) {
            if (sisaFreeSpin > 0) {
                sedangBerputar = false;
                tarikTuas(); 
            } else {
                sedangBerputar = true;
                totalSaldo += akumulasiMenangFreeSpin;

                SFX.jackpot();
                bukaModalBonus(
                    "🏆",
                    "🎉 BONUS TOTAL WIN 🎉",
                    "Selamat, seluruh putaran gratis Anda telah selesai dimainkan!",
                    "Rp 0", 
                    "COLLECT REWARDS",
                    true,
                    function() {
                        modeFreeSpinAktif = false;
                        lightBar.className = "win-light-bar";
                        lightBar.innerText = "🎰 BONUS FINISHED 🎰";
                        
                        creditsLabel.innerText = "BALANCE";
                        saldoDisplay.innerText = formatRupiah(totalSaldo);
                        saldoDisplay.className = "oled-value data-gold";
                        saldoDisplay.parentElement.classList.remove('bonus-active-border');
                        
                        ubahPesan(`BONUS ENDED. TOTAL ${formatRupiah(akumulasiMenangFreeSpin)} ADDED TO CREDITS!`, "#ffd700");
                        
                        akumulasiMenangFreeSpin = 0;
                        taruhanInput.disabled = false;
                        spinBtn.style.opacity = "1";
                        sedangBerputar = false;

                        if (isAutoSpin) setTimeout(tarikTuas, 500);
                    }
                );

                const badgeElement = document.getElementById('modal-badge');
                setTimeout(() => { animasiAngkaMeningkat(akumulasiMenangFreeSpin, badgeElement, 1500); }, 200);
            }
        } else {
            sedangBerputar = false;
            if (totalSaldo < 1000) {
                ubahPesan("💀 OUT OF CREDITS! TAP REFILL BUTTON", '#ff3b30');
                matikanAutoSpin();
            } else if (isAutoSpin) {
                setTimeout(tarikTuas, 600);
            }
        }
    }, 1000);
}

function updateOledDisplayBonus() {
    creditsLabel.innerText = "BONUS SPINS";
    saldoDisplay.innerText = `${sisaFreeSpin} LEFT`;
    saldoDisplay.className = "oled-value data-red";
    saldoDisplay.parentElement.classList.add('bonus-active-border');
    taruhanInput.disabled = true;
    spinBtn.style.opacity = "0.4";
}

function isiUlangSaldo() {
    initAudio();
    if (sedangBerputar || modeFreeSpinAktif) return;
    if (totalSaldo >= 1000) {
        ubahPesan("❌ MACHINE DETECTED ACTIVE CREDITS!", '#ff3b30');
        return;
    }
    totalSaldo = 50000;
    saldoDisplay.innerText = formatRupiah(totalSaldo);
    ubahPesan("💰 BANKROLL REFILL: Rp 50.000 ADDED", '#ffd700');
}

function ubahPesan(pesan, warna) {
    message.innerText = pesan;
    message.style.color = warna;
}