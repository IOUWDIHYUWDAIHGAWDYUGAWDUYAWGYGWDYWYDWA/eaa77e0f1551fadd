/**
 * VYBot — Command Explorer (sections 14-15)
 * Real command data: ./data/commands.js (from bot source code)
 * Loading / empty / error states match the design system (section 31).
 */
(() => {
  'use strict';

  const listEl = document.getElementById('cmd-list');
  const searchEl = document.getElementById('cmd-search');
  const filterEl = document.getElementById('cat-filters');
  const detailEl = document.getElementById('cmd-detail');
  if (!listEl || !searchEl || !filterEl || !detailEl) return;

  let COMMANDS = [];
  let CATEGORIES = [];
  let activeCat = 'tumu';
  let activeName = null;

  const L = window.VYBOT_LANG || { t: (k) => k, current: 'en' };
  const t = (k) => L.t(k);

  const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  /* ---------- States ---------- */
  function renderLoading() {
    listEl.innerHTML = Array.from({ length: 6 }).map(() => `
      <div class="cmd-item" aria-hidden="true" style="min-height:48px;opacity:.4"></div>
    `).join('');
    detailEl.innerHTML = `
      <div class="cd-head"><span class="cd-name" style="opacity:.4">…</span></div>
      <div class="cd-body"><p style="color:var(--text-3);font-size:14.5px">${t('cmd.loading')}</p></div>`;
  }

  function renderError() {
    listEl.innerHTML = '';
    detailEl.innerHTML = `
      <div class="cd-head"><span class="cd-name"><span class="slash">/</span>error</span></div>
      <div class="cd-body">
        <div class="cmd-error">${t('cmd.err')}</div>
      </div>`;
  }

  /* ---------- List + filter ---------- */
  function filtered() {
    const lang = L.current || 'en';
    const q = searchEl.value.trim().toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en');
    return COMMANDS.filter((c) => {
      const catOK = activeCat === 'tumu' || c.category === activeCat;
      const qOK = !q
        || c.name.toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en').includes(q)
        || c.description.toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en').includes(q);
      return catOK && qOK;
    });
  }

  function renderList() {
    const items = filtered();
    if (!items.length) {
      listEl.innerHTML = `
        <div class="cmd-empty" role="status">
          "<strong>${esc(searchEl.value)}</strong>" ${t('cmd.empty')}<br>
          ${t('cmd.empty.hint')}
        </div>`;
      return;
    }
    listEl.innerHTML = items.map((c) => `
      <button type="button" class="cmd-item${c.name === activeName ? ' selected' : ''}"
              data-cmd="${esc(c.name)}" aria-pressed="${c.name === activeName}">
        <span class="ci-name"><span class="slash">/</span>${esc(c.name)}</span>
        <span class="ci-desc">${esc(c.description)}</span>
        <span class="ci-cat">${esc(catLabel(c.category))}</span>
      </button>`).join('');
  }

  /* ---------- Detail panel (section 15) ---------- */
  function renderDetail(name) {
    const c = COMMANDS.find((x) => x.name === name) || COMMANDS[0];
    if (!c) return;
    activeName = c.name;
    const perm = c.permission
      ? `<span>${esc(c.permission)}</span>`
      : `<span class="free">${t('cmd.free')}</span>`;
    detailEl.innerHTML = `
      <div class="cd-head">
        <span class="cd-name"><span class="slash">/</span>${esc(c.name)}</span>
        <span class="cd-cat">${esc(catLabel(c.category))}</span>
      </div>
      <div class="cd-body">
        <div class="cd-sec">
          <div class="cd-label">${t('cmd.desc')}</div>
          <p class="cd-desc">${esc(c.description)}</p>
        </div>
        <div class="cd-sec">
          <div class="cd-label">${t('cmd.usage')}</div>
          <code class="cmd-usage">${esc(c.usage)}</code>
        </div>
        <div class="cd-sec">
          <div class="cd-label">${t('cmd.perm')}</div>
          <div class="perm-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z"/>
            </svg>
            ${perm}
          </div>
        </div>
      </div>`;
    history.replaceState(null, '', `#komut-${encodeURIComponent(c.name)}`);
  }

  function select(name) {
    renderDetail(name);
    renderList();
  }

  /* ---------- Filter chips ---------- */
  function renderFilters() {
    const counts = new Map();
    COMMANDS.forEach((c) => counts.set(c.category, (counts.get(c.category) || 0) + 1));
    const chips = [{ id: 'tumu', label: t('cmd.all'), cnt: COMMANDS.length }]
      .concat(CATEGORIES.map((c) => ({ ...c, cnt: counts.get(c.id) || 0 })));
    filterEl.innerHTML = chips.map((c) => `
      <button type="button" class="cat-chip${c.id === activeCat ? ' active' : ''}"
              data-cat="${esc(c.id)}" aria-pressed="${c.id === activeCat}">
        ${esc(c.label)}<span class="cnt">${c.cnt}</span>
      </button>`).join('');
  }

  /* ---------- Events ---------- */
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd]');
    if (btn) select(btn.dataset.cmd);
  });
  filterEl.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    activeCat = chip.dataset.cat;
    renderFilters();
    renderList();
  });

  let debounce = 0;
  searchEl.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(renderList, 90);
  });

  /* ---------- Init ---------- */
  renderLoading();
  import('./data/commands.js')
    .then((mod) => {
      COMMANDS = mod.COMMANDS;
      CATEGORIES = mod.CATEGORIES;
      const hash = decodeURIComponent(location.hash.replace(/^#komut-/, ''));
      const initial = COMMANDS.find((c) => c.name === hash)?.name || 'ban';
      activeName = initial;
      renderFilters();
      renderList();
      renderDetail(initial);
    })
    .catch(renderError);
})();

