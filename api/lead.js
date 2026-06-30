module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
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
        from: 'HVVC Receptionist <noreply@hvvcvolleyballclub.com>',
        to: ['Hvvc@Hvvcvolleyballclub.com'],
        subject: `New Receptionist Lead: ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#7b3fe4;margin-bottom:4px;">New Chat Lead</h2>
            <p style="color:#888;margin-top:0;font-size:14px;">Someone started a conversation with the HVVC Receptionist</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:15px;color:#555;">Email: <a href="mailto:${email}" style="color:#7b3fe4;">${email}</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="color:#aaa;font-size:12px;">Reply to this email to follow up with them directly.</p>
          </div>
        `,
        reply_to: email,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Resend lead error:', error);
      return res.status(500).json({ error: 'Failed to send', detail: error });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Lead handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
