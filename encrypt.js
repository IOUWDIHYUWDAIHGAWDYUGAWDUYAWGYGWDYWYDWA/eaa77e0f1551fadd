'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readKey, encrypt, decrypt } = require('./scripts/bundle-crypto');
let temp;
let outputTemp;
try {
  const key = readKey();
  const root = __dirname;
  if (!fs.existsSync(path.join(root, 'src/index.js')) || !fs.existsSync(path.join(root, 'src/deploy-commands.js'))) {
    throw new Error('src/index.js and src/deploy-commands.js are required.');
  }
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vybot-pack-'));
  const zipPath = path.join(temp, 'source.zip');
  const script = `import os, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as z:
    for current, dirs, names in os.walk(root / 'src', followlinks=False):
        for name in dirs + names:
            if (pathlib.Path(current) / name).is_symlink():
                raise ValueError('Symlinks are not allowed')
        for name in sorted(names):
            p = pathlib.Path(current) / name
            if name == '.env' or name.startswith('.env.') or name == 'cookies.txt':
                raise ValueError('Keep runtime credentials outside the source archive')
            z.write(p, p.relative_to(root).as_posix())
    runner = root / 'runner.js'
    if runner.is_symlink():
        raise ValueError('Symlinks are not allowed')
    if runner.is_file():
        z.write(runner, 'runner.js')
os.chmod(sys.argv[2], 0o600)
`;
  execFileSync('python3', ['-c', script, root, zipPath], { stdio: 'pipe' });
  const plain = fs.readFileSync(zipPath);
  const sealed = encrypt(plain, key);
  if (!decrypt(sealed, key).equals(plain)) throw new Error('Encryption round-trip verification failed.');
  outputTemp = path.join(root, '.bundle.enc-' + process.pid + '.tmp');
  fs.writeFileSync(outputTemp, sealed, { mode: 0o600, flag: 'wx' });
  fs.renameSync(outputTemp, path.join(root, 'bundle.enc'));
  console.log('bundle.enc created: authenticated encryption and byte-for-byte round-trip verified.');
} catch (err) {
  console.error(err.message.startsWith('Command failed') ? 'Archive creation failed. Check source paths and Python 3 availability.' : err.message);
  process.exitCode = 1;
} finally {
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  if (outputTemp) fs.rmSync(outputTemp, { force: true });
}
