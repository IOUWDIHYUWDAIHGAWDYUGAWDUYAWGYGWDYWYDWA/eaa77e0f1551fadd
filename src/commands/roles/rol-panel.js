const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-panel')
        .setDescription('Kullanıcıların tıklayarak rol alabileceği butonlu ve fotoğraflı bir panel oluşturur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('baslik').setDescription('Panel başlığı').setRequired(true))
        .addRoleOption(opt => opt.setName('rol1').setDescription('1. Rol').setRequired(true))
        .addRoleOption(opt => opt.setName('rol2').setDescription('2. Rol').setRequired(false))
        .addRoleOption(opt => opt.setName('rol3').setDescription('3. Rol').setRequired(false))
        .addRoleOption(opt => opt.setName('rol4').setDescription('4. Rol').setRequired(false))
        .addRoleOption(opt => opt.setName('rol5').setDescription('5. Rol').setRequired(false)),

    async execute(interaction) {
        const title = interaction.options.getString('baslik');
        const roles = [
            interaction.options.getRole('rol1'),
            interaction.options.getRole('rol2'),
            interaction.options.getRole('rol3'),
            interaction.options.getRole('rol4'),
            interaction.options.getRole('rol5')
        ].filter(Boolean);

        const row = new ActionRowBuilder();
        let desc = 'İstediğiniz rolü almak veya üzerinizden çıkarmak için aşağıdaki butonlara basınız:\n\n';

        for (const role of roles) {
            desc += `🔷 **${role.name}**\n`;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_toggle_${role.id}`)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✨')
            );
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎭 ${title}`)
            .setDescription(desc)
            .setColor(config.colors.primary)
            .setImage(config.banners.roles)
            .setFooter({ text: 'vybot Buton Rol Sistemi' })
            .setTimestamp();

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Fotoğraflı rol paneli başarıyla gönderildi!', ephemeral: true });
    }
};
