'use strict';const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{decrypt}=require('./scripts/bundle-crypto');let t='';try{t=fs.mkdtempSync(path.join(os.tmpdir(),'vybot-open-'));const z=path.join(t,'src.zip'),out=path.join(t,'out');fs.writeFileSync(z,decrypt(fs.readFileSync('bundle.enc')),{mode:0o600});execFileSync('python3',['-c',`import pathlib,stat,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]);r=pathlib.Path(sys.argv[2]);r.mkdir()
for i in z.infolist():
 p=pathlib.PurePosixPath(i.filename)
 if p.is_absolute() or '..' in p.parts or stat.S_ISLNK(i.external_attr>>16):raise ValueError('unsafe')
 q=r.joinpath(*p.parts);q.parent.mkdir(parents=True,exist_ok=True)
 if not i.is_dir():q.write_bytes(z.read(i))`,z,out]);if(!fs.existsSync(path.join(out,'src/index.js')))throw Error('index missing');fs.rmSync('src',{recursive:true,force:true});fs.renameSync(path.join(out,'src'),'src');console.log('Kaynak doğrulandı ve açıldı');}catch(e){console.error(e.message);process.exit(1)}finally{if(t)fs.rmSync(t,{recursive:true,force:true})}
