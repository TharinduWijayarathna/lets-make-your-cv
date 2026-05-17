async function fetchCurrentUser() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not verify session');
  const payload = await res.json();
  return payload.user || null;
}

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers,
  });
  if (res.status === 401) {
    const next = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    location.href = `/login.html?next=${next}`;
    throw new Error('Unauthorized');
  }
  return res;
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  location.href = '/';
}

function showAuthError(el, message) {
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.add('visible');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
  }
}

async function initLandingNav() {
  const nav = document.getElementById('landing-nav-auth');
  if (!nav) return;
  try {
    const user = await fetchCurrentUser();
    if (user) {
      nav.innerHTML = `
        <span class="nav-user">Hi, <strong>${escapeAuthHtml(user.name || user.email)}</strong></span>
        <a href="/app.html" class="btn btn-primary">My CV</a>
        <button type="button" class="btn btn-ghost" id="nav-logout">Sign out</button>
      `;
      document.getElementById('nav-logout')?.addEventListener('click', logout);
    } else {
      nav.innerHTML = `
        <a href="/login.html">Sign in</a>
        <a href="/register.html" class="btn btn-primary">Get started free</a>
      `;
    }
  } catch {
    nav.innerHTML = `
      <a href="/login.html">Sign in</a>
      <a href="/register.html" class="btn btn-primary">Get started free</a>
    `;
  }
}

function escapeAuthHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.fetchCurrentUser = fetchCurrentUser;
window.apiFetch = apiFetch;
window.logout = logout;
window.showAuthError = showAuthError;
window.initLandingNav = initLandingNav;
