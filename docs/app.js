/* ANTI-BLANK: app.js çalıştı -> no-js sınıfını kaldır (app.js yüklenemezse içerik görünür kalır) */
try { document.documentElement.classList.remove('no-js'); } catch (e) {}

/* ==========================================================================
   vybot Cyber Cloud - MEE6 Pro Edition Engine (app.js)
   Telif: 2026 vybot Project | Production Quality
   ========================================================================== */

const DISCORD_CLIENT_ID = '1545157265831759903';
const BOT_PRIMARY_GUILD_ID = '1536835757132751048'; // Botun kurulu olduğu sunucu

// Uygulama Durumu
const state = {
  currentView: 'landing', // 'landing' | 'server-select' | 'dashboard'
  token: localStorage.getItem('vybot_discord_token') || null,
  user: null,
  guilds: [],
  selectedGuild: null,
  activeTab: 'plugins-home',
  plugins: {
    levelSystem: true,
    welcomeSystem: true,
    securitySystem: true,
    musicSystem: true,
    reactionRoles: true,
    aiChat: true
  }
};

// Demo Sunucular (Giriş yapılmadığında tüm durumların test edilmesini sağlar)
const DEMO_GUILDS = [
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
    id: '887766554433221100',
    name: 'Neon Gaming Topluluğu',
    icon: null,
    memberCount: 850,
    rolesCount: 25,
    channelsCount: 30,
    hasAdmin: true,
    botInGuild: false // Bot henüz yok -> "Sunucuya Ekle" butonu çıkar
  },
  {
    id: '991122334455667788',
    name: 'Büyük Topluluk Sohbeti (Yetkisiz)',
    icon: null,
    memberCount: 4200,
    rolesCount: 40,
    channelsCount: 65,
    hasAdmin: false, // Yönetici izni yok -> Kilitli, tıklayınca engeller!
    botInGuild: true
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initSidebarTabs();
  initGuildSearch();
  initCanvasRank();
  renderGuildGrid();
  showView('landing');
  switchTab('plugins-home');
  initLandingAnimations();
  startDiscordDemo();
  loadPanelSettings();
});

/* ==========================================================================
   1. Görünüm (View) Yönlendirme
   ========================================================================== */
function showView(viewName) {
  state.currentView = viewName;

  const views = {
    'landing': document.getElementById('view-landing'),
    'server-select': document.getElementById('view-server-select'),
    'dashboard': document.getElementById('view-dashboard')
  };

  Object.values(views).forEach(el => {
    if (el) el.classList.remove('active');
  });

  if (views[viewName]) {
    views[viewName].classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'server-select') {
    renderGuildGrid();
  } else if (viewName === 'dashboard') {
    setTimeout(renderRankCard, 100);
  }
}

function showLeaderboardDemo() {
  showView('dashboard');
  switchTab('leaderboard');
}

/* ==========================================================================
   2. Discord OAuth2 Giriş & Profil
   ========================================================================== */
