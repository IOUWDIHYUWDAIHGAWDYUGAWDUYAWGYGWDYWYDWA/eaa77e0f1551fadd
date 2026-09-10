'use strict';const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{encrypt,decrypt}=require('./scripts/bundle-crypto');let t='';try{t=fs.mkdtempSync(path.join(os.tmpdir(),'vybot-'));const z=path.join(t,'src.zip');execFileSync('python3',['-c',`import os,pathlib,sys,zipfile
r=pathlib.Path('src')
with zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED) as z:
 for c,d,n in os.walk(r):
  for f in n:
   p=pathlib.Path(c)/f
   if p.is_symlink(): raise ValueError('symlink')
   z.write(p,p.as_posix())`,z]);const p=fs.readFileSync(z),b=encrypt(p);if(!decrypt(b).equals(p))throw Error('roundtrip failed');fs.writeFileSync('bundle.enc',b,{mode:0o600});console.log('bundle.enc AES-256-GCM hazır');}finally{if(t)fs.rmSync(t,{recursive:true,force:true})}
