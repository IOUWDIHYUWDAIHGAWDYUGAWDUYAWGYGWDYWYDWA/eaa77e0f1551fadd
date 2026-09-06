const config = new Proxy(
  {},
  {
    get(_target, prop) {
      const live = window.VYBOT_CONFIG || {};
      if (prop === 'clientId') return live.clientId || '1545157265831759903';
      if (prop === 'oauthRedirectUri') {
        return live.oauthRedirectUri || new URL('.', window.location.href).href;
      }
      if (prop === 'oauthScopes') return live.oauthScopes || 'identify guilds';
      return live[prop];
    },
  }
);
const loginButton = document.getElementById('dash-login');
const logoutButton = document.getElementById('dash-logout');
const feedback = document.getElementById('dash-auth-feedback');
const session = document.getElementById('dash-session');
const userName = document.getElementById('dash-user-name');
const guildsElement = document.getElementById('dash-guilds');
const settings = document.getElementById('dash-settings');
const settingsTitle = document.getElementById('dash-settings-title');
const backButton = document.getElementById('dash-back');
const panelServerName = document.getElementById('panel-server-name');
const categoryButtons = document.querySelectorAll('[data-category]');
const settingsLead = document.getElementById('dash-settings-lead');
const settingsPanel = document.getElementById('settings-panel');
const stats = document.getElementById('server-stats');
const childGuildId = new URLSearchParams(window.location.search).get('guild');
const childMode = Boolean(childGuildId);
const stateKey = 'vybot_oauth_state';
const verifierKey = 'vybot_oauth_verifier';
const tokenKey = 'vybot_token';
let accessToken = '';
let installedGuildIds = new Set();
let panelApiBase = '';

/* ---------- KALICI OTURUM (localStorage) ---------- */
function saveToken(data) {
  if (!data || !data.access_token) return;
  const store = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + 604800 * 1000,
  };
  localStorage.setItem(tokenKey, JSON.stringify(store));
}

function loadToken() {
  try {
    const raw = localStorage.getItem(tokenKey);
    if (!raw) return null;
    const store = JSON.parse(raw);
    if (!store || !store.access_token) return null;
    if (store.expires_at && store.expires_at < Date.now()) {
      if (store.refresh_token) return refreshToken(store.refresh_token);
      localStorage.removeItem(tokenKey);
      return null;
    }
    return store.access_token;
  } catch (_) {
    localStorage.removeItem(tokenKey);
    return null;
  }
}

async function refreshToken(refreshTokenValue) {
  try {
    const body = new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
    });
    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    saveToken(data);
    return data.access_token;
  } catch (_) {
    localStorage.removeItem(tokenKey);
    return null;
  }
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

function setFeedback(message, type = '') {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = type;
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function base64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  return base64Url(await crypto.subtle.digest('SHA-256', data));
}

function redirectUri() {
  return config.oauthRedirectUri || `${window.location.origin}${window.location.pathname}`;
}

function startLogin() {
  if (!config.clientId) {
    setFeedback('OAuth callback is not configured for this deployment.', 'error');
    return;
  }

  Promise.resolve()
    .then(async () => {
      const state = randomString(32);
      const verifier = randomString(48);
      sessionStorage.setItem(stateKey, state);
      sessionStorage.setItem(verifierKey, verifier);
      const challenge = await createChallenge(verifier);
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: redirectUri(),
        scope: config.oauthScopes || 'identify guilds',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      window.location.assign(`https://discord.com/oauth2/authorize?${params}`);
    })
    .catch(() => setFeedback('This browser cannot start a secure OAuth session.', 'error'));
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem(verifierKey);
  if (!verifier) throw new Error('OAuth session expired. Start again.');

  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error('Discord token exchange failed.');
  return response.json();
}

async function discordRequest(path) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    if (response.status === 401) {
      accessToken = '';
      clearToken();
      throw new Error('Discord session expired. Sign in with Discord again.');
    }
    throw new Error(`Discord account data could not be loaded (${response.status}).`);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function inviteForGuild(guildId) {
  const url = new URL(config.inviteUrl);
  url.searchParams.set('guild_id', guildId);
  return url.toString();
}