function initAuth() {
  // URL Hash kontrolü (#access_token=...)
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      state.token = token;
      localStorage.setItem('vybot_discord_token', token);
      window.history.replaceState(null, null, window.location.pathname);
      showToast('Discord hesabınızla başarıyla giriş yapıldı!', 'success');
      showView('server-select');
    }
  }

  // OAuth Linkleri
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=identify%20guilds`;

  ['landingLoginBtn', 'selectorLoginBtn', 'dashLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = authUrl;
  });

  if (state.token) {
    fetchDiscordUserData();
  } else {
    loadDemoMode();
  }
}

async function fetchDiscordUserData() {
  try {
    // 1. Profil Al
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (!userRes.ok) throw new Error('Oturum süresi dolmuş');
    state.user = await userRes.json();
    renderUserPills(state.user);

    // 2. Sunucuları Al
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (guildsRes.ok) {
      const guilds = await guildsRes.json();
      state.guilds = guilds.map(g => {
        const perms = BigInt(g.permissions || '0');
        // Yönetici (0x8) veya Sunucuyu Yönet (0x20)
        const hasAdmin = (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
        const botInGuild = g.id === BOT_PRIMARY_GUILD_ID;

        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          memberCount: 150,
          rolesCount: 16,
          channelsCount: 22,
          hasAdmin: hasAdmin,
          botInGuild: botInGuild
        };
      });

      // Yetkili olunanları öne al
      state.guilds.sort((a, b) => (a.hasAdmin === b.hasAdmin ? 0 : a.hasAdmin ? -1 : 1));
      renderGuildGrid();
    }
  } catch (err) {
    console.warn('[Auth Error]:', err);
    localStorage.removeItem('vybot_discord_token');
    state.token = null;
    loadDemoMode();
  }
}

function renderUserPills(user) {
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const pillHtml = `
    <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-medium); padding: 4px 12px; border-radius: 20px;">
      <img src="${avatarUrl}" alt="${escapeHtml(user.username)}" style="width: 28px; height: 28px; border-radius: 50%;">
      <span style="font-weight: 700; font-size: 13.5px; color: #fff;">${escapeHtml(user.global_name || user.username)}</span>
      <i class="fa-solid fa-arrow-right-from-bracket" title="Çıkış Yap" onclick="logout()" style="cursor: pointer; color: var(--text-dim); margin-left: 6px;"></i>
    </div>
  `;

  ['landingUserPill', 'selectorUserPill', 'dashUserPill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'block';
      el.innerHTML = pillHtml;
    }
  });

  ['landingLoginBtn', 'selectorLoginBtn', 'dashLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function loadDemoMode() {
  state.guilds = DEMO_GUILDS;
  state.selectedGuild = DEMO_GUILDS[0];
  updateServerUI(DEMO_GUILDS[0]);
  renderGuildGrid();
}

function logout() {
  localStorage.removeItem('vybot_discord_token');
  state.token = null;
  state.user = null;

  ['landingUserPill', 'selectorUserPill', 'dashUserPill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  ['landingLoginBtn', 'selectorLoginBtn', 'dashLoginBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'inline-flex';
  });

  loadDemoMode();
  showView('landing');
  showToast('Oturum kapatıldı.', 'info');
}

/* ==========================================================================
   3. Sunucu Seçim Ekranı ve Yetki Kontrolü
   ========================================================================== */
function renderGuildGrid(filter = '') {
  const grid = document.getElementById('guildGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const list = state.guilds || DEMO_GUILDS;
  const filtered = list.filter(g => g.name.toLowerCase().includes(filter.toLowerCase()));

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim);">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>Aranan isimde bir sunucu bulunamadı.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(guild => {
    const card = document.createElement('div');
    card.className = `guild-card ${!guild.hasAdmin ? 'no-perm' : ''}`;

    let avatarHtml = '';
    if (guild.icon) {
      avatarHtml = `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="${escapeHtml(guild.name)}">`;
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarHtml = initials;
    }

    let badgeHtml = '';
    let btnHtml = '';

    if (!guild.hasAdmin) {
      // ⛔ Yönetici Değil -> Kilitli, tıklayınca engeller
      badgeHtml = `<span class="badge-tag badge-red"><i class="fa-solid fa-lock"></i> Yetkiniz Yok</span>`;
      btnHtml = `
        <button class="btn btn-secondary" style="width: 100%; opacity: 0.6;" onclick="showPermissionModal('${escapeHtml(guild.name)}'); event.stopPropagation();">
          <i class="fa-solid fa-ban"></i> Erişim Kilitli
        </button>
      `;
      card.addEventListener('click', () => showPermissionModal(guild.name));
    } else if (guild.botInGuild) {
      // ✅ Yetkili ve Bot Sunucuda -> Yönet
      badgeHtml = `<span class="badge-tag badge-green"><i class="fa-solid fa-check"></i> Bot Aktif</span>`;
      btnHtml = `
        <button class="btn btn-blurple" style="width: 100%;" onclick="selectServer('${guild.id}'); event.stopPropagation();">
          <i class="fa-solid fa-sliders"></i> Yönet
        </button>
      `;
      card.addEventListener('click', () => selectServer(guild.id));
    } else {
      // ⚠️ Yetkili AMA Bot Yok -> Sunucuya Ekle
      const addUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;
      badgeHtml = `<span class="badge-tag badge-yellow"><i class="fa-solid fa-circle-question"></i> Kurulmadı</span>`;
      btnHtml = `
        <a href="${addUrl}" target="_blank" class="btn btn-secondary" style="width: 100%; border-color: var(--accent-amber); color: var(--accent-amber);" onclick="event.stopPropagation();">
          <i class="fa-solid fa-plus"></i> Sunucuya Ekle
        </a>
      `;
      card.addEventListener('click', () => window.open(addUrl, '_blank'));
    }

    card.innerHTML = `
      <div class="guild-card-header">
        <div class="guild-avatar">${avatarHtml}</div>
        <div class="guild-info-wrap">
          <div class="guild-title" title="${escapeHtml(guild.name)}">${escapeHtml(guild.name)}</div>
          ${badgeHtml}
        </div>
      </div>
      <div style="margin-top: auto;">
        ${btnHtml}
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
  const guild = (state.guilds || DEMO_GUILDS).find(g => g.id === guildId);
  if (!guild) return;

  if (!guild.hasAdmin) {
    showPermissionModal(guild.name);
    return;
  }

  if (!guild.botInGuild) {
    const addUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;
    window.open(addUrl, '_blank');
    showToast('Bot kurulum penceresi açıldı.', 'info');
    return;
  }

  state.selectedGuild = guild;
  updateServerUI(guild);
  showView('dashboard');
  showToast(`⚡ ${guild.name} yönetim paneline bağlanıldı!`, 'success');
}

