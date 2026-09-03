const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucu hakkında genel bilgileri ve istatistikleri gösterir.'),

    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner().catch(() => null);

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} - Sunucu Bilgileri`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setColor(config.colors.primary)
            .addFields(
                { name: '👑 Sunucu Sahibi', value: owner ? `${owner.user.tag}` : 'Bilinmiyor', inline: true },
                { name: '🆔 Sunucu ID', value: `\`${guild.id}\``, inline: true },
                { name: '👥 Toplam Üye', value: `\`${guild.memberCount}\``, inline: true },
                { name: '📁 Kanal Sayısı', value: `\`${guild.channels.cache.size}\``, inline: true },
                { name: '🛡️ Rol Sayısı', value: `\`${guild.roles.cache.size}\``, inline: true },
                { name: '✨ Takviye (Boost)', value: `Seviye ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} Takviye)`, inline: true },
                { name: '📅 Oluşturulma Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: false }
            )
            .setFooter({ text: 'vybot İstatistik' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
