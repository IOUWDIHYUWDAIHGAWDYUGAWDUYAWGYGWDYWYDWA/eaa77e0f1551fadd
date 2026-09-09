# Discord Yönetim Paneli v2

Bu sürüm, referans tasarıma göre yenilenen tam ekran VYBot yönetim panelini etkinleştirir.

## Canlı entegrasyonlar

- Genel Bakış
- Üyeler
- Roller
- Kanallar
- Mesaj aktivitesi (yalnızca toplamlar; mesaj içerikleri tutulmaz)
- Moderasyon
- Discord Audit Log
- Emoji ve stickerlar
- Webhook metadatası (token ve gizli URL tutulmaz)
- Sunucu ayarları ve bot yetenekleri
- Bot ayarları ve çalışan bot uygulama onayı

Panel verileri GitHub Actions üzerindeki bot tarafından kısa ömürlü OIDC kimliğiyle Cloudflare Worker'a iletilir. Her panel okumasında Discord sunucu yönetim yetkisi yeniden doğrulanır. Özel bot kaynakları şifresiz olarak yayımlanmaz.