function updateServerUI(guild) {
  const nameEl = document.getElementById('sidebarServerName');
  const avatarEl = document.getElementById('sidebarServerAvatar');
  const topGuild = document.getElementById('topBreadcrumbGuild');
  const membersEl = document.getElementById('overviewMembersCount');
  const rolesEl = document.getElementById('overviewRolesCount');
  const channelsEl = document.getElementById('overviewChannelsCount');

  if (nameEl) nameEl.textContent = guild.name;
  if (topGuild) topGuild.textContent = guild.name;
  if (membersEl) membersEl.textContent = guild.memberCount || 142;
  if (rolesEl) rolesEl.textContent = guild.rolesCount || 18;
  if (channelsEl) channelsEl.textContent = guild.channelsCount || 24;

  if (avatarEl) {
    if (guild.icon) {
      avatarEl.innerHTML = `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="${escapeHtml(guild.name)}">`;
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.innerHTML = initials;
    }
  }

  renderRankCard();
}

/* ==========================================================================
   4. Yetkisiz Erişim Modalı
   ========================================================================== */
function showPermissionModal(guildName = 'Bu sunucu') {
  const modal = document.getElementById('permissionAlertModal');
  const msg = document.getElementById('alertModalGuildMsg');

  if (msg) {
    msg.innerHTML = `
      <b>${escapeHtml(guildName)}</b> sunucusunu yönetmek için yeterli yetkiniz bulunmuyor.<br><br>
      vybot kontrol paneline erişebilmek için bu sunucuda <b>Yönetici (Administrator)</b> veya <b>Sunucuyu Yönet (Manage Server)</b> iznine sahip olmanız şarttır.
    `;
  }

  if (modal) modal.classList.add('active');
}

function closePermissionModal() {
  const modal = document.getElementById('permissionAlertModal');
  if (modal) modal.classList.remove('active');
}

window.addEventListener('click', (e) => {
  const modal = document.getElementById('permissionAlertModal');
  if (e.target === modal) closePermissionModal();
});

/* ==========================================================================
   5. Dashboard Sekme Gezintisi (Sidebar Tabs)
   ========================================================================== */
function initSidebarTabs() {
  const items = document.querySelectorAll('.dash-menu-item[data-tab]');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Sidebar item active
  document.querySelectorAll('.dash-menu-item').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('data-tab') === tabId) el.classList.add('active');
  });

  // Tab panes active
  document.querySelectorAll('.module-tab-pane').forEach(el => {
    el.classList.remove('active');
  });

  const targetPane = document.getElementById(`pane-${tabId}`);
  if (targetPane) targetPane.classList.add('active');

  // Breadcrumb başlığı
  const breadcrumbTab = document.getElementById('topBreadcrumbTab');
  const activeItem = document.querySelector(`.dash-menu-item[data-tab="${tabId}"] span`);
  if (breadcrumbTab && activeItem) {
    breadcrumbTab.textContent = activeItem.textContent;
  }

  if (tabId === 'leveling') {
    setTimeout(renderRankCard, 50);
  }
}

function togglePlugin(pluginName, isEnabled) {
  state.plugins[pluginName] = isEnabled;
  showToast(`${pluginName} modülü ${isEnabled ? 'aktif edildi' : 'devre dışı bırakıldı'}!`, 'success');

  // Modül durumunu kalıcı yap ve bot'a gönder
  try { localStorage.setItem('vybot_plugins', JSON.stringify(state.plugins)); } catch (e) { /* yoksay */ }
  pushToBot({ plugins: state.plugins }, (ok, err) => {
    if (ok) showToast('Modül değişikliği BOTA GÖNDERİLDI! Sunucuda aktif oldu.', 'success');
    else if (err === 'no-config') showToast('Ayarlar lokal kaydedildi. Bot bağlantısı için ⚙️ Ayarlar → Bot Bağlantısı.', 'warning');
    else showToast('Lokal kaydedildi, gönderilemedi: ' + err, 'warning');
  });
}

/* ==========================================================================
   BOT HTTP API KÖPRÜSÜ — Site → Bot entegrasyonu
   ========================================================================== */
function getBotApiConfig() {
  let raw = '';
  try { raw = localStorage.getItem('vybot_bot_api') || ''; } catch (e) { /* yoksay */ }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function pushToBot(settings, cb) {
  const cfg = getBotApiConfig();
  if (!cfg || !cfg.url) {
    if (cb) cb(false, 'no-config');
    return;
  }

  const guildId = (state.selectedGuild && state.selectedGuild.id) || cfg.guildId || '';
  const body = { guild_id: guildId, ...settings };

  fetch(cfg.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (cfg.key || 'vybot-web-2026')
    },
    body: JSON.stringify(body)
  })
  .then(r => r.json().then(j => ({ ok: r.ok, j })))
  .then(({ ok, j }) => {
    if (ok && j.ok) {
      console.log('[BOT-KÖPRÜ] ✅ Ayarlar uygulandı:', j.appliedList || j);
      if (cb) cb(true, null);
    } else {
      console.warn('[BOT-KÖPRÜ] ❌ Hata:', j.error || 'bilinmeyen');
      if (cb) cb(false, j.error || 'api-error');
    }
  })
  .catch(err => {
    console.warn('[BOT-KÖPRÜ] ❌ Bağlantı hatası:', err.message);
    if (cb) cb(false, err.message);
  });
}

