const between = (min, max) => Math.round(min + Math.random() * (max - min));

/* ============================================================
   LETTER SHUFFLE — shared by the hero title (03) and the wordmark (10b)
   Each letter sits in a fixed-width slot (as wide as its widest style) inside
   a no-wrap word, so switching fonts never pushes its neighbours and lines only
   break between words. data-f="0…8" picks the style (CSS: .shuffle [data-f]).
   ============================================================ */
const SHUFFLE_STYLES = 9;
const SHUFFLE_TIMING = {
  frame: 140,          // ms between flips — all letters flip together
  revealStart: 450,    // ms before the first letter settles
  revealStep: 130,     // ms between letters settling, left → right (+ random jitter)
  revealJitter: 350,
  settle: 250,         // ms the letters keep flipping after the last one settles
};

// Random letter from the same alphabet and case as ch (Armenian or Latin)
const LETTER_RANGES = [[0x531, 0x556], [0x561, 0x586], [0x41, 0x5a], [0x61, 0x7a]];
function lookalike(ch) {
  const code = ch.codePointAt(0);
  const r = LETTER_RANGES.find(([a, b]) => code >= a && code <= b);
  return r ? String.fromCodePoint(between(r[0], r[1])) : ch;
}
function restyle(el) {
  let f;
  do f = String(between(0, SHUFFLE_STYLES - 1)); while (f === el.dataset.f);
  el.dataset.f = f;
}

// spell(el, text) fills el with slotted letters and returns [{ glyph, ch }] for every non-space letter.
// Slot widths are measured once per character (in em of host's font size), so they survive resizes.
// { styles: false } → letters keep the host's own font, so a slot is just that letter's width.
function makeSpeller(host, { styles = true } = {}) {
  const probe = document.createElement('span');
  probe.className = 'shuffle__probe';
  probe.setAttribute('aria-hidden', 'true');
  host.append(probe);
  const widths = new Map();
  const slotWidth = (ch) => {
    if (!widths.has(ch)) {
      const size = parseFloat(getComputedStyle(host).fontSize);
      let max = 0;
      for (let f = 0; f < (styles ? SHUFFLE_STYLES : 1); f++) {
        probe.innerHTML = styles ? `<span data-f="${f}">${ch}</span>` : `<span>${ch}</span>`;
        max = Math.max(max, probe.firstChild.getBoundingClientRect().width);
      }
      widths.set(ch, max / size);
    }
    return widths.get(ch);
  };
  return function spell(el, text) {
    el.textContent = '';
    const letters = [];
    text.split(' ').forEach((word, i) => {
      if (i) el.append(' ');
      const wordEl = document.createElement('span');
      wordEl.className = 'shuffle__word';
      for (const ch of word) {
        const slot = document.createElement('span');
        slot.className = 'shuffle__slot';
        slot.style.width = `${slotWidth(ch).toFixed(3)}em`;
        const glyph = document.createElement('span');
        glyph.textContent = ch;
        slot.append(glyph);
        wordEl.append(slot);
        letters.push({ glyph, ch });
      }
      el.append(wordEl);
    });
    return letters;
  };
}

// Letters flip through random letters (+ random styles unless styles: false) and settle left → right;
// `also` glyphs just flip styles. onAlmostDone fires `almost` ms before the end (to start something
// that should land together with the last letters). Returns a cancel function.
function shuffleIn(letters, { also = [], styles = true, timing = {}, almost = 0, onAlmostDone, onDone } = {}) {
  const T = { ...SHUFFLE_TIMING, ...timing };
  const revealAt = letters.map((_, i) => T.revealStart + i * T.revealStep + Math.random() * T.revealJitter);
  const end = Math.max(0, ...revealAt) + T.settle;
  const start = performance.now();
  let last = -Infinity, raf = 0, almostFired = !onAlmostDone;
  (function frame(now) {
    const t = now - start;
    if (!almostFired && t >= end - almost) { almostFired = true; onAlmostDone(); }
    if (now - last >= T.frame) {
      last = now;
      letters.forEach(({ glyph, ch }, i) => {
        glyph.textContent = t < revealAt[i] ? lookalike(ch) : ch;
        if (styles) restyle(glyph);
      });
      also.forEach(restyle);
    }
    if (t < end) { raf = requestAnimationFrame(frame); return; }
    letters.forEach(({ glyph, ch }) => { glyph.textContent = ch; });
    onDone?.();
  })(start);
  return () => cancelAnimationFrame(raf);
}

