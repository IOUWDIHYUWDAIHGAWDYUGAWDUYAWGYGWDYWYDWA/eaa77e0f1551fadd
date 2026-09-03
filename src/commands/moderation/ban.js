const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moderationDb = require('../../database/moderation');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir üyeyi sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Yasaklama sebebi').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member) {
            if (!member.bannable) {
                return interaction.reply({ content: '❌ Bu üyeyi yasaklamak için yetkim yetersiz.', ephemeral: true });
            }
        }

        try {
            await interaction.guild.members.ban(user.id, { reason: `${interaction.user.tag}: ${reason}` });
            moderationDb.addCase(interaction.guild.id, user.id, interaction.user.id, 'BAN', reason);

            logger.log(interaction.guild, {
                title: '🔨 Üye Yasaklandı (Ban)',
                description: `**Kullanıcı:** ${user.tag} (${user.id})\n**Yetkili:** ${interaction.user.tag}\n**Sebep:** ${reason}`,
                color: config.colors.danger
            });

            return interaction.reply(`🔨 **${user.tag}** sunucudan başarıyla yasaklandı.\n**Sebep:** ${reason}`);
        } catch (err) {
            return interaction.reply({ content: `Yasaklama sırasında hata oluştu: ${err.message}`, ephemeral: true });
        }
    }
};
