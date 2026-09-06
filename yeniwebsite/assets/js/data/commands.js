/**
 * VYBot — Real Command Data (EN/TR)
 * Source: bot source code (src/commands folder) — names, descriptions, usage
 * and permissions match the bot's SlashCommandBuilder definitions exactly.
 * No invented commands.
 */

export const CATEGORIES = [
  { id: 'moderasyon', label: { en: 'Moderation', tr: 'Moderasyon' }, icon: 'shield' },
  { id: 'guvenlik',   label: { en: 'Security',   tr: 'Güvenlik' },   icon: 'lock' },
  { id: 'muzik',      label: { en: 'Music',      tr: 'Müzik' },      icon: 'note' },
  { id: 'ekonomi',    label: { en: 'Economy',    tr: 'Ekonomi' },    icon: 'coin' },
  { id: 'seviye',     label: { en: 'Level',      tr: 'Seviye' },     icon: 'star' },
  { id: 'cekilis',    label: { en: 'Giveaway',   tr: 'Çekiliş' },    icon: 'gift' },
  { id: 'roller',     label: { en: 'Roles',      tr: 'Roller' },     icon: 'tag' },
  { id: 'ticket',     label: { en: 'Ticket',     tr: 'Ticket' },     icon: 'chat' },
  { id: 'arac',       label: { en: 'Utilities',  tr: 'Araçlar' },    icon: 'tool' },
];

export const PERM = {
  administrator:   { en: 'Administrator', tr: 'Yönetici' },
  banMembers:      { en: 'Ban Members', tr: 'Üyeleri Yasakla' },
  kickMembers:     { en: 'Kick Members', tr: 'Üyeleri At' },
  moderateMembers: { en: 'Timeout Members', tr: 'Zaman Aşımı Ver' },
  manageMessages:  { en: 'Manage Messages', tr: 'Mesajları Yönet' },
  manageGuild:     { en: 'Manage Server', tr: 'Sunucuyu Yönet' },
};

