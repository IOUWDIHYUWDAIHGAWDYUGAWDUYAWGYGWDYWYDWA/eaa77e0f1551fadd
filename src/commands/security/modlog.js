const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const settingsDb = require('../../database/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Denetim kayıtlarının (mod-log) gönderileceği kanalı ayarlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('kanal')
                .setDescription('Mod-Log kanalı (Boş bırakılırsa sıfırlanır)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        const channel = interaction.options.getChannel('kanal');

        if (!channel) {
            settingsDb.updateSettings(interaction.guild.id, { mod_log_channel: null });
            return interaction.reply('ℹ️ Mod-Log kanalı sıfırlandı.');
        }

        settingsDb.updateSettings(interaction.guild.id, { mod_log_channel: channel.id });
        return interaction.reply(`✅ Mod-Log kanalı başarıyla ${channel} olarak ayarlandı!`);
    }
};
