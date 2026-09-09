'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
try {
  const root = process.env.DISCORD_TOKEN;
  if (!root) throw new Error('missing root secret');
  const wrapped = fs.readFileSync('bundle.key.enc');
  const magic = Buffer.from('VYBOTKEY');
  if (wrapped.length !== 85 || !wrapped.subarray(0, 8).equals(magic) || wrapped[8] !== 1) {
    throw new Error('invalid wrapped key');
  }
  const header = wrapped.subarray(0, 9);
  const salt = wrapped.subarray(9, 25);
  const nonce = wrapped.subarray(25, 37);
  const tag = wrapped.subarray(37, 53);
  const ciphertext = wrapped.subarray(53);
  const wrappingKey = crypto.scryptSync(root, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const decipher = crypto.createDecipheriv('aes-256-gcm', wrappingKey, nonce);
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  const key = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (key.length !== 32) throw new Error('invalid key length');
  process.stdout.write(key.toString('hex'));
} catch {
  console.error('Encrypted bot key could not be opened.');
  process.exit(1);
}
