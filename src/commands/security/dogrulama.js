const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsDb = require('../../database/settings');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dogrulama-kur')
        .setDescription('Sunucuya butonlu ve fotoğraflı üye doğrulama (Kayıt) paneli gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('rol')
                .setDescription('Doğrulandıktan sonra verilecek üye rolü')
                .setRequired(true)
        ),

    async execute(interaction) {
        const role = interaction.options.getRole('rol');

        if (role.managed || role.id === interaction.guild.roles.everyone.id) {
            return interaction.reply({ content: '❌ Geçersiz rol seçildi.', ephemeral: true });
        }

        settingsDb.updateSettings(interaction.guild.id, {
            verify_role_id: role.id,
            verify_channel_id: interaction.channel.id
        });

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ ${interaction.guild.name} - Üye Doğrulama Paneli`)
            .setDescription(
                '**Sunucumuza hoş geldiniz!**\n\n' +
                'Topluluğumuzu bot hesaplara, spam dalgalarına ve yetkisiz erişimlere karşı korumak amacıyla doğrulama sistemi aktiftir.\n\n' +
                'Sunucudaki kanalları ve sohbet odalarını görebilmek için aşağıdaki **"✅ Sunucuyu Doğrula"** butonuna basınız.'
            )
            .setColor(config.colors.primary)
            .setImage(config.banners.verify)
            .setFooter({ text: 'vybot Siber Güvenlik Sistemi' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Sunucuyu Doğrula')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛡️')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ Doğrulama paneli başarıyla bu kanala kuruldu! Verilecek rol: **${role.name}**`, ephemeral: true });
    }
};
