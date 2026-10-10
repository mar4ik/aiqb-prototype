// Vercel Routing Middleware (vercel.json → "proxy"). Runs on the server before the home page is sent.
//
// It asks Hone (the A/B tool) which hero this visitor gets and puts the answer in a cookie on the page's response,
// so index.html's first <script> can set html[data-hero] before anything is drawn. A brand-new visitor then sees the
// right hero from the first screen: nothing hidden, nothing waiting for the browser to fetch agent.js and ask.
// If Hone is slow (400 ms) or down, the page goes out as it is and the old way takes over (the heroes stay hidden
// until Hone answers, 2 s at most). The page itself is the same file for everyone, so the CDN still caches it.
//
// The logic lives in edge/hone-edge.mjs (copied from the Hone repo, edge/): no cookie and no call for visitors who
// send Global Privacy Control / Do Not Track, for crawlers, or for a visitor whose answer is still fresh.
import { next } from '@vercel/functions';
import { decideAtEdge } from './edge/hone-edge.mjs';

export const config = { matcher: '/' };

export default async function proxy(request) {
  let r = null;
  try {
    r = await decideAtEdge(request, {
      api: process.env.HONE_API || 'https://hone-bandit.vercel.app',
      experiment: 'exp_aiqb_ab_1',
      timeoutMs: 400,
      skip: (request, url) =>
        url.searchParams.has('hero') || // ?hero=a is the team's preview: Hone is not asked
        // A browser that already has this page asks "has it changed?" and gets a bare "no" back, and a cookie set on that
        // answer is thrown away (checked on Vercel). That visitor is a returning one: localStorage aiqb_hero has their hero.
        request.headers.has('if-none-match') || request.headers.has('if-modified-since'),
    });
  } catch {
    // never let a problem here stop the page
  }
  const headers = new Headers();
  if (r) {
    for (const cookie of r.cookies) headers.append('set-cookie', cookie);
    headers.set('server-timing', `hone;dur=${r.ms};desc="${r.outcome}"`); // visible in the browser's network panel
  }
  return next({ headers });
}
