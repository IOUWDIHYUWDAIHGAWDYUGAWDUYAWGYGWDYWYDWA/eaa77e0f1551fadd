const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moderationDb = require('../../database/moderation');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir üyeyi sunucudan atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak üye').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ Bu üye sunucuda bulunamadı.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: '❌ Bu üyeyi atmak için yetkim yetersiz.', ephemeral: true });
        }

        try {
            await member.kick(`${interaction.user.tag}: ${reason}`);
            moderationDb.addCase(interaction.guild.id, user.id, interaction.user.id, 'KICK', reason);

            logger.log(interaction.guild, {
                title: '👢 Üye Atıldı (Kick)',
                description: `**Kullanıcı:** ${user.tag} (${user.id})\n**Yetkili:** ${interaction.user.tag}\n**Sebep:** ${reason}`,
                color: config.colors.warning
            });

            return interaction.reply(`👢 **${user.tag}** sunucudan başarıyla atıldı.\n**Sebep:** ${reason}`);
        } catch (err) {
            return interaction.reply({ content: `Atma işlemi sırasında hata oluştu: ${err.message}`, ephemeral: true });
        }
    }
};
