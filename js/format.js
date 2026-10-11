// ========================================
// HVVC — simple text formatting for dashboard-written content
// Used by the FAQ page (browser) and the contact auto-reply email (api/).
//
//   **bold**                 → bold
//   [link text](address)     → link (https://…, /page/, or mailto:)
//   lines starting with • - * → bulleted list
//   lines with | between cells → table (first row is the header)
//   blank line                → new paragraph
// Everything is escaped first, so typed text can never inject HTML.
// ========================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HVVCFormat = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SITE = 'https://www.hvvcvolleyballclub.com';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function safeHref(url, absolute) {
    const u = String(url || '').trim();
    if (/^https?:\/\/\S+$/i.test(u) || /^mailto:\S+$/i.test(u) || /^tel:\S+$/i.test(u)) return u;
    if (/^\/\S*$/.test(u)) return absolute ? SITE + u : u;
    return '';
  }

  // Inline marks on one line of raw text.
  function inline(raw, opts) {
    const style = opts.styles || {};
    const attr = (name) => (style[name] ? ` style="${style[name]}"` : '');
    const tokens = [];
    const hold = (html) => `\u0000${tokens.push(html) - 1}\u0000`;

    let text = String(raw).replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const href = safeHref(url, opts.absoluteLinks);
      if (!href) return match;
      const external = /^https?:/i.test(href) && !href.startsWith(SITE);
      return hold(`<a href="${escapeHtml(href)}"${attr('a')}${external && !opts.email ? ' target="_blank" rel="noopener"' : ''}>${inlineMarks(escapeHtml(label), attr)}</a>`);
    });
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (email) => hold(`<a href="mailto:${escapeHtml(email)}"${attr('a')}>${escapeHtml(email)}</a>`));
    text = inlineMarks(escapeHtml(text), attr);
    return text.replace(/\u0000(\d+)\u0000/g, (m, i) => tokens[Number(i)]);
  }

  function inlineMarks(escaped, attr) {
    return escaped.replace(/\*\*(.+?)\*\*/g, (m, inner) => `<strong${attr('strong')}>${inner}</strong>`);
  }

  const BULLET = /^\s*(?:•|-|\*)\s+/;

  function block(lines, opts) {
    const style = opts.styles || {};
    const attr = (name) => (style[name] ? ` style="${style[name]}"` : '');
    if (lines.every((l) => BULLET.test(l))) {
      return `<ul${attr('ul')}>${lines.map((l) => `<li${attr('li')}>${inline(l.replace(BULLET, ''), opts)}</li>`).join('')}</ul>`;
    }
    if (lines.length > 1 && lines.every((l) => l.includes('|'))) {
      const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const [head, ...body] = lines.map(cells);
      return `<div class="fmt-table"${attr('tableWrap')}><table${attr('table')}><thead><tr>${head.map((c) => `<th${attr('th')}>${inline(c, opts)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td${attr('td')}>${inline(c, opts)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    // A paragraph that ends with bullets: split it so both render properly.
    const firstBullet = lines.findIndex((l) => BULLET.test(l));
    if (firstBullet > 0 && lines.slice(firstBullet).every((l) => BULLET.test(l))) {
      return block(lines.slice(0, firstBullet), opts) + block(lines.slice(firstBullet), opts);
    }
    return `<p${attr('p')}>${lines.map((l) => inline(l, opts)).join('<br>')}</p>`;
  }

  // Formats multi-paragraph text into HTML. Options: { styles, absoluteLinks, email }.
  function format(text, opts = {}) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .map((chunk) => chunk.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()))
      .filter((lines) => lines.length)
      .map((lines) => block(lines, opts))
      .join('');
  }

  // Plain-text version for email clients that don't show HTML.
  function plain(text) {
    return String(text || '')
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
        const href = safeHref(url, true);
        return href ? `${label} (${href.replace(/^mailto:/i, '')})` : m;
      })
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^\s*(?:-|\*)\s+/gm, '• ');
  }

  return { format, plain, inline: (t, o = {}) => inline(t, o), escapeHtml };
});
