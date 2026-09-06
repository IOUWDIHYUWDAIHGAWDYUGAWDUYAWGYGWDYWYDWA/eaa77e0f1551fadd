'use strict';

const http = require('http');
const https = require('https');

const BRIDGE_PORT = parseInt(process.env.VYBOT_BRIDGE_PORT || '8787', 10);
const BOT_API_ORIGIN = (process.env.BOT_API_ORIGIN || 'http://127.0.0.1:8788').replace(/\/$/, '');
const INTERNAL_TOKEN = process.env.VYBOT_API_TOKEN || '';
const CORS_ORIGIN =
  process.env.VYBOT_CORS_ORIGIN ||
  'https://iouwdihyuwdaihgawdyugawduyawgygwdywydwa.github.io';

const ADMIN = 0x8n;
const MANAGE_GUILD = 0x20n;

function send(res, status, body, extraHeaders) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    ...(extraHeaders || {}),
  };
  res.writeHead(status, headers);
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function discordGet(path, bearer) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'discord.com',
        path: `/api/v10${path}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${bearer}`, 'User-Agent': 'vybot-bridge' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = null;
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function canManageGuild(guild) {
  if (!guild) return false;
  if (guild.owner) return true;
  try {
    const p = BigInt(guild.permissions || '0');
    return (p & ADMIN) === ADMIN || (p & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

function proxyToBot(method, urlPath, bodyBuf) {
  const target = new URL(BOT_API_ORIGIN + urlPath);
  const lib = target.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-vybot-token': INTERNAL_TOKEN,
          'Content-Length': bodyBuf ? bodyBuf.length : 0,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on('error', reject);
    if (bodyBuf && bodyBuf.length) req.write(bodyBuf);
    req.end();
  });
}

function bearerFrom(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      send(res, 204, '');
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true });
      return;
    }

    const match = /^\/api\/guilds\/([^/]+)\/settings\/?$/.exec(url.pathname);
    if (!match || (req.method !== 'POST' && req.method !== 'GET')) {
      send(res, 404, { error: 'not_found' });
      return;
    }

    const guildId = decodeURIComponent(match[1]);
    const token = bearerFrom(req);
    if (!token) {
      send(res, 401, { error: 'missing_discord_token' });
      return;
    }

    const guildsRes = await discordGet('/users/@me/guilds', token);
    if (guildsRes.status === 401 || guildsRes.status === 403) {
      send(res, 401, { error: 'invalid_discord_token' });
      return;
    }
    if (guildsRes.status >= 400 || !Array.isArray(guildsRes.data)) {
      send(res, 502, { error: 'discord_unavailable' });
      return;
    }

    const guild = guildsRes.data.find((g) => g && g.id === guildId);
    if (!canManageGuild(guild)) {
      send(res, 403, { error: 'missing_guild_permission' });
      return;
    }

    if (req.method === 'GET') {
      try {
        const proxied = await proxyToBot('GET', `/api/guilds/${guildId}/settings`, Buffer.alloc(0));
        send(res, proxied.status || 200, proxied.body.toString('utf8') || '{"ok":true}');
      } catch {
        const { getGuildSettings } = require('./github-file');
        send(res, 200, { ok: true, settings: await getGuildSettings(guildId) });
      }
      return;
    }

    const bodyBuf = await readBody(req);
    try {
      const proxied = await proxyToBot('POST', `/api/guilds/${guildId}/settings`, bodyBuf);
      if (proxied.status && proxied.status < 500) {
        send(res, proxied.status, proxied.body.toString('utf8') || '{"ok":true}');
        return;
      }
    } catch {
      /* localhost API yoksa GitHub live-data kaydı */
    }
    let prefs = {};
    try {
      prefs = JSON.parse(bodyBuf.toString('utf8') || '{}');
    } catch {
      send(res, 400, { error: 'invalid_json' });
      return;
    }
    const { upsertGuildSettings } = require('./github-file');
    const saved = await upsertGuildSettings(guildId, prefs);
    send(res, 200, { ok: true, settings: saved });
  } catch (err) {
    send(res, 500, { error: 'bridge_error' });
  }
});

server.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log('vybot bridge listening on 127.0.0.1:' + BRIDGE_PORT);
});
