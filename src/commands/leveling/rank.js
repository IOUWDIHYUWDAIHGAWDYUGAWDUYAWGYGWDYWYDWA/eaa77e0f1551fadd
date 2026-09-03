const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const levelsDb = require('../../database/levels');
const canvasGenerator = require('../../utils/canvasGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Kullanıcının seviye kartını ve XP ilerlemesini görüntüler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kartı görüntülenecek üye').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('kullanici') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply('Kullanıcı sunucuda bulunamadı.');
        }

        const rankData = levelsDb.getUserRank(interaction.guild.id, targetUser.id);
        const requiredXp = levelsDb.xpForNextLevel(rankData.level);

        try {
            const cardBuffer = await canvasGenerator.createRankCard(targetMember, {
                level: rankData.level,
                currentXp: rankData.xp,
                requiredXp: requiredXp,
                rank: rankData.rank || 1
            });

            const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank.png' });
            return interaction.editReply({ files: [attachment] });
        } catch (err) {
            console.error('Rank kartı hatası:', err);
            return interaction.editReply({
                content: `📊 **${targetUser.tag}**\n**Seviye:** ${rankData.level}\n**XP:** ${rankData.xp} / ${requiredXp}\n**Sıralama:** #${rankData.rank || 'N/A'}`
            });
        }
    }
};