export const COMMANDS = [
  // Moderation
  { name: 'ban', category: 'moderasyon',
    desc: { en: 'Bans a member from the server.', tr: 'Bir üyeyi sunucudan yasaklar.' },
    usage: '/ban <kullanici> [sebep]', permission: PERM.banMembers },
  { name: 'kick', category: 'moderasyon',
    desc: { en: 'Kicks a member from the server.', tr: 'Bir üyeyi sunucudan atar.' },
    usage: '/kick <kullanici> [sebep]', permission: PERM.kickMembers },
  { name: 'timeout', category: 'moderasyon',
    desc: { en: 'Times out a member for a specified duration.', tr: 'Bir üyeyi belirli bir süre susturur.' },
    usage: '/timeout <kullanici> <dakika> [sebep]', permission: PERM.moderateMembers },
  { name: 'untimeout', category: 'moderasyon',
    desc: { en: 'Removes a member\'s timeout.', tr: 'Bir üyenin susturmasını kaldırır.' },
    usage: '/untimeout <kullanici>', permission: PERM.moderateMembers },
  { name: 'uyar', category: 'moderasyon',
    desc: { en: 'Issues a formal warning and logs it to the member\'s record.', tr: 'Bir üyeyi resmi olarak uyarır ve siciline kaydeder.' },
    usage: '/uyar <kullanici> <sebep>', permission: PERM.moderateMembers },
  { name: 'sicil', category: 'moderasyon',
    desc: { en: 'Views a member\'s punishment and warning history.', tr: 'Bir kullanıcının ceza ve uyarı geçmişini görüntüler.' },
    usage: '/sicil <kullanici> [temizle]', permission: PERM.moderateMembers },
  { name: 'temizle', category: 'moderasyon',
    desc: { en: 'Bulk deletes the specified number of messages.', tr: 'Belirtilen sayıda mesajı kanaldan topluca siler.' },
    usage: '/temizle <miktar: 1-100>', permission: PERM.manageMessages },

  // Security
  { name: 'guvenlik', category: 'guvenlik',
    desc: { en: 'Manage server security and protection systems.', tr: 'Sunucu güvenlik ve koruma sistemlerini yönetin.' },
    usage: '/guvenlik <durum | anti-nuke | anti-link | anti-kufur | anti-spam>', permission: PERM.administrator },
  { name: 'dogrulama-kur', category: 'guvenlik',
    desc: { en: 'Sends a button-based member verification panel with a banner image.', tr: 'Butonlu ve fotoğraflı üye doğrulama paneli gönderir.' },
    usage: '/dogrulama-kur <rol>', permission: PERM.administrator },
  { name: 'otorol', category: 'guvenlik',
    desc: { en: 'Sets the auto-role given to new members on join.', tr: 'Sunucuya yeni katılanlara otomatik verilecek rolü ayarlar.' },
    usage: '/otorol [rol]', permission: PERM.administrator },
  { name: 'modlog', category: 'guvenlik',
    desc: { en: 'Sets the channel for moderation audit logs.', tr: 'Denetim kayıtlarının gönderileceği kanalı ayarlar.' },
    usage: '/modlog [kanal]', permission: PERM.administrator },

  // Music
  { name: 'cal', category: 'muzik',
    desc: { en: 'Plays a song from YouTube, Spotify or SoundCloud.', tr: 'YouTube, Spotify veya SoundCloud üzerinden şarkı çalar.' },
    usage: '/cal <sarki>', permission: null },
  { name: 'durdur', category: 'muzik',
    desc: { en: 'Stops music, clears the queue and leaves the voice channel.', tr: 'Müziği durdurur, kuyruğu temizler ve sesli odadan ayrılır.' },
    usage: '/durdur', permission: null },
  { name: 'gec', category: 'muzik',
    desc: { en: 'Skips the current song and jumps to the next.', tr: 'Çalan şarkıyı geçer ve sıradakine atlar.' },
    usage: '/gec', permission: null },
  { name: 'kuyruk', category: 'muzik',
    desc: { en: 'Lists the songs in the music queue.', tr: 'Müzik sırasındaki şarkıları listeler.' },
    usage: '/kuyruk', permission: null },

  // Economy
  { name: 'bakiye', category: 'ekonomi',
    desc: { en: 'Shows your current wallet and bank balance.', tr: 'Mevcut cüzdan ve banka bakiyenizi görüntüler.' },
    usage: '/bakiye [kullanici]', permission: null },
  { name: 'gunluk', category: 'ekonomi',
    desc: { en: 'Claims your 24-hour daily coin reward.', tr: '24 saatlik günlük coin ödülünüzü alırsınız.' },
    usage: '/gunluk', permission: null },
  { name: 'calis', category: 'ekonomi',
    desc: { en: 'Works a job to earn coins (1-hour cooldown).', tr: 'Bir işte çalışarak para kazanırsınız (1 saat bekleme).' },
    usage: '/calis', permission: null },
  { name: 'kumar', category: 'ekonomi',
    desc: { en: 'Try your luck with coins (slots or coin flip).', tr: 'Cüzdanındaki coinlerle şansını dene.' },
    usage: '/kumar <slot | yazi-tura> <bahis>', permission: null },
  { name: 'yazi-tura', category: 'ekonomi',
    desc: { en: 'Flip a coin to win coins.', tr: 'Yazı-tura atarak coin kazanın.' },
    usage: '/yazi-tura <secim> <miktar>', permission: null },
  { name: 'zenginler', category: 'ekonomi',
    desc: { en: 'Lists the server\'s top 10 richest members.', tr: 'Sunucunun en zengin 10 kullanıcısını listeler.' },
    usage: '/zenginler', permission: null },

  // Leveling
  { name: 'rank', category: 'seviye',
    desc: { en: 'Displays a member\'s level card and XP progress.', tr: 'Kullanıcının seviye kartını ve XP ilerlemesini görüntüler.' },
    usage: '/rank [kullanici]', permission: null },
  { name: 'liderlik', category: 'seviye',
    desc: { en: 'Shows the server\'s highest-leveled members.', tr: 'Sunucunun en yüksek seviyeli üyelerini gösterir.' },
    usage: '/liderlik', permission: null },
  { name: 'seviye-odul', category: 'seviye',
    desc: { en: 'Manage level reward roles.', tr: 'Seviye ödül rollerini yönetin.' },
    usage: '/seviye-odul <ekle | sil | liste>', permission: PERM.administrator },

  // Giveaway
  { name: 'cekilis', category: 'cekilis',
    desc: { en: 'Starts a button-based giveaway with a banner image.', tr: 'Butonlu ve fotoğraflı yeni bir çekiliş başlatır.' },
    usage: '/cekilis <odul> <dakika> [kazanan]', permission: PERM.manageGuild },

  // Roles
  { name: 'rol-panel', category: 'roller',
    desc: { en: 'Creates a button-based role panel (up to 5 roles).', tr: 'Butonlu rol alma/bırakma paneli oluşturur (5 role kadar).' },
    usage: '/rol-panel <rol1> [rol2] [rol3] [rol4] [rol5]', permission: PERM.administrator },

  // Ticket
  { name: 'ticket-kur', category: 'ticket',
    desc: { en: 'Creates a button-based support ticket panel.', tr: 'Kanalda fotoğraflı ve butonlu destek bileti paneli oluşturur.' },
    usage: '/ticket-kur [baslik] [aciklama]', permission: PERM.administrator },

  // Utilities
  { name: 'yardim', category: 'arac',
    desc: { en: 'Opens the interactive help menu with photo and buttons.', tr: 'Fotoğraflı ve butonlu interaktif yardım menüsünü açar.' },
    usage: '/yardim', permission: null },
  { name: 'menu', category: 'arac',
    desc: { en: 'Opens the VYBot main control panel with photo and buttons.', tr: 'Fotoğraflı ve butonlu VYBot ana kontrol panelini açar.' },
    usage: '/menu', permission: null },
  { name: 'yonetim', category: 'arac',
    desc: { en: 'Opens the server overview and GitHub Actions panel.', tr: 'Sunucu genel bakışı ve GitHub Actions kontrol panelini açar.' },
    usage: '/yonetim', permission: PERM.administrator },
  { name: 'botbilgi', category: 'arac',
    desc: { en: 'Shows VYBot\'s live stats, server count and system status.', tr: 'VYBot\'un canlı istatistiklerini ve sistem durumunu gösterir.' },
    usage: '/botbilgi', permission: null },
  { name: 'sistem', category: 'arac',
    desc: { en: 'Shows live memory usage, latency and system resources.', tr: 'Canlı bellek kullanımı, gecikme ve sistem kaynaklarını gösterir.' },
    usage: '/sistem', permission: null },
  { name: 'davet', category: 'arac',
    desc: { en: 'Shows the invite link to add VYBot to your server.', tr: 'VYBot\'u sunucunuza eklemek için davet bağlantısını verir.' },
    usage: '/davet', permission: null },
  { name: 'ping', category: 'arac',
    desc: { en: 'Shows bot and Discord API latency.', tr: 'Botun ve Discord API gecikmesini görüntüler.' },
    usage: '/ping', permission: null },
  { name: 'profil', category: 'arac',
    desc: { en: 'Creates a custom card with level, balance, record and server data.', tr: 'Seviye, bakiye, sicil ve sunucu verilerini gösteren kart oluşturur.' },
    usage: '/profil [kullanici]', permission: null },
  { name: 'sunucu', category: 'arac',
    desc: { en: 'Shows general server info and statistics.', tr: 'Sunucu hakkında genel bilgileri ve istatistikleri gösterir.' },
    usage: '/sunucu', permission: null },
];

export function groupByCategory() {
  const map = new Map();
  for (const cat of CATEGORIES) map.set(cat.id, []);
  for (const cmd of COMMANDS) {
    if (!map.has(cmd.category)) map.set(cmd.category, []);
    map.get(cmd.category).push(cmd);
  }
  return map;
}

