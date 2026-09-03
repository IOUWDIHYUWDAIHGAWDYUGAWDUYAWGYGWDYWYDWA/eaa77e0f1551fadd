const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moderationDb = require('../../database/moderation');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyar')
        .setDescription('Bir üyeyi resmi olarak uyarır ve siciline kaydeder.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak üye').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');

        if (user.bot) {
            return interaction.reply({ content: '❌ Botlar uyarılamaz.', ephemeral: true });
        }

        const caseId = moderationDb.addCase(interaction.guild.id, user.id, interaction.user.id, 'WARN', reason);
        const warnCount = moderationDb.getWarnCount(interaction.guild.id, user.id);

        logger.log(interaction.guild, {
            title: '⚠️ Üye Uyarıldı',
            description: `**Kullanıcı:** ${user.tag} (${user.id})\n**Yetkili:** ${interaction.user.tag}\n**Sebep:** ${reason}\n**Toplam Uyarı:** ${warnCount}\n**Ceza ID:** #${caseId}`,
            color: config.colors.warning
        });

        let extraWarning = '';
        if (warnCount >= 3) {
            extraWarning = '\n🚨 **DİKKAT:** Bu üye 3 veya daha fazla uyarıya ulaştı!';
        }

        return interaction.reply(`⚠️ **${user.tag}** başarıyla uyarıldı. (Toplam: ${warnCount} Uyarı)\n**Sebep:** ${reason}${extraWarning}`);
    }
};
