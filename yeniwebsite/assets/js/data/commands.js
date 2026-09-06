/**
 * VYBot — Gerçek Komut Verisi
 * ---------------------------------------------------------------------------
 * KAYNAK: bot kaynak kodundaki "src/commands" klasörü — komut adları,
 * açıklamaları, kullanımları ve Discord izinleri SlashCommandBuilder
 * tanımlarıyla birebir aynıdır. Uydurma komut YOKTUR (26. madde: gerçek veri).
 */

export const CATEGORIES = [
  { id: 'moderasyon', label: 'Moderasyon' },
  { id: 'guvenlik',   label: 'Güvenlik' },
  { id: 'muzik',      label: 'Müzik' },
  { id: 'ekonomi',    label: 'Ekonomi' },
  { id: 'seviye',     label: 'Seviye' },
  { id: 'cekilis',    label: 'Çekiliş' },
  { id: 'roller',     label: 'Roller' },
  { id: 'ticket',     label: 'Ticket' },
  { id: 'arac',       label: 'Araçlar' },
];

/** İzin anahtarları → Türkçe etiket (discord.js PermissionFlagsBits karşılıkları) */
export const PERM = {
  administrator: 'Yönetici',
  banMembers: 'Üyeleri Yasakla',
  kickMembers: 'Üyeleri At',
  moderateMembers: 'Üyeleri Zaman Aşımına Uğrat',
  manageMessages: 'Mesajları Yönet',
  manageGuild: 'Sunucuyu Yönet',
};