function testBotConnection(cb) {
  const cfg = getBotApiConfig();
  if (!cfg || !cfg.url) { if (cb) cb(false, 'no-config'); return; }

  fetch(cfg.url.replace(/\/api\/.*$/, '') + '/api/health?key=' + encodeURIComponent(cfg.key || 'vybot-web-2026'))
  .then(r => r.json().then(j => ({ ok: r.ok, j })))
  .then(({ ok, j }) => {
    if (ok && j.ok) {
      if (cb) cb(true, `${j.bot} | ${j.guilds} sunucu | ${Math.floor(j.uptime)}s uptime`);
    } else {
      if (cb) cb(false, j.error || 'health-fail');
    }
  })
  .catch(err => { if (cb) cb(false, err.message); });
}

function saveBotApiConfig(url, key, guildId) {
  try {
    localStorage.setItem('vybot_bot_api', JSON.stringify({ url, key, guildId }));
    return true;
  } catch (e) { return false; }
}

/* ==========================================================================
   6. Hoş Geldin Mesajı Canlı Önizlemesi
   ========================================================================== */
function updateWelcomePreview() {
  const titleInput = document.getElementById('welcomeTitleInput');
  const descInput = document.getElementById('welcomeDescInput');
  const previewTitle = document.getElementById('previewEmbedTitle');
  const previewDesc = document.getElementById('previewEmbedDesc');

  const serverName = state.selectedGuild ? state.selectedGuild.name : 'vybots Cyber HQ';

  if (previewTitle && titleInput) {
    previewTitle.textContent = titleInput.value || 'Sunucumuza Hoş Geldin!';
  }

  if (previewDesc && descInput) {
    let text = descInput.value || 'Selam {user}, {server} ailesine hoş geldin!';
    text = text.replace(/{user}/g, '<span style="color: var(--blurple); background: rgba(88,101,242,0.15); padding: 1px 4px; border-radius: 3px;">@YeniKullanıcı</span>');
    text = text.replace(/{server}/g, `<b>${escapeHtml(serverName)}</b>`);
    previewDesc.innerHTML = text;
  }
}

/* ==========================================================================
   7. MEE6 Canlı HTML5 Canvas Rank Kartı Tasarımcısı
   ========================================================================== */
function initCanvasRank() {
  renderRankCard();
}

function renderRankCard() {
  const canvas = document.getElementById('rankCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const colorInput = document.getElementById('rankThemeColor');
  const themeColor = colorInput ? colorInput.value : '#5865f2';

  // Arka Plan
  ctx.fillStyle = '#1e1f22';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 20);
  ctx.fill();

  // İç Kart Yüzeyi
  ctx.fillStyle = '#2b2d31';
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 16);
  ctx.fill();

  // Sol Avatar
  const avX = 110, avY = h / 2, avR = 54;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = themeColor;
  ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);

  // Avatar Harfi
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initial = state.user ? state.user.username[0].toUpperCase() : 'V';
  ctx.fillText(initial, avX, avY);
  ctx.restore();

  // Avatar Çerçevesi
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  // İsim & Tag
  const rx = 196;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Inter, sans-serif';
  const name = state.user ? (state.user.global_name || state.user.username) : 'Vynex';
  ctx.fillText(name.substring(0, 16), rx, 76);

  // Seviye & Sıralama (Sağ Üst)
  ctx.textAlign = 'right';
  ctx.fillStyle = themeColor;
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillText('SEVİYE 42', w - 40, 76);

  ctx.fillStyle = '#949ba4';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText('#1 SIRALAMA', w - 40, 104);

  // XP Yazısı
  ctx.textAlign = 'left';
  ctx.fillStyle = '#dbdee1';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('3,450 / 5,000 XP (70%)', rx, 114);

  // XP Çubuğu Arka Planı
  ctx.fillStyle = '#14161d';
  ctx.beginPath();
  ctx.roundRect(rx, 130, w - rx - 40, 18, 9);
  ctx.fill();

  // XP Çubuğu Dolu Alan
  const barW = (w - rx - 40) * 0.7;
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.roundRect(rx, 130, barW, 18, 9);
  ctx.fill();
}

/* ==========================================================================
   8. Web Müzik Oynatıcısı & Kuyruk
   ========================================================================== */
let isPlayingWeb = true;

function toggleWebPlay() {
  isPlayingWeb = !isPlayingWeb;
  const btn = document.getElementById('webPlayBtn');
  if (btn) {
    btn.innerHTML = isPlayingWeb ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
  }
  showToast(isPlayingWeb ? 'Müzik oynatılıyor' : 'Müzik duraklatıldı', 'info');
}

