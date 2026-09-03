const { AttachmentBuilder } = require('discord.js');
const settingsDb = require('../../database/settings');
const canvasGenerator = require('../../utils/canvasGenerator');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        const settings = settingsDb.getSettings(member.guild.id);

        // 1. Oto-Rol
        if (settings.autorole_id) {
            const role = member.guild.roles.cache.get(settings.autorole_id);
            if (role) {
                member.roles.add(role).catch(err => {
                    console.error('Oto-rol verilemedi:', err.message);
                });
            }
        }

        // 2. Resimli Hoş Geldin Mesajı
        if (settings.welcome_channel) {
            const channel = member.guild.channels.cache.get(settings.welcome_channel);
            if (channel && channel.isTextBased()) {
                try {
                    const cardBuffer = await canvasGenerator.createWelcomeCard(member);
                    const attachment = new AttachmentBuilder(cardBuffer, { name: 'hosgeldin.png' });

                    const customMessage = (settings.welcome_message || 'Sunucumuza hoş geldin {user}!')
                        .replace('{user}', member.toString())
                        .replace('{guild}', member.guild.name)
                        .replace('{count}', member.guild.memberCount);

                    await channel.send({
                        content: customMessage,
                        files: [attachment]
                    });
                } catch (err) {
                    console.error('Hoş geldin kartı gönderilemedi:', err);
                }
            }
        }

        // 3. Mod-Log
        logger.log(member.guild, {
            title: '📥 Üye Katıldı',
            description: `${member.user.tag} (${member.user.id}) sunucuya katıldı.\n**Hesap Oluşturulma:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            color: config.colors.success,
            thumbnail: member.user.displayAvatarURL()
        });
    }
};
