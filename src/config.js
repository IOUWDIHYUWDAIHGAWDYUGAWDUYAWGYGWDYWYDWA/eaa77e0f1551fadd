require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '', // İsteğe bağlı: komutları tek sunucuya hızlı test için yüklemek isterseniz

    // Fütüristik & Siber Mavi Tasarım Paleti
    colors: {
        primary: 0x0099FF,   // Parlak Neon Mavi
        secondary: 0x00D4FF, // Buz Mavisi / Cyan
        accent: 0x2B7FFF,    // Safir Mavi
        darkBlue: 0x0B132B,  // Gece Mavisi
        success: 0x00F0FF,   // Siber Mavi / Onay
        warning: 0x38BDF8,   // Gökyüzü Mavisi / Uyarı
        danger: 0x1D4ED8     // Derin Mavi / Kritik
    },

    // Yüksek Çözünürlüklü Mavi Temalı Menü ve Sistem Afişleri (Banners)
    banners: {
        help: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',       // Siber Mavi Şehir
        security: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',   // Mavi Güvenlik Ağı
        level: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',      // Mavi Devre & Teknoloji
        ticket: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',     // Siber Matriks Mavi
        roles: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',      // Mavi Soyut Dalgalar
        economy: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',    // Mavi Dijital Para
        giveaway: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',   // Mavi Parıltı & Hediye
        verify: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'      // Mavi Siber Kalkan
    },

    // Varsayılan Ayarlar
    defaults: {
        xpCooldownSeconds: 60,
        minXpPerMessage: 15,
        maxXpPerMessage: 25,
        defaultDailyReward: 250,
        antiNukeLimit: 3,
        antiNukeWindowMs: 10000
    }
};
