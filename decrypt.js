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
fs.writeFileSync('bundle.zip',zip);
console.log('Decrypt tamam: '+zip.length+' byte');

// ZIP i ana dizine ac (src/ klasoru ZIP icinde var)
const pyScript=path.join(__dirname,'extract.py');
const pyCode=`import zipfile, sys
with zipfile.ZipFile(sys.argv[1], "r") as z:
    z.extractall(sys.argv[2])
    print(f"Cikarildi: {len(z.namelist())} dosya -> {sys.argv[2]}")
`;
fs.writeFileSync(pyScript,pyCode,'utf8');
const result=execSync(`python3 "${pyScript}" bundle.zip "${__dirname}"`,{encoding:'utf8'});
console.log(result.trim());

fs.unlinkSync('bundle.zip');
fs.unlinkSync(pyScript);
console.log('src/ hazir.');