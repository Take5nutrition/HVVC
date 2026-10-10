// Content the dashboard can edit. The dashboard builds its forms from these
// definitions, and api/admin.js validates every save against them, so a
// field added here appears in the form and is kept when saving.
//
// Field types: text, textarea, date, url, select, checkboxes, toggle, lines,
// photo (adds <name>X, <name>Y, <name>Zoom when crop is on), and list
// (repeating rows of sub-fields). `optionsFrom` fills select/checkbox options
// from another section ("coaches" or "teams") at edit and save time.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHOTO_RE = /^\/img\/[A-Za-z0-9._\/-]+\.(jpe?g|png|webp)$/i;

const SCHEMAS = {
  coaches: {
    label: 'Coaches',
    itemLabel: 'coach',
    path: 'data/coaches.json',
    page: '/coaches/',
    pageLabel: 'Staff page',
    intro: 'Coaches show in the "Our Coaches" list on the Staff page, in this order. Assign coaches to a team from the Teams tab.',
    ordered: true,
    maxItems: 60,
    summary: ['name', 'role'],
    idField: 'id',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Title', type: 'text', max: 80, placeholder: '16-1 Head Coach', help: 'Leave blank to show their team role automatically (from the Teams tab).' },
      { name: 'photo', label: 'Photo', type: 'photo', crop: true, frame: 'circle', help: 'Drag the photo or use the sliders to frame their face. Without a photo, their initials show.' },
      { name: 'bio', label: 'Bio', type: 'textarea', max: 4000, help: 'Start each new paragraph on a new line.' },
      { name: 'id', label: 'Link name', type: 'text', max: 60, advanced: true, help: 'Used in links to this coach. Filled in automatically.' },
    ],
  },

  leaders: {
    label: 'Leadership',
    itemLabel: 'leader',
    path: 'data/leaders.json',
    page: '/coaches/',
    pageLabel: 'Staff page',
    intro: 'Large featured sections at the top of the Staff page, like the Club Director. Add one for anyone who should be featured.',
    ordered: true,
    maxItems: 12,
    summary: ['name', 'title'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'title', label: 'Title', type: 'text', max: 80, placeholder: 'Club Director' },
      { name: 'label', label: 'Small heading above the name', type: 'text', max: 40, default: 'Leadership', placeholder: 'Leadership' },
      { name: 'photo', label: 'Photo', type: 'photo', crop: true, frame: 'portrait', help: 'Drag the photo or use the sliders to frame it.' },
      { name: 'bio', label: 'Bio', type: 'textarea', max: 5000, help: 'Start each new paragraph on a new line. The first paragraph shows slightly larger.' },
      { name: 'buttonLabel', label: 'Button text', type: 'text', max: 40, placeholder: 'Contact Sarah →', help: 'Optional. Leave blank for no button.' },
      { name: 'buttonLink', label: 'Button link', type: 'link', help: 'A page on the site like /contact/, or a full web address.' },
    ],
  },

  teams: {
    label: 'Teams',
    itemLabel: 'team',
    path: 'data/teams.json',
    page: '/teams/',
    pageLabel: 'Teams page',
    intro: 'Each team gets its own page, a card on the Teams page, and a spot in the Teams menu, in this order. Add a team and its page appears automatically.',
    ordered: true,
    maxItems: 40,
    summary: ['name', 'group'],
    idField: 'slug',
    fields: [
      { name: 'name', label: 'Team name', type: 'text', required: true, max: 60, placeholder: 'HVVC 16-1' },
      { name: 'slug', label: 'Web address name', type: 'text', required: true, max: 30, placeholder: '16-1', help: 'Short and lowercase, like 16-1. The page will be at /hvvc-16-1/. Changing it changes the page address.' },
      { name: 'group', label: 'Division', type: 'text', required: true, max: 30, placeholder: '16U', help: 'Groups teams in the menu and on the Teams page, like 16U, 14U, 12U, or Developmental.' },
      { name: 'badge', label: 'Age badge', type: 'text', max: 12, placeholder: '16U', help: 'Short label on the team card. Defaults to the division.' },
      { name: 'kicker', label: 'Small heading on the team page', type: 'text', max: 40, placeholder: '16U Division' },
      { name: 'tagline', label: 'Team page subtitle', type: 'text', max: 140 },
      { name: 'photo', label: 'Team photo', type: 'photo', crop: false, frame: 'landscape', help: 'Shown on the team page and its card. Leave blank to use a text-only layout.' },
      { name: 'cardText', label: 'Teams page card text', type: 'textarea', max: 400, help: 'A sentence or two for this team\'s card on the Teams page.' },
      { name: 'overview', label: 'Team overview', type: 'textarea', max: 3000, help: 'Start each new paragraph on a new line.' },
      { name: 'coaches', label: 'Coaches', type: 'list', itemLabel: 'coach', max: 8, help: 'Each coach links to their bio on the Staff page. Add coaches in the Coaches tab first.',
        fields: [
          { name: 'coach', label: 'Coach', type: 'select', optionsFrom: 'coaches', required: true },
          { name: 'role', label: 'Role on this team', type: 'text', max: 40, default: 'Head Coach', placeholder: 'Head Coach' },
        ] },
      { name: 'players', label: 'Roster', type: 'list', itemLabel: 'player', max: 30, help: 'Leave empty to hide the roster section.',
        fields: [
          { name: 'number', label: 'Number', type: 'text', max: 4, placeholder: '7' },
          { name: 'name', label: 'Player name', type: 'text', required: true, max: 60 },
          { name: 'position', label: 'Position', type: 'text', max: 40, placeholder: 'Outside Hitter' },
          { name: 'year', label: 'Grade or grad year', type: 'text', max: 20, placeholder: '2030' },
        ] },
      { name: 'seasonInfo', label: 'Season information', type: 'list', itemLabel: 'detail', max: 20, help: 'Rows in the "Season Information" section. Put each item on its own line to show a bulleted list.',
        fields: [
          { name: 'label', label: 'Label', type: 'text', required: true, max: 40, placeholder: 'Practice' },
          { name: 'value', label: 'Details', type: 'textarea', required: true, max: 600 },
        ] },
      { name: 'scheduleUrl', label: 'Schedule button link', type: 'url', advanced: true, help: 'The "View Tournament Schedule" button. Leave blank to hide it.' },
      { name: 'scheduleLabel', label: 'Schedule button text', type: 'text', max: 40, default: 'View Tournament Schedule', advanced: true },
      { name: 'overviewHeading', label: 'Overview heading', type: 'text', max: 80, advanced: true, help: 'Defaults to the team name.' },
      { name: 'overviewTitle', label: 'Overview card title (text-only layout)', type: 'text', max: 60, advanced: true, placeholder: 'Program Focus' },
      { name: 'highlightsKicker', label: 'Extra section small heading', type: 'text', max: 40, advanced: true, placeholder: 'Development' },
      { name: 'highlightsHeading', label: 'Extra section heading', type: 'text', max: 80, advanced: true, placeholder: 'What Athletes Learn' },
      { name: 'highlights', label: 'Extra section cards', type: 'list', itemLabel: 'card', max: 8, advanced: true, help: 'Optional cards shown before Team Expectations.',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true, max: 60 },
          { name: 'text', label: 'Text', type: 'textarea', max: 400 },
        ] },
      { name: 'ctaText', label: 'Bottom section text', type: 'text', max: 200, advanced: true, help: 'Replaces the line under "Interested in …?" at the bottom of the team page.' },
      { name: 'hideTryoutButton', label: 'Hide the Register for Tryouts button on this team page', type: 'toggle', advanced: true },
      { name: 'expectations', label: 'Team expectations', type: 'list', itemLabel: 'expectation', max: 8, advanced: true,
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true, max: 60 },
          { name: 'text', label: 'Text', type: 'textarea', max: 400 },
        ] },
    ],
  },

  tournaments: {
    label: 'Tournaments',
    itemLabel: 'tournament',
    path: 'data/tournaments.json',
    page: '/schedule/',
    pageLabel: 'Schedule page',
    intro: 'Tournaments show in each selected team\'s schedule and on the Schedule page. Past ones stay on team schedules, grayed out, until you remove them.',
    sortBy: 'start',
    maxItems: 300,
    summary: ['name', 'start'],
    fields: [
      { name: 'name', label: 'Tournament name', type: 'text', required: true, max: 120 },
      { name: 'start', label: 'Start date', type: 'date', required: true },
      { name: 'end', label: 'End date', type: 'date', help: 'Leave blank for a one-day tournament.' },
      { name: 'teams', label: 'Teams playing', type: 'checkboxes', required: true, optionsFrom: 'teams', options: [{ value: 'all', label: 'All teams' }] },
      { name: 'location', label: 'Location', type: 'text', max: 160, placeholder: 'TBD, assigned by CEVA' },
      {
        name: 'type', label: 'Type', type: 'select', default: 'tournament',
        options: [
          { value: 'tournament', label: 'Tournament' },
          { value: 'regional', label: 'Regional or qualifier' },
          { value: 'event', label: 'Club event' },
        ],
      },
      { name: 'notes', label: 'Notes', type: 'text', max: 200, placeholder: 'Check-in 7:30 AM' },
      { name: 'link', label: 'Link', type: 'url', help: 'Optional web address for tournament details.' },
    ],
  },

  practices: {
    label: 'Practices',
    itemLabel: 'practice group',
    path: 'data/practices.json',
    page: '/schedule/',
    pageLabel: 'Schedule page',
    intro: 'Practice times show as cards on the Schedule page, in this order.',
    ordered: true,
    maxItems: 30,
    summary: ['group', 'days'],
    fields: [
      { name: 'group', label: 'Group', type: 'text', required: true, max: 80, placeholder: '16s Teams' },
      { name: 'days', label: 'Days', type: 'text', max: 80, placeholder: 'Tuesday & Thursday' },
      { name: 'time', label: 'Time', type: 'text', max: 80, placeholder: '6:00 PM - 8:00 PM' },
      { name: 'location', label: 'Location', type: 'text', max: 160 },
    ],
  },

  events: {
    label: 'Events',
    itemLabel: 'event',
    path: 'data/events.json',
    page: '/events/',
    pageLabel: 'Events page',
    intro: 'Events show on the Events page. Turn on "Show in the homepage banner" to feature one at the top of the homepage.',
    sortBy: 'dateISO',
    maxItems: 100,
    summary: ['title', 'dateISO'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, max: 140 },
      {
        name: 'tag', label: 'Type', type: 'select', default: 'Camp',
        options: ['Tryouts', 'Camp', 'Academy', 'Open Gym', 'Clinic', 'Team Event'].map((v) => ({ value: v, label: v })),
      },
      { name: 'dateISO', label: 'Start date', type: 'date', required: true },
      { name: 'endISO', label: 'End date', type: 'date', help: 'Only for events that run over several days.' },
      { name: 'dateDisplay', label: 'Date as written', type: 'text', max: 120, placeholder: 'Sunday, November 8, 2026' },
      { name: 'time', label: 'Time', type: 'text', max: 200, placeholder: '9:00 AM – 12:00 PM' },
      { name: 'location', label: 'Location', type: 'text', max: 160 },
      { name: 'description', label: 'Description', type: 'textarea', max: 3000 },
      { name: 'registerUrl', label: 'Registration link', type: 'url', help: 'Leave blank if there\'s no registration yet.' },
      { name: 'registerLabel', label: 'Button text', type: 'text', max: 40, default: 'Register Now →' },
      { name: 'pinBanner', label: 'Show in the homepage banner', type: 'toggle' },
      { name: 'bannerTitle', label: 'Banner title', type: 'text', max: 80, help: 'Short title for the homepage banner. Leave blank to use the event title.', advanced: true },
      { name: 'dateRange', label: 'Date range line', type: 'text', max: 160, placeholder: 'Sundays — Sept 13, 20 & 27', advanced: true },
      { name: 'schedule', label: 'Schedule', type: 'lines', maxLines: 20, max: 200, help: 'One line per session.', advanced: true },
      { name: 'expect', label: 'What to expect', type: 'lines', maxLines: 20, max: 200, help: 'One line per item.', advanced: true },
      { name: 'notes', label: 'Notes', type: 'text', max: 300, help: 'Price, ages, or a contact line.', advanced: true },
      { name: 'comingSoon', label: 'Details coming soon', type: 'toggle', help: 'Shows a "details coming soon" note instead of the full details.', advanced: true },
      { name: 'id', label: 'Link name', type: 'text', max: 80, help: 'Short name used in links. Leave blank to build it from the title.', advanced: true },
    ],
  },
};

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
}

