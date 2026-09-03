const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    name: 'messageDelete',
    once: false,
    async execute(message) {
        if (!message.guild || message.author?.bot) return;

        logger.log(message.guild, {
            title: '🗑️ Mesaj Silindi',
            description: `**Yazar:** ${message.author?.tag || 'Bilinmiyor'} (${message.author?.id})\n**Kanal:** ${message.channel}\n**İçerik:** \`\`\`${message.content ? message.content.substring(0, 1000) : 'Görsel veya İçerik Yok'}\`\`\``,
            color: config.colors.danger
        });
    }
};
