const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  setupTestEnv,
  createAgent,
  teardownTestEnv,
  validUser,
  registerUser,
} = require('./helpers');

describe('API integration', () => {
  /** @type {import('supertest').SuperTest<import('supertest').Test>} */
  let agent;

  before(() => {
    agent = setupTestEnv();
  });

  after(() => {
    teardownTestEnv();
  });

  describe('auth endpoints', () => {
    it('GET /api/auth/me returns null when not signed in', async () => {
      const res = await agent.get('/api/auth/me');
      assert.equal(res.status, 200);
      assert.equal(res.body.user, null);
    });

    it('POST /api/auth/register creates account and session', async () => {
      const { res } = await registerUser(agent, { email: 'reg1@example.com' });
      assert.equal(res.status, 201, res.body.error || JSON.stringify(res.body));
      assert.equal(res.body.user.email, 'reg1@example.com');
      assert.equal(res.body.user.name, validUser.name);
      assert.ok(res.body.user.id);

      const me = await agent.get('/api/auth/me');
      assert.equal(me.status, 200);
      assert.ok(me.body.user, `expected session user, got ${JSON.stringify(me.body)}`);
      assert.equal(me.body.user.email, 'reg1@example.com');
    });

    it('POST /api/auth/register rejects duplicate email', async () => {
      await registerUser(agent, { email: 'dup@example.com' });
      const res = await agent.post('/api/auth/register').send({
        ...validUser,
        email: 'dup@example.com',
      });
      assert.equal(res.status, 409);
      assert.match(res.body.error, /already exists/i);
    });

    it('POST /api/auth/register validates input', async () => {
      const res = await agent.post('/api/auth/register').send({
        name: '',
        email: 'bad',
        password: 'short',
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });

    it('POST /api/auth/login signs in existing user', async () => {
      await registerUser(agent, { email: 'login@example.com', password: 'password99' });
      await agent.post('/api/auth/logout');
      const res = await agent.post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'password99',
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, 'login@example.com');
    });

    it('POST /api/auth/login rejects wrong password', async () => {
      await registerUser(agent, { email: 'wrongpw@example.com' });
      const guest = createAgent();
      const res = await guest.post('/api/auth/login').send({
        email: 'wrongpw@example.com',
        password: 'notthepassword',
      });
      assert.equal(res.status, 401);
    });

    it('POST /api/auth/logout clears session', async () => {
      await registerUser(agent, { email: 'logout@example.com' });
      const out = await agent.post('/api/auth/logout');
      assert.equal(out.status, 200);
      assert.equal(out.body.ok, true);

      const me = await agent.get('/api/auth/me');
      assert.equal(me.body.user, null);
    });
  });

  describe('CV endpoints', () => {
    it('GET /api/cv requires authentication', async () => {
      const guest = createAgent();
      const res = await guest.get('/api/cv');
      assert.equal(res.status, 401);
      assert.match(res.body.error, /sign in/i);
    });

    it('GET /api/cv returns user CV after register', async () => {
      await registerUser(agent, { email: 'cvget@example.com', name: 'CV Getter' });
      const res = await agent.get('/api/cv');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.personal.name, 'CV Getter');
      assert.equal(res.body.data.template, 'classic');
    });

    it('PUT /api/cv saves and returns updated data', async () => {
      await registerUser(agent, { email: 'cvput@example.com' });
      const res = await agent.put('/api/cv').send({
        data: {
          template: 'editorial',
          summary: 'Updated summary',
          personal: { name: 'CV Put', title: 'Designer' },
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.template, 'editorial');
      assert.equal(res.body.data.summary, 'Updated summary');
      assert.equal(res.body.data.personal.name, 'CV Put');
      assert.equal(res.body.data.personal.title, 'Designer');

      const again = await agent.get('/api/cv');
      assert.equal(again.body.data.summary, 'Updated summary');
    });

    it('PUT /api/cv rejects missing data object', async () => {
      await registerUser(agent, { email: 'cvbad@example.com' });
      const res = await agent.put('/api/cv').send({});
      assert.equal(res.status, 400);
      assert.match(res.body.error, /data object/i);
    });

    it('users cannot access each other CV data', async () => {
      await registerUser(agent, { email: 'usera@example.com', name: 'User A' });
      await agent.put('/api/cv').send({
        data: { summary: 'User A secret summary', personal: { name: 'User A' } },
      });

      const agentB = createAgent();
      await registerUser(agentB, { email: 'userb@example.com', name: 'User B' });
      const resB = await agentB.get('/api/cv');
      assert.notEqual(resB.body.data.summary, 'User A secret summary');
      assert.equal(resB.body.data.personal.name, 'User B');
    });
  });
});
