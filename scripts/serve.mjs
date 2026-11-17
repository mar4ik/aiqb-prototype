// Local preview server: `npm run serve` (or double-click start-local.command) → http://localhost:8000
// Serves the project folder as it is (no build needed), with vercel.json's rewrites and redirects
// (/aigraget → aigraget.html) and byte ranges, so the lesson videos play and seek. No dependencies.
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[3] || '.');
const port = Number(process.argv[2] || process.env.PORT || 8000);
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const rewrites = Object.fromEntries((vercel.rewrites || []).map((r) => [r.source, r.destination]));
const redirects = Object.fromEntries((vercel.redirects || []).map((r) => [r.source, r.destination]));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.otf': 'font/otf', '.ttf': 'font/ttf',
};

const fileFor = (pathname) => {
  let p = rewrites[pathname] || pathname;
  if (p.endsWith('/')) p += 'index.html';
  const full = normalize(join(root, decodeURIComponent(p)));
  if (!full.startsWith(root)) return null;
  for (const f of [full, `${full}.html`, join(full, 'index.html')]) {
    try { if (statSync(f).isFile()) return f; } catch {}
  }
  return null;
};

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (redirects[pathname]) { res.writeHead(308, { Location: redirects[pathname] }); return res.end(); }
  const file = fileFor(pathname);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  const { size } = statSync(file);
  const headers = { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return req.method === 'HEAD' ? res.end() : createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  return req.method === 'HEAD' ? res.end() : createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`\n  AIQB site running: http://localhost:${port}/aigraget\n  (home page: http://localhost:${port}/ · stop with Ctrl+C or close this window)\n`);
});
