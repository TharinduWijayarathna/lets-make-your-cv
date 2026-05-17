const crypto = require('crypto');

function timingSafeEqualStr(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getAdminCredentials() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  return { username, password, enabled: password.length > 0 };
}

function verifyAdminLogin(username, password) {
  const creds = getAdminCredentials();
  if (!creds.enabled) {
    return { ok: false, error: 'Admin login is not configured (set ADMIN_PASSWORD in .env)' };
  }
  const user = String(username || '').trim();
  const pass = String(password || '');
  if (!timingSafeEqualStr(user, creds.username) || !timingSafeEqualStr(pass, creds.password)) {
    return { ok: false, error: 'Invalid admin credentials' };
  }
  return { ok: true };
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: 'Admin sign in required' });
  }
  next();
}

module.exports = {
  getAdminCredentials,
  verifyAdminLogin,
  requireAdmin,
};
