// ========================================
// HVVC — Editable site content
// Coaches, tournaments, practices, and events live in /data/*.json and are
// edited through the Pages CMS dashboard (see .pages.yml). Text from the
// dashboard is escaped before it is shown, so it can never break a page.
// ========================================

window.HVVC = (function () {
  const TEAM_LABELS = {
    '16-1': '16-1', '16-2': '16-2', '14-1': '14-1', '14-2': '14-2',
    '12-1': '12-1', '12-2': '12-2', '10u': '10U',
  };
  const FACE_POSITION = { 'full-high': '32%', 'full-middle': '38%', 'full-low': '50%' };
  const BADGES = {
    tournament: ['Tournament', ''],
    regional: ['Regional', ' dk-schedule-item__badge--highlight'],
    event: ['Event', ' dk-schedule-item__badge--event'],
  };
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
  const INSTAGRAM = '<a href="https://instagram.com/hvvc_volleyball" target="_blank" rel="noopener">Instagram</a>';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function text(value) {
    return value == null ? '' : String(value).trim();
  }
  function safeUrl(value) {
    const url = text(value);
    return /^(https?:\/\/|\/|mailto:|tel:)/i.test(url) ? url : '';
  }
  function isoDate(value) {
    const match = text(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }
  function localDate(iso) {
    return new Date(iso + 'T00:00:00');
  }
  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function slug(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function monthAbbr(d) {
    return d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  }

  const cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch('/data/' + name + '.json')
        .then((res) => {
          if (!res.ok) throw new Error('Could not load ' + name + ' (' + res.status + ')');
          return res.json();
        })
        .then((data) => (Array.isArray(data) ? data.filter((item) => item && typeof item === 'object') : []));
    }
    return cache[name];
  }

  function scrollToHashTarget() {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView({ block: 'start' });
  }

  // ---- Events (Events page + homepage) ----
  const EVENT_TEXT_FIELDS = ['title', 'tag', 'dateDisplay', 'dateRange', 'time', 'location', 'description', 'notes', 'registerLabel', 'bannerTitle'];

  function normalizeEvent(raw) {
    const ev = { pinBanner: raw.pinBanner === true, comingSoon: raw.comingSoon === true };
    EVENT_TEXT_FIELDS.forEach((key) => {
      const value = text(raw[key]);
      if (value) ev[key] = escapeHtml(value);
    });
    ['schedule', 'expect'].forEach((key) => {
      const lines = (Array.isArray(raw[key]) ? raw[key] : []).map(text).filter(Boolean).map(escapeHtml);
      if (lines.length) ev[key] = lines;
    });
    ev.dateISO = isoDate(raw.dateISO);
    const end = isoDate(raw.endISO);
    if (end) ev.endISO = end;
    const url = safeUrl(raw.registerUrl);
    if (url) ev.registerUrl = escapeHtml(url);
    ev.tag = ev.tag || 'Event';
    ev.id = slug(raw.id) || slug(raw.title);
    return ev;
  }

  function loadEvents() {
    return load('events').then((list) => list.map(normalizeEvent).filter((ev) => ev.title && ev.dateISO));
  }

  // ---- Coaches (Staff page) ----
  function coachItem(raw) {
    const name = text(raw.name);
    if (!name) return '';
    const role = text(raw.role);
    const photo = safeUrl(raw.photo) || (/^img\//.test(text(raw.photo)) ? '/' + text(raw.photo) : '');
    const face = FACE_POSITION[raw.framing];
    const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const photoHtml = photo
      ? `<span class="dk-coach-item__photo${face ? ' dk-coach-item__photo--zoom' : ''}"${face ? ` style="--face-y:${face}"` : ''}><img src="${escapeHtml(photo)}" alt="" loading="lazy" /></span>`
      : `<span class="dk-coach-item__photo dk-coach-item__photo--initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
    const paragraphs = text(raw.bio).split(/\n+/).map(text).filter(Boolean);
    const bio = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    return `<details class="dk-coach-item">
          <summary>
            ${photoHtml}
            <span class="dk-coach-item__text">
              <span class="dk-coach-item__name">${escapeHtml(name)}</span>
              ${role ? `<span class="dk-coach-item__title">${escapeHtml(role)}</span>` : ''}
            </span>
            ${bio ? `<span class="dk-coach-item__toggle" aria-hidden="true">Bio ${CHEVRON}</span>` : ''}
          </summary>
          ${bio ? `<div class="dk-coach-item__bio">${bio}</div>` : ''}
        </details>`;
  }

  function renderCoaches(el) {
    return load('coaches')
      .then((list) => {
        const items = list.map(coachItem).filter(Boolean);
        el.innerHTML = items.length ? items.join('') : '<p class="dk-content-note">Coach bios are coming soon.</p>';
      })
      .catch(() => {
        el.innerHTML = '<p class="dk-content-note">The coach list could not load. Please refresh the page.</p>';
      });
  }

  // ---- Tournaments (Schedule page + team pages) ----
  function normalizeTournament(raw) {
    const name = text(raw.name);
    const start = isoDate(raw.start);
    if (!name || !start) return null;
    const end = isoDate(raw.end);
    const teams = (Array.isArray(raw.teams) ? raw.teams : [raw.teams]).map(text).filter(Boolean);
    return {
      name, start, end: end && end > start ? end : '', teams,
      location: text(raw.location), notes: text(raw.notes), link: safeUrl(raw.link),
      type: BADGES[raw.type] ? raw.type : 'tournament',
    };
  }

  function teamsLabel(teams) {
    if (!teams.length || teams.includes('all')) return 'All Teams';
    return teams.map((t) => TEAM_LABELS[t] || t).join(', ');
  }

  function dateBox(start, end) {
    const s = localDate(start);
    if (!end) return [monthAbbr(s), String(s.getDate())];
    const e = localDate(end);
    const month = s.getMonth() === e.getMonth() ? monthAbbr(s) : monthAbbr(s) + '/' + monthAbbr(e);
    return [month, s.getDate() + '-' + e.getDate()];
  }

  function tournamentItem(t, showTeams) {
    const [month, day] = dateBox(t.start, t.end);
    const [badge, badgeClass] = BADGES[t.type];
    const meta = [showTeams ? teamsLabel(t.teams) : '', t.location, t.notes]
      .filter(Boolean).map((s) => `<span>${escapeHtml(s)}</span>`).join('');
    const title = t.link
      ? `<a href="${escapeHtml(t.link)}" target="_blank" rel="noopener">${escapeHtml(t.name)}</a>`
      : escapeHtml(t.name);
    return `<div class="dk-schedule-item">
          <div class="dk-schedule-item__date">
            <span class="dk-schedule-item__month">${month}</span>
            <span class="dk-schedule-item__day">${day}</span>
          </div>
          <div class="dk-schedule-item__details">
            <h3>${title}</h3>
            ${meta ? `<p class="dk-schedule-item__meta">${meta}</p>` : ''}
          </div>
          <span class="dk-schedule-item__badge${badgeClass}">${badge}</span>
        </div>`;
  }

  function renderTournaments(el) {
    const team = el.getAttribute('data-team');
    const section = el.closest('[data-hide-when-empty]');
    return load('tournaments')
      .then((list) => {
        const today = startOfToday();
        const upcoming = list
          .map(normalizeTournament)
          .filter((t) => t && localDate(t.end || t.start) >= today)
          .filter((t) => !team || t.teams.includes('all') || t.teams.includes(team))
          .sort((a, b) => a.start.localeCompare(b.start));
        if (!upcoming.length) {
          if (section) section.hidden = true;
          else el.innerHTML = `<p class="dk-content-note">Our tournament schedule is coming soon. Check back here or follow us on ${INSTAGRAM} for updates.</p>`;
          return;
        }
        el.innerHTML = upcoming.map((t) => tournamentItem(t, !team)).join('');
        if (section) section.hidden = false;
      })
      .catch(() => {
        if (section) section.hidden = true;
        else el.innerHTML = '<p class="dk-content-note">The schedule could not load. Please refresh the page.</p>';
      });
  }

  // ---- Practice schedule (Schedule page) ----
  function renderPractices(el) {
    const section = el.closest('[data-hide-when-empty]');
    return load('practices')
      .then((list) => {
        const cards = list
          .filter((p) => text(p.group))
          .map((p) => {
            const lines = [p.days, p.time, p.location].map(text).filter(Boolean);
            return `<div class="dk-invest-card">
          <h3>${escapeHtml(text(p.group))}</h3>
          ${lines.length ? `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}
        </div>`;
          });
        el.innerHTML = cards.join('');
        if (section) section.hidden = !cards.length;
      })
      .catch(() => {
        if (section) section.hidden = true;
      });
  }

  const renders = [];
  document.querySelectorAll('[data-coach-list]').forEach((el) => renders.push(renderCoaches(el)));
  document.querySelectorAll('[data-tournament-list]').forEach((el) => renders.push(renderTournaments(el)));
  document.querySelectorAll('[data-practice-list]').forEach((el) => renders.push(renderPractices(el)));
  if (renders.length) Promise.all(renders).then(scrollToHashTarget);

  return { loadEvents, escapeHtml };
})();
