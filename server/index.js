'use strict';

/**
 * Covalent Technologies Servers:
 * 
 * 1. Web Server (runs on Port 3000)
 *    - Serves the public landing page (index.html), CSS, JS, assets.
 *    - Serves the protected Agent Portal (/deck/*) behind a session check.
 *    - Proxies /api/* requests to the API Server.
 * 
 * 2. API Server (runs on Port 3001)
 *    - Exposes API endpoints (/api/register, /api/login, /api/logout, /api/me).
 *    - Manages accounts database (data/users.json).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('./store');

const WEB_PORT = process.env.PORT || 3000;
const API_PORT = process.env.API_PORT || 3001;

const ROOT = path.resolve(__dirname, '..');
const STATIC_DIR = fs.existsSync(path.join(ROOT, 'dist')) ? path.join(ROOT, 'dist') : ROOT;
const DECK_DIR = fs.existsSync(path.join(ROOT, 'dist', 'deck')) ? path.join(ROOT, 'dist', 'deck') : path.join(ROOT, 'deck');
const BCRYPT_ROUNDS = 12;
const MIN_USERNAME = 3;
const MIN_PASSWORD = 8;

const COOKIE_NAME = 'ams_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
if (!process.env.SESSION_SECRET) {
  console.warn('[ams] SESSION_SECRET is not set — using an insecure dev default.');
}

store.init();

// Ensure the workbench JSON database exists. Seed it if missing.
const WORKBENCH_FILE = path.join(ROOT, 'data', 'workbench.json');
const SEED_FILE = path.join(__dirname, 'workbench.seed.json');
if (!fs.existsSync(WORKBENCH_FILE)) {
  if (fs.existsSync(SEED_FILE)) {
    fs.copyFileSync(SEED_FILE, WORKBENCH_FILE);
    console.log('Seeded workbench database at data/workbench.json');
  } else {
    console.error('Seed file not found at:', SEED_FILE);
  }
}

/* ------------------------------------------------------------------ *
 * Session token: base64url(payload).hmac — signed, stateless, expiring.
 * ------------------------------------------------------------------ */

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verifySession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i < 0) return;
    const key = pair.slice(0, i).trim();
    const val = pair.slice(i + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

function currentUser(req) {
  return verifySession(parseCookies(req)[COOKIE_NAME]);
}

function issueSession(res, username) {
  const token = signSession({ u: username, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

// Gate for HTML pages: bounce anonymous visitors back to the login page.
function requireAuthPage(req, res, next) {
  if (currentUser(req)) return next();
  return res.redirect('/login.html');
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function validateCredentials(body, isRegister = false) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    return { error: 'Username must be a valid email address' };
  }

  if (isRegister) {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
      return { error: 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character (e.g. @$!%*?&).' };
    }
  } else {
    if (password.length < MIN_PASSWORD) {
      return { error: `Password must be at least ${MIN_PASSWORD} characters` };
    }
  }
  return { username, password };
}

/* ------------------------------------------------------------------ *
 * 1. API Server (Port 3001)
 * ------------------------------------------------------------------ */
const apiApp = express();
apiApp.use(express.json());

apiApp.post('/api/register', async (req, res) => {
  // Gate registration: only logged-in users can register new accounts
  const session = currentUser(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Only logged in users can register new accounts.' });
  }

  const { username, password, error } = validateCredentials(req.body || {}, true);
  if (error) return res.status(400).json({ error });

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await store.addUser({
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'USERNAME_TAKEN') {
      return res.status(409).json({ error: 'username already taken' });
    }
    console.error('register failed:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

apiApp.post('/api/login', async (req, res) => {
  const { username, password, error } = validateCredentials(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const user = await store.findByUsername(username);
    const hash = user ? user.passwordHash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      return res.status(401).json({ error: 'invalid username or password' });
    }
    issueSession(res, user.username);
    return res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('login failed:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

apiApp.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
});

apiApp.get('/api/me', (req, res) => {
  const session = currentUser(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });
  return res.json({ username: session.u });
});

apiApp.get('/api/workbench', (req, res) => {
  const session = currentUser(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  fs.readFile(WORKBENCH_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read workbench database:', err);
      return res.status(500).json({ error: 'failed to read workbench data' });
    }
    try {
      const parsed = JSON.parse(data);
      return res.json(parsed);
    } catch (e) {
      console.error('Malformed workbench JSON database:', e);
      return res.status(500).json({ error: 'workbench data corrupted' });
    }
  });
});

apiApp.post('/api/workbench', (req, res) => {
  const session = currentUser(req);
  if (!session) return res.status(401).json({ error: 'not authenticated' });

  const { entities, relationships } = req.body || {};
  if (!entities || !relationships) {
    return res.status(400).json({ error: 'invalid payload, entities and relationships are required' });
  }

  const payload = JSON.stringify({ entities, relationships }, null, 2);
  fs.writeFile(WORKBENCH_FILE, payload, 'utf8', (err) => {
    if (err) {
      console.error('Failed to write workbench database:', err);
      return res.status(500).json({ error: 'failed to save workbench data' });
    }
    return res.json({ success: true });
  });
});

apiApp.listen(API_PORT, () => {
  console.log(`API Server listening on http://localhost:${API_PORT}`);
}).on('error', (err) => {
  console.error(`API Server failed to start on port ${API_PORT}:`, err.message);
});

/* ------------------------------------------------------------------ *
 * 2. Web Server (Port 3000)
 * ------------------------------------------------------------------ */
const webApp = express();

// Secure serving: block project internal folders/files
webApp.use((req, res, next) => {
  const p = req.path;
  if (
    /^\/(data|server|node_modules)(\/|$)/.test(p) ||
    /^\/\.[^/]/.test(p) ||
    /(package(-lock)?\.json|webpack[.\w]*\.js|site\.webmanifest)$/.test(p)
  ) {
    return res.status(404).send('Not found');
  }
  next();
});

// Proxy /api/* requests to the API Server on Port 3001
webApp.all(/^\/api\/.*/, (req, res) => {
  const connector = http.request({
    host: 'localhost',
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, (resp) => {
    res.writeHead(resp.statusCode, resp.headers);
    resp.pipe(res, { end: true });
  });

  req.pipe(connector, { end: true });
  connector.on('error', (err) => {
    console.error('API proxy error:', err);
    res.status(502).json({ error: 'Bad Gateway' });
  });
});

// Serve protected catalyst.html page behind session verification
webApp.get('/catalyst.html', requireAuthPage, (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'catalyst.html'));
});

// Serve protected schema.html page behind session verification
webApp.get('/schema.html', requireAuthPage, (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'schema.html'));
});

// Serve protected Agent Portal behind session verification
webApp.use('/deck', requireAuthPage, express.static(DECK_DIR));

// Serve other public static web assets (landing page, CSS, bundle)
webApp.use(express.static(STATIC_DIR));

webApp.listen(WEB_PORT, () => {
  console.log(`Web Server listening on http://localhost:${WEB_PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[ams] Web Server port ${WEB_PORT} is already in use (possibly by webpack-dev-server). Skipping web server initialization; API server remains active on ${API_PORT}.`);
  } else {
    console.error(`Web Server failed to start on port ${WEB_PORT}:`, err.message);
  }
});
