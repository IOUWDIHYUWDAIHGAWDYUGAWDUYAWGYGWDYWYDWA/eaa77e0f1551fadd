const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    blue(title, description, image = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🔷 ${title}`)
            .setDescription(description || '')
            .setTimestamp();

        if (image) embed.setImage(image);
        return embed;
    },

    success(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.secondary)
            .setTitle(`🔹 ${title}`)
            .setDescription(description || '')
            .setTimestamp();
    },

    error(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description || '')
            .setTimestamp();
    },

    warning(title, description) {
        return new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle(`⚡ ${title}`)
            .setDescription(description || '')
            .setTimestamp();
    },

    info(title, description, image = null) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.accent)
            .setTitle(`🌊 ${title}`)
            .setDescription(description || '')
            .setTimestamp();

        if (image) embed.setImage(image);
        return embed;
    }
};
