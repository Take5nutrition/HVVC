const {
  escapeHtml,
  verifyChallenge,
  getClientIp,
  isRateLimited,
  hasValidOrigin,
  looksLikeSpam,
} = require('./_antispam');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;

  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { name, email, phone, subject, message, hp_ref_code, captchaToken, captchaAnswer } = body;

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

  // --- Layer 3: human verification (signed math challenge + fill timing). ---
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

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields', received: { name: !!name, email: !!email, message: !!message } });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || String(email).length > 254) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // --- Layer 4: content heuristics. ---
  const spamReason = looksLikeSpam({ name, email, phone, subject, message });
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
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeSubject = escapeHtml(subject || 'General Question');
  const safeMessage = escapeHtml(message);

  try {
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        // 1. Notification to HVVC staff
        {
          from: 'HVVC Contact Form <noreply@hvvcvolleyballclub.com>',
          to: ['Hvvc@Hvvcvolleyballclub.com'],
          reply_to: email,
          subject: `Contact: ${subject || 'General Question'} — ${name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#7b3fe4;margin-bottom:4px;">New Contact Form Submission</h2>
              <p style="color:#888;margin-top:0;font-size:14px;">Happy Valley Volleyball Club</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <table style="width:100%;border-collapse:collapse;font-size:15px;">
                <tr><td style="padding:8px 0;color:#555;width:120px;"><strong>Name</strong></td><td style="padding:8px 0;">${safeName}</td></tr>
                <tr><td style="padding:8px 0;color:#555;"><strong>Email</strong></td><td style="padding:8px 0;"><a href="mailto:${safeEmail}" style="color:#7b3fe4;">${safeEmail}</a></td></tr>
                ${phone ? `<tr><td style="padding:8px 0;color:#555;"><strong>Phone</strong></td><td style="padding:8px 0;">${safePhone}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#555;"><strong>Subject</strong></td><td style="padding:8px 0;">${safeSubject}</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <p style="color:#555;font-size:14px;margin-bottom:6px;"><strong>Message</strong></p>
              <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <p style="color:#aaa;font-size:12px;">Reply directly to this email to respond to ${safeName}.</p>
            </div>
          `,
        },
        // 2. Confirmation to the person who submitted
        {
          from: 'Happy Valley Volleyball Club <noreply@hvvcvolleyballclub.com>',
          to: [email],
          subject: `We received your message, ${name}!`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#7b3fe4;margin-bottom:4px;">Thanks for reaching out!</h2>
              <p style="color:#555;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
              <p style="color:#555;font-size:15px;line-height:1.6;">We got your message and will get back to you as soon as possible. Here's a copy of what you sent:</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <table style="width:100%;border-collapse:collapse;font-size:15px;">
                <tr><td style="padding:8px 0;color:#555;width:120px;"><strong>Subject</strong></td><td style="padding:8px 0;">${safeSubject}</td></tr>
              </table>
              <p style="font-size:15px;line-height:1.6;color:#555;white-space:pre-wrap;">${safeMessage}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
              <p style="color:#555;font-size:14px;">— The HVVC Team</p>
              <p style="color:#aaa;font-size:12px;">Happy Valley Volleyball Club &bull; Happy Valley, OR 97086</p>
            </div>
          `,
        },
      ]),
    });

    const resendBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Resend error:', resendBody);
      return res.status(500).json({ error: 'Resend failed', detail: resendBody });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
