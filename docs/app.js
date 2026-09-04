/* ==========================================================================
   vybot Cyber Cloud Dashboard - App Engine
   ========================================================================== */

const DISCORD_CLIENT_ID = '1545157265831759903';

// Sunucu & Kullanıcı Durumu
const state = {
  token: localStorage.getItem('vybot_discord_token') || null,
  user: null,
  guilds: [],
  selectedGuild: null,
  activeTab: 'overview',
  settings: {
    antiNuke: true,
    antiLink: true,
    antiSwear: true,
    antiSpam: true,
    levelSystem: true,
    xpMin: 15,
    xpMax: 25,
    xpCooldown: 60,
    levelUpMsg: '🎉 Tebrikler {player}! **Seviye {level}** seviyesine ulaştın!',
    rankColor: '#5865f2',
    groqModel: 'openai/gpt-oss-20b',
    aiPersonality: 'Sen vybot Discord asistanısın. Kısa, samimi ve net Türkçe yanıt ver.'
  }
};

// Demo Sunucu Verisi (Giriş yapılmadığında anında çalışan sunucu)
const DEMO_SERVER = {
  id: '1536835757132751048',
  name: 'vybots Cyber HQ',
  icon: null,
  memberCount: 142,
  rolesCount: 18,
  channelsCount: 24,
  botOnline: true
};

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initSettingsListeners();
  initLiveRankCard();
  initMusicPlayer();
  initGroqAiTester();
});

/* ==========================================================================
   1. Discord OAuth2 Giriş ve Profil Yönetimi
   ========================================================================== */
function initAuth() {
  // URL Hash'ten Token Çıkar (#access_token=...)
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      state.token = token;
      localStorage.setItem('vybot_discord_token', token);
      window.history.replaceState(null, null, window.location.pathname);
      showToast('🎉 Discord ile başarıyla giriş yapıldı!', 'success');
    }
  }

  const authPill = document.getElementById('authPill');
  const loginBtn = document.getElementById('loginBtn');
  const serverSelectCol = document.getElementById('serverSelectCol');

  // OAuth Giriş Linkini Ayarla
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=identify%20guilds`;
  if (loginBtn) loginBtn.href = authUrl;

  const inviteBtn = document.getElementById('inviteBotBtn');
  if (inviteBtn) {
    inviteBtn.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
  }

  if (state.token) {
    fetchDiscordData();
  } else {
    // Demo Modunu Yükle
    loadDemoMode();
  }
}

async function fetchDiscordData() {
  try {
    // 1. Kullanıcı Profilini Çek
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (!userRes.ok) throw new Error('Token süresi dolmuş');
    state.user = await userRes.json();
    renderUserProfile(state.user);

    // 2. Kullanıcının Sunucularını Çek
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (guildsRes.ok) {
      const allGuilds = await guildsRes.json();
      // Yalnızca Yönetici (0x8) veya Sunucuyu Yönet (0x20) yetkisi olanları filtrele
      state.guilds = allGuilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n || (BigInt(g.permissions) & 0x20n) === 0x20n);
      renderGuildList(state.guilds);
    }
  } catch (err) {
    console.warn('[OAuth]:', err.message);
    localStorage.removeItem('vybot_discord_token');
    state.token = null;
    loadDemoMode();
  }
}

function renderUserProfile(user) {
  const authPill = document.getElementById('authPill');
  const loginBtn = document.getElementById('loginBtn');

  if (loginBtn) loginBtn.style.display = 'none';
  if (authPill) {
    authPill.style.display = 'flex';
    const avatarUrl = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    authPill.innerHTML = `
      <div class="auth-avatar">
        <img src="${avatarUrl}" alt="${user.username}">
      </div>
      <span class="auth-name">${user.global_name || user.username}</span>
      <i class="fa-solid fa-arrow-right-from-bracket logout-icon" title="Çıkış Yap" onclick="logout()"></i>
    `;
  }
}

function renderGuildList(guilds) {
  if (guilds.length > 0) {
    state.selectedGuild = guilds[0];
    updateServerDisplay(guilds[0]);
  } else {
    loadDemoMode();
  }
}

function loadDemoMode() {
  state.selectedGuild = DEMO_SERVER;
  updateServerDisplay(DEMO_SERVER);

  const authPill = document.getElementById('authPill');
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.style.display = 'flex';
  if (authPill) authPill.style.display = 'none';
}

function updateServerDisplay(guild) {
  const nameEl = document.getElementById('sidebarServerName');
  const avatarEl = document.getElementById('sidebarServerAvatar');
  const heroGuildName = document.getElementById('heroGuildName');

  if (nameEl) nameEl.textContent = guild.name;
  if (heroGuildName) heroGuildName.textContent = guild.name;

  if (avatarEl) {
    if (guild.icon) {
      avatarEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="${guild.name}">`;
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.innerHTML = initials;
    }
  }

  renderLiveRankCard();
}

