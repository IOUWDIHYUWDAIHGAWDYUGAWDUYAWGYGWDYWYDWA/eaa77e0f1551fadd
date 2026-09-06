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

const tmpDir=path.join('/tmp','vybot_'+Date.now());
fs.mkdirSync(tmpDir,{recursive:true});

const extractPy=`import zipfile, sys
with zipfile.ZipFile(sys.argv[1], "r") as z:
    z.extractall(sys.argv[2])
    print(f"Cikarildi: {len(z.namelist())} dosya")
`;
fs.writeFileSync(path.join(tmpDir,'extract.py'),extractPy,'utf8');
execSync(`python3 "${path.join(tmpDir,'extract.py')}" src_decrypted.zip "${tmpDir}"`,{encoding:'utf8'});

const srcDir=path.join(__dirname,'src');
let extractedDir=tmpDir;
if(fs.existsSync(path.join(tmpDir,'src')))extractedDir=path.join(tmpDir,'src');

if(fs.existsSync(srcDir))fs.rmSync(srcDir,{recursive:true});
fs.renameSync(extractedDir,srcDir);
console.log('src/ hazir: '+srcDir);

try{if(fs.existsSync(tmpDir))fs.rmSync(tmpDir,{recursive:true});}catch(e){}
fs.unlinkSync('src_decrypted.zip');
console.log('Bot kaynak kodu hazir.');