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

const srcDir=path.join(__dirname,'src');
if(fs.existsSync(srcDir))fs.rmSync(srcDir,{recursive:true});
fs.mkdirSync(srcDir,{recursive:true});

let extractedSrc=path.join(tmpDir,'src');
if(fs.existsSync(extractedSrc)){
  fs.cpSync(extractedSrc,srcDir,{recursive:true});
  console.log('src/ kopyalandi (klasorden)');
}else{
  const files=fs.readdirSync(tmpDir);
  for(const f of files){
    fs.cpSync(path.join(tmpDir,f),path.join(srcDir,f),{recursive:true});
  }
  console.log('src/ kopyalandi (dosyalardan)');
}

const srcFiles=fs.readdirSync(srcDir);
console.log('src/ dosyalari: '+srcFiles.join(', '));

fs.rmSync(tmpDir,{recursive:true});
fs.unlinkSync('bundle.zip');
console.log('Bot kaynak kodu hazir.');