const config = window.VYBOT_CONFIG || {};
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
const childMode = Boolean(childGuildId && window.opener);
const stateKey = 'vybot_oauth_state';
const verifierKey = 'vybot_oauth_verifier';
let accessToken = '';
let installedGuildIds = new Set();

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
  if (!config.clientId || !config.oauthRedirectUri) {
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
  if (!response.ok) throw new Error('Discord account data could not be loaded.');
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
      ? `<div class="guild-actions"><span class="guild-status"><i></i>Installed</span><button class="btn btn-primary btn-sm" type="button" data-manage-guild="${escapeHtml(guild.id)}" data-guild-name="${escapeHtml(guild.name)}">Manage</button></div>`
      : `<a class="btn btn-ghost btn-sm" href="${escapeHtml(inviteForGuild(guild.id))}" target="_blank" rel="noopener noreferrer">Add VYBot</a>`;
    const accessLabel = installed ? 'VYBot is active here' : 'Manage Guild access';
    return `<article class="guild-card ${installed ? 'is-installed' : ''}"><div class="guild-avatar">${icon}</div><div class="guild-copy"><strong>${escapeHtml(guild.name)}</strong><span>${accessLabel}</span></div>${action}</article>`;
  }).join('');

  guildsElement.querySelectorAll('[data-manage-guild]').forEach((button) => {
    button.addEventListener('click', () => openGuildWindow(button.dataset.manageGuild));
  });
}

function openGuildWindow(guildId) {
  const child = window.open(`./?guild=${encodeURIComponent(guildId)}&view=manage&release=f7d2c99`, '_blank', 'popup,width=1440,height=960,resizable=yes,scrollbars=yes');
  if (!child) {
    setFeedback('Allow pop-ups to open the server dashboard.', 'error');
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
  const activityMarkup = `<div class="activity-item"><i></i><span>Bot telemetry synced</span><time>${data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : 'now'}</time></div><div class="activity-item"><i></i><span>${guild.memberCount || 0} members tracked</span><time>Live</time></div><div class="activity-item"><i></i><span>${guild.botOnline ? 'Bot is online and responding' : 'Bot appears offline'}</span><time>Live</time></div>`;
  document.getElementById('server-activity').innerHTML = activityMarkup;
  document.getElementById('server-activity-side').innerHTML = activityMarkup;
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
    tickets: ['Tickets', 'Configure private support channels and staff access here.'],
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
  renderGuilds(manageableGuilds);
  document.body.classList.add('dashboard-authenticated');
  session.hidden = false;
  loginButton.hidden = true;
  setFeedback('Connected securely. Your access token stays in memory only.', 'success');
  return true;
}

function enterChildMode() {
  if (!childMode) return;
  document.body.classList.add('dashboard-child');
  document.querySelector('.page-hero').hidden = true;
  document.querySelector('.dashboard-session').hidden = true;
  document.querySelector('.section').hidden = true;
  settings.hidden = false;
  window.opener.postMessage({ type: 'vybot:dashboard-ready' }, window.location.origin);
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'vybot:dashboard-token') return;
    accessToken = event.data.token || '';
    try {
      const guilds = await discordRequest('/users/@me/guilds');
      const guild = guilds.find((item) => item.id === childGuildId);
      if (!guild) throw new Error('You no longer have access to this server.');
      document.body.classList.add('dashboard-authenticated');
      await loadServerStats(childGuildId, guild.name);
    } catch (error) {
      setFeedback(error.message, 'error');
    }
  }, { once: true });
}

function logout() {
  accessToken = '';
  document.body.classList.remove('dashboard-authenticated');
  session.hidden = true;
  loginButton.hidden = false;
  guildsElement.replaceChildren();
  setFeedback('Signed out.', 'success');
}

loginButton?.addEventListener('click', startLogin);
logoutButton?.addEventListener('click', logout);
backButton?.addEventListener('click', closeSettings);
categoryButtons.forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.category)));

enterChildMode();
completeLogin().catch((error) => {
  accessToken = '';
  setFeedback(error.message, 'error');
});
