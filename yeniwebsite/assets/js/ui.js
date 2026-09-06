/**
 * VYBot — Paylaşılan UI davranışları
 * Navbar scroll durumu · mobil menü · scroll-reveal · davet linkleri ·
 * komut sayacı · yıl damgası. prefers-reduced-motion'a saygılıdır.
 */
(() => {
  'use strict';

  const cfg = window.VYBOT_CONFIG || {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Gerçek davet bağlantısı ---------- */
  document.querySelectorAll('[data-invite]').forEach((a) => {
    a.setAttribute('href', cfg.inviteUrl || '#');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  /* ---------- Navbar: scroll'da opaklaşma ---------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobil menü ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---------- Scroll-reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in-view'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Görsel panelleri görünürken canlandır ---------- */
  const livePanels = document.querySelectorAll('.fpanel.live');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const pio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          e.target.classList.toggle('live', e.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );
    livePanels.forEach((p) => pio.observe(p));
  } else {
    livePanels.forEach((p) => p.classList.add('live'));
  }

  /* ---------- Gerçek komut/kategori sayaçları (uydurma sayı YOK) ---------- */
  const countEls = document.querySelectorAll('[data-cmd-count]');
  const catEls = document.querySelectorAll('[data-cat-count]');
  const shieldEls = document.querySelectorAll('[data-shield-count]');
  if (countEls.length || catEls.length) {
    import('./data/commands.js')
      .then((mod) => {
        const commands = mod.COMMANDS || [];
        countEls.forEach((el) => (el.textContent = String(commands.length)));
        const categories = new Set(commands.map((c) => c.category).filter(Boolean));
        catEls.forEach((el) => (el.textContent = String(categories.size)));
      })
      .catch(() => {
        countEls.forEach((el) => el.closest('.trust-stat')?.remove());
        catEls.forEach((el) => el.closest('.trust-stat')?.remove());
      });
  }
  /* Gerçek güvenlik kalkanı sayısı — src/commands/security/guvenlik.js:
   * anti-nuke, anti-link, anti-swear (anti-küfür), anti-spam → 4 */
  if (shieldEls.length) shieldEls.forEach((el) => (el.textContent = '4'));

  /* ---------- Footer yılı ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Dil sistemi ---------- */
  if (window.VYBOT_LANG) {
    window.VYBOT_LANG.init();
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      const updateLangBtn = () => {
        langBtn.textContent = window.VYBOT_LANG.t('nav.lang');
      };
      updateLangBtn();
      langBtn.addEventListener('click', () => {
        window.VYBOT_LANG.toggle();
        updateLangBtn();
      });
      window.addEventListener('vybot:langchange', updateLangBtn);
    }
  }
})();