function addSongToQueue() {
  const input = document.getElementById('musicSearchInput');
  const container = document.getElementById('musicQueueContainer');
  if (!input || !container) return;

  const q = input.value.trim();
  if (!q) return;

  const item = document.createElement('div');
  item.style.cssText = 'background: #14161d; padding: 14px 18px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; animation: toastIn 0.25s ease;';
  item.innerHTML = `
    <div style="display: flex; align-items: center; gap: 14px;">
      <span style="font-weight: 800; color: var(--text-dim);">#</span>
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 14px;">${escapeHtml(q)}</div>
        <div style="font-size: 12px; color: var(--text-dim);">Ekleyen: Siz • Sırada</div>
      </div>
    </div>
    <span class="badge-tag badge-blurple">Sırada</span>
  `;
  container.appendChild(item);
  input.value = '';
  showToast(`"${q}" müzik kuyruğuna eklendi!`, 'success');
}

/* ==========================================================================
   9. Akıllı Sohbetçi Asistan Test Konsolu
   ========================================================================== */
function sendAiMessage() {
  const input = document.getElementById('aiTestInput');
  const chatBox = document.getElementById('aiChatBox');
  if (!input || !chatBox) return;

  const msg = input.value.trim();
  if (!msg) return;

  chatBox.innerHTML += `
    <div style="margin-bottom: 10px; text-align: right;">
      <span style="background: var(--blurple); color: #fff; padding: 6px 12px; border-radius: 10px; font-size: 13.5px; display: inline-block;">${escapeHtml(msg)}</span>
    </div>
  `;
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    chatBox.innerHTML += `
      <div style="margin-bottom: 10px; text-align: left;">
        <span style="background: #2b2f3d; color: #fff; padding: 6px 12px; border-radius: 10px; font-size: 13.5px; display: inline-block;">
          🤖 <b>vybot:</b> Harika bir soru! Sunucunuzda müzik çalmak için ses kanalına geçip <code>/çal [şarkı]</code> yazabilir veya bu panelden istediğiniz şarkıyı aratıp kuyruğa ekleyebilirsiniz!
        </span>
      </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 250);
}

/* ==========================================================================
   10. Toast Bildirim Yöneticisi
   ========================================================================== */
function showToast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type === 'warning' || type === 'danger' ? 'warn' : ''}`;
  const icon = type === 'success' ? 'fa-check' : (type === 'info' ? 'fa-circle-info' : 'fa-triangle-exclamation');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

/* ==========================================================================
   11. Landing Animasyon Motoru (Scroll Reveal + 3D Tilt)
   ========================================================================== */
function initLandingAnimations() {
  // 1) Scroll reveal (IntersectionObserver)
  const revealEls = document.querySelectorAll('.reveal, .reveal-3d');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    // Eski tarayıcı fallback: her şey görünür
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // 2) 3D tilt (yalnızca fare olan cihazlarda)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const heroMockup = document.getElementById('heroMockup');
    if (heroMockup) setupTilt(heroMockup, 8);

    document.querySelectorAll('.feature-box').forEach(box => setupTilt(box, 6, true));
    document.querySelectorAll('.command-cat').forEach(card => setupTilt(card, 5, true));
    const discordWindow = document.querySelector('.discord-window');
    if (discordWindow) setupTilt(discordWindow, 5);
  }
}

