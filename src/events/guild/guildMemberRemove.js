const logger = require('../../utils/logger');
const settingsDb = require('../../database/settings');
const config = require('../../config');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    async execute(member, client) {
        const settings = settingsDb.getSettings(member.guild.id);

        if (settings.leave_channel) {
            const channel = member.guild.channels.cache.get(settings.leave_channel);
            if (channel && channel.isTextBased()) {
                channel.send(`👋 **${member.user.tag}** sunucudan ayrıldı.`).catch(() => {});
            }
        }

        logger.log(member.guild, {
            title: '📤 Üye Ayrıldı',
            description: `${member.user.tag} (${member.user.id}) sunucudan ayrıldı.`,
            color: config.colors.danger,
            thumbnail: member.user.displayAvatarURL()
        });
    }
};
