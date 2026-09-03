const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const giveawaysDb = require('../../database/giveaways');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Sunucuda butonlu ve fotoğraflı yeni bir çekiliş başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt => opt.setName('odul').setDescription('Çekiliş ödülü').setRequired(true))
        .addIntegerOption(opt => opt.setName('dakika').setDescription('Çekiliş süresi (dakika)').setRequired(true).setMinValue(1))
        .addIntegerOption(opt => opt.setName('kazanan').setDescription('Kazanacak kişi sayısı').setRequired(false).setMinValue(1).setMaxValue(10)),

    async execute(interaction) {
        const prize = interaction.options.getString('odul');
        const minutes = interaction.options.getInteger('dakika');
        const winnersCount = interaction.options.getInteger('kazanan') || 1;

        const endTime = Date.now() + (minutes * 60 * 1000);
        const endTimestamp = Math.floor(endTime / 1000);

        const embed = new EmbedBuilder()
            .setTitle('🎁 SİBER ÇEKİLİŞ BAŞLADI! 🎁')
            .setColor(config.colors.primary)
            .setDescription(
                `🔷 **Ödül:** ✨ **${prize}**\n` +
                `👥 **Kazanacak Kişi Sayısı:** **${winnersCount}**\n` +
                `⏰ **Bitiş Zamanı:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
                `👑 **Düzenleyen:** ${interaction.user}\n\n` +
                `Katılmak için aşağıdaki **"🎉 Katıl"** butonuna basınız!`
            )
            .setImage(config.banners.giveaway)
            .setFooter({ text: 'vybot Çekiliş Sistemi' })
            .setTimestamp(endTime);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Katıl')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉')
        );

        const replyMsg = await interaction.reply({ content: '✅ Çekiliş başlatılıyor...', ephemeral: true });
        const message = await interaction.channel.send({ embeds: [embed], components: [row] });

        giveawaysDb.createGiveaway(
            interaction.guild.id,
            interaction.channel.id,
            message.id,
            prize,
            winnersCount,
            endTime,
            interaction.user.id
        );

        await interaction.editReply({ content: `✅ **${prize}** çekilişi başarıyla başlatıldı!` });
    }
};
