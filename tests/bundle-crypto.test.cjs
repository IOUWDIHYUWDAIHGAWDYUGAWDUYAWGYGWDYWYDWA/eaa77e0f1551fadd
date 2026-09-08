'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { encrypt, decrypt, readKey } = require('../scripts/bundle-crypto');
const key = crypto.randomBytes(32);
const plain = Buffer.from('ZIP-like binary test\x00\xff');
test('authenticated format round-trips arbitrary bytes', () => {
  const sealed = encrypt(plain, key);
  assert.equal(sealed.subarray(0, 8).toString(), 'VYBOTENC');
  assert.deepEqual(decrypt(sealed, key), plain);
});
test('each encryption uses a fresh nonce', () => assert.notDeepEqual(encrypt(plain, key), encrypt(plain, key)));
test('wrong key is rejected', () => assert.throws(() => decrypt(encrypt(plain, key), crypto.randomBytes(32))));
test('tampering is rejected', () => {
  const sealed = encrypt(plain, key);
  for (const i of [8, 9, 21, 37]) {
    const bad = Buffer.from(sealed); bad[i] ^= 1;
    assert.throws(() => decrypt(bad, key));
  }
});
test('truncated bundle is rejected', () => assert.throws(() => decrypt(encrypt(plain, key).subarray(0, 25), key)));
test('deployed legacy CBC remains readable', () => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  assert.deepEqual(decrypt(Buffer.concat([iv, cipher.update(plain), cipher.final()]), key), plain);
});
test('missing and malformed keys fail closed', () => {
  const before = process.env.DECRYPTION_KEY;
  delete process.env.DECRYPTION_KEY;
  try {
    for (const raw of [undefined, 'abc', 'z'.repeat(64)]) assert.throws(() => readKey(['node', 'script', raw]));
    assert.deepEqual(readKey(['node', 'script', key.toString('hex')]), key);
  } finally { if (before !== undefined) process.env.DECRYPTION_KEY = before; }
});
function workspace(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vybot-crypto-test-'));
  try {
    for (const f of ['encrypt.js', 'decrypt.js', 'scripts/bundle-crypto.js']) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.copyFileSync(path.join(__dirname, '..', f), path.join(dir, f));
    }
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src/index.js'), 'throw new Error("SOURCE MUST NEVER EXECUTE");\n');
    fs.writeFileSync(path.join(dir, 'src/deploy-commands.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(dir, 'src/config.js'), 'module.exports = { value: 1 };\n');
    const run = (file, supplied = key.toString('hex')) => spawnSync(process.execPath, [path.join(dir, file)], { env: { ...process.env, DECRYPTION_KEY: supplied }, encoding: 'utf8' });
    fn(dir, run);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('CLI round-trip preserves source and never logs the key', () => workspace((dir, run) => {
  const expected = fs.readFileSync(path.join(dir, 'src/index.js'));
  for (const file of ['encrypt.js', 'decrypt.js']) {
    const result = run(file); assert.equal(result.status, 0, result.stderr);
    assert.ok(!(result.stdout + result.stderr).includes(key.toString('hex')));
  }
  assert.deepEqual(fs.readFileSync(path.join(dir, 'src/index.js')), expected);
  assert.ok(!fs.readdirSync(dir).some(n => n.startsWith('.bundle-stage-')));
}));
test('failed CLI decryption does not replace source', () => workspace((dir, run) => {
  assert.equal(run('encrypt.js').status, 0);
  fs.writeFileSync(path.join(dir, 'src/keep.txt'), 'keep');
  assert.notEqual(run('decrypt.js', crypto.randomBytes(32).toString('hex')).status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'src/keep.txt'), 'utf8'), 'keep');
}));
test('missing key does not overwrite the existing encrypted bundle', () => workspace((dir, run) => {
  fs.writeFileSync(path.join(dir, 'bundle.enc'), 'old');
  assert.notEqual(run('encrypt.js', '').status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'bundle.enc'), 'utf8'), 'old');
}));
test('path traversal ZIP is rejected without replacing source', () => workspace((dir, run) => {
  const zip = path.join(dir, 'bad.zip');
  execFileSync('python3', ['-c', 'import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"w") as z: z.writestr("../escape.txt","unsafe")', zip]);
  fs.writeFileSync(path.join(dir, 'bundle.enc'), encrypt(fs.readFileSync(zip), key));
  assert.notEqual(run('decrypt.js').status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'src/index.js')));
  assert.ok(!fs.existsSync(path.join(dir, 'escape.txt')));
}));
test('legacy CBC ZIP and missing-comma repair remain compatible', () => workspace((dir, run) => {
  fs.writeFileSync(path.join(dir, 'src/config.js'), 'module.exports = {\n a: 1\n b: 2\n};\n');
  assert.equal(run('encrypt.js').status, 0);
  const bytes = decrypt(fs.readFileSync(path.join(dir, 'bundle.enc')), key);
  const iv = crypto.randomBytes(16), c = crypto.createCipheriv('aes-256-cbc', key, iv);
  fs.writeFileSync(path.join(dir, 'bundle.enc'), Buffer.concat([iv, c.update(bytes), c.final()]));
  assert.equal(run('decrypt.js').status, 0);
  assert.ok(fs.readFileSync(path.join(dir, 'src/config.js'), 'utf8').includes('a: 1,'));
}));
