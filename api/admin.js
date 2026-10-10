const crypto = require('crypto');
const { SCHEMAS, cleanItems, publicSchemas, dependencies, optionValues, slug } = require('./_content-schema');
const {
  isConfigured, canSave, isLoggedIn, startSession, endSession, checkPassword,
  clientIp, tooManyFailures, recordFailure, isTrustedWrite,
  readFile, commitFiles, deployState,
} = require('./_admin');

const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;
const MAX_PHOTOS_PER_SAVE = 10;
const COMMIT_RE = /^[0-9a-f]{40}$/;

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body && typeof body === 'object' ? body : {};
}

// Same id GitHub gives the file, so the next save can detect edits made elsewhere.
function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function photoFromDataUrl(dataUrl) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) return null;
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  return match[1];
}

async function handleSave(body, res) {
  const type = String(body.type || '');
  const schema = SCHEMAS[type];
  if (!schema) return res.status(400).json({ error: 'Unknown section.' });

  const photoField = schema.fields.find((f) => f.type === 'photo');
  const uploads = Array.isArray(body.uploads) ? body.uploads.slice(0, MAX_PHOTOS_PER_SAVE + 1) : [];
  if (uploads.length > MAX_PHOTOS_PER_SAVE) {
    return res.status(400).json({ error: `Add at most ${MAX_PHOTOS_PER_SAVE} new photos at a time.` });
  }

  // New photos arrive as "upload:<id>" placeholders; give each a real path.
  const files = [];
  const photoPaths = {};
  for (const upload of uploads) {
    const id = String(upload && upload.id || '');
    const content = photoFromDataUrl(upload && upload.dataUrl);
    if (!/^[a-z0-9]{6,24}$/.test(id) || !content) {
      return res.status(400).json({ error: 'One of the photos couldn\'t be read. Try choosing it again.' });
    }
    const name = slug(upload.name || 'photo').slice(0, 40) || 'photo';
    const path = `img/uploads/${name}-${crypto.randomBytes(3).toString('hex')}.jpg`;
    photoPaths[`upload:${id}`] = '/' + path;
    files.push({ path, content, encoding: 'base64' });
  }

  let items = Array.isArray(body.items) ? body.items : null;
  if (items && photoField) {
    items = items.map((item) => {
      const value = item && item[photoField.name];
      if (typeof value === 'string' && value.startsWith('upload:')) {
        return { ...item, [photoField.name]: photoPaths[value] || '' };
      }
      return item;
    });
  }

  const options = {};
  for (const source of dependencies(type)) {
    const file = await readFile(SCHEMAS[source].path);
    let list = [];
    try { list = file.text ? JSON.parse(file.text) : []; } catch { list = []; }
    options[source] = optionValues(source, Array.isArray(list) ? list : []);
  }

  const result = cleanItems(type, items, options);
  if (result.error) return res.status(400).json({ error: result.error });

  const current = await readFile(schema.path);
  if ((body.sha || null) !== current.sha) {
    return res.status(409).json({
      error: 'This section was changed somewhere else since you opened it. Reload the page to get the latest version, then make your change again.',
    });
  }

  const json = JSON.stringify(result.items, null, 2) + '\n';
  files.push({ path: schema.path, content: json });
  const commit = await commitFiles(files, `Dashboard: update ${schema.label.toLowerCase()}`);
  return res.status(200).json({ commit, sha: gitBlobSha(json), items: result.items, photos: photoPaths });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex');
  const action = String((req.query && req.query.action) || '');

  try {
    if (req.method === 'GET' && action === 'session') {
      return res.status(200).json({ configured: isConfigured(), loggedIn: isLoggedIn(req), canSave: canSave() });
    }

    if (req.method === 'POST' && action === 'login') {
      if (!isTrustedWrite(req)) return res.status(403).json({ error: 'Forbidden' });
      if (!isConfigured()) return res.status(503).json({ error: 'The dashboard isn\'t set up yet.' });
      const ip = clientIp(req);
      if (tooManyFailures(ip)) {
        return res.status(429).json({ error: 'Too many tries. Wait 15 minutes and try again.' });
      }
      if (!checkPassword(parseBody(req).password)) {
        recordFailure(ip);
        await new Promise((r) => setTimeout(r, 600));
        return res.status(401).json({ error: 'That password didn\'t work.' });
      }
      startSession(res);
      return res.status(200).json({ loggedIn: true });
    }

    if (req.method === 'POST' && action === 'logout') {
      endSession(res);
      return res.status(200).json({ loggedIn: false });
    }

    if (!isLoggedIn(req)) return res.status(401).json({ error: 'Please log in again.' });

    if (req.method === 'GET' && action === 'schemas') {
      return res.status(200).json({ schemas: publicSchemas() });
    }

    if (req.method === 'GET' && action === 'content') {
      const schema = SCHEMAS[String(req.query.type || '')];
      if (!schema) return res.status(400).json({ error: 'Unknown section.' });
      const file = await readFile(schema.path);
      let items = [];
      try { items = file.text ? JSON.parse(file.text) : []; } catch { items = []; }
      return res.status(200).json({ sha: file.sha, items: Array.isArray(items) ? items : [] });
    }

    if (req.method === 'GET' && action === 'status') {
      const commit = String(req.query.commit || '');
      if (!COMMIT_RE.test(commit)) return res.status(400).json({ error: 'Bad request.' });
      return res.status(200).json({ state: await deployState(commit) });
    }

    if (req.method === 'POST' && action === 'save') {
      if (!isTrustedWrite(req)) return res.status(403).json({ error: 'Forbidden' });
      if (!canSave()) {
        return res.status(503).json({ error: 'Saving isn\'t switched on yet, so nothing was changed on the website. Everything else here works the way it will once saving is connected.' });
      }
      return await handleSave(parseBody(req), res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Dashboard error', action, err && err.message);
    return res.status(502).json({ error: 'Something went wrong talking to GitHub. Your change was not saved. Try again in a minute.' });
  }
};
