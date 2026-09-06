const config = window.VYBOT_CONFIG || {};
const loginButton = document.getElementById('dash-login');
const logoutButton = document.getElementById('dash-logout');
const feedback = document.getElementById('dash-auth-feedback');
const session = document.getElementById('dash-session');
const userName = document.getElementById('dash-user-name');
const guildsElement = document.getElementById('dash-guilds');
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
      ? '<span class="guild-status"><i></i>Installed</span>'
      : `<a class="btn btn-ghost btn-sm" href="${escapeHtml(inviteForGuild(guild.id))}" target="_blank" rel="noopener noreferrer">Add VYBot</a>`;
    const accessLabel = installed ? 'VYBot is active here' : 'Manage Guild access';
    return `<article class="guild-card ${installed ? 'is-installed' : ''}"><div class="guild-avatar">${icon}</div><div class="guild-copy"><strong>${escapeHtml(guild.name)}</strong><span>${accessLabel}</span></div>${action}</article>`;
  }).join('');
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

completeLogin().catch((error) => {
  accessToken = '';
  setFeedback(error.message, 'error');
});
