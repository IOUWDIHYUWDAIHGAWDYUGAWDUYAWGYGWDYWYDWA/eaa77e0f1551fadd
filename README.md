# 🤖 vybot - Gelişmiş Çok Amaçlı Discord Botu

**vybot**; MEE6, Dyno, Carl-bot ve Ticket Tool gibi piyasanın en iyi botlarının öne çıkan özelliklerini tek bir çatıda toplayan modern, güvenli ve modüler bir Discord botudur.

---

## 🌐 Web Sitesi (GitHub Pages)

MEE6 tarzı tanıtım sitesi `yeniwebsite/` klasöründe bulunur ve **GitHub Actions** ile her push'ta otomatik olarak **GitHub Pages**'e yayınlanır.

### Sitenin özellikleri
* **Hero & Sunucuya Ekle** — OAuth davet butonu (Discord'a bot ekleme)
* **Özellik kartları** — Güvenlik, seviye, ticket, roller, ekonomi, çekiliş
* **Aranabilir komut tablosu** — 30+ slash komutu, kategori filtreli
* **Kurulum adımları** — 3 adımda botu ayağa kaldırma

### Siteyi yayınlama (tek seferlik)
1. Repo → **Settings** → **Pages**
2. **Build and deployment → Source** seçeneğini **"GitHub Actions"** yapın
3. İlk push'tan sonra site otomatik yayınlanır

> Site adresi: `https://<kullanici-adin>.github.io/<repo-adin>/`

### Davet linkini ayarlama
`yeniwebsite/assets/js/data/config.js` dosyasında:

```json
window.VYBOT_CONFIG = {
  clientId: 'BOT_APPLICATION_ID_BURAYA',
  inviteUrl: 'DISCORD_OAUTH_INVITE_URL'
};
```

* `clientId` girerseniz davet linki **otomatik oluşturulur** (Administrator izni istemeyen, bot modüllerinin ihtiyaç duyduğu izinlerle).
* Ya da `inviteUrl` alanına tam olarak kendi OAuth linkinizi yazabilirsiniz.

### Yerel önizleme (isteğe bağlı)
```bash
cd yeniwebsite
python -m http.server 8080
# → http://localhost:8080
```

---

## 🌟 Öne Çıkan Özellikler

### 1. 🛡️ Güvenlik, Anti-Nuke & Auto-Mod
* **💣 Anti-Nuke Koruması:** Kısa sürede yetkisiz kanal veya rol silmeye çalışan yetkilileri/botları anında tespit edip susturarak sunucu güvenliğini sağlar.
* **🔗 Anti-Link & Reklam Engeli:** Discord davet bağlantılarını ve harici reklam linklerini otomatik siler, uyarır ve loglar.
* **🤬 Anti-Küfür:** Türkçe küfür ve hakaret filtreleri ile sohbet düzenini korur.
* **⚡ Anti-Spam / Flood:** Hızlı mesaj atan kullanıcıları otomatik tespit eder ve geçici zamanaşımı (timeout) uygular.
* **✅ Doğrulama (Kayıt) Paneli:** Butonlu doğrulama paneli ile bot/sahte hesapları engeller ve üyeleri doğrular (`/dogrulama-kur`).
* **🤖 Oto-Rol:** Sunucuya yeni katılan üyelere otomatik rol verir (`/otorol`).
* **📝 Kapsamlı Mod-Log:** Silinen mesajlar, düzenlenen mesajlar, sunucuya giriş/çıkışlar ve kanal/rol silme hareketleri log kanalına anında iletilir (`/modlog`).

### 2. 🏆 MEE6 Tarzı Seviye (XP) & Karşılama
* **Canvas Rank Kartı:** Kullanıcının seviyesini, avatarını ve XP ilerleme çubuğunu gösteren modern görsel kart (`/rank`).
* **Liderlik Sıralaması:** Sunucunun en aktif üyelerini listeleyen sıralama tablosu (`/liderlik`).
* **Seviye Ödülleri:** Belirli seviyelere ulaşan üyelere otomatik verilecek roller (`/seviye-odul ekle`).
* **Resimli Hoş Geldin Kartı:** Sunucuya katılan yeni üyelere özel Canvas hoş geldin kartı.

### 3. 🎫 Gelişmiş Destek (Ticket) Sistemi
* `/ticket-kur` komutu ile kanala şık bir butonlu destek paneli gönderir.
* Kullanıcı butona bastığında sadece kendisinin ve yetkililerin görebileceği özel bir kanal açılır.
* **"Bileti Kapat"** butonu ile biletler kapatılır ve mod-log kanalına bildirilir.

### 4. 🎭 Buton Rol Panelleri (Carl-bot Tarzı)
* `/rol-panel` komutu ile 5 role kadar butonlu rol alma/çıkarma paneli oluşturabilirsiniz.
* Üyeler butona basarak diledikleri rolleri kolayca alıp bırakabilirler.

### 5. 💰 Ekonomi & Şans Oyunları
* `/bakiye` • Cüzdan ve banka bakiyesi.
* `/gunluk` • 24 saatlik günlük coin hediyesi.
* `/calis` • Çeşitli mesleklerde çalışarak para kazanma.
* `/kumar slot` • 3'lü meyve slot makinesi.
* `/kumar yazi-tura` • Yazı-tura atarak bahsi ikiye katlama.

### 6. 🎁 Çekiliş (Giveaway) Sistemi
* `/cekilis` • Süre, ödül ve kazanan sayısı belirleyerek butonlu otomatik çekiliş başlatır. Süre bittiğinde kazananları otomatik seçer ve etiketler.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Discord Developer Portal Ayarları
1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin.
2. **"New Application"** butonuna basarak bir uygulama oluşturun (İsim: `vybot`).
3. Soldaki menüden **"Bot"** sekmesine tıklayın:
   * **"Reset Token"** butonuna basıp bot tokeninizi kopyalayın.
   * Aşağı kaydırarak **"Privileged Gateway Intents"** altındaki 3 seçeneği de açın:
     * ✅ **Presence Intent**
     * ✅ **Server Members Intent**
     * ✅ **Message Content Intent**
4. Soldaki **"General Information"** sekmesinden **APPLICATION ID** (Client ID)'nizi kopyalayın.

### 2. Botu Sunucunuza Davet Edin
1. **OAuth2** > **URL Generator** sekmesine gidin.
2. **Scopes:** `bot` ve `applications.commands` seçin.
3. **Bot Permissions:** Bot modüllerinin ihtiyaç duyduğu izinleri seçin; `Administrator` varsayılan olarak gerekli değildir.
4. Oluşan davet linkini tarayıcınızda açıp botu sunucunuza ekleyin.

### 3. Proje Yapılandırması (.env)
Proje ana dizininde bir `.env` dosyası oluşturun (`.env.example` dosyasını referans alabilirsiniz):

```env
DISCORD_TOKEN=kopyaladiginiz_bot_tokeni
CLIENT_ID=kopyaladiginiz_application_id

# İsteğe bağlı: Test sunucunuzun ID'si (Komutların anında yüklenmesi için önerilir)
GUILD_ID=
```

### 4. Slash Komutlarını Yükleme (Deploy)
Komutları Discord API'sine kaydetmek için terminalde şu komutu çalıştırın:
```bash
npm run deploy
```

### 5. Botu Başlatma
Botunuzu 7/24 çalıştırmak için:
```bash
npm start
```

---

## 📖 Komut Listesi Özeti

| Kategori | Komut | Açıklama |
| :--- | :--- | :--- |
| **Güvenlik** | `/guvenlik durum` | Aktif güvenlik korumalarını listeler |
| **Güvenlik** | `/guvenlik [anti-nuke/anti-link/anti-kufur/anti-spam]` | Korumaları açar/kapatır |
| **Güvenlik** | `/dogrulama-kur` | Butonlu üye kayıt/doğrulama paneli kurar |
| **Güvenlik** | `/otorol` | Yeni üyelere otomatik verilecek rolü ayarlar |
| **Güvenlik** | `/modlog` | Denetim kayıtlarının gideceği kanalı ayarlar |
| **Moderasyon** | `/ban` | Üyeyi sunucudan yasaklar |
| **Moderasyon** | `/kick` | Üyeyi sunucudan atar |
| **Moderasyon** | `/timeout` | Üyeyi belirli bir süre susturur |
| **Moderasyon** | `/untimeout` | Üyenin susturmasını kaldırır |
| **Moderasyon** | `/uyar` | Üyeye resmi uyarı verir ve siciline işler |
| **Moderasyon** | `/sicil` | Üyenin ceza ve uyarı geçmişini gösterir |
| **Moderasyon** | `/temizle` | Kanaldaki mesajları topluca siler (1-100) |
| **Seviye** | `/rank` | Canvas rank kartını görüntüler |
| **Seviye** | `/liderlik` | Sunucu seviye sıralamasını gösterir |
| **Seviye** | `/seviye-odul` | Seviye rol ödüllerini yönetir |
| **Destek** | `/ticket-kur` | Butonlu destek bileti paneli oluşturur |
| **Roller** | `/rol-panel` | Butonlu rol alma paneli kurar |
| **Ekonomi** | `/bakiye` | Cüzdan ve banka bakiyesini gösterir |
| **Ekonomi** | `/gunluk` | 24 saatlik hediye coin |
| **Ekonomi** | `/calis` | Bir işte çalışıp para kazanır |
| **Ekonomi** | `/kumar` | Slot makinesi veya Yazı-Tura oynar |
| **Araçlar** | `/cekilis` | Otomatik butonlu çekiliş başlatır |
| **Araçlar** | `/davet` | Botu başka sunuculara ekleme bağlantısını verir (Herkese açık) |
| **Araçlar** | `/botbilgi` | Botun canlı istatistiklerini ve sunucu sayısını gösterir |
| **Araçlar** | `/yardim` | Fotoğraflı & açılır menülü interaktif komut rehberi |
| **Araçlar** | `/ping` | Bot ve API gecikmesini gösterir |
| **Araçlar** | `/sunucu` | Sunucu istatistiklerini görüntüler |

---

## 🛠️ Mimari & Veritabanı
* **SQLite (better-sqlite3):** Botun tüm ayarları, seviyeleri, uyarıları ve bakiye bilgileri `data/vybot.sqlite` dosyasında güvenli bir şekilde saklanır.
* **Canvas (@napi-rs/canvas):** Yüksek performanslı ve sıfır harici sistem bağımlılığıyla MEE6 kalitesinde dinamik görseller üretir.
