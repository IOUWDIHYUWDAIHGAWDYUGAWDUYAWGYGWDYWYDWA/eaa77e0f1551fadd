from pathlib import Path
p=Path('src/index.js');s=p.read_text()
s=s.replace('StringSelectMenuBuilder,EmbedBuilder,PermissionFlagsBits,ChannelType','StringSelectMenuBuilder,RoleSelectMenuBuilder,ChannelSelectMenuBuilder,EmbedBuilder,PermissionFlagsBits,ChannelType')
needle="async function helpPayload(i,key='ana'){const [title,subtitle,items]=help[key]||help.ana;const select=new StringSelectMenuBuilder().setCustomId(`help:${i.user.id}`).setPlaceholder('Kategori seç').addOptions(Object.entries(help).map(([value,v])=>({label:v[0],value,description:v[1].slice(0,90)})));return sendCard(i,{title,subtitle,lines:items.map((x,n)=>({label:`${String(n+1).padStart(2,'0')}`,value:x})),avatarUrl:memberAvatar(i.user),components:[new ActionRowBuilder().addComponents(select),...navRows(i.user.id)],ephemeral:true,edit:i.deferred||i.replied});}\n"
if 'const settingSections=' not in s:s=s.replace(needle,needle+Path('scripts/settings-core.snippet').read_text())
s=s.replace("if(name==='yardim'||name==='menu')return helpPayload(i);","if(name==='yardim')return helpPayload(i);if(name==='menu')return settingsPayload(i);")
old="if(i.isStringSelectMenu()&&i.customId.startsWith('help:')){if(i.customId.split(':')[1]!==i.user.id)return fail(i,'Bu menü başka bir üyeye ait.');await i.deferUpdate();return helpPayload(i,i.values[0]);}if(i.isButton())return component(i);"
new="""if(i.isStringSelectMenu()&&i.customId.startsWith('help:')){if(i.customId.split(':')[1]!==i.user.id)return fail(i,'Bu menü başka bir üyeye ait.');await i.deferUpdate();return helpPayload(i,i.values[0]);}
 if(i.isStringSelectMenu()&&i.customId.startsWith('settings:')){if(i.customId.split(':')[1]!==i.user.id)return fail(i,'Bu yönetim paneli başka bir üyeye ait.');await i.deferUpdate();return settingsPayload(i,i.values[0]);}
 if(i.isRoleSelectMenu()){const [kind,key,uid]=i.customId.split(':');if(kind!=='setrole'||uid!==i.user.id)return fail(i,'Bu yönetim paneli başka bir üyeye ait.');const s=guildSettings(i.guild);s[key]=i.values[0];store.saveSettings(i.guild.id,s);await i.deferUpdate();return settingsPayload(i,key==='supportRole'?'tickets':'roles');}
 if(i.isChannelSelectMenu()){const [kind,key,uid]=i.customId.split(':');if(kind!=='setchannel'||uid!==i.user.id)return fail(i,'Bu yönetim paneli başka bir üyeye ait.');const s=guildSettings(i.guild);s[key]=i.values[0];store.saveSettings(i.guild.id,s);await i.deferUpdate();return settingsPayload(i,key==='ticketCategory'?'tickets':'logs');}
 if(i.isButton())return component(i);"""
s=s.replace(old,new)
s=s.replace("async function component(i){const [kind,value]=i.customId.split(':');","async function component(i){const [kind,value,userId]=i.customId.split(':');if(kind==='section'){if(userId!==i.user.id)return fail(i,'Bu yönetim paneli başka bir üyeye ait.');await i.deferUpdate();return settingsPayload(i,value);}if(kind==='toggle'){if(userId!==i.user.id)return fail(i,'Bu yönetim paneli başka bir üyeye ait.');const s=guildSettings(i.guild);s.security[value]=!s.security[value];store.saveSettings(i.guild.id,s);await i.deferUpdate();return settingsPayload(i,'security');}")
s=s.replace("{label:'Başlangıç',value:'/menu komutunu kullan'}","{label:'Başlangıç',value:'/yardim komutunu kullan'}")
p.write_text(s)
p=Path('src/ui/cards.js');s=p.read_text();needle="async function leaderboard({title,rows,accent='#5865F2'})"
if 'async function settingsDashboard' not in s:s=s.replace(needle,Path('scripts/settings-card.snippet').read_text()+needle)
s=s.replace('module.exports={card,leaderboard,panel};','module.exports={card,settingsDashboard,leaderboard,panel};');p.write_text(s)
p=Path('src/commands.js');s=p.read_text().replace("new SlashCommandBuilder().setName('menu').setDescription('VYBot görsel ana menüsünü açar'),","new SlashCommandBuilder().setName('menu').setDescription('Görsel sunucu ayarları panelini açar').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),");p.write_text(s)
p=Path('yeniwebsite/assets/js/data/commands.js');s=p.read_text().replace("r('menu','arac','Görsel ana menü.','Visual home menu.','/menu')","r('menu','arac','Görsel sunucu ayarları paneli.','Visual server settings panel.','/menu')");p.write_text(s)
