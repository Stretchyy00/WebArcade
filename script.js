/* ---------------- DATABASE GAME ---------------- */
const gamesDatabase = [
  { 
    title: 'Majok Ways 2', 
    vendor: 'Pragmatic Play', 
    category: 'Slot', 
    icon: 'assets/logo/majok.png', 
    tag: 'HOT', 
    tagClass: 'tag-hot', 
    rtp: '98.8%', 
    path: 'games/majok/index.html' 
  },
  { 
    title: 'Spaceman', 
    vendor: 'Pragmatic Play', 
    category: 'Slot', 
    icon: 'assets/logo/spaceman.png', 
    tag: 'TOP', 
    tagClass: 'tag-hot', 
    rtp: '97.5%', 
    path: 'games/spaceman/index.html' 
  },
  { 
    title: 'Megawil Live', 
    vendor: 'PG Soft', 
    category: 'Arcade', 
    icon: 'assets/logo/Megawil.png', 
    tag: 'Live', 
    tagClass: 'tag-hot', 
    rtp: '99.1%', 
    path: 'games/megawil/index.html' 
  },
  { 
    title: 'Coming Soon!!', 
    vendor: 'Habanero', 
    category: 'Arcade', 
    icon: 'assets/logo/kv5.png', 
    tag: '', 
    tagClass: '', 
    rtp: '0%', 
    path: 'games/coming-soon/index.html' 
  },
  { 
    title: 'Coming Soon!!', 
    vendor: 'Pragmatic Play', 
    category: 'Casino', 
    icon: 'assets/logo/baccarat.png', 
    tag: 'LIVE', 
    tagClass: 'tag-hot', 
    rtp: '0%', 
    path: 'games/coming-soon/index.html' 
  },
  { 
    title: 'Coming Soon!!', 
    vendor: 'PG Soft', 
    category: 'Casino', 
    icon: 'assets/logo/roulette.png', 
    tag: '', 
    tagClass: '', 
    rtp: '0%', 
    path: 'games/coming-soon/index.html' 
  }
];

let currentUser = null;
let jackpotValue = 1482930500;
let activeCategoryFilter = 'all';
let activeProviderFilter = 'all';

/* ---------------- NOTIFICATION SYSTEM ---------------- */
function showNotify(title, message, icon = '✨') {
  document.getElementById('notifyIcon').innerText = icon;
  document.getElementById('notifyTitle').innerText = title;
  document.getElementById('notifyDesc').innerText = message;
  document.getElementById('notifyOverlay').style.display = 'flex';
}

function closeNotify() {
  document.getElementById('notifyOverlay').style.display = 'none';
}

/* ---------------- CAROUSEL BANNER ---------------- */
const track = document.getElementById('carouselTrack');
const dots = document.querySelectorAll('.page-dot');
let currentIndex = 0;
let startX = 0;
let currentTranslate = 0;
let prevTranslate = 0;
let isDragging = false;

if (track) {
  track.addEventListener('touchstart', touchStart);
  track.addEventListener('touchmove', touchMove);
  track.addEventListener('touchend', touchEnd);
  track.addEventListener('mousedown', touchStart);
  track.addEventListener('mousemove', touchMove);
  track.addEventListener('mouseup', touchEnd);
  track.addEventListener('mouseleave', touchEnd);
}

function touchStart(e) {
  isDragging = true;
  startX = getPositionX(e);
  track.style.transition = 'none';
}

function touchMove(e) {
  if (!isDragging) return;
  const currentPosition = getPositionX(e);
  currentTranslate = prevTranslate + currentPosition - startX;
  track.style.transform = `translateX(${currentTranslate}px)`;
}

function touchEnd() {
  if (!isDragging) return;
  isDragging = false;
  const movedBy = currentTranslate - prevTranslate;

  if (movedBy < -50 && currentIndex < dots.length - 1) {
    currentIndex += 1;
  } else if (movedBy > 50 && currentIndex > 0) {
    currentIndex -= 1;
  }
  setPositionByIndex();
}

function getPositionX(e) {
  return e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
}

