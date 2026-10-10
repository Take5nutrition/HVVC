// ========================================
// HVVC — Editable site content
// Coaches, leadership, teams, tournaments, practices, and events live in
// /data/*.json and are edited through the dashboard (admin/). Text from the
// dashboard is escaped before it is shown, so it can never break a page.
// ========================================

window.HVVC = (function () {
  const BADGES = {
    tournament: ['Tournament', ''],
    regional: ['Regional', ' dk-schedule-item__badge--highlight'],
    event: ['Event', ' dk-schedule-item__badge--event'],
  };
  const LEGACY_FRAMING = { headshot: [20, 1], 'full-high': [17, 2.5], 'full-middle': [21, 2.5], 'full-low': [27, 2.5] };
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>';
  const SILHOUETTE = '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const INSTAGRAM = '<a href="https://instagram.com/hvvc_volleyball" target="_blank" rel="noopener">Instagram</a>';
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ---------- helpers ----------
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
  function photoUrl(value) {
    const v = text(value);
    return safeUrl(v) || (/^img\//.test(v) ? '/' + v : '');
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
  function paragraphs(value) {
    return text(value).split(/\n+/).map(text).filter(Boolean);
  }
  function initials(name) {
    return text(name).split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
  }
  // Emails and web addresses in already-escaped text become links.
  function linkify(escaped) {
    return escaped
      .replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '<a href="mailto:$1">$1</a>')
      .replace(/\bhttps?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  }

  // Inline style for a photo framed with the dashboard's zoom/position tools.
  function cropStyle(item, prefix = 'photo', fallbackY = 20) {
    let x = Number(item[prefix + 'X']);
    let y = Number(item[prefix + 'Y']);
    let zoom = Number(item[prefix + 'Zoom']);
    if (!Number.isFinite(y) && LEGACY_FRAMING[item.framing]) [y, zoom] = LEGACY_FRAMING[item.framing];
    x = Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50;
    y = Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : fallbackY;
    zoom = Number.isFinite(zoom) ? Math.min(4, Math.max(1, zoom)) : 1;
    return `object-position:${x}% ${y}%;transform-origin:${x}% ${y}%;${zoom > 1 ? `transform:scale(${zoom});` : ''}`;
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
  function loadOptional(name) {
    return load(name).catch(() => []);
  }

  function teamPath(team) { return `/hvvc-${slug(team.slug)}/`; }
  function shortTeamName(team) { return text(team.name).replace(/^hvvc\s+/i, '') || slug(team.slug); }
  function coachId(coach) { return slug(coach.id) || slug(coach.name); }

  function scrollToHashTarget() {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView({ block: 'start' });
  }

  // ---------- events (Events page + homepage) ----------
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

  // ---------- coaches (Staff page) ----------
  // A coach's title comes from their own "Title" field, or else from the
  // teams they're assigned to.
  function coachRoles(teams) {
    const roles = {};
    for (const team of teams) {
      for (const row of Array.isArray(team.coaches) ? team.coaches : []) {
        const id = slug(row.coach);
        if (!id) continue;
        (roles[id] = roles[id] || []).push(`${shortTeamName(team)} ${text(row.role) || 'Coach'}`);
      }
    }
    return roles;
  }

  function coachPhoto(coach, size) {
    const photo = photoUrl(coach.photo);
    return photo
      ? `<span class="dk-coach-item__photo${size ? ' ' + size : ''}"><img src="${escapeHtml(photo)}" alt="" loading="lazy" style="${cropStyle(coach)}" /></span>`
      : `<span class="dk-coach-item__photo dk-coach-item__photo--initials${size ? ' ' + size : ''}" aria-hidden="true">${escapeHtml(initials(coach.name))}</span>`;
  }

  function coachItem(coach, roles) {
    const name = text(coach.name);
    if (!name) return '';
    const role = text(coach.role) || (roles[coachId(coach)] || []).join(' · ');
    const bio = paragraphs(coach.bio).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    return `<details class="dk-coach-item" id="coach-${escapeHtml(coachId(coach))}">
          <summary>
            ${coachPhoto(coach)}
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
    return Promise.all([load('coaches'), loadOptional('teams')])
      .then(([coaches, teams]) => {
        const roles = coachRoles(teams);
        const items = coaches.map((c) => coachItem(c, roles)).filter(Boolean);
        el.innerHTML = items.length ? items.join('') : '<p class="dk-content-note">Coach bios are coming soon.</p>';
      })
      .catch(() => {
        el.innerHTML = '<p class="dk-content-note">The coach list could not load. Please refresh the page.</p>';
      });
  }

  // ---------- leadership (Staff page) ----------
  function leaderSection(leader, index) {
    const name = text(leader.name);
    if (!name) return '';
    const photo = photoUrl(leader.photo);
    const media = photo
      ? `<div class="dk-split__photo-wrap"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" class="dk-split__img" loading="lazy" style="${cropStyle(leader, 'photo', 12)}" /><div class="dk-split__photo-overlay"></div></div>`
      : `<div class="dk-split__photo-wrap dk-split__photo-wrap--empty">${SILHOUETTE}</div>`;
    const button = text(leader.buttonLabel) && safeUrl(leader.buttonLink)
      ? `<a href="${escapeHtml(safeUrl(leader.buttonLink))}" class="btn btn--primary" style="margin-top:24px;"${/^https?:/i.test(leader.buttonLink) ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(text(leader.buttonLabel))}</a>`
      : '';
    return `<section class="dk-split dk-split--compact${index % 2 ? ' dk-split--reverse' : ''} grain-overlay">
    <div class="dk-section__bg"></div>
    <div class="dk-split__inner">
      ${media}
      <div class="dk-split__text-col">
        <span class="dk-split__kicker"><span class="dk-split__kicker-bar"></span>${escapeHtml(text(leader.label) || 'Leadership')}</span>
        <h2 class="dk-split__heading">${escapeHtml(name)}</h2>
        ${text(leader.title) ? `<span class="dk-coach-card__title" style="display:block;margin-bottom:16px;">${escapeHtml(text(leader.title))}</span>` : ''}
        ${paragraphs(leader.bio).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        ${button}
      </div>
    </div>
  </section>`;
  }

  function renderLeaders(el) {
    return load('leaders')
      .then((leaders) => { el.innerHTML = leaders.map(leaderSection).join(''); })
      .catch(() => { el.innerHTML = ''; });
  }

  // ---------- tournaments: schedule table ----------
  function normalizeTournament(raw) {
    const name = text(raw.name);
    const start = isoDate(raw.start);
    if (!name || !start) return null;
    const end = isoDate(raw.end);
    const teams = (raw.team ? [raw.team] : Array.isArray(raw.teams) ? raw.teams : [raw.teams]).map(text).filter(Boolean);
    return {
      name, start, end: end && end > start ? end : '', teams,
      location: text(raw.location), notes: text(raw.notes), link: safeUrl(raw.link),
      type: BADGES[raw.type] ? raw.type : 'tournament',
    };
  }

  function dayLabel(t) {
    const s = localDate(t.start);
    if (!t.end) return DAYS[s.getDay()];
    return `${DAYS[s.getDay()]} to ${DAYS[localDate(t.end).getDay()]}`;
  }

  function datesLabel(t) {
    const s = localDate(t.start);
    const month = (d) => d.toLocaleString('en-US', { month: 'short' });
    if (!t.end) return `${month(s)} ${s.getDate()}`;
    const e = localDate(t.end);
    return s.getMonth() === e.getMonth() ? `${month(s)} ${s.getDate()}–${e.getDate()}` : `${month(s)} ${s.getDate()} – ${month(e)} ${e.getDate()}`;
  }

  function teamsLabel(teamSlugs, teams) {
    const listed = teams.filter((t) => t.scheduleDeveloping !== true).map((t) => slug(t.slug));
    if (!teamSlugs.length || teamSlugs.includes('all') || (listed.length > 1 && listed.every((s) => teamSlugs.includes(s)))) return 'All Teams';
    const order = teams.map((t) => slug(t.slug));
    const byslug = Object.fromEntries(teams.map((t) => [slug(t.slug), shortTeamName(t)]));
    return [...teamSlugs].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((s) => byslug[s] || s).join(', ');
  }

  // Same tournament entered for several teams shows as one row on the Schedule page.
  function mergeSameTournaments(list) {
    const merged = new Map();
    for (const t of list) {
      const key = [t.name, t.start, t.end, t.location, t.notes, t.link, t.type].join('|');
      const found = merged.get(key);
      if (found) found.teams = [...new Set([...found.teams, ...t.teams])];
      else merged.set(key, { ...t, teams: [...t.teams] });
    }
    return [...merged.values()];
  }

  function scheduleTable(list, teams, { showTeams }) {
    const today = startOfToday();
    const rows = list.map((t) => {
      const past = localDate(t.end || t.start) < today;
      const name = t.link
        ? `<a href="${escapeHtml(t.link)}" target="_blank" rel="noopener">${escapeHtml(t.name)}</a>`
        : escapeHtml(t.name);
      return `<tr${past ? ' class="is-past"' : ''}>
          <td data-label="Day">${dayLabel(t)}</td>
          <td data-label="Date(s)">${datesLabel(t)}</td>
          <td data-label="Tournament" class="schedule-table__name">${name}${t.notes ? `<span class="schedule-table__note">${escapeHtml(t.notes)}</span>` : ''}${past ? '<span class="schedule-table__done">Completed</span>' : ''}</td>
          ${showTeams ? `<td data-label="Teams">${escapeHtml(teamsLabel(t.teams, teams))}</td>` : ''}
          <td data-label="Location">${escapeHtml(t.location || 'TBA')}</td>
        </tr>`;
    }).join('');
    return `<div class="schedule-table-wrap"><table class="schedule-table">
        <thead><tr><th scope="col">Day</th><th scope="col">Date(s)</th><th scope="col">Name of tournament</th>${showTeams ? '<th scope="col">Teams</th>' : ''}<th scope="col">Location</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  // Schedule page: every team's upcoming tournaments.
  function renderTournaments(el) {
    return Promise.all([load('tournaments'), loadOptional('teams')])
      .then(([list, teams]) => {
        const today = startOfToday();
        // Teams whose schedule is still being developed stay off this page.
        const developing = new Set(teams.filter((t) => t.scheduleDeveloping === true).map((t) => slug(t.slug)));
        const published = teams.filter((t) => !developing.has(slug(t.slug)));
        let upcoming = list.map(normalizeTournament)
          .filter((t) => t && localDate(t.end || t.start) >= today)
          .map((t) => ({ ...t, teams: t.teams.filter((s) => !developing.has(s)) }))
          .filter((t) => t.teams.length && (!t.teams.includes('all') || published.length));
        upcoming = mergeSameTournaments(upcoming).sort((a, b) => a.start.localeCompare(b.start));
        el.innerHTML = upcoming.length
          ? scheduleTable(upcoming, teams, { showTeams: true })
          : `<p class="dk-content-note">Our tournament schedule is coming soon. Check back here or follow us on ${INSTAGRAM} for updates.</p>`;
      })
      .catch(() => { el.innerHTML = '<p class="dk-content-note">The schedule could not load. Please refresh the page.</p>'; });
  }

  // ---------- practices (Schedule page) ----------
  function renderPractices(el) {
    const section = el.closest('[data-hide-when-empty]');
    return load('practices')
      .then((list) => {
        const cards = list.filter((p) => text(p.group)).map((p) => {
          const lines = [p.days, p.time, p.location].map(text).filter(Boolean);
          return `<div class="dk-invest-card">
          <h3>${escapeHtml(text(p.group))}</h3>
          ${lines.length ? `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}
        </div>`;
        });
        el.innerHTML = cards.join('');
        if (section) section.hidden = !cards.length;
      })
      .catch(() => { if (section) section.hidden = true; });
  }

  // ---------- teams menu (every page) ----------
  function groupTeams(teams) {
    const groups = [];
    for (const team of teams) {
      if (!slug(team.slug) || !text(team.name)) continue;
      const name = text(team.group) || 'Teams';
      let g = groups.find((x) => x.name === name);
      if (!g) groups.push((g = { name, teams: [] }));
      g.teams.push(team);
    }
    return groups;
  }

  function renderTeamMenus(teams) {
    const groups = groupTeams(teams);
    if (!groups.length) return;
    const here = location.pathname.replace(/\/?$/, '/');
    const html = groups.map((g) => `<span class="nav-dropdown__section">${escapeHtml(g.name)}</span>${g.teams.map((t) => `<a href="${teamPath(t)}"${teamPath(t) === here ? ' class="nav-active"' : ''}>${escapeHtml(text(t.name))}</a>`).join('')}`).join('');
    document.querySelectorAll('.nav-dropdown').forEach((dropdown) => {
      const trigger = dropdown.querySelector('.nav-dropdown__trigger');
      const menu = dropdown.querySelector('.nav-dropdown__menu');
      if (trigger && menu && /^\s*Teams\b/.test(trigger.textContent)) menu.innerHTML = html;
    });
  }

  // ---------- Teams page ----------
  function divisionHeading(group, teamsInGroup) {
    const match = /^(\d+)U$/i.exec(group);
    if (match) return [`${match[1]} &amp; Under`, `${escapeHtml(group.toUpperCase())} Division`];
    const badge = text(teamsInGroup[0].badge) || group;
    return [escapeHtml(group), `${escapeHtml(badge)} Program`];
  }

  function teamCard(team) {
    const name = escapeHtml(text(team.name));
    const badge = escapeHtml(text(team.badge) || text(team.group));
    const desc = text(team.cardText) ? `<p class="dk-team-card__desc">${escapeHtml(text(team.cardText))}</p>` : '';
    const photo = photoUrl(team.photo);
    if (!photo) {
      return `<div class="dk-team-card dk-team-card--dev">
          <div class="dk-team-card__body">
            <span class="dk-team-card__age">${badge}</span>
            <h3 class="dk-team-card__name">${name}</h3>
            ${desc}
            <a href="${teamPath(team)}" class="btn btn--primary btn--sm">View Team</a>
          </div>
        </div>`;
    }
    return `<div class="dk-team-card">
          <div class="dk-team-card__photo">
            <img src="${escapeHtml(photo)}" alt="${name} Team Photo" loading="lazy" />
            <div class="dk-team-card__photo-overlay"></div>
            <span class="dk-team-card__age">${badge}</span>
          </div>
          <div class="dk-team-card__body">
            <h3 class="dk-team-card__name">${name}</h3>
            ${desc}
            <a href="${teamPath(team)}" class="btn btn--secondary btn--sm">View Team</a>
          </div>
        </div>`;
  }

  function renderTeamDivisions(el, teams) {
    el.innerHTML = groupTeams(teams).map((g) => {
      const [kicker, title] = divisionHeading(g.name, g.teams);
      return `<section class="teams-division">
    <div class="teams-division__inner">
      <div class="teams-division__header">
        <span class="teams-division__kicker"><span class="teams-division__kicker-bar"></span>${kicker}</span>
        <h2 class="teams-division__title">${title}</h2>
      </div>
      <div class="teams-division__grid${g.teams.length === 1 ? ' teams-division__grid--single' : ''}">
        ${g.teams.map(teamCard).join('')}
      </div>
    </div>
  </section>`;
    }).join('');
  }

  // ---------- team page ----------
  function cardsSection(kicker, heading, cards) {
    const list = (cards || []).filter((c) => text(c.title));
    if (!list.length) return '';
    return `<section class="dk-section grain-overlay">
    <div class="dk-section__bg"></div>
    <div class="container">
      <div class="section__header">
        <span class="dk-split__kicker"><span class="dk-split__kicker-bar"></span>${escapeHtml(kicker)}</span>
        <h2 class="dk-split__heading">${escapeHtml(heading)}</h2>
      </div>
      <div class="dk-invest-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        ${list.map((c) => `<div class="dk-invest-card"><h3>${escapeHtml(text(c.title))}</h3>${text(c.text) ? `<p>${escapeHtml(text(c.text))}</p>` : ''}</div>`).join('')}
      </div>
    </div>
  </section>`;
  }

  function overviewSection(team) {
    const name = text(team.name);
    const heading = escapeHtml(text(team.overviewHeading) || name);
    const body = paragraphs(team.overview).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const url = safeUrl(team.scheduleUrl);
    const label = escapeHtml(text(team.scheduleLabel) || 'View Tournament Schedule');
    const photo = photoUrl(team.photo);
    if (photo) {
      return `<section class="dk-split grain-overlay">
    <div class="dk-section__bg"></div>
    <div class="dk-split__inner">
      <div class="dk-split__photo-wrap">
        <img src="${escapeHtml(photo)}" alt="${escapeHtml(name)} Team Photo" class="dk-split__img" loading="lazy" />
        <div class="dk-split__photo-overlay"></div>
      </div>
      <div class="dk-split__text-col">
        <span class="dk-split__kicker"><span class="dk-split__kicker-bar"></span>Team Overview</span>
        <h2 class="dk-split__heading">${heading}</h2>
        ${body}
        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn--secondary" style="margin-top:12px;">${label}</a>` : ''}
      </div>
    </div>
  </section>`;
    }
    return `<section class="dk-section grain-overlay">
    <div class="dk-section__bg"></div>
    <div class="container">
      <div class="section__header">
        <span class="dk-split__kicker"><span class="dk-split__kicker-bar"></span>Program Overview</span>
        <h2 class="dk-split__heading">${heading}</h2>
      </div>
      <div class="dk-invest-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="dk-invest-card">
          <h3>${escapeHtml(text(team.overviewTitle) || 'About the Team')}</h3>
          ${body}
          ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn--secondary btn--sm" style="margin-top:12px;">${label}</a>` : ''}
        </div>
      </div>
    </div>
  </section>`;
  }

  function teamScheduleSection(team, tournaments, teams) {
    if (team.scheduleDeveloping === true) {
      const message = text(team.scheduleMessage) || 'Our season schedule is being developed. Check back soon for tournament dates and locations.';
      return `<section class="section team-schedule">
    <div class="container">
      <div class="section__header">
        <span class="section__tag">Calendar</span>
        <h2 class="section__title">Tournament Schedule</h2>
      </div>
      <div class="schedule-pending">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="40" height="40" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p class="schedule-pending__title">Season schedule coming soon</p>
        <p class="schedule-pending__text">${escapeHtml(message)}</p>
      </div>
    </div>
  </section>`;
    }
    const id = slug(team.slug);
    const list = tournaments.map(normalizeTournament)
      .filter((t) => t && (t.teams.includes('all') || t.teams.includes(id)))
      .sort((a, b) => a.start.localeCompare(b.start));
    if (!list.length) return '';
    return `<section class="section team-schedule">
    <div class="container">
      <div class="section__header">
        <span class="section__tag">Calendar</span>
        <h2 class="section__title">Tournament Schedule</h2>
      </div>
      ${scheduleTable(list, teams, { showTeams: false })}
      <p class="team-schedule__note">Dates and locations can change. Check back for updates.</p>
    </div>
  </section>`;
  }

  function seasonSection(team) {
    const rows = (team.seasonInfo || []).filter((r) => text(r.label) && text(r.value));
    if (!rows.length) return '';
    return `<section class="section">
    <div class="container">
      <div class="section__header">
        <span class="section__tag">Details</span>
        <h2 class="section__title">Season Information</h2>
      </div>
      <div class="season-info">
        ${rows.map((r) => {
          const lines = text(r.value).split('\n').map(text).filter(Boolean);
          const value = lines.length > 1 ? `<ul>${lines.map((l) => `<li>${linkify(escapeHtml(l))}</li>`).join('')}</ul>` : linkify(escapeHtml(lines[0]));
          return `<div class="season-info__row"><span class="season-info__label">${escapeHtml(text(r.label))}</span><span class="season-info__value">${value}</span></div>`;
        }).join('')}
      </div>
    </div>
  </section>`;
  }

  function teamCoachesSection(team, coaches) {
    const byId = Object.fromEntries(coaches.map((c) => [coachId(c), c]));
    const rows = (team.coaches || []).map((r) => ({ coach: byId[slug(r.coach)], role: text(r.role) || 'Coach' })).filter((r) => r.coach);
    if (!rows.length) return '';
    return `<section class="dk-section grain-overlay">
    <div class="dk-section__bg"></div>
    <div class="container">
      <div class="section__header">
        <span class="dk-split__kicker"><span class="dk-split__kicker-bar"></span>Coaching Staff</span>
        <h2 class="dk-split__heading">Meet the Coaches</h2>
      </div>
      <div class="team-coaches">
        ${rows.map(({ coach, role }) => `<a class="team-coach" href="/coaches/#coach-${escapeHtml(coachId(coach))}">
          ${coachPhoto(coach, 'team-coach__photo')}
          <span class="team-coach__name">${escapeHtml(text(coach.name))}</span>
          <span class="team-coach__role">${escapeHtml(role)}</span>
          <span class="team-coach__link">View bio →</span>
        </a>`).join('')}
      </div>
    </div>
  </section>`;
  }

  function rosterSection(team) {
    const players = (team.players || []).filter((p) => text(p.name));
    if (!players.length) return '';
    return `<section class="section">
    <div class="container">
      <div class="section__header">
        <span class="section__tag">Team</span>
        <h2 class="section__title">Roster</h2>
      </div>
      <ul class="roster">
        ${players.map((p) => `<li class="roster__player">
          <span class="roster__number">${escapeHtml(text(p.number) || '–')}</span>
          <span class="roster__name">${escapeHtml(text(p.name))}</span>
          ${[p.position, p.year].map(text).filter(Boolean).length ? `<span class="roster__meta">${escapeHtml([p.position, p.year].map(text).filter(Boolean).join(' · '))}</span>` : ''}
        </li>`).join('')}
      </ul>
    </div>
  </section>`;
  }

  function renderTeamPage(root) {
    const match = location.pathname.match(/^\/hvvc-([a-z0-9-]+)\/?$/i);
    const wanted = match ? match[1].toLowerCase() : new URLSearchParams(location.search).get('team');
    return Promise.all([load('teams'), loadOptional('coaches'), loadOptional('tournaments')])
      .then(([teams, coaches, tournaments]) => {
        const team = teams.find((t) => slug(t.slug) === wanted);
        const set = (sel, value) => document.querySelectorAll(sel).forEach((el) => { el.textContent = value; });
        if (!team) {
          document.title = 'Team not found - HVVC';
          set('[data-team-name]', 'Team not found');
          set('[data-team-kicker]', 'Teams');
          set('[data-team-tagline]', '');
          root.innerHTML = `<section class="section"><div class="container"><p class="dk-content-note" style="color:#475569;">We couldn't find that team. <a href="/teams/" style="color:var(--pink);">See all HVVC teams</a>.</p></div></section>`;
          document.querySelectorAll('[data-team-cta]').forEach((el) => { el.hidden = true; });
          return;
        }
        const name = text(team.name);
        document.title = `${name} - HVVC`;
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', `${name} - ${text(team.tagline) || 'Happy Valley Volleyball Club team.'}`);
        set('[data-team-kicker]', text(team.kicker) || `${text(team.group)} Division`);
        set('[data-team-name]', name);
        set('[data-team-title]', name + '.');
        set('[data-team-tagline]', text(team.tagline));
        set('[data-team-badge]', text(team.badge) || text(team.group));
        if (text(team.ctaText)) set('[data-team-cta-text]', text(team.ctaText));
        if (team.hideTryoutButton === true) document.querySelectorAll('[data-team-tryout]').forEach((el) => { el.style.display = 'none'; });
        root.innerHTML = [
          overviewSection(team),
          teamScheduleSection(team, tournaments, teams),
          seasonSection(team),
          teamCoachesSection(team, coaches),
          rosterSection(team),
          cardsSection(text(team.highlightsKicker) || 'Development', text(team.highlightsHeading) || 'Highlights', team.highlights),
          cardsSection('Culture', 'Team Expectations', team.expectations),
        ].join('');
      })
      .catch(() => {
        root.innerHTML = '<section class="section"><div class="container"><p class="dk-content-note" style="color:#475569;">This team page could not load. Please refresh.</p></div></section>';
      });
  }

  // ---------- start ----------
  // Marks every page of the preview copy so it isn't mistaken for the live site.
  if (!/^(www\.)?hvvcvolleyballclub\.com$/.test(location.hostname)) {
    const ribbon = document.createElement('div');
    ribbon.className = 'preview-ribbon';
    ribbon.innerHTML = '<strong>Preview site</strong> · these updates aren\'t live yet · <a href="https://www.hvvcvolleyballclub.com/">Live site</a>';
    document.body.appendChild(ribbon);
  }

  const renders = [];
  document.querySelectorAll('[data-leaders]').forEach((el) => renders.push(renderLeaders(el)));
  document.querySelectorAll('[data-coach-list]').forEach((el) => renders.push(renderCoaches(el)));
  document.querySelectorAll('[data-tournament-list]').forEach((el) => renders.push(renderTournaments(el)));
  document.querySelectorAll('[data-practice-list]').forEach((el) => renders.push(renderPractices(el)));
  document.querySelectorAll('[data-team-page]').forEach((el) => renders.push(renderTeamPage(el)));
  loadOptional('teams').then((teams) => {
    renderTeamMenus(teams);
    document.querySelectorAll('[data-team-divisions]').forEach((el) => renderTeamDivisions(el, teams));
  });
  if (renders.length) Promise.all(renders).then(scrollToHashTarget);

  return { loadEvents, escapeHtml };
})();