function setupTilt(el, maxDeg, withGlare) {
  if (!el) return;
  el.classList.add('tilt-active');
  el.style.position = el.style.position || 'relative';

  if (withGlare) {
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    el.appendChild(glare);
  }

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 2 * maxDeg;
    const rotX = (0.5 - py) * 2 * maxDeg;

    el.classList.remove('tilt-return');
    el.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-3px)`;

    if (withGlare) {
      el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
    }
  });

  el.addEventListener('mouseleave', () => {
    el.classList.add('tilt-return');
    el.style.transform = '';
  });
}

/* ==========================================================================
   12. Discord Canlı Sohbet Demo (animasyonlu mesaj akışı)
   ========================================================================== */
const discordDemoScript = [
  {
    user: 'Vynex', color: '#5865f2', avatarBg: 'linear-gradient(135deg, #5865f2, #eb459e)',
    text: '<code>/rank</code>',
    embed: { title: '🏆 Vynex • Rank Kartı', desc: 'Seviye 42 • Toplam 8,420 XP<br>Sıralama: <b>#1</b> • Bu hafta +1,240 XP', bar: 64 }
  },
  {
    user: 'AyseK', color: '#23a55a', avatarBg: 'linear-gradient(135deg, #23a55a, #00b0f4)',
    text: '<code>/çal Cyberpunk 2077 OST</code>',
    embed: { title: '🎵 Şimdi Çalıyor', desc: '<b>Cyberpunk 2077 — I Really Want to Stay At Your House</b><br>Rosa Walton • 320kbps • Sesli kanal: 🎧 Looby FM', bar: 82 }
  },
  {
    user: 'ModeratörAli', color: '#f0b232', avatarBg: 'linear-gradient(135deg, #f0b232, #ed4245)',
    text: '<code>/guvenlik durum</code>',
    embed: { title: '🛡️ Siber Kalkan Raporu', desc: 'Anti-Nuke: <b>Aktif</b> • Engellenen link: <b>14</b> • Spam susturma: <b>3</b><br>Son 24 saatte 0 ihlal.', bar: 100 }
  },
  {
    user: 'YeniUye', color: '#eb459e', avatarBg: 'linear-gradient(135deg, #eb459e, #f0b232)',
    text: 'Sunucuya yeni katıldım, rol nasıl alırım?',
    embed: { title: '👋 Hoş Geldin!', desc: '<b>#rol-alma</b> panelinden oyun & bildirim rollerini tek tıkla seçebilirsin. İyi eğlenceler!', bar: 48 }
  }
];

let discordDemoIndex = 0;
let discordDemoTimer = null;

function startDiscordDemo() {
  const chatBox = document.getElementById('discordChatDemo');
  const typing = document.getElementById('discordTyping');
  const demoSection = document.getElementById('discord-demo');
  if (!chatBox || !typing || !demoSection) return;

  const postMessage = () => {
    const msg = discordDemoScript[discordDemoIndex % discordDemoScript.length];
    discordDemoIndex++;

    const el = document.createElement('div');
    el.className = 'dc-msg';
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isBotEmbed = !!msg.embed;

    el.innerHTML = `
      <div class="dc-avatar" style="background: ${msg.avatarBg};">${escapeHtml(msg.user.charAt(0))}</div>
      <div class="dc-body">
        <div class="dc-head">
          <span class="dc-name" style="color: ${msg.color};">${escapeHtml(msg.user)}</span>
          <span class="dc-time">Bugün ${time}</span>
        </div>
        <div class="dc-text">${msg.text}</div>
        ${isBotEmbed ? `
        <div class="dc-embed">
          <div class="dc-embed-title">${msg.embed.title}</div>
          <div class="dc-embed-desc">${msg.embed.desc}</div>
          <div class="dc-embed-bar"><div class="dc-embed-fill"></div></div>
        </div>` : ''}
      </div>`;

    chatBox.appendChild(el);

    // Embed progress bar animasyonu
    if (isBotEmbed) {
      setTimeout(() => {
        const fill = el.querySelector('.dc-embed-fill');
        if (fill) fill.style.width = msg.embed.bar + '%';
      }, 350);
    }

    // En fazla 4 mesaj görünür kalsın
    while (chatBox.children.length > 4) {
      chatBox.removeChild(chatBox.firstChild);
    }

    // Kullanıcı mesajından sonra bot "yazıyor..." göstergesi
    if (!isBotEmbed) {
      typing.classList.add('show');
      setTimeout(() => typing.classList.remove('show'), 1600);
    }
  };

  const scheduleNext = (delay) => {
    discordDemoTimer = setTimeout(() => {
      postMessage();
      scheduleNext(3400 + Math.random() * 1200);
    }, delay);
  };

  // Demo yalnızca bölüm görünürken akar (performans)
  const demoIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!discordDemoTimer) scheduleNext(400);
      } else if (discordDemoTimer) {
        clearTimeout(discordDemoTimer);
        discordDemoTimer = null;
      }
    });
  }, { threshold: 0.2 });

  demoIO.observe(demoSection);
}

/* ==========================================================================
   13. Panel Ayar Yöneticisi (sunucu bazlı localStorage kalıcılığı)
   ========================================================================== */
function getPanelScope(mod) {
  const guildName = state.selectedGuild ? state.selectedGuild.name : 'default';
  return `vybot_panel_${guildName}_${mod}`;
}

/* ---- Bot HTTP API Köprüsü: site ayarlarını doğrudan bot'a gönderir ---- */

function updateConnBadge(ok) {
  const badge = document.getElementById('connStatusBadge');
  if (!badge) return;
  if (ok) {
    badge.textContent = 'Bağlı ✓';
    badge.style.borderColor = 'var(--accent-green)';
    badge.style.color = 'var(--accent-green)';
  } else {
    badge.textContent = 'Bağlı Değil';
    badge.style.borderColor = 'var(--accent-red)';
    badge.style.color = 'var(--accent-red)';
  }
}

function saveConnection() {
  const urlInput = document.getElementById('botApiUrlInput');
  const keyInput = document.getElementById('botApiKeyInput');
  const guildInput = document.getElementById('botGuildIdInput');
  if (!urlInput) return;

  const url = urlInput.value.trim();
  const key = keyInput ? keyInput.value.trim() : '';
  const guildId = guildInput ? guildInput.value.trim() : '';

  if (!saveBotApiConfig(url, key, guildId)) {
    showToast('Kaydedilemedi (localStorage erişimi yok).', 'warning');
    return;
  }

  updateConnBadge(!!url);
  if (url) {
    // Kaydettikten sonra hemen test et
    testBotConnection((ok, info) => {
      if (ok) showToast('Bot bağlantısı kaydedildi ve TEST BAŞARILI! → ' + info, 'success');
      else showToast('Kaydedildi ama test BAŞARISIZ: ' + info + ' — URL/key kontrol et.', 'warning');
    });
  } else {
    showToast('Bağlantı bilgileri temizlendi.', 'info');
  }
}

function loadConnectionPanel() {
  let raw = '';
  try { raw = localStorage.getItem('vybot_bot_api') || ''; } catch (e) { return; }
  if (!raw) return;
  try {
    const cfg = JSON.parse(raw);
    const urlInput = document.getElementById('botApiUrlInput');
    const keyInput = document.getElementById('botApiKeyInput');
    const guildInput = document.getElementById('botGuildIdInput');
    if (urlInput) urlInput.value = cfg.url || '';
    if (keyInput) keyInput.value = cfg.key || '';
    if (guildInput) guildInput.value = cfg.guildId || '';
    if (cfg.url) updateConnBadge(true);
  } catch (e) { /* yoksay */ }
}

function testConnection() {
  testBotConnection((ok, info) => {
    if (ok) {
      showToast('Bot bağlantısı BAŞARILI! → ' + info, 'success');
      updateConnBadge(true);
    } else {
      showToast('Bağlantı hatası: ' + info + ' — Bot ÇALIŞIYOR mu? API port açık mı?', 'warning');
      updateConnBadge(false);
    }
  });
}

function collectAllPanelSettings() {
  const guildName = state.selectedGuild ? state.selectedGuild.name : 'vybots Cyber HQ';
  const mods = {};

  document.querySelectorAll('[data-settings]').forEach(block => {
    const mod = block.dataset.settings;
    if (mod === 'connection') return;
    const modData = {};
    block.querySelectorAll('[data-set]').forEach(inp => {
      modData[inp.dataset.set] = inp.type === 'checkbox' ? inp.checked : inp.value;
    });
    mods[mod] = modData;
  });

  mods.plugins = { ...(state.plugins || {}) };

  return {
    version: 2,
    updated_at: new Date().toISOString(),
    guilds: { [guildName]: mods }
  };
}

function publishSettingsToGitHub(callback) {
  const token = getConnectionToken();
  if (!token) { if (callback) callback(false, 'no-token'); return; }

  const payload = JSON.stringify(collectAllPanelSettings(), null, 2);
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_SETTINGS_PATH}`;
  const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' };

  // Önce mevcut dosyanın sha'sını al (güncelleme için gerekli)
  fetch(api, { headers: headers })
    .then(r => {
      if (r.status === 404) return { sha: null };
      if (!r.ok) throw new Error('GitHub ' + r.status);
      return r.json();
    })
    .then(file => fetch(api, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'web-panel: sunucu ayar güncellemesi (otomatik)',
        content: btoa(unescape(encodeURIComponent(payload))),
        sha: file.sha || undefined
      })
    }))
    .then(r => {
      if (!r.ok) throw new Error('GitHub ' + r.status);
      if (callback) callback(true);
    })
    .catch(err => { if (callback) callback(false, err.message); });
}

