const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const analytics = require('./analytics');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'cv.db');

const VALID_TEMPLATES = [
  'classic',
  'nordic',
  'editorial',
  'brutalist',
  'artdeco',
  'blueprint',
  'circuit',
  'ink',
  'ats',
  'newspaper',
  'origami',
  'executiveslate',
];

const EMPTY_CV = {
  template: 'classic',
  personal: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  summary: '',
  techTags: '',
  languages: '',
  experience: [],
  projects: [],
  education: [],
  skillBars: [],
  certifications: [],
};

let db;
let dbPath = DEFAULT_DB_PATH;

function initDb(options = {}) {
  if (db) {
    db.close();
    db = null;
  }

  dbPath = options.dbPath || process.env.DB_PATH || DEFAULT_DB_PATH;

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_cv (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const legacy = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='cv'"
  ).get();
  if (legacy) {
    db.exec('DROP TABLE IF EXISTS cv');
  }

  analytics.setDb(db);
  analytics.initAnalyticsSchema(db);
}

function normalizeCvData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return structuredClone(EMPTY_CV);
  }

  return {
    ...EMPTY_CV,
    ...data,
    template: VALID_TEMPLATES.includes(data.template) ? data.template : 'classic',
    personal: { ...EMPTY_CV.personal, ...(data.personal || {}) },
    summary: typeof data.summary === 'string' ? data.summary : '',
    techTags: typeof data.techTags === 'string' ? data.techTags : '',
    languages: typeof data.languages === 'string' ? data.languages : '',
    experience: Array.isArray(data.experience) ? data.experience : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    education: Array.isArray(data.education) ? data.education : [],
    skillBars: Array.isArray(data.skillBars) ? data.skillBars : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
  };
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function normalizeCvDataExport(data) {
  return normalizeCvData(data);
}

function parseStoredCv(json) {
  try {
    return normalizeCvData(JSON.parse(json));
  } catch {
    return structuredClone(EMPTY_CV);
  }
}

function getUserAuthByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
  return db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
}

function createUser({ email, passwordHash, name }) {
  const result = db
    .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email, passwordHash, name);
  const userId = result.lastInsertRowid;
  const starterCv = structuredClone(EMPTY_CV);
  starterCv.personal.name = name;
  db.prepare('INSERT INTO user_cv (user_id, data) VALUES (?, ?)').run(
    userId,
    JSON.stringify(starterCv)
  );
  return findUserById(userId);
}

function getCvForUser(userId) {
  let row = db
    .prepare('SELECT data, updated_at FROM user_cv WHERE user_id = ?')
    .get(userId);

  if (!row) {
    db.prepare('INSERT INTO user_cv (user_id, data) VALUES (?, ?)').run(
      userId,
      JSON.stringify(structuredClone(EMPTY_CV))
    );
    row = db
      .prepare('SELECT data, updated_at FROM user_cv WHERE user_id = ?')
      .get(userId);
  }

  return {
    data: parseStoredCv(row.data),
    updatedAt: row.updated_at,
  };
}

function saveCvForUser(userId, data) {
  const json = JSON.stringify(normalizeCvData(data));
  db.prepare(`
    INSERT INTO user_cv (user_id, data, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(userId, json);
  return getCvForUser(userId);
}

module.exports = {
  initDb,
  closeDb,
  getUserAuthByEmail,
  findUserById,
  createUser,
  getCvForUser,
  saveCvForUser,
  normalizeCvData: normalizeCvDataExport,
  EMPTY_CV,
  VALID_TEMPLATES,
};
