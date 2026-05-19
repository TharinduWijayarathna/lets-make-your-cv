/**
 * Template CSS is scoped to #cv-mount. html2canvas clones a subtree without that
 * ancestor, so selectors never match. Build an off-screen #cv-mount export tree
 * and inject the loaded CV styles into the clone document before rasterizing.
 */

const PDF_EXPORT_HOST_ID = 'pdf-export-host';

function createPdfExportHost(page) {
  const sourceMount = document.getElementById('cv-mount');
  const host = document.createElement('div');
  host.id = PDF_EXPORT_HOST_ID;
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;overflow:visible;opacity:0;pointer-events:none;z-index:-1;';

  const mount = document.createElement('div');
  mount.id = 'cv-mount';
  mount.style.cssText = 'display:block;width:210mm;margin:0;padding:0;';
  if (sourceMount?.className) mount.className = sourceMount.className;

  const tplClass = [...document.body.classList].find((c) => c.startsWith('tpl-'));
  if (tplClass) mount.classList.add(tplClass);

  const pageClone = page.cloneNode(true);
  mount.appendChild(pageClone);
  host.appendChild(mount);
  document.body.appendChild(host);

  return { host, mount, pageEl: pageClone };
}

function removePdfExportHost() {
  document.getElementById(PDF_EXPORT_HOST_ID)?.remove();
}

/** Collect rules that target #cv-mount from already-loaded stylesheets. */
function collectCvMountCssFromSheets() {
  let css = '';
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (let i = 0; i < rules.length; i++) {
        const text = rules[i].cssText;
        if (text && text.includes('#cv-mount')) css += `${text}\n`;
      }
    } catch {
      /* cross-origin or inaccessible sheet — fetched below */
    }
  }
  return css;
}

async function fetchStylesheetText(href) {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.href);
    const res = await fetch(url.href, { cache: 'force-cache' });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

/** Load template + shared CV CSS (from cssRules or network). */
async function loadCvExportCss() {
  let css = collectCvMountCssFromSheets();

  const urls = new Set([`${window.location.origin}/css/shared.css`]);
  const tplLink = document.getElementById('template-css');
  if (tplLink?.href) urls.add(tplLink.href.split('?')[0]);

  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) continue;
    } catch {
      /* inaccessible */
    }
    const href = sheet.ownerNode?.href;
    if (href) urls.add(href.split('?')[0]);
  }

  if (!css || css.length < 200) {
    const chunks = await Promise.all([...urls].map(fetchStylesheetText));
    css = chunks.filter(Boolean).join('\n');
  }

  return css;
}

function preparePdfClone(clonedDoc) {
  const page =
    clonedDoc.querySelector('#cv-mount .cv-page') || clonedDoc.querySelector('.cv-page');
  if (!page) return;

  let mount = clonedDoc.getElementById('cv-mount');
  if (!mount) {
    mount = clonedDoc.createElement('div');
    mount.id = 'cv-mount';
    const parent = page.parentNode;
    if (parent) {
      parent.insertBefore(mount, page);
      mount.appendChild(page);
    }
  }

  const tplClass = [...document.body.classList].find((c) => c.startsWith('tpl-'));
  if (tplClass) {
    clonedDoc.body.classList.add(tplClass);
    mount.classList.add(tplClass);
  }

  page.classList.add('pdf-export');

  clonedDoc.querySelectorAll('.cv-photo-upload, .cv-photo-remove, .cv-photo-input').forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });

  clonedDoc.querySelectorAll('.no-print, .app-sidebar, .site-shell, .ad-rail').forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

function injectCvExportStyles(clonedDoc, cssText) {
  if (!clonedDoc.head || !cssText) return;
  let style = clonedDoc.getElementById('pdf-export-styles');
  if (!style) {
    style = clonedDoc.createElement('style');
    style.id = 'pdf-export-styles';
    clonedDoc.head.appendChild(style);
  }
  style.textContent = cssText;
}

function copyFontLinks(clonedDoc) {
  if (!clonedDoc.head) return;
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.includes('fonts.googleapis')) return;
    if ([...clonedDoc.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === link.href)) {
      return;
    }
    const clone = clonedDoc.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = link.href;
    clonedDoc.head.appendChild(clone);
  });
}

/**
 * Export #cv-mount .cv-page to a PDF sized for A4 (210 × 297 mm).
 */
async function downloadCvPdf() {
  const page = document.querySelector('#cv-mount .cv-page');
  if (!page) {
    if (typeof setSaveStatus === 'function') {
      setSaveStatus('Nothing to download — load your CV first', true);
    }
    return;
  }

  if (typeof html2pdf === 'undefined') {
    if (typeof setSaveStatus === 'function') {
      setSaveStatus('PDF export is unavailable — refresh the page', true);
    }
    return;
  }

  const btn = document.getElementById('btn-download-pdf');
  const prevLabel = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Preparing…';
  }
  if (typeof setSaveStatus === 'function') setSaveStatus('');

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let exportHost = null;

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const cvCss = await loadCvExportCss();
    exportHost = createPdfExportHost(page);
    const { mount, pageEl } = exportHost;
    pageEl.classList.add('pdf-export');

    const filename = buildCvFilename();

    await html2pdf()
      .set({
        margin: [0, 0, 0, 0],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: pageEl.scrollWidth,
          height: pageEl.scrollHeight,
          onclone: (clonedDoc) => {
            preparePdfClone(clonedDoc);
            injectCvExportStyles(clonedDoc, cvCss);
            copyFontLinks(clonedDoc);
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(mount)
      .save();
  } catch (err) {
    console.error('PDF download failed:', err);
    if (typeof setSaveStatus === 'function') {
      setSaveStatus('Could not create PDF — try again', true);
    }
  } finally {
    removePdfExportHost();
    window.scrollTo(scrollX, scrollY);
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevLabel || '↓ Download PDF';
    }
  }
}

function buildCvFilename() {
  const raw =
    (typeof cvData !== 'undefined' && cvData?.personal?.name) ||
    document.querySelector('#cv-mount .cv-page #cv-name')?.textContent ||
    'cv';
  const safe = String(raw)
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${safe || 'cv'}.pdf`;
}

window.downloadCvPdf = downloadCvPdf;