/* ============================================================
   03 · HERO — «Սովորիր» + a phrase whose letters scramble into place
   (the title's own font — no style changes). After each sentence settles, the backdrop simply changes to the
   next palette colour. Colours + matching text colour live in CSS (.hero[data-bg="…"]).
   Phrases live in the data-phrases attribute in index.html.
   ============================================================ */
// Colours change instantly, in this order (the «warhol» palette, see --color-pop-* in tailwind.css)
const HERO_COLORS = ['orange', 'yellow', 'mint', 'cyan', 'tan', 'orchid'];   // the page opens on the first one
const HERO_BRAND = 'AI Քեզ Բան';

(function heroShuffle() {
  const hero = document.querySelector('.hero');
  const el = document.querySelector('.hero__typed');
  if (!hero || !el) return;

  const phrases = JSON.parse(el.dataset.phrases);
  // After every sentence the brand takes the whole line (same size, without «Սովորիր»); the colour changes with every line
  const steps = phrases.flatMap((text) => [{ text }, { text: HERO_BRAND, brand: true }]);
  const HOLD = 1600;                                   // ms every settled line (sentence or «AI Քեզ Բան») stays, with its colour
  const INTRO_DELAY = 300;                             // ms after the page is ready before the first scramble
  // The wordmark's flip style (letters flip together, then settle left → right), just quicker; no font changes (styles: false).
  const TIMING = { frame: 60, revealStart: 80, revealStep: 20, revealJitter: 60, settle: 0 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = hero.querySelector('.hero__bg');
  const nextColor = () => {
    const color = HERO_COLORS[(HERO_COLORS.indexOf(hero.dataset.bg) + 1) % HERO_COLORS.length];
    hero.dataset.bg = bg.dataset.bg = color;
  };

  // Only wait for the font the hero title uses, not every font on the page
  const title = el.closest('.hero__title');
  const heroFonts = document.fonts.load(getComputedStyle(title).font, phrases.join('')).catch(() => {});

  let index = 0;
  heroFonts.then(() => {
    const spell = makeSpeller(title, { styles: false });

    // Invisible slotted copies of every phrase share the title's grid cell, so the title is
    // always as tall as the longest phrase and nothing below moves while it scrambles.
    const line = el.parentElement;
    steps.forEach(({ text, brand }) => {
      const ghost = line.cloneNode(true);
      ghost.classList.add('hero__ghost');
      ghost.classList.toggle('is-brand', !!brand);
      const typed = ghost.querySelector('.hero__typed');
      typed.removeAttribute('data-phrases');
      spell(typed, text);
      line.parentElement.appendChild(ghost);
    });
    const show = () => {
      const { text, brand } = steps[index];
      line.classList.toggle('is-brand', !!brand);
      return spell(el, text);
    };
    show();

    if (reduceMotion) {   // no scrambling: swap whole phrases, then the colour
      setInterval(() => {
        index = (index + 1) % steps.length;
        show();
        nextColor();
      }, HOLD + 1000);
      return;
    }

    let cancel = () => {}, timer = 0, running = false;
    function play(advance = true) {
      if (advance) index = (index + 1) % steps.length;
      if (advance) nextColor();   // the colour switches the instant the next line starts (not for the opening sentence: it keeps the first colour)
      cancel = shuffleIn(show(), {
        styles: false,
        timing: TIMING,
        onDone: () => { timer = setTimeout(play, HOLD); },
      });
    }
    const stop = () => { cancel(); clearTimeout(timer); running = false; };
    // First time: scramble the opening phrase in almost at once, so there's motion straight away.
    // Coming back to the hero later: resume after a short beat.
    let intro = true;
    const start = () => {
      running = true;
      timer = setTimeout(() => { play(!intro); intro = false; }, intro ? INTRO_DELAY : 600);
    };

    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(([entry]) => {   // pause while the hero is scrolled away
      if (entry.isIntersecting && !running) start();
      else if (!entry.isIntersecting && running) stop();
    }).observe(hero);
  });
})();

/* ============================================================
   02 · Sub nav («Դասընթացներ»)
   CSS opens it on hover / focus. Here: click pins it open (touch),
   and picking a link, Escape or an outside click closes it — .is-closed
   overrides hover/focus until the pointer or focus leaves the item.
   ============================================================ */
(function subnav() {
  const item = document.querySelector('.nav__item');
  if (!item) return;
  const trigger = item.querySelector('.nav__trigger');
  const desktop = matchMedia('(width >= 64rem)');   // = Tailwind lg; below it the sub nav is an accordion in the mobile menu

  const isShown = () => !item.classList.contains('is-closed') && item.matches(':hover, :focus-within, .is-open');
  const sync = () => trigger.setAttribute('aria-expanded', String(isShown()));
  const close = () => { item.classList.remove('is-open'); item.classList.add('is-closed'); sync(); };
  const reset = () => { item.classList.remove('is-closed'); sync(); };

  trigger.addEventListener('click', () => {
    if (item.classList.contains('is-open')) return close();
    item.classList.remove('is-closed');
    item.classList.add('is-open');
    sync();
  });
  item.querySelectorAll('.subnav a').forEach((a) => a.addEventListener('click', () => { close(); a.blur(); }));
  item.addEventListener('mouseenter', sync);
  item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) reset(); else sync(); });
  item.addEventListener('focusin', sync);
  // Focus leaving un-pins the menu; .is-closed is only lifted if the pointer isn't still on it
  // (after a link click it is, and hover would reopen it; mouseleave lifts it later).
  item.addEventListener('focusout', (e) => {
    if (!desktop.matches || item.contains(e.relatedTarget)) return;
    item.classList.remove('is-open');
    if (!item.matches(':hover')) reset(); else sync();
  });
  document.addEventListener('keydown', (e) => {
    if (desktop.matches && e.key === 'Escape' && isShown()) { close(); trigger.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (desktop.matches && !item.contains(e.target) && item.classList.contains('is-open')) { item.classList.remove('is-open'); sync(); }
  });
})();