function setPositionByIndex() {
  currentTranslate = currentIndex * -track.offsetWidth;
  prevTranslate = currentTranslate;
  track.style.transition = 'transform 0.3s ease-out';
  track.style.transform = `translateX(${currentTranslate}px)`;
  
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentIndex);
  });
}

function goToSlide(index) {
  currentIndex = index;
  setPositionByIndex();
}

setInterval(() => {
  if (!isDragging && track) {
    currentIndex = (currentIndex + 1) % dots.length;
    setPositionByIndex();
  }
}, 4000);

/* ---------------- RENDER GAMES & FILTERS ---------------- */
function renderGames() {
  const container = document.getElementById('gamesGrid');
  if (!container) return;
  container.innerHTML = '';

  const filtered = gamesDatabase.filter(g => {
    const catMatch = activeCategoryFilter === 'all' || g.category === activeCategoryFilter;
    const provMatch = activeProviderFilter === 'all' || g.vendor === activeProviderFilter;
    return catMatch && provMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-secondary); font-size: 0.85rem;">Tidak ada permainan yang cocok.</div>`;
    return;
  }

  filtered.forEach(game => {
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-thumb">
        ${game.tag ? `<span class="tag-badge ${game.tagClass}">${game.tag}</span>` : ''}
        <img src="${game.icon}" alt="${game.title}" class="game-icon-img" onerror="this.onerror=null; this.src='https://via.placeholder.com/150/1e293b/ffffff?text=LOGO';">
      </div>
      <div class="slot-meta">
        <div class="slot-title">${game.title}</div>
        <div class="slot-vendor">${game.vendor}</div>
        <div class="rtp-tracker">
          <div class="rtp-info"><span>RTP</span><span style="color:#22c55e">${game.rtp}</span></div>
          <div class="rtp-progress"><div class="rtp-fill" style="width: ${game.rtp}"></div></div>
        </div>
      </div>
      <div class="slot-actions">
        <button class="btn-play" onclick="openGame('${game.path}')">Main</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function switchCategory(cat, element) {
  activeCategoryFilter = cat;
  
  // Highlight Sidebar Nav
  document.querySelectorAll('.sidebar-nav .nav-category-item').forEach(el => el.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }

  // Highlight Bottom Nav (Mobile)
  const bottomItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
  bottomItems.forEach(el => el.classList.remove('active'));
  if (cat === 'all' && bottomItems[0]) {
    bottomItems[0].classList.add('active');
  }

  renderGames();
}

function filterProvider(prov, element) {
  activeProviderFilter = prov;
  if (element) {
    document.querySelectorAll('.provider-scroll .provider-chip').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
  }
  renderGames();
}

/* ---------------- JACKPOT TICKER ---------------- */
setInterval(() => {
  jackpotValue += Math.floor(Math.random() * 2000) + 500;
  const jackpotEl = document.getElementById('jackpotVal');
  if (jackpotEl) {
    jackpotEl.innerText = `Rp ${jackpotValue.toLocaleString('id-ID')}`;
  }
}, 2000);

/* ---------------- AUTH & USER STATE ---------------- */
window.onload = function() {
  renderGames();
  const activeSession = localStorage.getItem('active_session');
  if (activeSession) {
    currentUser = activeSession;
    updateUserUI();
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) authOverlay.style.display = 'none';
  }
};

function openAuthModal() {
  if (!currentUser) {
    document.getElementById('authOverlay').style.display = 'flex';
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('regUser').value;
  const p = document.getElementById('regPass').value;
  let db = JSON.parse(localStorage.getItem('users_db')) || {};

  if (db[u]) {
    showNotify('Gagal Registrasi', 'Username sudah digunakan!', '⚠️');
    return;
  }

  db[u] = { password: p, balance: 50000 };
  localStorage.setItem('users_db', JSON.stringify(db));
  showNotify('Sukses', 'Pendaftaran Berhasil! Silakan Login.', '✅');
  switchAuthTab('login');
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUser').value;
  const p = document.getElementById('loginPass').value;
  let db = JSON.parse(localStorage.getItem('users_db')) || {};

  if (db[u] && db[u].password === p) {
    currentUser = u;
    localStorage.setItem('active_session', u);
    
    // 1. Dapatkan kontainer modal auth
    const authOverlay = document.getElementById('authOverlay');
    const modalCard = authOverlay.querySelector('.modal-card');

    // 2. Tampilkan Tampilan Pop-Up Animasi Sukses Login
    modalCard.className = 'success-login-card';
    modalCard.innerHTML = `
      <div class="success-checkmark-circle">
        <i class="fa-solid fa-check"></i>
      </div>
      <h3 style="color: var(--gold-light); font-family: 'Teko', sans-serif; font-size: 1.8rem; line-height: 1; margin-bottom: 4px;">LOGIN BERHASIL!</h3>
      <p style="color: var(--text-secondary); font-size: 0.82rem;">Selamat datang kembali, <strong style="color:#fff;">${u}</strong></p>
    `;

    // 3. Setelah jeda singkat animasi modal, tutup overlay & jalankan animasi highlight di UI Utama
    setTimeout(() => {
      // Fade out modal
      authOverlay.style.transition = 'opacity 0.3s ease';
      authOverlay.style.opacity = '0';

      setTimeout(() => {
        authOverlay.style.display = 'none';
        authOverlay.style.opacity = '1'; // Reset opacity
        
        // Kembalikan struktur awal modal auth agar siap jika dipakai lagi
        resetAuthModalStructure();

        // Update data pengguna di UI
        updateUserUI();

        // Trigger animasi highlight glowing pada balance badge header
        const balanceBadge = document.querySelector('.balance-badge');
        if (balanceBadge) {
          balanceBadge.classList.add('balance-highlight-anim');
          setTimeout(() => {
            balanceBadge.classList.remove('balance-highlight-anim');
          }, 1200);
        }

        // Tampilkan Toast Selamat Datang
        showToast(`Selamat datang kembali, ${u}!`, 'success');
      }, 300);

    }, 1200);

  } else {
    showNotify('Gagal Login', 'Username atau Password salah!', '❌');
  }
}

// Helper untuk Mengembalikan Struktur Modal Auth setelah diselimuti animasi sukses
function resetAuthModalStructure() {
  const authOverlay = document.getElementById('authOverlay');
  authOverlay.innerHTML = `
    <div class="modal-card">
      <div class="tab-switcher">
        <div class="tab-btn active" id="tabLogin" onclick="switchAuthTab('login')">LOGIN</div>
        <div class="tab-btn" id="tabRegister" onclick="switchAuthTab('register')">DAFTAR</div>
      </div>

      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="field-group">
          <label>Username</label>
          <input type="text" id="loginUser" class="input-control" placeholder="Masukkan username" required>
        </div>
        <div class="field-group">
          <label>Password</label>
          <input type="password" id="loginPass" class="input-control" placeholder="Masukkan password" required>
        </div>
        <button type="submit" class="btn-submit">MASUK</button>
      </form>

      <form id="registerForm" onsubmit="handleRegister(event)" style="display: none;">
        <div class="field-group">
          <label>Username Baru</label>
          <input type="text" id="regUser" class="input-control" placeholder="Buat username" required>
        </div>
        <div class="field-group">
          <label>Password Baru</label>
          <input type="password" id="regPass" class="input-control" placeholder="Buat password" required>
        </div>
        <button type="submit" class="btn-submit">BUAT AKUN VIP</button>
      </form>
    </div>
  `;
}

function updateUserUI() {
  let db = JSON.parse(localStorage.getItem('users_db')) || {};
  if (db[currentUser]) {
    document.getElementById('userBalance').innerText = `Rp ${db[currentUser].balance.toLocaleString('id-ID')}`;
  }
}

function handleLogout() {
  localStorage.removeItem('active_session');
  location.reload();
}

/* ---------------- PROFILE MODAL ---------------- */
function openProfileModal() {
  if (!currentUser) { openAuthModal(); return; }
  let db = JSON.parse(localStorage.getItem('users_db')) || {};
  document.getElementById('profUser').value = currentUser;
  document.getElementById('profBalance').value = `Rp ${db[currentUser].balance.toLocaleString('id-ID')}`;
  document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

/* ---------------- PROMO MODAL ---------------- */
function openPromoModal() {
  document.getElementById('promoModal').style.display = 'flex';
}

function closePromoModal() {
  document.getElementById('promoModal').style.display = 'none';
}

function claimPromo(title) {
  if (!currentUser) { closePromoModal(); openAuthModal(); return; }
  closePromoModal();
  showNotify('Promo Diklaim', `Selamat! ${title} berhasil diaktifkan pada akun Anda.`, '🎁');
}

/* ---------------- CONTEXTUAL LIVE CHAT ---------------- */
function openChatModal() {
  document.getElementById('chatModal').style.display = 'flex';
}

function closeChatModal() {
  document.getElementById('chatModal').style.display = 'none';
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const chatBox = document.getElementById('chatBox');
  
  const userMsg = document.createElement('div');
  userMsg.className = 'msg-bubble msg-user';
  userMsg.innerText = text;
  chatBox.appendChild(userMsg);

  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    const csMsg = document.createElement('div');
    csMsg.className = 'msg-bubble msg-cs';
    csMsg.innerText = getSmartResponse(text.toLowerCase());
    chatBox.appendChild(csMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 800);
}

function getSmartResponse(input) {
  if (input.includes('depo') || input.includes('isi') || input.includes('topup') || input.includes('bayar')) {
    return "Untuk melakukan Deposit, silakan klik tombol [⚡ DEPOSIT] di bagian navigasi bawah atau atas. Minimal deposit hanya Rp 10.000 via QRIS, Bank, atau E-Wallet.";
  }
  if (input.includes('wd') || input.includes('withdraw') || input.includes('tarik')) {
    return "Penarikan dana (Withdraw) dapat diproses melalui menu Akun Profil. Minimal penarikan saldo adalah Rp 50.000 dengan estimasi proses 1-3 menit.";
  }
  if (input.includes('promo') || input.includes('bonus') || input.includes('event')) {
    return "Bonus New Member 100% & Cashback Harian 0.8% tersedia di menu [Promosi]. Anda bisa mengklaimnya secara gratis!";
  }
  if (input.includes('gacor') || input.includes('rtp') || input.includes('menang')) {
    return "Game Pragmatic Play (Majok Spell) & PG Soft (Megawil Rush) saat ini memiliki pola RTP tertinggi mencapai 98.8%. Silakan dicoba Bossku!";
  }
  if (input.includes('halo') || input.includes('p') || input.includes('min')) {
    return "Halo! Ada yang bisa Customer Service VIP bantu mengenai kendala akun Anda?";
  }
  return "Terima kasih atas pertanyaannya. Tim CS VIP kami telah mencatat pesan Anda. Mohon pastikan akun Anda sudah terverifikasi untuk kemudahan transaksi.";
}

/* ---------------- FULLSCREEN GAME ENGINE ---------------- */
function openGame(url) {
  if (!currentUser) { 
    openAuthModal(); 
    return; 
  }
  
  const container = document.getElementById('fullscreenGameContainer');
  const iframe = document.getElementById('gameFrame');
  
  iframe.src = url;
  container.style.display = 'block';

  if (container.requestFullscreen) {
    container.requestFullscreen().catch(err => console.log(err));
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  }
}

function closeGame() {
  const container = document.getElementById('fullscreenGameContainer');
  const iframe = document.getElementById('gameFrame');
  
  iframe.src = '';
  container.style.display = 'none';

  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.log(err));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/* ---------------- NEW TOP UP SYSTEM FLOW ---------------- */
let currentTopUpData = {
  amount: 0,
  adminFee: 0,
  totalAmount: 0,
  method: '',
  trxId: '',
  timerInterval: null
};

function openTopUpModal() {
  if (!currentUser) { openAuthModal(); return; }
  
  document.getElementById('manualAmount').value = '';
  document.getElementById('stepInput').style.display = 'block';
  document.getElementById('stepSummary').style.display = 'none';
  document.getElementById('stepSuccess').style.display = 'none';
  
  document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.method-item').forEach(item => item.classList.remove('selected'));
  currentTopUpData.method = '';
  
  document.getElementById('topupModal').style.display = 'flex';
}

function closeTopUpModal() {
  if (currentTopUpData.timerInterval) {
    clearInterval(currentTopUpData.timerInterval);
  }
  document.getElementById('topupModal').style.display = 'none';
}

function selectQuickAmount(amount, element) {
  document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  document.getElementById('manualAmount').value = amount;
}

function selectPaymentMethod(element, methodName) {
  document.querySelectorAll('.method-item').forEach(item => item.classList.remove('selected'));
  element.classList.add('selected');
  currentTopUpData.method = methodName;
}

function processTopUpInput() {
  const rawVal = document.getElementById('manualAmount').value;
  const amount = parseInt(rawVal);

  if (!amount || amount < 10000) {
    showToast('Minimal top-up adalah Rp10.000.', 'warning');
    return;
  }

  if (!currentTopUpData.method) {
    showToast('Silakan pilih metode pembayaran terlebih dahulu.', 'warning');
    return;
  }

  showLoading(true);

  setTimeout(() => {
    showLoading(false);
    
    const adminFee = currentTopUpData.method.includes('Kartu') ? 2500 : 0;
    const total = amount + adminFee;
    const trxId = 'TRX-' + Math.floor(100000 + Math.random() * 900000);

    currentTopUpData.amount = amount;
    currentTopUpData.adminFee = adminFee;
    currentTopUpData.totalAmount = total;
    currentTopUpData.trxId = trxId;

    document.getElementById('summaryNominal').innerText = `Rp ${amount.toLocaleString('id-ID')}`;
    document.getElementById('summaryAdmin').innerText = `Rp ${adminFee.toLocaleString('id-ID')}`;
    document.getElementById('summaryTotal').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    document.getElementById('payCodeVal').innerText = `8830${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    document.getElementById('stepInput').style.display = 'none';
    document.getElementById('stepSummary').style.display = 'block';

    startPaymentTimer(120);
  }, 1000);
}

function startPaymentTimer(durationInSeconds) {
  let timer = durationInSeconds;
  const timerDisplay = document.getElementById('paymentTimer');

  if (currentTopUpData.timerInterval) clearInterval(currentTopUpData.timerInterval);

  currentTopUpData.timerInterval = setInterval(() => {
    let minutes = parseInt(timer / 60, 10);
    let seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    if (timerDisplay) timerDisplay.innerText = `${minutes}:${seconds}`;

    if (--timer < 0) {
      clearInterval(currentTopUpData.timerInterval);
      showToast("Waktu pembayaran habis. Silakan buat pesanan top-up baru.", "error");
      closeTopUpModal();
    }
  }, 1000);
}

function copyPayCode() {
  const code = document.getElementById('payCodeVal').innerText;
  navigator.clipboard.writeText(code);
  showToast("Kode pembayaran berhasil disalin!", "success");
}

function toggleAccordion(element) {
  const body = element.nextElementSibling;
  body.style.display = body.style.display === 'block' ? 'none' : 'block';
}

function simulateWebhookSuccess() {
  showLoading(true);

  setTimeout(() => {
    showLoading(false);
    if (currentTopUpData.timerInterval) clearInterval(currentTopUpData.timerInterval);

    let db = JSON.parse(localStorage.getItem('users_db')) || {};
    if (db[currentUser]) {
      db[currentUser].balance += currentTopUpData.amount;
      localStorage.setItem('users_db', JSON.stringify(db));
      updateUserUI();
    }

    document.getElementById('successAmount').innerText = `Rp ${currentTopUpData.amount.toLocaleString('id-ID')}`;
    document.getElementById('successFinalBalance').innerText = document.getElementById('userBalance').innerText;
    document.getElementById('successTrxId').innerText = currentTopUpData.trxId;

    document.getElementById('stepSummary').style.display = 'none';
    document.getElementById('stepSuccess').style.display = 'block';

    showToast(`Top Up Rp${currentTopUpData.amount.toLocaleString('id-ID')} berhasil! Saldo kamu telah diperbarui.`, "success");
  }, 1200);
}

/* ---------------- TOAST & LOADING SYSTEM ---------------- */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;

  toast.innerText = message;
  toast.className = `toast-banner toast-${type} show`;

  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 3500);
}

function showLoading(state) {
  const loading = document.getElementById('loadingOverlay');
  if (loading) {
    loading.style.display = state ? 'flex' : 'none';
  }
}