export const COMMANDS = [
  // ── Moderasyon (src/commands/moderation) ─────────────────────────────
  {
    name: 'ban', category: 'moderasyon',
    description: 'Bir üyeyi sunucudan yasaklar.',
    usage: '/ban <kullanici> [sebep]',
    permission: PERM.banMembers,
  },
  {
    name: 'kick', category: 'moderasyon',
    description: 'Bir üyeyi sunucudan atar.',
    usage: '/kick <kullanici> [sebep]',
    permission: PERM.kickMembers,
  },
  {
    name: 'timeout', category: 'moderasyon',
    description: 'Bir üyeyi belirli bir süre susturur (zamanaşımı uygular).',
    usage: '/timeout <kullanici> <dakika> [sebep]',
    permission: PERM.moderateMembers,
  },
  {
    name: 'untimeout', category: 'moderasyon',
    description: 'Bir üyenin susturmasını (zamanaşımını) kaldırır.',
    usage: '/untimeout <kullanici>',
    permission: PERM.moderateMembers,
  },
  {
    name: 'uyar', category: 'moderasyon',
    description: 'Bir üyeyi resmi olarak uyarır ve siciline kaydeder.',
    usage: '/uyar <kullanici> <sebep>',
    permission: PERM.moderateMembers,
  },
  {
    name: 'sicil', category: 'moderasyon',
    description: 'Bir kullanıcının ceza ve uyarı geçmişini görüntüler.',
    usage: '/sicil <kullanici> [temizle]',
    permission: PERM.moderateMembers,
  },
  {
    name: 'temizle', category: 'moderasyon',
    description: 'Belirtilen sayıda mesajı kanaldan topluca siler.',
    usage: '/temizle <miktar: 1-100>',
    permission: PERM.manageMessages,
  },

  // ── Güvenlik (src/commands/security) ─────────────────────────────────
  {
    name: 'guvenlik', category: 'guvenlik',
    description: 'Sunucu güvenlik ve koruma sistemlerini yönetin.',
    usage: '/guvenlik <durum | anti-nuke | anti-link | anti-kufur | anti-spam>',
    permission: PERM.administrator,
  },
  {
    name: 'dogrulama-kur', category: 'guvenlik',
    description: 'Sunucuya butonlu ve fotoğraflı üye doğrulama (Kayıt) paneli gönderir.',
    usage: '/dogrulama-kur <rol>',
    permission: PERM.administrator,
  },
  {
    name: 'otorol', category: 'guvenlik',
    description: 'Sunucuya yeni katılanlara otomatik verilecek rolü ayarlar.',
    usage: '/otorol [rol]',
    permission: PERM.administrator,
  },
  {
    name: 'modlog', category: 'guvenlik',
    description: 'Denetim kayıtlarının (mod-log) gönderileceği kanalı ayarlar.',
    usage: '/modlog [kanal]',
    permission: PERM.administrator,
  },

  // ── Müzik (src/commands/music) ───────────────────────────────────────
  {
    name: 'cal', category: 'muzik',
    description: 'YouTube, Spotify veya SoundCloud üzerinden şarkı çalar.',
    usage: '/cal <sarki>',
    permission: null,
  },
  {
    name: 'durdur', category: 'muzik',
    description: 'Müziği durdurur, kuyruğu temizler ve sesli odadan ayrılır.',
    usage: '/durdur',
    permission: null,
  },
  {
    name: 'gec', category: 'muzik',
    description: 'Çalan şarkıyı geçer ve sıradakine atlar.',
    usage: '/gec',
    permission: null,
  },
  {
    name: 'kuyruk', category: 'muzik',
    description: 'Müzik sırasındaki şarkıları listeler.',
    usage: '/kuyruk',
    permission: null,
  },

  // ── Ekonomi (src/commands/economy) ───────────────────────────────────
  {
    name: 'bakiye', category: 'ekonomi',
    description: 'Mevcut cüzdan ve banka bakiyenizi görüntüler.',
    usage: '/bakiye [kullanici]',
    permission: null,
  },
  {
    name: 'gunluk', category: 'ekonomi',
    description: '24 saatlik günlük coin ödülünüzü alırsınız.',
    usage: '/gunluk',
    permission: null,
  },
  {
    name: 'calis', category: 'ekonomi',
    description: 'Bir işte çalışarak para kazanırsınız (1 saat bekleme süresi).',
    usage: '/calis',
    permission: null,
  },
  {
    name: 'kumar', category: 'ekonomi',
    description: 'Cüzdanındaki coinlerle şansını dene.',
    usage: '/kumar <slot <bahis> | yazi-tura <secim> <bahis>>',
    permission: null,
  },
  {
    name: 'yazi-tura', category: 'ekonomi',
    description: 'Yazı-tura atarak şansınızı deneyin ve coin kazanın.',
    usage: '/yazi-tura <secim> <miktar>',
    permission: null,
  },
  {
    name: 'zenginler', category: 'ekonomi',
    description: 'Sunucunun en zengin 10 kullanıcısını listeler.',
    usage: '/zenginler',
    permission: null,
  },

  // ── Seviye (src/commands/leveling) ───────────────────────────────────
  {
    name: 'rank', category: 'seviye',
    description: 'Kullanıcının seviye kartını ve XP ilerlemesini görüntüler.',
    usage: '/rank [kullanici]',
    permission: null,
  },
  {
    name: 'liderlik', category: 'seviye',
    description: 'Sunucunun en yüksek seviyeli üyelerini gösterir.',
    usage: '/liderlik',
    permission: null,
  },
  {
    name: 'seviye-odul', category: 'seviye',
    description: 'Seviye ödül rollerini yönetin.',
    usage: '/seviye-odul <ekle | sil | liste>',
    permission: PERM.administrator,
  },

  // ── Çekiliş (src/commands/giveaway) ──────────────────────────────────
  {
    name: 'cekilis', category: 'cekilis',
    description: 'Sunucuda butonlu ve fotoğraflı yeni bir çekiliş başlatır.',
    usage: '/cekilis <odul> <dakika> [kazanan]',
    permission: PERM.manageGuild,
  },

  // ── Roller (src/commands/roles) ──────────────────────────────────────
  {
    name: 'rol-panel', category: 'roller',
    description: 'Kullanıcıların tıklayarak rol alabileceği butonlu ve fotoğraflı bir panel oluşturur.',
    usage: '/rol-panel <rol1> [rol2] [rol3] [rol4] [rol5] [baslik]',
    permission: PERM.administrator,
  },

  // ── Ticket (src/commands/tickets) ────────────────────────────────────
  {
    name: 'ticket-kur', category: 'ticket',
    description: 'Kanalda fotoğraflı ve butonlu destek bileti paneli oluşturur.',
    usage: '/ticket-kur [baslik] [aciklama]',
    permission: PERM.administrator,
  },

  // ── Araçlar (src/commands/utility) ───────────────────────────────────
  {
    name: 'yardim', category: 'arac',
    description: 'vybot fotoğraflı ve butonlu interaktif yardım menüsünü açar.',
    usage: '/yardim',
    permission: null,
  },
  {
    name: 'menu', category: 'arac',
    description: 'Fotoğraflı ve butonlu vybot ana kontrol panelini açar.',
    usage: '/menu',
    permission: null,
  },
  {
    name: 'panel', category: 'arac',
    description: 'vybot web yönetim panelinin bağlantısını verir.',
    usage: '/panel',
    permission: null,
  },
  {
    name: 'panel-bagla', category: 'arac',
    description: 'Web yönetim panelini bu sunucuya bağlar (webhook köprüsü kurar).',
    usage: '/panel-bagla',
    permission: PERM.manageGuild,
  },
  {
    name: 'yonetim', category: 'arac',
    description: 'Sunucu genel bakışı ve GitHub Actions kontrol panelini açar.',
    usage: '/yonetim',
    permission: PERM.administrator,
  },
  {
    name: 'botbilgi', category: 'arac',
    description: "vybot'un canlı istatistiklerini, sunucu sayısını ve sistem durumunu görüntüler.",
    usage: '/botbilgi',
    permission: null,
  },
  {
    name: 'sistem', category: 'arac',
    description: 'Botun canlı bellek kullanımı, gecikme ve sistem kaynaklarını gösterir.',
    usage: '/sistem',
    permission: null,
  },
  {
    name: 'davet', category: 'arac',
    description: "vybot'u kendi sunucunuza eklemek için davet bağlantısını verir.",
    usage: '/davet',
    permission: null,
  },
  {
    name: 'ping', category: 'arac',
    description: 'Botun ve Discord API gecikmesini görüntüler.',
    usage: '/ping',
    permission: null,
  },
  {
    name: 'profil', category: 'arac',
    description: 'Kullanıcının seviye, bakiye, sicil ve sunucu verilerini gösteren özel kartı oluşturur.',
    usage: '/profil [kullanici]',
    permission: null,
  },
  {
    name: 'sunucu', category: 'arac',
    description: 'Sunucu hakkında genel bilgileri ve istatistikleri gösterir.',
    usage: '/sunucu',
    permission: null,
  },
];

/** Kategoriye göre komutları gruplar */
export function groupByCategory() {
  const map = new Map();
  for (const cat of CATEGORIES) map.set(cat.id, []);
  for (const cmd of COMMANDS) {
    if (!map.has(cmd.category)) map.set(cmd.category, []);
    map.get(cmd.category).push(cmd);
  }
  return map;
}

