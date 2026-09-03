const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('davet')
        .setDescription('vybot\'u kendi sunucunuza eklemek için davet bağlantısını verir.'),

    async execute(interaction, client) {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const embed = new EmbedBuilder()
            .setTitle('🌐 vybot\'u Sunucuna Davet Et!')
            .setColor(config.colors.primary)
            .setDescription(
                '**vybot**, tüm Discord sunucularına **tamamen ücretsiz ve herkese açık** bir şekilde hizmet vermektedir!\n\n' +
                '✨ **Sunucuna Neler Katar?**\n' +
                '• 🛡️ Tam koruma Anti-Nuke & Reklam/Küfür filtresi\n' +
                '• 🏆 MEE6 tarzı dinamik görsel seviye sistemi & rank kartları\n' +
                '• 🎫 Butonlu destek bileti (Ticket) sistemi\n' +
                '• 🎭 Butonlu ve menülü rol alma panelleri\n' +
                '• 💰 Ekonomi, meslekler ve kumar oyunları\n' +
                '• 🎁 Otomatik butonlu çekilişler\n\n' +
                'Aşağıdaki butona tıklayarak botu saniyeler içinde sunucuna ekleyebilirsin!'
            )
            .setImage(config.banners.help)
            .setFooter({ text: 'vybot • Herkese Açık Küresel Discord Botu' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Botu Sunucuna Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🌐'),
            new ButtonBuilder()
                .setLabel('Komut Rehberi')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('help_refresh')
                .setEmoji('📖')
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
