const between = (min, max) => Math.round(min + Math.random() * (max - min));

/* ============================================================
   LETTER SHUFFLE — shared by the hero title (03) and the wordmark (09b)
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
   (the title's own font — no style changes). Every time a new line starts,
   the three floating icons swap for a new random set (heroFloats below).
   Phrases live in the data-phrases attribute in index.html.
   ============================================================ */
const HERO_BRAND = 'AI քեզ բան';
// Floating icons: assets/hero/icon/<name>.webp. Each entry is one thing; its variants never show together.
const HERO_ICONS = [
  ['gear-bolt', 'gear-bolt-glow'], ['keyboard'], ['laptop-sparkle'], ['pointer'], ['rocket-flying', 'rocket'],
  ['robot-head'], ['chat-bubble'], ['code-brackets'], ['film-clapper'], ['magic-wand'],
];

// Three icons at a time, set around the words of the line they come with (read from that line's
// invisible sizing copy, so they hug the real text, not the title's full-width box). Each sits in a
// fixed slot (HERO_SLOTS) with a little jitter, clear of the text, the fixed nav, the floating
// buttons and each other. With room beside the words (wide screens): a big one beside the headline,
// a big one beside the buttons, the small one above the headline's far end. Otherwise (tablets,
// phones): two above the headline, one below the buttons. Every other line is the mirror image.
// next(line) fades the set out and a fresh one in, with as many things as possible that weren't just on screen.
const HERO_SLOTS = {   // top-left corner of each icon. T: the line's words, A: the buttons, c: centre, s/m: big/small size, g: gap
  beside: [
    ({ T, s, g }) => [T.left - g - s, T.top - s * 0.35],                                          // big, beside the headline
    ({ T, A, s, g }) => [A.right + g * 2, Math.max(A.top + A.height / 2 - s / 2, T.bottom + g)],  // big, beside the buttons
    ({ T, m, g }) => [T.right - m, T.top - g - m],                                                // small, above the headline's end
  ],
  stacked: [
    ({ T, c, s, g }) => [c - T.width * 0.3 - s / 2, T.top - g - s],                  // big, above the headline
    ({ A, c, s, g }) => [c + A.width * 0.25 - s / 2, A.bottom + g],                  // big, below the buttons
    ({ T, c, s, m, g }) => [c + T.width * 0.3 - m / 2, T.top - g * 1.5 - s],        // small, above the headline, a bit higher
  ],
};

