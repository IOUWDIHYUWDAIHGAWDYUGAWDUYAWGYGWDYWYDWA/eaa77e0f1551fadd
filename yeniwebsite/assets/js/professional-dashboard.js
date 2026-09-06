(() => {
  'use strict';

  const root = document.getElementById('pro-dashboard');
  if (!root) return;

  const MOCK = {
    members: 12482,
    online: 2184,
    bots: 142,
    boosts: 87,
    messages: 8421,
    latency: 42,
    uptime: '99.98%',
    activity: [
      ['Member joined', '@Solaris#4821', '2m ago', 'member'],
      ['User was muted', '@Grim#3012', '7m ago', 'mute'],
      ['Member joined', '@Luna#7710', '12m ago', 'member'],
      ['Message deleted', '#general', '18m ago', 'delete'],
      ['User was banned', '@Rogue#9934', '26m ago', 'ban'],
      ['Role created', 'Moderator', '31m ago', 'role'],
      ['Message sent', '#bot-commands', '42m ago', 'message'],
    ],
    channels: [
      ['general', '2,843', 92, 'Text Channel'],
      ['bot-commands', '1,942', 71, 'Text Channel'],
      ['memes', '1,203', 48, 'Text Channel'],
      ['music', '892', 36, 'Voice Channel'],
      ['support', '671', 25, 'Text Channel'],
    ],
    membersTop: [
      ['Luna', '248,542', '73', '👑'],
      ['Solaris', '198,421', '62', ''],
      ['Zyro', '176,892', '58', ''],
      ['Nova', '152,317', '52', ''],
      ['Rogue', '134,221', '48', ''],
      ['Pixel', '118,904', '44', ''],
    ],
    growth: [28, 34, 31, 42, 48, 45, 53, 59, 58, 67, 72, 76, 74, 81, 88, 91, 96, 104, 108, 112, 119, 123, 131, 139, 147, 156, 165, 177, 188, 204],
    hourly: [12, 9, 7, 5, 6, 8, 13, 18, 27, 34, 39, 44, 51, 48, 56, 62, 55, 60, 70, 82, 96, 91, 72, 54],
  };

  const icons = {
    overview: '◉', analytics: '⌁', moderation: '◒', security: '◈', leveling: '✦', economy: '◌', welcome: '⌂', tickets: '□', logs: '≡', settings: '⚙',
    member: '●', mute: '◐', delete: '▣', ban: '×', role: '◆', message: '▰'
  };

  const state = { view: new URLSearchParams(location.search).get('view') || 'overview', guild: 'vybots', data: null };
  const routeViews = ['overview', 'analytics', 'moderation', 'security', 'leveling', 'economy', 'welcome', 'tickets', 'logs', 'settings'];

  function esc(value) { return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function metric(label, value, change, icon) { return `<article class="pro-kpi"><div class="pro-kpi-icon">${icon}</div><span>${label}</span><strong>${value}</strong><small><b>+${change}</b> vs. last 30 days</small></article>`; }
  function lineChart(values) { const max = Math.max(...values); const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 78 - 8}`).join(' '); return `<svg class="pro-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Member growth chart"><defs><linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2b7fff" stop-opacity=".42"/><stop offset="1" stop-color="#2b7fff" stop-opacity="0"/></linearGradient></defs><polygon points="0,100 ${points} 100,100" fill="url(#line-fill)"/><polyline points="${points}" fill="none" stroke="#4d95ff" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`; }
  function barChart(values) { return `<div class="pro-bar-chart">${values.map((v) => `<i style="height:${Math.max(10, (v / Math.max(...values)) * 100)}%"></i>`).join('')}</div>`; }
  function statusRow(label, value, tone = 'good') { return `<div class="pro-health-row"><span><i class="pro-status-dot ${tone}"></i>${label}</span><strong>${value}</strong></div>`; }

  function nav() {
    const items = [['overview','Overview'],['analytics','Analytics'],['moderation','Moderation'],['security','Security'],['leveling','Leveling'],['economy','Economy'],['welcome','Welcome'],['tickets','Tickets'],['logs','Logs'],['settings','Settings']];
    return items.map(([id, label]) => `<button class="pro-nav-item ${state.view === id ? 'active' : ''}" data-pro-route="${id}"><span>${icons[id]}</span>${label}</button>`).join('');
  }

  function overview() {
    return `<div class="pro-view-heading"><div><span class="pro-eyebrow">Server overview</span><h1>${esc(state.guild)}</h1><p><i class="pro-status-dot good"></i> Connected <span class="pro-divider">·</span> ${MOCK.members.toLocaleString()} members <span class="pro-divider">·</span> ${MOCK.latency}ms latency</p></div><div class="pro-heading-actions"><button class="pro-button primary">Invite Bot</button><button class="pro-button ghost">Manage</button></div></div><div class="pro-kpi-grid">${metric('Total Members', MOCK.members.toLocaleString(), '12.4%', '♙')}${metric('Online Members', MOCK.online.toLocaleString(), '18.7%', '●')}${metric('Bots', MOCK.bots, '5.2%', '▣')}${metric('Boosts', MOCK.boosts, '16.0%', '◆')}${metric('Messages Today', MOCK.messages.toLocaleString(), '24.3%', '▰')}</div><div class="pro-chart-grid"><section class="pro-card"><div class="pro-card-head"><div><span class="pro-eyebrow">Member growth</span><h2>Community growth</h2></div><button class="pro-select">Last 30 days⌄</button></div><div class="pro-chart-meta"><strong>+12.4%</strong><span>members vs. previous period</span></div><div class="pro-chart-frame">${lineChart(MOCK.growth)}<div class="pro-chart-axis"><span>Apr 12</span><span>Apr 20</span><span>Apr 28</span><span>May 6</span><span>May 10</span></div></div></section><section class="pro-card"><div class="pro-card-head"><div><span class="pro-eyebrow">Server activity</span><h2>Messages per hour</h2></div><button class="pro-select">Last 24 hours⌄</button></div><div class="pro-chart-meta"><strong>8,421</strong><span>messages today</span></div><div class="pro-chart-frame">${barChart(MOCK.hourly)}<div class="pro-chart-axis"><span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span></div></div></section></div><div class="pro-lower-grid"><section class="pro-card"><div class="pro-card-head"><h2>Most active channels</h2><a>View all</a></div>${MOCK.channels.map((c, i) => `<div class="pro-channel-row"><b>${i + 1}</b><span class="pro-channel-icon">#</span><div><strong>${c[0]}</strong><small>${c[3]}</small></div><em>${c[1]} messages</em><i><b style="width:${c[2]}%"></b></i></div>`).join('')}</section><section class="pro-card"><div class="pro-card-head"><h2>Top members</h2><a>View all</a></div>${MOCK.membersTop.map((m, i) => `<div class="pro-member-row"><b class="rank-${i + 1}">${i + 1}</b><span class="pro-avatar">${m[0][0]}</span><div><strong>${m[0]} ${m[3]}</strong><small>Level ${m[2]}</small></div><em>${m[1]} XP</em></div>`).join('')}</section></div>`;
  }

  function analytics() { return `<div class="pro-view-heading"><div><span class="pro-eyebrow">Analytics</span><h1>Understand your community</h1><p>Detailed member, message, command and voice telemetry for ${esc(state.guild)}.</p></div></div><div class="pro-kpi-grid">${metric('New Members', '+204', '14.8%', '♙')}${metric('Messages', '8,421', '24.3%', '▰')}${metric('Commands Used', '1,284', '8.1%', '⌁')}${metric('Voice Minutes', '1,742', '11.4%', '◉')}${metric('Retention', '84.6%', '6.2%', '↗')}</div><div class="pro-chart-grid"><section class="pro-card pro-chart-large"><div class="pro-card-head"><h2>Member growth · 30 days</h2><button class="pro-select">Daily⌄</button></div><div class="pro-chart-frame">${lineChart(MOCK.growth)}</div></section><section class="pro-card"><div class="pro-card-head"><h2>Messages · 24 hours</h2></div><div class="pro-chart-frame">${barChart(MOCK.hourly)}</div></section></div>`; }

  function settingsView() { return `<div class="pro-view-heading"><div><span class="pro-eyebrow">Settings</span><h1>Server configuration</h1><p>Manage your bot and server preferences from one place.</p></div></div><div class="pro-settings-grid">${['Command prefix','Default language','Mod-log channel','Timezone','Bot permissions','Data retention'].map((x, i) => `<section class="pro-card pro-setting-card"><span class="pro-eyebrow">Setting ${i + 1}</span><h2>${x}</h2><p>${i === 2 ? '#server-logs' : i === 1 ? 'English' : 'Configured for this server'}</p><button class="pro-button ghost">Edit</button></section>`).join('')}</div>`; }

  function genericView(title, eyebrow, description, rows) { return `<div class="pro-view-heading"><div><span class="pro-eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div><button class="pro-button primary">Configure</button></div><div class="pro-data-grid">${rows.map((r) => `<section class="pro-card pro-data-card"><span class="pro-data-icon">${r[0]}</span><div><h2>${r[1]}</h2><p>${r[2]}</p></div><strong>${r[3]}</strong></section>`).join('')}</div><section class="pro-card pro-table-card"><div class="pro-card-head"><h2>Recent configuration</h2><button class="pro-select">Filter⌄</button></div><div class="pro-table-empty"><span>✓</span><strong>${title} is ready to configure</strong><p>Your current server context is connected. Detailed controls are available in this section.</p><button class="pro-button primary">Open controls</button></div></section>`; }

  function render() {
    const content = state.view === 'overview' ? overview() : state.view === 'analytics' ? analytics() : state.view === 'settings' ? settingsView() : state.view === 'security' ? genericView('Security center', 'Protection', 'Keep your server safe with layered, transparent controls.', [['◈','Anti-Nuke','Channel and role deletion protection','Active'],['⚡','Anti-Spam','Flood and repeated message protection','Active'],['#','Anti-Link','Advertising and invite filter','Active'],['!','Anti-Swear','Configured word filter','Active'],['◌','Raid Protection','Rapid join detection','Ready'],['≡','Mod-log','Audit history and moderation events','Configured']]) : state.view === 'moderation' ? genericView('Moderation center','Moderation','Review warnings, mutes, bans, kicks and timeouts.', [['!','Warnings','Member warning history','0'],['◐','Mutes','Active timeouts','0'],['×','Bans','Current server bans','0'],['≡','Moderation logs','Recent staff actions','Live']]) : state.view === 'leveling' ? genericView('Leveling','Engagement','Build a more active community with XP, ranks and rewards.', [['✦','XP engine','Messages converted to XP','Active'],['♙','Leaderboard','Top member ranking','Live'],['◆','Role rewards','Automatic level roles','Ready']]) : state.view === 'economy' ? genericView('Economy','Engagement','Manage currency, balances, transactions and rewards.', [['◌','Currency','Server economy','Ready'],['▣','Balances','Member balances','Live'],['↗','Transactions','Recent economy activity','0']]) : state.view === 'welcome' ? genericView('Welcome','Onboarding','Make every new member feel at home.', [['✦','Welcome message','First impression content','Ready'],['⌂','Auto role','New member role','Not set'],['#','Welcome channel','Where members arrive','Not set']]) : state.view === 'tickets' ? genericView('Tickets','Support','Give your community a clear path to help.', [['□','Open tickets','Active support requests','0'],['✓','Closed tickets','Resolved requests','0'],['◈','Support team','Staff access','Ready']]) : state.view === 'logs' ? genericView('Server logs','Audit trail','Review important Discord events and bot actions.', [['≡','Mod-log','Moderation events','Live'],['◈','Security events','Protection triggers','Live'],['▰','Message events','Deleted and edited messages','Ready']]) : overview();
    root.innerHTML = `<div class="pro-app"><aside class="pro-sidebar"><div class="pro-brand"><span>V</span><strong>VyBots</strong></div><button class="pro-server-select"><span class="pro-server-avatar">V</span><span><strong>${esc(state.guild)}</strong><small>Connected server</small></span><b>⌄</b></button><nav class="pro-main-nav">${nav()}</nav><div class="pro-sidebar-footer"><span class="pro-status-dot good"></span><span>Bot online<small>All systems operational</small></span></div></aside><main class="pro-main"><header class="pro-header"><div class="pro-breadcrumb">Server workspace <span>/</span> ${esc(state.guild)}</div><div class="pro-header-actions"><label class="pro-search">⌕ <input placeholder="Search server..." aria-label="Search server"></label><button class="pro-icon-button">♧</button><button class="pro-user-button"><span class="pro-avatar">V</span> Vynex⌄</button></div></header><div class="pro-content">${content}</div></main><aside class="pro-right-rail"><section class="pro-rail-card"><div class="pro-rail-title"><h2>Server health</h2><span>›</span></div>${statusRow('Bot status','Online')}${statusRow('API status','Operational')}${statusRow('Latency',`${MOCK.latency}ms`)}${statusRow('Uptime',MOCK.uptime)}</section><section class="pro-rail-card"><div class="pro-rail-title"><h2>Recent activity</h2><a>View all</a></div>${MOCK.activity.slice(0, 7).map((a) => `<div class="pro-activity-row"><span class="pro-activity-icon ${a[3]}">${icons[a[3]] || '•'}</span><div><strong>${a[0]}</strong><small>${a[1]}</small></div><time>${a[2]}</time></div>`).join('')}</section></aside></div>`;
    root.querySelectorAll('[data-pro-route]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.proRoute; const url = new URL(location.href); url.searchParams.set('view', state.view); history.pushState({}, '', url); render(); }));
  }

  window.addEventListener('popstate', () => { state.view = new URLSearchParams(location.search).get('view') || 'overview'; render(); });
  window.addEventListener('vybot:server-data', (event) => { state.data = event.detail; render(); });
  render();
})();
