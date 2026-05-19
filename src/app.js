const express = require('express');
const fs = require('fs');
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
const { createPageViewTracker, getAdminStats } = require('./analytics');
const { verifyAdminLogin, requireAdmin, getAdminCredentials } = require('./admin-auth');
const {
  generateCvFromPrompt,
  getGeminiApiKey,
  validateGeneratePrompt,
} = require('./gemini');

function resolveCookieSecure(isProd, options) {
  if (options.cookieSecure !== undefined) return options.cookieSecure;
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return false;
}

function createApp(options = {}) {
  const app = express();
  const isProd = options.production ?? process.env.NODE_ENV === 'production';
  const cookieSecure = resolveCookieSecure(isProd, options);

  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '1mb' }));

  if (options.trackPages !== false) {
    app.use(createPageViewTracker());
  }

  app.use(
    session({
      name: 'bycv.sid',
      secret: options.sessionSecret || process.env.SESSION_SECRET || 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: cookieSecure,
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

  app.post('/api/cv/generate', requireAuth, async (req, res) => {
    try {
      if (!getGeminiApiKey() && !options.geminiGenerate) {
        return res.status(503).json({ error: 'AI generation is not configured on this server' });
      }

      const promptCheck = validateGeneratePrompt(req.body?.prompt);
      if (!promptCheck.ok) {
        return res.status(400).json({ error: promptCheck.error });
      }

      const user = findUserById(req.session.userId);
      const generate = options.geminiGenerate || generateCvFromPrompt;
      const generated = await generate(promptCheck.value, {
        name: user?.name,
        email: user?.email,
      });

      const existing = getCvForUser(req.session.userId);
      const merged = {
        ...generated,
        template: existing.data.template,
        personal: {
          ...generated.personal,
          name: generated.personal?.name || user?.name || existing.data.personal?.name || '',
          email: generated.personal?.email || user?.email || existing.data.personal?.email || '',
        },
      };

      const result = saveCvForUser(req.session.userId, merged);
      res.json(result);
    } catch (err) {
      if (err.code === 'NOT_CONFIGURED') {
        return res.status(503).json({ error: 'AI generation is not configured on this server' });
      }
      console.error('POST /api/cv/generate:', err);
      const status = err.status === 429 ? 429 : 502;
      res.status(status).json({ error: err.message || 'Failed to generate CV' });
    }
  });

  app.post('/api/admin/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const check = verifyAdminLogin(username, password);
    if (!check.ok) {
      return res.status(check.error.includes('not configured') ? 503 : 401).json({ error: check.error });
    }
    delete req.session.userId;
    req.session.isAdmin = true;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Could not sign in' });
      res.json({ ok: true, username: getAdminCredentials().username });
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    delete req.session.isAdmin;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Could not sign out' });
      res.json({ ok: true });
    });
  });

  app.get('/api/admin/me', (req, res) => {
    if (!req.session?.isAdmin) return res.json({ admin: null });
    res.json({ admin: { username: getAdminCredentials().username } });
  });

  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
      const days = Number(req.query.days) || 30;
      res.json(getAdminStats(days));
    } catch (err) {
      console.error('GET /api/admin/stats:', err);
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
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
    const rootDir = path.join(__dirname, '..');
    const astroDist = path.join(rootDir, 'dist', 'web');

    const redirectWithQuery = (target) => (req, res) => {
      const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.redirect(301, `${target}${q}`);
    };

    app.get('/index.html', redirectWithQuery('/'));
    app.get('/login.html', redirectWithQuery('/login'));
    app.get('/register.html', redirectWithQuery('/register'));
    app.get('/app.html', redirectWithQuery('/app'));

    if (fs.existsSync(astroDist)) {
      const sendPage = (file) => (req, res, next) => {
        const filePath = path.join(astroDist, file);
        if (!fs.existsSync(filePath)) return next();
        res.sendFile(filePath, (err) => (err ? next() : undefined));
      };

      app.get('/', sendPage('index.html'));
      app.get('/login', sendPage('login/index.html'));
      app.get('/register', sendPage('register/index.html'));
      app.get('/app', sendPage('app/index.html'));
      app.get('/admin', sendPage('admin/index.html'));
      app.get('/login/', (_req, res) => res.redirect(301, '/login'));
      app.get('/register/', (_req, res) => res.redirect(301, '/register'));
      app.get('/app/', (_req, res) => res.redirect(301, '/app'));
      app.get('/admin/', (_req, res) => res.redirect(301, '/admin'));
      app.use(express.static(astroDist));
    }
  }

  return app;
}

module.exports = { createApp };
