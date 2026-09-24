/* ============================================================
   03 · HERO — icon pairs
   One pair per phrase, in the same order as data-phrases: [left, right].
   Images: assets/hero/<name>.webp
   ============================================================ */
const HERO_ICONS = [
  ['chat', 'rocket'],     // 1 · ապագայի հմտություններ
  ['laptop', 'cursor'],   // 2 · AI գործիքներով աշխատել
  ['flow', 'gear'],       // 3 · ավտոմատացնել առօրյադ
  ['wand', 'puzzle'],     // 4 · ստեղծել AI-ի օգնությամբ
];
const heroIconSrc = (name) => `assets/hero/${name}.webp`;

// Gradient backdrop: show the scene that belongs to the phrase
function setHeroScene(phraseIndex) {
  document.querySelectorAll('.hero__scene').forEach((el, i) => {
    el.classList.toggle('is-active', i === phraseIndex);
  });
}

function swapHeroIcons(phraseIndex) {
  const pair = HERO_ICONS[phraseIndex] || HERO_ICONS[0];
  document.querySelectorAll('.hero__icon').forEach((img, i) => {
    const src = heroIconSrc(pair[i]);
    if (img.getAttribute('src') === src) return;
    img.classList.add('is-swapping');
    setTimeout(() => {
      img.onload = img.onerror = () => img.classList.remove('is-swapping');
      img.src = src;
    }, 350 + i * 80);
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Preload every icon so swaps are instant
  // Preload icon pairs only when the icons are on the page (they're hidden for now)
  if (document.querySelector('.hero__icon')) {
    new Set(HERO_ICONS.flat()).forEach((n) => { new Image().src = heroIconSrc(n); });
  }

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
      swapHeroIcons(index);
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

      // swap icons while the line is empty
      index = (index + 1) % phrases.length;
      swapHeroIcons(index);
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
   09 · REFERRAL — «Ստեղծել պրոմո կոդ» stays disabled until
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
   05 · PACKAGES — «Հիմնական / Պրո» pill tabs
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
