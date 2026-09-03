const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('Kanalda butonlu ve fotoğraflı destek bileti (ticket) paneli oluşturur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('baslik').setDescription('Panel başlığı').setRequired(false))
        .addStringOption(opt => opt.setName('aciklama').setDescription('Panel açıklaması').setRequired(false)),

    async execute(interaction) {
        const title = interaction.options.getString('baslik') || '🎫 Destek & İletişim Merkezi';
        const desc = interaction.options.getString('aciklama') || 
            'Yetkili ekibimizle birebir özel olarak görüşmek, soru sormak, öneri sunmak veya şikayet bildirmek için aşağıdaki **"Destek Talebi Aç"** butonuna tıklayabilirsiniz.\n\n' +
            '🔷 **Hızlı Yanıt:** Yetkililerimiz en kısa sürede size yardımcı olacaktır.\n' +
            '🔷 **Güvenli Ortam:** Talebiniz sadece sizin ve yetkililerin görebileceği özel bir odada açılır.';

        const embed = new EmbedBuilder()
            .setTitle(`🔷 ${title}`)
            .setDescription(desc)
            .setColor(config.colors.primary)
            .setImage(config.banners.ticket)
            .setFooter({ text: 'vybot Destek & İletişim Sistemi' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Destek Talebi Aç')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📩')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Fotoğraflı destek paneli başarıyla bu kanala kuruldu!', ephemeral: true });
    }
};
