'use strict';

const https = require('https');

const apiUrl = (process.argv[2] || '').trim().replace(/\/$/, '');
const repo = process.env.GITHUB_REPOSITORY || 'IOUWDIHYUWDAIHGAWDYUGAWDUYAWGYGWDYWYDWA/eaa77e0f1551fadd';
const token = process.env.GH_PERSONAL_TOKEN || process.env.GITHUB_TOKEN;
const branch = 'live-data';
const pathName = 'tunnel.json';

if (!apiUrl || !/^https:\/\/[a-z0-9.-]+/i.test(apiUrl)) {
  console.error('publish-tunnel-url: valid https url required');
  process.exit(1);
}
if (!token) {
  console.error('publish-tunnel-url: GH_PERSONAL_TOKEN or GITHUB_TOKEN missing');
  process.exit(1);
}

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
          'User-Agent': 'vybot-tunnel-publish',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
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
            reject(new Error('GitHub API ' + res.statusCode + ' ' + (data.message || raw.slice(0, 200))));
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

(async () => {
  const contentsPath = `/repos/${repo}/contents/${pathName}?ref=${branch}`;
  let sha;
  try {
    const existing = await gh('GET', contentsPath);
    sha = existing.sha;
  } catch {
    sha = undefined;
  }

  const file = {
    apiUrl,
    updatedAt: new Date().toISOString(),
  };
  const message = 'chore: update dashboard tunnel url';
  await gh('PUT', `/repos/${repo}/contents/${pathName}`, {
    message,
    content: Buffer.from(JSON.stringify(file, null, 2), 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  });
  console.log('tunnel.json updated on live-data');
})().catch((err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
