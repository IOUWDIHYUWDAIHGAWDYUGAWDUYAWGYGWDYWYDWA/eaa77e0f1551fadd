const { Client, GatewayIntentBits, Partials } = require('discord.js');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// Handler'ları Yükle
commandHandler(client);
eventHandler(client);

// Botu Başlat
if (!config.token) {
    console.error('❌ HATA: DISCORD_TOKEN bulunamadı! Lütfen .env dosyasını oluşturup tokeninizi ekleyin.');
    console.log('Örnek için .env.example dosyasını inceleyin.');
    process.exit(1);
}

client.login(config.token).catch(err => {
    console.error('❌ Bot giriş yapamadı:', err.message);
});
