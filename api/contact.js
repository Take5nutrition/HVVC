const {
  escapeHtml,
  verifyChallenge,
  turnstileEnabled,
  verifyTurnstile,
  getClientIp,
  isRateLimited,
  hasValidOrigin,
  looksLikeSpam,
} = require('./_antispam');
const { build: buildAutoReply } = require('../js/autoreply-email.js');

// Keep in sync with the options in contact/index.html.
const EXPERIENCE_OPTIONS = ['New to volleyball', 'Rec Experience', 'Club Experience'];
const PROGRAM_OPTIONS = ['Academy / Recreation', 'Pre-Club Season Open Gyms', 'Club Team Player'];

const CLUB_INBOX = 'Hvvc@Hvvcvolleyballclub.com';
const REPLY_TO = 'hvvc@hvvcvolleyballclub.com';

// The auto-reply is edited in the dashboard (Auto-reply tab).
const DEFAULT_REPLY = {
  subject: 'Thank you for contacting Happy Valley Volleyball Club',
  message: 'Thank you for reaching out to Happy Valley Volleyball Club! Your message is important to us, and we will get back to you as soon as possible.',
  announcements: [],
  closing: 'See You on The Court!\n~ Happy Valley Volleyball Club',
  showCopy: true,
};
function autoReply() {
  try {
    const data = require('../data/autoreply.json');
    return {
      subject: String(data.subject || '').trim() || DEFAULT_REPLY.subject,
      message: String(data.message || '').trim() || DEFAULT_REPLY.message,
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      closing: String(data.closing || '').trim(),
      showCopy: data.showCopy !== false,
    };
  } catch {
    return DEFAULT_REPLY;
  }
}

