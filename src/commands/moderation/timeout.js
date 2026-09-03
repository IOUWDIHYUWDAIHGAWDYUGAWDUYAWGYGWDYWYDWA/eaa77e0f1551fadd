const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moderationDb = require('../../database/moderation');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Bir üyeyi belirli bir süre susturur (zamanaşımı uygular).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak üye').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('dakika')
                .setDescription('Susturma süresi (dakika cinsinden)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320) // Maks 28 gün (Discord sınırı)
        )
        .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const minutes = interaction.options.getInteger('dakika');
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: '❌ Bu üye sunucuda bulunamadı.', ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: '❌ Bu üyeye zamanaşımı uygulamak için yetkim yetersiz.', ephemeral: true });
        }

        try {
            const ms = minutes * 60 * 1000;
            await member.timeout(ms, `${interaction.user.tag}: ${reason}`);
            moderationDb.addCase(interaction.guild.id, user.id, interaction.user.id, 'TIMEOUT', `${minutes} dakika - ${reason}`);

            logger.log(interaction.guild, {
                title: '⏳ Üye Susturuldu (Timeout)',
                description: `**Kullanıcı:** ${user.tag} (${user.id})\n**Süre:** ${minutes} Dakika\n**Yetkili:** ${interaction.user.tag}\n**Sebep:** ${reason}`,
                color: config.colors.warning
            });

            return interaction.reply(`⏳ **${user.tag}** adlı üye **${minutes} dakika** boyunca susturuldu.\n**Sebep:** ${reason}`);
        } catch (err) {
            return interaction.reply({ content: `Zamanaşımı uygulanırken hata: ${err.message}`, ephemeral: true });
        }
    }
};
