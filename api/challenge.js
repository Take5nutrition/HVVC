const { makeChallenge, turnstileEnabled, turnstileSiteKey } = require('./_antispam');

// Tells the contact form which human check to render. Turnstile whenever its
// keys are configured, otherwise the built-in math question.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (turnstileEnabled()) {
    return res.status(200).json({ mode: 'turnstile', siteKey: turnstileSiteKey() });
  }

  return res.status(200).json(Object.assign({ mode: 'math' }, makeChallenge()));
};
