const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settingsDb = require('../database/settings');
const ticketsDb = require('../database/tickets');
const giveawaysDb = require('../database/giveaways');
const embedHelper = require('../utils/embedHelper');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = async (interaction, client) => {
    // 1. SLASH KOMUTLAR
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`[KOMUT HATASI] /${interaction.commandName}:`, error);
            const errorEmbed = embedHelper.error(
                'Komut Hatası',
                'Bu komutu çalıştırırken bir hata meydana geldi.'
            );
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            }
        }
        return;
    }

    // 2. BUTONLAR
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // Bilet Açma Butonu
        if (customId === 'ticket_create') {
            const existing = ticketsDb.getUserOpenTicket(interaction.guild.id, interaction.user.id);
            if (existing) {
                const ch = interaction.guild.channels.cache.get(existing.channel_id);
                if (ch) {
                    return interaction.reply({
                        content: `⚠️ Zaten açık bir biletiniz var: ${ch}`,
                        ephemeral: true
                    });
                }
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const channelName = `ticket-${interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'destek'}`;
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.AttachFiles,
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ManageChannels
                            ]
                        }
                    ]
                });

                ticketsDb.createTicket(interaction.guild.id, ticketChannel.id, interaction.user.id);

                const ticketEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Destek Bileti - #${ticketChannel.name}`)
                    .setDescription(`Merhaba ${interaction.user}, destek ekibimiz en kısa sürede seninle ilgilenecektir.\n\nLütfen sorununuzu detaylı bir şekilde açıklayın.`)
                    .setColor(config.colors.primary)
                    .setImage(config.banners.ticket)
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Bileti Kapat')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔒')
                );

                await ticketChannel.send({
                    content: `${interaction.user} hoş geldiniz! Yetkili ekip birazdan burada olacaktır.`,
                    embeds: [ticketEmbed],
                    components: [closeRow]
                });

                await interaction.editReply({
                    content: `🔷 Biletiniz başarıyla açıldı: ${ticketChannel}`
                });
            } catch (err) {
                console.error('[Ticket Hatası]', err);
                await interaction.editReply({
                    content: 'Bilet kanalı oluşturulurken bir hata oluştu! Botun "Kanalları Yönet" yetkisi olduğundan emin olun.'
                });
            }
            return;
        }

        // Bilet Kapatma Butonu
        if (customId === 'ticket_close') {
            const ticketData = ticketsDb.getTicket(interaction.channel.id);
            if (!ticketData || ticketData.status !== 'OPEN') {
                return interaction.reply({
                    content: 'Bu kanal geçerli veya açık bir bilet kanalı değil.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '🔒 Bilet 5 saniye içinde kapatılıp silinecektir...'
            });

            ticketsDb.closeTicket(interaction.channel.id);

            // Mod-Log
            logger.log(interaction.guild, {
                title: '🎫 Destek Bileti Kapatıldı',
                description: `**Kanal:** ${interaction.channel.name}\n**Kapatan:** ${interaction.user.tag}\n**Bilet Sahibi:** <@${ticketData.user_id}>`,
                color: config.colors.primary
            });

            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (e) {
                    console.error('Bilet kanalı silinemedi:', e.message);
                }
            }, 5000);
            return;
        }

        // Doğrulama (Verify) Butonu
        if (customId === 'verify_button') {
            const settings = settingsDb.getSettings(interaction.guild.id);
            if (!settings.verify_role_id) {
                return interaction.reply({
                    content: 'Bu sunucuda henüz bir doğrulama rolü ayarlanmamış.',
                    ephemeral: true
                });
            }

            const role = interaction.guild.roles.cache.get(settings.verify_role_id);
            if (!role) {
                return interaction.reply({
                    content: 'Doğrulama rolü sunucuda bulunamadı.',
                    ephemeral: true
                });
            }

            const member = interaction.member;
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({
                    content: 'Zaten doğrulanmış durumdasınız!',
                    ephemeral: true
                });
            }

            try {
                await member.roles.add(role);
                return interaction.reply({
                    content: `🌊 Başarıyla doğrulandınız! **${role.name}** rolü verildi.`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[Verify Role Hatası]', err);
                return interaction.reply({
                    content: 'Rol verilirken bir yetki hatası oluştu. Botun rolünün, verilecek rolden daha yukarıda olduğundan emin olun.',
                    ephemeral: true
                });
            }
        }

        // Çekilişe Katılma Butonu
        if (customId === 'giveaway_join') {
            const result = giveawaysDb.toggleEntry(interaction.message.id, interaction.user.id);
            if (!result) {
                return interaction.reply({
                    content: 'Bu çekiliş sona ermiş veya bulunamadı.',
                    ephemeral: true
                });
            }

            if (result.joined) {
                return interaction.reply({
                    content: `🎉 Çekilişe başarıyla katıldınız! (Toplam katılımcı: ${result.count})`,
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    content: `Çekilişten ayrıldınız. (Kalan katılımcı: ${result.count})`,
                    ephemeral: true
                });
            }
        }

        // Buton Rol (role_toggle_<roleId>)
        if (customId.startsWith('role_toggle_')) {
            const roleId = customId.replace('role_toggle_', '');
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.reply({
                    content: 'Bu rol artık sunucuda mevcut değil.',
                    ephemeral: true
                });
            }

            const member = interaction.member;
            try {
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    return interaction.reply({
                        content: `➖ **${role.name}** rolü üzerinizden alındı.`,
                        ephemeral: true
                    });
                } else {
                    await member.roles.add(role);
                    return interaction.reply({
                        content: `➕ **${role.name}** rolü üzerinize verildi.`,
                        ephemeral: true
                    });
                }
            } catch (e) {
                return interaction.reply({
                    content: 'Rol değiştirilirken yetki hatası oluştu.',
                    ephemeral: true
                });
            }
        }

        // Yardım Menüsü Yenileme Butonu
        if (customId === 'help_refresh') {
            const command = client.commands.get('yardim');
            if (command) {
                return command.execute(interaction, client);
            }
        }
    }

    // 3. SELECT MENÜLER
    if (interaction.isStringSelectMenu()) {
        // Dinamik Yardım Menüsü Kategori Seçimi
        if (interaction.customId === 'help_menu_select') {
            const selected = interaction.values[0];
            let title = '';
            let description = '';
            let banner = config.banners.help;

            switch (selected) {
                case 'help_security':
                    title = '🛡️ Güvenlik & Korumalar Rehberi';
                    banner = config.banners.security;
                    description = 
                        'Sunucunuzu yetkisiz müdahalelere, reklamcılara ve bot saldırılarına karşı korur.\n\n' +
                        '🔷 `/guvenlik durum` • Tüm güvenlik filtrelerinin canlı durumunu gösterir.\n' +
                        '🔷 `/guvenlik anti-nuke` • Yetkililerin toplu kanal/rol silmesini anında engeller.\n' +
                        '🔷 `/guvenlik anti-link` • Discord davet linklerini ve reklamları siler.\n' +
                        '🔷 `/guvenlik anti-kufur` • Sohbet içi küfür ve argo kelimeleri engeller.\n' +
                        '🔷 `/guvenlik anti-spam` • Hızlı flood mesaj atanlara otomatik timeout atar.\n' +
                        '🔷 `/modlog [kanal]` • Silinen mesajları ve denetim kayıtlarını bu kanala iletir.\n' +
                        '🔷 `/otorol [rol]` • Sunucuya katılan yeni üyelere otomatik rol verir.';
                    break;

                case 'help_moderation':
                    title = '🔨 Moderasyon & Sicil Yönetimi';
                    banner = config.banners.security;
                    description = 
                        'Yetkili ekibinizin sunucu düzenini sağlaması için gereken komutlar:\n\n' +
                        '🔷 `/ban [üye] (sebep)` • Üyeyi sunucudan kalıcı olarak yasaklar.\n' +
                        '🔷 `/kick [üye] (sebep)` • Üyeyi sunucudan atar.\n' +
                        '🔷 `/timeout [üye] [dakika] (sebep)` • Üyeye zamanaşımı (susturma) uygular.\n' +
                        '🔷 `/untimeout [üye]` • Üyenin susturmasını kaldırır.\n' +
                        '🔷 `/uyar [üye] [sebep]` • Üyeye resmi uyarı verir ve sicile işler.\n' +
                        '🔷 `/sicil [üye] (temizle)` • Üyenin geçmiş ceza kayıtlarını listeler.\n' +
                        '🔷 `/temizle [1-100]` • Kanaldaki mesajları topluca temizler.';
                    break;

                case 'help_leveling':
                    title = '🏆 MEE6 Tarzı Seviye & XP Sistemi';
                    banner = config.banners.level;
                    description = 
                        'Üyelerin metin kanallarında sohbet ettikçe XP kazanıp seviye atlamasını sağlar:\n\n' +
                        '🔷 `/rank (üye)` • Yüksek kaliteli fütüristik Canvas rank kartını görüntüler.\n' +
                        '🔷 `/liderlik` • Sunucunun en aktif ilk 10 üyesini listeler.\n' +
                        '🔷 `/seviye-odul ekle` • Belirli bir seviyeye ulaşanlara otomatik rol verir.\n' +
                        '🔷 `/seviye-odul liste` • Ayarlanmış seviye rol ödüllerini gösterir.\n' +
                        '🔷 `/seviye-odul sil` • Seviye ödülünü kaldırır.';
                    break;

                case 'help_tickets':
                    title = '🎫 Gelişmiş Destek & Bilet Sistemi';
                    banner = config.banners.ticket;
                    description = 
                        'Üyelerin yetkili ekiple gizli ve düzenli görüşmeler yapmasını sağlar:\n\n' +
                        '🔷 `/ticket-kur (başlık) (açıklama)` • Kanala butonlu destek paneli gönderir.\n' +
                        '🔷 **Özel Kanal:** Butona tıklandığında `ticket-kullanici` adında gizli kanal açılır.\n' +
                        '🔷 **Tek Tıkla Kapat:** Bilet içindeki **"Bileti Kapat"** butonu ile kanal silinir ve mod-log kanalına arşivlenir.';
                    break;

                case 'help_roles':
                    title = '🎭 Buton Roller & Kayıt Paneli';
                    banner = config.banners.roles;
                    description = 
                        'Kullanıcıların reaksiyon yerine modern butonlara basarak rol almasını sağlar:\n\n' +
                        '🔷 `/rol-panel [başlık] [rol1] ...` • 5 adede kadar rol seçilebilen buton paneli kurar.\n' +
                        '🔷 `/dogrulama-kur [rol]` • Sunucuya bot/sahte hesapları engelleyen butonlu kayıt paneli kurar.';
                    break;

                case 'help_economy':
                    title = '💰 Ekonomi & Şans Oyunları';
                    banner = config.banners.economy;
                    description = 
                        'Sunucu içi mini ekonomi ve eğlenceli şans oyunları:\n\n' +
                        '🔷 `/bakiye (üye)` • Cüzdan ve banka bakiyesini görüntüler.\n' +
                        '🔷 `/gunluk` • 24 saatte bir ücretsiz coin ödülü verir.\n' +
                        '🔷 `/calis` • 1 saatlik aralıklarla mesleklerde çalışıp para kazandırır.\n' +
                        '🔷 `/kumar slot [bahis]` • 3 eşleşmeli meyve slot makinesi.\n' +
                        '🔷 `/kumar yazi-tura [seçim] [bahis]` • Yazı-tura atarak bahsi ikiye katlar.';
                    break;

                case 'help_utility':
                    title = '🎁 Çekiliş & Sunucu Araçları';
                    banner = config.banners.giveaway;
                    description = 
                        'Sunucu yönetimi ve eğlence araçları:\n\n' +
                        '🔷 `/cekilis [ödül] [dakika] (kazanan)` • Butonlu otomatik çekiliş başlatır.\n' +
                        '🔷 `/davet` • vybot\'u kendi sunucuna ekleme davet bağlantısını verir.\n' +
                        '🔷 `/botbilgi` • vybot\'un canlı istatistiklerini ve sunucu sayısını gösterir.\n' +
                        '🔷 `/ping` • Bot ve Discord API gecikme sürelerini ölçer.\n' +
                        '🔷 `/sunucu` • Sunucu hakkında detaylı istatistikleri sunar.';
                    break;

                default: // help_home
                    title = '🌐 vybot - Siber Mavi Çok Amaçlı Asistan';
                    banner = config.banners.help;
                    description = 
                        '**vybot**; MEE6 seviye sistemi, Carl-bot buton rolleri, Ticket Tool destek panelleri ve Dyno tarzı gelişmiş Anti-Nuke güvenliğini birleştiren **herkese açık** küresel Discord botudur.\n\n' +
                        'Aşağıdaki **açılır menüden** dilediğin kategoriyi seçerek fotoğraflı detaylı komut listesini inceleyebilirsin.';
                    break;
            }

            const updatedEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(config.colors.primary)
                .setImage(banner)
                .setFooter({ text: 'vybot • Herkese Açık Gelişmiş Discord Botu' })
                .setTimestamp();

            return interaction.update({ embeds: [updatedEmbed] });
        }

        // Rol Menüsü
        if (interaction.customId === 'role_menu_select') {
            const selectedRoleId = interaction.values[0];
            const role = interaction.guild.roles.cache.get(selectedRoleId);
            if (!role) {
                return interaction.reply({ content: 'Rol bulunamadı.', ephemeral: true });
            }

            const member = interaction.member;
            try {
                if (member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    return interaction.reply({ content: `➖ **${role.name}** rolü üzerinizden alındı.`, ephemeral: true });
                } else {
                    await member.roles.add(role);
                    return interaction.reply({ content: `➕ **${role.name}** rolü size verildi.`, ephemeral: true });
                }
            } catch (err) {
                return interaction.reply({ content: 'Rol güncellenirken hata oluştu.', ephemeral: true });
            }
        }
    }
};
