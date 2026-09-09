'use strict';
const ORIGIN='https:'+'//vybot-login.vybot-eaa77e0f1551fadd.workers.dev';
const BOT_ID='1545157265831759903';
const SNOW=/^\d{17,20}$/;
let identity=null,identityUntil=0;
async function jsonFetch(url,options){const r=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('http_'+r.status);const text=await r.text();if(text.length>2000000)throw new Error('response_limit');return JSON.parse(text);}
async function getIdentity(){
 if(identity&&Date.now()<identityUntil)return identity;
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!requestToken)throw new Error('missing_actions_identity');
 const url=new URL(endpoint);if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com'))throw new Error('invalid_identity_endpoint');url.searchParams.set('audience',ORIGIN);
 const data=await jsonFetch(url,{headers:{Authorization:'Bearer '+requestToken}});if(typeof data.value!=='string')throw new Error('invalid_identity_response');
 identity=data.value;const claims=JSON.parse(Buffer.from(identity.split('.')[1],'base64url').toString());identityUntil=Math.min(Date.now()+180000,Number(claims.exp)*1000-30000);return identity;
}
async function exchange(body){try{return await jsonFetch(ORIGIN+'/api/bot/sync',{method:'POST',headers:{Authorization:'Bearer '+await getIdentity(),'Content-Type':'application/json'},body:JSON.stringify(body)});}catch(e){if(e.message==='http_401'){identity=null;identityUntil=0;}throw e;}}
function validSettings(s){return s&&s.moderation&&s.welcome&&s.leveling&&['antiSpam','antiLink'].every(k=>typeof s.moderation[k]==='boolean')&&typeof s.moderation.logChannel==='string'&&typeof s.welcome.enabled==='boolean'&&typeof s.welcome.message==='string'&&s.welcome.message.length<=500&&typeof (s.welcome.channelId||'')==='string'&&typeof s.leveling.enabled==='boolean'&&typeof s.leveling.announce==='boolean';}
function createRuntime(client,permissions,send=exchange){
 const settings=new Map(),versions=new Map(),acknowledgements=new Map(),experience=new Map(),spam=new Map(),cooldown=new Map();let stopped=false,timer=null,first=true;
 const canSend=channel=>!!channel?.isTextBased?.()&&typeof channel.send==='function'&&channel.permissionsFor(client.user)?.has([permissions.ViewChannel,permissions.SendMessages]);
 async function apply(item){
  const guild=client.guilds.cache.get(item.guildId);if(!guild||versions.get(item.guildId)===item.version)return;
  let reason=null;const s=item.settings;
  if(!validSettings(s))reason='invalid_settings';
  if(!reason&&(s.moderation.antiSpam||s.moderation.antiLink)&&!guild.members.me?.permissions.has(permissions.ManageMessages))reason='missing_manage_messages';
  if(!reason&&s.moderation.logChannel&&!canSend(guild.channels.cache.get(s.moderation.logChannel)))reason='invalid_log_channel';
  if(!reason&&s.welcome.enabled&&!canSend(s.welcome.channelId?guild.channels.cache.get(s.welcome.channelId):guild.systemChannel))reason='welcome_channel_unavailable';
  if(reason){acknowledgements.set(item.guildId,{guildId:item.guildId,version:item.version,status:'rejected',reason});versions.set(item.guildId,item.version);return;}
  settings.set(item.guildId,structuredClone(s));versions.set(item.guildId,item.version);acknowledgements.set(item.guildId,{guildId:item.guildId,version:item.version,status:'applied'});
 }
 async function onMessage(message){
  if(!message.guild||message.author.bot||message.webhookId)return;const s=settings.get(message.guild.id);if(!s)return;
  const key=message.guild.id+':'+message.author.id,now=Date.now();let blocked=false;
  if(!message.member?.permissions.has(permissions.ManageMessages)){
   if(s.moderation.antiLink&&/(?:https?:\/\/|www\.|discord\.gg\/)\S+/i.test(message.content||''))blocked=true;
   if(s.moderation.antiSpam){const previous=spam.get(key);const text=(message.content||'').trim().toLowerCase();const record=previous&&now-previous.at<8000&&previous.text===text?{text,count:previous.count+1,at:now}:{text,count:1,at:now};spam.set(key,record);if(text&&record.count>=4)blocked=true;}
  }
  if(blocked){if(message.deletable){await message.delete().catch(()=>{});const log=message.guild.channels.cache.get(s.moderation.logChannel);if(canSend(log))await log.send({content:'Panel koruması: kullanıcı '+message.author.id+' için bağlantı/spam filtresi uygulandı.',allowedMentions:{parse:[]}}).catch(()=>{});}return;}
  if(s.leveling.enabled&&now-(cooldown.get(key)||0)>=60000){cooldown.set(key,now);experience.set(message.id,{id:message.id,guildId:message.guild.id,userId:message.author.id,channelId:message.channelId});if(experience.size>5000)experience.delete(experience.keys().next().value);}
 }
 async function onJoin(member){const s=settings.get(member.guild.id);if(!s?.welcome.enabled||member.user.bot)return;const channel=s.welcome.channelId?member.guild.channels.cache.get(s.welcome.channelId):member.guild.systemChannel;if(canSend(channel))await channel.send({content:s.welcome.message.replaceAll('{user}','<@'+member.id+'>'),allowedMentions:{parse:[],users:[member.id]}}).catch(()=>{});}
 async function announce(item){const s=settings.get(item.guildId),guild=client.guilds.cache.get(item.guildId);if(!s?.leveling.enabled||!s.leveling.announce||!guild||!SNOW.test(item.userId)||!Number.isSafeInteger(item.level)||item.level<1)return;const channel=guild.channels.cache.get(item.channelId);if(canSend(channel))await channel.send({content:'<@'+item.userId+'>, '+item.level+'. seviyeye ulaştın! 🎉',allowedMentions:{parse:[],users:[item.userId]}}).catch(()=>{});}
 async function sync(){
  let appliedAny=false;const all=[...client.guilds.cache.values()];
  for(let offset=0;offset<all.length;offset+=100){
   const group=all.slice(offset,offset+100),ids=new Set(group.map(g=>g.id));
   const acks=[...acknowledgements.values()].filter(a=>ids.has(a.guildId)).slice(0,100),events=[...experience.values()].filter(e=>ids.has(e.guildId)).slice(0,100);
   const response=await send({guilds:group.map(g=>({id:g.id,name:g.name,memberCount:g.memberCount||0})),applied:acks,experience:events});
   if(response.ok!==true||!Array.isArray(response.items))throw new Error('invalid_sync_response');
   for(const a of acks)if(acknowledgements.get(a.guildId)?.version===a.version)acknowledgements.delete(a.guildId);for(const e of events)experience.delete(e.id);
   for(const item of response.items){if(!ids.has(item.guildId)||!Number.isSafeInteger(item.version)||item.version<1)continue;const before=versions.get(item.guildId);await apply(item);if(before!==versions.get(item.guildId))appliedAny=true;}
   for(const item of response.levelUps||[])await announce(item);
  }
  const now=Date.now();for(const [key,item]of spam)if(now-item.at>10000)spam.delete(key);for(const [key,at]of cooldown)if(now-at>60000)cooldown.delete(key);
  if(first){first=false;console.log('[VYBot panel] Kimlik doğrulamalı yönetim bağlantısı kuruldu.');}return appliedAny;
 }
 async function tick(){if(stopped)return;let delay=5000;try{if(await sync())delay=250;}catch(e){console.warn('[VYBot panel] Yönetim bağlantısı bekleniyor: '+(/^(http_\d{3}|missing_actions_identity|invalid_identity_endpoint)$/.test(e.message)?e.message:'sync_failed'));delay=10000;}if(!stopped){timer=setTimeout(tick,delay);timer.unref?.();}}
 const messageHandler=m=>onMessage(m).catch(()=>console.warn('[VYBot panel] Mesaj modülü işlemi tamamlanamadı.')),joinHandler=m=>onJoin(m).catch(()=>console.warn('[VYBot panel] Karşılama işlemi tamamlanamadı.'));
 return {settings,versions,acknowledgements,experience,apply,onMessage,onJoin,sync,start(){client.on('messageCreate',messageHandler);client.on('guildMemberAdd',joinHandler);tick();},stop(){stopped=true;clearTimeout(timer);client.off('messageCreate',messageHandler);client.off('guildMemberAdd',joinHandler);}};
}
function install(){const {Client,PermissionFlagsBits}=require('discord.js'),marker=Symbol.for('vybot.management.attached'),login=Client.prototype.login;Client.prototype.login=function(...args){if(!this[marker]){this[marker]=true;let started=false;const attach=()=>{if(started||this.user?.id!==BOT_ID)return;started=true;const runtime=createRuntime(this,PermissionFlagsBits);runtime.start();process.once('SIGTERM',()=>runtime.stop());};this.once('clientReady',attach);this.once('ready',attach);}return login.apply(this,args);};}
module.exports={createRuntime,validSettings};if(process.env.VYBOT_MANAGEMENT_TEST!=='1')install();
