import { COMMANDS, CATEGORIES } from './data/commands.js';
const cfg = window.VYBOT_CONFIG || {};
const root = new URL('../../', import.meta.url);
const apiRoot = new URL(cfg.apiBase || 'api/', root);
const $ = (s, parent = document) => parent.querySelector(s);
const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage = {get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,val){try{localStorage.setItem(key,val);return true;}catch{return false;}},remove(key){try{localStorage.removeItem(key);return true;}catch{return false;}}};
let toastTimer;
function toast(text){const el=$('.toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},3500);}
async function api(path, options={}){
  const response=await fetch(new URL(path,apiRoot),{credentials:'same-origin',...options,signal:AbortSignal.timeout(10000),headers:{Accept:'application/json',...options.headers}});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json')) throw new Error('Yönetim sunucusu bağlı değil. Demo kullanılabilir.');
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||'İşlem tamamlanamadı. Lütfen tekrar dene.');
  return body;
}
function inviteUrl(guildId){const url=new URL('https://discord.com/oauth2/authorize');url.search=new URLSearchParams({client_id:cfg.clientId||'1545157265831759903',permissions:cfg.invitePermissions||'1100349828182',scope:'bot applications.commands',...(guildId?{guild_id:guildId,disable_guild_select:'true'}:{})});return url.href;}
$$('[data-invite]').forEach(a=>a.href=inviteUrl());
$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const menu=$('.menu-button'), mobile=$('#mobile-menu');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Menüyü aç');mobile.hidden=true;}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');mobile.hidden=!open;});
mobile?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile&&!mobile.hidden){closeMenu();menu.focus();}});
matchMedia('(min-width: 801px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.08});$$('.reveal').forEach(el=>observer.observe(el));}
// Remove tokens persisted by the old front-end. Authentication is now server-side.
for(const key of ['vybot_token','vybot_oauth_state','vybot_oauth_verifier']){storage.remove(key);try{sessionStorage.removeItem(key);}catch{}}

async function copyText(text){
 try{await navigator.clipboard.writeText(text);toast('Komut kopyalandı. Discord’da kullanabilirsin.');}
 catch{const area=document.createElement('textarea');area.value=text;area.setAttribute('aria-label','Kopyalanacak komut');area.style.cssText='position:fixed;left:0;top:0;opacity:0';document.body.append(area);area.select();let done=false;try{done=document.execCommand('copy');}catch{}area.remove();if(done)toast('Komut kopyalandı.');else{toast('Otomatik kopyalanamadı. Komut metnini seçip kopyala.');}}
}
function initCommands(){
 const params=new URLSearchParams(location.search);let category=CATEGORIES.some(c=>c.id===params.get('category'))?params.get('category'):'all';let lang=params.get('lang')==='en'?'en':'tr';
 const search=$('#command-search');search.value=params.get('q')||'';$('#command-lang').value=lang;
 const normalize=s=>s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 function render(){
  const query=normalize(search.value.trim());
  const list=COMMANDS.filter(c=>(category==='all'||c.category===category)&&normalize(c.name+' '+c.desc.tr+' '+c.desc.en+' '+c.usage).includes(query));
  $('#categories').innerHTML=[{id:'all',label:{tr:'Tüm komutlar',en:'All commands'}},...CATEGORIES].map(c=>`<button type="button" data-category="${c.id}" class="${category===c.id?'active':''}" aria-pressed="${category===c.id}"><span>${esc(c.label[lang])}</span><small>${c.id==='all'?COMMANDS.length:COMMANDS.filter(x=>x.category===c.id).length}</small></button>`).join('');
  $('#result-count').textContent=lang==='tr'?`${list.length} / ${COMMANDS.length} komut gösteriliyor`:`Showing ${list.length} of ${COMMANDS.length} commands`;
  $('#commands-list').innerHTML=list.map(c=>`<article class="command-card"><header><h2>/${esc(c.name)}</h2><button class="copy" data-copy="${esc(c.usage)}" aria-label="/${esc(c.name)} kullanımını kopyala" title="Kullanımı kopyala"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 8h13v13H8z M16 8V3H3v13h5"/></svg></button></header><p>${esc(c.desc[lang])}</p><code class="usage">${esc(c.usage)}</code><span class="permission">${lang==='tr'?'Gerekli izin':'Permission'} · ${esc(c.permission?.[lang]||(lang==='tr'?'Herkes':'Everyone'))}</span></article>`).join('');
  $('#command-empty').hidden=list.length>0;
  const url=new URL(location.href);url.search='';if(category!=='all')url.searchParams.set('category',category);if(search.value.trim())url.searchParams.set('q',search.value.trim());if(lang!=='tr')url.searchParams.set('lang',lang);history.replaceState(null,'',url);
 }
 $('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render();$(`[data-category="${category}"]`).focus();}});
 search.addEventListener('input',render);$('#command-lang').addEventListener('change',e=>{lang=e.target.value;render();});
 $('#clear-filters').addEventListener('click',()=>{category='all';search.value='';render();search.focus();});
 $('#commands-list').addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b)copyText(b.dataset.copy);});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!e.target.isContentEditable){e.preventDefault();search.focus();}});render();
}
export function assessStatus(data, now=Date.now()){
 const date=Date.parse(data?.updatedAt),age=now-date,max=cfg.statusMaxAgeMs||300000;
 if(!Number.isFinite(date)||age < -60000)return {state:'unknown',title:'Zaman damgası doğrulanamadı',detail:'Kaynak geçerli bir güncelleme zamanı sağlamıyor.'};
 if(age>max)return {state:'stale',title:'Durum verisi güncel değil',detail:'Son sinyal 5 dakikadan eski. Botun şu anki durumu bilinmiyor.'};
 if(data?.bot?.online===true)return {state:'online',title:'Bot çevrimiçi bildiriliyor',detail:'Güncel veri kaynağında açık bir çevrimiçi sinyali var.'};
 if(data?.bot?.online===false)return {state:'offline',title:'Bot çevrimdışı bildiriliyor',detail:'Güncel veri kaynağı botu çevrimdışı olarak bildiriyor.'};
 return {state:'unknown',title:'Bot durumu doğrulanamadı',detail:'Kaynakta açık bir çevrimiçi / çevrimdışı sinyali yok.'};
}
async function initStatus(){
 let busy=false;
 async function run(){
  if(busy)return;busy=true;const button=$('#refresh-status');button.disabled=true;button.textContent='Kontrol ediliyor…';
  const feed=async()=>{if(cfg.liveDataUrl){const r=await fetch(cfg.liveDataUrl,{cache:'no-store',signal:AbortSignal.timeout(cfg.liveDataTimeoutMs||8000)});if(!r.ok)throw new Error('Veri kaynağına ulaşılamadı.');return r.json();}return api('status');};
  const [status,health]=await Promise.allSettled([feed(),api('health')]);
  let result;
  if(status.status==='fulfilled'){result=assessStatus(status.value);$('#status-time').textContent=status.value.updatedAt?'Kaynak zamanı: '+new Date(status.value.updatedAt).toLocaleString('tr-TR'):'Kaynak zamanı yayımlanmadı.';}else{result={state:'unknown',title:'Canlı durum verisi yok',detail:'Veri kaynağı bağlı değil veya şu anda yanıt vermiyor. Bu, botun kesin olarak çevrimdışı olduğu anlamına gelmez.'};$('#status-time').textContent='Son kontrol: '+new Date().toLocaleString('tr-TR');}
  $('#status-title').textContent=result.title;$('#status-desc').textContent=result.detail;$('#bot-detail').textContent=result.detail;
  $('#bot-state').textContent={online:'Çevrimiçi',offline:'Çevrimdışı',stale:'Eski veri',unknown:'Bilinmiyor'}[result.state];$('#bot-state').className='status-label '+(result.state==='online'?'good':result.state==='unknown'?'':'warn');
  const ready=health.status==='fulfilled'&&health.value.botConfigured&&health.value.oauthConfigured;
  $('#api-state').textContent=ready?'Yapılandırılmış':'Bağlı değil';$('#api-state').className='status-label';$('#api-detail').textContent=ready?'Yapılandırma mevcut. Gerçek işlemler ayrıca doğrulanmalıdır.':'Gerçek yönetim için OAuth ve bot API’si yapılandırılmalı.';
  button.disabled=false;button.textContent='Yenile';busy=false;
 }
 $('#refresh-status').addEventListener('click',run);await run();setInterval(()=>{if(!document.hidden)run();},60000);
}

