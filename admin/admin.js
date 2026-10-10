// HVVC Dashboard — edits data/*.json through /api/admin, which commits to
// GitHub; Vercel then publishes the site. Forms are built from the field
// definitions in api/_content-schema.js.
(function () {
  const TAB_ORDER = ['coaches', 'tournaments', 'practices', 'events'];
  const POLL_MS = 4000;
  const POLL_LIMIT = 60;
  const PHOTO_MAX_EDGE = 900;
  const CHEVRON = '<svg class="card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

  const app = document.getElementById('app');
  const saveBar = document.getElementById('saveBar');
  const saveBarText = document.getElementById('saveBarText');
  const saveButton = document.getElementById('saveButton');
  const discardButton = document.getElementById('discardButton');
  const topbarActions = document.getElementById('topbarActions');

  const state = {
    schemas: null,
    tab: 'coaches',
    sections: {},
    open: new Set(),
    errors: {},
    uploads: new Map(),
    publishedPhotos: new Map(),
    notice: null,
    saving: false,
    pollToken: 0,
  };
  let keyCounter = 0;

  // ---------- helpers ----------
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : String(child));
    }
    return el;
  }

  function svg(markup) {
    const wrap = document.createElement('span');
    wrap.innerHTML = markup;
    return wrap.firstChild;
  }

  function randomId() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
  }

  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  }

  async function api(action, options = {}) {
    const params = new URLSearchParams({ action, ...(options.query || {}) });
    const headers = { 'X-HVVC-Dashboard': '1' };
    if (options.body) headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/admin?' + params, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401 && action !== 'login') {
      showLogin('Your session ended. Please log in again.');
      const err = new Error('logged out');
      err.loggedOut = true;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(data.error || 'Something went wrong. Please try again.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---------- section data ----------
  function schema(type) { return state.schemas[type]; }
  function section(type) { return state.sections[type || state.tab]; }

  function withKey(item) { return { ...item, _key: 'k' + (++keyCounter) }; }
  function stripKeys(items) { return items.map(({ _key, _new, ...rest }) => rest); }
  function snapshot(items) { return JSON.stringify(stripKeys(items)); }

  function isDirty(type) {
    const s = section(type);
    return Boolean(s && s.loaded && snapshot(s.items) !== s.original);
  }

  function anyDirty() { return Object.keys(state.sections).some((t) => isDirty(t)); }

  // Upcoming first (soonest at the top), then past ones, newest first.
  function displayOrder(type, items) {
    if (!schema(type).sortBy) return items;
    const key = schema(type).sortBy;
    const upcoming = items.filter((i) => !isPast(type, i)).sort((a, b) => String(a[key]).localeCompare(String(b[key])));
    const past = items.filter((i) => isPast(type, i)).sort((a, b) => String(b[key]).localeCompare(String(a[key])));
    return [...upcoming, ...past];
  }

  function blankItem(type) {
    const item = {};
    for (const f of schema(type).fields) {
      if (f.type === 'toggle') item[f.name] = false;
      else if (f.type === 'checkboxes' || f.type === 'lines') item[f.name] = [];
      else item[f.name] = f.default || '';
    }
    return item;
  }

  async function loadSection(type) {
    state.sections[type] = { loaded: false };
    render();
    try {
      const data = await api('content', { query: { type } });
      const items = displayOrder(type, data.items.map(withKey));
      state.sections[type] = { loaded: true, sha: data.sha, items, original: snapshot(items) };
    } catch (err) {
      if (err.loggedOut) return;
      state.sections[type] = { loaded: false, error: err.message };
    }
    render();
  }

  // ---------- validation ----------
  function validate(type, item) {
    const errors = {};
    for (const f of schema(type).fields) {
      const v = item[f.name];
      if (f.type === 'checkboxes') {
        if (f.required && !(v || []).length) errors[f.name] = 'Pick at least one.';
        continue;
      }
      if (f.type === 'toggle' || f.type === 'lines') continue;
      const value = String(v || '').trim();
      if (f.required && !value) errors[f.name] = 'This is required.';
      else if (value && f.type === 'url' && !/^https?:\/\/\S+$/i.test(value)) errors[f.name] = 'Start the link with https://';
      else if (value && f.max && value.length > f.max) errors[f.name] = `Keep this under ${f.max} characters.`;
    }
    const [start, end] = type === 'events' ? ['dateISO', 'endISO'] : ['start', 'end'];
    if (item[end] && item[start] && item[end] < item[start]) errors[end] = 'The end date is before the start date.';
    return errors;
  }

  // ---------- rendering ----------
  function setNotice(kind, parts) {
    state.notice = kind ? { kind, parts } : null;
  }

  function renderNotice() {
    if (!state.notice) return null;
    const { kind, parts } = state.notice;
    return h('div', { class: `notice notice--${kind}`, role: kind === 'error' ? 'alert' : 'status' },
      h('span', { class: 'notice__dot', 'aria-hidden': 'true' }),
      h('div', {}, parts));
  }

  function showLogin(message) {
    state.schemas = null;
    topbarActions.hidden = true;
    saveBar.hidden = true;
    renderLogin(message, true);
  }

  function renderLogin(message, configured) {
    const input = h('input', { class: 'input', type: 'password', id: 'password', autocomplete: 'current-password', required: true, disabled: !configured });
    const error = h('p', { class: 'field__error', role: 'alert', hidden: !message, text: message || '' });
    const button = h('button', { class: 'button button--primary', type: 'submit', disabled: !configured, text: 'Log in' });
    const form = h('form', {
      class: 'login',
      onsubmit: async (e) => {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Logging in…';
        error.hidden = true;
        try {
          await api('login', { method: 'POST', body: { password: input.value } });
          await startDashboard();
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
          button.disabled = false;
          button.textContent = 'Log in';
          input.select();
        }
      },
    },
    h('h1', { text: 'Welcome back' }),
    h('p', { text: configured ? 'Log in to update the HVVC website.' : 'The dashboard isn\'t finished being set up yet. Check back soon.' }),
    h('div', { class: 'field' }, h('label', { for: 'password', text: 'Password' }), input),
    error,
    button);
    app.replaceChildren(form);
    if (configured) input.focus();
  }

  function renderTabs() {
    return h('div', { class: 'tabs', role: 'tablist' }, TAB_ORDER.map((type) => h('button', {
      class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(state.tab === type),
      onclick: () => switchTab(type),
    }, schema(type).label)));
  }

  function summaryOf(type, item) {
    const s = schema(type);
    const fieldOf = (name) => s.fields.find((f) => f.name === name);
    const [primaryName, secondaryName] = s.summary;
    const primary = String(item[primaryName] || '').trim() || `New ${s.itemLabel}`;
    let secondary = item[secondaryName];
    if (fieldOf(secondaryName) && fieldOf(secondaryName).type === 'date') {
      const end = type === 'events' ? item.endISO : item.end;
      secondary = formatDate(secondary) + (end ? ' – ' + formatDate(end) : '');
    }
    if (type === 'tournaments' && (item.teams || []).length) {
      const labels = item.teams.map((t) => (fieldOf('teams').options.find((o) => o.value === t) || {}).label || t);
      secondary = [secondary, labels.join(', ')].filter(Boolean).join(' · ');
    }
    return { primary, secondary: String(secondary || '').trim() };
  }

  function isPast(type, item) {
    const s = schema(type);
    if (!s.sortBy) return false;
    const end = type === 'events' ? item.endISO : item.end;
    const last = end || item[s.sortBy];
    return Boolean(last) && last < todayIso();
  }

  function photoPreview(item, extraClass) {
    const value = item.photo || '';
    const frame = item.framing && item.framing !== 'headshot' ? ' frame-' + item.framing : '';
    const box = h('span', { class: `photo__preview${frame}${extraClass ? ' ' + extraClass : ''}`, 'aria-hidden': 'true' });
    const upload = value.startsWith('upload:') ? state.uploads.get(value.slice(7)) : null;
    const src = upload ? upload.dataUrl : state.publishedPhotos.get(value) || value;
    if (src) {
      const img = h('img', { src, alt: '' });
      img.addEventListener('error', () => { box.textContent = initials(item.name); });
      box.append(img);
    } else {
      box.textContent = initials(item.name);
    }
    return box;
  }

  function renderCard(type, item, index, items) {
    const s = schema(type);
    const open = state.open.has(item._key);
    const errors = state.errors[item._key] || {};
    const { primary, secondary } = summaryOf(type, item);
    const bodyId = 'body-' + item._key;
    const head = h('button', {
      class: 'card__head', type: 'button', 'aria-expanded': String(open), 'aria-controls': bodyId,
      onclick: () => { open ? state.open.delete(item._key) : state.open.add(item._key); render(); },
    },
    s.fields.some((f) => f.type === 'photo') ? photoPreview(item, 'thumb') : null,
    h('span', { class: 'card__text' },
      h('span', { class: 'card__title', text: primary }),
      secondary ? h('span', { class: 'card__sub', text: secondary }) : null),
    item._new ? h('span', { class: 'card__badge card__badge--new', text: 'New' }) : null,
    !item._new && isPast(type, item) ? h('span', { class: 'card__badge', text: 'Past' }) : null,
    svg(CHEVRON));

    const card = h('li', { class: `card${open ? ' card--open' : ''}${isPast(type, item) ? ' card--past' : ''}` }, head);
    if (!open) return card;

    const body = h('div', { class: 'card__body', id: bodyId });
    const basic = s.fields.filter((f) => !f.advanced);
    const advanced = s.fields.filter((f) => f.advanced);
    appendFields(body, type, item, basic, errors);
    if (advanced.length) {
      const more = h('details', { class: 'more' }, h('summary', { text: 'More options' }));
      appendFields(more, type, item, advanced, errors);
      if (advanced.some((f) => errors[f.name])) more.open = true;
      body.append(more);
    }

    const actions = h('div', { class: 'card__actions' });
    if (s.ordered) {
      actions.append(
        h('button', { class: 'button button--ghost button--small', type: 'button', disabled: index === 0, onclick: () => move(type, index, -1), text: '↑ Move up' }),
        h('button', { class: 'button button--ghost button--small', type: 'button', disabled: index === items.length - 1, onclick: () => move(type, index, 1), text: '↓ Move down' }));
    }
    actions.append(h('span', { class: 'spacer' }),
      h('button', { class: 'button button--danger button--small', type: 'button', onclick: () => removeItem(type, index), text: `Remove ${s.itemLabel}` }));
    body.append(actions);
    card.append(body);
    return card;
  }

  function appendFields(container, type, item, fields, errors) {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (f.type === 'date' && fields[i + 1] && fields[i + 1].type === 'date') {
        container.append(h('div', { class: 'field-row' }, renderField(type, item, f, errors), renderField(type, item, fields[i + 1], errors)));
        i++;
      } else {
        container.append(renderField(type, item, f, errors));
      }
    }
  }

  function renderField(type, item, f, errors) {
    const id = `f-${item._key}-${f.name}`;
    const error = errors[f.name];
    const label = h('label', { for: id }, f.label, f.required ? h('span', { class: 'field__required', text: 'required' }) : null);
    const help = f.help ? h('p', { class: 'field__help', id: id + '-help', text: f.help }) : null;
    const errorEl = error ? h('p', { class: 'field__error', text: error }) : null;
    const describedBy = [f.help ? id + '-help' : null].filter(Boolean).join(' ') || null;
    const set = (value) => { item[f.name] = value; changed(type, item); };

    if (f.type === 'toggle') {
      return h('div', { class: 'field' },
        h('label', { class: 'toggle' },
          h('input', { type: 'checkbox', id, checked: item[f.name] === true, onchange: (e) => set(e.target.checked) }),
          f.label),
        help);
    }

    if (f.type === 'checkboxes') {
      const values = new Set(item[f.name] || []);
      return h('fieldset', { class: 'field field--group', id },
        h('legend', { class: 'field__label' }, f.label, f.required ? h('span', { class: 'field__required', text: 'required' }) : null),
        h('div', { class: 'checks' }, f.options.map((o) => h('label', { class: 'check' },
          h('input', {
            type: 'checkbox', value: o.value, checked: values.has(o.value),
            onchange: (e) => {
              e.target.checked ? values.add(o.value) : values.delete(o.value);
              set(f.options.map((x) => x.value).filter((v) => values.has(v)));
            },
          }),
          o.label))),
        help, errorEl);
    }

    if (f.type === 'photo') {
      const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'photo__file', id, onchange: (e) => pickPhoto(type, item, e.target) });
      return h('div', { class: 'field' },
        h('span', { class: 'field__label', text: f.label }),
        h('div', { class: 'photo' },
          photoPreview(item),
          h('div', { class: 'photo__buttons' },
            fileInput,
            h('label', { for: id, class: 'button button--ghost button--small', role: 'button', tabindex: '0',
              onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } },
              text: item.photo ? 'Change photo' : 'Choose photo' }),
            item.photo ? h('button', { class: 'link-button', type: 'button', onclick: () => { set(''); render(); }, text: 'Remove photo' }) : null)),
        help, errorEl);
    }

    let control;
    const common = { id, class: error ? 'input input--invalid' : 'input', 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : null };
    if (f.type === 'textarea' || f.type === 'lines') {
      const value = f.type === 'lines' ? (item[f.name] || []).join('\n') : (item[f.name] || '');
      control = h('textarea', {
        ...common, class: `textarea${f.type === 'lines' ? ' textarea--short' : ''}${error ? ' input--invalid' : ''}`,
        maxlength: f.type === 'textarea' && f.max ? String(f.max) : null, value,
        oninput: (e) => set(f.type === 'lines' ? e.target.value.split('\n') : e.target.value),
      });
    } else if (f.type === 'select') {
      control = h('select', { ...common, class: 'select', onchange: (e) => { set(e.target.value); if (f.name === 'framing') render(); } },
        f.options.map((o) => h('option', { value: o.value, selected: (item[f.name] || f.default) === o.value, text: o.label })));
    } else {
      control = h('input', {
        ...common,
        type: f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text',
        inputmode: f.type === 'url' ? 'url' : null,
        placeholder: f.placeholder || (f.type === 'url' ? 'https://' : null),
        maxlength: f.max ? String(f.max) : null,
        value: item[f.name] || '',
        oninput: (e) => set(e.target.value),
        onchange: f.type === 'date' ? () => render() : null,
      });
    }
    return h('div', { class: 'field' }, label, control, help, errorEl);
  }

  function renderSection() {
    const type = state.tab;
    const s = schema(type);
    const data = section(type);
    const wrap = h('section', { 'aria-labelledby': 'section-title' });
    wrap.append(h('div', { class: 'section-head' },
      h('h1', { id: 'section-title', text: s.label }),
      h('p', {}, s.intro, ' ', h('a', { href: s.page, target: '_blank', rel: 'noopener', text: `View the ${s.pageLabel}` }))));

    if (!data || (!data.loaded && !data.error)) {
      wrap.append(h('p', { class: 'loading', text: 'Loading…' }));
      return wrap;
    }
    if (data.error) {
      wrap.append(h('div', { class: 'notice notice--error', role: 'alert' },
        h('span', { class: 'notice__dot', 'aria-hidden': 'true' }),
        h('div', {}, data.error, ' ', h('button', { class: 'link-button', type: 'button', onclick: () => loadSection(type), text: 'Try again' }))));
      return wrap;
    }

    wrap.append(h('button', { class: 'button button--add', type: 'button', onclick: () => addItem(type), disabled: data.items.length >= s.maxItems }, `+ Add ${s.itemLabel}`));
    if (!data.items.length) {
      wrap.append(h('p', { class: 'empty', text: `No ${s.itemLabel}s yet. Use the button above to add one.` }));
    } else {
      wrap.append(h('ul', { class: 'items' }, data.items.map((item, i, all) => renderCard(type, item, i, all))));
    }
    return wrap;
  }

  function render() {
    if (!state.schemas) return;
    const focused = document.activeElement && document.activeElement.id;
    app.replaceChildren(renderTabs(), renderNotice() || '', renderSection());
    if (focused) {
      const again = document.getElementById(focused);
      if (again) again.focus({ preventScroll: true });
    }
    updateSaveBar();
  }

  function updateSaveBar() {
    const dirty = isDirty(state.tab);
    saveBar.hidden = !dirty && !state.saving;
    saveBarText.textContent = state.saving ? 'Saving…' : `Unsaved changes to ${schema(state.tab).label}`;
    saveButton.disabled = state.saving;
    discardButton.disabled = state.saving;
    saveButton.textContent = state.saving ? 'Saving…' : 'Save & publish';
  }

  // ---------- edits ----------
  function changed(type, item) {
    if (state.errors[item._key]) {
      const now = validate(type, item);
      for (const name of Object.keys(state.errors[item._key])) {
        if (now[name]) continue;
        const el = document.getElementById(`f-${item._key}-${name}`);
        const field = el && el.closest('.field');
        if (field) {
          field.querySelectorAll('.field__error').forEach((e) => e.remove());
          field.querySelectorAll('.input--invalid').forEach((e) => { e.classList.remove('input--invalid'); e.removeAttribute('aria-invalid'); });
        }
      }
      state.errors[item._key] = now;
      if (!Object.keys(now).length) delete state.errors[item._key];
      if (!Object.keys(state.errors).length && state.notice && state.notice.validation) {
        setNotice(null);
        const notice = app.querySelector('.notice--error');
        if (notice) notice.remove();
      }
    }
    const card = document.querySelector(`[aria-controls="body-${item._key}"]`);
    if (card) {
      const { primary, secondary } = summaryOf(type, item);
      card.querySelector('.card__title').textContent = primary;
      const sub = card.querySelector('.card__sub');
      if (sub) sub.textContent = secondary;
      const thumb = card.querySelector('.thumb');
      if (thumb && !thumb.querySelector('img')) thumb.textContent = initials(item.name);
    }
    updateSaveBar();
  }

  function addItem(type) {
    const item = withKey(blankItem(type));
    item._new = true;
    section(type).items.unshift(item);
    state.open.add(item._key);
    render();
    const first = document.getElementById(`f-${item._key}-${schema(type).fields[0].name}`);
    if (first) first.focus();
  }

  function removeItem(type, index) {
    const item = section(type).items[index];
    const { primary } = summaryOf(type, item);
    if (!window.confirm(`Remove "${primary}"? It comes off the website when you save.`)) return;
    section(type).items.splice(index, 1);
    state.open.delete(item._key);
    delete state.errors[item._key];
    render();
  }

  function move(type, index, delta) {
    const items = section(type).items;
    const [item] = items.splice(index, 1);
    items.splice(index + delta, 0, item);
    render();
    const button = document.querySelector(`[aria-controls="body-${item._key}"]`);
    if (button) button.scrollIntoView({ block: 'nearest' });
  }

  async function resizePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('unreadable'));
        el.src = url;
      });
      const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function pickPhoto(type, item, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizePhoto(file);
      const id = randomId();
      state.uploads.set(id, { dataUrl, name: item.name || file.name.replace(/\.[^.]+$/, '') });
      item.photo = 'upload:' + id;
      changed(type, item);
      render();
    } catch {
      setNotice('error', ['That photo couldn\'t be opened. Try a JPG or PNG photo.']);
      render();
    }
  }

  // ---------- save / discard / tabs ----------
  async function save() {
    const type = state.tab;
    const s = schema(type);
    const data = section(type);
    state.errors = {};
    let firstBad = null;
    for (const item of data.items) {
      const errs = validate(type, item);
      if (Object.keys(errs).length) {
        state.errors[item._key] = errs;
        state.open.add(item._key);
        firstBad = firstBad || item;
      }
    }
    if (firstBad) {
      setNotice('error', ['Some details need fixing before you can save. They\'re marked in red below.']);
      state.notice.validation = true;
      render();
      const field = document.querySelector('.input--invalid, .field__error');
      if (field) field.scrollIntoView({ block: 'center' });
      return;
    }

    const items = stripKeys(data.items).map((item) => {
      const out = { ...item };
      for (const f of s.fields) {
        if (f.type === 'lines') out[f.name] = (out[f.name] || []).map((x) => String(x).trim()).filter(Boolean);
      }
      return out;
    });
    const uploads = [];
    for (const item of items) {
      if (typeof item.photo === 'string' && item.photo.startsWith('upload:')) {
        const id = item.photo.slice(7);
        const upload = state.uploads.get(id);
        if (upload) uploads.push({ id, dataUrl: upload.dataUrl, name: upload.name });
      }
    }

    state.saving = true;
    setNotice(null);
    render();
    try {
      const result = await api('save', { method: 'POST', body: { type, sha: data.sha, items, uploads } });
      const fresh = displayOrder(type, result.items.map(withKey));
      state.sections[type] = { loaded: true, sha: result.sha, items: fresh, original: snapshot(fresh) };
      uploads.forEach((u) => {
        const path = (result.photos || {})['upload:' + u.id];
        if (path) state.publishedPhotos.set(path, u.dataUrl);
        state.uploads.delete(u.id);
      });
      state.open.clear();
      state.saving = false;
      watchDeploy(result.commit, s);
    } catch (err) {
      state.saving = false;
      if (err.loggedOut) return;
      setNotice('error', [err.message, err.status === 409 ? h('button', { class: 'link-button', type: 'button', onclick: () => location.reload(), text: 'Reload now' }) : null]);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function watchDeploy(commit, s) {
    const token = ++state.pollToken;
    setNotice('working', ['Saved! Publishing to the website now. This usually takes about a minute.']);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let tries = 0;
    const poll = async () => {
      if (token !== state.pollToken) return;
      tries++;
      let result = 'pending';
      try { result = (await api('status', { query: { commit } })).state; } catch (err) { if (err.loggedOut) return; }
      if (token !== state.pollToken) return;
      if (result === 'live') {
        setNotice('success', ['Your changes are live on the website. ', h('a', { href: s.page, target: '_blank', rel: 'noopener', text: `View the ${s.pageLabel}` })]);
        render();
      } else if (result === 'failed' || tries >= POLL_LIMIT) {
        setNotice('error', [result === 'failed'
          ? 'Your changes were saved, but the website didn\'t finish publishing. Let Tatum know so the update can be retried.'
          : 'Your changes were saved. The website is taking longer than usual to update. Check it again in a few minutes.']);
        render();
      } else {
        setTimeout(poll, POLL_MS);
      }
    };
    setTimeout(poll, POLL_MS);
  }

  function discard() {
    if (!window.confirm('Throw away your unsaved changes?')) return;
    const data = section();
    data.items = JSON.parse(data.original).map(withKey);
    state.errors = {};
    state.open.clear();
    setNotice(null);
    render();
  }

  function switchTab(type) {
    if (type === state.tab) return;
    if (isDirty(state.tab)) {
      if (!window.confirm(`You have unsaved changes to ${schema(state.tab).label}. Leave without saving?`)) return;
      const data = section();
      data.items = JSON.parse(data.original).map(withKey);
    }
    state.tab = type;
    state.errors = {};
    state.open.clear();
    if (state.notice && state.notice.kind === 'error') setNotice(null);
    try { sessionStorage.setItem('hvvc-dashboard-tab', type); } catch { /* storage unavailable */ }
    if (!section(type) || (!section(type).loaded && !section(type).error)) loadSection(type);
    else render();
  }

  async function startDashboard() {
    const data = await api('schemas');
    state.schemas = data.schemas;
    topbarActions.hidden = false;
    try {
      const saved = sessionStorage.getItem('hvvc-dashboard-tab');
      if (TAB_ORDER.includes(saved)) state.tab = saved;
    } catch { /* storage unavailable */ }
    await loadSection(state.tab);
  }

  saveButton.addEventListener('click', save);
  discardButton.addEventListener('click', discard);
  document.getElementById('logoutButton').addEventListener('click', async () => {
    if (anyDirty() && !window.confirm('You have unsaved changes. Log out anyway?')) return;
    try { await api('logout', { method: 'POST' }); } catch { /* signing out locally anyway */ }
    state.sections = {};
    showLogin('');
  });
  window.addEventListener('beforeunload', (e) => {
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  (async function init() {
    try {
      const session = await api('session');
      if (session.loggedIn) await startDashboard();
      else renderLogin('', session.configured);
    } catch (err) {
      if (!err.loggedOut) app.replaceChildren(h('div', { class: 'notice notice--error', role: 'alert' }, h('div', {}, 'The dashboard couldn\'t load. Check your internet connection and refresh the page.')));
    }
  })();
})();
