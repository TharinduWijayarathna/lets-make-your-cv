const TEMPLATES = {
  classic: { label: 'Classic Sidebar', short: 'Classic', file: '/templates/classic.html' },
  nordic: { label: 'Nordic Minimal', short: 'Nordic', file: '/templates/nordic.html' },
  editorial: { label: 'Editorial Bold', short: 'Editorial', file: '/templates/editorial.html' },
  brutalist: { label: 'Brutalist', short: 'Brutalist', file: '/templates/brutalist.html' },
  artdeco: { label: 'Art Deco', short: 'Art Deco', file: '/templates/artdeco.html' },
};

const TEMPLATE_BODY_CLASSES = ['tpl-classic', 'tpl-nordic', 'tpl-editorial', 'tpl-brutalist', 'tpl-artdeco'];

const templateCache = {};
let cvData = null;
let activeTemplate = 'classic';

function $(id, root = document) {
  if (!id) return null;
  if (root === document && typeof document.getElementById === 'function') {
    const byId = document.getElementById(id);
    if (byId) return byId;
  }
  // App IDs are alphanumeric + hyphen; safe without CSS.escape
  return root.querySelector(`#${id}`);
}

function setFieldValue(id, value) {
  const el = $(id);
  if (el && 'value' in el) el.value = value ?? '';
}

function setText(id, text, root = document) {
  const node = $(id, root);
  if (node) node.textContent = text ?? '';
}

function setHtml(id, html, root = document) {
  const node = $(id, root);
  if (node) node.innerHTML = html ?? '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function companyLine(entry) {
  const company = entry.company || '';
  const location = entry.location || '';
  return location ? `${company} · ${location}` : company;
}

function skillDots(level) {
  const filled = Math.min(5, Math.max(0, Math.round((level || 0) / 20)));
  return Array.from({ length: 5 }, (_, i) =>
    `<div class="dot${i < filled ? ' on' : ''}"></div>`
  ).join('');
}

function setSaveStatus(message, isError) {
  const el = $('save-status');
  if (!el) return;
  if (!isError) {
    el.textContent = '';
    el.hidden = true;
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

async function preloadTemplates() {
  await Promise.all(
    Object.entries(TEMPLATES).map(async ([key, meta]) => {
      const res = await fetch(meta.file);
      if (!res.ok) throw new Error(`Failed to load template: ${key}`);
      templateCache[key] = await res.text();
    })
  );
}

function setBodyTemplateClass(name) {
  const tplClass = `tpl-${name}`;
  document.body.classList.remove(...TEMPLATE_BODY_CLASSES);
  document.body.classList.add(tplClass);

  document.querySelectorAll('#cv-mount, .app-sidebar').forEach((el) => {
    el.classList.remove(...TEMPLATE_BODY_CLASSES);
    el.classList.add(tplClass);
  });

  const mount = $('cv-mount');
  const sheet = $('template-css');
  if (sheet) {
    const href = `/css/${name}.css`;
    if (!sheet.getAttribute('href')?.includes(href)) {
      sheet.href = `${href}?t=${name}`;
    }
  }
}

async function mountTemplate(name) {
  if (!templateCache[name]) throw new Error(`Unknown template: ${name}`);
  activeTemplate = name;
  setBodyTemplateClass(name);
  $('cv-mount').innerHTML = templateCache[name];
  setTemplatePickerActive(name);
}

function templatePickerThumb(id) {
  if (id === 'classic') {
    return '<div class="picker-thumb classic" aria-hidden="true"><span class="t-side"></span><span class="t-main"></span></div>';
  }
  return `<div class="picker-thumb ${id}" aria-hidden="true"></div>`;
}

function initTemplatePicker() {
  const picker = $('template-picker');
  if (!picker) return;

  picker.innerHTML = Object.entries(TEMPLATES)
    .map(
      ([id, meta]) => `<button type="button" class="template-option" role="option" data-template="${id}" aria-selected="false">
        ${templatePickerThumb(id)}
        <span class="template-option-name">${escapeHtml(meta.short || meta.label)}</span>
      </button>`
    )
    .join('');

  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-template]');
    if (!btn) return;
    changeTemplate(btn.dataset.template);
  });
}

