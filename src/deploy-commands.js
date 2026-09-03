const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // İsteğe bağlı

if (!token || !clientId) {
    console.error('❌ HATA: .env dosyasında DISCORD_TOKEN veya CLIENT_ID eksik!');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`[DEPLOY] ${commands.length} adet uygulama (slash) komutu kaydediliyor...`);

        if (guildId) {
            // Tek bir sunucuya anında kaydetme (Geliştirme / Test için çok hızlı)
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`[DEPLOY BAŞARILI] ${data.length} komut "${guildId}" sunucusuna anında yüklendi!`);
        } else {
            // Global (Tüm sunuculara) kaydetme
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`[DEPLOY BAŞARILI] ${data.length} komut global olarak Discord'a yüklendi!`);
        }
    } catch (error) {
        console.error('[DEPLOY HATASI]', error);
    }
})();
