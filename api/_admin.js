const crypto = require('crypto');

const REPO = process.env.DASHBOARD_REPO || 'Take5nutrition/HVVC';
const BRANCH = process.env.DASHBOARD_BRANCH || 'main';
const GITHUB_API = 'https://api.github.com';
const COOKIE = 'hvvc_dashboard';
const SESSION_DAYS = 14;

const ALLOWED_HOSTS = [
  'dashboard.hvvcvolleyballclub.com',
  'hvvcvolleyballclub.com',
  'www.hvvcvolleyballclub.com',
  'localhost',
  '127.0.0.1',
];

function config() {
  return {
    password: process.env.DASHBOARD_PASSWORD || '',
    secret: process.env.DASHBOARD_SESSION_SECRET || '',
    token: process.env.GITHUB_TOKEN || '',
  };
}

function isConfigured() {
  const c = config();
  return Boolean(c.password && c.secret && c.token);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

// ---- Sessions: "<expiry>.<signature>", signed with the session secret and
// tied to the current password, so changing the password signs everyone out.
function sign(expiry) {
  const c = config();
  return crypto.createHmac('sha256', c.secret).update(`${expiry}:${sha256(c.password).toString('hex')}`).digest('hex');
}

function sessionCookie(req) {
  const header = req.headers.cookie || '';
  const match = header.split(/;\s*/).find((part) => part.startsWith(COOKIE + '='));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : '';
}

function isLoggedIn(req) {
  if (!isConfigured()) return false;
  const [expiry, signature] = sessionCookie(req).split('.');
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  return safeEqual(signature, sign(expiry));
}

function startSession(res) {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  res.setHeader('Set-Cookie', `${COOKIE}=${expiry}.${sign(expiry)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`);
}

function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

function checkPassword(attempt) {
  const c = config();
  return Boolean(c.password) && safeEqual(String(attempt || ''), c.password);
}

// ---- Login throttling (per server instance, best effort on serverless).
const failures = new Map(); // ip -> [timestamps]
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 6;

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? String(forwarded).split(',')[0] : req.socket && req.socket.remoteAddress || 'unknown').trim();
}

function tooManyFailures(ip) {
  const now = Date.now();
  const recent = (failures.get(ip) || []).filter((t) => now - t < LOCK_WINDOW_MS);
  failures.set(ip, recent);
  return recent.length >= MAX_FAILURES;
}

function recordFailure(ip) {
  const list = failures.get(ip) || [];
  list.push(Date.now());
  failures.set(ip, list);
}

// Writes must come from the dashboard itself: same-site origin plus a custom
// header that a cross-site form or image can't send.
function isTrustedWrite(req) {
  if (req.headers['x-hvvc-dashboard'] !== '1') return false;
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

// ---- GitHub
async function github(path, options = {}) {
  const res = await fetch(GITHUB_API + path, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config().token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hvvc-dashboard',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}: ${(data && data.message) || 'request failed'}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function readFile(path) {
  try {
    const file = await github(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
    return { sha: file.sha, text: Buffer.from(file.content, 'base64').toString('utf8') };
  } catch (err) {
    if (err.status === 404) return { sha: null, text: '' };
    throw err;
  }
}

// One commit containing every file, fast-forwarded onto the branch.
async function commitFiles(files, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = await github(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const parent = await github(`/repos/${REPO}/git/commits/${ref.object.sha}`);
    const tree = [];
    for (const file of files) {
      const blob = await github(`/repos/${REPO}/git/blobs`, {
        method: 'POST',
        body: { content: file.content, encoding: file.encoding || 'utf-8' },
      });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await github(`/repos/${REPO}/git/trees`, { method: 'POST', body: { base_tree: parent.tree.sha, tree } });
    const commit = await github(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: { message, tree: newTree.sha, parents: [ref.object.sha] },
    });
    try {
      await github(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
      return commit.sha;
    } catch (err) {
      if (err.status !== 422 || attempt === 1) throw err;
    }
  }
  throw new Error('Could not save after retrying.');
}

// Vercel reports each deploy back to GitHub as a commit status.
async function deployState(commitSha) {
  const status = await github(`/repos/${REPO}/commits/${commitSha}/status`);
  const vercel = (status.statuses || []).find((s) => /vercel/i.test(s.context));
  if (!vercel) return 'pending';
  if (vercel.state === 'success') return 'live';
  if (vercel.state === 'failure' || vercel.state === 'error') return 'failed';
  return 'pending';
}

module.exports = {
  isConfigured,
  isLoggedIn,
  startSession,
  endSession,
  checkPassword,
  clientIp,
  tooManyFailures,
  recordFailure,
  isTrustedWrite,
  readFile,
  commitFiles,
  deployState,
};
