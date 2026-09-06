/**
 * VYBot — Professional Dashboard (GERÇEK VERİ)
 * ---------------------------------------------------------------------------
 * Tüm istatistikler canlı telemetriden gelir. Bot, her 5 dakikada bir
 * src/utils/liveDataSync.js ile "live-data" dalındaki live-data.json dosyasına
 * GERÇEK sunucu verisi yazar (üye sayısı, kanal/rol sayıları, ping, uptime,
 * liderlik tablosu …). Bu sayfa o dosyayı okur ve Discord OAuth verisini de
 * ("vybot:server-data" olayı) dinler.
 *
 * KURAL (Masterprompt 26 — Real Data Rule): Sahte sayı ASLA gösterilmez.
 * Veri yoksa "—" ve dürüst boş durum gösterilir.
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
    leveling: '✦', economy: '◌', welcome: '⌂', tickets: '□', logs: '≡', settings: '⚙',
  };

  const state = {
    view: new URLSearchParams(location.search).get('view') || 'overview',
    guildId: null,
    live: null,   // live-data.json yükü
    auth: null,   // vybot:server-data (Discord OAuth child mode)
    loading: true,
    error: false,
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

  function lbRows(leaderboard, max) {
    const lb = Array.isArray(leaderboard) ? leaderboard.slice(0, max || 6) : [];
    if (!lb.length) {
      return '<div class="pro-chart-empty">No leaderboard published yet — ranking appears once members earn XP.</div>';
    }
    return lb.map((m, i) => `<div class="pro-member-row ${rankCls(i)}"><b>#${i + 1}</b><em>Lv ${m.level || 0}</em><span>${esc(m.name || 'Unknown')}</span><strong>${fmtN(m.xp)} XP</strong></div>`).join('');
  }

  function nav() {
    const items = [
      ['overview', 'Overview'], ['analytics', 'Analytics'], ['moderation', 'Moderation'],
      ['security', 'Security'], ['leveling', 'Leveling'], ['economy', 'Economy'],
      ['welcome', 'Welcome'], ['tickets', 'Tickets'], ['logs', 'Logs'], ['settings', 'Settings'],
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
          <div class="pro-chart-frame">${emptyChart('Member history is not published yet — VYBot telemetry records current snapshots every 5 minutes.')}</div>
        </section>
        <section class="pro-card">
          <div class="pro-card-head"><div><span class="pro-eyebrow">Server activity</span><h2>Messages per hour</h2></div><button class="pro-select" type="button">Live snapshot⌄</button></div>
          <div class="pro-chart-meta"><strong>—</strong><span>message history not published yet</span></div>
          <div class="pro-chart-frame">${emptyChart('Waiting for message telemetry.')}</div>
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
    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">Analytics</span><h1>Understand your community</h1><p>Member, message, command and voice telemetry for ${esc(guildName)}.</p></div></div>
      <div class="pro-kpi-grid">
        ${metric('Total Members', members == null ? '—' : fmtN(members), has, '♙')}
        ${metric('New Members (30d)', '—', false, '↗')}
        ${metric('Messages (24h)', '—', false, '▰')}
        ${metric('Commands Used', '—', false, '⌁')}
        ${metric('Voice Minutes', '—', false, '◉')}
      </div>
      <div class="pro-chart-grid">
        <section class="pro-card pro-chart-large"><div class="pro-card-head"><h2>Member growth</h2><button class="pro-select" type="button">Live snapshot⌄</button></div><div class="pro-chart-frame">${emptyChart('Historical growth is not published yet. This chart activates when VYBot telemetry records history.')}</div></section>
        <section class="pro-card"><div class="pro-card-head"><h2>Messages · 24 hours</h2></div><div class="pro-chart-frame">${emptyChart('Message history is not published yet.')}</div></section>
      </div>`;
  }

  function settingsView() {
    const guild = pguild();
    const guildName = (guild && guild.name) || 'No server connected';
    const rows = [
      ['Command prefix', 'Slash commands — no prefix needed', '/'],
      ['Default language', 'Matches each user', 'Auto (TR / EN)'],
      ['Mod-log channel', 'Set with /modlog', '—'],
      ['Security guards', 'Anti-nuke, anti-link, anti-swear, anti-spam', 'Available'],
      ['Leveling engine', 'XP, ranks and level roles', 'Available'],
      ['Economy engine', 'Balance, daily and leaderboard', 'Available'],
    ];
    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">Settings</span><h1>Server configuration</h1><p>Manage VYBot behavior for ${esc(guildName)}.</p></div><button class="pro-button primary" type="button">Open Panel</button></div>
      <div class="pro-settings-grid">${rows.map(([h, d, v], i) => `<section class="pro-card pro-setting-card"><span class="pro-eyebrow">Setting ${i + 1}</span><h2>${esc(h)}</h2><p>${esc(d)}</p><strong>${esc(v)}</strong><button class="pro-button ghost" type="button">Edit</button></section>`).join('')}</div>`;
  }

  function genericView(title, eyebrow, description, rows) {
    return `
      <div class="pro-view-heading"><div><span class="pro-eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div><button class="pro-button primary" type="button">Configure</button></div>
      <div class="pro-data-grid">${rows.map((r) => `<section class="pro-card pro-data-card"><span class="pro-data-icon">${r[0]}</span><div><h2>${esc(r[1])}</h2><p>${esc(r[2])}</p></div><strong>${esc(r[3])}</strong></section>`).join('')}</div>`;
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
    logs: ['Logs', 'Audit', 'Message, member, channel and role events.',
      [['≡', 'Mod-log', 'Moderation event log (/modlog)', 'Available'],
       ['▣', 'Message logs', 'Deleted / edited messages', '—'],
       ['◆', 'Role & channel logs', 'Permission changes', '—']]],
  };
function contentFor() {
    if (state.view === 'overview') return overview();
    if (state.view === 'analytics') return analytics();
    if (state.view === 'settings') return settingsView();
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

    const activity = leaderboard.length
      ? leaderboard.slice(0, 5).map((m, i) => `<div class="pro-member-row ${rankCls(i)}"><b>#${i + 1}</b><em>Lv ${m.level || 0}</em><span>${esc(m.name || 'Unknown')}</span><strong>${fmtN(m.xp)} XP</strong></div>`).join('')
      : '<div class="pro-chart-empty">No activity published yet.</div>';

    root.innerHTML = `<div class="pro-app">
      <aside class="pro-sidebar">
        <div class="pro-brand"><span>V</span><strong>VyBots</strong></div>
        <button class="pro-server-select" type="button"><span class="pro-server-avatar">${esc(((guild && guild.name) || 'V')[0].toUpperCase())}</span><span><strong>${esc(guildName)}</strong><small>${hasLive() ? (guild ? 'Connected server' : 'No live telemetry') : 'Waiting for telemetry'}</small></span><b>⌄</b></button>
        ${guildChips}
        <nav class="pro-main-nav">${nav()}</nav>
        <div class="pro-sidebar-footer"><span class="pro-status-dot ${statusTone}"></span><span>${statusTxt === '—' ? 'No telemetry' : (statusTxt === 'Online' ? 'Bot online' : 'Bot offline')}<small>${updated ? 'Synced ' + new Date(updated).toLocaleTimeString() : (hasLive() ? 'Waiting sync…' : 'Waiting for live data')}</small></span></div>
      </aside>
      <main class="pro-main">
        <header class="pro-header">
          <div class="pro-breadcrumb">Server workspace <span>/</span> ${esc(guildName)}</div>
          <div class="pro-header-actions"><label class="pro-search">⌕ <input placeholder="Search server..." aria-label="Search server"></label><button class="pro-icon-button" type="button">♧</button><button class="pro-user-button" type="button"><span class="pro-avatar">?</span> Guest⌄</button></div>
        </header>
        <div class="pro-content">${contentFor()}</div>
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
        render();
      })
    );
  }

  function loadLive() {
    if (!liveDataUrl) { state.loading = false; state.error = true; render(); return; }
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    Promise.race([
      fetch(liveDataUrl, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }),
      timeout,
    ])
      .then((data) => { state.live = data; state.loading = false; state.error = false; render(); })
      .catch(() => { state.loading = false; state.error = true; render(); });
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

  render();
  loadLive();
})();