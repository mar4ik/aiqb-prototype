/* ============================================================
   join.js — the join pages' script: join.html and the role pages (join/*.html)
   1 · Bubble shapes and peeking eyes ([data-shape])
   2 · Back to top
   3 · Copy link ([data-copy-link])
   The language is set in each page's <head>, before it paints.
   ============================================================ */

// The brand's eyes as an inline 96 × 50 SVG (.eyes: white ovals, black pupils) — as script.js makeEyes
function makeEyes() {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'eyes');
  svg.setAttribute('viewBox', '0 0 96 50');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<ellipse class="eyes__white" cx="23.05" cy="24.98" rx="23.05" ry="24.98"/>'
    + '<ellipse class="eyes__white" cx="72.94" cy="24.98" rx="23.05" ry="24.98"/>'
    + '<circle class="eyes__pupil" cx="23.05" cy="24.98" r="10.93"/><circle class="eyes__pupil" cx="72.94" cy="24.98" r="10.93"/>';
  return svg;
}

/* 1 · Bubble-shaped roles — the main site's «Ի՞նչ սովորել» tiles (script.js → 05c learnShapes), for this page.
   Each [data-shape] card is cut into the brand bubble (BRAND.md → Bubble construction): rounded rectangles merged
   (outer corners 24, inner 12), a stepped top corner and/or one straight, angled tail at a top corner, and a slit in
   the right side where no text sits. The cut lives in the card's top padding, so it never touches the text.
   The eyes peek from just outside the bubble, on the shoulder of the tail's (or the step's) cut-out corner: they
   rise on hover / keyboard focus (on touch screens, while the card is in view), follow the pointer, blink now and
   then. The cut goes in when the card comes into view, and a little deeper on hover. No script: rounded cards. */