// Cleans one object against a list of fields. `options` maps optionsFrom
// names to the allowed values. Returns { item } or { error }.
function cleanFields(fields, raw, which, options) {
  const out = {};
  raw = raw && typeof raw === 'object' ? raw : {};
  for (const f of fields) {
    let v = raw[f.name];
    const allowed = () => [...(f.options || []).map((o) => o.value), ...((f.optionsFrom && options[f.optionsFrom]) || [])];

    if (f.type === 'toggle') { out[f.name] = v === true; continue; }

    if (f.type === 'checkboxes') {
      const ok = allowed();
      v = (Array.isArray(v) ? v : []).map(String).filter((x) => ok.includes(x));
      if (f.required && !v.length) return { error: `Pick at least one option for "${f.label}" on ${which}.` };
      out[f.name] = [...new Set(v)];
      continue;
    }

    if (f.type === 'lines') {
      v = (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
      if (v.length > f.maxLines) return { error: `"${f.label}" on ${which} has more than ${f.maxLines} lines.` };
      if (v.some((x) => x.length > f.max)) return { error: `A line in "${f.label}" on ${which} is too long.` };
      out[f.name] = v;
      continue;
    }

    if (f.type === 'list') {
      const rows = Array.isArray(v) ? v : [];
      if (rows.length > f.max) return { error: `"${f.label}" on ${which} has more than ${f.max} ${f.itemLabel}s.` };
      const cleanedRows = [];
      for (let i = 0; i < rows.length; i++) {
        const result = cleanFields(f.fields, rows[i], `${f.itemLabel} #${i + 1} in "${f.label}" on ${which}`, options);
        if (result.error) return result;
        cleanedRows.push(result.item);
      }
      out[f.name] = cleanedRows;
      continue;
    }

    v = v == null ? '' : String(v).trim();
    if (!v && f.required) return { error: `"${f.label}" is required on ${which}.` };
    if (f.max && v.length > f.max) return { error: `"${f.label}" on ${which} is too long (${f.max} characters max).` };
    if (v && f.type === 'date' && !DATE_RE.test(v)) return { error: `"${f.label}" on ${which} isn't a valid date.` };
    if (v && f.type === 'url' && (!/^https?:\/\/\S+$/i.test(v) || v.length > 500)) return { error: `"${f.label}" on ${which} needs to be a full web address starting with https://` };
    if (v && f.type === 'link' && (!/^(https?:\/\/\S+|\/[^\s]*|mailto:\S+|tel:\S+)$/i.test(v) || v.length > 500)) return { error: `"${f.label}" on ${which} needs to be a page like /contact/ or a full web address.` };
    if (v && f.type === 'select' && !allowed().includes(v)) return { error: `Pick a valid "${f.label}" on ${which}.` };
    if (!v && f.type === 'select' && f.default) v = f.default;
    if (f.type === 'photo') {
      if (v && !PHOTO_RE.test(v)) return { error: `The photo on ${which} couldn't be saved. Try choosing it again.` };
      out[f.name] = v;
      if (f.crop) {
        out[f.name + 'X'] = clampNumber(raw[f.name + 'X'], 0, 100, 50);
        out[f.name + 'Y'] = clampNumber(raw[f.name + 'Y'], 0, 100, f.frame === 'circle' ? 20 : 30);
        out[f.name + 'Zoom'] = clampNumber(raw[f.name + 'Zoom'], 1, 4, 1);
      }
      continue;
    }
    out[f.name] = v;
  }
  return { item: out };
}

// Returns { items } or { error } with a message the dashboard can show as-is.
function cleanItems(type, items, options = {}) {
  const schema = SCHEMAS[type];
  if (!schema) return { error: 'Unknown section.' };
  if (!Array.isArray(items)) return { error: 'Nothing to save.' };
  if (items.length > schema.maxItems) return { error: `That's more than ${schema.maxItems} ${schema.itemLabel}s.` };

  const cleaned = [];
  for (let i = 0; i < items.length; i++) {
    const result = cleanFields(schema.fields, items[i], `${schema.itemLabel} #${i + 1}`, options);
    if (result.error) return result;
    const out = result.item;
    const which = `${schema.itemLabel} #${i + 1}`;
    if (type === 'events') out.id = slug(out.id);
    if (type === 'coaches') out.id = slug(out.id) || slug(out.name);
    if (type === 'teams') {
      out.slug = slug(out.slug);
      if (!SLUG_RE.test(out.slug)) return { error: `"Web address name" on ${which} needs letters or numbers, like 16-1.` };
    }
    if (type === 'tournaments' && out.end && out.end < out.start) return { error: `The end date is before the start date on ${which}.` };
    if (type === 'events' && out.endISO && out.endISO < out.dateISO) return { error: `The end date is before the start date on ${which}.` };
    cleaned.push(out);
  }

  if (schema.idField) {
    const seen = new Map();
    for (const item of cleaned) {
      const key = item[schema.idField];
      if (seen.has(key)) {
        return { error: `Two ${schema.itemLabel}s share the same ${schema.idField === 'slug' ? 'web address name' : 'link name'} ("${key}"). Change one of them.` };
      }
      seen.set(key, true);
    }
  }
  if (schema.sortBy) cleaned.sort((a, b) => String(a[schema.sortBy]).localeCompare(String(b[schema.sortBy])));
  return { items: cleaned };
}

// optionsFrom sources each schema depends on.
function dependencies(type) {
  const found = new Set();
  const walk = (fields) => fields.forEach((f) => { if (f.optionsFrom) found.add(f.optionsFrom); if (f.fields) walk(f.fields); });
  walk(SCHEMAS[type].fields);
  return [...found];
}

// Allowed values for an optionsFrom source, given that section's items.
function optionValues(source, items) {
  if (source === 'coaches') return items.map((c) => slug(c.id) || slug(c.name)).filter(Boolean);
  if (source === 'teams') return items.map((t) => slug(t.slug)).filter(Boolean);
  return [];
}

// What the browser needs to build the forms (no file paths).
function publicSchemas() {
  const out = {};
  for (const [key, s] of Object.entries(SCHEMAS)) {
    out[key] = {
      label: s.label, itemLabel: s.itemLabel, page: s.page, pageLabel: s.pageLabel, intro: s.intro,
      ordered: !!s.ordered, sortBy: s.sortBy || null, maxItems: s.maxItems, summary: s.summary, fields: s.fields,
    };
  }
  return out;
}

module.exports = { SCHEMAS, cleanItems, publicSchemas, dependencies, optionValues, slug };