function savePanelSettings(mod) {
  const block = document.querySelector(`[data-settings="${mod}"]`);
  if (!block) return;

  const data = {};
  block.querySelectorAll('[data-set]').forEach(inp => {
    data[inp.dataset.set] = inp.type === 'checkbox' ? inp.checked : inp.value;
  });

  try {
    localStorage.setItem(getPanelScope(mod), JSON.stringify(data));
  } catch (e) { /* localStorage kapalı olabilir */ }

  if (mod === 'leaderboard') renderLeaderboard();

  // Canlı köprü: ayarları botun okuduğu depo dosyasına gönder
  pushToBot({ [mod]: data }, (ok, err) => {
    if (ok) showToast('Ayarlar kaydedildi ve BOTA GÖNDERİLDI! Sunucuda aktif.', 'success');
    else if (err === 'no-config') showToast('Ayarlar lokal kaydedildi. Bot bağlantısı için ⚙️ Bot Bağlantısı panelini doldurun.', 'warning');
    else showToast('Ayarlar lokal kaydedildi ancak gönderilemedi: ' + err, 'warning');
    if (mod !== 'connection') updateConnBadge(ok);
  });
}

function resetPanelSettings(mod) {
  try {
    localStorage.removeItem(getPanelScope(mod));
  } catch (e) { /* yoksay */ }

  const block = document.querySelector(`[data-settings="${mod}"]`);
  if (block) {
    block.querySelectorAll('select[data-set]').forEach(sel => { sel.selectedIndex = 0; });
    block.querySelectorAll('input[type="text"][data-set], input[type="number"][data-set]').forEach(inp => {
      inp.value = inp.defaultValue;
    });
    block.querySelectorAll('input[type="checkbox"][data-set]').forEach(inp => {
      inp.checked = inp.defaultChecked;
    });
  }

  showToast('Ayarlar varsayılan değerlere döndürüldü.', 'info');
  if (mod === 'leaderboard') renderLeaderboard();
}

