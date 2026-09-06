'use strict';

const http = require('http');
const { upsertGuildSettings, getGuildSettings } = require('./github-file');

const PORT = parseInt(process.env.VYBOT_API_PORT || '8788', 10);
const TOKEN = process.env.VYBOT_API_TOKEN || '';

function send(res, status, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
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

function authorized(req) {
  const got = req.headers['x-vybot-token'] || '';
  return TOKEN && got === TOKEN;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, role: 'internal-api' });
      return;
    }

    const match = /^\/api\/guilds\/([^/]+)\/settings\/?$/.exec(url.pathname);
    if (!match) {
      send(res, 404, { error: 'not_found' });
      return;
    }
    if (!authorized(req)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }

    const guildId = decodeURIComponent(match[1]);
    if (req.method === 'GET') {
      send(res, 200, { ok: true, settings: await getGuildSettings(guildId) });
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'method_not_allowed' });
      return;
    }

    const raw = (await readBody(req)).toString('utf8') || '{}';
    let prefs = {};
    try {
      prefs = JSON.parse(raw);
    } catch {
      send(res, 400, { error: 'invalid_json' });
      return;
    }
    const saved = await upsertGuildSettings(guildId, prefs);
    send(res, 200, { ok: true, settings: saved });
  } catch (err) {
    send(res, 500, { error: 'internal_api_error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('vybot internal api listening on 127.0.0.1:' + PORT);
});
