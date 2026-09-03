const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyDb = require('../../database/economy');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bakiye')
        .setDescription('Mevcut cüzdan ve banka bakiyenizi görüntüler.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Bakiyesi görüntülenecek üye').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const data = economyDb.getUser(interaction.guild.id, target.id);

        const embed = new EmbedBuilder()
            .setTitle(`💰 ${target.username} - Bakiye Durumu`)
            .setColor(config.colors.primary)
            .setThumbnail(target.displayAvatarURL())
            .setImage(config.banners.economy)
            .addFields(
                { name: '💵 Cüzdan', value: `\`${data.wallet.toLocaleString()}\` Coin`, inline: true },
                { name: '🏦 Banka', value: `\`${data.bank.toLocaleString()}\` Coin`, inline: true },
                { name: '💎 Toplam Varlık', value: `\`${(data.wallet + data.bank).toLocaleString()}\` Coin`, inline: true }
            )
            .setFooter({ text: 'vybot Siber Ekonomi' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
