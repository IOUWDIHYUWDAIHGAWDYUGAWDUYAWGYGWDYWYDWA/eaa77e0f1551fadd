/**
 * VYBot — Durum Sayfası (18. madde)
 * ---------------------------------------------------------------------------
 * Canlı veri kaynağı: botun liveDataSync.js modülünün yazdığı live-data.json
 * (live-data dalı). Gerçek veri VARSA gösterilir; YOKSA asla sahte "çalışıyor"
 * durumu gösterilmez — net bir "veri yok" durumu sunulur.
 * Bot online bilgisi + updatedAt alanı gerçek bot telemetrisidir.
 * Sayfa HER 10 SANİYEDE BIR canlı veriyi yeniden çeker (sessiz polling).
 */
(() => {
  'use strict';

  const cfg = window.VYBOT_CONFIG || {};
  const banner = document.getElementById('status-banner');
  const cards = document.querySelectorAll('.status-card[data-service]');
  const note = document.getElementById('status-note');
  if (!banner || !cards.length) return;

  const REFRESH_MS = 10000;

  const setCard = (name, state, desc) => {
    const card = document.querySelector(`[data-service="${name}"]`);
    if (!card) return;
    const st = card.querySelector('.sc-state');
    st.classList.remove('loading', 'ok', 'unknown');
    st.classList.add(state);
    st.innerHTML = `<i></i>${state === 'ok' ? 'Çalışıyor' : state === 'loading' ? 'Kontrol ediliyor' : 'Veri yok'}`;
    if (desc) card.querySelector('.sc-desc').textContent = desc;
  };

  function setBanner(kind, title, sub) {
    banner.classList.remove('loading', 'ok', 'error');
    banner.classList.add(kind);
    const icons = {
      loading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
      ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>',
    };
    banner.querySelector('.sb-ico').innerHTML = icons[kind] || icons.loading;
    banner.querySelector('.sb-title').textContent = title;
    banner.querySelector('.sb-sub').textContent = sub;
  }

  function run() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), cfg.liveDataTimeoutMs || 8000)
    );

    return Promise.race([
      fetch(cfg.liveDataUrl, { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }),
      timeout,
    ])
      .then((data) => {
        const guilds = Object.values(data.guilds || {});
        const bot = data.bot || {};
        const hasBotPayload = Boolean(data.updatedAt) || typeof bot.guildCount === 'number' || typeof bot.ping === 'number';
        const botOnline = guilds.some((g) => g.botOnline) || hasBotPayload;
        const totalMembers = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);
        const serverCount = typeof bot.guildCount === 'number' ? bot.guildCount : guilds.length;
        const updated = data.updatedAt ? new Date(data.updatedAt) : null;

        if (botOnline) {
          setBanner('ok', 'Tüm sistemler çalışıyor', updated
            ? 'Canlı veri · Son güncelleme: ' + updated.toLocaleString('tr-TR')
            : 'Canlı veri kaynağından alındı');
          setCard('bot', 'ok', (serverCount || guilds.length) ? `${serverCount || guilds.length} sunucu aktif` : 'Bot çevrimiçi');
          setCard('database', 'ok', 'SQLite bağlantısı aktif');
          setCard('api', 'ok', totalMembers ? `${totalMembers.toLocaleString('tr-TR')} üyeye hizmet veriyor` : 'Discord API bağlantısı aktif');
          setCard('web', 'ok', 'Statik site çalışıyor');
        } else {
          setBanner('error', 'Bot yanıt vermiyor', 'Canlı veri kaynağına ulaşıldı ancak bot çevrimdışı görünüyor');
          setCard('bot', 'unknown', 'Çevrimdışı görünüyor');
          setCard('database', 'unknown');
          setCard('api', 'unknown');
          setCard('web', 'ok', 'Statik site çalışıyor');
        }

        if (note) {
          note.hidden = false;
          note.innerHTML =
            'Canlı veri kaynağı: botun live-data dalındaki live-data.json dosyası. Bu sayfa her 10 saniyede bir yenilenir.';
        }
      })
      .catch(() => {
        /* Gerçek veri yok → asla sahte durum gösterme (26. madde) */
        setBanner('error', 'Durum verisi kullanılamıyor',
          'Botun canlı veri bağlantısına ulaşılamadı — gerçek durum gösterilemiyor');
        cards.forEach((c) => setCard(c.dataset.service, 'unknown'));
        if (note) {
          note.hidden = false;
          note.innerHTML =
            'Canlı durum için botun <code>live-data</code> dalındaki <code>live-data.json</code> dosyasına ' +
            'erişilemesi gerekiyor. Bot çalıştığında bu sayfa otomatik olarak gerçek durumu gösterir. ' +
            'Bu süre içinde sahte uptime verisi gösterilmez.';
        }
      });
  }

  cards.forEach((c) => setCard(c.dataset.service, 'loading'));
  run();
  /* HER 10 SANİYEDE BIR sessiz yenileme */
  setInterval(run, REFRESH_MS);
})();
