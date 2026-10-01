// Brand check (npm run lint): fails when a colour or a piece of type outside the brandbook sneaks in.
// BRAND.md is the source: its colour table lists the allowed colours, its type scale table the allowed sizes.
//
// Colour
//   1. tailwind.css @theme switches Tailwind's stock palette off (--color-*: initial).
//   2. Every colour token in @theme is an exact hex from BRAND.md, a campaign colour (--color-campaign-*,
//      BRAND.md: a campaign can bring its own scheme), or derived from other tokens.
//   3. Outside @theme there are no raw colours (hex, rgb(), oklch(), named colours…): only var(--color-…).
//   4. Every var(--color-…) in the stylesheet, the pages and script.js points at a token that exists.
// Typography
//   5. @theme switches Tailwind's type scale off (--text-*, --font-weight-*, --tracking-*, --leading-*: initial).
//   6. The size tokens are --text-aqb-* and match BRAND.md's type scale one to one; weights are 400 / 600 / 800.
//   7. Outside @theme, font-size / font-weight / letter-spacing / line-height / font-family only use those tokens
//      (line-height may also be a layout box, --spacing(n), or 0), and @apply only brings in text-aqb-* type.
//   8. The pages load no other typeface (no Google Fonts / Typekit links).
//
// Usage: node scripts/lint-brand.mjs [colors|type]   (no argument: both)
import { readFileSync } from 'node:fs';

const only = process.argv[2];
const BRAND = 'BRAND.md';
const CSS = 'tailwind.css';
const PAGES = ['index.html', 'doctor-register.html'];
const REFS = [CSS, ...PAGES, 'script.js'];

const problems = [];
const report = (file, line, msg) => problems.push(`${file}:${line}  ${msg}`);
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const blank = (t) => t.replace(/[^\n]/g, ' ');   // keeps line breaks, so line numbers still match
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, blank);

const brand = readFileSync(BRAND, 'utf8');
const css = stripComments(readFileSync(CSS, 'utf8'));
const themeStart = css.indexOf('@theme {');
const themeEnd = css.indexOf('\n}', themeStart);
if (themeStart < 0) report(CSS, 1, 'no @theme block');
const theme = css.slice(themeStart, themeEnd);
const themeLine = (index) => lineOf(css, themeStart + index);
// The stylesheet outside @theme, with @font-face blocks blanked (they declare the typeface itself)
const outside = (css.slice(0, themeStart) + blank(theme) + css.slice(themeEnd))
  .replace(/@font-face\s*\{[^}]*\}/g, blank);
const declarations = (prop) =>
  [...outside.matchAll(new RegExp(`(?<![\\w-])${prop}\\s*:\\s*([^;{}]+)`, 'gi'))].map((m) => ({ value: m[1].trim(), line: lineOf(outside, m.index) }));
const mustReset = (ns) => {
  if (!new RegExp(`--${ns}-\\*\\s*:\\s*initial`).test(theme)) report(CSS, lineOf(css, themeStart), `@theme must switch Tailwind's defaults off: --${ns}-*: initial;`);
};

