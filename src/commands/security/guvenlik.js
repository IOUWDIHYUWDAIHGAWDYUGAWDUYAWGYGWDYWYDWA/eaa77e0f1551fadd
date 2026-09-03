const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const settingsDb = require('../../database/settings');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guvenlik')
        .setDescription('Sunucu güvenlik ve koruma sistemlerini yönetin.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('durum')
                .setDescription('Mevcut güvenlik ayarlarını görüntüler.')
        )
        .addSubcommand(sub =>
            sub.setName('anti-nuke')
                .setDescription('Anti-Nuke (Kanal/Rol silme koruması) açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Aktif mi?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('anti-link')
                .setDescription('Reklam ve davet linki filtresini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Aktif mi?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('anti-kufur')
                .setDescription('Küfür ve argo filtresini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Aktif mi?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('anti-spam')
                .setDescription('Spam ve flood korumasını açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Aktif mi?').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = settingsDb.getSettings(interaction.guild.id);

        if (sub === 'durum') {
            const embed = new EmbedBuilder()
                .setTitle(`🛡️ ${interaction.guild.name} - Güvenlik Durumu`)
                .setColor(config.colors.primary)
                .addFields(
                    { name: '💣 Anti-Nuke (Kanal/Rol Silme Engeli)', value: settings.anti_nuke === 1 ? '🟢 **Açık**' : '🔴 **Kapalı**', inline: true },
                    { name: '🔗 Anti-Link (Reklam Engeli)', value: settings.anti_link === 1 ? '🟢 **Açık**' : '🔴 **Kapalı**', inline: true },
                    { name: '🤬 Anti-Küfür (Kelime Filtresi)', value: settings.anti_swear === 1 ? '🟢 **Açık**' : '🔴 **Kapalı**', inline: true },
                    { name: '⚡ Anti-Spam (Hızlı Mesaj Koruması)', value: settings.anti_spam === 1 ? '🟢 **Açık**' : '🔴 **Kapalı**', inline: true },
                    { name: '📝 Mod-Log Kanalı', value: settings.mod_log_channel ? `<#${settings.mod_log_channel}>` : '❌ *Ayarlanmamış*', inline: true },
                    { name: '🤖 Oto-Rol', value: settings.autorole_id ? `<@&${settings.autorole_id}>` : '❌ *Ayarlanmamış*', inline: true }
                )
                .setFooter({ text: 'vybot Güvenlik Sistemi' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const state = interaction.options.getBoolean('durum');
        const numState = state ? 1 : 0;

        if (sub === 'anti-nuke') {
            settingsDb.updateSettings(interaction.guild.id, { anti_nuke: numState });
            return interaction.reply(`💣 **Anti-Nuke Koruması** ${state ? '🟢 **Aktif edildi**' : '🔴 **Devre dışı bırakıldı**'}.`);
        }

        if (sub === 'anti-link') {
            settingsDb.updateSettings(interaction.guild.id, { anti_link: numState });
            return interaction.reply(`🔗 **Reklam / Link Koruması** ${state ? '🟢 **Aktif edildi**' : '🔴 **Devre dışı bırakıldı**'}.`);
        }

        if (sub === 'anti-kufur') {
            settingsDb.updateSettings(interaction.guild.id, { anti_swear: numState });
            return interaction.reply(`🤬 **Küfür Filtresi** ${state ? '🟢 **Aktif edildi**' : '🔴 **Devre dışı bırakıldı**'}.`);
        }

        if (sub === 'anti-spam') {
            settingsDb.updateSettings(interaction.guild.id, { anti_spam: numState });
            return interaction.reply(`⚡ **Anti-Spam Koruması** ${state ? '🟢 **Aktif edildi**' : '🔴 **Devre dışı bırakıldı**'}.`);
        }
    }
};
