/* ==========================================================================
   vybot Cyber Cloud Dashboard & Landing - App Engine
   MEE6 Stili Gelişmiş Web Platformu
   ========================================================================== */

const DISCORD_CLIENT_ID = '1545157265831759903';
const BOT_KNOWN_GUILD_ID = '1536835757132751048'; // Botun halihazırda bulunduğu ana sunucu

// Global Durum Nesnesi
const state = {
  currentView: 'landing', // 'landing' | 'server-select' | 'dashboard'
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

// Demo Sunucular (Giriş yapılmadığında veya önizleme için tüm durumları test etmeyi sağlar)
const DEMO_SERVERS = [
  {
    id: '1536835757132751048',
    name: 'vybots Cyber HQ',
    icon: null,
    memberCount: 142,
    rolesCount: 18,
    channelsCount: 24,
    hasAdmin: true,
    botInGuild: true
  },
  {
    id: '998877665544332211',
    name: 'Neon Gaming Community',
    icon: null,
    memberCount: 890,
    rolesCount: 32,
    channelsCount: 45,
    hasAdmin: true,
    botInGuild: false // Bot henüz eklenmemiş -> "Sunucuya Ekle" butonu çıkar
  },
  {
    id: '112233445566778899',
    name: 'Global Chill Topluluğu (Yetkisiz)',
    icon: null,
    memberCount: 4500,
    rolesCount: 50,
    channelsCount: 80,
    hasAdmin: false, // Kullanıcının yönetici izni yok -> Kilitli, tıklayınca uyarı verir!
    botInGuild: true
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initViewRouting();
  initTabs();
  initGuildSearch();
  initSettingsListeners();
  initLiveRankCard();
  initMusicPlayer();
  initGroqAiTester();
});

/* ==========================================================================
   1. Görünüm (View) Yönlendirme ve Sayfa Geçişleri
   ========================================================================== */
function showView(viewName) {
  state.currentView = viewName;

  const views = {
    'landing': document.getElementById('view-landing'),
    'server-select': document.getElementById('view-server-select'),
    'dashboard': document.getElementById('view-dashboard')
  };

  // Tüm görünümleri pasif yap
  Object.values(views).forEach(el => {
    if (el) el.classList.remove('active');
  });

  // Hedef görünümü aktif et
  if (views[viewName]) {
    views[viewName].classList.add('active');
  }

  // Sayfayı en üste kaydır
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Eğer sunucu seçim ekranına geçildiyse ızgarayı yenile
  if (viewName === 'server-select') {
    renderGuildGrid();
  } else if (viewName === 'dashboard') {
    setTimeout(renderLiveRankCard, 100);
  }
}

function initViewRouting() {
  // Eğer kullanıcı daha önce giriş yapmışsa ve token varsa doğrudan sunucu seçimine yönlendirebilir veya tanıtımda kalabilir
  const heroSelectBtn = document.getElementById('heroBtnSelectServer');
  if (heroSelectBtn) {
    heroSelectBtn.addEventListener('click', () => showView('server-select'));
  }
}

/* ==========================================================================
   2. Discord OAuth2 Giriş ve Profil Yönetimi
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
      showView('server-select');
    }
  }

  // OAuth Linklerini Yapılandır
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=identify%20guilds`;

  ['loginBtn', 'landingLoginBtn', 'selectorLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = authUrl;
  });

  // Bot Davet Linklerini Yapılandır
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
  ['inviteBotBtn', 'heroInviteBotBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = inviteUrl;
  });

  if (state.token) {
    fetchDiscordData();
  } else {
    // Demo Verilerini Yükle
    loadDemoServers();
  }
}

async function fetchDiscordData() {
  try {
    // 1. Discord Kullanıcı Profilini Çek
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (!userRes.ok) throw new Error('Oturum süresi dolmuş.');
    state.user = await userRes.json();
    renderUserProfiles(state.user);

    // 2. Kullanıcının Tüm Sunucularını Çek
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (guildsRes.ok) {
      const allGuilds = await guildsRes.json();

      // Sunucuları analiz et: Yönetici (0x8) veya Sunucuyu Yönet (0x20) kontrolü
      state.guilds = allGuilds.map(g => {
        const perms = BigInt(g.permissions || '0');
        const hasAdmin = (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
        // Botun bu sunucuda olup olmadığını kontrol et
        const botInGuild = g.id === BOT_KNOWN_GUILD_ID;

        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          memberCount: g.approximate_member_count || 100,
          rolesCount: 15,
          channelsCount: 20,
          hasAdmin: hasAdmin,
          botInGuild: botInGuild
        };
      });

      // Sunucuları sırala: Önce yönetici oldukları, sonra botun olduğu
      state.guilds.sort((a, b) => {
        if (a.hasAdmin && !b.hasAdmin) return -1;
        if (!a.hasAdmin && b.hasAdmin) return 1;
        return 0;
      });

      renderGuildGrid();
    }
  } catch (err) {
    console.warn('[OAuth]:', err.message);
    localStorage.removeItem('vybot_discord_token');
    state.token = null;
    loadDemoServers();
  }
}

function renderUserProfiles(user) {
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const pillHtml = `
    <div class="auth-avatar"><img src="${avatarUrl}" alt="${escapeHtml(user.username)}"></div>
    <span class="auth-name">${escapeHtml(user.global_name || user.username)}</span>
    <i class="fa-solid fa-arrow-right-from-bracket logout-icon" title="Çıkış Yap" onclick="logout()"></i>
  `;

  ['authPill', 'landingAuthPill', 'selectorAuthPill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'flex';
      el.innerHTML = pillHtml;
    }
  });

  ['loginBtn', 'landingLoginBtn', 'selectorLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function loadDemoServers() {
  state.guilds = DEMO_SERVERS;
  state.selectedGuild = DEMO_SERVERS[0];
  updateServerDisplay(DEMO_SERVERS[0]);
  renderGuildGrid();
}

function logout() {
  localStorage.removeItem('vybot_discord_token');
  state.token = null;
  state.user = null;

  ['authPill', 'landingAuthPill', 'selectorAuthPill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  ['loginBtn', 'landingLoginBtn', 'selectorLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'inline-flex';
  });

  loadDemoServers();
  showView('landing');
  showToast('Oturum kapatıldı.', 'info');
}

/* ==========================================================================
   3. Sunucu Seçim Ekranı ve İzin Kontrolü (CRITICAL USER REQUEST)
   - Sadece yönetici izni varsa yönetilebilir.
   - Bot sunucuda yoksa "Sunucuya Ekle" butonu gösterilir.
   - Yönetici yetkisi yoksa direkt engellenir ve uyarı modalı açılır.
   ========================================================================== */
function renderGuildGrid(filterText = '') {
  const grid = document.getElementById('guildGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const list = state.guilds || DEMO_SERVERS;

  const filtered = list.filter(g => 
    g.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim);">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>Aradığınız isimde bir sunucu bulunamadı.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(guild => {
    const card = document.createElement('div');
    card.className = `guild-select-card ${!guild.hasAdmin ? 'no-permission' : ''}`;

    // Avatar
    let avatarHtml = '';
    if (guild.icon) {
      avatarHtml = `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="${escapeHtml(guild.name)}">`;
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarHtml = initials;
    }

    // Durum Rozeti ve Aksiyon Butonu
    let badgeHtml = '';
    let actionBtnHtml = '';

    if (!guild.hasAdmin) {
      // ⛔ Yönetici Yetkisi YOK -> Kilitli
      badgeHtml = `<span class="guild-badge-status denied"><i class="fa-solid fa-lock"></i> Yetkiniz Yok</span>`;
      actionBtnHtml = `
        <button class="btn-card-locked" onclick="showPermissionDeniedModal('${escapeHtml(guild.name)}'); event.stopPropagation();">
          <i class="fa-solid fa-ban"></i> Erişim Kilitli
        </button>
      `;

      // Kartın tamamına tıklanırsa da uyarı modalı ver
      card.addEventListener('click', () => {
        showPermissionDeniedModal(guild.name);
      });
    } else if (guild.botInGuild) {
      // ✅ Yetkili ve Bot Sunucuda Var -> Paneli Aç
      badgeHtml = `<span class="guild-badge-status active"><i class="fa-solid fa-check"></i> Bot Aktif</span>`;
      actionBtnHtml = `
        <button class="btn-card-manage" onclick="selectServer('${guild.id}'); event.stopPropagation();">
          <i class="fa-solid fa-sliders"></i> Yönet
        </button>
      `;

      card.addEventListener('click', () => {
        selectServer(guild.id);
      });
    } else {
      // ⚠️ Yetkili AMA Bot Sunucuda Yok -> Botu Ekle Butonu
      const addBotUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;
      badgeHtml = `<span class="guild-badge-status not-added"><i class="fa-solid fa-circle-question"></i> Kurulmadı</span>`;
      actionBtnHtml = `
        <a href="${addBotUrl}" target="_blank" class="btn-card-add" onclick="event.stopPropagation();">
          <i class="fa-solid fa-plus"></i> Sunucuya Ekle
        </a>
      `;

      card.addEventListener('click', () => {
        window.open(addBotUrl, '_blank');
      });
    }

    card.innerHTML = `
      <div class="guild-card-top">
        <div class="guild-icon-large">${avatarHtml}</div>
        <div class="guild-meta">
          <div class="guild-card-name" title="${escapeHtml(guild.name)}">${escapeHtml(guild.name)}</div>
          ${badgeHtml}
        </div>
      </div>
      <div class="guild-card-action">
        ${actionBtnHtml}
      </div>
    `;

    grid.appendChild(card);
  });
}