function heroFloats(hero) {
  const box = hero.querySelector('.hero__floats');
  const sub = hero.querySelector('.hero__sub');
  const actions = hero.querySelector('.hero__actions');
  if (!box || !sub || !actions) return { next() {} };
  const fabs = document.querySelector('.fabs');   // fixed bottom right: keep icons out from under it
  const GAP = 16;   // px always kept clear around the text, the other icons and the hero's edges
  const SLOT_GAP = 24;   // px between an icon and the text it sits next to
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  HERO_ICONS.flat().forEach((name) => { new Image().src = `assets/hero/icon/${name}.webp`; });   // cached, so swaps are instant
  let current = [], shown = [], mirror = 1, line = null;   // shown: HERO_ICONS indexes on screen

  const hits = (x, y, s, boxes) => boxes.some((b) => x < b.r && x + s > b.l && y < b.b && y + s > b.t);
  // Where an element's text actually is (its line boxes), not its layout box
  function ink(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter((r) => r.width && r.height);
    if (!rs.length) return el.getBoundingClientRect();
    const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  // Places every icon in its slot; returns which ones fit
  function arrange(imgs) {
    if (!imgs.length || !line) return imgs.map(() => false);
    const H = hero.getBoundingClientRect();
    const rel = (r) => ({ left: r.left - H.left, top: r.top - H.top, right: r.right - H.left, bottom: r.bottom - H.top, width: r.width, height: r.height });
    const T = rel(ink(line)), A = rel(actions.getBoundingClientRect());
    const walls = [T, rel(sub.getBoundingClientRect()), A, fabs && rel(fabs.getBoundingClientRect())].filter(Boolean)
      .map((r) => ({ l: r.left - GAP, t: r.top - GAP, r: r.right + GAP, b: r.bottom + GAP }));
    const s = imgs.find((img) => !img.classList.contains('hero__float--sm'))?.offsetWidth ?? imgs[0].offsetWidth;
    const m = imgs.find((img) => img.classList.contains('hero__float--sm'))?.offsetWidth ?? s;
    const beside = Math.min(T.left, H.width - T.right) >= s + SLOT_GAP + GAP;
    const slots = HERO_SLOTS[beside ? 'beside' : 'stacked'];
    const top = parseFloat(getComputedStyle(hero).paddingTop) - GAP * 2;   // just below the fixed nav
    const taken = [];

    return imgs.map((img) => {
      const size = img.offsetWidth;
      let [x, y] = slots[img.dataset.slot]({ T, A, c: H.width / 2, s, m, g: SLOT_GAP });
      if (mirror) x = H.width - x - size;
      x = Math.min(Math.max(x + between(-8, 8), GAP), H.width - size - GAP);
      y = Math.min(Math.max(y + between(-8, 8), top), H.height - size - GAP);
      if (hits(x, y, size, walls) || hits(x, y, size, taken)) return false;   // no room here (small screens): skip it
      taken.push({ l: x - GAP, t: y - GAP, r: x + size + GAP, b: y + size + GAP });
      img.style.setProperty('--x', `${(x / H.width) * 100}%`);
      img.style.setProperty('--y', `${(y / H.height) * 100}%`);
      return true;
    });
  }

  function next(nextLine) {
    line = nextLine;
    current.forEach((img) => {
      img.classList.replace('is-in', 'is-out');
      setTimeout(() => img.remove(), 700);
    });
    mirror = 1 - mirror;
    const fresh = HERO_ICONS.map((_, i) => i).filter((i) => !shown.includes(i));
    shown = [...shuffle(fresh), ...shuffle(shown)].slice(0, 3);
    const imgs = shown.map((kind, i) => {
      const img = document.createElement('img');
      img.className = i === 2 ? 'hero__float hero__float--sm' : 'hero__float';
      img.src = `assets/hero/icon/${pick(HERO_ICONS[kind])}.webp`;
      img.alt = '';
      img.dataset.slot = i;
      img.style.setProperty('--r', `${between(-12, 12)}deg`);
      img.style.setProperty('--bob', `${between(45, 65) / 10}s`);   // fixed per icon, so it never changes pace mid-bob
      box.append(img);
      return img;
    });
    const placed = arrange(imgs);
    current = imgs.filter((img, i) => {
      if (placed[i]) img.classList.add('is-in');   // arrange() measured the layout first, so this fades in
      else img.remove();
      return placed[i];
    });
  }

  // New layout: arrange the icons again. Width only: phones fire resize while scrolling (URL bar).
  let resizeTimer = 0, width = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === width) return;
    width = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const placed = arrange(current);
      current.forEach((img, i) => img.classList.toggle('is-in', placed[i]));
    }, 200);
  });
  return { next };
}

