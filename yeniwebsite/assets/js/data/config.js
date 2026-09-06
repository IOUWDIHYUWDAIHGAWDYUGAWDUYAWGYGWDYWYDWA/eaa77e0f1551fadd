/**
 * VYBot — Site Yapılandırması
 * ---------------------------------------------------------------------------
 * Tek noktadan yapılandırma. Deploy sırasında değişecek alanlar burada.
 * GERÇEK veri: CLIENT_ID, botun .env dosyasından alınmıştır.
 * Dikkat: Bot tokeni ASLA buraya yazılmaz — yalnızca herkese açık ID'ler.
 */
window.VYBOT_CONFIG = {
  // Discord uygulama (client) ID — /davet komutunun kullandığı gerçek ID
  clientId: '1545157265831759903',

  // Gerçek OAuth davet bağlantısı (bot /davet komutuyla aynı formatta)
  inviteUrl:
    'https://discord.com/api/oauth2/authorize?client_id=1545157265831759903&permissions=1100349828182&scope=bot%20applications.commands',

  // Canlı veri: bot, düzenli olarak live-data dalına gerçek sunucu verisi yazar
  // (bkz. src/utils/liveDataSync.js → { version, updatedAt, guilds, bot })
  // Site bu dosyayı her 10 saniyede bir yeniden çekerek güncel gösterir.
  liveDataUrl:
    'https://raw.githubusercontent.com/IOUWDIHYUWDAIHGAWDYUGAWDUYAWGYGWDYWYDWA/eaa77e0f1551fadd/live-data/live-data.json',

  // Canlı veri çekme zaman aşımı (ms)
  liveDataTimeoutMs: 8000,

  // Canonical site adresi (SEO/sitemap için — deploy adresine göre güncelleyin)
  siteUrl: 'https://iouwdihyuwdaihgawdyugawduyawgygwdywydwa.github.io/eaa77e0f1551fadd/',

  // GitHub Pages üzerinde çalışan public OAuth callback adresi.
  oauthRedirectUri:
    'https://iouwdihyuwdaihgawdyugawduyawgygwdywydwa.github.io/eaa77e0f1551fadd/dashboard/',
  oauthScopes: 'identify guilds',

  // Server-side panel API'si hazır olduğunda burada kullanılacak.
  dashboardApiUrl: '',

  // Sabit named-tunnel URL'si (domain bağlanınca doldurulur). Boşsa live-data/tunnel.json okunur.
  botApiUrl: '',

  tunnelUrl:
    'https://raw.githubusercontent.com/IOUWDIHYUWDAIHGAWDYUGAWDUYAWGYGWDYWYDWA/eaa77e0f1551fadd/live-data/tunnel.json',
};
