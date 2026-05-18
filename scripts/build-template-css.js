#!/usr/bin/env node
/**
 * Regenerate public/css/{classic,nordic,editorial,brutalist,artdeco,blueprint,circuit,ink}.css from template sources.
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

/** After modal UI in source; includes print so nordic-style templates strip through end of modal. */
const MODAL_COMMENT_END =
  '(?=@media\\s+print\\b|@media\\s*\\(\\s*max-width|:root|\\.blueprint-page|\\.circuit-page|\\.ink-page|\\.newspaper-page|\\.origami-page)';
/** Stops before inline @media print between modal and :root (blueprint, circuit, ink). */
const MODAL_BLOCK_END =
  '(?=@media\\s*\\(\\s*max-width|:root|\\.blueprint-page|\\.circuit-page|\\.ink-page|\\.newspaper-page|\\.origami-page)';

function removeComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Remove @media blocks whose condition matches predicate (brace-aware). */
function removeAtMedia(css, shouldRemove) {
  let out = '';
  let i = 0;

  while (i < css.length) {
    const tail = css.slice(i);
    const m = tail.match(/^@media\s+([^{]+)\{/);
    if (!m) {
      out += css[i];
      i += 1;
      continue;
    }

    const query = m[1].trim();
    const start = i;
    i += m[0].length;
    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      if (depth > 0) i += 1;
    }
    if (i < css.length && css[i] === '}') i += 1;

    if (!shouldRemove(query)) {
      out += css.slice(start, i);
    }
  }

  return out;
}

function stripSections(css) {
  let out = css;
  out = out.replace(/\/\*\s*TOOLBAR\s*\*\/[\s\S]*?(?=\/\*\s*A4|\.cv-page)/i, '');
  out = out.replace(/^\.toolbar[\s\S]*?(?=\/\*\s*A4|\.cv-page)/m, '');
  out = out.replace(/\.btn-edit\{[^}]+\}\s*\.btn-print\{[^}]+\}\s*/g, '');
  out = out.replace(new RegExp(`/\\*\\s*MODAL\\s*\\*/[\\s\\S]*?${MODAL_COMMENT_END}`, 'i'), '');
  out = out.replace(new RegExp(`\\.modal-overlay[\\s\\S]*?${MODAL_BLOCK_END}`, 'i'), '');
  out = out.replace(new RegExp(`\\.modal[\\s\\S]*?${MODAL_BLOCK_END}`, 'i'), '');
  out = removeAtMedia(out, (q) => /^print\b/i.test(q) || /\bmax-width\b/i.test(q));
  out = out.replace(/\.cv-page\{box-shadow:none\}\.no-print\{display:none\}\}/g, '');
  out = out.replace(/\.no-print\s*\{\s*display\s*:\s*none\s*;?\s*\}/gi, '');
  out = out.replace(/\.toolbar\b[^{]*\{[^}]*\}/g, '');
  out = out.replace(/\.toolbar\s+button[^{]*\{[^}]*\}/g, '');
  out = out.replace(/\.btn-edit\{[^}]+\}/g, '');
  out = out.replace(/\.btn-print\{[^}]+\}/g, '');
  out = out.replace(/\*,\*::before,\*::after\{[^}]+\}\s*/g, '');
  out = out.replace(/\*, \*::before, \*::after \{[\s\S]*?\}\s*/m, '');
  /* Do not match `.cv-body` — only the document `body` selector. */
  out = out.replace(/(^|[^-.\w])(body\s*\{[^}]+\}\s*)/g, '$1');
  out = out.replace(/\.cv-page\{box-shadow:none\s*!important\}\s*/g, '');
  out = out.replace(/^h1,h2,h3,p\{[^}]+\}\s*/m, '');
  out = out.replace(/^ul\{[^}]+\}\s*/m, '');
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

function scopeSelectorList(selectors, prefix) {
  return selectors
    .split(',')
    .map((sel) => {
      const s = sel.trim();
      if (!s || s.startsWith('@')) return s;
      if (s.startsWith(prefix)) return s;
      return `${prefix} ${s}`;
    })
    .join(', ');
}

/** Prefix class/id selectors so CV template CSS cannot style the app sidebar. */
function scopeRules(css, prefix = '#cv-mount') {
  let out = '';
  let i = 0;

  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i);
      if (end === -1) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    const open = css.indexOf('{', i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    const selector = css.slice(i, open).trim();
    const looksLikeRule =
      selector &&
      !selector.startsWith('@') &&
      !selector.includes(';') &&
      /[.#a-zA-Z_-]/.test(selector);

    if (looksLikeRule) {
      out += scopeSelectorList(selector, prefix);
    } else {
      out += css.slice(i, open);
    }

    out += '{';
    i = open + 1;

    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css.startsWith('/*', i)) {
        const end = css.indexOf('*/', i);
        const commentEnd = end === -1 ? css.length : end + 2;
        out += css.slice(i, commentEnd);
        i = commentEnd;
        continue;
      }
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      if (depth > 0) {
        out += css[i];
        i += 1;
      }
    }

    if (i < css.length && css[i] === '}') {
      out += '}';
      i += 1;
    }
  }

  return out;
}

function buildTemplateCss(rawCss, tplName) {
  const stripped = removeComments(stripSections(rawCss));
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
  blueprint: buildTemplateCss(extractStyle(readSource('cv_template_blueprint.html')), 'tpl-blueprint'),
  circuit: buildTemplateCss(extractStyle(readSource('cv_template_circuit.html')), 'tpl-circuit'),
  ink: buildTemplateCss(extractStyle(readSource('cv_template_ink.html')), 'tpl-ink'),
  ats: buildTemplateCss(extractStyle(readSource('cv_template_ats_plain.html')), 'tpl-ats'),
  newspaper: buildTemplateCss(extractStyle(readSource('cv_template_newspaper.html')), 'tpl-newspaper'),
  origami: buildTemplateCss(extractStyle(readSource('cv_template_origami.html')), 'tpl-origami'),
  executiveslate: buildTemplateCss(extractStyle(readSource('cv_template_executiveslate.html')), 'tpl-executiveslate'),
};

for (const [name, css] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(outDir, `${name}.css`), css);
}

console.log('Wrote scoped template CSS for', Object.keys(outputs).join(', '));
