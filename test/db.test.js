const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword } = require('../src/auth');
const {
  initDb,
  closeDb,
  createUser,
  getCvForUser,
  saveCvForUser,
  getUserAuthByEmail,
  normalizeCvData,
  EMPTY_CV,
  VALID_TEMPLATES,
} = require('../src/db');

describe('database layer', () => {
  before(() => {
    initDb({ dbPath: ':memory:' });
  });

  after(() => {
    closeDb();
  });

  it('createUser stores user and starter CV with name', async () => {
    const hash = await hashPassword('password12');
    const user = createUser({
      email: 'dbtest@example.com',
      passwordHash: hash,
      name: 'DB Tester',
    });
    assert.equal(user.email, 'dbtest@example.com');
    assert.equal(user.name, 'DB Tester');
    assert.ok(getUserAuthByEmail('dbtest@example.com'));

    const cv = getCvForUser(user.id);
    assert.equal(cv.data.personal.name, 'DB Tester');
    assert.equal(cv.data.template, 'classic');
    assert.ok(cv.updatedAt);
  });

  it('saveCvForUser persists and returns updated CV', async () => {
    const hash = await hashPassword('password12');
    const user = createUser({
      email: 'save@example.com',
      passwordHash: hash,
      name: 'Saver',
    });

    const payload = {
      ...EMPTY_CV,
      template: 'nordic',
      summary: 'Experienced developer',
      personal: { ...EMPTY_CV.personal, name: 'Saver', title: 'Engineer' },
      experience: [{ role: 'Dev', company: 'Co', location: '', from: '2020', to: '2024', bullets: 'Did work' }],
    };

    const saved = saveCvForUser(user.id, payload);
    assert.equal(saved.data.template, 'nordic');
    assert.equal(saved.data.summary, 'Experienced developer');
    assert.equal(saved.data.experience.length, 1);

    const loaded = getCvForUser(user.id);
    assert.equal(loaded.data.template, 'nordic');
    assert.equal(loaded.data.summary, 'Experienced developer');
  });

  it('normalizeCvData coerces invalid input to empty CV defaults', () => {
    assert.deepEqual(normalizeCvData(null).template, 'classic');
    assert.deepEqual(normalizeCvData([]).experience, []);
    const normalized = normalizeCvData({ template: 'invalid', experience: 'nope' });
    assert.equal(normalized.template, 'classic');
    assert.deepEqual(normalized.experience, []);
    assert.ok(VALID_TEMPLATES.includes('editorial'));
    assert.ok(VALID_TEMPLATES.includes('brutalist'));
    assert.ok(VALID_TEMPLATES.includes('artdeco'));
    assert.ok(VALID_TEMPLATES.includes('blueprint'));
    assert.ok(VALID_TEMPLATES.includes('circuit'));
    assert.ok(VALID_TEMPLATES.includes('ink'));
    assert.ok(VALID_TEMPLATES.includes('ats'));
    assert.ok(VALID_TEMPLATES.includes('newspaper'));
    assert.ok(VALID_TEMPLATES.includes('origami'));
    assert.ok(VALID_TEMPLATES.includes('executiveslate'));
  });
});
