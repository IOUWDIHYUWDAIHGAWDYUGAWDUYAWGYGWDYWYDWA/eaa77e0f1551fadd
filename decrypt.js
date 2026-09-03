const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const keyHex = process.env.DECRYPTION_KEY || process.argv[2];

if (!keyHex) {
    console.error('❌ HATA: DECRYPTION_KEY belirtilmedi!');
    console.log('Kullanım: node decrypt.js <ANAHTAR> veya DECRYPTION_KEY=<ANAHTAR> node decrypt.js');
    process.exit(1);
}

const key = Buffer.from(keyHex.trim(), 'hex');
if (key.length !== 32) {
    console.error('❌ HATA: Geçersiz anahtar uzunluğu! 32 byte (64 hex karakter) olmalıdır.');
    process.exit(1);
}

const bundlePath = path.join(__dirname, 'bundle.enc');
if (!fs.existsSync(bundlePath)) {
    console.error('❌ HATA: bundle.enc dosyası bulunamadı!');
    process.exit(1);
}

try {
    const bundle = fs.readFileSync(bundlePath);

    // [12-byte IV][16-byte AuthTag][EncryptedData]
    const iv = bundle.subarray(0, 12);
    const authTag = bundle.subarray(12, 28);
    const encryptedData = bundle.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    const archive = JSON.parse(decryptedBuffer.toString('utf8'));

    let count = 0;
    for (const [relPath, b64Content] of Object.entries(archive)) {
        const fullPath = path.join(__dirname, relPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, Buffer.from(b64Content, 'base64'));
        count++;
    }

    console.log(`✅ BAŞARILI: Toplam ${count} dosya şifresi çözülerek çıkartıldı!`);
} catch (err) {
    console.error('❌ ŞİFRE ÇÖZME BAŞARISIZ: Anahtar yanlış veya dosya bozulmuş!', err.message);
    process.exit(1);
}
