// Copies the static site into dist/ — the folder Vercel deploys (see vercel.json).
// Run via `npm run build`, after Tailwind has written styles.css.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'aigraget.html', 'ai-grager.html', 'raffle-terms.html', 'doctor-register.html', 'join.html', 'script.js', 'join.js', 'styles.css'];
const DIRS = ['assets', 'fonts', 'join', 'aigraget'];   // join/: the role pages · aigraget/team/: «AI գրագետ թիմ» at /aigraget/team   // the hero prototypes stay in archive/, not published

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of FILES) cpSync(f, `dist/${f}`);
for (const d of DIRS) cpSync(d, `dist/${d}`, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
console.log('dist/ ready:', [...FILES, ...DIRS].join(', '));
