const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const rangeSelect = document.getElementById('range-select');

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return res;
}

function showError(el, message) {
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function formatNum(n) {
  return Number(n || 0).toLocaleString();
}

function renderChart(daily) {
  const chart = document.getElementById('daily-chart');
  if (!chart) return;
  if (!daily.length) {
    chart.innerHTML = '<p class="admin-muted">No traffic recorded yet.</p>';
    return;
  }

  const maxViews = Math.max(...daily.map((d) => d.pageViews), 1);

  chart.innerHTML = daily
    .map((day) => {
      const vH = Math.round((day.pageViews / maxViews) * 100);
      const uH = Math.round((day.uniqueVisitors / maxViews) * 100);
      const sH = Math.round((day.signups / maxViews) * 100);
      const label = day.date.slice(5);
      return `
        <div class="chart-bar-group">
          <div class="chart-bars">
            <div class="chart-bar views" style="height:${vH}%" title="${day.pageViews} views"></div>
            <div class="chart-bar uniq" style="height:${uH}%" title="${day.uniqueVisitors} unique"></div>
            <div class="chart-bar signups" style="height:${sH}%" title="${day.signups} signups"></div>
          </div>
          <span class="chart-date">${label}</span>
        </div>`;
    })
    .join('');
}

function renderTopPages(rows) {
  const body = document.getElementById('top-pages-body');
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="3">No data yet</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.path)}</td><td>${formatNum(r.views)}</td><td>${formatNum(r.unique_visitors)}</td></tr>`
    )
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStats(data) {
  document.getElementById('stat-today-views').textContent = formatNum(data.today.pageViews);
  document.getElementById('stat-today-uniq').textContent = formatNum(data.today.uniqueVisitors);
  document.getElementById('stat-period-views').textContent = formatNum(data.period.pageViews);
  document.getElementById('stat-period-uniq').textContent = formatNum(data.period.uniqueVisitors);
  document.getElementById('stat-users').textContent = formatNum(data.totalUsers);

  const adsEl = document.getElementById('stat-adsense');
  if (adsEl) {
    adsEl.textContent = data.adsense.configured ? 'Configured' : 'Not set';
    adsEl.style.color = data.adsense.configured ? '#2d6a4f' : '#888';
  }

  renderChart(data.daily);
  renderTopPages(data.topPages);
}

async function loadStats() {
  const days = rangeSelect?.value || 30;
  const res = await adminFetch(`/api/admin/stats?days=${days}`);
  if (!res.ok) {
    if (res.status === 401) {
      showStatsError('Session expired. Sign in again.');
      showDashboard(false);
      return false;
    }
    const payload = await res.json().catch(() => ({}));
    showStatsError(payload.error || 'Could not load analytics.');
    return false;
  }
  renderStats(await res.json());
  return true;
}

function showDashboard(show) {
  if (loginView) loginView.hidden = show;
  if (dashboardView) dashboardView.hidden = !show;
}

function showStatsError(message) {
  const chart = document.getElementById('daily-chart');
  if (chart) {
    chart.innerHTML = `<p class="admin-error">${escapeHtml(message)}</p>`;
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError(loginError, '');
  const body = Object.fromEntries(new FormData(loginForm).entries());
  const res = await adminFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    if (res.status === 404) {
      showError(
        loginError,
        'Admin API not found. Stop the server and run npm start again so it loads the latest code.'
      );
      return;
    }
  }
  if (!res.ok) {
    showError(loginError, payload.error || `Sign in failed (${res.status})`);
    return;
  }
  showDashboard(true);
  try {
    await loadStats();
  } catch (err) {
    console.error(err);
    showStatsError('Could not load analytics. Try Refresh.');
  }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await adminFetch('/api/admin/logout', { method: 'POST' });
  showDashboard(false);
});

document.getElementById('btn-refresh')?.addEventListener('click', () => loadStats().catch(console.error));
rangeSelect?.addEventListener('change', () => loadStats().catch(console.error));

(async function init() {
  try {
    const res = await adminFetch('/api/admin/me');
    const { admin } = await res.json();
    if (admin) {
      showDashboard(true);
      await loadStats();
    } else {
      showDashboard(false);
    }
  } catch (err) {
    console.error(err);
    showDashboard(false);
  }
})();
