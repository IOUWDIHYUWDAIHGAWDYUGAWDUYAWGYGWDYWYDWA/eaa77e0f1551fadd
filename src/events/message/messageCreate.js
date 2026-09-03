const { PermissionFlagsBits } = require('discord.js');
const settingsDb = require('../../database/settings');
const levelsDb = require('../../database/levels');
const moderationDb = require('../../database/moderation');
const logger = require('../../utils/logger');
const config = require('../../config');

// Spam takibi için önbellek: Map<`${guildId}_${userId}`, Array<timestamps>>
const spamTracker = new Map();

// Küfür & Reklam listeleri
const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
const linkRegex = /https?:\/\/[^\s]+/i;

const swearWords = [
    'amk', 'aq', 'orospu', 'piç', 'pic', 'sik', 'siktir', 'yarrak', 'yarak', 'oç', 'oc', 
    'pezevenk', 'göt', 'got', 'kahpe', 'amına', 'amina', 'ananı', 'anani', 'ibne'
];

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        const settings = settingsDb.getSettings(message.guild.id);
        const member = message.member;
        const isStaff = member && member.permissions.has(PermissionFlagsBits.ManageMessages);

        // ==========================================
        // 1. GÜVENLİK & AUTO-MOD
        // ==========================================
        if (!isStaff) {
            // A. Reklam / Link Engeli
            if (settings.anti_link === 1) {
                if (inviteRegex.test(message.content) || linkRegex.test(message.content)) {
                    try {
                        await message.delete();
                        const warnMsg = await message.channel.send(`⚠️ ${message.author}, bu sunucuda bağlantı / reklam paylaşımı yasaktır!`);
                        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                        moderationDb.addCase(message.guild.id, message.author.id, client.user.id, 'WARN', 'Otomatik Reklam/Link Engeli');

                        logger.log(message.guild, {
                            title: '🛡️ Auto-Mod: Reklam / Link Engellendi',
                            description: `**Kullanıcı:** ${message.author.tag} (${message.author.id})\n**Kanal:** ${message.channel}\n**İçerik:** \`\`\`${message.content.substring(0, 1000)}\`\`\``,
                            color: config.colors.danger
                        });
                        return;
                    } catch (err) {
                        console.error('Mesaj silinemedi:', err.message);
                    }
                }
            }

            // B. Küfür & Argo Engeli
            if (settings.anti_swear === 1) {
                const lowerContent = message.content.toLowerCase();
                const hasSwear = swearWords.some(w => {
                    const regex = new RegExp(`\\b${w}\\b`, 'i');
                    return regex.test(lowerContent);
                });

                if (hasSwear) {
                    try {
                        await message.delete();
                        const warnMsg = await message.channel.send(`🤫 ${message.author}, lütfen sunucu içerisinde küfür ve argo kullanmayınız!`);
                        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                        logger.log(message.guild, {
                            title: '🛡️ Auto-Mod: Küfür Filtresi',
                            description: `**Kullanıcı:** ${message.author.tag}\n**Kanal:** ${message.channel}\n**İçerik:** \`\`\`${message.content.substring(0, 1000)}\`\`\``,
                            color: config.colors.warning
                        });
                        return;
                    } catch (err) {
                        console.error('Mesaj silinemedi:', err.message);
                    }
                }
            }

            // C. Spam / Flood Koruması
            if (settings.anti_spam === 1) {
                const key = `${message.guild.id}_${message.author.id}`;
                const now = Date.now();
                const timestamps = spamTracker.get(key) || [];
                const recent = timestamps.filter(t => now - t < 5000);
                recent.push(now);
                spamTracker.set(key, recent);

                if (recent.length >= 6) {
                    try {
                        await message.delete();
                        // 1 dakika zamanaşımı (timeout) uygula
                        if (member.moderatable) {
                            await member.timeout(60 * 1000, 'Auto-Mod: Hızlı mesaj spamı');
                            await message.channel.send(`🛑 ${message.author}, çok hızlı mesaj gönderdiğin için 1 dakika süreyle susturuldun!`);
                        }
                        spamTracker.delete(key);
                        return;
                    } catch (e) {
                        console.error('Spam timeout uygulanamadı:', e.message);
                    }
                }
            }
        }

        // ==========================================
        // 2. MEE6 SEVİYE & XP SİSTEMİ
        // ==========================================
        if (settings.level_system === 1) {
            const userData = levelsDb.getUser(message.guild.id, message.author.id);
            const now = Date.now();
            const cooldownMs = config.defaults.xpCooldownSeconds * 1000;

            if (now - userData.last_xp_time >= cooldownMs) {
                const earnedXp = Math.floor(Math.random() * (config.defaults.maxXpPerMessage - config.defaults.minXpPerMessage + 1)) + config.defaults.minXpPerMessage;
                const result = levelsDb.addXp(message.guild.id, message.author.id, earnedXp);

                if (result.leveledUp) {
                    message.channel.send(`🎉 Tebrikler ${message.author}! **Seviye ${result.newLevel}**'e ulaştın!`).catch(() => {});

                    // Seviye Ödül Rolü Kontrolü
                    const rewards = levelsDb.getRewards(message.guild.id);
                    for (const r of rewards) {
                        if (result.newLevel >= r.level) {
                            const rewardRole = message.guild.roles.cache.get(r.role_id);
                            if (rewardRole && !member.roles.cache.has(rewardRole.id)) {
                                member.roles.add(rewardRole).catch(() => {});
                            }
                        }
                    }
                }
            }
        }
    }
};
