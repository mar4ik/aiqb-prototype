/* ============================================================
   03 · HERO — gradient backdrop
   ============================================================ */
// Gradient backdrop: show the scene that belongs to the phrase
function setHeroScene(phraseIndex) {
  document.querySelectorAll('.hero__scene').forEach((el, i) => {
    el.classList.toggle('is-active', i === phraseIndex);
  });
}

/* ============================================================
   03 · HERO — typewriter
   Types a phrase, pauses, deletes it, moves to the next one.
   Phrases live in the data-phrases attribute in index.html.
   ============================================================ */
(function heroTypewriter() {
  const el = document.querySelector('.hero__typed');
  if (!el) return;

  const phrases = JSON.parse(el.dataset.phrases);
  const caret = document.querySelector('.hero__caret');

  // Invisible copies of every full phrase sit in the same grid cell as the live line,
  // so the title is always as tall as the longest phrase (at any screen width) and
  // the content below never jumps while typing / deleting.
  const line = el.parentElement;
  phrases.forEach((phrase) => {
    const ghost = line.cloneNode(true);
    ghost.classList.add('hero__ghost');
    ghost.querySelector('.hero__typed').textContent = phrase;
    ghost.querySelector('.hero__typed').removeAttribute('data-phrases');
    line.parentElement.appendChild(ghost);
  });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TYPE_MS = 70;
  const DELETE_MS = 35;
  const HOLD_MS = 2200;   // pause with the full phrase visible
  const GAP_MS = 350;     // pause on the empty line before typing the next

  let index = 0;

  // Reduced motion: swap whole phrases without typing
  if (reduceMotion) {
    setInterval(() => {
      index = (index + 1) % phrases.length;
      el.textContent = phrases[index];
      setHeroScene(index);
    }, HOLD_MS + 1000);
    return;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setTyping = (on) => caret.classList.toggle('is-typing', on);

  async function loop() {
    for (;;) {
      setTyping(false);
      await wait(HOLD_MS);

      // delete
      setTyping(true);
      let chars = Array.from(el.textContent);
      while (chars.length) {
        chars.pop();
        el.textContent = chars.join('');
        await wait(DELETE_MS);
      }

      // next phrase: switch the backdrop while the line is empty
      index = (index + 1) % phrases.length;
      setHeroScene(index);

      setTyping(false);
      await wait(GAP_MS);

      // type next
      setTyping(true);
      const next = Array.from(phrases[index]);
      for (let i = 1; i <= next.length; i++) {
        el.textContent = next.slice(0, i).join('');
        await wait(TYPE_MS);
      }
    }
  }

  loop();
})();

/* ============================================================
   01 / 02 / 04 · Scroll state
   After the page is scrolled: the orange top bar slides away,
   the nav moves up, and the webinar bar appears at the bottom.
   ============================================================ */
(function scrollState() {
  const promo = document.querySelector('.promo');
  const THRESHOLD = 80;
  let scrolled = null;

  function update() {
    const next = window.scrollY > THRESHOLD;
    if (next === scrolled) return;
    scrolled = next;
    document.body.classList.toggle('is-scrolled', scrolled);
    if (promo) promo.inert = !scrolled;
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
   07 · STATS — duplicate each [data-loop] track (animal crowd, tool logos)
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
