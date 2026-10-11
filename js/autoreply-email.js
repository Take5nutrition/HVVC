// ========================================
// HVVC — branded contact auto-reply email
// Built by api/contact.js when a family sends the contact form, and by the
// dashboard's Auto-reply preview, so the preview matches what gets sent.
// Content comes from data/autoreply.json (dashboard → Auto-reply tab).
// ========================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./format.js'));
  else root.HVVCAutoReply = factory(root.HVVCFormat);
})(typeof self !== 'undefined' ? self : this, function (fmt) {
  const SITE = 'https://www.hvvcvolleyballclub.com';
  const FONT = 'Arial, Helvetica, sans-serif';
  const PINK = '#ff2aa1';
  const PINK_DARK = '#d81b86';

  const STYLES = {
    p: `margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#333333;`,
    ul: 'margin:0 0 16px;padding-left:20px;',
    li: `margin:0 0 6px;font-family:${FONT};font-size:15px;line-height:1.6;color:#333333;`,
    a: `color:${PINK_DARK};font-weight:bold;`,
    strong: 'color:#111111;',
    table: `border-collapse:collapse;margin:0 0 16px;font-family:${FONT};font-size:14px;`,
    th: 'text-align:left;padding:6px 10px;background:#1f2329;color:#ffffff;',
    td: 'padding:6px 10px;border-bottom:1px solid #eeeeee;',
  };

  // Today's date (YYYY-MM-DD) for the club's time zone.
  function todayInOregon(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }

  // Announcements show through their "show until" date (inclusive).
  function activeAnnouncements(reply, today) {
    return (Array.isArray(reply.announcements) ? reply.announcements : [])
      .filter((a) => a && String(a.text || '').trim())
      .filter((a) => !a.showUntil || String(a.showUntil) >= today);
  }

  function html(text) {
    return fmt.format(text, { styles: STYLES, absoluteLinks: true, email: true });
  }

  // reply: { subject, message, announcements[], closing }
  // copyHtml: optional "here's what you sent" table, already escaped.
  function build(reply, { today = todayInOregon(), copyHtml = '' } = {}) {
    const announcements = activeAnnouncements(reply, today);
    const announcementHtml = announcements.map((a) =>
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:separate;"><tr><td style="background:#fff0f8;border-left:4px solid ${PINK};border-radius:6px;padding:14px 16px 0;">${html(a.text)}</td></tr></table>`).join('');

    const body = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${fmt.escapeHtml(reply.subject || '')}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="background:#f4f4f5;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:${PINK};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
      <tr><td align="center" bgcolor="#ffffff" style="padding:28px 24px 6px;background:#ffffff;">
        <a href="${SITE}/" style="text-decoration:none;"><img src="${SITE}/img/logo.png" width="120" height="101" alt="HVVC" style="display:block;border:0;width:120px;height:auto;"></a>
      </td></tr>
      <tr><td align="center" style="padding:0 24px 22px;font-family:${FONT};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Happy Valley Volleyball Club</td></tr>
      <tr><td style="padding:0 32px;"><div style="border-top:1px solid #eeeeee;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
      <tr><td style="padding:24px 32px 8px;">
        ${html(reply.message)}
        ${announcementHtml}
        ${html(reply.closing)}
      </td></tr>
      ${copyHtml ? `<tr><td style="padding:0 32px 24px;">${copyHtml}</td></tr>` : ''}
      <tr><td align="center" bgcolor="#111111" style="background:#111111;padding:22px 24px;font-family:${FONT};">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;">
          <a href="${SITE}/" style="color:#ffffff;text-decoration:none;font-weight:bold;">Website</a>
          <span style="color:#555555;">&nbsp;&bull;&nbsp;</span>
          <a href="${SITE}/faq/" style="color:#ffffff;text-decoration:none;font-weight:bold;">FAQ</a>
          <span style="color:#555555;">&nbsp;&bull;&nbsp;</span>
          <a href="https://instagram.com/hvvc_volleyball" style="color:#ffffff;text-decoration:none;font-weight:bold;">Instagram</a>
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">Happy Valley Volleyball Club &bull; Happy Valley, OR 97086<br>501(c)(3) Nonprofit Organization</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const text = [fmt.plain(reply.message), ...announcements.map((a) => fmt.plain(a.text)), fmt.plain(reply.closing)]
      .map((t) => String(t || '').trim()).filter(Boolean).join('\n\n')
      + '\n\nHappy Valley Volleyball Club • Happy Valley, OR 97086\n' + SITE + '/';

    return { subject: reply.subject, html: body, text, announcementsShown: announcements.length };
  }

  return { build, todayInOregon, activeAnnouncements };
});
