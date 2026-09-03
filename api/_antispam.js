// Shared anti-spam helpers for the HVVC contact form.
// Files in /api prefixed with "_" are not routed as endpoints by Vercel.
const crypto = require('crypto');

// Signing key for challenge tokens. Set FORM_SECRET in Vercel for a dedicated
// key; otherwise we reuse the Resend key so nothing extra has to be configured.
const SECRET = process.env.FORM_SECRET || process.env.RESEND_API_KEY || 'hvvc-dev-secret';

const ALLOWED_HOSTS = [
  'hvvcvolleyballclub.com',
  'www.hvvcvolleyballclub.com',
  'localhost',
  '127.0.0.1',
];

// A challenge must sit on screen this long before an answer is believable,
// and expires after 30 minutes.
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 30 * 60 * 1000;

// Per-IP submission caps (per warm serverless instance).
const WINDOW_SHORT_MS = 15 * 60 * 1000;
const MAX_SHORT = 3;
const WINDOW_LONG_MS = 60 * 60 * 1000;
const MAX_LONG = 8;

const hits = new Map();      // ip -> [timestamps]
const usedTokens = new Map(); // signature -> expiry

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function sign(payload) {
  return b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
}

function answerHash(nonce, answer) {
  return b64url(crypto.createHmac('sha256', SECRET).update(`${nonce}:${String(answer).trim()}`).digest());
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

// Builds a stateless human-verification challenge. The answer never leaves the
// server in readable form - only an HMAC of it rides along in the token.
function makeChallenge() {
  const useWords = crypto.randomInt(0, 2) === 1;
  const subtract = crypto.randomInt(0, 2) === 1;

  let a, b, answer, question;
  if (subtract) {
    a = crypto.randomInt(5, 13);
    b = crypto.randomInt(1, a - 1);
    answer = a - b;
    question = useWords ? `${NUMBER_WORDS[a]} minus ${b}` : `${a} - ${b}`;
  } else {
    a = crypto.randomInt(1, 10);
    b = crypto.randomInt(1, 10);
    answer = a + b;
    question = useWords ? `${NUMBER_WORDS[a]} plus ${b}` : `${a} + ${b}`;
  }

  const nonce = b64url(crypto.randomBytes(12));
  const payload = b64url(JSON.stringify({ n: nonce, h: answerHash(nonce, answer), t: Date.now() }));

  return { question: `What is ${question}?`, token: `${payload}.${sign(payload)}` };
}

// Returns null when the answer checks out, otherwise a short reason string.
function verifyChallenge(token, answer) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return 'missing';

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return 'malformed';
  if (!timingSafeEqual(signature, sign(payload))) return 'tampered';

  let data;
  try { data = JSON.parse(unb64url(payload)); } catch { return 'malformed'; }
  if (!data || !data.n || !data.h || !data.t) return 'malformed';

  const age = Date.now() - data.t;
  if (age < MIN_FILL_MS) return 'too-fast';
  if (age > MAX_AGE_MS) return 'expired';

  // One token, one submission.
  const now = Date.now();
  for (const [sig, expiry] of usedTokens) {
    if (expiry < now) usedTokens.delete(sig);
  }
  if (usedTokens.has(signature)) return 'reused';

  if (!timingSafeEqual(data.h, answerHash(data.n, answer))) return 'wrong';

  usedTokens.set(signature, data.t + MAX_AGE_MS);
  return null;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// True when this IP has already submitted too often recently.
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_LONG_MS);

  if (recent.filter(t => now - t < WINDOW_SHORT_MS).length >= MAX_SHORT) return true;
  if (recent.length >= MAX_LONG) return true;

  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      if (!stamps.some(t => now - t < WINDOW_LONG_MS)) hits.delete(key);
    }
  }
  return false;
}

// Requests forged outside a browser usually carry neither header.
function hasValidOrigin(req) {
  const candidates = [req.headers.origin, req.headers.referer].filter(Boolean);
  if (!candidates.length) return false;

  return candidates.some(value => {
    try {
      const host = new URL(value).hostname;
      return ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app');
    } catch {
      return false;
    }
  });
}

const SPAM_PHRASES = [
  'seo service', 'seo expert', 'backlink', 'guest post', 'link building',
  'rank #1', 'rank number 1', 'first page of google', 'increase your traffic',
  'buy now', 'cheap price', 'viagra', 'cialis', 'casino', 'crypto invest',
  'bitcoin', 'forex', 'loan offer', 'work from home', 'make money online',
  'web design service', 'digital marketing agency', 'nude', 'escort',
];

// Returns null if the message looks human, otherwise a short reason string.
function looksLikeSpam({ name, email, phone, subject, message }) {
  const msg = String(message || '');
  const nm = String(name || '');
  const blob = `${nm} ${email || ''} ${phone || ''} ${subject || ''} ${msg}`.toLowerCase();

  if (nm.length > 100) return 'name-length';
  if (msg.trim().length < 2) return 'message-empty';
  if (msg.length > 5000) return 'message-length';

  if (/https?:\/\/|www\./i.test(nm)) return 'link-in-name';
  if (/\[url=|\[link=|<a\s+href/i.test(blob)) return 'markup';

  const links = (msg.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 3) return 'link-count';

  if (SPAM_PHRASES.some(phrase => blob.includes(phrase))) return 'phrase';

  // Cyrillic or CJK plus a link is a near-certain bot for a local youth club.
  if (links > 0 && /[Ѐ-ӿ一-鿿]/.test(msg)) return 'script-mix';

  return null;
}

module.exports = {
  escapeHtml,
  makeChallenge,
  verifyChallenge,
  getClientIp,
  isRateLimited,
  hasValidOrigin,
  looksLikeSpam,
};