function logout() {
  localStorage.removeItem('vybot_discord_token');
  state.token = null;
  state.user = null;
  loadDemoMode();
  showToast('Oturum kapatıldı, Demo Moduna geçildi.', 'info');
}

/* ==========================================================================
   2. Sekme (Tab) Gezintisi
   ========================================================================== */
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      item.classList.add('active');
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) targetEl.classList.add('active');

      state.activeTab = targetTab;
      const headerTitle = document.getElementById('headerTitle');
      if (headerTitle) {
        headerTitle.textContent = item.querySelector('span') ? item.querySelector('span').textContent : 'Kontrol Paneli';
      }

      if (targetTab === 'leveling') {
        setTimeout(renderLiveRankCard, 50);
      }
    });
  });
}

/* ==========================================================================
   3. Ayarlar & Auto-Save
   ========================================================================== */
function initSettingsListeners() {
  // Toggle switches
  const toggles = [
    { id: 'toggleAntiNuke', key: 'antiNuke' },
    { id: 'toggleAntiLink', key: 'antiLink' },
    { id: 'toggleAntiSwear', key: 'antiSwear' },
    { id: 'toggleAntiSpam', key: 'antiSpam' },
    { id: 'toggleLevelSystem', key: 'levelSystem' }
  ];

  toggles.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = state.settings[key];
      el.addEventListener('change', () => {
        state.settings[key] = el.checked;
        showToast(`${key} ayarı güncellendi!`, 'success');
      });
    }
  });

  // Range Sliders
  const sliders = [
    { id: 'sliderXpMin', valId: 'valXpMin', key: 'xpMin', unit: ' XP' },
    { id: 'sliderXpMax', valId: 'valXpMax', key: 'xpMax', unit: ' XP' },
    { id: 'sliderCooldown', valId: 'valCooldown', key: 'xpCooldown', unit: ' sn' }
  ];

  sliders.forEach(({ id, valId, key, unit }) => {
    const input = document.getElementById(id);
    const valBadge = document.getElementById(valId);
    if (input && valBadge) {
      input.value = state.settings[key];
      valBadge.textContent = input.value + unit;

      input.addEventListener('input', () => {
        valBadge.textContent = input.value + unit;
        state.settings[key] = parseInt(input.value);
      });
    }
  });
}

/* ==========================================================================
   4. MEE6 Canlı Rank Kartı Çizicisi (HTML5 Canvas)
   ========================================================================== */
function initLiveRankCard() {
  const cardColorInput = document.getElementById('rankCardColor');
  if (cardColorInput) {
    cardColorInput.addEventListener('input', (e) => {
      state.settings.rankColor = e.target.value;
      renderLiveRankCard();
    });
  }
}

