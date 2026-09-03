const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economy');

const jobs = [
    { title: 'Yazılımcı olarak çalıştın ve bir Discord botu kodladın', min: 70, max: 150 },
    { title: 'Bir kafede garsonluk yaptın ve bolca bahşiş aldın', min: 50, max: 120 },
    { title: 'Sokakta müzik yaptın ve insanlar sana para bıraktı', min: 40, max: 90 },
    { title: 'Grafik tasarım projesini başarıyla teslim ettin', min: 80, max: 180 },
    { title: 'Kurye olarak paket dağıtımı yaptın', min: 60, max: 130 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calis')
        .setDescription('Bir işte çalışarak para kazanırsınız (1 saat bekleme süresi).'),

    async execute(interaction) {
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        const result = economyDb.claimWork(interaction.guild.id, interaction.user.id, earned);

        if (!result.success) {
            const minutes = Math.floor(result.remainingMs / (1000 * 60));
            const seconds = Math.floor((result.remainingMs % (1000 * 60)) / 1000);
            return interaction.reply({
                content: `😴 Çok yoruldun! Tekrar çalışmak için **${minutes} dakika ${seconds} saniye** dinlenmelisin.`,
                ephemeral: true
            });
        }

        return interaction.reply(`💼 ${job.title} ve **${earned} Coin** kazandın!\nYeni bakiyen: **${result.newBalance} Coin**.`);
    }
};
