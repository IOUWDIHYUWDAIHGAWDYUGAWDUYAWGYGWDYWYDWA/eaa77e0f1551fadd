const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsDb = require('../../database/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otorol')
        .setDescription('Sunucuya yeni katılanlara otomatik verilecek rolü ayarlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('rol')
                .setDescription('Otomatik verilecek rol (Boş bırakılırsa sıfırlanır)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const role = interaction.options.getRole('rol');

        if (!role) {
            settingsDb.updateSettings(interaction.guild.id, { autorole_id: null });
            return interaction.reply('ℹ️ Oto-rol sistemi sıfırlandı.');
        }

        if (role.managed || role.id === interaction.guild.roles.everyone.id) {
            return interaction.reply({ content: '❌ Bu rol bir bot rolü veya @everyone olduğu için seçilemez.', ephemeral: true });
        }

        settingsDb.updateSettings(interaction.guild.id, { autorole_id: role.id });
        return interaction.reply(`✅ Oto-rol başarıyla **${role.name}** olarak ayarlandı! Artık yeni katılanlara bu rol otomatik verilecek.`);
    }
};
