const crypto = require('crypto');

let dbRef = null;

function setDb(db) {
  dbRef = db;
}

function initAnalyticsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      visitor_key TEXT NOT NULL,
      referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
    CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_key, created_at);
  `);
}

function hashVisitorKey(ip, userAgent) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash('sha256')
    .update(`${day}|${ip || ''}|${userAgent || ''}`)
    .digest('hex')
    .slice(0, 32);
}

function normalizePath(path) {
  const p = String(path || '/').split('?')[0];
  if (!p || p === '') return '/';
  return p.length > 200 ? p.slice(0, 200) : p;
}

function shouldTrackPath(path) {
  if (!path || path.startsWith('/api/') || path.startsWith('/admin')) return false;
  if (/\.(css|js|mjs|map|ico|png|jpe?g|gif|svg|webp|woff2?|ttf|eot)$/i.test(path)) return false;
  return true;
}

function recordPageView({ path, ip, userAgent, referrer }) {
  if (!dbRef) return;
  const normalized = normalizePath(path);
  if (!shouldTrackPath(normalized)) return;

  dbRef
    .prepare(
      `INSERT INTO page_views (path, visitor_key, referrer)
       VALUES (?, ?, ?)`
    )
    .run(
      normalized,
      hashVisitorKey(ip, userAgent),
      referrer ? String(referrer).slice(0, 500) : null
    );
}

function createPageViewTracker() {
  return function pageViewTracker(req, res, next) {
    if (req.method !== 'GET') return next();

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      try {
        recordPageView({
          path: req.path,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          referrer: req.get('referer'),
        });
      } catch (err) {
        console.error('page view track:', err);
      }
    });

    next();
  };
}

function getAdminStats(days = 30) {
  const span = Math.min(365, Math.max(1, Number(days) || 30));

  const dailyViews = dbRef
    .prepare(
      `SELECT date(created_at) AS date,
              COUNT(*) AS page_views,
              COUNT(DISTINCT visitor_key) AS unique_visitors
       FROM page_views
       WHERE created_at >= datetime('now', ? || ' days')
       GROUP BY date(created_at)
       ORDER BY date`
    )
    .all(`-${span}`);

  const dailySignups = dbRef
    .prepare(
      `SELECT date(created_at) AS date, COUNT(*) AS signups
       FROM users
       WHERE created_at >= datetime('now', ? || ' days')
       GROUP BY date(created_at)`
    )
    .all(`-${span}`);

  const signupMap = Object.fromEntries(dailySignups.map((r) => [r.date, r.signups]));

  const daily = dailyViews.map((row) => ({
    date: row.date,
    pageViews: row.page_views,
    uniqueVisitors: row.unique_visitors,
    signups: signupMap[row.date] || 0,
  }));

  const today = dbRef
    .prepare(
      `SELECT COUNT(*) AS page_views,
              COUNT(DISTINCT visitor_key) AS unique_visitors
       FROM page_views
       WHERE date(created_at) = date('now')`
    )
    .get();

  const period = dbRef
    .prepare(
      `SELECT COUNT(*) AS page_views,
              COUNT(DISTINCT visitor_key) AS unique_visitors
       FROM page_views
       WHERE created_at >= datetime('now', ? || ' days')`
    )
    .get(`-${span}`);

  const topPages = dbRef
    .prepare(
      `SELECT path, COUNT(*) AS views,
              COUNT(DISTINCT visitor_key) AS unique_visitors
       FROM page_views
       WHERE created_at >= datetime('now', ? || ' days')
       GROUP BY path
       ORDER BY views DESC
       LIMIT 12`
    )
    .all(`-${span}`);

  const totalUsers = dbRef.prepare('SELECT COUNT(*) AS c FROM users').get().c;

  const recent = dbRef
    .prepare(
      `SELECT path, COUNT(*) AS views
       FROM page_views
       WHERE created_at >= datetime('now', '-1 day')
       GROUP BY path
       ORDER BY views DESC
       LIMIT 5`
    )
    .all();

  return {
    days: span,
    today: {
      pageViews: today?.page_views || 0,
      uniqueVisitors: today?.unique_visitors || 0,
    },
    period: {
      pageViews: period?.page_views || 0,
      uniqueVisitors: period?.unique_visitors || 0,
    },
    totalUsers,
    daily,
    topPages,
    recent,
    adsense: {
      configured: Boolean((process.env.ADSENSE_CLIENT || '').trim()),
      client: (process.env.ADSENSE_CLIENT || '').trim() || null,
      dashboardUrl: 'https://www.google.com/adsense/',
    },
  };
}

module.exports = {
  setDb,
  initAnalyticsSchema,
  createPageViewTracker,
  recordPageView,
  getAdminStats,
  shouldTrackPath,
};
