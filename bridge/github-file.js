'use strict';

const https = require('https');

const repo = process.env.GITHUB_REPOSITORY || 'IOUWDIHYUWDAIHGAWDYUGAWDUYAWGYGWDYWYDWA/eaa77e0f1551fadd';
const token = process.env.GH_PERSONAL_TOKEN || process.env.GITHUB_TOKEN;
const defaultBranch = process.env.VYBOT_SETTINGS_BRANCH || 'live-data';

function gh(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'vybot-bridge',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data = {};
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            data = { raw };
          }
          if (res.statusCode >= 400) {
            reject(new Error('GitHub API ' + res.statusCode + ' ' + (data.message || raw.slice(0, 160))));
            return;
          }
          resolve(data);
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function readJsonFile(pathName, branch) {
  const br = branch || defaultBranch;
  const existing = await gh('GET', `/repos/${repo}/contents/${pathName}?ref=${br}`);
  const text = Buffer.from(existing.content.replace(/\n/g, ''), 'base64').toString('utf8');
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return { json, sha: existing.sha };
}

async function writeJsonFile(pathName, json, message, sha, branch) {
  const br = branch || defaultBranch;
  return gh('PUT', `/repos/${repo}/contents/${pathName}`, {
    message,
    content: Buffer.from(JSON.stringify(json, null, 2), 'utf8').toString('base64'),
    branch: br,
    ...(sha ? { sha } : {}),
  });
}

async function upsertGuildSettings(guildId, prefs) {
  if (!token) throw new Error('missing_github_token');
  const pathName = 'guild-settings.json';
  let sha;
  let json = {};
  try {
    const existing = await readJsonFile(pathName, defaultBranch);
    json = existing.json && typeof existing.json === 'object' ? existing.json : {};
    sha = existing.sha;
  } catch {
    json = {};
  }
  json[guildId] = {
    ...(json[guildId] && typeof json[guildId] === 'object' ? json[guildId] : {}),
    ...prefs,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(pathName, json, 'chore: dashboard guild settings', sha, defaultBranch);
  return json[guildId];
}

async function getGuildSettings(guildId) {
  if (!token) return {};
  try {
    const existing = await readJsonFile('guild-settings.json', defaultBranch);
    const row = existing.json && existing.json[guildId];
    return row && typeof row === 'object' ? row : {};
  } catch {
    return {};
  }
}

module.exports = { upsertGuildSettings, getGuildSettings };
