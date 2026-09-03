const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen sayıda mesajı kanaldan topluca siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const amount = interaction.options.getInteger('miktar');

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);

            logger.log(interaction.guild, {
                title: '🧹 Toplu Mesaj Temizliği',
                description: `**Kanal:** ${interaction.channel}\n**Yetkili:** ${interaction.user.tag}\n**Silinen Mesaj:** ${deleted.size} adet`,
                color: config.colors.warning
            });

            await interaction.reply({
                content: `🧹 Başarıyla **${deleted.size}** adet mesaj silindi.`,
                ephemeral: true
            });
        } catch (err) {
            return interaction.reply({
                content: `Mesajlar silinirken hata oluştu (14 günden eski mesajlar silinemez): ${err.message}`,
                ephemeral: true
            });
        }
    }
};