// ---------- Colour ----------
const defined = new Set();
if (only !== 'type') {
  const brandHexes = new Set([...brand.matchAll(/\|\s*`?(#[0-9a-f]{6})`?\s*\|/gi)].map((m) => m[1].toLowerCase()));
  if (!brandHexes.size) report(BRAND, 1, 'no hex colours found in the colour table');
  mustReset('color');

  const RAW = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi;
  const NAMED = /\b(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|stop-color|caret-color|accent-color|text-decoration-color|(?:box|text)-shadow|-webkit-text-stroke(?:-color)?)\s*:[^;{}]*?\b(black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|teal|navy|maroon|olive|lime|aqua|fuchsia|cyan|magenta|brown|gold|violet|indigo|tan)\b/gi;

  for (const m of theme.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const [, name, value] = m;
    defined.add(name);
    if (!(value.match(RAW) ?? []).length) continue;   // derived from other tokens
    if (name.startsWith('campaign-')) continue;
    if (!brandHexes.has(value.trim().toLowerCase())) report(CSS, themeLine(m.index), `--color-${name}: ${value.trim()} is not a brand colour (BRAND.md)`);
  }
  // custom property names (e.g. --color-black) must not read as named colours
  const noVars = outside.replace(/--[a-z0-9-]+/gi, blank);
  for (const m of noVars.matchAll(RAW)) report(CSS, lineOf(noVars, m.index), `raw colour "${m[0]}" — use a brand token, var(--color-…)`);
  for (const m of noVars.matchAll(NAMED)) report(CSS, lineOf(noVars, m.index), `named colour "${m[1]}" — use a brand token, var(--color-…)`);
  for (const file of REFS) {
    const text = file === CSS ? css : readFileSync(file, 'utf8');
    for (const m of text.matchAll(/var\(--color-([a-z0-9-]+)/gi)) {
      if (!defined.has(m[1])) report(file, lineOf(text, m.index), `--color-${m[1]} doesn't exist (not a brand token)`);
    }
  }
}

// ---------- Typography ----------
if (only !== 'colors') {
  ['text', 'font-weight', 'tracking', 'leading'].forEach(mustReset);

  // BRAND.md type scale: | Role | Size (px) | …
  const brandSizes = new Set([...brand.matchAll(/^\|\s*(?:Display|Headline|Subhead|Body|Label|Caption)\s*\|\s*(\d+)\s*\|/gim)].map((m) => Number(m[1])));
  if (!brandSizes.size) report(BRAND, 1, 'no sizes found in the type scale table');
  const tokenSizes = new Set();
  for (const m of theme.matchAll(/--text-([a-z0-9-]+?)\s*:\s*([^;]+);/gi)) {
    const [, name, value] = m;
    if (name.includes('--')) continue;   // --text-x--line-height etc.
    if (!name.startsWith('aqb-')) { report(CSS, themeLine(m.index), `--text-${name}: only AQB text styles (--text-aqb-*) belong in the scale`); continue; }
    const px = /rem$/.test(value.trim()) ? parseFloat(value) * 16 : parseFloat(value);
    tokenSizes.add(px);
    if (!brandSizes.has(px)) report(CSS, themeLine(m.index), `--text-${name}: ${px}px is not on the brand type scale (BRAND.md)`);
  }
  for (const px of brandSizes) if (!tokenSizes.has(px)) report(CSS, lineOf(css, themeStart), `the brand size ${px}px has no --text-aqb-* token`);
  for (const m of theme.matchAll(/--font-weight-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (!['400', '600', '800'].includes(m[2].trim())) report(CSS, themeLine(m.index), `--font-weight-${m[1]}: ${m[2].trim()} — the brand's weights are Regular 400, SemiBold 600, ExtraBold 800`);
  }

  const ok = {
    'font-size': /^(?:var\(--text-aqb-[a-z0-9-]+\)|inherit)$/,
    'font-weight': /^(?:var\(--font-weight-(?:headline|text|detail)\)|inherit)$/,
    'letter-spacing': /^(?:var\(--tracking-aqb\)|var\(--text-aqb-[a-z0-9-]+--letter-spacing\)|0|inherit)$/,
    'line-height': /^(?:var\(--leading-aqb-[a-z]+\)|var\(--text-aqb-[a-z0-9-]+--line-height\)|--spacing\([\d.]+\)|0|inherit)$/,
    'font-family': /^(?:var\(--font-sans\)|inherit)$/,
  };
  for (const [prop, re] of Object.entries(ok)) {
    for (const { value, line } of declarations(prop)) {
      if (!re.test(value)) report(CSS, line, `${prop}: ${value} — use the AQB type tokens (BRAND.md → Typography)`);
    }
  }
  for (const { value, line } of declarations('font')) report(CSS, line, `font: ${value} — set type with @apply text-aqb-…`);
  for (const m of outside.matchAll(/@apply\s+([^;]+);/g)) {
    for (const util of m[1].trim().split(/\s+/)) {
      if (/^(?:text-(?:xs|sm|base|lg|\d?xl)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|tracking-|leading-)/.test(util)) {
        report(CSS, lineOf(outside, m.index), `@apply ${util} — use text-aqb-… (BRAND.md → Typography)`);
      }
    }
  }
  for (const file of PAGES) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/fonts\.googleapis|fonts\.gstatic|use\.typekit|fonts\.bunny/gi)) report(file, lineOf(html, m.index), `loads another typeface (${m[0]}) — Adelle Sans ARM is the only one`);
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} brand problem${problems.length > 1 ? 's' : ''} (BRAND.md)\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
const parts = [];
if (only !== 'type') parts.push(`colours: ${defined.size} tokens, all from the brand palette`);
if (only !== 'colors') parts.push('type: AQB text styles only');
console.log(`✓ ${parts.join(' · ')} (BRAND.md)`);
