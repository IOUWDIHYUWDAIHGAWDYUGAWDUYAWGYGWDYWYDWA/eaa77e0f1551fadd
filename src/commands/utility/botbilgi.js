const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const config = require('../../config');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botbilgi')
        .setDescription('vybot\'un canlı istatistiklerini, sunucu sayısını ve sistem durumunu görüntüler.'),

    async execute(interaction, client) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}g ${hours}s ${minutes}d ${seconds}sn`;

        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
        const totalChannels = client.channels.cache.size;
        const memoryUsedMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const embed = new EmbedBuilder()
            .setTitle('🤖 vybot - Genel Sistem İstatistikleri')
            .setColor(config.colors.primary)
            .setThumbnail(client.user.displayAvatarURL())
            .setImage(config.banners.help)
            .addFields(
                { name: '🌐 Sunucu Sayısı', value: `\`${totalGuilds.toLocaleString()}\` Sunucu`, inline: true },
                { name: '👥 Kullanıcı Sayısı', value: `\`${totalUsers.toLocaleString()}\` Üye`, inline: true },
                { name: '📁 Kanal Sayısı', value: `\`${totalChannels.toLocaleString()}\` Kanal`, inline: true },
                { name: '⚡ Bot Gecikmesi (Ping)', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: '⏳ Çalışma Süresi (Uptime)', value: `\`${uptimeStr}\``, inline: true },
                { name: '💾 RAM Kullanımı', value: `\`${memoryUsedMB} MB\``, inline: true },
                { name: '📦 Node.js Sürümü', value: `\`${process.version}\``, inline: true },
                { name: '🛡️ Discord.js Sürümü', value: `\`v${djsVersion}\``, inline: true },
                { name: '📜 Toplam Komut', value: `\`${client.commands.size}\` Komut`, inline: true }
            )
            .setFooter({ text: 'vybot • Herkese Açık Discord Botu' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