function initDashboard(){
 const defaults={moderation:{antiSpam:false,antiLink:false,logChannel:''},welcome:{enabled:false,message:'Sunucumuza hoş geldin, {user}!'},leveling:{enabled:false,announce:false}};
 let mode='preview',view='overview',settings=structuredClone(defaults),guilds=[],guild=null,csrf='',user=null,saving=false,loading=false,selectionVersion=0;
 const labels={overview:'Genel bakış',moderation:'Moderasyon',welcome:'Karşılama',leveling:'Seviye sistemi',settings:'Ayarlar'};
 const demoKey='vybot_demo_v2';
 function mergeSettings(s){const out=structuredClone(defaults);for(const group of Object.keys(out)){for(const key of Object.keys(out[group])){if(typeof s?.[group]?.[key]===typeof out[group][key])out[group][key]=s[group][key];}}return out;}
 function loadDemo(){try{return mergeSettings(JSON.parse(storage.get(demoKey)||'{}'));}catch{return structuredClone(defaults);}}
 function feedback(text,error=false){const el=$('#auth-feedback');el.textContent=text;el.className=error?'error-text':'';}
 function changed(){const form=$('#module-form');return form&&form.dataset.dirty==='true';}
 function mayLeave(){return !changed()||confirm('Kaydedilmemiş değişiklikler var. Devam edilsin mi?');}
 window.addEventListener('beforeunload',e=>{if(changed()){e.preventDefault();e.returnValue='';}});
 function updateShell(){
  $('#selected-server').textContent=mode==='live'?guild?.name||'Sunucu seç':mode==='demo'?'VY Topluluğu · Demo':'Örnek sunucu';
  $('#mode-label').textContent={preview:'Salt okunur önizleme',demo:'Yalnızca bu tarayıcı',live:'Doğrulanmış Discord oturumu'}[mode];
  $('#dash-eyebrow').textContent=mode==='live'?'SUNUCU YÖNETİMİ':'PANEL ÖNİZLEMESİ';
  $('#dash-badge').textContent={preview:'Önizleme',demo:'DEMO · Gerçek veri değil',live:'Gerçek sunucu'}[mode];
  $('#view-title').textContent=labels[view];$$('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 }
 function switchRow(key,title,desc,checked){return `<div class="switch-row"><div><strong id="label-${key}">${title}</strong><p>${desc}</p></div><label class="switch"><input name="${key}" type="checkbox" ${checked?'checked':''} ${mode==='preview'?'disabled':''} aria-labelledby="label-${key}"><span></span></label></div>`;}
 function render(){
  updateShell();const target=$('#dashboard-content');
  if(loading){target.innerHTML='<div class="empty-state" role="status"><h3>Ayarlar yükleniyor…</h3><p>Sunucu bağlantısı doğrulanıyor.</p></div>';return;}
  if(view==='overview'){
   const note=mode==='demo'?'Aşağıdaki sayılar örnek verilerdir. Botuna bağlı değildir.':mode==='preview'?'Bu bir arayüz önizlemesi. Etkileşimli ayarlar için “Demoyu keşfet” düğmesini kullan.':'Discord hesabın doğrulandı. Üye ve etkinlik telemetrisi bu sürümde sağlanmıyor.';
   target.innerHTML=`<p class="dash-description">${note}</p><div class="metrics"><div class="metric"><span>Toplam üye</span><strong>${mode==='demo'?'1.248':'—'}</strong><small>${mode==='demo'?'Örnek veri':'Telemetri bağlı değil'}</small></div><div class="metric"><span>Komut kütüphanesi</span><strong>${COMMANDS.length}</strong><small>Projeden alınan tanımlar</small></div><div class="metric"><span>Kategori</span><strong>${CATEGORIES.length}</strong><small>Keşfedilebilir komut grubu</small></div></div><div class="dash-card"><h3>Sunucuna yön ver.</h3><p>İhtiyacın olan bölümü sol menüden aç. İzinleri ve modül davranışlarını kurulum rehberinden incele.</p><div class="module-row"><strong>Moderasyon ve güvenlik</strong><a href="${new URL('commands/?category=moderasyon',root)}">Komutlar ↗</a></div><div class="module-row"><strong>Topluluk ve seviyeler</strong><a href="${new URL('commands/?category=seviye',root)}">Komutlar ↗</a></div><div class="module-row"><strong>Kurulum ve izinler</strong><a href="${new URL('docs/',root)}">Rehber ↗</a></div></div><div class="notice">${mode==='live'?'Ayarlar yalnızca bağlı bot API’si başarı yanıtı verdiğinde kaydedilmiş sayılır.':'Demo kayıtları gerçek Discord sunucusunu etkilemez. Gerçek yönetim için Discord girişi ve bot bağlantısı gerekir.'}</div>`;
  }else if(view==='settings'){
   target.innerHTML=`<div class="dash-card"><h3>Bağlantı ve veri kontrolü</h3><div class="module-row"><strong>Çalışma modu</strong><span>${mode==='live'?'Gerçek yönetim':mode==='demo'?'Yerel demo':'Salt okunur'}</span></div><div class="module-row"><strong>Discord hesabı</strong><span>${esc(user?.global_name||user?.username||'Bağlı değil')}</span></div><p class="dash-description">Demo verilerini sıfırlamak bot ayarlarını veya Discord hesabını etkilemez.</p><button class="btn secondary" id="reset-demo">Demo verilerini sıfırla</button></div><div class="notice">Bot tokeni ve uygulama sırrı bu sayfaya yazılmaz. Yalnızca sunucunun ortam değişkenlerinde tutulur.</div>`;
   $('#reset-demo').addEventListener('click',()=>{if(!confirm('Bu tarayıcıdaki demo ayarları silinsin mi?'))return;if(!storage.remove(demoKey)){toast('Tarayıcı depolaması kullanılamıyor.');return;}if(mode==='demo')settings=structuredClone(defaults);toast('Demo verileri sıfırlandı.');render();});
  }else{
   const disabled=mode==='preview'?'disabled':'';const data=settings[view];
   let fields='';
   if(view==='moderation')fields=switchRow('antiSpam','Spam koruması','Tekrarlanan mesajlara karşı koruma tercihi.',data.antiSpam)+switchRow('antiLink','Bağlantı filtresi','Bağlantı paylaşımı için filtre tercihi.',data.antiLink)+`<label class="form-field">Denetim kanalı ID’si<input name="logChannel" value="${esc(data.logChannel)}" inputmode="numeric" pattern="[0-9]{17,20}" maxlength="20" placeholder="Örn. 123456789012345678" ${disabled}><small>İsteğe bağlı. Discord geliştirici modunda kanala sağ tıklayıp ID’yi kopyala.</small></label>`;
   if(view==='welcome')fields=switchRow('enabled','Karşılama mesajı','Yeni üyeler için kişiselleştirilmiş bir başlangıç.',data.enabled)+`<label class="form-field">Karşılama metni<textarea name="message" maxlength="500" required ${disabled}>${esc(data.message)}</textarea><small>En fazla 500 karakter. {user} yer tutucusunu bot adaptörün desteklemelidir.</small></label>`;
   if(view==='leveling')fields=switchRow('enabled','Seviye sistemi','Üye katılımı için seviye sistemi tercihi.',data.enabled)+switchRow('announce','Seviye duyuruları','Yeni seviyeleri sunucuda duyur.',data.announce);
   target.innerHTML=`<p class="dash-description">${mode==='live'?'Bu ayarlar bağlı bot yönetim API’sine gönderilir.':mode==='demo'?'Demo modu: değişiklikler yalnızca bu tarayıcıya kaydedilir.':'Ayarları denemek için üstteki “Demoyu keşfet” düğmesine bas.'}</p><form id="module-form" class="dash-card" data-dirty="false">${fields}<div class="form-actions"><button type="submit" class="btn primary" ${disabled}>${mode==='live'?'Bot ayarlarını kaydet':'Demo ayarlarını kaydet'}</button><span class="save-feedback" role="status" aria-live="polite"></span></div></form>`;
   const form=$('#module-form');form.addEventListener('input',()=>{form.dataset.dirty='true';$('.save-feedback',form).textContent='Kaydedilmemiş değişiklikler';});
   form.addEventListener('submit',async e=>{
    e.preventDefault();if(saving||mode==='preview')return;const group=view;const candidate=structuredClone(settings);const fd=new FormData(form);
    for(const key of Object.keys(candidate[group]))candidate[group][key]=typeof candidate[group][key]==='boolean'?fd.has(key):String(fd.get(key)||'').trim();
    const message=$('.save-feedback',form),button=$('button[type=submit]',form);saving=true;button.disabled=true;message.textContent='Kaydediliyor…';
    try{
     if(mode==='demo'){if(!storage.set(demoKey,JSON.stringify(candidate)))throw new Error('Tarayıcı depolaması kapalı. Ayarlar kaydedilemedi.');settings=candidate;message.textContent='Demo bu tarayıcıya kaydedildi. Bot değişmedi.';}
     else{if(!guild)throw new Error('Önce sunucu seç.');const result=await api(`guilds/${guild.id}/settings`,{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(candidate)});settings=mergeSettings(result.settings);message.textContent='Bot API’si kaydı onayladı.';}
     form.dataset.dirty='false';
    }catch(err){message.textContent=err.message;}finally{saving=false;button.disabled=false;}
   });
  }
 }
 $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(saving||loading||!mayLeave())return;view=b.dataset.view;render();}));
 $('#demo-button').addEventListener('click',()=>{if(saving||!mayLeave())return;selectionVersion++;loading=false;mode='demo';guild=null;settings=loadDemo();view='overview';$('#guild-select').value='';feedback('Demo aktif. Tüm değişiklikler yalnızca bu tarayıcıda kalır.');render();});
 $('#login-button').addEventListener('click',()=>{if(mayLeave())location.assign(new URL('auth/login',apiRoot));});
 $('#logout-button').addEventListener('click',async()=>{if(saving||!mayLeave())return;try{await api('auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});user=null;csrf='';guild=null;guilds=[];mode='preview';settings=structuredClone(defaults);$('#guild-picker').hidden=true;$('#logout-button').hidden=true;$('#login-button').hidden=false;$('#auth-title').textContent='Oturum kapatıldı';feedback('Discord oturumu bu sunucudan kaldırıldı.');render();}catch(err){feedback(err.message,true);}});
 $('#guild-select').addEventListener('change',async e=>{
  const chosen=guilds.find(g=>g.id===e.target.value);if(saving||!mayLeave()){e.target.value=guild?.id||'';return;}if(!chosen)return;
  const version=++selectionVersion;loading=true;mode='live';guild=chosen;view='overview';render();
  try{const result=await api(`guilds/${chosen.id}/settings`);if(version!==selectionVersion)return;settings=mergeSettings(result.settings);loading=false;feedback('Sunucu yetkisi ve bot bağlantısı doğrulandı.');render();}
  catch(err){if(version!==selectionVersion)return;loading=false;mode='preview';guild=null;settings=structuredClone(defaults);$('#guild-select').value='';feedback(err.message,true);render();}
 });
 async function loadAuth(){
  try{
   const health=await api('health');$('#login-button').disabled=!health.oauthConfigured;
   $('#auth-desc').textContent=health.oauthConfigured?'Güvenli Discord girişiyle yönetebildiğin sunucuları görüntüle.':'Discord girişi henüz yapılandırılmadı. Şimdilik etkileşimli demoyu kullanabilirsin.';
   if(!health.oauthConfigured)return;
   const me=await api('auth/me');if(!me.user)return;user=me.user;csrf=me.csrf;$('#auth-title').textContent='Merhaba, '+(user.global_name||user.username);$('#auth-desc').textContent='Yönetme yetkin olan sunuculardan birini seç. Bot API’si bağlanmamışsa gerçek ayarlar açılamaz.';$('#login-button').hidden=true;$('#logout-button').hidden=false;
   const result=await api('guilds');guilds=result.guilds||[];$('#guild-picker').hidden=false;$('#guild-select').innerHTML='<option value="">Sunucu seç</option>'+guilds.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');if(!guilds.length)feedback('Yönetme yetkin olan bir sunucu bulunamadı.');
  }catch(err){$('#auth-desc').textContent='Yönetim sunucusuna ulaşılamıyor. Etkileşimli demo kullanılabilir.';$('#login-button').disabled=true;}
 }
 const params=new URLSearchParams(location.search);if(params.get('demo')==='1'){mode='demo';settings=loadDemo();}if(params.has('auth_error')){feedback('Discord girişi tamamlanamadı veya iptal edildi. Yapılandırmayı kontrol edip tekrar dene.',true);const clean=new URL(location);clean.searchParams.delete('auth_error');history.replaceState(null,'',clean);}
 render();loadAuth();
}
const route=document.body.dataset.page;
if(route==='commands')initCommands();
if(route==='status')initStatus().catch(()=>toast('Durum denetimi tamamlanamadı.'));
if(route==='dashboard')initDashboard();
