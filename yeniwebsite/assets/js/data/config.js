/* PUBLIC configuration only. Never put a bot token or client secret here. */
window.VYBOT_CONFIG = Object.freeze({
  clientId: '1545157265831759903',
  invitePermissions: '1100349828182',
  // Same-origin Node server: leave empty. Subdirectory hosting: e.g. '/vybot/api/'.
  // A separate API domain requires a reverse proxy; cross-origin cookies are not enabled.
  apiBase: '',
  // Optional PUBLIC aggregate status feed. Do not publish guild settings or member data.
  // Empty uses the Node server's /api/status endpoint.
  liveDataUrl: '',
  liveDataTimeoutMs: 8000,
  statusMaxAgeMs: 300000,
  siteUrl: ''
});