async function loadInstalledGuildIds() {
  if (!config.liveDataUrl) return;
  try {
    const response = await fetch(config.liveDataUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    installedGuildIds = new Set(Object.keys(data.guilds || {}));
  } catch {
    installedGuildIds = new Set();
  }
}

function renderGuilds(guilds) {
  if (!guilds.length) {
    guildsElement.innerHTML = '<p class="guild-empty">No manageable Discord servers were found for this account.</p>';
    return;
  }

  guildsElement.innerHTML = guilds.map((guild) => {
    const installed = installedGuildIds.has(guild.id);
    const icon = guild.icon
      ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="">`
      : `<span>${escapeHtml(guild.name.slice(0, 2).toUpperCase())}</span>`;
    const action = installed
      ? `<div class="guild-actions"><span class="guild-status"><i></i>Installed</span><a class="btn btn-primary btn-sm" href="./?guild=${encodeURIComponent(guild.id)}&view=manage&release=93f785c" target="_blank" rel="noopener">Manage</a></div>`
      : `<a class="btn btn-ghost btn-sm" href="${escapeHtml(inviteForGuild(guild.id))}" target="_blank" rel="noopener noreferrer">Add VYBot</a>`;
    const accessLabel = installed ? 'VYBot is active here' : 'Manage Guild access';
    return `<article class="guild-card ${installed ? 'is-installed' : ''}"><div class="guild-avatar">${icon}</div><div class="guild-copy"><strong>${escapeHtml(guild.name)}</strong><span>${accessLabel}</span></div>${action}</article>`;
  }).join('');

}

function openGuildWindow(guildId) {
  const child = window.open(`./?guild=${encodeURIComponent(guildId)}&view=manage&release=93f785c`, '_blank');
  if (!child) {
    setFeedback('Your browser blocked the new tab. Allow new tabs for this site and try again.', 'error');
    return;
  }
  const sendToken = () => child.postMessage({ type: 'vybot:dashboard-token', token: accessToken }, window.location.origin);
  window.addEventListener('message', (event) => {
    if (event.origin === window.location.origin && event.source === child && event.data?.type === 'vybot:dashboard-ready') sendToken();
  }, { once: true });
}

function openSettings(guildId, guildName) {
  if (!settings) return;
  settingsTitle.textContent = `${guildName} security`;
  panelServerName.textContent = guildName;
  settings.dataset.guildId = guildId;
  settings.hidden = false;
  settings.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadServerStats(guildId, guildName) {
  const response = await fetch(config.liveDataUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Live server data is unavailable.');
  const data = await response.json();
  const guild = data.guilds?.[guildId];
  if (!guild) throw new Error('This server is not available in live telemetry yet.');
  window.dispatchEvent(new CustomEvent('vybot:server-data', { detail: { guildId, guild, bot: data.bot || {}, updatedAt: data.updatedAt } }));
  panelServerName.textContent = guild.name || guildName || 'Server';
  document.getElementById('dashboard-server-title').textContent = guild.name || guildName || 'Server';
  settingsTitle.textContent = `${guild.name || guildName || 'Server'} security`;
  document.querySelector('[data-stat="memberCount"]').textContent = (guild.memberCount || 0).toLocaleString('en-US');
  document.querySelector('[data-stat="channels"]').textContent = String(guild.channels || 0);
  document.querySelector('[data-stat="roles"]').textContent = String(guild.roles || 0);
  document.querySelector('[data-stat="bot"]').textContent = guild.botOnline ? 'Online' : 'Offline';
  document.querySelector('[data-stat="updated"]').textContent = data.updatedAt ? `Synced ${new Date(data.updatedAt).toLocaleTimeString()}` : 'Live telemetry';
  document.querySelector('[data-stat="health-bot"]').textContent = guild.botOnline ? 'Online' : 'Offline';
  document.querySelector('[data-stat="ping"]').textContent = data.bot?.ping >= 0 ? `${data.bot.ping} ms` : '--';
  document.querySelector('[data-stat="uptime"]').textContent = data.bot?.uptimeSeconds ? formatUptime(data.bot.uptimeSeconds) : '--';
  const leaderboard = guild.leaderboard || [];
  document.getElementById('server-leaderboard').innerHTML = leaderboard.length
    ? leaderboard.slice(0, 5).map((member, index) => `<div class="leaderboard-row"><b>${index + 1}</b><span>${escapeHtml(member.name || 'Unknown')}</span><small>Level ${member.level || 0}</small><strong>${Number(member.xp || 0).toLocaleString('en-US')} XP</strong></div>`).join('')
    : '<div class="activity-empty">No ranking data yet.</div>';
  ['anti_nuke', 'anti_link', 'anti_spam'].forEach((key) => {
    const value = guild.settings?.[key];
    document.querySelector(`[data-coverage="${key}"]`).textContent = value === 1 ? 'Active' : value === 0 ? 'Off' : 'Unknown';
  });
  document.querySelector('[data-coverage="mod_log_channel"]').textContent = guild.settings?.mod_log_channel ? 'Configured' : 'Not set';
  await loadPanelSettings(guildId, guild.settings || {});
  const activityMarkup = `<div class="activity-item"><i></i><span>Bot telemetry synced</span><time>${data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'now'}</time></div><div class="activity-item"><i></i><span>${guild.memberCount || 0} members tracked</span><time>Live</time></div><div class="activity-item"><i></i><span>${guild.botOnline ? 'Bot is online and responding' : 'Bot appears offline'}</span><time>Live</time></div>`;
  document.getElementById('server-activity').innerHTML = activityMarkup;
  document.getElementById('server-activity-side').innerHTML = activityMarkup;
}

async function resolvePanelApi() {
  if (panelApiBase) return panelApiBase;
  const configured = config.dashboardApiUrl || config.botApiUrl;
  if (configured) return String(configured).replace(/\/$/, '');
  if (!config.tunnelUrl) return '';
  try {
    const response = await fetch(config.tunnelUrl, { cache: 'no-store' });
    const data = await response.json();
    panelApiBase = data && data.apiUrl ? String(data.apiUrl).replace(/\/$/, '') : '';
  } catch {
    panelApiBase = '';
  }
  return panelApiBase;
}

async function loadPanelSettings(guildId, fallback) {
  const base = await resolvePanelApi();
  if (!base || !accessToken) return;
  try {
    const response = await fetch(`${base}/api/guilds/${encodeURIComponent(guildId)}/settings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return;
    const payload = await response.json();
    const values = { ...fallback, ...(payload.settings || {}) };
    document.querySelectorAll('[data-setting]').forEach((input) => {
      input.checked = values[input.dataset.setting] === true || values[input.dataset.setting] === 1 || values[input.dataset.setting] === '1';
      input.disabled = false;
    });
  } catch {
    document.querySelectorAll('[data-setting]').forEach((input) => { input.disabled = false; });
  }
}

async function savePanelSettings() {
  const guildId = settings && settings.dataset.guildId;
  const base = await resolvePanelApi();
  if (!guildId || !base || !accessToken) {
    setFeedback('Connect the VYBot bridge before saving server settings.', 'error');
    return;
  }
  const values = {};
  document.querySelectorAll('[data-setting]').forEach((input) => { values[input.dataset.setting] = input.checked ? '1' : '0'; });
  const response = await fetch(`${base}/api/guilds/${encodeURIComponent(guildId)}/settings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`Settings save failed (${response.status}).`);
  setFeedback('Security settings synchronized with VYBot.', 'success');
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function selectCategory(category) {
  const copy = {
    overview: ['Overview', 'Your server at a glance. Choose a category from the navigation to manage it.'],
    security: ['Security', 'Protect your community with clear, focused controls.'],
    moderation: ['Moderation', 'Moderation controls will be available in the next panel release.'],
    leveling: ['Leveling', 'Configure XP, ranks and reward roles from this workspace.'],
    economy: ['Economy', 'Manage member rewards and the server economy here.'],
    welcome: ['Welcome', 'Design your welcome flow and automatic roles here.'],
    music: ['Music', 'Configure voice playback defaults and player behavior.'],
    giveaway: ['Giveaway', 'Configure winner count, duration and giveaway channels.'],
    roles: ['Role Panels', 'Configure button-based role panels and self-assignable roles.'],
    tickets: ['Tickets', 'Configure private support channels and staff access here.'],
    tools: ['Tools', 'Access utility commands and server diagnostics.'],
  }[category] || ['Security', 'Protect your community with clear, focused controls.'];
  settingsTitle.textContent = copy[0];
  settingsLead.textContent = copy[1];
  if (settingsPanel) settingsPanel.hidden = category !== 'security';
  categoryButtons.forEach((button) => button.classList.toggle('active', button.dataset.category === category));
}

function closeSettings() {
  if (!settings) return;
  settings.hidden = true;
}

async function completeLogin() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  if (!code && !params.get('error')) return false;

  window.history.replaceState({}, document.title, window.location.pathname);
  if (params.get('error')) throw new Error('Discord cancelled the sign-in request.');
  if (!returnedState || returnedState !== sessionStorage.getItem(stateKey)) {
    throw new Error('OAuth security state did not match. Start again.');
  }

  setFeedback('Connecting to Discord...', 'loading');
  const token = await exchangeCode(code);
  accessToken = token.access_token;
  saveToken(token);
  sessionStorage.removeItem(stateKey);
  sessionStorage.removeItem(verifierKey);

  const [user, guilds] = await Promise.all([
    discordRequest('/users/@me'),
    discordRequest('/users/@me/guilds'),
    loadInstalledGuildIds(),
  ]);
  const manageableGuilds = guilds
    .filter((guild) => {
      const permissions = BigInt(guild.permissions || '0');
      return (permissions & 0x20n) === 0x20n || (permissions & 0x8n) === 0x8n;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  userName.textContent = user.global_name || user.username;
  window.dispatchEvent(new CustomEvent('vybot:auth-user', { detail: user }));
  renderGuilds(manageableGuilds);
  document.body.classList.add('dashboard-authenticated');
  session.hidden = false;
  loginButton.hidden = true;
  setFeedback('Connected securely. Your session is remembered on this device.', 'success');
  return true;
}

function enterChildMode() {
  if (!childMode) return;
  document.body.classList.add('dashboard-child');
  document.getElementById('pro-dashboard').hidden = false;
  document.querySelector('.page-hero').hidden = true;
  document.querySelector('.dashboard-session').hidden = true;
  document.querySelector('.section').hidden = true;
  settings.hidden = true;
  const loadChildDashboard = async (token) => {
    accessToken = token || '';
    try {
      const guilds = await discordRequest('/users/@me/guilds');
      const guild = guilds.find((item) => item.id === childGuildId);
      if (!guild) throw new Error('You no longer have access to this server.');
      document.body.classList.add('dashboard-authenticated');
      await loadServerStats(childGuildId, guild.name);
    } catch (error) {
      setFeedback(error.message, 'error');
    }
  };
  Promise.resolve(loadToken()).then((token) => {
    if (token) return loadChildDashboard(token);
    setFeedback('Sign in with Discord before opening a server dashboard.', 'error');
  });
}

function logout() {
  accessToken = '';
  clearToken();
  document.body.classList.remove('dashboard-authenticated');
  session.hidden = true;
  loginButton.hidden = false;
  guildsElement.replaceChildren();
  setFeedback('Signed out.', 'success');
}

loginButton?.addEventListener('click', startLogin);
window.__vybotStartLogin = startLogin;
logoutButton?.addEventListener('click', logout);
backButton?.addEventListener('click', closeSettings);
categoryButtons.forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.category)));
document.getElementById('dash-save')?.addEventListener('click', () => {
  savePanelSettings().catch((error) => setFeedback(error.message, 'error'));
});

/* Sayfa yenilendiğinde kalıcı oturum */
Promise.resolve(loadToken()).then((restored) => {
  if (!restored) return;
  accessToken = restored;
  discordRequest('/users/@me').then((user) => {
    userName.textContent = user.global_name || user.username;
    window.dispatchEvent(new CustomEvent('vybot:auth-user', { detail: user }));
    discordRequest('/users/@me/guilds').then((guilds) => {
      const manageableGuilds = guilds
        .filter((g) => (BigInt(g.permissions || '0') & 0x20n) === 0x20n || (BigInt(g.permissions || '0') & 0x8n) === 0x8n)
        .sort((a, b) => a.name.localeCompare(b.name));
      renderGuilds(manageableGuilds);
      document.body.classList.add('dashboard-authenticated');
      session.hidden = false;
      loginButton.hidden = true;
      setFeedback('Session restored. Still you.', 'success');
    }).catch(() => {});
  }).catch((error) => {
    accessToken = '';
    clearToken();
    setFeedback(error.message, 'error');
  });
}).catch((error) => {
  accessToken = '';
  clearToken();
  setFeedback(error.message, 'error');
});

enterChildMode();
completeLogin().catch((error) => {
  accessToken = '';
  setFeedback(error.message, 'error');
});
