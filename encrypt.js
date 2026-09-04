const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 256-bit (32 bytes) Gizli Anahtar
let keyHex = process.env.DECRYPTION_KEY || process.argv[2];
if (!keyHex) {
    keyHex = '70fcb19a947ab2e4b5a80192e5654f1fbb74f29f811175dd6e84a017a119a768';
}

const key = Buffer.from(keyHex, 'hex');
if (key.length !== 32) {
    console.error('❌ HATA: Anahtar 32 byte (64 hex karakter) olmalıdır!');
    process.exit(1);
}

// Dosyaları Özyinelemeli Toplama
function getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const srcFiles = getAllFiles(path.join(__dirname, 'src'));
const allFilesToEncrypt = [...srcFiles];

if (fs.existsSync(path.join(__dirname, 'runner.js'))) {
    allFilesToEncrypt.push(path.join(__dirname, 'runner.js'));
}

if (fs.existsSync(path.join(__dirname, 'cookies.txt'))) {
    allFilesToEncrypt.push(path.join(__dirname, 'cookies.txt'));
}

console.log(`📦 Toplam ${allFilesToEncrypt.length} dosya şifreleniyor...`);

const archive = {};
for (const fullPath of allFilesToEncrypt) {
    const relPath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
    archive[relPath] = fs.readFileSync(fullPath).toString('base64');
}

const plainBuffer = Buffer.from(JSON.stringify(archive), 'utf8');

// AES-256-GCM Şifreleme
const iv = crypto.randomBytes(12); // 96-bit nonce
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
const authTag = cipher.getAuthTag(); // 128-bit authentication tag

// Format: [12-byte IV][16-byte AuthTag][EncryptedData]
const finalBundle = Buffer.concat([iv, authTag, encrypted]);

fs.writeFileSync(path.join(__dirname, 'bundle.enc'), finalBundle);

console.log('✅ ŞİFRELEME BAŞARILI!');
console.log(`📁 Oluşturulan dosya: bundle.enc (${(finalBundle.length / 1024).toFixed(2)} KB)`);
console.log('------------------------------------------------------');
console.log('🔑 ŞİFRE ÇÖZÜCÜ ANAHTARIN (DECRYPTION_KEY):');
console.log(keyHex);
console.log('------------------------------------------------------');
