const { initDb, closeDb } = require('../src/db');
const { createApp } = require('../src/app');
const request = require('supertest');

let sharedApp = null;

function setupTestEnv(appOptions = {}) {
  if (!sharedApp) {
    initDb({ dbPath: ':memory:' });
    sharedApp = createApp({ serveStatic: false, production: false, ...appOptions });
  }
  return request.agent(sharedApp);
}

function setupTestEnvWithOptions(appOptions = {}) {
  initDb({ dbPath: ':memory:' });
  const app = createApp({ serveStatic: false, production: false, ...appOptions });
  return request.agent(app);
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
  setupTestEnvWithOptions,
  createAgent,
  teardownTestEnv,
  validUser,
  registerUser,
};