function initGuildSearch() {
  const input = document.getElementById('guildSearchInput');
  if (input) {
    input.addEventListener('input', (e) => {
      renderGuildGrid(e.target.value.trim());
    });
  }
}

function selectServer(guildId) {
  const guild = (state.guilds || DEMO_SERVERS).find(g => g.id === guildId);
  if (!guild) return;

  // İzin kontrolü
  if (!guild.hasAdmin) {
    showPermissionDeniedModal(guild.name);
    return;
  }

  // Eğer bot sunucuda yoksa davet et
  if (!guild.botInGuild) {
    const addBotUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;
    window.open(addBotUrl, '_blank');
    showToast('Bot kurulum penceresi açıldı. Botu ekledikten sonra sunucuyu yönetebilirsiniz.', 'info');
    return;
  }

  state.selectedGuild = guild;
  updateServerDisplay(guild);
  showView('dashboard');
  showToast(`⚡ ${guild.name} yönetim paneline bağlandı!`, 'success');
}

function updateServerDisplay(guild) {
  const nameEl = document.getElementById('sidebarServerName');
  const avatarEl = document.getElementById('sidebarServerAvatar');
  const heroGuildName = document.getElementById('heroGuildName');
  const breadcrumbServerName = document.getElementById('breadcrumbServerName');
  const statMembersCount = document.getElementById('statMembersCount');
  const statRolesCount = document.getElementById('statRolesCount');
  const statChannelsCount = document.getElementById('statChannelsCount');

  if (nameEl) nameEl.textContent = guild.name;
  if (heroGuildName) heroGuildName.textContent = guild.name;
  if (breadcrumbServerName) breadcrumbServerName.textContent = guild.name;

  if (statMembersCount) statMembersCount.textContent = guild.memberCount || 142;
  if (statRolesCount) statRolesCount.textContent = guild.rolesCount || 18;
  if (statChannelsCount) statChannelsCount.textContent = guild.channelsCount || 24;

  if (avatarEl) {
    if (guild.icon) {
      avatarEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="${escapeHtml(guild.name)}">`;
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.innerHTML = initials;
    }
  }

  renderLiveRankCard();
}

/* ==========================================================================
   4. Yetkisiz Erişim Uyarı Modalı (Alert Modal)
   ========================================================================== */
function showPermissionDeniedModal(guildName = 'Bu sunucu') {
  const modal = document.getElementById('alertModal');
  const desc = document.getElementById('alertModalDesc');

  if (desc) {
    desc.innerHTML = `
      <b>${escapeHtml(guildName)}</b> sunucusunu yönetmek için yeterli yetkiniz bulunmuyor.<br><br>
      vybot kontrol paneline erişebilmek için bu sunucuda <b>Yönetici (Administrator)</b> veya <b>Sunucuyu Yönet (Manage Server)</b> iznine sahip olmanız gerekmektedir. Güvenlik politikası nedeniyle yetkisiz işlem engellenmiştir.
    `;
  }

  if (modal) {
    modal.classList.add('active');
  }
}

function closeAlertModal() {
  const modal = document.getElementById('alertModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Modal dışına tıklandığında kapat
window.addEventListener('click', (e) => {
  const modal = document.getElementById('alertModal');
  if (e.target === modal) {
    closeAlertModal();
  }
});

/* ==========================================================================
   5. Dashboard Sekme Gezintisi (Sidebar Tabs)
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
        setTimeout(renderLiveRankCard, 60);
      }
    });
  });
}

/* ==========================================================================
   6. Ayarlar & Auto-Save Listener'ları
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
   7. MEE6 Canlı Rank Kartı Çizicisi (HTML5 Canvas)
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

  ctx.fillStyle = state.settings.rankColor || '#5865f2';
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
   8. Müzik Web Oynatıcı
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
        showToast(`🎶 "${escapeHtml(q)}" müzik kuyruğuna eklendi!`, 'success');
        songInput.value = '';
      }
    });
  }
}

/* ==========================================================================
   9. Groq AI Canlı Test Konsolu
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
   10. Yardımcı Fonksiyonlar & Toast Bildirimleri
   ========================================================================== */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'warning' ? 'warning' : ''}`;
  const icon = type === 'success' ? 'fa-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info');
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
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