function renderLiveRankCard() {
  const canvas = document.getElementById('rankCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Arka Plan
  ctx.fillStyle = '#1e1f22';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 20);
  ctx.fill();

  // Glass Surface
  ctx.fillStyle = '#2b2d31';
  ctx.beginPath();
  ctx.roundRect(15, 15, w - 30, h - 30, 16);
  ctx.fill();

  // Sol Avatar Çemberi
  const avX = 110, avY = h / 2, avR = 55;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#5865f2';
  ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);

  // Avatar Harfi
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameInitial = state.user ? state.user.username[0].toUpperCase() : 'V';
  ctx.fillText(nameInitial, avX, avY);
  ctx.restore();

  // Avatar Çerçevesi
  ctx.strokeStyle = state.settings.rankColor || '#5865f2';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  // Sağ Bilgiler
  const rx = 200;
  ctx.textAlign = 'left';

  // İsim
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Outfit, sans-serif';
  const displayName = state.user ? (state.user.global_name || state.user.username) : 'Vynex';
  ctx.fillText(displayName.substring(0, 15), rx, 75);

  // Seviye & Rank Rozetleri
  ctx.textAlign = 'right';
  ctx.fillStyle = state.settings.rankColor || '#5865f2';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillText('SEVİYE 42', w - 40, 75);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillText('#1 SIRALAMA', w - 40, 105);

  // XP Sayacı
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Outfit, sans-serif';
  ctx.fillText('3,450 / 5,000 XP (70%)', rx, 115);

  // İlerleme Çubuğu Arka Planı
  ctx.fillStyle = '#18191c';
  ctx.beginPath();
  ctx.roundRect(rx, 130, w - rx - 40, 18, 9);
  ctx.fill();

  // İlerleme Çubuğu Dolu Alanı
  const fullW = w - rx - 40;
  ctx.fillStyle = state.settings.rankColor || '#5865f2';
  ctx.beginPath();
  ctx.roundRect(rx, 130, fullW * 0.7, 18, 9);
  ctx.fill();
}

/* ==========================================================================
   5. Müzik Web Oynatıcı
   ========================================================================== */
function initMusicPlayer() {
  const playBtn = document.getElementById('playerPlayBtn');
  let isPlaying = true;

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      showToast(isPlaying ? 'Müzik oynatılıyor' : 'Müzik duraklatıldı', 'info');
    });
  }

  const addSongBtn = document.getElementById('addSongBtn');
  const songInput = document.getElementById('songSearchInput');
  if (addSongBtn && songInput) {
    addSongBtn.addEventListener('click', () => {
      const q = songInput.value.trim();
      if (q) {
        showToast(`🎶 "${q}" müzik kuyruğuna eklendi!`, 'success');
        songInput.value = '';
      }
    });
  }
}

/* ==========================================================================
   6. Groq AI Canlı Test Konsolu
   ========================================================================== */
function initGroqAiTester() {
  const askBtn = document.getElementById('aiSendBtn');
  const input = document.getElementById('aiPromptInput');
  const chatBox = document.getElementById('aiChatHistory');

  if (askBtn && input && chatBox) {
    const handleSend = () => {
      const msg = input.value.trim();
      if (!msg) return;

      // Kullanıcı mesajı
      chatBox.innerHTML += `
        <div style="margin-bottom: 12px; text-align: right;">
          <span style="background: #5865f2; color: #fff; padding: 8px 14px; border-radius: 12px; display: inline-block; font-size: 13.5px;">${escapeHtml(msg)}</span>
        </div>
      `;
      input.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;

      // vybot Groq Yanıtı (Simüle / Hızlı LPU Çıktısı)
      setTimeout(() => {
        chatBox.innerHTML += `
          <div style="margin-bottom: 12px; text-align: left;">
            <span style="background: #2b2d31; color: #f8fafc; padding: 8px 14px; border-radius: 12px; display: inline-block; font-size: 13.5px; border: 1px solid rgba(88,101,242,0.3);">
              🤖 <b>vybot:</b> Harika bir soru! OpenAI GPT-OSS-20B modeli üzerinden ultra düşük tokenle çalışıyorum. Sunucundaki müzik, seviye ve güvenliği 7/24 kesintisiz yönetebilirim!
            </span>
          </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
      }, 300);
    };

    askBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
}

/* ==========================================================================
   Yardımcı Fonksiyonlar & Toast
   ========================================================================== */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? 'fa-check' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
