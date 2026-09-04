/* ============================================================
   vybot — Web Sitesi Mantığı
   data.json'dan veri çeker; özellik kartları, komut tablosu,
   arama/filtreleme ve davet linkini dinamik olarak kurar.
   ============================================================ */

(function () {
    'use strict';

    const state = {
        data: null,
        activeCategory: 'Tümü'
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    /* ---------- Davet linki üret ---------- */
    function buildInviteUrl() {
        const d = state.data;
        if (d.inviteUrl) return d.inviteUrl;
        if (d.clientId) {
            return 'https://discord.com/oauth2/authorize' +
                '?client_id=' + encodeURIComponent(d.clientId) +
                '&scope=bot%20applications.commands' +
                '&permissions=' + encodeURIComponent(String(d.permissions || 8));
        }
        return '#kurulum'; // davet linki yoksa kullanıcıyı kurulum bölümüne yönlendir
    }

    function bindInviteButtons() {
        const url = buildInviteUrl();
        $$('.nav-invite, #heroInviteBtn, #ctaInviteBtn').forEach(btn => {
            btn.href = url;
        });
    }

    /* ---------- Hero istatistikleri ---------- */
    function renderStats() {
        const s = state.data.stats || {};
        const set = (id, val) => { const el = $(id); if (el && val) el.textContent = val; };
        set('#statFeatures', s.features);
        set('#statCategories', s.categories);
    }

    /* ---------- Özellik kartları ---------- */
    function renderFeatures() {
        const grid = $('#featuresGrid');
        if (!grid) return;
        grid.innerHTML = (state.data.features || []).map(f => `
            <article class="feature-card">
                <div class="feature-icon">${f.icon}</div>
                <h3>${f.title}</h3>
                <p>${f.description}</p>
                <ul class="feature-items">
                    ${(f.items || []).map(i => `<li>${i}</li>`).join('')}
                </ul>
            </article>
        `).join('');
    }

    /* ---------- Komut tablosu + filtreler ---------- */
    function renderCommandFilters() {
        const wrap = $('#cmdFilters');
        if (!wrap) return;
        const cats = ['Tümü', ...new Set((state.data.commands || []).map(c => c.category))];
        wrap.innerHTML = cats.map(cat =>
            `<button class="cmd-filter${cat === 'Tümü' ? ' active' : ''}" data-cat="${cat}">${cat}</button>`
        ).join('');

        $$('.cmd-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                state.activeCategory = btn.dataset.cat;
                $$('.cmd-filter').forEach(b => b.classList.toggle('active', b === btn));
                renderCommandsTable();
            });
        });
    }

    function renderCommandsTable() {
        const tbody = $('#commandsBody');
        const empty = $('#commandsEmpty');
        if (!tbody) return;

        const q = ($('#cmdSearch').value || '').trim().toLocaleLowerCase('tr');
        const list = (state.data.commands || []).filter(c => {
            const inCat = state.activeCategory === 'Tümü' || c.category === state.activeCategory;
            const inText = !q ||
                c.name.toLocaleLowerCase('tr').includes(q) ||
                c.description.toLocaleLowerCase('tr').includes(q);
            return inCat && inText;
        });

        tbody.innerHTML = list.map(c => `
            <tr>
                <td><span class="tag">${c.category}</span></td>
                <td><span class="cmd-name">/${c.name}</span></td>
                <td>${c.description}</td>
            </tr>
        `).join('');

        if (empty) empty.hidden = list.length > 0;
        const table = $('#commandsTable');
        if (table) table.hidden = list.length === 0;
    }

    function bindSearch() {
        const input = $('#cmdSearch');
        if (!input) return;
        input.addEventListener('input', renderCommandsTable);
    }

    /* ---------- Kurulum adımları ---------- */
    function renderInstallSteps() {
        const wrap = $('#installSteps');
        if (!wrap) return;
        wrap.innerHTML = (state.data.installSteps || []).map((s, i) => `
            <div class="install-step" data-step="0${i + 1}">
                <div class="step-icon">${s.icon}</div>
                <h3>${s.title}</h3>
                <p>${s.description}</p>
            </div>
        `).join('');
    }

    /* ---------- Navbar ---------- */
    function bindNav() {
        const nav = $('.navbar');
        const toggle = $('#navToggle');
        const navEl = nav && nav.querySelector('nav');

        addEventListener('scroll', () => {
            if (nav) nav.classList.toggle('scrolled', scrollY > 24);
        }, { passive: true });

        if (toggle && navEl) {
            toggle.addEventListener('click', () => {
                const open = navEl.classList.toggle('s-nav-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        $$('.nav-links a').forEach(a => {
            a.addEventListener('click', () => {
                const navEl = nav && nav.querySelector('nav');
                if (navEl) navEl.classList.remove('s-nav-open');
            });
        });
    }

    /* ---------- Footer ---------- */
    function bindFooter() {
        const year = $('#year');
        if (year) year.textContent = String(new Date().getFullYear());
        const gh = $('#footerGithub');
        if (gh && state.data.github) gh.href = state.data.github;
    }

    /* ---------- Başlat ---------- */
    async function init() {
        try {
            const res = await fetch('assets/data.json', { cache: 'no-store' });
            if (!res.ok) throw new Error('data.json yüklenemedi: ' + res.status);
            state.data = await res.json();
        } catch (err) {
            console.error('[vybot-site] Veri yüklenemedi:', err);
            if (!state.data) {
                const grid = $('#featuresGrid');
                if (grid) {
                    grid.innerHTML = '<div class="feature-card">⚠️ Veri yüklenemedi. Lütfen HTTPS üzerinden erişin.</div>';
                }
                return;
            }
        }

        bindInviteButtons();
        renderStats();
        renderFeatures();
        renderCommandFilters();
        renderCommandsTable();
        bindSearch();
        renderInstallSteps();
        bindNav();
        bindFooter();
    }

    document.addEventListener('DOMContentLoaded', init);
})();