function loadPanelSettings() {
  document.querySelectorAll('[data-settings]').forEach(block => {
    const mod = block.dataset.settings;
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(getPanelScope(mod)));
    } catch (e) { return; }
    if (!data) return;

    block.querySelectorAll('[data-set]').forEach(inp => {
      if (!(inp.dataset.set in data)) return;
      if (inp.type === 'checkbox') inp.checked = !!data[inp.dataset.set];
      else inp.value = data[inp.dataset.set];
    });
  });

  loadConnectionPanel();
  renderLeaderboard();
}

/* ==========================================================================
   14. Dinamik Liderlik Tablosu (panel ayarlarına gerçek zamanlı tepki verir)
   ========================================================================== */
const leaderboardDemoData = [
  { name: 'Vynex', tag: '#0001', initial: 'V', level: 42, msg: 5840, xp: 48250, xpMax: 50000 },
  { name: 'Moderatör Ali', tag: '#1234', initial: 'M', level: 38, msg: 4120, xp: 38100, xpMax: 42000 },
  { name: 'EfeGamer', tag: '#5678', initial: 'E', level: 31, msg: 3050, xp: 28400, xpMax: 32000 },
  { name: 'KorkusuzSavaşçı', tag: '#9012', initial: 'K', level: 27, msg: 2410, xp: 21000, xpMax: 26000 },
  { name: 'ZeynepDev', tag: '#3456', initial: 'Z', level: 24, msg: 2100, xp: 18400, xpMax: 22000 },
  { name: 'PixelAvcısı', tag: '#7890', initial: 'P', level: 21, msg: 1780, xp: 15200, xpMax: 19000 },
  { name: 'GölgeNinja', tag: '#2345', initial: 'G', level: 18, msg: 1420, xp: 12100, xpMax: 15000 },
  { name: 'AyseK', tag: '#6789', initial: 'A', level: 15, msg: 1100, xp: 9400, xpMax: 12000 },
  { name: 'MertBaykus', tag: '#0123', initial: 'M', level: 12, msg: 860, xp: 7100, xpMax: 9500 },
  { name: 'NovaStar', tag: '#4567', initial: 'N', level: 9, msg: 620, xp: 4800, xpMax: 7000 }
];

const rankColors = ['#f0b232', '#cbd5e1', '#cd7f32'];
const rankBadge = ['badge-yellow', 'badge-blurple', 'badge-blurple'];

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardTbody');
  if (!tbody) return;

  const block = document.querySelector('[data-settings="leaderboard"]');
  const getVal = (key, def) => {
    const el = block ? block.querySelector(`[data-set="${key}"]`) : null;
    if (!el) return def;
    return el.type === 'checkbox' ? el.checked : el.value;
  };

  const period = getVal('period', 'all');
  const topN = parseInt(getVal('topN', '10'), 10) || 10;
  const showXp = getVal('showXp', true) !== false;
  const anonymous = getVal('anonymous', false) === true;

  // Dönem çarpanı: demo verisini gerçekçi ölçekler
  const factor = period === 'week' ? 0.18 : (period === 'month' ? 0.45 : 1);

  const rows = leaderboardDemoData
    .map(u => ({ ...u, msg: Math.max(1, Math.round(u.msg * factor)), xp: Math.max(1, Math.round(u.xp * factor)), xpMax: Math.max(10, Math.round(u.xpMax * factor)) }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, topN);

  tbody.innerHTML = rows.map((u, i) => {
    const rankColor = i < 3 ? rankColors[i] : 'var(--text-muted)';
    const badgeClass = i < 3 ? rankBadge[i] : 'badge-blurple';
    const displayName = anonymous ? `Gizli Üye #${i + 1}` : u.name;
    const pct = Math.min(100, Math.round((u.xp / u.xpMax) * 100));

    return `
      <tr class="leaderboard-row">
        <td><b style="color: ${rankColor};">#${i + 1}</b></td>
        <td>
          <div class="lb-user-cell">
            <div class="lb-user-avatar" style="border: 2px solid ${rankColor === 'var(--text-muted)' ? 'var(--border-medium)' : rankColor};">${u.initial}</div>
            <div>
              <div style="font-weight: 700; color: #fff;">${displayName}</div>
              <div style="font-size: 11px; color: var(--text-dim);">${anonymous ? 'anonim' : u.tag}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag ${badgeClass}">Seviye ${u.level}</span></td>
        <td><b>${u.msg.toLocaleString('tr-TR')}</b></td>
        <td style="width: 200px;">
          ${showXp ? `
          <div style="font-size: 11px; margin-bottom: 4px; color: var(--text-dim);">${u.xp.toLocaleString('tr-TR')} / ${u.xpMax.toLocaleString('tr-TR')} XP</div>
          <div style="height: 6px; background: #111318; border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${i === 0 ? 'var(--accent-amber)' : 'var(--blurple)'}; transition: width 0.6s ease;"></div>
          </div>` : '<span style="font-size: 12px; color: var(--text-dim);">—</span>'}
        </td>
      </tr>`;
  }).join('');
}
