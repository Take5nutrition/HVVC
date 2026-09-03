const { makeChallenge } = require('./_antispam');

// Issues a fresh human-verification question for the contact form.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json(makeChallenge());
};
