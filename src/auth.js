const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!value || !EMAIL_RE.test(value)) {
    return { ok: false, error: 'Enter a valid email address' };
  }
  return { ok: true, value };
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  return { ok: true, value };
}

function validateName(name) {
  const value = String(name || '').trim();
  if (!value) return { ok: false, error: 'Enter your name' };
  if (value.length > 120) return { ok: false, error: 'Name is too long' };
  return { ok: true, value };
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name };
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Sign in to continue' });
  }
  next();
}

module.exports = {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateName,
  hashPassword,
  verifyPassword,
  publicUser,
  requireAuth,
};
