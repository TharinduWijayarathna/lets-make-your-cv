const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { initDb, closeDb } = require('../db');
const { createApp } = require('../app');
const { recordPageView, getAdminStats } = require('../analytics');
const request = require('supertest');

describe('admin & analytics', () => {
  let app;
  let agent;

  before(() => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'adminpass1';
    initDb({ dbPath: ':memory:' });
    app = createApp({ serveStatic: false, production: false, trackPages: false });
  });

  after(() => {
    closeDb();
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
  });

  beforeEach(() => {
    agent = request.agent(app);
  });

  it('rejects admin stats without login', async () => {
    const res = await agent.get('/api/admin/stats');
    assert.equal(res.status, 401);
  });

  it('admin login and stats', async () => {
    recordPageView({
      path: '/',
      ip: '1.2.3.4',
      userAgent: 'Test',
      referrer: null,
    });
    recordPageView({
      path: '/',
      ip: '1.2.3.4',
      userAgent: 'Test',
      referrer: null,
    });
    recordPageView({
      path: '/app.html',
      ip: '5.6.7.8',
      userAgent: 'Other',
      referrer: null,
    });

    const login = await agent.post('/api/admin/login').send({
      username: 'admin',
      password: 'adminpass1',
    });
    assert.equal(login.status, 200);

    const stats = await agent.get('/api/admin/stats?days=30');
    assert.equal(stats.status, 200);
    assert.ok(stats.body.today.pageViews >= 2);
    assert.ok(stats.body.period.pageViews >= 2);
    assert.ok(stats.body.topPages.some((p) => p.path === '/app.html'));
    assert.ok(stats.body.topPages.length >= 1);
    assert.equal(typeof stats.body.adsense.configured, 'boolean');
  });

  it('tracks page views via middleware', async () => {
    const trackApp = createApp({ serveStatic: false, trackPages: true });
    const a = request.agent(trackApp);
    await a.get('/');
    await a.get('/app.html');
    const stats = getAdminStats(7);
    assert.ok(stats.period.pageViews >= 2);
  });

  it('does not track api paths', async () => {
    const beforeCount = getAdminStats(1).period.pageViews;
    const trackApp = createApp({ serveStatic: false, trackPages: true });
    await request(trackApp).get('/api/auth/me');
    const afterCount = getAdminStats(1).period.pageViews;
    assert.equal(beforeCount, afterCount);
  });
});
