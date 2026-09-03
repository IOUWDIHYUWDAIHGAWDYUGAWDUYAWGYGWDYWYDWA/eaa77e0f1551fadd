const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    name: 'messageUpdate',
    once: false,
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        logger.log(oldMessage.guild, {
            title: '✏️ Mesaj Düzenlendi',
            description: `**Yazar:** ${oldMessage.author?.tag} (${oldMessage.author?.id})\n**Kanal:** ${oldMessage.channel}\n**Eski:** \`\`\`${oldMessage.content?.substring(0, 500) || 'Boş'}\`\`\`\n**Yeni:** \`\`\`${newMessage.content?.substring(0, 500) || 'Boş'}\`\`\``,
            color: config.colors.warning
        });
    }
};
