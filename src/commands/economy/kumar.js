const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyDb = require('../../database/economy');
const config = require('../../config');

const slots = ['🍎', '🍒', '🍇', '💎', '7️⃣'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kumar')
        .setDescription('Cüzdanındaki coinlerle şansını dene.')
        .addSubcommand(sub =>
            sub.setName('slot')
                .setDescription('Slot makinesinde şansını dene.')
                .addIntegerOption(opt => opt.setName('bahis').setDescription('Bahis miktarı').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub =>
            sub.setName('yazi-tura')
                .setDescription('Yazı tura atarak 2 katını kazan.')
                .addStringOption(opt =>
                    opt.setName('secim')
                        .setDescription('Tahminin')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Yazı', value: 'yazi' },
                            { name: 'Tura', value: 'tura' }
                        )
                )
                .addIntegerOption(opt => opt.setName('bahis').setDescription('Bahis miktarı').setRequired(true).setMinValue(10))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const bet = interaction.options.getInteger('bahis');
        const user = economyDb.getUser(interaction.guild.id, interaction.user.id);

        if (user.wallet < bet) {
            return interaction.reply({
                content: `❌ Yetersiz bakiye! Cüzdanında sadece **${user.wallet} Coin** var.`,
                ephemeral: true
            });
        }

        if (sub === 'slot') {
            const s1 = slots[Math.floor(Math.random() * slots.length)];
            const s2 = slots[Math.floor(Math.random() * slots.length)];
            const s3 = slots[Math.floor(Math.random() * slots.length)];

            const win = (s1 === s2 && s2 === s3);
            const winAmount = win ? bet * 3 : -bet;

            const updated = economyDb.addWallet(interaction.guild.id, interaction.user.id, winAmount);

            const embed = new EmbedBuilder()
                .setTitle('🎰 Slot Makinesi')
                .setColor(win ? config.colors.success : config.colors.danger)
                .setDescription(
                    `**[ ${s1} | ${s2} | ${s3} ]**\n\n` +
                    (win
                        ? `🎉 **JACKPOT!** 3 eşleşme yakaladın ve **${bet * 3} Coin** kazandın!`
                        : `😔 Maalesef kaybettin! **${bet} Coin** cüzdanından eksildi.`) +
                    `\n\nYeni Bakiyen: **${updated.wallet} Coin**`
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'yazi-tura') {
            const choice = interaction.options.getString('secim');
            const outcome = Math.random() < 0.5 ? 'yazi' : 'tura';
            const win = (choice === outcome);
            const winAmount = win ? bet : -bet;

            const updated = economyDb.addWallet(interaction.guild.id, interaction.user.id, winAmount);

            const outcomeText = outcome === 'yazi' ? '🪙 **Yazı**' : '🪙 **Tura**';

            const embed = new EmbedBuilder()
                .setTitle('🪙 Yazı - Tura')
                .setColor(win ? config.colors.success : config.colors.danger)
                .setDescription(
                    `Para havaya atıldı ve... ${outcomeText} geldi!\n\n` +
                    (win
                        ? `🎉 Doğru tahmin! **${bet * 2} Coin** kazandın!`
                        : `😔 Yanlış tahmin! **${bet} Coin** kaybettin.`) +
                    `\n\nYeni Bakiyen: **${updated.wallet} Coin**`
                );

            return interaction.reply({ embeds: [embed] });
        }
    }
};
