const { AuditLogEvent } = require('discord.js');
const settingsDb = require('../../database/settings');
const logger = require('../../utils/logger');
const config = require('../../config');

const channelDeleteTracker = new Map();

module.exports = {
    name: 'channelDelete',
    once: false,
    async execute(channel, client) {
        if (!channel.guild) return;
        const guild = channel.guild;
        const settings = settingsDb.getSettings(guild.id);

        let executor = null;
        try {
            const auditLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelDelete
            });
            const entry = auditLogs.entries.first();
            if (entry && (Date.now() - entry.createdTimestamp) < 5000) {
                executor = entry.executor;
            }
        } catch (err) {
            console.error('Audit log çekilemedi:', err.message);
        }

        // Mod-Log
        logger.log(guild, {
            title: '📁 Kanal Silindi',
            description: `**Kanal:** #${channel.name} (${channel.id})\n**Silen:** ${executor ? `${executor.tag} (${executor.id})` : 'Bilinmiyor'}`,
            color: config.colors.warning
        });

        // Anti-Nuke Koruması
        if (settings.anti_nuke === 1 && executor && executor.id !== client.user.id && executor.id !== guild.ownerId) {
            const key = `${guild.id}_${executor.id}`;
            const now = Date.now();
            const timestamps = channelDeleteTracker.get(key) || [];
            const recent = timestamps.filter(t => now - t < config.defaults.antiNukeWindowMs);
            recent.push(now);
            channelDeleteTracker.set(key, recent);

            if (recent.length >= config.defaults.antiNukeLimit) {
                try {
                    const member = await guild.members.fetch(executor.id).catch(() => null);
                    if (member && member.manageable) {
                        // Tehlikeli eylemi durdurmak için yetkilerini al (rollerini sıfırla veya timeout at)
                        await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: Çok sayıda kanal silme girişimi');
                        
                        logger.log(guild, {
                            title: '🚨🚨 [ANTI-NUKE TETİKLENDİ] 🚨🚨',
                            description: `**Şüpheli:** ${executor.tag} (${executor.id})\nKısa sürede ${recent.length} adet kanal sildi!\n**Uygulanan Eylem:** 24 saat zamanaşımı (Timeout) uygulandı ve eylemleri durduruldu.`,
                            color: config.colors.danger
                        });
                    }
                } catch (e) {
                    console.error('Anti-nuke eylemi uygulanamadı:', e.message);
                }
            }
        }
    }
};
