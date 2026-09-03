const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('vybot fotoğraflı ve interaktif yardım menüsünü açar.'),

    async execute(interaction, client) {
        const homeEmbed = new EmbedBuilder()
            .setTitle('🌐 vybot - Siber Mavi Çok Amaçlı Asistan')
            .setColor(config.colors.primary)
            .setDescription(
                '**vybot**; MEE6 seviye sistemi, Carl-bot buton rolleri, Ticket Tool destek panelleri ve Dyno tarzı gelişmiş Anti-Nuke güvenliğini birleştiren **herkese açık** küresel Discord botudur.\n\n' +
                '🌀 **Nasıl Kullanılır?**\n' +
                'Aşağıdaki **açılır menüden (Select Menu)** dilediğin kategoriyi seçerek fotoğraflı detaylı komut listesini ve rehberi görüntüleyebilirsin.\n\n' +
                '🔷 `🛡️ Güvenlik & Korumalar` • Anti-Nuke, Anti-Link, Küfür & Spam Filtresi\n' +
                '🔷 `🔨 Moderasyon & Sicil` • Ban, Kick, Timeout, Uyarı ve Temizleme\n' +
                '🔷 `🏆 Seviye (MEE6 Tarzı)` • Rank Kartı, Liderlik Tablosu & Seviye Rolleri\n' +
                '🔷 `🎫 Destek / Ticket` • Butonlu Özel Bilet Oluşturma Sistemi\n' +
                '🔷 `🎭 Buton Roller & Kayıt` • Tıklamalı Rol Alma ve Doğrulama\n' +
                '🔷 `💰 Ekonomi & Kumar` • Bakiye, Günlük Coin, Meslekler ve Slot\n' +
                '🔷 `🎁 Çekiliş & Araçlar` • Otomatik Çekiliş, Bot İstatistikleri ve Ping'
            )
            .setImage(config.banners.help)
            .setFooter({ text: 'vybot • Herkese Açık Gelişmiş Discord Botu' })
            .setTimestamp();

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu_select')
                .setPlaceholder('📂 İncelemek istediğiniz kategoriyi seçin...')
                .addOptions([
                    {
                        label: 'Ana Menüye Dön',
                        description: 'Genel bilgilendirme sayfasına geri döner.',
                        value: 'help_home',
                        emoji: '🏠'
                    },
                    {
                        label: 'Güvenlik & Korumalar',
                        description: 'Anti-Nuke, Anti-Link, Küfür ve Spam korumaları',
                        value: 'help_security',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Moderasyon & Sicil',
                        description: 'Ban, Kick, Timeout, Uyarı ve Temizleme komutları',
                        value: 'help_moderation',
                        emoji: '🔨'
                    },
                    {
                        label: 'Seviye (MEE6 Tarzı)',
                        description: 'Rank kartı, Liderlik sıralaması ve Seviye ödülleri',
                        value: 'help_leveling',
                        emoji: '🏆'
                    },
                    {
                        label: 'Destek / Ticket Sistemi',
                        description: 'Butonlu destek bileti paneli ve yönetimi',
                        value: 'help_tickets',
                        emoji: '🎫'
                    },
                    {
                        label: 'Buton Roller & Doğrulama',
                        description: 'Tıklamalı rol alma paneli ve üye doğrulama',
                        value: 'help_roles',
                        emoji: '🎭'
                    },
                    {
                        label: 'Ekonomi & Şans Oyunları',
                        description: 'Bakiye, Günlük ödül, Çalışma ve Kumar oyunları',
                        value: 'help_economy',
                        emoji: '💰'
                    },
                    {
                        label: 'Çekiliş & Sunucu Araçları',
                        description: 'Otomatik çekilişler, Ping ve Sunucu bilgileri',
                        value: 'help_utility',
                        emoji: '🎁'
                    }
                ])
        );

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Botu Sunucuna Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
                .setEmoji('🌐'),
            new ButtonBuilder()
                .setCustomId('help_refresh')
                .setLabel('Yenile')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄')
        );

        return interaction.reply({
            embeds: [homeEmbed],
            components: [selectMenu, buttonRow]
        });
    }
};
