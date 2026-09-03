const settingsDb = require('../database/settings');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    async log(guild, { title, description, color, fields, footer, thumbnail }) {
        if (!guild) return;
        const settings = settingsDb.getSettings(guild.id);
        if (!settings || !settings.mod_log_channel) return;

        const channel = guild.channels.cache.get(settings.mod_log_channel);
        if (!channel || !channel.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color || config.colors.primary)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields && fields.length > 0) embed.addFields(fields);
        if (footer) embed.setFooter({ text: footer });
        if (thumbnail) embed.setThumbnail(thumbnail);

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(`[Logger Error] Mod-log kanalına mesaj gönderilemedi:`, err.message);
        }
    }
};
