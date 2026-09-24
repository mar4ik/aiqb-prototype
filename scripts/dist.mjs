// Copies the static site into dist/ — the folder Vercel deploys (see vercel.json).
// Run via `npm run build`, after Tailwind has written styles.css.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'doctor-register.html', 'script.js', 'styles.css'];
const DIRS = ['assets', 'fonts'];

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of FILES) cpSync(f, `dist/${f}`);
for (const d of DIRS) cpSync(d, `dist/${d}`, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
console.log('dist/ ready:', [...FILES, ...DIRS].join(', '));
