module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;

  // Manually parse body if Vercel didn't auto-parse it
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { name, email, phone, subject, message } = body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields', received: { name: !!name, email: !!email, message: !!message } });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
              <tr><td style="padding:8px 0;color:#555;width:120px;"><strong>Name</strong></td><td style="padding:8px 0;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#555;"><strong>Email</strong></td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#7b3fe4;">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding:8px 0;color:#555;"><strong>Phone</strong></td><td style="padding:8px 0;">${phone}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#555;"><strong>Subject</strong></td><td style="padding:8px 0;">${subject || 'General Question'}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="color:#555;font-size:14px;margin-bottom:6px;"><strong>Message</strong></p>
            <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${message}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="color:#aaa;font-size:12px;">Reply directly to this email to respond to ${name}.</p>
          </div>
        `,
      }),
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
