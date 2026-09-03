const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const levelsDb = require('../../database/levels');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seviye-odul')
        .setDescription('Seviye ödül rollerini yönetin.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Belirli bir seviyeye ulaşıldığında verilecek rolü ekler.')
                .addIntegerOption(opt => opt.setName('seviye').setDescription('Gereken seviye').setRequired(true).setMinValue(1))
                .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek ödül rolü').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Bir seviyenin ödül rolünü kaldırır.')
                .addIntegerOption(opt => opt.setName('seviye').setDescription('Kaldırılacak seviye').setRequired(true).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Ayarlanmış tüm seviye ödül rollerini listeler.')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ekle') {
            const level = interaction.options.getInteger('seviye');
            const role = interaction.options.getRole('rol');

            levelsDb.setReward(interaction.guild.id, level, role.id);
            return interaction.reply(`🎉 **Seviye ${level}** için ödül rolü **${role.name}** olarak ayarlandı!`);
        }

        if (sub === 'sil') {
            const level = interaction.options.getInteger('seviye');
            levelsDb.removeReward(interaction.guild.id, level);
            return interaction.reply(`🗑️ **Seviye ${level}** için ödül rolü kaldırıldı.`);
        }

        if (sub === 'liste') {
            const rewards = levelsDb.getRewards(interaction.guild.id);
            if (rewards.length === 0) {
                return interaction.reply('Sunucuda henüz ayarlanmış bir seviye ödül rolü bulunmuyor.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${interaction.guild.name} - Seviye Rol Ödülleri`)
                .setColor(config.colors.primary)
                .setDescription(rewards.map(r => `• **Seviye ${r.level}:** <@&${r.role_id}>`).join('\n'))
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }
};
