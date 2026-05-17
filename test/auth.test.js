const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateName,
  hashPassword,
  verifyPassword,
  publicUser,
} = require('../src/auth');

describe('auth validation', () => {
  it('normalizeEmail trims and lowercases', () => {
    assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  });

  it('validateEmail accepts valid addresses', () => {
    const result = validateEmail('user@example.com');
    assert.equal(result.ok, true);
    assert.equal(result.value, 'user@example.com');
  });

  it('validateEmail rejects invalid addresses', () => {
    assert.equal(validateEmail('').ok, false);
    assert.equal(validateEmail('not-an-email').ok, false);
    assert.equal(validateEmail('a@b').ok, false);
  });

  it('validatePassword requires 8+ characters', () => {
    assert.equal(validatePassword('short').ok, false);
    assert.equal(validatePassword('longenough').ok, true);
  });

  it('validateName requires non-empty trimmed name', () => {
    assert.equal(validateName('').ok, false);
    assert.equal(validateName('   ').ok, false);
    assert.equal(validateName('Alex').ok, true);
    assert.equal(validateName('x'.repeat(121)).ok, false);
  });
});

describe('auth passwords', () => {
  it('hashPassword and verifyPassword work together', async () => {
    const hash = await hashPassword('mysecret12');
    assert.notEqual(hash, 'mysecret12');
    assert.equal(await verifyPassword('mysecret12', hash), true);
    assert.equal(await verifyPassword('wrongpass1', hash), false);
  });
});

describe('publicUser', () => {
  it('strips sensitive fields', () => {
    assert.deepEqual(
      publicUser({ id: 1, email: 'a@b.com', name: 'A', password_hash: 'secret' }),
      { id: 1, email: 'a@b.com', name: 'A' }
    );
    assert.equal(publicUser(null), null);
  });
});
