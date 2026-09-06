/**
 * VYBot — Professional Dashboard (GERÇEK VERİ + İŞLEVSEL)
 * ---------------------------------------------------------------------------
 * Tüm istatistikler canlı telemetriden gelir. Bot, src/utils/liveDataSync.js ile
 * "live-data" dalındaki live-data.json dosyasına GERÇEK sunucu verisi yazar.
 * Bu sayfa:
 *   • Canlı veriyi HER 10 SANİYEDE bir otomatik yeniler (sessiz polling)
 *   • Discord OAuth açıksa sağ üstte gerçek kullanıcı adını gösterir
 *   • Settings bölümünde GERÇEKTEN açılıp kapanan toggle'lar + kaydetme vardır
 *     (tarayıcıda saklanır; dashboardApiUrl dolarsa sunucuya POST eder)
 * KURAL (Masterprompt 26): Sahte sayı ASLA gösterilmez.
 */
(() => {
  'use strict';

  const root = document.getElementById('pro-dashboard');
  if (!root) return;

  const cfg = window.VYBOT_CONFIG || {};
  const liveDataUrl = cfg.liveDataUrl || '';
  const timeoutMs = cfg.liveDataTimeoutMs || 8000;

  const icons = {
    overview: '◉', analytics: '⌁', moderation: '◒', security: '◈',
    leveling: '✦', economy: '◌', welcome: '⌂', music: '♫', giveaway: '✧',
    roles: '◆', tickets: '□', tools: '≡', logs: '☷', settings: '⚙',
  };

  const state = {
    view: new URLSearchParams(location.search).get('view') || 'overview',
    guildId: null,
    live: null,   // live-data.json yükü
    auth: null,   // vybot:server-data (Discord OAuth child mode)
    user: null,   // vybot:auth-user (Discord OAuth kullanıcısı)
    prefs: {},    // tarayıcıda saklanan kullanıcı tercihleri (guildId'e göre)
    loading: true,
    error: false,
    lastKey: '',  // son render anahtarı — sessiz yenileme veri değişmeden render atlamaz
    tunnelUrl: '',
  };

  /* ---------- yardımcılar ---------- */
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function fmtN(n) { return (Number(n) || 0).toLocaleString('en-US'); }

  function fmtUptime(sec) {
    const s = Number(sec) || 0;
    if (s <= 0) return '—';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function guildList() {
    const gs = (state.live && state.live.guilds) || {};
    return Object.keys(gs).map((id) => gs[id]);
  }

  function pguild() {
    if (state.auth && state.auth.guild) return state.auth.guild;
    const list = guildList();
    if (!list.length) return null;
    if (state.guildId) {
      const found = list.find((g) => String(g.id) === String(state.guildId));
      if (found) return found;
    }
    return list[0];
  }

  function pbot() {
    if (state.auth && state.auth.bot && Object.keys(state.auth.bot).length) return state.auth.bot;
    return (state.live && state.live.bot) || {};
  }

  function hasLive() { return Boolean(state.live || state.auth); }

  function updatedAt() {
    return (state.auth && state.auth.updatedAt) || (state.live && state.live.updatedAt) || null;
  }

  function metric(label, value, live, icon) {
    return `<article class="pro-kpi"><div class="pro-kpi-icon">${icon}</div><span>${esc(label)}</span><strong>${value}</strong><small>${live ? 'Real VYBot telemetry' : 'Awaiting live telemetry'}</small></article>`;
  }

  function statusRow(label, value, tone) {
    return `<div class="pro-health-row"><span><i class="pro-status-dot ${tone || ''}"></i>${esc(label)}</span><strong>${value}</strong></div>`;
  }

  function emptyChart(text) { return `<div class="pro-chart-empty">${esc(text)}</div>`; }

  function rankCls(i) { return i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''; }
  function isSettingOn(value) {
    return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
  }

  function listValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function chartPoints(values, color) {
    const points = listValue(values).map((item) => {
      if (typeof item === 'number') return item;
      return Number(item && (item.value ?? item.count ?? item.members ?? item.messages)) || 0;
    });
    if (points.length < 2) return '';
    const max = Math.max(...points, 1);
    const min = Math.min(...points);
    const range = Math.max(max - min, 1);
    const coords = points.map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 94 - ((value - min) / range) * 78;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    return `<svg class="pro-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Live telemetry history"><polyline points="${coords}" fill="none" stroke="${color || '#55e0a4'}" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
  }

  function historyFor(guild, keys) {
    for (const key of keys) {
      const value = guild && guild[key];
      if (Array.isArray(value) && value.length > 1) return value;
    }
    const stored = telemetryHistory(guild);
    if (keys.some((key) => key.toLowerCase().includes('member'))) return stored.members;
    if (keys.some((key) => key.toLowerCase().includes('message') || key.toLowerCase().includes('activity'))) return stored.messages;
    return [];
  }

  function telemetryHistory(guild) {
    const id = guild && guild.id ? String(guild.id) : 'default';
    const key = `vybot_telemetry_history_${id}`;
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return {
        members: Array.isArray(value.members) ? value.members : [],
        messages: Array.isArray(value.messages) ? value.messages : [],
      };
    } catch (_) {
      return { members: [], messages: [] };
    }
  }

  function recordTelemetryHistory(data) {
    const guilds = data && data.guilds ? Object.values(data.guilds) : [];
    guilds.forEach((guild) => {
      const id = guild && guild.id ? String(guild.id) : '';
      if (!id) return;
      const history = telemetryHistory(guild);
      const memberValue = Number(guild.memberCount);
      const messageValue = Number(guild.messages24h ?? guild.messages ?? guild.messageCount);
      if (Number.isFinite(memberValue)) history.members.push({ value: memberValue, timestamp: data.updatedAt });
      if (Number.isFinite(messageValue)) history.messages.push({ value: messageValue, timestamp: data.updatedAt });
      history.members = history.members.slice(-24);
      history.messages = history.messages.slice(-24);
      try { localStorage.setItem(`vybot_telemetry_history_${id}`, JSON.stringify(history)); } catch (_) { /* storage may be blocked */ }
    });
  }

  function historyChart(values, label) {
    let points = listValue(values);
    if (points.length === 1) points = [{ value: 0 }, points[0]];
    const chart = chartPoints(points, '#55e0a4');
    return chart || emptyChart(`${label} history is collecting — the next bot sync will add the first points.`);
  }

  function activityFor(guild) {
    const values = guild && (guild.activity || guild.recentActivity || guild.events || guild.activityHistory);
    return Array.isArray(values) ? values.slice(-6).reverse() : [];
  }

  function activityRows(guild) {
    const rows = activityFor(guild);
    if (!rows.length) return '<div class="pro-chart-empty">No activity published yet — waiting for the next telemetry sync.</div>';
    return rows.map((row) => {
      const text = typeof row === 'string' ? row : (row.label || row.message || row.type || 'Server activity');
      const time = typeof row === 'object' && row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'Live';
      return `<div class="pro-activity-row"><span class="pro-activity-icon">•</span><div><strong>${esc(text)}</strong><small>VYBot telemetry</small></div><time>${esc(time)}</time></div>`;
    }).join('');
  }

  function lbRows(leaderboard, max) {
    const lb = Array.isArray(leaderboard) ? leaderboard.slice(0, max || 6) : [];
    if (!lb.length) {
      return '<div class="pro-chart-empty">No leaderboard published yet — ranking appears once members earn XP.</div>';
    }
    return lb.map((m, i) => `<div class="pro-member-row ${rankCls(i)}"><b>#${i + 1}</b><em>Lv ${m.level || 0}</em><span>${esc(m.name || 'Unknown')}</span><strong>${fmtN(m.xp)} XP</strong></div>`).join('');
  }

  /* ---------- tercihler (localStorage) ---------- */
  function prefsKey() {
    const g = pguild();
    return 'vybot_prefs_' + (g && g.id ? String(g.id) : 'default');
  }

  function loadPrefs() {
    try { state.prefs = JSON.parse(localStorage.getItem(prefsKey()) || '{}') || {}; }
    catch (_) { state.prefs = {}; }
    return state.prefs;
  }

  function savePrefs() {
    try { localStorage.setItem(prefsKey(), JSON.stringify(state.prefs)); }
    catch (_) { /* yoksay — çerez engelli ortam */ }
  }

  /* ---------- toggle yardımcıları ---------- */
  function toggleHTML(key, label, desc, checked) {
    const id = 'pro-pref-' + key.replace(/[^a-z0-9]/gi, '-');
    return `<label class="pro-toggle-row" for="${id}">
      <span class="pro-toggle"><input type="checkbox" id="${id}" data-pref="${esc(key)}" ${checked ? 'checked' : ''}><i></i></span>
      <span class="pro-toggle-text"><strong>${esc(label)}</strong>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
    </label>`;
  }

  function bindToggles(rootEl) {
    rootEl.querySelectorAll('[data-pref]').forEach((input) => {
      input.addEventListener('change', () => {
        const key = input.dataset.pref;
        if (input.type === 'checkbox') state.prefs[key] = input.checked ? '1' : '0';
        else state.prefs[key] = input.value;
        input.closest('[data-pref-group]')?.classList.add('dirty');
        rootEl.querySelector('[data-save-state]')?.setAttribute('data-save-state', 'dirty');
      });
    });
    rootEl.querySelectorAll('[data-toggle-all]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const on = btn.dataset.toggleAll === '1';
        rootEl.querySelectorAll('input[data-pref][type="checkbox"]').forEach((cb) => {
          cb.checked = on;
          state.prefs[cb.dataset.pref] = on ? '1' : '0';
        });
        rootEl.querySelector('[data-save-state]')?.setAttribute('data-save-state', 'dirty');
      })
    );
  }

  function discordAccessToken() {
    try {
      const raw = localStorage.getItem('vybot_token');
      if (!raw) return '';
      const store = JSON.parse(raw);
      if (!store || !store.access_token) return '';
      if (store.expires_at && store.expires_at < Date.now()) return '';
      return store.access_token;
    } catch {
      return '';
    }
  }

  function apiBase() {
    const fromLive = state.live && state.live.bot && state.live.bot.apiUrl;
    const fromTunnel = state.tunnelUrl;
    const fromCfg = cfg.botApiUrl;
    return String(fromCfg || fromLive || fromTunnel || '').replace(/\/$/, '');
  }

  function saveNow(rootEl) {
    savePrefs();
    const el = rootEl.querySelector('[data-save-state]');
    if (el) el.setAttribute('data-save-state', 'saving');
    const base = apiBase();
    if (!base) {
      if (el) el.setAttribute('data-save-state', 'error');
      console.warn('[VYBot] Bot API URL henuz yok (tunnel.json).');
      return;
    }
    const g = pguild();
    const guildId = g && g.id ? g.id : '';
    if (!guildId) {
      if (el) el.setAttribute('data-save-state', 'error');
      return;
    }
    const token = discordAccessToken();
    if (!token) {
      if (el) el.setAttribute('data-save-state', 'error');
      console.warn('[VYBot] Discord oturumu gerekli.');
      return;
    }
    fetch(`${base}/api/guilds/${guildId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(state.prefs),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        const payload = await r.json();
        if (payload && payload.settings) {
          const guild = pguild();
          if (guild) guild.settings = { ...(guild.settings || {}), ...payload.settings };
          state.prefs = { ...state.prefs, ...payload.settings };
          savePrefs();
        }
        if (el) el.setAttribute('data-save-state', 'saved');
      })
      .catch((e) => {
        if (el) el.setAttribute('data-save-state', 'error');
        console.warn('[VYBot] Bot API hatası:', e.message);
      });
  }

  function nav() {
    const items = [
      ['overview', 'Overview'], ['analytics', 'Analytics'], ['moderation', 'Moderation'],
      ['security', 'Security'], ['leveling', 'Leveling'], ['economy', 'Economy'],
      ['welcome', 'Welcome'], ['music', 'Music'], ['giveaway', 'Giveaway'],
      ['roles', 'Role panels'], ['tickets', 'Tickets'], ['tools', 'Tools'],
      ['leaderboard', 'Leaderboard'], ['logs', 'Logs'], ['settings', 'Settings'],
    ];
    return items.map(([id, label]) => `<button class="pro-nav-item ${state.view === id ? 'active' : ''}" data-pro-route="${id}"><span>${icons[id]}</span>${label}</button>`).join('');
  }
function overview() {
    const guild = pguild();
    const bot = pbot();
    const members = guild && guild.memberCount != null ? guild.memberCount : null;
    const channels = guild && guild.channels != null ? guild.channels : null;
    const roles = guild && guild.roles != null ? guild.roles : null;
    const latency = bot.ping != null ? bot.ping : null;
    const online = guild ? Boolean(guild.botOnline) : null;
    const updated = updatedAt();
    const guildName = (guild && guild.name) || 'No server connected';
    const leaderboard = (guild && guild.leaderboard) || [];
    const liveNote = hasLive()
      ? (updated ? `Live data · synced ${new Date(updated).toLocaleString()}` : 'Live data connected')
      : (state.error ? 'Live telemetry unreachable — dashboard is read-only' : 'Connecting to VYBot live telemetry…');
    const statusTxt = online === null ? '—' : online ? 'Online' : 'Offline';
    const statusTone = online === true ? 'good' : online === false ? 'bad' : '';

    return `
      <div class="pro-view-heading">
        <div>
          <span class="pro-eyebrow">Server overview</span>
          <h1>${esc(guildName)}</h1>
          <p><i class="pro-status-dot ${statusTone}"></i> ${statusTxt}<span class="pro-divider"> · </span>${members == null ? '—' : fmtN(members)} members<span class="pro-divider"> · </span>${latency == null ? '—' : latency}ms latency</p>
        </div>
        <div class="pro-heading-actions">
          <a class="pro-button primary" href="${esc(cfg.inviteUrl || '#')}" target="_blank" rel="noopener noreferrer">Invite Bot</a>
        </div>
      </div>
      <div class="pro-live-note"><i class="pro-status-dot ${hasLive() ? 'good' : ''}"></i>${esc(liveNote)}</div>
      <div class="pro-kpi-grid">
        ${metric('Total Members', members == null ? '—' : fmtN(members), hasLive(), '♙')}
        ${metric('Channels', channels == null ? '—' : String(channels), hasLive(), '#')}
        ${metric('Roles', roles == null ? '—' : String(roles), hasLive(), '◆')}
        ${metric('Latency', latency == null ? '—' : `${latency}ms`, hasLive(), '◉')}
        ${metric('Bot Status', statusTxt, hasLive(), '▣')}
      </div>
      <div class="pro-chart-grid">
        <section class="pro-card">
          <div class="pro-card-head"><div><span class="pro-eyebrow">Member growth</span><h2>Community growth</h2></div><button class="pro-select" type="button">Live snapshot⌄</button></div>
          <div class="pro-chart-meta"><strong>${members == null ? '—' : fmtN(members)}</strong><span>${members == null ? 'single snapshot, no history yet' : 'current members · single snapshot'}</span></div>
          <div class="pro-chart-frame">${historyChart(historyFor(guild, ['memberHistory', 'memberGrowth', 'membersHistory']), 'Member')}</div>
        </section>
        <section class="pro-card">
          <div class="pro-card-head"><div><span class="pro-eyebrow">Server activity</span><h2>Messages per hour</h2></div><button class="pro-select" type="button">Live snapshot⌄</button></div>
          <div class="pro-chart-meta"><strong>${fmtN((historyFor(guild, ['messageHistory', 'messagesHistory', 'activityHistory']).slice(-1)[0] || {}).value || 0)}</strong><span>messages in latest telemetry window</span></div>
          <div class="pro-chart-frame">${historyChart(historyFor(guild, ['messageHistory', 'messagesHistory', 'activityHistory']), 'Message')}</div>
        </section>
      </div>
      <div class="pro-lower-grid">
        <section class="pro-card pro-table-card">
          <div class="pro-card-head"><div><span class="pro-eyebrow">Leveling</span><h2>Community leaderboard</h2></div></div>
          ${lbRows(leaderboard, 6)}
        </section>
        <section class="pro-card pro-table-card">
          <div class="pro-card-head"><div><span class="pro-eyebrow">Telemetry</span><h2>Bot status</h2></div></div>
          ${statusRow('Bot', statusTxt, statusTone)}
          ${statusRow('Servers', bot.guildCount != null ? fmtN(bot.guildCount) : '—', '')}
          ${statusRow('Ping', latency == null ? '—' : `${latency}ms`, '')}
          ${statusRow('Uptime', fmtUptime(bot.uptimeSeconds), '')}
        </section>
      </div>`;
  }
function analytics() {
    const guild = pguild();
    const members = guild && guild.memberCount != null ? guild.memberCount : null;
    const guildName = (guild && guild.name) || 'No server connected';
    const has = hasLive();
  const historyMembers = historyFor(guild, ['memberHistory', 'memberGrowth', 'membersHistory']);
  const historyMessages = historyFor(guild, ['messageHistory', 'messagesHistory', 'activityHistory']);
  return `
    <div class="pro-view-heading"><div><span class="pro-eyebrow">Analytics</span><h1>Understand your community</h1><p>Live member, message, command and voice telemetry for ${esc(guildName)}.</p></div><button class="pro-button primary" type="button" data-open-settings="1">Open settings</button></div>
    <div class="pro-kpi-grid">
      ${metric('Total Members', members == null ? '—' : fmtN(members), has, '♙')}
      ${metric('Joins (session)', fmtN(guild && guild.joinsSession), has, '↗')}
      ${metric('Messages (24h)', fmtN(guild && guild.messages24h), has, '▰')}
      ${metric('Commands Used', fmtN(guild && guild.commandsUsed), has, '⌁')}
      ${metric('In voice now', fmtN(guild && guild.voiceNow), has, '◉')}
    </div>
    <div class="pro-chart-grid">
      <section class="pro-card pro-chart-large"><div class="pro-card-head"><h2>Member growth</h2><span class="pro-live-chip">${historyMembers.length} points</span></div><div class="pro-chart-frame">${historyMembers.length ? historyChart(historyMembers, 'Member') : emptyChart('Collecting member snapshots while the bot host is online.')}</div></section>
      <section class="pro-card"><div class="pro-card-head"><h2>Messages · 24 hours</h2><span class="pro-live-chip">Live history</span></div><div class="pro-chart-frame">${historyMessages.length ? historyChart(historyMessages, 'Message') : emptyChart('Message counts fill as members chat while the bot is online.')}</div></section>
    </div>
    <section class="pro-card pro-quick-actions"><div class="pro-card-head"><h2>Quick actions</h2><span class="pro-live-chip">Workspace shortcuts</span></div><div class="pro-action-grid">
      <button class="pro-action-card" type="button" data-open-settings="1"><strong>Open settings</strong><span>Adjust modules and sync them to the bot.</span></button>
      <button class="pro-action-card" type="button" data-pro-route="leaderboard"><strong>Open leaderboard</strong><span>See the most active members and XP.</span></button>
      <button class="pro-action-card" type="button" data-pro-route="logs"><strong>Jump to live logs</strong><span>Review the latest bot and community activity.</span></button>
      <button class="pro-action-card" type="button" data-pro-route="leveling"><strong>Boost XP now</strong><span>Configure rewards that keep members engaged.</span></button>
    </div></section>`;
}

function welcomeView() {
  const guild = pguild();
  const settings = (guild && guild.settings) || {};
  const prefs = loadPrefs();
  const enabled = isSettingOn(Object.prototype.hasOwnProperty.call(prefs, 'welcome_enabled') ? prefs.welcome_enabled : settings.welcome_enabled);
  const autoRole = isSettingOn(Object.prototype.hasOwnProperty.call(prefs, 'auto_role_enabled') ? prefs.auto_role_enabled : settings.auto_role_enabled);
  const joins = Number(guild && (guild.joinsSession ?? guild.joins)) || 0;
  const leaves = Number(guild && (guild.leavesSession ?? guild.leaves)) || 0;
  return `
    <div class="pro-view-heading"><div><span class="pro-eyebrow">Onboarding</span><h1>Welcome</h1><p>Default welcome is configured on the bot.</p></div></div>
    <div data-save-state="idle" class="pro-save-banner"><span class="i"></span><span class="t">Changes are stored locally in this browser.</span></div>
    <div class="pro-heading-actions pro-welcome-actions"><button class="pro-button primary" type="button" data-save="1">Save &amp; sync</button></div>
    <div class="pro-settings-grid pro-welcome-grid">
      <section class="pro-card pro-setting-card" data-pref-group>${toggleHTML('welcome_enabled', 'Enable welcome', 'Greet new members', enabled)}</section>
      <section class="pro-card pro-setting-card" data-pref-group>${toggleHTML('auto_role_enabled', 'Enable auto-role', 'Assign /otorol on join', autoRole)}</section>
    </div>
    <div class="pro-kpi-grid pro-welcome-kpis">
      ${metric('Joins this session', fmtN(joins), hasLive(), '⌂')}
      ${metric('Leaves', fmtN(leaves), hasLive(), '↘')}
    </div>`;
}

  function settingsView(rootEl) {
    const guild = pguild();
    const guildId = guild && guild.id ? String(guild.id) : null;
    const settings = (guild && guild.settings) || {};
    const prefs = loadPrefs();
    // Botun gerçek ayarları toggle'ların BAŞLANGIÇ durumunu belirler;
    // kullanıcı değiştirirse localStorage'daki tercih kazanır.
    const val = (key) => (key in prefs ? prefs[key] : settings[key] != null ? String(settings[key]) : '');

    const sw = (key, label, desc) => toggleHTML(key, label, desc, isSettingOn(val(key)));
    const guildLabel = guild ? esc(guild.name) : 'No server connected';
    const editNote = cfg.dashboardApiUrl
      ? 'Değişiklikler sunucuya gönderilir.'
      : 'Değişiklikler bu tarayıcıda saklanır. Sunucuya kalıcı uygulamak için Discord’da /panel-bagla komutunu kullanın.';

    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">Settings</span><h1>Configure ${guildLabel}</h1><p>Toggle VYBot modules, security guards, leveling, economy and more.</p></div>
        <div class="pro-heading-actions">
          <button class="pro-button ghost" type="button" data-toggle-all="1">Enable all</button>
          <button class="pro-button ghost" type="button" data-toggle-all="0">Disable all</button>
          <button class="pro-button primary" type="button" data-save="1">💾 Save changes</button>
        </div></div>
      <div data-save-state="idle" class="pro-save-banner"><span class="i"></span><span class="t">Changes are stored locally in this browser.</span></div>

      <section class="pro-card pro-pref-card" data-pref-group>
        <div class="pro-card-head"><h2>🛡 Security guards</h2><small>Live from /guvenlik settings</small></div>
        ${sw('anti_nuke', 'Anti-Nuke', 'Blocks channel & role deletion')}
        ${sw('anti_link', 'Anti-Link', 'Blocks advertising & invites')}
        ${sw('anti_swear', 'Anti-Swear', 'Filters configured words')}
        ${sw('anti_spam', 'Anti-Spam', 'Blocks message flooding')}
      </section>

      <section class="pro-card pro-pref-card" data-pref-group>
        <div class="pro-card-head"><h2>✨ Modules</h2><small>Which VYBot systems are active</small></div>
        ${sw('leveling_enabled', 'Leveling & XP', 'Grant XP per message, ranks and level roles')}
        ${sw('leaderboard_enabled', 'Community leaderboard', 'Publish XP rankings in the dashboard and bot commands')}
        ${sw('economy_enabled', 'Economy', 'Balances, daily and daily rewards')}
        ${sw('welcome_enabled', 'Welcome', 'Welcome messages for new members')}
        ${sw('activity_tracking_enabled', 'Activity telemetry', 'Record message and member history for analytics')}
        ${sw('log_enabled', 'Moderation logging', 'Record moderation events (/modlog)')}
      </section>

      <section class="pro-card pro-pref-card" data-pref-group>
        <div class="pro-card-head"><h2>🎵 Music</h2><small>Voice playback settings</small></div>
        ${sw('music_enabled', 'Music player', 'Play music from voice channels')}
        ${sw('music_stay', 'Stay in channel', 'Keep the bot connected after queue ends')}
      </section>

      <section class="pro-card pro-pref-card" data-pref-group>
        <div class="pro-card-head"><h2>✓ General</h2><small>Server-wide behavior</small></div>
        ${sw('auto_role_enabled', 'Auto role', 'Assign a role on join (/otorol)')}
        ${sw('mod_log_enabled', 'Mod-log channel', 'Audit log for staff actions')}
        ${sw('ticket_enabled', 'Ticket system', 'Enable private support ticket workflows')}
        ${sw('giveaway_enabled', 'Giveaways', 'Enable scheduled community giveaways')}
      </section>

      <div class="pro-save-note">${editNote}</div>`;
  }

  function genericView(title, eyebrow, description, rows) {
    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><button class="pro-button primary" type="button" data-open-settings="1">Configure</button></div>
      <div class="pro-data-grid">${rows.map((r) => `<section class="pro-card pro-data-card"><span class="pro-data-icon">${r[0]}</span><div><h2>${esc(r[1])}</h2><p>${esc(r[2])}</p></div><strong>${esc(r[3])}</strong></section>`).join('')}</div>`;
  }

  const WORKSPACES = {
    moderation: {
      title: 'Moderation center', eyebrow: 'Moderation', description: 'Keep every action accountable with live staff controls.',
      toggles: [['mod_log_enabled', 'Moderation log', 'Record staff actions and audit events'], ['anti_spam', 'Anti-spam', 'Slow down repeated messages'], ['anti_swear', 'Word filter', 'Filter configured words']],
      actions: [['Review warnings', 'Open the member warning workflow'], ['Open live logs', 'Inspect recent moderation events']],
    },
    security: {
      title: 'Security center', eyebrow: 'Protection', description: 'Layered protection for channels, roles, links and raids.',
      toggles: [['anti_nuke', 'Anti-nuke', 'Block destructive channel and role changes'], ['anti_link', 'Anti-link', 'Block advertising and invite links'], ['anti_spam', 'Anti-spam', 'Protect against message floods'], ['anti_swear', 'Anti-swear', 'Filter configured words']],
      actions: [['Run security check', 'Review the current protection coverage'], ['Configure mod-log', 'Choose where security events are recorded']],
    },
    leveling: {
      title: 'Leveling workspace', eyebrow: 'Engagement', description: 'Turn conversations into XP, ranks and rewards.',
      toggles: [['leveling_enabled', 'XP engine', 'Grant XP when members participate'], ['leaderboard_enabled', 'Community leaderboard', 'Publish rankings and member progress']],
      actions: [['Open leaderboard', 'See members with the most XP'], ['Configure rewards', 'Set role rewards for level milestones']],
    },
    economy: {
      title: 'Economy workspace', eyebrow: 'Engagement', description: 'Make balances, rewards and daily activity meaningful.',
      toggles: [['economy_enabled', 'Economy module', 'Enable balances, daily and rewards']],
      actions: [['Open balances', 'Review economy activity from the bot'], ['Configure rewards', 'Tune daily rewards and currency']],
    },
    music: {
      title: 'Music workspace', eyebrow: 'Voice', description: 'Control the voice player and make queue behavior predictable.',
      toggles: [['music_enabled', 'Music player', 'Allow members to play music'], ['music_stay', 'Stay in channel', 'Keep VYBot connected after the queue ends']],
      actions: [['Open queue', 'Inspect the active voice queue'], ['Voice controls', 'Skip, stop or leave the channel']],
    },
    giveaway: {
      title: 'Giveaway workspace', eyebrow: 'Engagement', description: 'Create fair, visible giveaways with tracked entries.',
      toggles: [['giveaway_enabled', 'Giveaway engine', 'Enable scheduled community giveaways']],
      actions: [['Create giveaway', 'Start a button-based giveaway'], ['Entry tracking', 'Review active giveaway entries']],
    },
    roles: {
      title: 'Role panels', eyebrow: 'Community', description: 'Give members a clear, interactive way to choose roles.',
      toggles: [['role_panel_enabled', 'Role panels', 'Enable interactive role panels']],
      actions: [['Create role panel', 'Publish a new selectable role panel'], ['Manage roles', 'Review self-assignable roles']],
    },
    tickets: {
      title: 'Tickets workspace', eyebrow: 'Support', description: 'Give members a private, structured path to your staff team.',
      toggles: [['ticket_enabled', 'Ticket system', 'Enable private support workflows']],
      actions: [['Open ticket queue', 'Review active support requests'], ['Configure support team', 'Set staff access and channels']],
    },
    tools: {
      title: 'Server tools', eyebrow: 'Utilities', description: 'Fast access to the operational tools that keep your server healthy.',
      toggles: [['activity_tracking_enabled', 'Activity telemetry', 'Record member and message history']],
      actions: [['Server info', 'Inspect live server and bot data'], ['Command explorer', 'Browse every available VYBot command']],
    },
  };

  function workspaceView(view) {
    const workspace = WORKSPACES[view];
    if (!workspace) return null;
    const guild = pguild();
    const settings = (guild && guild.settings) || {};
    const prefs = loadPrefs();
    const value = (key) => Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : settings[key];
    const toggles = workspace.toggles.map(([key, label, desc]) =>
      `<section class="pro-card pro-setting-card" data-pref-group>${toggleHTML(key, label, desc, isSettingOn(value(key)))}<strong>${isSettingOn(value(key)) ? 'Active now' : 'Ready to enable'}</strong></section>`
    ).join('');
    const actions = workspace.actions.map(([label, desc], index) =>
      `<button class="pro-action-card" type="button" data-workspace-action="${esc(view)}-${index}"><strong>${esc(label)}</strong><span>${esc(desc)}</span></button>`
    ).join('');
    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">${esc(workspace.eyebrow)}</span><h1>${esc(workspace.title)}</h1><p>${esc(workspace.description)}</p></div><div class="pro-heading-actions"><button class="pro-button ghost" type="button" data-toggle-all="1">Enable all</button><button class="pro-button primary" type="button" data-save="1">Save &amp; sync</button></div></div>
      <div data-save-state="idle" class="pro-save-banner"><span class="i"></span><span class="t">Changes are stored locally in this browser.</span></div>
      <div class="pro-settings-grid pro-workspace-grid">${toggles}</div>
      <section class="pro-card pro-quick-actions"><div class="pro-card-head"><h2>Workspace actions</h2><span class="pro-live-chip">Connected to ${esc((guild && guild.name) || 'your server')}</span></div><div class="pro-action-grid">${actions}</div></section>
      <section class="pro-card pro-workspace-status"><div class="pro-card-head"><h2>Live status</h2><span class="pro-live-chip">${hasLive() ? 'Telemetry connected' : 'Waiting for telemetry'}</span></div><div class="pro-health-grid">${statusRow('Bot status', guild && guild.botOnline ? 'Online' : 'Offline', guild && guild.botOnline ? 'good' : '')}${statusRow('Last sync', updatedAt() ? new Date(updatedAt()).toLocaleTimeString() : 'Waiting', '')}${statusRow('Members', guild ? fmtN(guild.memberCount) : '—', '')}</div></section>`;
  }

  function leaderboardView() {
    const guild = pguild();
    return `<div class="pro-view-heading"><div><span class="pro-eyebrow">Community</span><h1>Leaderboard</h1><p>Celebrate the members who keep ${esc((guild && guild.name) || 'your server')} active.</p></div><button class="pro-button primary" type="button" data-open-settings="1">Configure XP</button></div><section class="pro-card pro-table-card"><div class="pro-card-head"><h2>Top members</h2><span class="pro-live-chip">Live XP data</span></div>${lbRows(guild && guild.leaderboard, 20)}</section>`;
  }

  function logsView() {
    const guild = pguild();
    return `<div class="pro-view-heading"><div><span class="pro-eyebrow">Audit</span><h1>Live logs</h1><p>Recent events published by the bot telemetry stream.</p></div><button class="pro-button primary" type="button" data-open-settings="1">Configure logging</button></div><section class="pro-card pro-table-card"><div class="pro-card-head"><h2>Recent activity</h2><span class="pro-live-chip">${activityFor(guild).length} events</span></div>${activityRows(guild)}</section>`;
  }
const MODULE_VIEWS = {
    security: ['Security center', 'Protection', 'Keep your server safe with layered, transparent controls.',
      [['◈', 'Anti-Nuke', 'Channel and role deletion protection', 'Available'],
       ['⚡', 'Anti-Spam', 'Flood and repeated message protection', 'Available'],
       ['#', 'Anti-Link', 'Advertising and invite filter', 'Available'],
       ['!', 'Anti-Swear', 'Configured word filter', 'Available'],
       ['◌', 'Raid Protection', 'Rapid join detection', 'Available'],
       ['≡', 'Mod-log', 'Audit history and moderation events', 'Set with /modlog']]],
    moderation: ['Moderation center', 'Moderation', 'Review warnings, mutes, bans, kicks and timeouts.',
      [['!', 'Warnings', 'Member warning history (/uyar, /sicil)', '—'],
       ['◐', 'Mutes', 'Active timeouts (/timeout)', '—'],
       ['×', 'Bans', 'Current server bans (/ban, /kick)', '—'],
       ['≡', 'Moderation logs', 'Recent staff actions', 'Available']]],
    leveling: ['Leveling', 'Engagement', 'Build a more active community with XP, ranks and rewards.',
      [['✦', 'XP engine', 'Messages converted to XP', 'Available'],
       ['♙', 'Leaderboard', 'Top member ranking (/liderlik)', 'Real data → overview'],
       ['◆', 'Role rewards', 'Automatic level roles (/seviye-odul)', 'Available']]],
    economy: ['Economy', 'Engagement', 'Manage currency, balances, transactions and rewards.',
      [['◌', 'Currency', 'Server economy (/bakiye)', 'Available'],
       ['▣', 'Balances', 'Member balances and daily rewards', 'Available'],
       ['↗', 'Transactions', 'Recent economy activity', '—']]],
    welcome: ['Welcome', 'Onboarding', 'Make every new member feel at home.',
      [['✦', 'Welcome message', 'First impression content', 'Not configured'],
       ['⌂', 'Auto role', 'New member role (/otorol)', 'Available'],
       ['#', 'Welcome channel', 'Where members arrive', 'Not configured']]],
    tickets: ['Tickets', 'Support', 'Give your community a clear path to help.',
      [['□', 'Open tickets', 'Active support requests', '—'],
       ['✓', 'Closed tickets', 'Resolved requests', '—'],
       ['◈', 'Support team', 'Staff with ticket access', '—']]],
    music: ['Music', 'Voice', 'Manage the VYBot voice player and queue defaults.',
      [['♫', 'Music player', 'Play and control voice audio (/cal)', 'Available'],
       ['◌', 'Queue', 'View and manage the current queue (/kuyruk)', 'Available'],
       ['◉', 'Voice controls', 'Skip, stop and leave voice channels', 'Available']]],
    giveaway: ['Giveaway', 'Engagement', 'Create fair, button-based community giveaways.',
      [['✧', 'Giveaway engine', 'Start giveaways with /cekilis', 'Available'],
       ['#', 'Winner count', 'Configure default winners and duration', 'Configurable'],
       ['✓', 'Entry tracking', 'Track button entries and select winners', 'Available']]],
    roles: ['Role Panels', 'Community', 'Let members choose roles from interactive panels.',
      [['◆', 'Role panel', 'Create a button role panel (/rol-panel)', 'Available'],
       ['♙', 'Self-assign roles', 'Manage selectable server roles', 'Configurable'],
       ['#', 'Panel channel', 'Choose where role panels are published', 'Configurable']]],
    tools: ['Tools', 'Utilities', 'Server information and bot utility commands.',
      [['⌁', 'Server info', 'Inspect server and bot status (/sunucu)', 'Available'],
       ['◉', 'Bot status', 'Latency, uptime and gateway health (/sistem)', 'Live'],
       ['?', 'Help', 'Browse all available VYBot commands (/yardim)', 'Available']]],
    logs: ['Logs', 'Audit', 'Message, member, channel and role events.',
      [['≡', 'Mod-log', 'Moderation event log (/modlog)', 'Available'],
       ['▣', 'Message logs', 'Deleted / edited messages', '—'],
       ['◆', 'Role & channel logs', 'Permission changes', '—']]],
  };
function contentFor(rootEl) {
    if (state.view === 'overview') return overview();
    if (state.view === 'analytics') return analytics();
    if (state.view === 'welcome') return welcomeView();
    if (state.view === 'settings') return settingsView(rootEl);
    if (state.view === 'leaderboard') return leaderboardView();
    if (state.view === 'logs') return logsView();
    const workspace = workspaceView(state.view);
    if (workspace) return workspace;
    const mv = MODULE_VIEWS[state.view];
    if (mv) return genericView(...mv);
    return overview();
  }

  function render() {
    const guild = pguild();
    const bot = pbot();
    const online = guild ? Boolean(guild.botOnline) : null;
    const updated = updatedAt();
    const leaderboard = (guild && guild.leaderboard) || [];
    const guildName = (guild && guild.name) || 'No server connected';
    const list = guildList();
    const statusTxt = online === null ? '—' : online ? 'Online' : 'Offline';
    const statusTone = online === true ? 'good' : online === false ? 'bad' : '';
    const latency = bot.ping != null ? `${bot.ping}ms` : '—';

    const guildChips = list.length > 1
      ? `<div class="pro-guild-list">${list.map((g) => `<button class="pro-guild-chip ${guild && String(g.id) === String(guild.id) ? 'active' : ''}" type="button" data-guild-id="${esc(g.id)}">${esc(g.name)}</button>`).join('')}</div>`
      : '';

    const activity = activityRows(guild);

    const userLabel = state.user ? (state.user.global_name || state.user.username || 'Connected') : null;
    const userButton = userLabel
      ? `<button class="pro-user-button" type="button"><span class="pro-avatar">${esc(userLabel[0].toUpperCase())}</span> ${esc(userLabel)}⌄</button>`
      : `<button class="pro-user-button pro-signin" type="button" data-pro-signin="1">Sign in with Discord</button>`;

    root.innerHTML = `<div class="pro-app">
      <aside class="pro-sidebar">
        <div class="pro-brand"><span>V</span><strong>VyBots</strong></div>
        <button class="pro-server-select" type="button"><span class="pro-server-avatar">${esc(((guild && guild.name) || 'V')[0].toUpperCase())}</span><span><strong>${esc(guildName)}</strong><small>${hasLive() ? (guild ? 'Connected server' : 'No live telemetry') : 'Waiting for telemetry'}</small></span><b>⌄</b></button>
        ${guildChips}
        <nav class="pro-main-nav">${nav()}</nav>
        <div class="pro-sidebar-footer"><span class="pro-status-dot ${statusTone}"></span><span>${statusTxt === '—' ? 'No telemetry' : (statusTxt === 'Online' ? 'Bot online' : 'Bot offline')}<small>${updated ? 'Synced ' + new Date(updated).toLocaleTimeString() + ' · refresh 10s' : (hasLive() ? 'Waiting sync…' : 'Waiting for live data')}</small></span></div>
      </aside>
      <main class="pro-main">
        <header class="pro-header">
          <div class="pro-breadcrumb">Server workspace <span>/</span> ${esc(guildName)}</div>
          <div class="pro-header-actions"><label class="pro-search">⌕ <input placeholder="Search server..." aria-label="Search server"></label><button class="pro-icon-button" type="button">♧</button>${userButton}</div>
        </header>
        <div class="pro-content">${contentFor(root)}</div>
      </main>
      <aside class="pro-right-rail">
        <section class="pro-rail-card"><div class="pro-rail-title"><h2>Server health</h2><span>›</span></div>${statusRow('Bot status', statusTxt, statusTone)}${statusRow('API status', hasLive() ? 'Operational' : 'Awaiting telemetry', hasLive() ? 'good' : '')}${statusRow('Latency', latency, '')}${statusRow('Uptime', fmtUptime(bot.uptimeSeconds), '')}</section>
        <section class="pro-rail-card"><div class="pro-rail-title"><h2>Recent activity</h2><span>›</span></div>${activity}</section>
      </aside>
    </div>`;

    root.querySelectorAll('[data-pro-route]').forEach((button) =>
      button.addEventListener('click', () => {
        state.view = button.dataset.proRoute;
        const url = new URL(location.href);
        url.searchParams.set('view', state.view);
        history.pushState({}, '', url);
        render();
      })
    );
    root.querySelectorAll('[data-guild-id]').forEach((button) =>
      button.addEventListener('click', () => {
        state.guildId = button.dataset.guildId;
        loadPrefs();
        render();
        syncGuildSettings();
      })
    );
    root.querySelectorAll('[data-open-settings]').forEach((button) =>
    button.addEventListener('click', () => {
      state.view = 'settings';
      const url = new URL(location.href);
      url.searchParams.set('view', 'settings');
      history.pushState({}, '', url);
      render();
    })
    );
    root.querySelectorAll('[data-workspace-action]').forEach((button) =>
      button.addEventListener('click', () => {
        const action = button.dataset.workspaceAction || '';
        if (action === 'leveling-0') {
          state.view = 'leaderboard';
        } else if (action === 'tools-1') {
          state.view = 'settings';
        } else {
          state.view = 'settings';
        }
        const url = new URL(location.href);
        url.searchParams.set('view', state.view);
        history.pushState({}, '', url);
        render();
      })
    );

    /* ---------- interaktif ayarlar ---------- */
    bindToggles(root);
    root.querySelector('[data-save]')?.addEventListener('click', () => saveNow(root));
    root.querySelector('[data-pro-signin]')?.addEventListener('click', () => {
      if (typeof window.__vybotStartLogin === 'function') window.__vybotStartLogin();
      else if (cfg.oauthRedirectUri) window.location.assign(cfg.oauthRedirectUri);
    });
    const saveBanner = root.querySelector('[data-save-state]');
    if (saveBanner) {
      const update = () => {
        const kind = saveBanner.getAttribute('data-save-state');
        saveBanner.className = 'pro-save-banner ' + (kind === 'saved' ? 'ok' : kind === 'dirty' || kind === 'saving' ? 'dirty' : kind === 'error' ? 'err' : '');
        saveBanner.querySelector('.t').textContent =
          kind === 'saved' ? '✓ Saved to the bot over HTTPS.'
          : kind === 'dirty' ? '● Unsaved changes — click "Save changes".'
          : kind === 'saving' ? 'Saving…'
          : kind === 'error' ? 'Could not reach the bot API. Sign in and try again after the host reconnects.'
          : 'Changes are stored locally in this browser.';
      };
      update();
      new MutationObserver(update).observe(saveBanner, { attributes: true, attributeFilter: ['data-save-state'] });
    }
  }

  async function syncGuildSettings() {
    const guild = pguild();
    const token = discordAccessToken();
    const base = apiBase();
    if (!guild || !guild.id || !token || !base) return;
    try {
      const response = await fetch(`${base}/api/guilds/${encodeURIComponent(guild.id)}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload || !payload.settings) return;
      guild.settings = { ...(guild.settings || {}), ...payload.settings };
      if (state.view === 'settings') render();
    } catch {
      // Public telemetry remains usable when the optional settings bridge is offline.
    }
  }

  function loadLive(silent) {
    if (!liveDataUrl) { state.loading = false; state.error = true; render(); return; }
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    Promise.race([
      fetch(liveDataUrl, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }),
      timeout,
    ])
      .then(async (data) => {
        if (cfg.tunnelUrl && !cfg.botApiUrl) {
          try {
            const tr = await fetch(cfg.tunnelUrl, { cache: 'no-store' });
            if (tr.ok) {
              const t = await tr.json();
              if (t && t.apiUrl) state.tunnelUrl = t.apiUrl;
            }
          } catch {
            /* tunnel.json henuz yok olabilir */
          }
        }
        const key = JSON.stringify(data) + '|' + (state.tunnelUrl || '');
        if (!silent || key !== state.lastKey) {
          state.lastKey = key;
          state.live = data;
          recordTelemetryHistory(data);
          state.loading = false;
          state.error = false;
          render();
          syncGuildSettings();
        }

        async function syncGuildSettings() {
          const guild = pguild();
          const token = discordAccessToken();
          const base = apiBase();
          if (!guild || !guild.id || !token || !base) return;
          try {
            const response = await fetch(`${base}/api/guilds/${encodeURIComponent(guild.id)}/settings`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            });
            if (!response.ok) return;
            const payload = await response.json();
            if (!payload || !payload.settings) return;
            guild.settings = { ...(guild.settings || {}), ...payload.settings };
            if (state.view === 'settings') render();
          } catch {
            // Public telemetry remains usable when the optional settings bridge is offline.
          }
        }
      })
      .catch(() => {
        if (!silent) {
          state.loading = false;
          state.error = true;
          render();
        }
      });
  }

  window.addEventListener('popstate', () => {
    state.view = new URLSearchParams(location.search).get('view') || 'overview';
    render();
  });
  window.addEventListener('vybot:server-data', (event) => {
    state.auth = event.detail || null;
    state.loading = false;
    state.error = false;
    render();
  });
  window.addEventListener('vybot:auth-user', (event) => {
    state.user = event.detail || null;
    render();
    syncGuildSettings();
  });

  render();
  loadLive(false);
  /* HER 10 SANİYEDE BİR sessiz canlı yenileme — kullanıcı etkileşimine dokunmaz */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches || true) {
    setInterval(() => loadLive(true), 10000);
  }
})();