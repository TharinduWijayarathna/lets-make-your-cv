const express = require('express');
const path = require('path');
const session = require('express-session');
const {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateName,
  hashPassword,
  verifyPassword,
  publicUser,
  requireAuth,
} = require('./auth');
const {
  getUserAuthByEmail,
  findUserById,
  createUser,
  getCvForUser,
  saveCvForUser,
} = require('./db');

function createApp(options = {}) {
  const app = express();
  const isProd = options.production ?? process.env.NODE_ENV === 'production';

  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(
    session({
      name: 'bycv.sid',
      secret: options.sessionSecret || process.env.SESSION_SECRET || 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }
    const user = findUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const emailCheck = validateEmail(req.body?.email);
      if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

      const passwordCheck = validatePassword(req.body?.password);
      if (!passwordCheck.ok) return res.status(400).json({ error: passwordCheck.error });

      const nameCheck = validateName(req.body?.name);
      if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });

      const email = normalizeEmail(emailCheck.value);
      if (getUserAuthByEmail(email)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await hashPassword(passwordCheck.value);
      const user = createUser({
        email,
        passwordHash,
        name: nameCheck.value,
      });

      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('session save:', saveErr);
          return res.status(500).json({ error: 'Could not create account' });
        }
        res.status(201).json({ user: publicUser(user) });
      });
    } catch (err) {
      console.error('POST /api/auth/register:', err);
      res.status(500).json({ error: 'Could not create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const emailCheck = validateEmail(req.body?.email);
      if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

      const passwordCheck = validatePassword(req.body?.password);
      if (!passwordCheck.ok) return res.status(400).json({ error: passwordCheck.error });

      const user = getUserAuthByEmail(normalizeEmail(emailCheck.value));
      if (!user || !(await verifyPassword(passwordCheck.value, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('session save:', saveErr);
          return res.status(500).json({ error: 'Could not sign in' });
        }
        res.json({ user: publicUser(user) });
      });
    } catch (err) {
      console.error('POST /api/auth/login:', err);
      res.status(500).json({ error: 'Could not sign in' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('logout:', err);
        return res.status(500).json({ error: 'Could not sign out' });
      }
      res.clearCookie('bycv.sid');
      res.json({ ok: true });
    });
  });

  app.get('/api/cv', requireAuth, (req, res) => {
    try {
      res.json(getCvForUser(req.session.userId));
    } catch (err) {
      console.error('GET /api/cv:', err);
      res.status(500).json({ error: 'Failed to load CV data' });
    }
  });

  app.put('/api/cv', requireAuth, (req, res) => {
    try {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Request body must include a data object' });
      }
      const result = saveCvForUser(req.session.userId, data);
      res.json(result);
    } catch (err) {
      console.error('PUT /api/cv:', err);
      res.status(500).json({ error: 'Failed to save CV data' });
    }
  });

  app.get('/js/ads-config.js', (_req, res) => {
    const config = {
      client: (process.env.ADSENSE_CLIENT || '').trim(),
      slots: {
        left: (process.env.ADSENSE_SLOT_LEFT || '').trim(),
        right: (process.env.ADSENSE_SLOT_RIGHT || '').trim(),
      },
    };
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript');
    res.send(`window.BYCV_ADSENSE=${JSON.stringify(config)};\n`);
  });

  if (options.serveStatic !== false) {
    app.use(express.static(path.join(__dirname, 'public')));
  }

  return app;
}

module.exports = { createApp };