function formatDob(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Logs which check failed (never the family's details) so problems show in Vercel logs.
function badRequest(res, error, message) {
  console.log('Contact form: invalid', { reason: error });
  return res.status(400).json({ error, message });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // On the preview site both emails go only to the person testing the form,
  // so trying it out never lands in the club inbox.
  const isPreview = process.env.VERCEL_ENV === 'preview';

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { name, email, phone, message, hp_ref_code, captchaToken, captchaAnswer } = body;

  // --- Layer 1: honeypot. Real people never see this field, so anything in it
  // is a bot. Answer 200 so the sender thinks it worked and moves on. ---
  if (hp_ref_code) {
    console.log('Contact form: honeypot triggered', { ip: getClientIp(req) });
    return res.status(200).json({ success: true });
  }

  // --- Layer 2: the POST has to come from our own pages. ---
  if (!hasValidOrigin(req)) {
    console.log('Contact form: bad origin', { origin: req.headers.origin, referer: req.headers.referer });
    return res.status(403).json({ error: 'Forbidden' });
  }

  // --- Layer 3: human verification. Cloudflare Turnstile when it is
  // configured, otherwise the built-in signed math challenge. ---
  if (turnstileEnabled()) {
    const turnstileError = await verifyTurnstile(captchaToken, getClientIp(req));
    if (turnstileError) {
      console.log('Contact form: turnstile failed', { reason: turnstileError, ip: getClientIp(req) });
      return res.status(400).json({
        error: 'verification',
        message: turnstileError === 'expired'
          ? 'Your verification timed out. Please complete the check again and resend.'
          : "We couldn't verify you as human. Please complete the check and try again.",
      });
    }
  } else {
    const challengeError = verifyChallenge(captchaToken, captchaAnswer);
    if (challengeError) {
      console.log('Contact form: verification failed', { reason: challengeError, ip: getClientIp(req) });
      return res.status(400).json({
        error: 'verification',
        message: challengeError === 'wrong'
          ? "That answer wasn't right. Please try the new question."
          : challengeError === 'too-fast'
            ? 'That was a little too quick. Please answer the new question and send again.'
            : 'Your verification expired. Please answer the new question and resend.',
      });
    }
  }

  if (!name || !email || !message) {
    return badRequest(res, 'missing', 'Please fill in your name, email address, and message.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || String(email).length > 254) {
    return badRequest(res, 'email', 'Please check your email address.');
  }

  // Player details are required unless the sender said the message isn't
  // about a player.
  const aboutPlayer = !body.notAboutPlayer;
  let player = null;
  if (aboutPlayer) {
    const playerName = String(body.playerName || '').trim();
    const age = Number(body.playerAge);
    const dob = String(body.playerDob || '').trim();
    const experience = String(body.playerExperience || '');
    const programs = (Array.isArray(body.programInterest) ? body.programInterest : [body.programInterest])
      .map(String).filter((p) => PROGRAM_OPTIONS.includes(p));

    if (!playerName || playerName.length > 100) return badRequest(res, 'player-name', "Please enter the player's name.");
    if (!Number.isInteger(age) || age < 5 || age > 19) return badRequest(res, 'player-age', 'Please enter a player age between 5 and 19.');
    const dobDate = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(dob + 'T00:00:00Z') : null;
    const years = dobDate ? (Date.now() - dobDate.getTime()) / (365.25 * 24 * 3600 * 1000) : NaN;
    if (!dobDate || Number.isNaN(dobDate.getTime()) || years < 3 || years > 21) {
      return badRequest(res, 'player-dob', "Please check the player's date of birth.");
    }
    if (!EXPERIENCE_OPTIONS.includes(experience)) return badRequest(res, 'player-experience', "Please choose the player's experience.");
    if (!programs.length) return badRequest(res, 'program-interest', 'Please check at least one program.');
    player = { name: playerName, age, dob, experience, programs: [...new Set(programs)] };
  }

  // --- Layer 4: content heuristics. ---
  const topic = player ? player.programs.join(', ') : 'General question';
  const spamReason = looksLikeSpam({ name, email, phone, subject: topic, message });
  if (spamReason) {
    console.log('Contact form: content rejected', { reason: spamReason, ip: getClientIp(req) });
    return res.status(200).json({ success: true });
  }

  // --- Layer 5: per-IP rate limit. ---
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    console.log('Contact form: rate limited', { ip });
    return res.status(429).json({
      error: 'rate-limit',
      message: "You've sent a few messages already. Please give us a little time to reply.",
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  // Everything below lands inside HTML email, so escape it all.
  const row = (label, value) => `<tr><td style="padding:8px 12px 8px 0;color:#555;width:150px;vertical-align:top;"><strong>${label}</strong></td><td style="padding:8px 0;">${value}</td></tr>`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);
  const detailRows = [
    row('Name', safeName),
    row('Email', `<a href="mailto:${safeEmail}" style="color:#7b3fe4;">${safeEmail}</a>`),
    phone ? row('Phone', escapeHtml(phone)) : '',
    ...(player
      ? [
        row('Player Name', escapeHtml(player.name)),
        row('Player Age', String(player.age)),
        row('Date of Birth', escapeHtml(formatDob(player.dob))),
        row('Experience', escapeHtml(player.experience)),
        row('Program Interest', escapeHtml(player.programs.join(', '))),
      ]
      : [row('About', 'Not about a player')]),
  ].join('');

  // Program and player in the subject line make the inbox easy to sort.
  const clubSubject = player
    ? `Contact: ${player.programs.join(' + ')} — ${name} (${player.name}, ${player.age})`
    : `Contact: General question — ${name}`;
  const reply = autoReply();
  const previewTag = isPreview ? '[Preview] ' : '';

  const clubEmail = {
    from: 'HVVC Contact Form <noreply@hvvcvolleyballclub.com>',
    to: isPreview ? [email] : [CLUB_INBOX],
    reply_to: email,
    subject: previewTag + clubSubject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        ${isPreview ? '<p style="background:#fff4d6;border:1px solid #f0d58a;border-radius:8px;padding:10px 12px;font-size:13px;color:#6b5200;">Preview test: on the live site this message goes to the HVVC inbox.</p>' : ''}
        <h2 style="color:#7b3fe4;margin-bottom:4px;">New Contact Form Submission</h2>
        <p style="color:#888;margin-top:0;font-size:14px;">Happy Valley Volleyball Club</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <table style="width:100%;border-collapse:collapse;font-size:15px;">${detailRows}</table>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#555;font-size:14px;margin-bottom:6px;"><strong>Message</strong></p>
        <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#aaa;font-size:12px;">Reply directly to this email to respond to ${safeName}.</p>
      </div>
    `,
  };

  const copy = reply.showCopy
    ? `<div style="border-top:1px solid #eeeeee;margin:8px 0 18px;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
        <p style="font-family:Arial,Helvetica,sans-serif;color:#888888;font-size:13px;margin:0 0 8px;">For your records, here's what you sent:</p>
        <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#555555;">${detailRows}</table>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#555555;white-space:pre-wrap;">${safeMessage}</p>`
    : '';
  const branded = buildAutoReply(reply, { copyHtml: copy });
  const autoReplyEmail = {
    from: 'Happy Valley Volleyball Club <noreply@hvvcvolleyballclub.com>',
    to: [email],
    reply_to: REPLY_TO,
    subject: previewTag + reply.subject,
    html: branded.html,
    text: branded.text,
  };

  try {
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([clubEmail, autoReplyEmail]),
    });

    const resendBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Resend error:', resendBody);
      return res.status(500).json({ error: 'Resend failed', message: 'Your message could not be sent. Please try again, or email hvvc@hvvcvolleyballclub.com.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'send-failed', message: 'Your message could not be sent. Please try again, or email hvvc@hvvcvolleyballclub.com.' });
  }
};
