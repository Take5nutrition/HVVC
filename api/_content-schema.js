// Content the dashboard can edit. The dashboard builds its forms from these
// definitions, and api/admin.js validates every save against them, so a
// field added here appears in the form and is kept when saving.

const TEAMS = [
  { value: 'all', label: 'All teams' },
  { value: '16-1', label: '16-1' },
  { value: '16-2', label: '16-2' },
  { value: '14-1', label: '14-1' },
  { value: '14-2', label: '14-2' },
  { value: '12-1', label: '12-1' },
  { value: '12-2', label: '12-2' },
  { value: '10u', label: '10U' },
];

const SCHEMAS = {
  coaches: {
    label: 'Coaches',
    itemLabel: 'coach',
    path: 'data/coaches.json',
    page: '/coaches/',
    pageLabel: 'Staff page',
    intro: 'Coaches show on the Staff page in this order. Tap a coach to edit them.',
    ordered: true,
    maxItems: 60,
    summary: ['name', 'role'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Role', type: 'text', required: true, max: 80, placeholder: '16-1 Head Coach' },
      { name: 'photo', label: 'Photo', type: 'photo', help: 'Optional. Without a photo, their initials show in a pink circle.' },
      {
        name: 'framing', label: 'Photo framing', type: 'select', default: 'headshot',
        help: 'Full-length photos get zoomed in so the face fills the circle. Check the preview.',
        options: [
          { value: 'headshot', label: 'Close-up or headshot (no zoom)' },
          { value: 'full-high', label: 'Full-length photo, face near the top' },
          { value: 'full-middle', label: 'Full-length photo, face a little lower' },
          { value: 'full-low', label: 'Full-length photo, face lower still' },
        ],
      },
      { name: 'bio', label: 'Bio', type: 'textarea', max: 4000, help: 'Start each new paragraph on a new line.' },
    ],
  },

  tournaments: {
    label: 'Tournaments',
    itemLabel: 'tournament',
    path: 'data/tournaments.json',
    page: '/schedule/',
    pageLabel: 'Schedule page',
    intro: 'Tournaments show on the Schedule page and on each team\'s page. Past tournaments hide on their own.',
    sortBy: 'start',
    maxItems: 200,
    summary: ['name', 'start'],
    fields: [
      { name: 'name', label: 'Tournament name', type: 'text', required: true, max: 120 },
      { name: 'start', label: 'Start date', type: 'date', required: true },
      { name: 'end', label: 'End date', type: 'date', help: 'Leave blank for a one-day tournament.' },
      { name: 'teams', label: 'Teams playing', type: 'checkboxes', required: true, options: TEAMS },
      { name: 'location', label: 'Location', type: 'text', max: 160 },
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHOTO_RE = /^\/img\/[A-Za-z0-9._\/-]+\.(jpe?g|png|webp)$/i;

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Returns { items } or { error } with a message the dashboard can show as-is.
function cleanItems(type, items) {
  const schema = SCHEMAS[type];
  if (!schema) return { error: 'Unknown section.' };
  if (!Array.isArray(items)) return { error: 'Nothing to save.' };
  if (items.length > schema.maxItems) return { error: `That's more than ${schema.maxItems} ${schema.itemLabel}s.` };

  const cleaned = [];
  for (let i = 0; i < items.length; i++) {
    const raw = items[i] && typeof items[i] === 'object' ? items[i] : {};
    const out = {};
    const which = `${schema.itemLabel} #${i + 1}`;
    for (const f of schema.fields) {
      let v = raw[f.name];
      if (f.type === 'toggle') {
        out[f.name] = v === true;
        continue;
      }
      if (f.type === 'checkboxes') {
        const allowed = f.options.map((o) => o.value);
        v = (Array.isArray(v) ? v : []).filter((x) => allowed.includes(x));
        if (f.required && !v.length) return { error: `Pick at least one option for "${f.label}" on ${which}.` };
        out[f.name] = v;
        continue;
      }
      if (f.type === 'lines') {
        v = (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
        if (v.length > f.maxLines) return { error: `"${f.label}" on ${which} has more than ${f.maxLines} lines.` };
        if (v.some((x) => x.length > f.max)) return { error: `A line in "${f.label}" on ${which} is too long.` };
        out[f.name] = v;
        continue;
      }
      v = v == null ? '' : String(v).trim();
      if (!v && f.required) return { error: `"${f.label}" is required on ${which}.` };
      if (f.max && v.length > f.max) return { error: `"${f.label}" on ${which} is too long (${f.max} characters max).` };
      if (v && f.type === 'date' && !DATE_RE.test(v)) return { error: `"${f.label}" on ${which} isn't a valid date.` };
      if (v && f.type === 'url' && !/^https?:\/\/\S+$/i.test(v)) return { error: `"${f.label}" on ${which} needs to start with https://` };
      if (v && f.type === 'url' && v.length > 500) return { error: `"${f.label}" on ${which} is too long.` };
      if (v && f.type === 'photo' && !PHOTO_RE.test(v)) return { error: `The photo on ${which} couldn't be saved. Try choosing it again.` };
      if (v && f.type === 'select' && !f.options.some((o) => o.value === v)) return { error: `Pick a valid "${f.label}" on ${which}.` };
      if (!v && f.type === 'select') v = f.default;
      if (f.name === 'id') v = slug(v);
      out[f.name] = v;
    }
    if (type === 'tournaments' && out.end && out.end < out.start) return { error: `The end date is before the start date on ${which}.` };
    if (type === 'events' && out.endISO && out.endISO < out.dateISO) return { error: `The end date is before the start date on ${which}.` };
    cleaned.push(out);
  }
  if (schema.sortBy) cleaned.sort((a, b) => String(a[schema.sortBy]).localeCompare(String(b[schema.sortBy])));
  return { items: cleaned };
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

module.exports = { SCHEMAS, cleanItems, publicSchemas, slug };
