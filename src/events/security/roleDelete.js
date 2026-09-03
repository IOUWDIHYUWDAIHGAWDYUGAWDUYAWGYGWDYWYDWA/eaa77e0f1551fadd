const { AuditLogEvent } = require('discord.js');
const settingsDb = require('../../database/settings');
const logger = require('../../utils/logger');
const config = require('../../config');

const roleDeleteTracker = new Map();

module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role, client) {
        if (!role.guild) return;
        const guild = role.guild;
        const settings = settingsDb.getSettings(guild.id);

        let executor = null;
        try {
            const auditLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleDelete
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
            title: '🛡️ Rol Silindi',
            description: `**Rol:** @${role.name} (${role.id})\n**Silen:** ${executor ? `${executor.tag} (${executor.id})` : 'Bilinmiyor'}`,
            color: config.colors.warning
        });

        // Anti-Nuke Koruması
        if (settings.anti_nuke === 1 && executor && executor.id !== client.user.id && executor.id !== guild.ownerId) {
            const key = `${guild.id}_${executor.id}`;
            const now = Date.now();
            const timestamps = roleDeleteTracker.get(key) || [];
            const recent = timestamps.filter(t => now - t < config.defaults.antiNukeWindowMs);
            recent.push(now);
            roleDeleteTracker.set(key, recent);

            if (recent.length >= config.defaults.antiNukeLimit) {
                try {
                    const member = await guild.members.fetch(executor.id).catch(() => null);
                    if (member && member.manageable) {
                        await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: Çok sayıda rol silme girişimi');
                        
                        logger.log(guild, {
                            title: '🚨🚨 [ANTI-NUKE TETİKLENDİ] 🚨🚨',
                            description: `**Şüpheli:** ${executor.tag} (${executor.id})\nKısa sürede ${recent.length} adet rol sildi!\n**Uygulanan Eylem:** 24 saat zamanaşımı (Timeout) uygulandı ve eylemleri durduruldu.`,
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
