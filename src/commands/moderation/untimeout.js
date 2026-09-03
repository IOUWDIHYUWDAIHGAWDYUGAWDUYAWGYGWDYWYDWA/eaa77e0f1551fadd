const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Bir üyenin susturmasını (zamanaşımını) kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturması kaldırılacak üye').setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '❌ Bu üye bulunamadı.', ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ content: 'ℹ️ Bu üye zaten susturulmamış.', ephemeral: true });
        }

        try {
            await member.timeout(null, `${interaction.user.tag} tarafından susturması kaldırıldı`);

            logger.log(interaction.guild, {
                title: '🔊 Üyenin Susturması Kaldırıldı',
                description: `**Kullanıcı:** ${user.tag} (${user.id})\n**Yetkili:** ${interaction.user.tag}`,
                color: config.colors.success
            });

            return interaction.reply(`🔊 **${user.tag}** adlı üyenin susturması başarıyla kaldırıldı.`);
        } catch (err) {
            return interaction.reply({ content: `Hata oluştu: ${err.message}`, ephemeral: true });
        }
    }
};
