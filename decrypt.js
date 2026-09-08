'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { readKey, decrypt } = require('./scripts/bundle-crypto');
let temp;
let staging;
try {
  const key = readKey();
  const plain = decrypt(fs.readFileSync(path.join(__dirname, 'bundle.enc')), key);
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vybot-open-'));
  const zipPath = path.join(temp, 'source.zip');
  fs.writeFileSync(zipPath, plain, { mode: 0o600 });
  const extracted = path.join(temp, 'files');
  const script = `import pathlib, stat, sys, zipfile
root = pathlib.Path(sys.argv[2]); root.mkdir(mode=0o700)
with zipfile.ZipFile(sys.argv[1]) as z:
    infos = z.infolist()
    if len(infos) > 20000 or sum(i.file_size for i in infos) > 100_000_000:
        raise ValueError('Archive exceeds limits')
    seen = set()
    for i in infos:
        name = i.filename.replace(chr(92), '/')
        p = pathlib.PurePosixPath(name)
        if p.is_absolute() or '..' in p.parts or any(':' in x for x in p.parts) or stat.S_ISLNK(i.external_attr >> 16):
            raise ValueError('Unsafe archive entry')
        if not p.parts: continue
        canonical = p.as_posix()
        if canonical in seen: raise ValueError('Duplicate archive entry')
        seen.add(canonical)
        target = root.joinpath(*p.parts)
        if i.is_dir() or name.endswith('/'):
            target.mkdir(parents=True, exist_ok=True, mode=0o700)
        else:
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            target.write_bytes(z.read(i)); target.chmod(0o600)
`;
  execFileSync('python3', ['-c', script, zipPath, extracted], { stdio: 'pipe' });
  const hasEntry = dir => fs.existsSync(path.join(dir, 'index.js')) && fs.existsSync(path.join(dir, 'deploy-commands.js'));
  const source = hasEntry(path.join(extracted, 'src')) ? path.join(extracted, 'src') : extracted;
  if (!hasEntry(source)) throw new Error('Archive must contain index.js and deploy-commands.js under src/ or its root.');
  const configPath = path.join(source, 'config.js');
  if (fs.existsSync(configPath)) {
    // Preserve the deployed decoder's missing-comma repair, without executing source code.
    let current = fs.readFileSync(configPath, 'utf8');
    for (let attempt = 0; ; attempt++) {
      try {
        new vm.Script(current, { filename: 'config.js' });
        if (attempt) fs.writeFileSync(configPath, current, { mode: 0o600 });
        break;
      } catch (err) {
        if (attempt >= 30) throw new Error('config.js syntax validation failed; existing src was not replaced.');
        const match = /config\.js:(\d+)/.exec(String(err.stack));
        if (!match) throw new Error('config.js syntax validation failed.');
        const lines = current.split(/\r?\n/);
        let changed = false;
        for (let i = Number(match[1]) - 2; i >= 0; i--) {
          const line = lines[i].trim();
          if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
          if (line.endsWith(',')) break;
          lines[i] = lines[i].replace(/\s+$/, '') + ',';
          changed = true;
          break;
        }
        if (!changed) throw new Error('config.js syntax validation failed; existing src was not replaced.');
        current = lines.join(current.includes('\r\n') ? '\r\n' : '\n');
      }
    }
  }
  // Stage on the same filesystem, then replace only after validation succeeds.
  staging = fs.mkdtempSync(path.join(__dirname, '.bundle-stage-'));
  const next = path.join(staging, 'src');
  const backup = path.join(staging, 'previous-src');
  const destination = path.join(__dirname, 'src');
  fs.cpSync(source, next, { recursive: true });
  const hadPrevious = fs.existsSync(destination);
  if (hadPrevious) fs.renameSync(destination, backup);
  try { fs.renameSync(next, destination); }
  catch (err) { if (hadPrevious) fs.renameSync(backup, destination); throw err; }
  console.log('Source decrypted and validated. No secret values were logged.');
} catch (err) {
  console.error(err.message.startsWith('Command failed') ? 'Archive validation failed. Existing source was not replaced.' : err.message);
  process.exitCode = 1;
} finally {
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  if (staging) fs.rmSync(staging, { recursive: true, force: true });
}