(function joinShapes() {
  const cards = [...document.querySelectorAll('[data-shape]')];
  if (!cards.length || !('clipPath' in document.documentElement.style)) return;
  const R = 24, r = 12, TAIL = 22, SLIT = 12, INSET = 16, EYES_GAP = 4, HOVER = 1.3;
  const PUPIL_TRAVEL = { x: 9, y: 10.54 };   // the brand's pupil oval, in the eyes' 96 × 50 units (BRAND.md → Eyes)
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const animating = !reduced && 'IntersectionObserver' in window;
  const progress = new Map();   // card → its cut: 0 a plain rectangle · 1 the bubble · HOVER on hover
  const eyesOf = new Map();     // card → its eyes (in the card's .join-slot, outside the card's clip)

  // A closed path through [x, y, radius] points, each corner rounded (radius 0 = sharp) — as script.js
  function roundedOutline(pts) {
    const K = 0.5523, n = pts.length, parts = [];
    const f = (v) => v.map((c) => c.toFixed(1)).join(' ');
    pts.forEach(([x, y, rad], i) => {
      const [px, py] = pts[(i + n - 1) % n], [nx, ny] = pts[(i + 1) % n];
      const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
      const u1 = [(x - px) / l1, (y - py) / l1], u2 = [(nx - x) / l2, (ny - y) / l2];
      const k = Math.min(rad, l1 / 2, l2 / 2);
      const s = [x - u1[0] * k, y - u1[1] * k], e = [x + u2[0] * k, y + u2[1] * k];
      const c1 = [s[0] + u1[0] * k * K, s[1] + u1[1] * k * K], c2 = [e[0] - u2[0] * k * K, e[1] - u2[1] * k * K];
      parts.push(`${i ? 'L' : 'M'} ${f(s)} C ${f(c1)} ${f(c2)} ${f(e)}`);
    });
    return parts.join(' ') + ' Z';
  }
  // Cuts the card to the outline; a ring along it shows keyboard focus (.shape-ring), as the clip hides the outline
  function cut(el, pts) {
    const d = roundedOutline(pts);
    el.style.clipPath = `path('${d}')`;
    let ring = el.querySelector(':scope > .shape-ring');
    if (!ring) {
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('class', 'shape-ring');
      ring.setAttribute('aria-hidden', 'true');
      ring.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      el.append(ring);
    }
    ring.firstChild.setAttribute('d', d);
    el.classList.add('is-shaped');
  }

  // The slit's depth at height s..s+SLIT: as deep as it can go without reaching any text in that band
  function slitDepth(card, s, W) {
    let reach = 0;
    [...card.children].forEach((child) => {
      if (child.classList.contains('shape-ring')) return;
      const top = child.offsetTop, bottom = top + child.offsetHeight;
      if (bottom < s - 12 || top > s + SLIT + 12) return;
      const right = Math.max(...[...child.querySelectorAll('*'), child]
        .filter((n) => n.getClientRects().length)
        .map((n) => n.getBoundingClientRect().right)) - card.getBoundingClientRect().left;
      reach = Math.max(reach, right);
    });
    return Math.min(W * 0.38, W - reach - 32);
  }

  function shape(card) {
    const W = card.clientWidth, H = card.clientHeight;
    if (!W || !H) return;
    const has = (f) => card.dataset.shape.split(' ').includes(f);
    const pad = parseFloat(getComputedStyle(card).paddingTop);
    const room = pad > 12 ? pad - 12 : Infinity;   // a card's cut stays in its top padding; a photo's may go anywhere
    const p = progress.get(card) ?? 1;
    const a = clamp(W * 0.3, 56, 150);
    const tFull = Math.min(clamp(H * 0.12, 36, 52), room / HOVER);   // the cut's depth when the bubble is whole
    const t = Math.max(2, tFull * p);                                 // …and right now (crop-in, hover)
    const tail = TAIL * Math.min(1, p);                               // the tail leans out as the cut goes in
    const left = has('tail-left') ? 'tail' : has('step-left') ? 'step' : null;
    const right = has('tail-right') ? 'tail' : has('step-right') ? 'step' : null;
    const s = Math.round(H * 0.55);
    const depth = has('slit') ? slitDepth(card, s, W) : 0;

    const pts = [];
    if (left) pts.push([0, t, R], [a, t, r], left === 'tail' ? [a - tail, 0, 0] : [a, 0, R]);
    else pts.push([0, 0, R]);
    if (right) pts.push(right === 'tail' ? [W - a + tail, 0, 0] : [W - a, 0, R], [W - a, t, r], [W, t, R]);
    else pts.push([W, 0, R]);
    if (depth > 48) {
      const d = Math.round(INSET + 2 + (depth - INSET - 2) * Math.min(1, p));   // the slit opens with the cut
      pts.push([W, s, R], [W - d, s, SLIT / 2], [W - d, s + SLIT, SLIT / 2], [W - INSET, s + SLIT, R], [W - INSET, H, R]);
    } else pts.push([W, H, R]);
    pts.push([0, H, R]);
    cut(card, pts);
    placeEyes(card, { left, right, a, t, tFull, W });
  }

  // On the shoulder of the cut-out corner (the tail's if there is one), clear of the raised part by EYES_GAP
  function placeEyes(card, { left, right, a, t, tFull, W }) {
    const side = left === 'tail' ? 'left' : right === 'tail' ? 'right' : left ? 'left' : right ? 'right' : null;
    if (!side) return;
    let eyes = eyesOf.get(card);
    if (!eyes) {
      eyes = makeEyes();   // hidden below the shoulder until they rise (.is-up)
      card.before(eyes);
      eyesOf.set(card, eyes);
    }
    const kind = side === 'left' ? left : right;
    const roomX = (kind === 'tail' ? a - TAIL : a) - 2 * EYES_GAP;
    const w = Math.min(roomX, (tFull - 2 * EYES_GAP) * 96 / 50), h = w * 50 / 96;
    const x = side === 'left' ? roomX + EYES_GAP - w : W - roomX - EYES_GAP;
    Object.assign(eyes.style, {
      left: `${(card.offsetLeft + x).toFixed(1)}px`,
      top: `${(card.offsetTop + t - EYES_GAP - h).toFixed(1)}px`,
      width: `${w.toFixed(1)}px`,
    });
    eyes.dataset.look = side === 'left' ? 'down-right' : 'down-left';   // at rest: looking into their bubble
  }

  // Eases one card's cut to `to` (ms long, after `delay`); `done` runs at the end
  const tweens = new Map();
  function cutTo(card, to, ms, delay = 0, done) {
    cancelAnimationFrame(tweens.get(card));
    const from = progress.get(card) ?? 1, start = performance.now() + delay;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    (function frame(now) {
      const k = Math.min(1, Math.max(0, (now - start) / ms));
      progress.set(card, from + (to - from) * ease(k));
      shape(card);
      if (k < 1) tweens.set(card, requestAnimationFrame(frame));
      else done?.();
    })(performance.now());
  }

  if (animating) cards.forEach((card) => progress.set(card, 0));   // plain rectangles until they come into view
  const all = () => cards.forEach(shape);
  all();
  const resizer = new ResizeObserver((entries) => entries.forEach((en) => shape(en.target)));
  cards.forEach((card) => resizer.observe(card));   // reshape when a card changes size (screen width, language)
  document.fonts?.ready.then(all);

  // Up: the eyes rise from behind the shoulder and the cut goes a little deeper; down: back
  const ready = new Set(animating ? [] : cards);
  const up = (card) => {
    if (!ready.has(card)) return;
    eyesOf.get(card)?.classList.add('is-up');
    if (animating) cutTo(card, HOVER, 320);
  };
  const down = (card) => {
    eyesOf.get(card)?.classList.remove('is-up');
    if (animating && ready.has(card)) cutTo(card, 1, 420);
  };

  // Crop-in: each card's corners are cut once it comes into view
  if (animating) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      cutTo(en.target, 1, 650, 150, () => {
        ready.add(en.target);
        if (en.target.matches(':focus-visible') || (mouse ? en.target.matches(':hover') : en.target.dataset.inView)) up(en.target);   // already focused / pointed at / in view
      });
    }), { threshold: 0.35 });
    cards.forEach((card) => io.observe(card));
  }

  cards.forEach((card) => {
    if (mouse) {
      card.addEventListener('pointerenter', () => up(card));
      card.addEventListener('pointerleave', () => down(card));
    }
    card.addEventListener('focus', () => { if (card.matches(':focus-visible')) up(card); });   // keyboard, not a tap
    card.addEventListener('blur', () => down(card));
  });
  // Touch screens have no hover: the eyes are up while most of the card is in view
  if (!mouse && 'IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
      const card = en.target;
      if (en.isIntersecting) { card.dataset.inView = '1'; up(card); }
      else { delete card.dataset.inView; down(card); }
    }), { threshold: 0.6 });
    cards.forEach((card) => seen.observe(card));
  }
  if (reduced) return;

  // The eyes follow the pointer while it's over the roles (mouse screens only), within the brand's pupil oval
  const section = cards[0].closest('section, article');
  if (mouse && section) {
    let px = 0, py = 0, raf = 0;
    const follow = () => {
      raf = 0;
      eyesOf.forEach((eyes) => {
        const box = eyes.getBoundingClientRect();
        const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160) / d;
        eyes.style.setProperty('--look-x', (dx * k * PUPIL_TRAVEL.x).toFixed(2));
        eyes.style.setProperty('--look-y', (dy * k * PUPIL_TRAVEL.y).toFixed(2));
      });
    };
    section.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(follow); });
    section.addEventListener('pointerleave', () => eyesOf.forEach((eyes) => {
      eyes.style.removeProperty('--look-x');
      eyes.style.removeProperty('--look-y');
    }));
  }

  // Now and then the eyes that are up blink (.eyes.is-blink)
  (function blink() {
    setTimeout(() => {
      const out = [...eyesOf.values()].filter((e) => e.classList.contains('is-up'));
      const eyes = out[Math.floor(Math.random() * out.length)];
      if (eyes) { eyes.classList.add('is-blink'); setTimeout(() => eyes.classList.remove('is-blink'), 140); }
      blink();
    }, 1200 + Math.random() * 2400);
  })();
})();


/* 2 · Back to top — the main site's floating button (.fab--top, tailwind.css · 12), on every screen size. It comes in
   once the first screen is scrolled past (body.is-scrolled + .is-past-fold, as on the main site) and scrolls back up;
   focus goes to the logo, so keyboard users aren't left on a button that just hid itself. */
(function backToTop() {
  const btn = document.querySelector('.fab--top');
  if (!btn) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let past = null;
  const update = () => {
    const next = window.scrollY > window.innerHeight;
    if (next === past) return;
    past = next;
    document.body.classList.toggle('is-scrolled', past);
    document.body.classList.toggle('is-past-fold', past);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
    document.querySelector('.join-logo')?.focus({ preventScroll: true });
  });
})();

/* 3 · Copy link — copies the page's address (without ?lang) and says so on the button for a moment */
(function copyLink() {
  document.querySelectorAll('[data-copy-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = location.origin + location.pathname;
      try { await navigator.clipboard.writeText(url); }
      catch { window.prompt('', url); return; }   // no clipboard access (http, old browser): let them copy it by hand
      btn.classList.add('is-copied');
      clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove('is-copied'), 2000);
    });
  });
})();
