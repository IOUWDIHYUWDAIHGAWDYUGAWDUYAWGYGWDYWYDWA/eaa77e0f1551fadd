const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const {execSync}=require('child_process');

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
console.log('Decrypt tamam: '+zip.length+' byte');

const srcDir=path.join(__dirname,'src');
if(fs.existsSync(srcDir))fs.rmSync(srcDir,{recursive:true});
fs.mkdirSync(srcDir,{recursive:true});

const pyScript=path.join(__dirname,'extract_zip.py');
const pyCode=`import zipfile, os, sys
with zipfile.ZipFile(sys.argv[1], "r") as z:
    z.extractall(sys.argv[2])
    print(f"Cikarildi: {len(z.namelist())} dosya")
`;
fs.writeFileSync(pyScript,pyCode,'utf8');
const result=execSync(`python3 "${pyScript}" src_decrypted.zip "${srcDir}"`,{encoding:'utf8'});
console.log(result.trim());

fs.unlinkSync('src_decrypted.zip');
fs.unlinkSync(pyScript);
console.log('src/ hazir: '+srcDir);