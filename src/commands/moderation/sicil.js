const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const moderationDb = require('../../database/moderation');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicil')
        .setDescription('Bir kullanıcının ceza ve uyarı geçmişini görüntüler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Geçmişi görüntülenecek üye').setRequired(true))
        .addBooleanOption(opt => opt.setName('temizle').setDescription('Sicil geçmişini sıfırla?').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const shouldClear = interaction.options.getBoolean('temizle');

        if (shouldClear) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Sicili sıfırlamak için Yönetici yetkisi gereklidir.', ephemeral: true });
            }
            moderationDb.clearUserCases(interaction.guild.id, user.id);
            return interaction.reply(`🗑️ **${user.tag}** adlı kullanıcının tüm sicil ve ceza kayıtları başarıyla sıfırlandı.`);
        }

        const cases = moderationDb.getUserCases(interaction.guild.id, user.id);

        if (cases.length === 0) {
            return interaction.reply(`✨ **${user.tag}** kullanıcısının herhangi bir ceza veya uyarı kaydı bulunmuyor. Temiz bir sicile sahip!`);
        }

        const embed = new EmbedBuilder()
            .setTitle(`📜 ${user.tag} - Ceza Sicili`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(config.colors.primary)
            .setDescription(`Toplam **${cases.length}** adet kayıt bulundu.\n`)
            .setFooter({ text: 'vybot Moderasyon Sistemi' })
            .setTimestamp();

        // En son 10 kaydı listele
        const recentCases = cases.slice(0, 10);
        for (const c of recentCases) {
            const dateStr = `<t:${Math.floor(c.created_at / 1000)}:d>`;
            embed.addFields({
                name: `Ceza #${c.id} - [${c.type}] (${dateStr})`,
                value: `**Yetkili:** <@${c.moderator_id}>\n**Sebep:** ${c.reason || 'Belirtilmedi'}`
            });
        }

        return interaction.reply({ embeds: [embed] });
    }
};
