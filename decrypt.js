const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const keyHex=process.argv[2];
if(!keyHex){console.error('KULLANIM: node decrypt.js <HEX_KEY>');process.exit(1);}
const key=Buffer.from(keyHex,'hex');
if(key.length!==32){console.error('HATA: Anahtar 32 byte olmali.');process.exit(1);}
const enc=fs.readFileSync('bundle.enc');
const iv=enc.slice(0,16);
const ciphertext=enc.slice(16);
const decipher=crypto.createDecipheriv('aes-256-cbc',key,iv);
const zip=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
fs.writeFileSync('src_decrypted.zip',zip);
console.log('Decrypt tamam');
const {execSync}=require('child_process');
const srcDir=path.join(__dirname,'src');
if(fs.existsSync(srcDir))fs.rmSync(srcDir,{recursive:true});
fs.mkdirSync(srcDir,{recursive:true});
try{execSync('unzip -q src_decrypted.zip -d '+srcDir);}catch(e){execSync('powershell -Command "Expand-Archive -Path src_decrypted.zip -DestinationPath '+srcDir+' -Force"');}
fs.unlinkSync('src_decrypted.zip');
console.log('src/ hazir');