(function heroShuffle() {
  const hero = document.querySelector('.hero');
  const el = document.querySelector('.hero__typed');
  if (!hero || !el) return;

  const phrases = JSON.parse(el.dataset.phrases);
  // After every sentence the brand takes the whole line (same size, without «Սովորիր»); the icons change with every line
  const steps = phrases.flatMap((text) => [{ text }, { text: HERO_BRAND, brand: true }]);
  const HOLD = 1600;                                   // ms every settled line (sentence or «AI քեզ բան») stays, with its icons
  const INTRO_DELAY = 300;                             // ms after the page is ready before the first scramble
  // The wordmark's flip style (letters flip together, then settle left → right), just quicker; no font changes (styles: false).
  const TIMING = { frame: 60, revealStart: 80, revealStep: 20, revealJitter: 60, settle: 0 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const floats = heroFloats(hero);

  // Only wait for the font the hero title uses, not every font on the page
  const title = el.closest('.hero__title');
  const heroFonts = document.fonts.load(getComputedStyle(title).font, phrases.join('')).catch(() => {});

  let index = 0;
  heroFonts.then(() => {
    const spell = makeSpeller(title, { styles: false });

    // Invisible slotted copies of every phrase share the title's grid cell, so the title is
    // always as tall as the longest phrase and nothing below moves while it scrambles.
    // The icons read each line's copy to sit around its words.
    const line = el.parentElement;
    const ghosts = steps.map(({ text, brand }) => {
      const ghost = line.cloneNode(true);
      ghost.classList.add('hero__ghost');
      ghost.classList.toggle('is-brand', !!brand);
      const typed = ghost.querySelector('.hero__typed');
      typed.removeAttribute('data-phrases');
      spell(typed, text);
      line.parentElement.appendChild(ghost);
      return ghost;
    });
    const show = () => {
      const { text, brand } = steps[index];
      line.classList.toggle('is-brand', !!brand);
      return spell(el, text);
    };
    show();
    floats.next(ghosts[index]);

    if (reduceMotion) {   // no scrambling: swap whole phrases, then the icons
      setInterval(() => {
        index = (index + 1) % steps.length;
        show();
        floats.next(ghosts[index]);
      }, HOLD + 1000);
      return;
    }

    let cancel = () => {}, timer = 0, running = false;
    function play(advance = true) {
      if (advance) index = (index + 1) % steps.length;
      if (advance) floats.next(ghosts[index]);   // new icons the instant the next line starts (the opening sentence keeps the first set)
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
   12 · Back to top
   The last floating button shows once the first screen is scrolled
   past (body.is-past-fold) and scrolls back up; focus goes to the logo
   so keyboard users aren't left on a button that just hid itself.
   ============================================================ */
(function backToTop() {
  const btn = document.querySelector('.fab--top');
  if (!btn) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let past = null;

  function update() {
    const next = window.scrollY > window.innerHeight;
    if (next === past) return;
    past = next;
    document.body.classList.toggle('is-past-fold', past);
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    document.querySelector('.nav__logo')?.focus({ preventScroll: true });
  });
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
   05 · «Ի՞նչ սովորել» tiles → packages
   Each tile names the package that teaches it (data-pkg="start" / "levelup";
   Bundle has both). Wide screens: scroll to the cards, name the topic in a
   banner inside that package (.pkg-spot), and once the scroll lands spotlight
   it (.packages[data-spotlight]): it lifts with Bundle and the other package
   fades until hovered. The spotlight ends when the cards leave the screen,
   or at once via the banner's ✕ (which also hides the banner).
   Stacked cards (below lg): just scroll to the package.
   ============================================================ */
(function learnSpotlight() {
  const tiles = document.querySelectorAll('a.learn-tile[data-pkg]');
  const packages = document.querySelector('.packages');
  if (!tiles.length || !packages) return;
  const notes = packages.querySelectorAll('.pkg-spot');
  const wide = matchMedia('(width >= 68.75rem)');   // = --breakpoint-lg: the three cards sit side by side
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const end = () => {
    delete packages.dataset.spotlight;
    packages.classList.remove('is-hover-ready');
  };
  const unlift = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) return;
    end();
    unlift.disconnect();
  });
  // The faded card comes back on hover only after a real mouse move (the cursor may have landed on it)
  const hoverReady = (e) => {
    if (!e.movementX && !e.movementY) return;
    packages.classList.add('is-hover-ready');
    removeEventListener('pointermove', hoverReady);
  };
  let landing = 0;

  tiles.forEach((tile) => tile.addEventListener('click', (e) => {
    const pkg = tile.dataset.pkg;
    const card = packages.querySelector(`.pkg--${pkg}`);
    if (!card) return;   // unknown package: let the link jump to #packages
    e.preventDefault();
    document.getElementById('tab-basic')?.click();   // the cards live on the «AI գրագիտություն» tab
    const heading = card.querySelector('.pkg__name');
    heading.tabIndex = -1;   // keyboard focus follows the scroll, so Tab continues at that card's «Գնել»
    heading.focus({ preventScroll: true });
    const behavior = reduceMotion.matches ? 'instant' : 'smooth';
    if (!wide.matches) { card.scrollIntoView({ behavior }); return; }

    card.querySelector('.pkg-spot__topic').textContent = tile.querySelector('.learn-tile__title').textContent;
    notes.forEach((note) => { note.hidden = !card.contains(note); });   // one banner at a time
    end();   // replay the lift for a second tile
    packages.scrollIntoView({ behavior });

    const id = ++landing;
    const land = () => {
      if (id !== landing || packages.dataset.spotlight) return;
      packages.dataset.spotlight = pkg;
      unlift.observe(packages);
      addEventListener('pointermove', hoverReady);
    };
    addEventListener('scrollend', land, { once: true });
    setTimeout(land, 1000);   // no scrollend (older Safari, or nothing to scroll)
  }));

  // ✕ on a banner: hide it and end the spotlight, so every package is back at full strength
  notes.forEach((note) => note.querySelector('.dismiss')?.addEventListener('click', () => {
    landing++;   // a scroll that is still landing mustn't bring the spotlight back
    note.hidden = true;
    end();
    unlift.disconnect();
    removeEventListener('pointermove', hoverReady);
    note.closest('.pkg').querySelector('.pkg__name').focus({ preventScroll: true });   // the ✕ is gone; keep keyboard focus in its card
  }));
})();

/* ============================================================
   05b · EYE MASK TILES — every photo tile in «Ի՞նչ սովորել» (.learn-tile--eye)
   gets a dark frame with an eye-shaped hole over its photo
   (assets/learn/mask/eye_open.svg). Each eye starts shut, opens when its
   tile scrolls into view, then blinks on its own random clock (now and
   then a quick double), so no two tiles blink together. No blinks while
   hovered (the eye is wide open) or off screen. With reduced motion or no
   IntersectionObserver the eyes just stay open.
   ============================================================ */
(function learnEyes() {
  const tiles = document.querySelectorAll('.learn-tile--eye');
  if (!tiles.length) return;
  // The open eye in a 900×600 box; the closed one is this squashed to 3.77% of its height (CSS)
  const EYE = 'M441 67C229.075 66.9998 8.15657 317.269 8 317.446C8 317.446 246 528 452 528C658 528 900 317.446 900 317.446C899.845 317.268 682.016 67.0002 441 67Z';
  const FRAME = 'x="-20000" y="-20000" width="40900" height="40600"';   // runs past the viewBox to fill any tile shape
  const animate = 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (min, max) => min + Math.random() * (max - min);

  tiles.forEach((tile, i) => {
    tile.querySelector('img').insertAdjacentHTML('afterend',
      `<svg class="learn-tile__eye" viewBox="0 0 900 600" aria-hidden="true" focusable="false">
        <mask id="learn-eye-${i}"><rect ${FRAME} /><path class="learn-tile__eye-hole" d="${EYE}" /></mask>
        <rect ${FRAME} mask="url(#learn-eye-${i})" />
      </svg>`);   // one mask per tile, so each eye blinks on its own
    if (animate) blink(tile);
  });

  function blink(tile) {
    const eye = tile.querySelector('.learn-tile__eye');
    const hole = eye.querySelector('.learn-tile__eye-hole');
    let running = false, timer = 0, left = 0;   // left: blinks still to do in this burst

    const next = () => { timer = setTimeout(close, rand(600, 3200)); };   // 0.6–3.2 s apart
    function close() {
      if (tile.matches(':hover')) { left = 0; next(); return; }
      if (!left) left = Math.random() < 0.35 ? 2 : 1;
      eye.classList.add('is-blinking');
    }
    const blinked = () => {
      eye.classList.remove('is-blinking');
      if (!running) return;
      left--;
      if (left > 0) timer = setTimeout(close, 60);   // quick double blink
      else next();
    };
    hole.addEventListener('animationend', blinked);
    hole.addEventListener('animationcancel', blinked);   // a hover cuts a blink short

    eye.classList.add('is-closed');
    new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.6 && eye.classList.contains('is-closed') && !running) {
        running = true;
        timer = setTimeout(() => {                  // tiles in one row don't open in lockstep either
          eye.classList.remove('is-closed');        // CSS transition does the opening
          timer = setTimeout(close, rand(900, 3000));
        }, rand(0, 400));
      } else if (entry.isIntersecting && !running && !eye.classList.contains('is-closed')) {
        running = true;
        next();
      } else if (!entry.isIntersecting && running) {
        running = false;
        clearTimeout(timer);
        left = 0;
        eye.classList.remove('is-blinking');
      }
    }, { threshold: [0, 0.6] }).observe(tile);
  }
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
   09b · WEBINAR WORDMARK — «AI քեզ» + the role word from data-words
   on .wordmark__role (now just «վեբինար»; with several words, e.g.
   "վեբինար|բժիշկ", it rotates through them). Every few seconds every letter
   of both lines flips through random font styles and the role's letters
   scramble and settle left-to-right (LETTER SHUFFLE helpers, top of this
   file). Pauses while off screen.
   ============================================================ */
(function wordmarkShuffle() {
  const box = document.querySelector('.wordmark__type');
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
