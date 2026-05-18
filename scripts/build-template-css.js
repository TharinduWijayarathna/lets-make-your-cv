#!/usr/bin/env node
/**
 * Regenerate public/css/{classic,nordic,editorial}.css from template sources.
 * Run: node scripts/build-template-css.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'css');

function extractStyle(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

function stripSections(css) {
  let out = css;
  out = out.replace(/\/\*\s*TOOLBAR\s*\*\/[\s\S]*?(?=\/\*\s*A4|\.cv-page)/i, '');
  out = out.replace(/^\.toolbar[\s\S]*?(?=\/\*\s*A4|\.cv-page)/m, '');
  out = out.replace(/\.btn-edit\{[^}]+\}\s*\.btn-print\{[^}]+\}\s*/g, '');
  out = out.replace(/\/\*\s*MODAL\s*\*\/[\s\S]*?(?=@media print|$)/i, '');
  out = out.replace(/^\.modal-overlay[\s\S]*?(?=@media print|$)/m, '');
  // Remove full @media print block (non-greedy { } would leave .no-print rules behind)
  out = out.replace(/@media print\s*\{[\s\S]*\}\s*/g, '');
  // Strip any orphaned print-rule fragments
  out = out.replace(/\.cv-page\{box-shadow:none\}\.no-print\{display:none\}\}/g, '');
  out = out.replace(/\.no-print\s*\{\s*display\s*:\s*none\s*;?\s*\}/gi, '');
  out = out.replace(/\*,\*::before,\*::after\{[^}]+\}\s*/g, '');
  out = out.replace(/\*, \*::before, \*::after \{[\s\S]*?\}\s*/m, '');
  out = out.replace(/^body\{[^}]+\}\s*/m, '');
  out = out.replace(/body \{[\s\S]*?\}\s*/m, '');
  return out.trim();
}

function wrapVars(css, bodyClass) {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    css = css.replace(/:root\s*\{[^}]+\}\s*/, '');
    css = `body.${bodyClass} {\n${rootMatch[1].trim()}\n}\n\n${css}`;
  }
  return css;
}

const nordic = wrapVars(
  stripSections(extractStyle(fs.readFileSync(path.join(root, 'scripts/template-sources/cv_template_nordic.html'), 'utf8'))),
  'tpl-nordic'
);
const editorial = wrapVars(
  stripSections(extractStyle(fs.readFileSync(path.join(root, 'scripts/template-sources/cv_template_editorial.html'), 'utf8'))),
  'tpl-editorial'
);

let classic = extractStyle(
  fs.readFileSync(path.join(root, 'scripts/template-sources/cv_template_classic.html'), 'utf8')
);
const printIdx = classic.indexOf('/* =====================\n       PRINT STYLES');
const toolbarIdx = classic.indexOf('/* =====================\n       TOOLBAR');
if (printIdx !== -1) classic = classic.slice(0, printIdx);
if (toolbarIdx !== -1) classic = classic.slice(0, toolbarIdx);
classic = classic
  .replace(/\*, \*::before, \*::after \{[\s\S]*?\}\s*/m, '')
  .replace(/body \{[\s\S]*?\}\s*/m, '')
  .trim();

const brutalist = wrapVars(
  stripSections(
    extractStyle(
      fs.readFileSync(path.join(root, 'scripts/template-sources/cv_template_brutalist.html'), 'utf8')
    )
  ),
  'tpl-brutalist'
);
const artdeco = wrapVars(
  stripSections(
    extractStyle(fs.readFileSync(path.join(root, 'scripts/template-sources/cv_template_artdeco.html'), 'utf8'))
  ),
  'tpl-artdeco'
);

fs.writeFileSync(path.join(outDir, 'nordic.css'), nordic);
fs.writeFileSync(path.join(outDir, 'editorial.css'), editorial);
fs.writeFileSync(path.join(outDir, 'classic.css'), classic);
fs.writeFileSync(path.join(outDir, 'brutalist.css'), brutalist);
fs.writeFileSync(path.join(outDir, 'artdeco.css'), artdeco);
console.log('Wrote classic.css, nordic.css, editorial.css, brutalist.css, artdeco.css');
