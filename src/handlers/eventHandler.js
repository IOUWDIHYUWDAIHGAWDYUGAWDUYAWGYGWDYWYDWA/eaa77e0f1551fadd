const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsDir = path.join(__dirname, '../events');
    if (!fs.existsSync(eventsDir)) {
        fs.mkdirSync(eventsDir, { recursive: true });
    }

    const eventFolders = fs.readdirSync(eventsDir);
    let eventCount = 0;

    for (const folder of eventFolders) {
        const folderPath = path.join(eventsDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file);
            const event = require(filePath);

            if (event.name && typeof event.execute === 'function') {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                eventCount++;
            }
        }
    }

    console.log(`[EVENTLER] Toplam ${eventCount} adet event dinleyicisi kaydedildi.`);
};
