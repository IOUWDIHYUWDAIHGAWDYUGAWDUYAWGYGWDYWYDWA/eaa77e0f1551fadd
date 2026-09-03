const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economy');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gunluk')
        .setDescription('24 saatlik günlük coin ödülünüzü alırsınız.'),

    async execute(interaction) {
        const reward = config.defaults.defaultDailyReward;
        const result = economyDb.claimDaily(interaction.guild.id, interaction.user.id, reward);

        if (!result.success) {
            const hours = Math.floor(result.remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((result.remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            return interaction.reply({
                content: `⏳ Günlük ödülünü zaten aldın! Tekrar almak için **${hours} saat ${minutes} dakika** beklemelisin.`,
                ephemeral: true
            });
        }

        return interaction.reply(`🎉 Günlük ödülün olan **${reward} Coin** cüzdanına eklendi! Yeni bakiyen: **${result.newBalance} Coin**.`);
    }
};
