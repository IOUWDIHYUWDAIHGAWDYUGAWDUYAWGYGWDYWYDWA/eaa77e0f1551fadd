const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelsDb = require('../../database/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liderlik')
        .setDescription('Sunucunun en yüksek seviyeli üyelerini gösterir.'),

    async execute(interaction) {
        const topUsers = levelsDb.getLeaderboard(interaction.guild.id, 10);

        if (topUsers.length === 0) {
            return interaction.reply('Henüz sunucuda kimse seviye kazanmadı!');
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${interaction.guild.name} - Seviye Sıralaması`)
            .setColor(config.colors.primary)
            .setImage(config.banners.level)
            .setFooter({ text: 'vybot Seviye Sistemi' })
            .setTimestamp();

        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const u = topUsers[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i + 1}**`;
            description += `${medal} <@${u.user_id}> - **Seviye ${u.level}** (${u.xp.toLocaleString()} XP)\n`;
        }

        embed.setDescription(description);
        return interaction.reply({ embeds: [embed] });
    }
};
