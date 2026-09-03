const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun ve Discord API gecikmesini görüntüler.'),

    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(config.colors.primary)
            .addFields(
                { name: 'Bot Gecikmesi', value: `\`${latency}ms\``, inline: true },
                { name: 'Discord API Gecikmesi', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
