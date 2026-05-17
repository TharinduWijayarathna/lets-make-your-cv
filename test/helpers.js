const { initDb, closeDb } = require('../db');
const { createApp } = require('../app');
const request = require('supertest');

let sharedApp = null;

function setupTestEnv() {
  if (!sharedApp) {
    initDb({ dbPath: ':memory:' });
    sharedApp = createApp({ serveStatic: false, production: false });
  }
  return request.agent(sharedApp);
}

/** New cookie jar — use for unauthenticated or second-user flows */
function createAgent() {
  return setupTestEnv();
}

function teardownTestEnv() {
  closeDb();
  sharedApp = null;
}

const validUser = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'securepass1',
};

async function registerUser(agent, overrides = {}) {
  const body = { ...validUser, ...overrides };
  const res = await agent.post('/api/auth/register').send(body);
  return { res, body };
}

module.exports = {
  setupTestEnv,
  createAgent,
  teardownTestEnv,
  validUser,
  registerUser,
};
