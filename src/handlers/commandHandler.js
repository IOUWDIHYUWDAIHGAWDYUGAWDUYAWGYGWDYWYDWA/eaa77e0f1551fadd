const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
    client.commands = new Collection();
    const commandsDir = path.join(__dirname, '../commands');

    if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
    }

    const commandFolders = fs.readdirSync(commandsDir);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.warn(`[UYARI] ${filePath} dosyasındaki komut geçerli bir "data" veya "execute" özelliğine sahip değil.`);
            }
        }
    }

    console.log(`[KOMUTLAR] Toplam ${client.commands.size} adet slash komutu başarıyla yüklendi.`);
};
