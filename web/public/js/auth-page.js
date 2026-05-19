function getNextUrl() {
  const params = new URLSearchParams(location.search);
  const next = params.get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/app';
}

async function submitAuthForm(form, endpoint) {
  const errorEl = document.getElementById('auth-error');
  const submitBtn = form.querySelector('[type="submit"]');
  showAuthError(errorEl, '');

  const body = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.textContent = submitBtn.dataset.loading || 'Please wait…';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAuthError(errorEl, payload.error || 'Something went wrong');
      return;
    }
    location.href = getNextUrl();
  } catch {
    showAuthError(errorEl, 'Network error — try again');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = submitBtn.dataset.label || 'Continue';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLandingNav();

  const form = document.getElementById('auth-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const endpoint = form.dataset.endpoint;
    submitAuthForm(form, endpoint);
  });

  fetchCurrentUser().then((user) => {
    if (user) location.href = getNextUrl();
  });
});