function setTemplatePickerActive(name) {
  const picker = $('template-picker');
  if (!picker) return;
  picker.querySelectorAll('.template-option').forEach((btn) => {
    const active = btn.dataset.template === name;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

async function changeTemplate(name) {
  if (!cvData || name === activeTemplate) return;
  if (!TEMPLATES[name]) return;
  cvData.template = name;
  await mountTemplate(name);
  renderCV();
  try {
    await saveCV();
  } catch (err) {
    console.error(err);
    setSaveStatus('Template changed; save failed — try again', true);
  }
}

async function loadCV() {
  setSaveStatus('');
  try {
    const res = await apiFetch('/api/cv');
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server error (${res.status})`);
    }
    const payload = await res.json();
    if (!payload || !payload.data) throw new Error('Invalid response from server');
    cvData = payload.data;
    cvData.template = TEMPLATES[cvData.template] ? cvData.template : 'classic';
    if (!templateCache[cvData.template]) {
      throw new Error(`Template "${cvData.template}" is not loaded`);
    }
    await mountTemplate(cvData.template);
    renderCV();
    populateFormFields();
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error('loadCV failed:', err);
    setSaveStatus(`Could not load CV — ${err.message || 'Try again'}`, true);
  }
}

async function saveCV() {
  const res = await apiFetch('/api/cv', {
    method: 'PUT',
    body: JSON.stringify({ data: cvData }),
  });
  if (!res.ok) throw new Error('Failed to save');
  setSaveStatus('');
}

function renderCV() {
  if (!cvData) return;
  const root = $('cv-mount');
  if (activeTemplate === 'classic') renderClassic(cvData, root);
  else if (activeTemplate === 'nordic') renderNordic(cvData, root);
  else if (activeTemplate === 'editorial') renderEditorial(cvData, root);
  else if (activeTemplate === 'brutalist') renderBrutalist(cvData, root);
  else if (activeTemplate === 'artdeco') renderArtdeco(cvData, root);
}

function renderClassic(data, root) {
  const p = data.personal || {};
  setText('cv-name', p.name, root);
  setText('cv-title', p.title, root);
  setText('cv-email', p.email, root);
  setText('cv-phone', p.phone, root);
  setText('cv-location', p.location, root);
  setText('cv-linkedin', p.linkedin, root);
  setText('cv-github', p.github, root);
  setText('cv-portfolio', p.portfolio, root);
  setText('cv-summary', data.summary, root);

  const tags = (data.techTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  setHtml('cv-tech-tags', tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(''), root);

  setHtml('cv-skills-bars', (data.skillBars || []).map((s) =>
    `<div class="skill-item"><div class="skill-name">${escapeHtml(s.name)}</div><div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${Math.min(100, Math.max(0, s.level || 0))}%"></div></div></div>`
  ).join(''), root);

  const langs = (data.languages || '').split('\n').map((l) => l.trim()).filter(Boolean);
  setHtml('cv-languages', langs.map((l) => {
    const parts = l.split('|').map((x) => x.trim());
    return `<li><span>${escapeHtml(parts[0] || '')}</span><span class="lang-level">${escapeHtml(parts[1] || '')}</span></li>`;
  }).join(''), root);

  setHtml('cv-experience', (data.experience || []).map((e) => `
    <div class="exp-entry">
      <div class="exp-header">
        <div class="exp-role">${escapeHtml(e.role)}</div>
        <div class="exp-date">${escapeHtml(e.from)} – ${escapeHtml(e.to)}</div>
      </div>
      <div class="exp-company">${escapeHtml(companyLine(e))}</div>
      <ul class="exp-bullets">
        ${(e.bullets || '').split('\n').filter(Boolean).map((b) => `<li>${escapeHtml(b.replace(/^[–\-•▸]\s*/, ''))}</li>`).join('')}
      </ul>
    </div>`).join(''), root);

  setHtml('cv-projects', (data.projects || []).map((proj) => `
    <div class="project-entry">
      <div class="project-name">${escapeHtml(proj.name)}</div>
      <div class="project-tech">${escapeHtml(proj.tech)}</div>
      <div class="project-desc">${escapeHtml(proj.desc)}</div>
    </div>`).join(''), root);

  setHtml('cv-education', (data.education || []).map((e) => `
    <div class="edu-entry">
      <div class="edu-degree">${escapeHtml(e.degree)}</div>
      <div class="edu-school">${escapeHtml(e.school)}</div>
      <div class="edu-year">${escapeHtml(e.year)}</div>
    </div>`).join(''), root);

  setHtml('cv-certifications', (data.certifications || []).map((c) =>
    `<li><span>${escapeHtml(c.name)}</span><span class="cert-issuer">${escapeHtml(c.issuer)}</span></li>`
  ).join(''), root);
}

function renderNordic(data, root) {
  const p = data.personal || {};
  setText('cv-name', p.name, root);
  setText('cv-title', p.title, root);
  setText('cv-email', p.email, root);
  setText('cv-phone', p.phone, root);
  setText('cv-location', p.location, root);
  setText('cv-linkedin', p.linkedin, root);
  setText('cv-github', p.github, root);
  setText('cv-portfolio', p.portfolio, root);
  setText('cv-summary', data.summary, root);

  setHtml('cv-skills-dots', (data.skillBars || []).map((s) => `
    <div class="skill-row">
      <span class="skill-label">${escapeHtml(s.name)}</span>
      <div class="dots">${skillDots(s.level)}</div>
    </div>`).join(''), root);

  const tags = (data.techTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  setHtml('cv-tech-tags', tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(''), root);

  setHtml('cv-experience', (data.experience || []).map((e) => `
    <div class="exp-block">
      <div class="exp-meta"><span class="exp-role">${escapeHtml(e.role)}</span><span class="exp-date">${escapeHtml(e.from)} – ${escapeHtml(e.to)}</span></div>
      <div class="exp-co">${escapeHtml(companyLine(e))}</div>
      <ul class="exp-pts">${(e.bullets || '').split('\n').filter(Boolean).map((b) => `<li>${escapeHtml(b.replace(/^[–\-•▸]\s*/, ''))}</li>`).join('')}</ul>
    </div>`).join(''), root);

  setHtml('cv-projects', (data.projects || []).map((proj) => `
    <div class="proj-block">
      <div class="proj-name">${escapeHtml(proj.name)}</div>
      <div class="proj-tech">${escapeHtml(proj.tech)}</div>
      <div class="proj-desc">${escapeHtml(proj.desc)}</div>
    </div>`).join(''), root);

  setHtml('cv-education', (data.education || []).map((e) => `
    <div class="edu-block">
      <div class="edu-deg">${escapeHtml(e.degree)}</div>
      <div class="edu-sch">${escapeHtml(e.school)}</div>
      <div class="edu-yr">${escapeHtml(e.year)}</div>
    </div>`).join(''), root);

  setHtml('cv-certifications', (data.certifications || []).map((c) =>
    `<div class="cert-row"><span>${escapeHtml(c.name)}</span><span class="cert-iss">${escapeHtml(c.issuer)}</span></div>`
  ).join(''), root);
}

function brutalistNameHtml(name) {
  const { first, last } = splitName(name);
  const up = (s) => escapeHtml((s || '').toUpperCase());
  if (!first && !last) return '';
  if (!last) return up(first);
  return `${up(first)}<br>${up(last)}`;
}

function brutalistCoLine(entry) {
  const company = (entry.company || '').toUpperCase();
  const location = (entry.location || '').toUpperCase();
  return location ? `${company} · ${location}` : company;
}

function renderBrutalist(data, root) {
  const p = data.personal || {};
  setHtml('cv-name', brutalistNameHtml(p.name), root);
  setText('cv-title', (p.title || '').toUpperCase(), root);
  setText('cv-email', p.email, root);
  setText('cv-phone', p.phone, root);
  setText('cv-location', p.location, root);
  setText('cv-github', p.github, root);
  setText('cv-linkedin', p.linkedin, root);
  setText('cv-portfolio', p.portfolio, root);
  setText('cv-summary', data.summary, root);

  setHtml(
    'cv-skills',
    (data.skillBars || [])
      .map(
        (s) =>
          `<li>${escapeHtml(s.name)}<span class="skill-pct">${Math.min(100, Math.max(0, s.level || 0))}%</span></li>`
      )
      .join(''),
    root
  );

  const tags = (data.techTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  setHtml('cv-tech-tags', tags.map((t) => `<span class="tag-b">${escapeHtml(t)}</span>`).join(''), root);

  const langs = (data.languages || '').split('\n').map((l) => l.trim()).filter(Boolean);
  setHtml(
    'cv-languages',
    langs
      .map((l) => {
        const parts = l.split('|').map((x) => x.trim());
        return `<div class="lang-b"><span>${escapeHtml(parts[0] || '')}</span><span class="lang-l">${escapeHtml((parts[1] || '').toUpperCase())}</span></div>`;
      })
      .join(''),
    root
  );

  setHtml(
    'cv-experience',
    (data.experience || [])
      .map((e, i) => {
        const num = String(i + 1).padStart(2, '0');
        const bullets = (e.bullets || '')
          .split('\n')
          .filter(Boolean)
          .map((b) => `<li>${escapeHtml(b.replace(/^[–\-•▸]\s*/, ''))}</li>`)
          .join('');
        return `<div class="exp-item">
      <div class="exp-num">${num}</div>
      <div class="exp-content">
        <div class="exp-role">${escapeHtml((e.role || '').toUpperCase())}</div>
        <div class="exp-meta-row"><span class="exp-co">${escapeHtml(brutalistCoLine(e))}</span><span class="exp-date">${escapeHtml(e.from)} – ${escapeHtml(e.to)}</span></div>
        <ul class="exp-pts">${bullets}</ul>
      </div>
    </div>`;
      })
      .join(''),
    root
  );

  setHtml(
    'cv-projects',
    (data.projects || [])
      .map(
        (proj) => `<div class="proj-card">
      <div class="proj-name">${escapeHtml((proj.name || '').toUpperCase())}</div>
      <div class="proj-tech">${escapeHtml((proj.tech || '').toUpperCase())}</div>
      <div class="proj-desc">${escapeHtml(proj.desc)}</div>
    </div>`
      )
      .join(''),
    root
  );

  setHtml(
    'cv-education',
    (data.education || [])
      .map(
        (e) => `<div class="edu-b">
      <div class="edu-deg">${escapeHtml((e.degree || '').toUpperCase())}</div>
      <div class="edu-sch">${escapeHtml(e.school)}</div>
      <div class="edu-yr">${escapeHtml(e.year)}</div>
    </div>`
      )
      .join(''),
    root
  );

  setHtml(
    'cv-certifications',
    (data.certifications || [])
      .map(
        (c) => `<div class="cert-b"><div class="cert-n">${escapeHtml(c.name)}</div><div class="cert-i">${escapeHtml(c.issuer)}</div></div>`
      )
      .join(''),
    root
  );
}

function renderArtdeco(data, root) {
  const p = data.personal || {};
  const { first, last } = splitName(p.name);
  const nameHtml = last
    ? `${escapeHtml(first)}<br/>${escapeHtml(last)}`
    : escapeHtml(first || p.name || '');
  setHtml('cv-name', nameHtml, root);
  setText('cv-title', p.title, root);

  const contactRows = [
    ['Email', p.email],
    ['Phone', p.phone],
    ['Location', p.location],
    ['LinkedIn', p.linkedin],
    ['GitHub', p.github],
    ['Portfolio', p.portfolio],
  ].filter(([, val]) => val && String(val).trim());
  setHtml(
    'cv-contact',
    contactRows
      .map(([lbl, val]) => `<li><span class="lbl">${lbl}</span>${escapeHtml(val)}</li>`)
      .join(''),
    root
  );

  setHtml(
    'cv-skill-bars',
    (data.skillBars || [])
      .map(
        (s) => `<div class="skill-item"><div class="skill-name">${escapeHtml(s.name)}</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100, Math.max(0, s.level || 0))}%"></div></div></div>`
      )
      .join(''),
    root
  );

  const tags = (data.techTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  setHtml('cv-tech-tags', tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(''), root);

  const langs = (data.languages || '').split('\n').map((l) => l.trim()).filter(Boolean);
  setHtml(
    'cv-languages',
    langs
      .map((l) => {
        const parts = l.split('|').map((x) => x.trim());
        return `<div class="lang-item"><span>${escapeHtml(parts[0] || '')}</span><span class="lang-lvl">${escapeHtml(parts[1] || '')}</span></div>`;
      })
      .join(''),
    root
  );

  setText('cv-summary', data.summary, root);

  setHtml(
    'cv-experience',
    (data.experience || [])
      .map(
        (e) => `<div class="exp-block">
      <div class="exp-head"><span class="exp-role">${escapeHtml(e.role)}</span><span class="exp-date">${escapeHtml(e.from)} – ${escapeHtml(e.to)}</span></div>
      <div class="exp-co">${escapeHtml(companyLine(e).toUpperCase())}</div>
      <ul class="exp-pts">${(e.bullets || '').split('\n').filter(Boolean).map((b) => `<li>${escapeHtml(b.replace(/^[–\-•▸]\s*/, ''))}</li>`).join('')}</ul>
    </div>`
      )
      .join(''),
    root
  );

  setHtml(
    'cv-projects',
    (data.projects || [])
      .map(
        (proj) => `<div class="proj-block">
      <div class="proj-name">${escapeHtml(proj.name)}</div>
      <div class="proj-tech">${escapeHtml(proj.tech)}</div>
      <div class="proj-desc">${escapeHtml(proj.desc)}</div>
    </div>`
      )
      .join(''),
    root
  );

  setHtml(
    'cv-education',
    (data.education || [])
      .map(
        (e) => `<div class="edu-block">
      <div>
        <div class="edu-deg">${escapeHtml(e.degree)}</div>
        <div class="edu-sch">${escapeHtml(e.school)}</div>
      </div>
      <div class="edu-yr">${escapeHtml(e.year)}</div>
    </div>`
      )
      .join(''),
    root
  );

  setHtml(
    'cv-certifications',
    (data.certifications || [])
      .map(
        (c) =>
          `<div class="cert-row"><span>${escapeHtml(c.name)}</span><span class="cert-iss">${escapeHtml(c.issuer)}</span></div>`
      )
      .join(''),
    root
  );
}

function renderEditorial(data, root) {
  const p = data.personal || {};
  const { first, last } = splitName(p.name);
  setHtml('cv-name-wrap', `${escapeHtml(first)}${last ? ` <em>${escapeHtml(last)}</em>` : ''}`, root);
  setText('cv-tagline', p.title, root);
  setText('cv-email', p.email, root);
  setText('cv-phone', p.phone, root);
  setText('cv-location', p.location, root);
  setText('cv-linkedin', p.linkedin, root);
  setText('cv-github', p.github, root);
  setText('cv-portfolio', p.portfolio, root);
  setText('cv-summary', data.summary, root);

  setHtml('cv-skill-bars', (data.skillBars || []).map((s) => `
    <div class="skill-item-l">
      <div class="skill-name-l">${escapeHtml(s.name)}</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100, Math.max(0, s.level || 0))}%"></div></div>
    </div>`).join(''), root);

  const tags = (data.techTags || '').split(',').map((t) => t.trim()).filter(Boolean);
  setHtml('cv-tech-tags', tags.map((t) => `<span class="tag-c">${escapeHtml(t)}</span>`).join(''), root);

  const langs = (data.languages || '').split('\n').map((l) => l.trim()).filter(Boolean);
  setHtml('cv-languages', langs.map((l) => {
    const parts = l.split('|').map((x) => x.trim());
    return `<div class="lang-item"><span>${escapeHtml(parts[0] || '')}</span><span class="lang-lvl">${escapeHtml(parts[1] || '')}</span></div>`;
  }).join(''), root);

  setHtml('cv-certifications', (data.certifications || []).map((c) => `
    <div class="cert-item-l">
      <div class="cert-name-l">${escapeHtml(c.name)}</div>
      <div class="cert-iss-l">${escapeHtml(c.issuer)}</div>
    </div>`).join(''), root);

  setHtml('cv-experience', (data.experience || []).map((e) => `
    <div class="exp-item">
      <div class="exp-top"><span class="exp-role">${escapeHtml(e.role)}</span><span class="exp-date-badge">${escapeHtml(e.from)} – ${escapeHtml(e.to)}</span></div>
      <div class="exp-co">${escapeHtml(companyLine(e).toUpperCase())}</div>
      <ul class="exp-list">${(e.bullets || '').split('\n').filter(Boolean).map((b) => `<li>${escapeHtml(b.replace(/^[–\-•]\s*/, ''))}</li>`).join('')}</ul>
    </div>`).join(''), root);

  setHtml('cv-projects', (data.projects || []).map((proj) => `
    <div class="proj-item">
      <div class="proj-name">${escapeHtml(proj.name)}</div>
      <div class="proj-tech">${escapeHtml(proj.tech)}</div>
      <div class="proj-desc">${escapeHtml(proj.desc)}</div>
    </div>`).join(''), root);

  setHtml('cv-education', (data.education || []).map((e) => `
    <div class="edu-item">
      <div><div class="edu-deg">${escapeHtml(e.degree)}</div><div class="edu-sch">${escapeHtml(e.school)}</div></div>
      <div class="edu-yr-r">${escapeHtml(e.year)}</div>
    </div>`).join(''), root);
}

function populateFormFields() {
  if (!cvData) return;
  const p = cvData.personal || {};
  setFieldValue('f-name', p.name);
  setFieldValue('f-title', p.title);
  setFieldValue('f-email', p.email);
  setFieldValue('f-phone', p.phone);
  setFieldValue('f-location', p.location);
  setFieldValue('f-linkedin', p.linkedin);
  setFieldValue('f-github', p.github);
  setFieldValue('f-portfolio', p.portfolio);
  setFieldValue('f-summary', cvData.summary);
  setFieldValue('f-tech-tags', cvData.techTags);
  setFieldValue('f-languages', cvData.languages);
}

function openModal() {
  if (!cvData) return;
  populateModal();
  $('modal-overlay').classList.add('active');
}

function closeModal() {
  $('modal-overlay').classList.remove('active');
}

const GENERATE_LOADING_STEPS = [
  'Analyzing your background…',
  'Drafting experience & skills…',
  'Structuring projects & education…',
  'Applying professional wording…',
  'Almost done…',
];

let generateStepTimer = null;

function openGenerateModal() {
  const overlay = $('generate-overlay');
  const status = $('generate-status');
  const btn = $('btn-run-generate');
  if (!overlay) return;
  setGenerateLoading(false);
  if (status) {
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('is-error', 'is-busy');
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Generate CV';
  }
  overlay.classList.add('active');
  const prompt = $('generate-prompt');
  if (prompt) prompt.focus();
}

function closeGenerateModal() {
  const modal = $('generate-modal');
  if (modal?.classList.contains('is-generating')) return;
  const overlay = $('generate-overlay');
  if (overlay) overlay.classList.remove('active');
}

function setGenerateLoading(active) {
  const loading = $('generate-loading');
  const body = $('generate-body');
  const modal = $('generate-modal');
  const prompt = $('generate-prompt');
  const cancelBtn = $('btn-generate-cancel');
  const sidebarBtn = $('btn-generate');
  const actions = $('generate-actions');

  if (loading) {
    loading.hidden = !active;
    loading.setAttribute('aria-busy', active ? 'true' : 'false');
  }
  if (body) body.hidden = active;
  if (actions) actions.hidden = active;
  if (modal) modal.classList.toggle('is-generating', active);
  if (prompt) prompt.disabled = active;
  if (cancelBtn) cancelBtn.disabled = active;
  if (sidebarBtn) sidebarBtn.disabled = active;

  if (active) startGenerateStepCycle();
  else stopGenerateStepCycle();
}

function startGenerateStepCycle() {
  const stepEl = $('generate-loading-step');
  let index = 0;
  if (stepEl) stepEl.textContent = GENERATE_LOADING_STEPS[0];
  stopGenerateStepCycle();
  generateStepTimer = setInterval(() => {
    index = (index + 1) % GENERATE_LOADING_STEPS.length;
    if (stepEl) {
      stepEl.textContent = GENERATE_LOADING_STEPS[index];
      stepEl.style.animation = 'none';
      stepEl.offsetHeight;
      stepEl.style.animation = '';
    }
  }, 2800);
}

function stopGenerateStepCycle() {
  if (generateStepTimer) {
    clearInterval(generateStepTimer);
    generateStepTimer = null;
  }
}

function setGenerateStatus(message, { error = false, busy = false } = {}) {
  const el = $('generate-status');
  if (!el) return;
  el.hidden = !message;
  el.textContent = message;
  el.classList.toggle('is-error', !!error);
  el.classList.toggle('is-busy', !!busy);
}

async function runGenerate() {
  const promptEl = $('generate-prompt');
  const btn = $('btn-run-generate');
  const prompt = promptEl?.value?.trim() || '';
  if (prompt.length < 20) {
    setGenerateStatus('Please describe your background in at least 20 characters.', { error: true });
    return;
  }

  setGenerateStatus('');
  setGenerateLoading(true);
  if (btn) btn.disabled = true;

  try {
    const res = await apiFetch('/api/cv/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || `Server error (${res.status})`);
    }
    if (!body?.data) throw new Error('Invalid response from server');

    cvData = body.data;
    cvData.template = TEMPLATES[cvData.template] ? cvData.template : activeTemplate;
    await mountTemplate(cvData.template);
    renderCV();
    populateFormFields();
    setGenerateLoading(false);
    closeGenerateModal();
    setSaveStatus('');
  } catch (err) {
    if (err.message === 'Unauthorized') {
      setGenerateLoading(false);
      return;
    }
    setGenerateLoading(false);
    setGenerateStatus(err.message || 'Generation failed — try again', { error: true });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Generate CV';
    }
  }
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.modal-tab').forEach((b) => b.classList.remove('active'));
  $(id).classList.add('active');
  btn.classList.add('active');
}

function populateModal() {
  populateFormFields();
  $('f-experience-entries').innerHTML = (cvData.experience || []).map((e, i) => expEntryHTML(e, i)).join('');
  $('f-project-entries').innerHTML = (cvData.projects || []).map((p, i) => projectEntryHTML(p, i)).join('');
  $('f-education-entries').innerHTML = (cvData.education || []).map((e, i) => eduEntryHTML(e, i)).join('');
  $('f-skill-bars').innerHTML = (cvData.skillBars || []).map((s, i) => skillBarHTML(s, i)).join('');
  $('f-cert-entries').innerHTML = (cvData.certifications || []).map((c, i) => certEntryHTML(c, i)).join('');
}

function expEntryHTML(e, i) {
  return `<div class="dynamic-entry">
    <button type="button" class="remove-btn" onclick="removeItem('experience', ${i})">×</button>
    <div class="field-row">
      <div class="field-group"><label>Job Title</label><input type="text" id="exp-${i}-role" value="${escapeHtml(e.role)}"/></div>
      <div class="field-group"><label>Company</label><input type="text" id="exp-${i}-company" value="${escapeHtml(e.company)}"/></div>
    </div>
    <div class="field-row">
      <div class="field-group"><label>Location</label><input type="text" id="exp-${i}-location" value="${escapeHtml(e.location)}"/></div>
      <div class="field-row" style="gap:8px">
        <div class="field-group"><label>From</label><input type="text" id="exp-${i}-from" value="${escapeHtml(e.from)}"/></div>
        <div class="field-group"><label>To</label><input type="text" id="exp-${i}-to" value="${escapeHtml(e.to)}"/></div>
      </div>
    </div>
    <div class="field-group"><label>Bullet Points (one per line)</label><textarea id="exp-${i}-bullets" rows="5">${escapeHtml(e.bullets)}</textarea></div>
  </div>`;
}

function projectEntryHTML(p, i) {
  return `<div class="dynamic-entry">
    <button type="button" class="remove-btn" onclick="removeItem('projects', ${i})">×</button>
    <div class="field-group"><label>Project Name</label><input type="text" id="proj-${i}-name" value="${escapeHtml(p.name)}"/></div>
    <div class="field-group"><label>Technologies</label><input type="text" id="proj-${i}-tech" value="${escapeHtml(p.tech)}"/></div>
    <div class="field-group"><label>Description</label><textarea id="proj-${i}-desc" rows="3">${escapeHtml(p.desc)}</textarea></div>
  </div>`;
}

function eduEntryHTML(e, i) {
  return `<div class="dynamic-entry">
    <button type="button" class="remove-btn" onclick="removeItem('education', ${i})">×</button>
    <div class="field-group"><label>Degree / Qualification</label><input type="text" id="edu-${i}-degree" value="${escapeHtml(e.degree)}"/></div>
    <div class="field-group"><label>Institution</label><input type="text" id="edu-${i}-school" value="${escapeHtml(e.school)}"/></div>
    <div class="field-group"><label>Year / GPA</label><input type="text" id="edu-${i}-year" value="${escapeHtml(e.year)}"/></div>
  </div>`;
}

function skillBarHTML(s, i) {
  return `<div class="dynamic-entry" style="padding:10px 14px;margin-bottom:8px">
    <button type="button" class="remove-btn" onclick="removeItem('skillBars', ${i})">×</button>
    <div class="field-row">
      <div class="field-group"><label>Competency Name</label><input type="text" id="sb-${i}-name" value="${escapeHtml(s.name)}"/></div>
      <div class="field-group"><label>Level (0–100)</label><input type="number" id="sb-${i}-level" value="${s.level}" min="0" max="100"/></div>
    </div>
  </div>`;
}

function certEntryHTML(c, i) {
  return `<div class="dynamic-entry">
    <button type="button" class="remove-btn" onclick="removeItem('certifications', ${i})">×</button>
    <div class="field-group"><label>Certification Name</label><input type="text" id="cert-${i}-name" value="${escapeHtml(c.name)}"/></div>
    <div class="field-group"><label>Issuer & Year</label><input type="text" id="cert-${i}-issuer" value="${escapeHtml(c.issuer)}"/></div>
  </div>`;
}

function addExpEntry() {
  cvData.experience.push({ role: '', company: '', location: '', from: '', to: '', bullets: '' });
  populateModal();
  switchToTab('tab-experience');
}
function addProjectEntry() {
  cvData.projects.push({ name: '', tech: '', desc: '' });
  populateModal();
  switchToTab('tab-projects');
}
function addEduEntry() {
  cvData.education.push({ degree: '', school: '', year: '' });
  populateModal();
  switchToTab('tab-education');
}
function addSkillBar() {
  cvData.skillBars.push({ name: '', level: 80 });
  populateModal();
  switchToTab('tab-skills');
}
function addCertEntry() {
  cvData.certifications.push({ name: '', issuer: '' });
  populateModal();
  switchToTab('tab-certs');
}

function removeItem(type, i) {
  cvData[type].splice(i, 1);
  populateModal();
}

function switchToTab(id) {
  const tabs = document.querySelectorAll('.modal-tab');
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach((p) => p.classList.remove('active'));
  tabs.forEach((t) => t.classList.remove('active'));
  $(id).classList.add('active');
  const tabMap = {
    'tab-personal': 0,
    'tab-summary': 1,
    'tab-experience': 2,
    'tab-projects': 3,
    'tab-education': 4,
    'tab-skills': 5,
    'tab-certs': 6,
  };
  tabs[tabMap[id]].classList.add('active');
}

async function applyChanges() {
  cvData.personal = {
    name: $('f-name').value,
    title: $('f-title').value,
    email: $('f-email').value,
    phone: $('f-phone').value,
    location: $('f-location').value,
    linkedin: $('f-linkedin').value,
    github: $('f-github').value,
    portfolio: $('f-portfolio').value,
  };
  cvData.summary = $('f-summary').value;
  cvData.techTags = $('f-tech-tags').value;
  cvData.languages = $('f-languages').value;

  cvData.skillBars = Array.from({ length: cvData.skillBars.length }, (_, i) => ({
    name: ($(`sb-${i}-name`) || { value: '' }).value,
    level: parseInt(($(`sb-${i}-level`) || { value: 80 }).value) || 80,
  }));

  cvData.experience = Array.from({ length: cvData.experience.length }, (_, i) => ({
    role: ($(`exp-${i}-role`) || { value: '' }).value,
    company: ($(`exp-${i}-company`) || { value: '' }).value,
    location: ($(`exp-${i}-location`) || { value: '' }).value,
    from: ($(`exp-${i}-from`) || { value: '' }).value,
    to: ($(`exp-${i}-to`) || { value: '' }).value,
    bullets: ($(`exp-${i}-bullets`) || { value: '' }).value,
  }));

  cvData.projects = Array.from({ length: cvData.projects.length }, (_, i) => ({
    name: ($(`proj-${i}-name`) || { value: '' }).value,
    tech: ($(`proj-${i}-tech`) || { value: '' }).value,
    desc: ($(`proj-${i}-desc`) || { value: '' }).value,
  }));

  cvData.education = Array.from({ length: cvData.education.length }, (_, i) => ({
    degree: ($(`edu-${i}-degree`) || { value: '' }).value,
    school: ($(`edu-${i}-school`) || { value: '' }).value,
    year: ($(`edu-${i}-year`) || { value: '' }).value,
  }));

  cvData.certifications = Array.from({ length: cvData.certifications.length }, (_, i) => ({
    name: ($(`cert-${i}-name`) || { value: '' }).value,
    issuer: ($(`cert-${i}-issuer`) || { value: '' }).value,
  }));

  renderCV();
  closeModal();
  try {
    await saveCV();
  } catch {
    openModal();
  }
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

const generateOverlay = $('generate-overlay');
if (generateOverlay) {
  generateOverlay.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeGenerateModal();
  });
}

async function initAppUser() {
  const user = await fetchCurrentUser();
  if (!user) {
    const next = encodeURIComponent('/app.html');
    location.href = `/login.html?next=${next}`;
    return false;
  }
  const label = $('toolbar-user');
  if (label) label.textContent = user.name || user.email;
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  const logoutBtn = $('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());

  initTemplatePicker();
  try {
    const authed = await initAppUser();
    if (!authed) return;
    await preloadTemplates();
    await loadCV();
  } catch (err) {
    console.error(err);
    setSaveStatus('Failed to initialize app', true);
  }
});

// Expose handlers for inline onclick attributes
window.openModal = openModal;
window.closeModal = closeModal;
window.openGenerateModal = openGenerateModal;
window.closeGenerateModal = closeGenerateModal;
window.runGenerate = runGenerate;
window.switchTab = switchTab;
window.applyChanges = applyChanges;
window.addExpEntry = addExpEntry;
window.addProjectEntry = addProjectEntry;
window.addEduEntry = addEduEntry;
window.addSkillBar = addSkillBar;
window.addCertEntry = addCertEntry;
window.removeItem = removeItem;
