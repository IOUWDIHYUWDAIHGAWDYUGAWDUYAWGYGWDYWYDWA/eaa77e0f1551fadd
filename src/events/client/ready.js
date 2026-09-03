const { ActivityType, EmbedBuilder } = require('discord.js');
const giveawaysDb = require('../../database/giveaways');
const config = require('../../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`=========================================`);
        console.log(`[BOT AKTİF] ${client.user.tag} başarıyla giriş yaptı!`);
        console.log(`[SUNUCULAR] Toplam ${client.guilds.cache.size} sunucuda hizmet veriliyor.`);
        console.log(`=========================================`);

        // Durum (Presence) Döngüsü
        const activities = [
            { name: '🛡️ Güvenlik & Moderasyon', type: ActivityType.Watching },
            { name: '🏆 /rank & /liderlik', type: ActivityType.Competing },
            { name: '🎫 /ticket-kur & Destek', type: ActivityType.Listening },
            { name: '💰 /bakiye & /kumar', type: ActivityType.Playing }
        ];

        let index = 0;
        setInterval(() => {
            const act = activities[index % activities.length];
            client.user.setActivity(act.name, { type: act.type });
            index++;
        }, 15000);

        // Çekiliş Takip Döngüsü (Her 5 saniyede bir)
        setInterval(async () => {
            try {
                const activeGiveaways = giveawaysDb.getActiveGiveaways();
                const now = Date.now();

                for (const g of activeGiveaways) {
                    if (now >= g.end_time) {
                        giveawaysDb.endGiveaway(g.message_id);

                        const channel = client.channels.cache.get(g.channel_id);
                        if (!channel) continue;

                        const message = await channel.messages.fetch(g.message_id).catch(() => null);
                        if (!message) continue;

                        const entries = g.entries;
                        let winnerText = 'Katılımcı bulunamadı!';

                        if (entries.length > 0) {
                            // Rastgele kazananları belirle
                            const shuffled = [...entries].sort(() => 0.5 - Math.random());
                            const winners = shuffled.slice(0, Math.min(g.winners_count, shuffled.length));
                            winnerText = winners.map(w => `<@${w}>`).join(', ');
                        }

                        const endEmbed = EmbedBuilder.from(message.embeds[0])
                            .setTitle('🎉 ÇEKİLİŞ SONA ERDİ 🎉')
                            .setColor(config.colors.gold)
                            .setDescription(`**Ödül:** ${g.prize}\n**Kazanan(lar):** ${winnerText}\n**Düzenleyen:** <@${g.host_id}>`)
                            .setFooter({ text: 'Çekiliş tamamlandı' });

                        await message.edit({ embeds: [endEmbed], components: [] });

                        if (entries.length > 0) {
                            await channel.send(`🎉 Tebrikler ${winnerText}! **${g.prize}** ödülünü kazandınız!`);
                        } else {
                            await channel.send(`😔 **${g.prize}** çekilişine yeterli katılım olmadı.`);
                        }
                    }
                }
            } catch (err) {
                console.error('Çekiliş kontrol hatası:', err.message);
            }
        }, 5000);
    }
};