/* ============================================================
   02 · Mobile menu (below lg)
   The burger opens .nav__links as a panel under the pill. Picking a link,
   Escape, tapping the scrim or growing to desktop width closes it.
   ============================================================ */
(function mobileMenu() {
  const wrap = document.querySelector('.nav-wrap');
  const burger = wrap?.querySelector('.nav__burger');
  if (!burger) return;
  const scrim = document.querySelector('.nav-scrim');
  const courses = wrap.querySelector('.nav__item');

  function setOpen(open) {
    if (!open && !wrap.classList.contains('is-menu-open')) return;   // not open (e.g. desktop): leave the sub nav's state alone
    wrap.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (!open && courses) {   // fold the courses accordion back up for next time
      courses.classList.remove('is-open', 'is-closed');
      courses.querySelector('.nav__trigger').setAttribute('aria-expanded', 'false');
    }
  }

  burger.addEventListener('click', () => setOpen(!wrap.classList.contains('is-menu-open')));
  scrim?.addEventListener('click', () => setOpen(false));
  wrap.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('is-menu-open')) { setOpen(false); burger.focus(); }
  });
  matchMedia('(width >= 64rem)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
})();

/* ============================================================
   01 / 04 · Scroll state
   After the page is scrolled: the orange announcement bar slides down out
   of view and the webinar bar appears in its place at the bottom.
   ============================================================ */
