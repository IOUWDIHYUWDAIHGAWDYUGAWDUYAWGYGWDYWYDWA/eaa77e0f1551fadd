'use strict';
const crypto = require('node:crypto');
const MAGIC = Buffer.from('VYBOTENC');
const HEADER = Buffer.concat([MAGIC, Buffer.from([1])]);
function readKey(argv = process.argv) {
  const raw = process.env.DECRYPTION_KEY || argv[2];
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new Error('Set DECRYPTION_KEY to exactly 64 hexadecimal characters. No default key is permitted.');
  }
  return Buffer.from(raw, 'hex');
}
function encrypt(plain, key) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(HEADER);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([HEADER, nonce, cipher.getAuthTag(), ciphertext]);
}
function decrypt(bundle, key) {
  try {
    if (bundle.subarray(0, MAGIC.length).equals(MAGIC)) {
      if (bundle.length < 37 || bundle[8] !== 1) throw new Error('Invalid header');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, bundle.subarray(9, 21));
      decipher.setAAD(bundle.subarray(0, 9));
      decipher.setAuthTag(bundle.subarray(21, 37));
      return Buffer.concat([decipher.update(bundle.subarray(37)), decipher.final()]);
    }
    // Read-only compatibility with the deployed [16-byte IV][AES-CBC ZIP] format.
    // Legacy CBC has no authentication; all new writes use authenticated GCM.
    if (bundle.length < 32 || (bundle.length - 16) % 16 !== 0) throw new Error('Invalid legacy length');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, bundle.subarray(0, 16));
    return Buffer.concat([decipher.update(bundle.subarray(16)), decipher.final()]);
  } catch {
    throw new Error('Bundle cannot be opened: wrong key, unsupported format, or damaged data.');
  }
}
module.exports = { readKey, encrypt, decrypt };
