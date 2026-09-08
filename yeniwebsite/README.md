# VYBot Professional — GitHub Pages ön yüzü

Bu klasör, hazırlanmış Professional Edition sitesinin GitHub Pages için düzleştirilmiş ön yüzüdür. Mevcut `.github/workflows/deploy-pages.yml` bu klasörü yayınlar.

- 36 komut; arama, kategori, TR/EN açıklamaları ve kopyalama.
- Modern responsive tasarım, hafif animasyonlar, mobil menü ve SSS.
- Demo ayarları yalnızca tarayıcıya kaydedilir; gerçek botta işlem yapmaz.
- Durum kaynağı yoksa sahte çevrimiçi durum gösterilmez.

## Önemli sınırlar
GitHub Pages Node.js çalıştırmaz. Discord web girişi ve gerçek ayar kaydı için Professional Edition ZIP'indeki `server.mjs` ve özel bot API'si ayrı bir HTTPS sunucusunda kurulmalıdır. Bunlar bu statik yayında aktif değildir. Gizli token, `.env` veya uygulama sırrını bu klasöre koymayın. Sadece herkese açık, toplulaştırılmış bir durum kaynağı `assets/js/data/config.js` üzerinden eklenebilir.

Eski ZIP yedeği yeni sürüme eklenmemiştir. Bot kaynakları, kök package.json, bridge ve diğer klasörler bu tasarım aktarımının kapsamı dışındadır.

Yayına açmadan önce gizlilik/kullanım koşullarındaki işletmeci ve veri saklama bilgilerini tamamlayın.