(function scrollState() {
  const promo = document.querySelector('.promo');
  const topbar = document.querySelector('.topbar');
  const THRESHOLD = 80;
  let scrolled = null;

  function update() {
    const next = window.scrollY > THRESHOLD;
    if (next === scrolled) return;
    scrolled = next;
    document.body.classList.toggle('is-scrolled', scrolled);
    if (promo) promo.inert = !scrolled;
    if (topbar) topbar.inert = scrolled;   // hidden bars can't be tabbed to
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ============================================================
   06 · TEACHERS — prev / next arrows for the card row
   ============================================================ */
(function teachersCarousel() {
  const row = document.querySelector('.teachers__row');
  const arrows = document.querySelectorAll('.teachers__arrow');
  if (!row || !arrows.length) return;

  const step = () => {
    const card = row.querySelector('.teacher');
    return card ? card.getBoundingClientRect().width + 16 : row.clientWidth * 0.8;
  };

  function update() {
    const max = row.scrollWidth - row.clientWidth - 2;
    arrows[0].disabled = row.scrollLeft <= 2;
    arrows[1].disabled = row.scrollLeft >= max;
    row.classList.toggle('is-end', row.scrollLeft >= max);   // drop the right-edge fade at the end
  }

  arrows.forEach((btn) => {
    btn.addEventListener('click', () => {
      row.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });
  row.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ============================================================
   07 · STATS — duplicate each [data-loop] track (letter crowd, tool logos)
   so the CSS scroll (translateX 50%) loops seamlessly
   ============================================================ */
document.querySelectorAll('[data-loop]').forEach((track) => {
  Array.from(track.children).forEach((li) => track.appendChild(li.cloneNode(true)));
});

/* ============================================================
   09 · REFERRAL — «Ստեղծել պրոմոկոդ» stays disabled until
   the email is valid and a code (2+ chars) follows AI_qez_
   ============================================================ */
(function promoForm() {
  const form = document.querySelector('.promo-form');
  if (!form) return;
  const email = form.elements.email;
  const code = form.elements.code;
  const submit = form.querySelector('button[type="submit"]');

  function update() {
    const cleaned = code.value.replace(/\s+/g, '');   // promo codes can't contain spaces
    if (cleaned !== code.value) code.value = cleaned;
    const ok = email.value.trim() !== '' && email.checkValidity() && cleaned.length >= 2;
    submit.disabled = !ok;
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();               // no backend yet
    if (submit.disabled) return;
  });
  update();
})();

/* ============================================================
   05 · PACKAGES — «AI գրագիտություն / PRO դասընթացներ» pill tabs
   ============================================================ */
(function packageTabs() {
  const tabs = Array.from(document.querySelectorAll('.pill-tabs [role="tab"]'));
  if (!tabs.length) return;

  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next, true);
    });
  });
})();

/* ============================================================
   08 · MISSION — lighthouse, drawn as SVG and added to the mission section
   Green gradients, checkered tower,
   lantern room, railing, roof, hill; the light is warm yellow. The lantern turns: two opposite beams
   stretch out and shrink as they sweep round (a beam pointing away passes
   behind the tower); when one faces the viewer the windows flash and a
   glow spreads. A thin ray shimmers above the roof. Pauses off screen.
   ============================================================ */
(function missionLighthouse() {
  const mission = document.querySelector('.mission');
  if (!mission) return;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 587, H = 900, CX = 293, LY = 260;   // viewBox; lantern centre
  const PERIOD = 7000;                           // ms per full turn of the lantern
  const REACH = 285;                             // beam length when side-on
  const c = (name) => `var(--lh-${name.replace('emerald-', '')})`;   // palette lives in CSS (.mission__lighthouse)
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    parent?.append(n);
    return n;
  };
  const gradient = (defs, id, stops, attrs = {}) => {
    const g = el(attrs.r ? 'radialGradient' : 'linearGradient', { id, ...attrs }, defs);
    for (const [offset, color, opacity = 1] of stops) {
      el('stop', { offset, style: `stop-color:${color};stop-opacity:${opacity}` }, g);
    }
    return g;
  };

  const svg = el('svg', { class: 'mission__lighthouse', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  const defs = el('defs', {}, svg);
  gradient(defs, 'lh-hill', [[0, c('emerald-900')], [.45, c('emerald-600')], [1, c('emerald-200')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  gradient(defs, 'lh-dark', [[0, c('emerald-800')], [1, c('emerald-600')]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  gradient(defs, 'lh-light', [[0, c('emerald-500')], [1, c('emerald-100')]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  gradient(defs, 'lh-lantern', [[0, c('emerald-700')], [1, c('emerald-400')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  gradient(defs, 'lh-ray', [[0, c('glow-400')], [1, c('glow-300'), 0]], { x1: 0, y1: 1, x2: 0, y2: 0 });
  gradient(defs, 'lh-halo', [[0, c('glow-200'), .95], [.5, c('glow-300'), .4], [1, c('glow-300'), 0]], { cx: .5, cy: .5, r: .5 });
  const beamGrads = ['a', 'b'].map((k) => gradient(defs, `lh-beam-${k}`,
    [[0, c('glow-400'), 1], [.6, c('glow-300'), .85], [1, c('glow-300'), 0]],   // rich enough to read on white
    { gradientUnits: 'userSpaceOnUse', x1: CX, y1: LY, x2: CX + 1, y2: LY }));
  const clip = el('clipPath', { id: 'lh-tower' }, defs);
  el('polygon', { points: '195,772 228,345 358,345 391,772' }, clip);

  // layers, back to front: beam behind · halo · lighthouse · beam in front
  const back = el('g', {}, svg);
  const halo = el('circle', { cx: CX, cy: LY, r: 60, fill: 'url(#lh-halo)' }, svg);
  const house = el('g', {}, svg);
  const front = el('g', {}, svg);

  // thin ray above the roof
  const ray = el('polygon', { points: `${CX - 6},150 ${CX + 6},150 ${CX + 2},0 ${CX - 2},0`, fill: 'url(#lh-ray)' }, house);
  // hill
  el('path', { d: `M0 ${H} L205 765 Q${CX} 748 381 765 L${W} ${H} Z`, fill: 'url(#lh-hill)' }, house);
  // tower: checkered halves, clipped to the tapering shape
  const tower = el('g', { 'clip-path': 'url(#lh-tower)' }, house);
  [345, 450, 540, 645, 772].reduce((top, bottom, i) => {
    el('rect', { x: 150, y: top, width: CX - 150, height: bottom - top, fill: `url(#lh-${i % 2 ? 'light' : 'dark'})` }, tower);
    el('rect', { x: CX, y: top, width: 440 - CX, height: bottom - top, fill: `url(#lh-${i % 2 ? 'dark' : 'light'})` }, tower);
    return bottom;
  });
  // gallery: deck, balusters, top rail
  el('rect', { x: 203, y: 334, width: 182, height: 15, rx: 4, fill: 'url(#lh-dark)' }, house);
  for (let x = 211; x <= 375; x += 12) el('rect', { x, y: 306, width: 4, height: 29, fill: c('emerald-700') }, house);
  el('rect', { x: 203, y: 299, width: 182, height: 8, rx: 4, fill: 'url(#lh-dark)' }, house);
  // lantern room + windows (the windows light up)
  el('rect', { x: 242, y: 228, width: 104, height: 72, fill: 'url(#lh-lantern)' }, house);
  const windows = el('g', { fill: c('glow-200') }, house);
  el('rect', { x: 251, y: 238, width: 38, height: 46, rx: 2 }, windows);
  el('rect', { x: 299, y: 238, width: 38, height: 46, rx: 2 }, windows);
  // roof + finial
  el('polygon', { points: `218,231 ${CX},176 368,231`, fill: 'url(#lh-dark)' }, house);
  el('circle', { cx: CX, cy: 166, r: 16, fill: c('emerald-700') }, house);

  // Each beam is drawn twice — once behind the tower, once in front — and the two cross-fade
  // as it swings past the side. (Swapping one polygon between layers made it pop every half turn.)
  const beams = beamGrads.map((g) => ({
    g,
    behind: el('polygon', { fill: `url(#${g.id})` }, back),
    inFront: el('polygon', { fill: `url(#${g.id})` }, front),
  }));
  const smooth = (edge0, edge1, x) => { const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); };

  function render(angle) {
    let glow = 0;
    beams.forEach((beam, i) => {
      const a = angle + i * Math.PI;                 // the two lenses face opposite ways
      const side = Math.sin(a), facing = Math.cos(a);
      const len = REACH * side;                     // signed: − left, + right
      const spread = 18 + 62 * Math.abs(side);      // wider as it reaches out
      const points = `${CX},${LY - 9} ${CX + len},${LY - spread} ${CX + len},${LY + spread} ${CX},${LY + 9}`;
      beam.behind.setAttribute('points', points);
      beam.inFront.setAttribute('points', points);
      beam.g.setAttribute('x2', CX + len || CX + 1);
      const f = smooth(-.3, .3, facing);             // 0 = pointing away (behind the tower) … 1 = towards us
      beam.inFront.style.opacity = f;
      beam.behind.style.opacity = .6 * (1 - f);
      glow = Math.max(glow, Math.max(0, facing) ** 6);  // sharp flash when a beam faces us
    });
    halo.setAttribute('r', 55 + 150 * glow);
    halo.style.opacity = .35 + .65 * glow;
    windows.style.opacity = .55 + .45 * glow;
    ray.style.opacity = .55 + .45 * Math.sin(angle * 2) ** 2;   // smooth shimmer (no sharp dip)
  }

  mission.append(svg);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { render(Math.PI / 2); return; }

  let raf = 0, start = performance.now(), pausedAt = start;
  const tick = (now) => { render(((now - start) / PERIOD) * Math.PI * 2 + Math.PI / 2); raf = requestAnimationFrame(tick); };
  render(Math.PI / 2);
  if (!('IntersectionObserver' in window)) { raf = requestAnimationFrame(tick); return; }
  new IntersectionObserver(([entry]) => {   // only animate while visible; resume where it stopped
    if (entry.isIntersecting && !raf) { start += performance.now() - pausedAt; raf = requestAnimationFrame(tick); }
    else if (!entry.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); }
  }).observe(svg);
})();

/* ============================================================
   08 · MISSION — when the block scrolls into view, the progress bar
   fills from 0 to its target and 1,000,000 counts up alongside it
   ============================================================ */
(function missionProgress() {
  const bar = document.querySelector('.mission .progress__fill');
  const num = document.querySelector('.mission__num');
  if (!bar || !num || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const target = bar.style.width;                       // e.g. "19.88%"
  const total = parseInt(num.textContent.replace(/\D/g, ''), 10);
  const fmt = new Intl.NumberFormat('en-US');
  const DURATION = 1800;

  bar.style.width = '0%';
  num.textContent = '0';

  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(() => { bar.classList.add('is-filling'); bar.style.width = target; });
    const start = performance.now();
    (function tick(now) {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);              // ease-out, matches the bar
      num.textContent = fmt.format(Math.round(total * eased));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }, { threshold: 0.5 });
  io.observe(bar.closest('.mission__right'));
})();

/* ============================================================
   10b · WORDMARK — «AI Քեզ» + a role that changes every few seconds
   (Ուսուցիչ → Բժիշկ → Նկարիչ → Project Manager → Բան → …).
   On each change every letter of both lines flips through random font
   styles; the role's letters also scramble and settle left-to-right
   (LETTER SHUFFLE helpers, top of this file). The words themselves never
   change. Pauses while off screen.
   Add a role: append it to data-words on .wordmark__role.
   ============================================================ */
(function wordmarkShuffle() {
  const box = document.querySelector('.wordmark__box');
  const fixed = document.querySelector('.wordmark__fixed');
  const role = document.querySelector('.wordmark__role');
  if (!box || !fixed || !role) return;

  const WORDS = role.dataset.words.split('|');
  const HOLD = 2400;   // ms a settled word stays still on screen
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.fonts.ready.then(() => {   // slot widths need the real fonts
    const spell = makeSpeller(box);
    const fixedGlyphs = spell(fixed, fixed.textContent.trim()).map(({ glyph }) => glyph);
    fixedGlyphs.forEach(restyle);
    let index = WORDS.indexOf(role.textContent.trim());
    spell(role, WORDS[index]).forEach(({ glyph }) => restyle(glyph));

    if (reduced) {   // no flicker: just swap the role word
      setInterval(() => {
        index = (index + 1) % WORDS.length;
        spell(role, WORDS[index]).forEach(({ glyph }) => restyle(glyph));
      }, HOLD + 1000);
      return;
    }

    let cancel = () => {}, timer = 0, running = false;
    function play() {
      index = (index + 1) % WORDS.length;
      cancel = shuffleIn(spell(role, WORDS[index]), { also: fixedGlyphs, onDone: () => { timer = setTimeout(play, HOLD); } });
    }
    const stop = () => { cancel(); clearTimeout(timer); running = false; };
    const start = () => { running = true; timer = setTimeout(play, 600); };

    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) start();
      else if (!entry.isIntersecting && running) stop();
    }).observe(role.closest('.wordmark'));
  });
})();
