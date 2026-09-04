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
