const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const keyHex = process.argv[2];
if (!keyHex) {
  console.error('KULLANIM: node decrypt.js <HEX_KEY>');
  process.exit(1);
}

const key = Buffer.from(keyHex, 'hex');
if (key.length !== 32) {
  console.error('HATA: Anahtar 32 byte olmali.');
  process.exit(1);
}

const enc = fs.readFileSync('bundle.enc');
const iv = enc.slice(0, 16);
const ciphertext = enc.slice(16);
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
const zip = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
fs.writeFileSync('bundle.zip', zip);
console.log('Decrypt tamam: ' + zip.length + ' byte');

const tmpDir = '/tmp/vybot_' + Date.now();
fs.mkdirSync(tmpDir, { recursive: true });

const pyScript = path.join(tmpDir, 'extract.py');
fs.writeFileSync(
  pyScript,
  [
    'import zipfile, sys',
    'with zipfile.ZipFile(sys.argv[1], "r") as z:',
    '    z.extractall(sys.argv[2])',
    '    print("Cikarildi: %d dosya" % len(z.namelist()))',
  ].join('\n'),
  'utf8'
);
execSync(`python3 "${pyScript}" bundle.zip "${tmpDir}"`, { encoding: 'utf8', stdio: 'inherit' });

function rewriteWindowsZipNames(root) {
  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    if (name === 'extract.py') continue;
    if (name.includes('\\') || name.includes('/')) {
      const parts = name.replace(/\\/g, '/').split('/').filter((p) => p && p !== '.' && p !== '..');
      if (!parts.length) continue;
      const dest = path.join(root, ...parts);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(full, dest);
      continue;
    }
    if (fs.statSync(full).isDirectory()) rewriteWindowsZipNames(full);
  }
}

rewriteWindowsZipNames(tmpDir);

function hasBotEntry(dir) {
  return fs.existsSync(path.join(dir, 'index.js')) || fs.existsSync(path.join(dir, 'deploy-commands.js'));
}

const srcDir = path.join(__dirname, 'src');
if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
fs.mkdirSync(srcDir, { recursive: true });

const extractedSrc = path.join(tmpDir, 'src');
let copiedFrom = '';
if (hasBotEntry(extractedSrc)) {
  fs.cpSync(extractedSrc, srcDir, { recursive: true });
  copiedFrom = 'tmp/src';
} else if (hasBotEntry(tmpDir)) {
  for (const f of fs.readdirSync(tmpDir)) {
    if (f === 'extract.py') continue;
    fs.cpSync(path.join(tmpDir, f), path.join(srcDir, f), { recursive: true });
  }
  copiedFrom = 'tmp kok';
} else {
  console.error('HATA: ZIP icinde src/index.js veya deploy-commands.js bulunamadi.');
  console.error('tmp icerik: ' + fs.readdirSync(tmpDir).join(', '));
  process.exit(1);
}

function listFiles(dir, prefix) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    if (fs.statSync(full).isDirectory()) out.push(...listFiles(full, rel));
    else out.push(rel);
  }
  return out;
}

const srcFiles = listFiles(srcDir, '');
console.log('src/ kaynagi: ' + copiedFrom);
console.log('src/ dosyalari: ' + srcFiles.join(', '));

const deployPath = path.join(srcDir, 'deploy-commands.js');
const indexPath = path.join(srcDir, 'index.js');
if (!fs.existsSync(deployPath) || !fs.existsSync(indexPath)) {
  console.error('HATA: Beklenen dosyalar yok.');
  console.error('deploy-commands.js:', fs.existsSync(deployPath));
  console.error('index.js:', fs.existsSync(indexPath));
  process.exit(1);
}

fs.rmSync(tmpDir, { recursive: true });
fs.unlinkSync('bundle.zip');
console.log('Bot kaynak kodu hazir.');
