# yeniwebsite — VYBot Web Sitesi

Sıfırdan, MASTERPROMT standartlarında inşa edilmiş yeni VYBot tanıtım sitesi.
Eski siteye (`docs/`) ait hiçbir dosya kullanılmadı, kopyalanmadı veya değiştirilmedi.

## Yapı

```
yeniwebsite/
├── index.html              Ana sayfa (hero + 3D, güven şeridi, özellikler, CTA)
├── commands/               Aranabilir komut gezgini (38 gerçek komut)
├── docs/                   Dokümantasyon (kurulum, modüller, SSS)
├── status/                 Sistem durumu (canlı veri köprüsü + dürüst boş durum)
├── dashboard/              Panel giriş noktası (OAuth entegrasyon noktası hazır)
├── privacy/ · terms/       Yasal sayfalar
├── robots.txt · sitemap.xml
└── assets/
    ├── css/main.css        Tasarım sistemi (dark-first, tek dosya)
    ├── js/
    │   ├── data/config.js      Tek noktadan yapılandırma (clientId, live-data URL)
    │   ├── data/commands.js    GERÇEK komut verisi (src/commands'tan birebir)
    │   ├── ui.js               Navbar, reveal, davet linkleri, sayaçlar
    │   ├── vybot-scene.js      Yeniden kullanılabilir 3D sistem (3 preset)
    │   ├── commands-explorer.js
    │   └── status.js
    ├── vendor/three.module.js  Three.js r169 (yalnızca dinamik import ile yüklenir)
    └── img/                    VYBot logosu (src/assets'tan) + favicon
```

## Önizleme

```bash
cd yeniwebsite
python -m http.server 8080
# → http://localhost:8080
```

## Yayınlama (GitHub Pages)

1. `yeniwebsite` klasörünü repoya push'la.
2. GitHub → Settings → Pages → Source: **GitHub Actions** ya da klasör seçimi
   (deploy adresine göre `assets/js/data/config.js` içindeki `siteUrl` ve
   sayfalardaki canonical/OG adreslerini güncelle).

## Entegrasyon noktaları

| Amaç | Yer |
|---|---|
| Davet bağlantısı (gerçek CLIENT_ID) | `assets/js/data/config.js → inviteUrl` |
| Canlı durum verisi | `config.js → liveDataUrl` (botun live-data dalı) |
| Panel OAuth | `config.js → dashboardApiUrl` (dolunca Dashboard butonu aktifleşir) |
| Komut verisi | `assets/js/data/commands.js` (bot `src/commands` ile senkron tutulur) |

## Tasarım kararları (MASTERPROMT hizası)

- **Marka rengi** botun `src/config.js` paletinden türetildi: safir mavisi `#2b7fff` + cyan `#00d4ff`, gece laciverti yüzeyler.
- **3D** prosedürel (hazır model yok): iç ikosahedron çekirdek + tel kafes kabuk + yörünge halkaları + kısıtlı partiküller; fare ve scroll'a yumuşak tepki verir.
- **Performans:** Three.js yalnızca scene görünürken dinamik import edilir, DPR 1.75 ile sınırlı, ekran dışında durur, `prefers-reduced-motion` desteklenir, WebGL yoksa CSS amblem fallback'i devreye girer.
- **Gerçek veri kuralı:** Uydurma sunucu/üye sayısı yok — komut sayısı bile gerçek veriden hesaplanır; durum sayfası canlı veri yoksa bunu dürüstçe söyler.
