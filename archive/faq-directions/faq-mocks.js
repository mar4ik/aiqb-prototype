/* FAQ directions — quick mocks. Bubble cuts reuse the site's own geometry (script.js → roundedOutline / heroBubble). */
(function () {
  if (!('clipPath' in document.documentElement.style)) return;
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
  // The brand chat bubble (BRAND.md → Chat bubble), tail bottom-right; data-bubble="left" mirrors it
  function chat(el) {
    const W = el.offsetWidth, H = el.offsetHeight, cs = getComputedStyle(el);
    const T = parseFloat(cs.paddingBottom) - parseFloat(cs.paddingTop);
    if (!W || !H || T <= 0) return;
    const Hb = H - T, e = 0.17 * T, r = 1.5;
    let pts = [[0, 0, 8 * r], [W, 0, 8 * r], [W, Hb, 4 * r], [W - e, Hb + 0.13 * T, 6 * r], [W - e, H, 3 * r], [W - e - 0.6 * T, Hb + 0.34 * T, 8 * r], [0, H, 8 * r]];
    if (el.dataset.bubble === 'left') pts = pts.map(([x, y, rr]) => [W - x, y, rr]).reverse();
    el.style.clipPath = `path('${roundedOutline(pts)}')`;
  }
  // B: the open row's colour field, a rounded box with the brand's step cut out at the top right (the toggle sits in it)
  function step(row) {
    const inset = 8, W = row.offsetWidth, H = row.offsetHeight - inset * 2;
    const phone = innerWidth < 768, sw = phone ? 60 : 92, sh = phone ? 48 : 64, R = phone ? 18 : 24;
    row.style.setProperty('--cut', `path('${roundedOutline([[0, 0, R], [W - sw, 0, R], [W - sw, sh, R / 2], [W, sh, R], [W, H, R], [0, H, R]])}')`);
  }
  const bubbles = [...document.querySelectorAll('[data-bubble]')];
  const rows = [...document.querySelectorAll('.mB__row')];
  const all = () => { bubbles.forEach(chat); rows.forEach(step); };
  const ro = new ResizeObserver(all);
  bubbles.forEach((b) => ro.observe(b)); rows.forEach((r) => ro.observe(r));
  document.fonts?.ready.then(all);
  all();

  // A: a short "typing…" before each answer, then the eyes rise over it
  document.querySelectorAll('.mA__turn').forEach((turn) => {
    turn.addEventListener('toggle', () => {
      if (!turn.open || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      turn.classList.add('is-typing');
      setTimeout(() => { turn.classList.remove('is-typing'); all(); }, 700);
    });
  });
  // A: the eyes look at the pointer
  const eyes = [...document.querySelectorAll('.mA .eyes')];
  addEventListener('pointermove', (e) => eyes.forEach((s) => {
    const b = s.getBoundingClientRect(); if (!b.width) return;
    const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
    s.removeAttribute('data-look');
    s.style.setProperty('--look-x', (Math.cos(a) * 9).toFixed(2));
    s.style.setProperty('--look-y', (Math.sin(a) * 10.54).toFixed(2));
  }));
})();
