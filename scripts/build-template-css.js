#!/usr/bin/env node
/**
 * Regenerate public/css/{classic,nordic,editorial,brutalist,artdeco}.css from template sources.
 * All CV rules are scoped to #cv-mount so they do not override the app sidebar.
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
  out = out.replace(/@media print\s*\{[\s\S]*\}\s*/g, '');
  out = out.replace(/\.cv-page\{box-shadow:none\}\.no-print\{display:none\}\}/g, '');
  out = out.replace(/\.no-print\s*\{\s*display\s*:\s*none\s*;?\s*\}/gi, '');
  out = out.replace(/\*,\*::before,\*::after\{[^}]+\}\s*/g, '');
  out = out.replace(/\*, \*::before, \*::after \{[\s\S]*?\}\s*/m, '');
  out = out.replace(/^body\{[^}]+\}\s*/m, '');
  out = out.replace(/body \{[\s\S]*?\}\s*/m, '');
  return out.trim();
}

function extractVarsBlock(css, tplName) {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  const bodyMatch = css.match(new RegExp(`body\\.${tplName}\\s*\\{([^}]+)\\}`));

  let vars = '';
  if (rootMatch) {
    vars = rootMatch[1].trim();
    css = css.replace(/:root\s*\{[^}]+\}\s*/, '');
  } else if (bodyMatch) {
    vars = bodyMatch[1].trim();
    css = css.replace(new RegExp(`body\\.${tplName}\\s*\\{[^}]+\\}\\s*`), '');
  }

  if (!vars) return { css, header: '' };

  const header = `body.${tplName} #cv-mount,\n#cv-mount.${tplName} {\n${vars}\n}\n\n`;
  return { css: css.trim(), header };
}

/** Prefix class/id selectors so CV template CSS cannot style the app sidebar. */
function scopeRules(css, prefix = '#cv-mount') {
  const prefixSelectors = (block) =>
    block.replace(/^(\s*)([.#][^{]+)\{/gm, (match, indent, selectors) => {
      const scoped = selectors
        .split(',')
        .map((sel) => {
          const s = sel.trim();
          if (!s) return s;
          return `${prefix} ${s}`;
        })
        .join(', ');
      return `${indent}${scoped} {`;
    });

  return prefixSelectors(css);
}

function buildTemplateCss(rawCss, tplName) {
  const stripped = stripSections(rawCss);
  const { css, header } = extractVarsBlock(stripped, tplName);
  return header + scopeRules(css);
}

function readSource(name) {
  return fs.readFileSync(path.join(root, 'scripts/template-sources', name), 'utf8');
}

let classic = extractStyle(readSource('cv_template_classic.html'));
const printIdx = classic.indexOf('/* =====================\n       PRINT STYLES');
const toolbarIdx = classic.indexOf('/* =====================\n       TOOLBAR');
if (printIdx !== -1) classic = classic.slice(0, printIdx);
if (toolbarIdx !== -1) classic = classic.slice(0, toolbarIdx);
classic = classic
  .replace(/\*, \*::before, \*::after \{[\s\S]*?\}\s*/m, '')
  .replace(/body \{[\s\S]*?\}\s*/m, '')
  .trim();

const outputs = {
  classic: buildTemplateCss(classic, 'tpl-classic'),
  nordic: buildTemplateCss(extractStyle(readSource('cv_template_nordic.html')), 'tpl-nordic'),
  editorial: buildTemplateCss(extractStyle(readSource('cv_template_editorial.html')), 'tpl-editorial'),
  brutalist: buildTemplateCss(extractStyle(readSource('cv_template_brutalist.html')), 'tpl-brutalist'),
  artdeco: buildTemplateCss(extractStyle(readSource('cv_template_artdeco.html')), 'tpl-artdeco'),
};

for (const [name, css] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(outDir, `${name}.css`), css);
}

console.log('Wrote scoped classic.css, nordic.css, editorial.css, brutalist.css, artdeco.css');
