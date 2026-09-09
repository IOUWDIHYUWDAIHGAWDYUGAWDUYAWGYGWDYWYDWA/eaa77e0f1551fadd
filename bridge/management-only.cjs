'use strict';
const {Client,GatewayIntentBits}=require('discord.js');
require('./cloudflare-management.cjs');
const token=process.env.DISCORD_TOKEN;
if(!token)throw new Error('DISCORD_TOKEN secret eksik.');
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
client.once('clientReady',()=>console.log('[VYBot panel] Şifreli paket açılamadığı için güvenli yönetim modu etkin.'));
client.on('error',error=>console.error('[VYBot panel] Discord istemci hatası:',error?.message||'unknown'));
client.login(token).catch(error=>{console.error('[VYBot panel] Giriş başarısız:',error?.message||'unknown');process.exitCode=1;});
