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

// ZIP i /tmp/ altina ac
const tmpDir='/tmp/vybot_'+Date.now();
fs.mkdirSync(tmpDir,{recursive:true});

const pyCode=`import zipfile, sys
with zipfile.ZipFile(sys.argv[1], "r") as z:
    z.extractall(sys.argv[2])
    print(f"Cikarildi: {len(z.namelist())} dosya")
`;
const pyScript=path.join(tmpDir,'extract.py');
fs.writeFileSync(pyScript,pyCode,'utf8');
execSync(`python3 "${pyScript}" bundle.zip "${tmpDir}"`,{encoding:'utf8'});

// src/ klasorunu bul ve ana dizine tasi
const srcDir=path.join(__dirname,'src');
if(fs.existsSync(srcDir))fs.rmSync(srcDir,{recursive:true});

let extractedSrc=path.join(tmpDir,'src');
if(fs.existsSync(extractedSrc)){
  fs.renameSync(extractedSrc,srcDir);
  console.log('src/ tasi (klasorden): '+srcDir);
}else{
  fs.mkdirSync(srcDir,{recursive:true});
  const files=fs.readdirSync(tmpDir);
  for(const f of files){
    try{fs.renameSync(path.join(tmpDir,f),path.join(srcDir,f));}catch(e){}
  }
  console.log('src/ tasi (dosyalardan): '+srcDir);
}

// Log: src/ icerigi
const srcFiles=fs.readdirSync(srcDir);
console.log('src/ dosyalari: '+srcFiles.join(', '));

// Temizlik
fs.rmSync(tmpDir,{recursive:true});
fs.unlinkSync('bundle.zip');
console.log('Bot kaynak kodu hazir.');