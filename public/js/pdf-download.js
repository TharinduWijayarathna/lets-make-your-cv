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

  try {
    if (document.fonts?.ready) await document.fonts.ready;

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
          backgroundColor: null,
          scrollX: 0,
          scrollY: -scrollY,
          width: page.scrollWidth,
          height: page.scrollHeight,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(page)
      .save();
  } catch (err) {
    console.error('PDF download failed:', err);
    if (typeof setSaveStatus === 'function') {
      setSaveStatus('Could not create PDF — try again', true);
    }
  } finally {
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
