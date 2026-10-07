const between = (min, max) => Math.round(min + Math.random() * (max - min));

/* ============================================================
   LETTER SHUFFLE — used by the wordmark (09b)
   Each letter sits in a fixed-width slot (as wide as its widest style) inside
   a no-wrap word, so switching fonts never pushes its neighbours and lines only
   break between words. data-f="0…5" picks the style (CSS: .shuffle [data-f]): Adelle Sans ARM only.
   ============================================================ */
const SHUFFLE_STYLES = 6;
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
   03 · HERO — watching eyes: one line tells a tiny story and writes «AI քեզ բան», with Yerevan behind it
   A pair of eyes rides the tip of the line and the line is revealed behind them (stroke-dasharray) while a
   camera (the SVG's viewBox) follows them scene by scene; the pupils glance around and blink now and then.
   It never stops: the end of «բան» swoops straight into the next «AI» (see ENDLESS WALK).
   Story: AI → a developer walks by with a laptop → a photographer takes a photo → քեզ
          → a teacher points at a board and draws a rising chart → բան
   Each scene has its colour: it opens from the eyes as a circle (.hero__reveal), then becomes the hero's
   (data-bg on .hero and .hero__bg; the colours live in tailwind.css). Behind it all, a line-art Yerevan drifts
   by slower than the line (.walk__city). Needs GSAP (loaded before this file); without it, or with reduced
   motion, the whole drawing shows still. Prototyped in archive/hero-eyes/.
   ============================================================ */
(function heroWalk() {
  const hero = document.querySelector('.hero');
  const svg = hero?.querySelector('.walk');
  if (!svg || document.documentElement.dataset.hero === 'b') return;   // the A/B test shows Hero B (03 B): no walk


  /* ------------------------------------------------------------------
     THE THREAD — one path, split into pieces so each letter / scene is easy to tweak.
     Every piece starts where the previous one ends (only the first has "M").
     Guide lines (viewBox units): baseline y=400 · x-height y=300 ·
     capitals / ascenders y≈228 · descenders y≈470 · the figures stand on the ground y=440.
     ------------------------------------------------------------------ */
  const THREAD = [
    // lead-in: out from under the eyes, one lazy loop, then a long swash under the A up to its right foot
    ['lead-in', 'M 50 468 C 85 490, 130 482, 140 458 C 148 438, 130 424, 116 436 C 102 448, 114 472, 142 470' +
                ' C 200 468, 300 440, 324 402'],

    // A: up the right leg, down the left, curl at the foot, crossbar left → right
    ['A', 'C 314 360, 290 285, 273 231 C 270 223, 265 223, 262 231 C 245 285, 222 350, 206 398' +
          ' C 202 410, 188 414, 185 398 C 182 372, 200 344, 228 340 C 252 339, 282 339, 306 340'],

    // I: the crossbar sweeps up into the stem
    ['I', 'C 330 341, 356 300, 371 232 C 373 290, 372 350, 372 400'],

    // scene 1 · developer: walks along carrying an open laptop in front of them
    ['developer', 'C 372 425, 386 440, 412 440 C 436 440, 460 440, 480 440' +          // ground
                  ' C 474 437, 469 434, 467 430' +                                      // back foot, heel up
                  ' C 472 418, 480 408, 485 398 C 490 385, 495 368, 500 352' +          // back leg
                  ' C 502 330, 503 305, 507 288' +                                      // back
                  ' C 500 284, 497 272, 499 262 C 501 250, 511 246, 518 247' +          // head
                  ' C 528 249, 534 258, 532 268 C 530 277, 523 282, 514 286' +
                  ' C 506 298, 496 310, 490 322 C 487 328, 484 334, 482 340' +          // back arm swings…
                  ' C 484 334, 487 328, 490 322 C 496 310, 506 298, 514 290' +          // …and back
                  ' C 517 302, 519 314, 522 322 C 532 326, 542 324, 550 322' +          // front arm to the hand
                  ' L 548 326 L 551 290 L 589 290 L 592 326' +                          // laptop: screen
                  ' L 598 336 L 542 336 L 548 326 L 592 326 L 550 326 L 550 322' +      // keyboard, back to the hand
                  ' C 542 324, 532 326, 522 322 C 519 314, 517 306, 515 300' +          // forearm back to the chest
                  ' C 516 318, 514 336, 511 352' +                                      // chest
                  ' C 514 368, 519 382, 522 395 C 525 410, 528 425, 532 437' +          // front leg
                  ' C 536 440, 542 440, 550 440 C 575 440, 595 440, 612 432'],          // foot, ground

    // scene 2 · photographer: a firm stance, camera up to the eye… and the photo they took stands next to them
    ['photographer', 'C 628 438, 640 440, 660 440 C 680 440, 700 440, 716 440' +       // ground
                     ' C 722 420, 730 390, 736 370 C 738 362, 740 356, 742 352' +       // back leg
                     ' C 744 330, 745 306, 747 288' +                                   // back
                     ' C 740 284, 737 272, 739 262 C 741 250, 751 246, 758 247' +       // head
                     ' C 768 249, 774 258, 772 268 C 770 277, 763 282, 754 286' +
                     ' C 758 296, 766 304, 774 300 C 778 292, 780 282, 780 274' +       // arm up to the camera
                     ' L 808 274 L 808 270 L 818 270 L 818 256 L 808 256 L 808 252' +  // camera: bottom, lens
                     ' L 798 252 L 796 246 L 788 246 L 786 252 L 780 252 L 780 274' +  // top, viewfinder, back
                     ' C 780 282, 778 292, 774 300 C 766 304, 758 298, 754 294' +       // arm back down
                     ' C 755 316, 756 336, 757 354' +                                   // chest
                     ' C 764 380, 778 410, 788 438 C 794 440, 800 440, 808 440' +       // front leg, lunging
                     ' C 830 440, 846 440, 860 440' +                                   // ground
                     ' L 860 376 L 920 376 L 920 420 L 910 420 L 898 398 L 890 410' +   // the photo: frame,
                     ' L 878 390 L 864 420 L 860 420 L 860 440 L 920 440' +             // mountains, back down
                     ' C 950 440, 972 432, 985 420 C 995 410, 1000 400, 1005 392'],     // and up into ք

    // ք: up the stem, bowl, down the descender, loop into the crossbar
    ['ք', 'C 1007 360, 1006 330, 1006 300 C 1012 293, 1074 288, 1076 345 C 1078 398, 1026 402, 1006 394' +
          ' C 1004 420, 1006 450, 1006 472 C 1006 488, 986 490, 985 468 C 984 450, 992 441, 1008 440' +
          ' C 1030 439, 1054 440, 1072 438'],

    // ե: tall stem, bowl, right stem, bar (out and back)
    ['ե', 'C 1090 437, 1101 405, 1105 340 C 1108 290, 1109 250, 1111 229 C 1112 223, 1117 223, 1117 232' +
          ' C 1117 290, 1116 345, 1119 376 C 1123 402, 1168 404, 1174 374 C 1176 350, 1176 322, 1176 305' +
          ' C 1176 300, 1164 298, 1150 298 C 1135 298, 1122 298, 1118 301 C 1125 306, 1160 307, 1194 305'],

    // զ: over the bowl top, bowl anticlockwise, stem down, foot right
    ['զ', 'C 1222 306, 1260 304, 1287 302 C 1272 292, 1224 292, 1222 348 C 1220 402, 1278 406, 1286 368' +
          ' C 1288 345, 1287 320, 1287 303 C 1288 340, 1287 420, 1286 466 C 1286 472, 1292 472, 1300 472' +
          ' C 1310 472, 1312 471, 1318 470'],

    // scene 3 · teacher: points at a board, and the pointer draws a rising chart on it
    ['teacher', 'C 1330 470, 1340 452, 1352 444 C 1358 440, 1364 440, 1370 440' +     // ground
                ' C 1374 410, 1380 380, 1384 356' +                                     // back leg
                ' C 1384 330, 1384 306, 1388 288' +                                     // back
                ' C 1381 284, 1378 272, 1380 262 C 1382 250, 1392 246, 1399 247' +      // head
                ' C 1409 249, 1415 258, 1413 268 C 1411 277, 1404 282, 1395 286' +
                ' C 1402 300, 1412 310, 1422 306 L 1456 296' +                          // arm, pointer
                ' L 1472 280 L 1486 290 L 1502 262 L 1514 270 L 1524 236' +             // the chart rises…
                ' L 1514 270 L 1502 262 L 1486 290 L 1472 280 L 1456 296' +             // …back to the tip
                ' L 1422 306 C 1412 310, 1402 304, 1395 296' +                          // pointer, arm back
                ' C 1392 320, 1390 340, 1388 356' +                                     // chest
                ' C 1392 380, 1398 410, 1402 438 C 1406 440, 1414 440, 1422 440' +      // front leg, foot
                ' L 1438 440 L 1456 324' +                                              // easel leg
                ' L 1444 324 L 1444 224 L 1530 224 L 1530 324 L 1456 324' +             // the board
                ' L 1518 324 L 1532 440 L 1540 440'],                                   // easel leg, ground

    // բ: in along the bar, up the right leg, arch, stem down, swoop out
    ['բ', 'C 1558 440, 1568 401, 1590 400 C 1610 399, 1634 400, 1662 400 C 1656 396, 1655 388, 1655 376' +
          ' C 1655 350, 1655 330, 1655 318 C 1654 306, 1642 298, 1626 298 C 1610 298, 1598 306, 1597 322' +
          ' C 1596 360, 1597 420, 1597 470 C 1597 488, 1630 490, 1658 470 C 1674 456, 1680 400, 1684 302'],

    // ա: three stems joined by two cups
    ['ա', 'C 1686 330, 1686 355, 1687 372 C 1690 406, 1733 408, 1736 372 C 1738 350, 1738 325, 1738 302' +
          ' C 1740 330, 1741 355, 1741 372 C 1744 406, 1786 408, 1789 372 C 1791 350, 1791 325, 1791 302' +
          ' C 1793 340, 1794 380, 1794 400 C 1794 410, 1802 414, 1814 410'],

    // ն: looped head, S down into the bowl, right stem
    ['ն', 'C 1824 404, 1836 350, 1844 292 C 1847 276, 1844 264, 1836 265 C 1827 266, 1826 280, 1833 292' +
          ' C 1839 305, 1838 340, 1840 372 C 1844 406, 1886 408, 1890 372 C 1892 350, 1892 325, 1892 302' +
          ' C 1894 340, 1895 380, 1895 400'],

    // tail: out of the word and away
    ['tail', 'C 1896 418, 1918 424, 1940 410 C 1962 396, 1972 366, 1990 350'],

    // loop: swoops down into the start of the next drawing (the lead-in's first point, one TILE to the right)
    ['loop', 'C 2010 330, 2036 332, 2050 370 C 2060 400, 2064 438, 2110 468'],
  ];

  /* ------------------------------------------------------------------
     STORY BEATS — each beat (up to the end of its piece) has its own background colour (brand colours,
     BRAND.md; the hero's data-bg colours live in tailwind.css). The eyes walk one lap in LAP_TIME seconds
     at one steady pace, never stopping: the colour changes as they pass the end of a beat.
     One lap draws the whole drawing once; then the next copy follows straight on, forever.
     ------------------------------------------------------------------ */
  const BEATS = [
    ['I', 'sky'],               // AI — the page opens on calm Sky
    ['developer', 'yellow'],    // someone walks with a laptop…
    ['photographer', 'teal'],   // …takes a photo
    ['զ', 'pink'],              // քեզ
    ['teacher', 'tan'],         // someone teaches at a board
    ['loop', 'yellow'],         // բան, and the swoop into the next «AI» (back to Sky)
  ];
  const LAP_TIME = 18.8;

  /* ENDLESS WALK — the drawing repeats every TILE units to the right (the 'loop' piece ends exactly one TILE
     after the lead-in starts). The path holds three copies; the eyes walk the second one, and when they reach
     its end they jump back to its start: the view is identical there, so the jump can't be seen. */
  const TILE = 2060;
  const APPEAR = 0.4;        // eyes pop in once, when the page opens

  /* CAMERA — shows a window VIEW_H units tall (as wide as the screen allows) around the eyes */
  const VIEW_TOP = 130;      // top edge of the camera window
  const VIEW_H = 380;        // height of the camera window (sky above the figures → below the descenders)
  const SMOOTH = 450;        // camera glides on the average position of ±450 units of line around the eyes

  /* LOOK */
  const THREAD_WIDTH = 3;    // SVG units…
  const MIN_THREAD_PX = 1.2; // …but never thinner than this on screen (the zoomed-out view)
  const EYES_H = 42;         // height of the eyes in SVG units (index.html scales the brand's 50-unit eyes down to it)
  const MIN_EYES_PX = 21;    // …never smaller than this on screen
  /* Pupils, in the brand eyes' own units (Figma «Eyes» directions): they move on an oval, 9 sideways and 10.54 up or
     down from the centre of the eye; «at rest» (looking at you) both lean in by 3.78 */
  const PUPIL_TRAVEL = { x: 9, y: 10.54 };
  const PUPIL_REST = 3.78;

  /* EYES — every GLANCE seconds (random within the range) the eyes pick somewhere new to look.
     'ahead' follows the direction the line is travelling; the rest are fixed directions (x right, y down). */
  const GLANCE = [0.7, 1.8];
  const LOOKS = [
    'ahead', 'ahead', 'ahead',           // mostly: where the line is going
    { x: 0, y: 0 },                      // at you (the brand's «at rest»)
    { x: -0.9, y: 0.35 },                // back at what was just drawn
    { x: 0.75, y: -0.7 },                // up and ahead
    { x: -0.7, y: -0.7 },                // up and behind
    { x: 0.2, y: 0.95 },                 // down at the ground
  ];
  const BLINK = [2.2, 5];    // seconds between blinks (random within the range)

  /* CIRCLE — the next colour grows from the eyes to the farthest corner of the hero in REVEAL seconds:
     it opens at once and slows down as it sweeps off screen */
  const REVEAL = 0.9;

  /* CITY — Yerevan behind the drawing (index.html: #walk-city-tile, drawn in its own pixels: x 55 → 1740, ground y 400).
     It moves at CITY_SPEED of the camera's speed, so it drifts past slower than the line and the landmarks change as
     the eyes walk. One stretch of city is TILE × CITY_SPEED units wide, so the endless-walk jump lands on the same
     view of the city too. */
  const CITY_SPEED = 0.5;
  const CITY_GROUND = 440;   // the city stands on the figures' ground
  const CITY_SHIFT = 50;     // slides the city along: Republic Square behind the photographer, Matenadaran behind the teacher
  const CITY_TILE = { x0: 55, x1: 1740, ground: 400 };


  /* ------------------------------------------------------------------ */

  const bgTargets = [hero, hero.querySelector('.hero__bg')];
  const reveal = hero.querySelector('.hero__reveal');
  const city = svg.querySelector('.walk__city');
  const thread = svg.querySelector('.walk__thread');
  const eyes = svg.querySelector('.walk__eyes');
  const eyesBlink = svg.querySelector('.walk__blink');
  const pupils = [...svg.querySelectorAll('.walk__pupil')];
  const PUPIL_HOME = pupils.map((p) => ({ x: +p.getAttribute('cx'), y: +p.getAttribute('cy') }));

  // Where each piece ends along one copy of the drawing (for the story beats)
  const pieceEnd = {};
  THREAD.forEach(([name], i) => {
    thread.setAttribute('d', THREAD.slice(0, i + 1).map(([, d]) => d).join(' '));
    pieceEnd[name] = thread.getTotalLength();
  });
  const LAP = pieceEnd.loop;   // length of one copy
  const BEAT_ENDS = BEATS.map(([piece]) => pieceEnd[piece]);

  // One copy without the loop piece, with a margin — the still view for reduced motion
  thread.setAttribute('d', THREAD.slice(0, -1).map(([, d]) => d).join(' '));
  const bbox = thread.getBBox();
  const FULL = { x: bbox.x - 40, y: bbox.y - 40, w: bbox.width + 80, h: bbox.height + 80 };

  // Three copies in a row: shift every x by TILE, and drop the "M x y" so each copy carries on from the last
  const ONE = THREAD.map(([, d]) => d).join(' ');
  const shift = (d, dx) => d.replace(/(-?[\d.]+)[ ,]+(-?[\d.]+)/g, (_, x, y) => `${+x + dx} ${y}`);
  const NEXT = ONE.replace(/^M [\d. ]+/, '');
  thread.setAttribute('d', [ONE, shift(NEXT, TILE), shift(NEXT, 2 * TILE)].join(' '));
  const LENGTH = thread.getTotalLength();

  // The city: copies of one stretch side by side (enough for the whole walk and the still view), each scaled so a
  // stretch is TILE × CITY_SPEED wide and its ground sits on CITY_GROUND. render() slides the lot with the camera.
  const cityWidth = TILE * CITY_SPEED;
  const cityScale = cityWidth / (CITY_TILE.x1 - CITY_TILE.x0);
  for (let n = -1; n <= 4; n++) {
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#walk-city-tile');
    use.setAttribute('transform',
      `translate(${n * cityWidth} ${CITY_GROUND - CITY_TILE.ground * cityScale}) scale(${cityScale}) translate(${-CITY_TILE.x0} 0)`);
    city.append(use);
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = ([a, b]) => a + Math.random() * (b - a);

  // Points along one copy of the line, every LUT_STEP units, measured once — render() looks them up instead of
  // asking the path. (Asking the long three-copy path is slow: it measures from its start every time, so the
  // camera below took seconds and blocked the page.) Each piece is measured on its own short path; the other
  // copies are the same points TILE further right.
  const LUT_STEP = 2;
  const lut = { xs: [], ys: [] };
  {
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.append(probe);
    const ends = THREAD.map(([name]) => pieceEnd[name]);
    const endPoint = (d) => d.trim().split(/[ ,]+/).slice(-2).join(' ');   // a piece ends on its last x y
    let i = -1, from = 0;
    for (let s = 0; s <= LAP; s += LUT_STEP) {
      while (i < 0 || (s > ends[i] && i < ends.length - 1)) {   // on to the piece that holds this length
        i++;
        from = i ? ends[i - 1] : 0;
        probe.setAttribute('d', i ? `M ${endPoint(THREAD[i - 1][1])} ${THREAD[i][1]}` : THREAD[0][1]);
      }
      const p = probe.getPointAtLength(Math.min(s, ends[i]) - from);
      lut.xs.push(p.x);
      lut.ys.push(p.y);
    }
    probe.remove();
  }
  function pointAt(len) {
    const copy = Math.floor(len / LAP);
    const i = (len - copy * LAP) / LUT_STEP, i0 = Math.floor(i), last = lut.xs.length - 1;
    const a = Math.min(i0, last), b = Math.min(i0 + 1, last);
    return { x: lerp(lut.xs[a], lut.xs[b], i - i0) + copy * TILE, y: lerp(lut.ys[a], lut.ys[b], i - i0) };
  }

  // Camera x for every point of the line, averaged so it glides instead of jiggling with each stroke
  const STEP = 10;
  const camX = (() => {
    const xs = [];
    for (let l = 0; l <= LENGTH + STEP; l += STEP) xs.push(pointAt(Math.min(l, LENGTH)).x);
    const r = Math.round(SMOOTH / STEP);
    return xs.map((_, i) => {
      const part = xs.slice(Math.max(0, i - r), i + r + 1);
      return part.reduce((a, b) => a + b, 0) / part.length;
    });
  })();

  // Animated values: `pos` = how far the eyes are through the current lap (0 → 1), `lapped` = whether a lap is
  // already behind them (then they walk the second copy, with the first one drawn behind),
  // `size` = eye size, `still` = show the whole drawing instead of following, `blink` = 1 open → 0 shut
  const state = { pos: 0, lapped: false, size: 0, still: false, blink: 1 };

  // Where the pupils point: `target` is chosen by the glances, `look` eases towards it every frame
  let target = 'ahead';
  const look = { x: 1, y: 0 };
  let lastHead = 0;
  let travel = { x: 1, y: 0 };

  let loopTl = null;   // the lap timeline, once it exists

  let screen = { w: 1, h: 1 };
  function measure() { screen = { w: svg.clientWidth || 1, h: svg.clientHeight || 1 }; }
  measure();

  function camera(len) {
    if (state.still) return FULL;
    // Follow view: fixed height, as wide as the SVG's shape allows, centred on the smoothed eye position
    const w = VIEW_H * (screen.w / screen.h);
    const i = len / STEP, i0 = Math.floor(i);
    const x = lerp(camX[i0], camX[i0 + 1] ?? camX[i0], i - i0);
    return { x: x - w / 2, y: VIEW_TOP, w, h: VIEW_H };
  }

  // Direction the line is heading at the eyes (a short look back along the path), or the last one if it isn't moving
  function heading(head) {
    const back = pointAt(Math.max(0, head - 14));
    const here = pointAt(head);
    const dx = here.x - back.x, dy = here.y - back.y, d = Math.hypot(dx, dy);
    if (Math.abs(head - lastHead) > 0.2 && d > 1) travel = { x: dx / d, y: dy / d };
    lastHead = head;
    return travel;
  }

  // Circle: `shown` is the hero's colour; a change grows .hero__reveal (already in the new colour) from the eyes,
  // then hands the colour to the hero and hides the circle again. `eyesInSvg` is where the eyes are inside the SVG
  // (render() keeps it up to date); the circle is placed on the reveal layer, which scrolls with the hero.
  let shown = null, eyesInSvg = { x: 0, y: 0 };
  const circle = { r: 0, tween: null };
  function drawCircle() {
    const box = reveal.getBoundingClientRect(), frame = svg.getBoundingClientRect();
    const x = frame.left - box.left + eyesInSvg.x, y = frame.top - box.top + eyesInSvg.y;
    const far = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    reveal.style.clipPath = `circle(${circle.r * far}px at ${x}px ${y}px)`;
  }
  function setColour(color, grow) {
    if (color === shown) return;
    if (circle.tween) circle.tween.progress(1);   // finish a circle still growing
    shown = color;
    const toHero = () => bgTargets.forEach((el) => { el.dataset.bg = color; });
    if (!grow) { toHero(); return; }
    reveal.dataset.bg = color;
    circle.r = 0;
    circle.tween = gsap.to(circle, {
      r: 1, duration: REVEAL, ease: 'power2.out', onUpdate: drawCircle,
      onComplete: () => { toHero(); circle.r = 0; circle.tween = null; drawCircle(); },
    });
  }

  function render() {
    const lapPos = state.pos * LAP;
    const lapped = state.lapped || (loopTl && loopTl.iteration() > 1);
    const head = (lapped ? LAP : 0) + lapPos;

    // Camera
    const view = camera(head);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

    // The city moves CITY_SPEED as fast as the camera: shifted along by the rest of the camera's move
    city.setAttribute('transform', `translate(${view.x * (1 - CITY_SPEED) + CITY_SHIFT} 0)`);
    const pxPerUnit = Math.min(screen.w / view.w, screen.h / view.h);

    // Where the eyes are inside the SVG (the viewBox is centred when its shape doesn't match, as in the still
    // view) — the circle opens from there
    const p = pointAt(head);
    eyesInSvg = {
      x: (screen.w - view.w * pxPerUnit) / 2 + (p.x - view.x) * pxPerUnit,
      y: (screen.h - view.h * pxPerUnit) / 2 + (p.y - view.y) * pxPerUnit,
    };

    // Backdrop: the colour of the beat the eyes are in — grown from the eyes (a plain switch when there's no
    // animation or before the first frame)
    const beat = BEAT_ENDS.findIndex((end) => lapPos <= end + 0.5);
    setColour(BEATS[beat < 0 ? BEATS.length - 1 : beat][1], shown !== null && !state.still && !!window.gsap);
    if (circle.tween) drawCircle();   // the circle's centre follows the eyes while it grows

    // Show the path up to the eyes
    thread.style.strokeDasharray = `${head} ${LENGTH + 1}`;
    thread.style.strokeWidth = Math.max(THREAD_WIDTH, MIN_THREAD_PX / pxPerUnit);
    thread.style.visibility = head > 0.5 ? 'visible' : 'hidden';

    // Eyes sit on the tip of the line and stay upright; they keep a readable size when zoomed out
    const scale = state.size * Math.max(1, MIN_EYES_PX / (EYES_H * pxPerUnit));
    eyes.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
    eyesBlink.setAttribute('transform', `scale(1 ${Math.max(0.08, state.blink)})`);

    // Pupils ease towards where the eyes want to look
    const dir = heading(head);
    const want = target === 'ahead' ? dir : target;
    look.x = lerp(look.x, want.x, 0.25);
    look.y = lerp(look.y, want.y, 0.25);
    const m = Math.hypot(look.x, look.y), k = m > 1 ? 1 / m : 1;
    const rest = PUPIL_REST * (1 - Math.min(1, m));   // the nearer to «at rest», the more the pupils lean in
    pupils.forEach((pupil, i) => {
      const inward = i === 0 ? 1 : -1;                 // left eye leans right, right eye leans left
      pupil.setAttribute('cx', PUPIL_HOME[i].x + look.x * k * PUPIL_TRAVEL.x + inward * rest);
      pupil.setAttribute('cy', PUPIL_HOME[i].y + look.y * k * PUPIL_TRAVEL.y);
    });
  }

  window.addEventListener('resize', () => { measure(); render(); });
  render();   // start hidden (no line, no eyes) until the first frame

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !window.gsap) {
    // No animation: show one whole drawing with the eyes resting at the end of «բան», looking at you
    Object.assign(state, { pos: pieceEnd.tail / LAP, size: 1, still: true });
    target = { x: 0, y: 0 };   // at rest
    Object.assign(look, target);
    render();
    svg.classList.add('is-ready');
    return;
  }

  // The walk starts once the page has loaded (images, fonts, the city), so its first frames run smoothly instead
  // of competing with the rest of the page — or after START_WAIT at the latest, so a slow connection doesn't
  // leave the hero empty. Until then the eyes and the city are hidden (.walk:not(.is-ready) in tailwind.css).
  const START_WAIT = 3000;   // ms
  let started = false;
  const begin = () => { if (!started) { started = true; start(); } };
  if (document.readyState === 'complete') begin();
  else {
    window.addEventListener('load', begin, { once: true });
    setTimeout(begin, START_WAIT);
  }

  function start() {
    svg.classList.add('is-ready');
    gsap.to(state, { size: 1, duration: APPEAR, ease: 'back.out(2)', onUpdate: render });
    gsap.from(city, { opacity: 0, duration: 1.2, ease: 'power1.out' });   // the city fades up once

    // One lap at one steady pace, repeated forever (so the walk never stops, even from one lap into the next).
    // From the second lap on the eyes walk the second copy (see ENDLESS WALK).
    const tl = loopTl = gsap.timeline({ repeat: -1, onUpdate: render, onRepeat: () => { state.lapped = true; } });
    tl.fromTo(state, { pos: 0 }, { pos: 1, duration: LAP_TIME, ease: 'none', immediateRender: false });

    // Glances and blinks run on their own clocks, independent of the drawing
    const glance = gsap.delayedCall(rand(GLANCE), function next() {
      target = LOOKS[Math.floor(Math.random() * LOOKS.length)];
      glance.delay(rand(GLANCE)).restart(true);
    });
    const blink = gsap.delayedCall(rand(BLINK), function next() {
      gsap.timeline({ onUpdate: render })
        .to(state, { blink: 0, duration: 0.07, ease: 'power1.in' })
        .to(state, { blink: 1, duration: 0.12, ease: 'power1.out' });
      blink.delay(rand(BLINK)).restart(true);
    });

    // Pause everything while the hero is scrolled away
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const on = entry.isIntersecting;
        [tl, glance, blink].forEach((a) => (on ? a.resume() : a.pause()));
      }).observe(svg);
    }
  }
})();

/* ============================================================
   03 B · HERO B — the falling tools (A/B test with Hero A; prototyped in archive/hero-gravity/)
   The AI tools fall into the dark stage as balls and pile up, the brand's eyes last, on top. Then the balls are a
   toy: one hops when the pointer comes over it (the hint that they can be played with; touch screens have no hover,
   so there a ball hops by itself now and then until the first touch), picks up and throws, and kicks when clicked.
   The eyes stay upright as their ball rolls, blink now and then and watch the pointer (mouse screens). Physics by Matter.js, loaded for this hero only; the balls are the page's own elements,
   moved every frame, and the loop sleeps once everything is at rest or off screen. With reduced motion the pile is
   there from the start and nothing moves unless it's played with; without the library the balls sit in rows at the
   bottom (.is-still, tailwind.css).
   ============================================================ */
(function dropHero() {
  const stage = document.querySelector('.drop');
  if (!stage || document.documentElement.dataset.hero !== 'b') return;
  const lib = document.createElement('script');
  lib.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
  lib.onload = () => {
    try { start(); } catch (err) { stage.classList.remove('is-live'); stage.classList.add('is-still'); throw err; }
  };
  lib.onerror = () => stage.classList.add('is-still');
  document.head.append(lib);

  function start() {
    const { Engine, Composite, Bodies, Body, Constraint } = Matter;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FILL = 0.6;                // how much of the room above the draw's bubble the pile covers (the huge gifts take most)…
    const RADIUS = { min: 14, max: 48 };   // …with every tool ball the same size, within these radii (px); a ball with
                                     // data-size (the gifts) is that many times bigger
    const HOP = 0.9, KICK = 3.2;     // how high a hover hop and a click kick go, in the ball's radii
    const HOP_AGAIN = 600;           // ms before the same ball hops for the pointer again
    const NUDGE = 3500;              // touch screens: ms between the hint hops
    const WALL = 400;                // px: walls thick enough that a hard throw never gets through
    const BALL = { restitution: 0.5, friction: 0.05, frictionAir: 0.012, density: 0.001 };
    const PUPIL_TRAVEL = { x: 9, y: 10.54 };   // the brand's pupil oval (BRAND.md → Eyes)
    const STEP = 1000 / 60;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    const engine = Engine.create({ gravity: { x: 0, y: 1 } });
    const fall = engine.gravity.y * engine.gravity.scale * STEP ** 2;   // what gravity adds to the speed each step (px)
    const balls = [], byEl = new Map();
    const shelf = stage.parentElement.querySelector('.story-hero__bubble');
    let W = 0, H = 0, unit = 0, walls = [];

    // The balls' radius: together they cover FILL of the stage, whatever its shape (a ball of data-size s counts s² times)
    const sizeOf = (el) => parseFloat(el.dataset.size) || 1;
    const els = [...stage.querySelectorAll('.drop__ball')];
    const area = els.reduce((sum, el) => sum + sizeOf(el) ** 2, 0);
    function measure() {
      W = stage.clientWidth;
      H = stage.clientHeight;
      // the room the pile has: above the draw's bubble (the shelf along the bottom), if it's there
      const below = shelf?.offsetHeight ? H - (shelf.offsetTop - stage.offsetTop) : 0;
      unit = clamp(Math.sqrt((FILL * W * (H - below)) / (Math.PI * area)), RADIUS.min, RADIUS.max);
    }
    // The floor is the stage's bottom edge; the side walls reach far above it, so a ball thrown up comes back down inside
    function fence() {
      Composite.remove(engine.world, walls);
      const wall = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.1, restitution: 0.4 });
      walls = [
        wall(W / 2, H + WALL / 2, W + 2 * WALL, WALL),
        wall(-WALL / 2, -2 * H, WALL, 6 * H),
        wall(W + WALL / 2, -2 * H, WALL, 6 * H)
      ];
      // The draw's bubble along the bottom is a shelf: its box, less the tail, is a wall the balls land on. Measured from
      // the layout (offset*), not the screen: while it falls in (.is-dropping) it is still up above the stage
      if (shelf?.offsetWidth) {
        const cs = getComputedStyle(shelf);
        const x = shelf.offsetLeft - stage.offsetLeft, y = shelf.offsetTop - stage.offsetTop;
        const w = shelf.offsetWidth, h = shelf.offsetHeight - (parseFloat(cs.paddingBottom) - parseFloat(cs.paddingTop));
        walls.push(wall(x + w / 2, y + h / 2, w, h));
      }
      Composite.add(engine.world, walls);
    }
    function addBall(el, x, y) {
      el.addEventListener('animationend', (e) => { if (e.animationName === 'drop-hop') el.classList.remove('is-hop'); });
      const body = Bodies.circle(x, y, Math.min(unit * sizeOf(el), W * 0.21), BALL);   // no ball wider than 42% of the stage (the gifts on a phone)
      const eyes = el.classList.contains('drop__ball--eyes');
      // the eyes and the gifts never turn (the eyes stay level, the laptops stand)
      const ball = { el, body, r: body.circleRadius, eyes, upright: eyes || el.classList.contains('drop__ball--gift'), hopAt: 0, last: null };
      el.style.setProperty('--ball', `${2 * ball.r}px`);
      Composite.add(engine.world, body);
      balls.push(ball);
      byEl.set(el, ball);
      return ball;
    }

    // The balls, in loose rows above the stage (each row in a shuffled order, each ball a little higher or lower), and
    // already falling, so they rain in one after another. Then the gifts, side by side in a row of their own above the
    // tools; the eyes come last, near the middle, and land on top
    measure();
    fence();
    stage.classList.add('is-live');
    const gifts = els.filter((el) => el.classList.contains('drop__ball--gift'));   // the big ones, a row of their own
    const tools = els.filter((el) => !gifts.includes(el) && !el.classList.contains('drop__ball--eyes'));
    const perRow = Math.max(2, Math.floor(W / (2.4 * unit)));
    const slots = [];
    while (slots.length < tools.length) slots.push(...[...Array(perRow).keys()].sort(() => Math.random() - 0.5));
    const speed = Math.sqrt(2 * fall * unit * 1.5);   // as if they had already fallen a little way
    const toolsTop = unit * (1.2 + Math.ceil(tools.length / perRow) * 2.6);   // how far above the stage the tools' rows reach
    let giftsTop = toolsTop;
    els.forEach((el) => {
      let x, y;
      if (el.classList.contains('drop__ball--eyes')) {
        x = W * (0.4 + Math.random() * 0.2);
        y = -(giftsTop + unit * sizeOf(el) * 2);
      } else if (gifts.includes(el)) {
        const k = gifts.indexOf(el), r = unit * sizeOf(el);
        x = clamp(((k + 0.5) * W) / gifts.length + (Math.random() - 0.5) * r * 0.4, r, W - r);
        y = -(toolsTop + r * (1.2 + k * 1.1));   // one above the other a little, so they never start overlapping
        giftsTop = Math.max(giftsTop, -y + r);
      } else {
        const i = tools.indexOf(el);
        x = ((slots[i] + 0.5 + (Math.random() - 0.5) * 0.5) * W) / perRow;
        y = -unit * (1.2 + Math.floor(i / perRow) * 2.6 + Math.random() * 1.2);
      }
      Body.setVelocity(addBall(el, x, y).body, { x: 0, y: speed });
    });
    if (reduced) for (let i = 0; i < 900; i++) Engine.update(engine, STEP);   // reduced motion: the pile, already settled

    // Each frame: a step of the physics, then every ball moved to its body (the eyes never turn). A ball that got out
    // somehow drops back in from the top. Once nothing has moved for half a second the loop sleeps until it's woken
    let raf = 0, last = 0, rest = 0, onScreen = true, held = null, following = false;
    function render() {
      let moved = !!held;
      for (const b of balls) {
        const { x, y } = b.body.position, a = b.upright ? 0 : b.body.angle;
        if (b.last && Math.abs(x - b.last.x) < 0.1 && Math.abs(y - b.last.y) < 0.1 && Math.abs(a - b.last.a) < 0.002) continue;
        moved = true;
        b.last = { x, y, a };
        b.el.style.transform = `translate(${(x - b.r).toFixed(1)}px, ${(y - b.r).toFixed(1)}px)${a ? ` rotate(${a.toFixed(3)}rad)` : ''}`;
      }
      if (moved && following) look();
      return moved;
    }
    function keepIn() {
      for (const b of balls) {
        const { x, y } = b.body.position;
        if (x > -b.r && x < W + b.r && y < H + b.r && y > -5 * H) continue;
        Body.setPosition(b.body, { x: clamp(x, b.r, W - b.r), y: -b.r });
        Body.setVelocity(b.body, { x: 0, y: 0 });
      }
    }
    function frame(now) {
      raf = 0;
      Engine.update(engine, last ? clamp(now - last, 1, 2 * STEP) : STEP);
      last = now;
      keepIn();
      rest = render() ? 0 : rest + 1;
      if (onScreen && rest < 30) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    // The draw's bubble falls in first (.is-dropping, tailwind.css, 0.9s); the balls wait above the stage until it's down
    const hold = shelf && !reduced ? performance.now() + 900 : 0;
    if (hold) stage.parentElement.classList.add('is-dropping');
    function wake() {
      rest = 0;
      const wait = hold - performance.now();
      if (wait > 0) { setTimeout(wake, wait); return; }
      if (!raf && onScreen) raf = requestAnimationFrame(frame);
    }
    render();
    wake();
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) wake();
    }).observe(stage);

    // A hop straight up, high enough to clear `height` of the ball's own radii, with a little sideways and spin
    // A ball with others resting on it can't jump out from under them, so it jumps on its own, in front of them and
    // back into its place (.is-hop, tailwind.css: --hop is the height in its radii); one in the open really jumps
    const covered = (ball) => engine.pairs.list.some(({ isActive, bodyA, bodyB }) => {
      const other = bodyA === ball.body ? bodyB : bodyB === ball.body ? bodyA : null;
      return isActive && other && !other.isStatic && other.position.y < ball.body.position.y - ball.r / 2;
    });
    function hop(ball, height, spin) {
      ball.hopAt = performance.now();
      if (covered(ball)) {
        ball.el.style.setProperty('--hop', height);
        ball.el.classList.remove('is-hop');
        void ball.el.offsetWidth;   // so the jump starts over if it's still going
        ball.el.classList.add('is-hop');
        return;
      }
      const v = Math.sqrt(2 * fall * height * ball.r);
      Body.setVelocity(ball.body, { x: ball.body.velocity.x * 0.5 + (Math.random() - 0.5) * v * 0.3, y: -v });
      Body.setAngularVelocity(ball.body, (Math.random() - 0.5) * spin);
      wake();
    }

    // Playing. A press on a ball picks it up: a spring from the pointer to the spot it was taken by, so it swings,
    // drags and flies off when let go. A press let go quickly where it started is a click: a kick. Fingers on the
    // empty stage still scroll the page (tailwind.css: touch-action on the balls only).
    let played = false, moveAt = 0, mx = 0, my = 0;
    const at = (e) => {
      const s = stage.getBoundingClientRect();
      return { x: e.clientX - s.left, y: e.clientY - s.top };
    };
    stage.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const p = at(e), ball = byEl.get(e.target.closest('.drop__ball'));
      if (!ball) return;
      e.preventDefault();
      const { body } = ball;
      const spring = Constraint.create({
        pointA: p, bodyB: body, pointB: { x: p.x - body.position.x, y: p.y - body.position.y },
        length: 0, stiffness: 0.2, damping: 0.1
      });
      Composite.add(engine.world, spring);
      held = { ball, spring, id: e.pointerId, ...p, t: performance.now(), moved: false };
      played = true;
      stage.classList.add('is-holding');
      stage.setPointerCapture(e.pointerId);
      wake();
    });
    stage.addEventListener('pointermove', (e) => {
      if (e.clientX !== mx || e.clientY !== my) { moveAt = performance.now(); mx = e.clientX; my = e.clientY; }
      if (!held || e.pointerId !== held.id) return;
      const p = at(e);
      held.spring.pointA = p;
      if (Math.hypot(p.x - held.x, p.y - held.y) > 6) held.moved = true;
      wake();
    });
    function release(e) {
      if (held?.id !== e.pointerId) return;
      Composite.remove(engine.world, held.spring);
      stage.classList.remove('is-holding');
      if (e.type === 'pointerup' && !held.moved && performance.now() - held.t < 400) kick(held.ball);
      held = null;
      wake();
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    function kick(ball) {
      hop(ball, KICK, 0.4);
      if (ball.eyes) blink();
    }

    // The hint: a ball hops when the pointer comes over it (a mouse that's really moving, not a ball rolling under a
    // resting one); with reduced motion, only playing moves them
    stage.addEventListener('pointerover', (e) => {
      if (reduced || held || e.pointerType !== 'mouse' || performance.now() - moveAt > 100) return;
      const el = e.target.closest('.drop__ball');
      const ball = byEl.get(el);
      if (!ball || el.contains(e.relatedTarget) || performance.now() - ball.hopAt < HOP_AGAIN) return;
      hop(ball, HOP, 0.12);
    });
    // Touch screens have no hover: a ball hops by itself now and then, while the stage is on screen, until it's played with
    if (!reduced && !matchMedia('(hover: hover)').matches) {
      (function nudge() {
        setTimeout(() => {
          if (played) return;
          if (onScreen && !held) hop(balls[Math.floor(Math.random() * balls.length)], HOP, 0.12);
          nudge();
        }, NUDGE);
      })();
    }

    // When the stage changes size: the walls move, every ball scales with it and keeps its place, the pile on the floor
    new ResizeObserver(() => {
      const w0 = W, h0 = H, u0 = unit;
      measure();
      if (W === w0 && H === h0) return;
      fence();
      const k = unit / u0;
      for (const b of balls) {
        const { x, y } = b.body.position;
        if (k !== 1) Body.scale(b.body, k, k);
        b.r = b.body.circleRadius;
        b.el.style.setProperty('--ball', `${2 * b.r}px`);
        Body.setPosition(b.body, { x: clamp((x * W) / w0, b.r, W - b.r), y: Math.min(H - (h0 - y) * k, H - b.r) });
        b.last = null;
      }
      render();
      wake();
    }).observe(stage);
    if (shelf) new ResizeObserver(() => { fence(); wake(); }).observe(shelf);   // the words rewrap (fonts, width): the shelf follows

    // The eyes: they blink now and then and, on mouse screens, watch the pointer while it's over the hero
    const eyesBall = balls.find((b) => b.eyes);
    const eyes = eyesBall?.el.querySelector('.eyes');
    function blink() {
      eyes?.classList.add('is-blink');
      setTimeout(() => eyes?.classList.remove('is-blink'), 140);
    }
    if (!eyes || reduced) return;
    (function blinks() {
      setTimeout(() => {
        if (onScreen && !document.hidden) blink();
        blinks();
      }, 2000 + Math.random() * 3000);
    })();
    const hero = stage.closest('section');
    if (!hero || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let px = 0, py = 0, lookRaf = 0;
    function look() {
      lookRaf = 0;
      const box = eyes.getBoundingClientRect();
      const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160) / d;   // nearer than 160px: less far off-centre
      eyes.style.setProperty('--look-x', (dx * k * PUPIL_TRAVEL.x).toFixed(2));
      eyes.style.setProperty('--look-y', (dy * k * PUPIL_TRAVEL.y).toFixed(2));
    }
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (!following) { following = true; delete eyes.dataset.look; }   // «at you» sets each pupil itself, so it goes while they follow
      px = e.clientX; py = e.clientY;
      lookRaf ||= requestAnimationFrame(look);
    });
    hero.addEventListener('pointerleave', () => {
      following = false;
      eyes.dataset.look = 'you';
      eyes.style.removeProperty('--look-x');
      eyes.style.removeProperty('--look-y');
    });
  }
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
   of view and the webinar bar appears in its place at the bottom, and the
   floating buttons (12) come in with it.
   ============================================================ */
(function scrollState() {
  const promo = document.querySelector('.promo');
  const topbar = document.querySelector('.topbar');
  const fabs = document.querySelector('.fabs');
  const THRESHOLD = 80;
  let scrolled = null;

  function update() {
    const next = window.scrollY > THRESHOLD;
    if (next === scrolled) return;
    scrolled = next;
    document.body.classList.toggle('is-scrolled', scrolled);
    if (promo) promo.inert = !scrolled;
    if (fabs) fabs.inert = !scrolled;
    if (topbar) topbar.inert = scrolled;   // hidden bars can't be tabbed to
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
})();

/* ============================================================
   02 · Nav call to action — comes in beside the pill once the hero's own «Ընտրել դասընթաց» is scrolled past, so the
   first screen asks once (body.is-past-hero-cta). It starts hidden (tailwind.css), so it never shows at load
   ============================================================ */
(function navCta() {
  const hero = document.documentElement.dataset.hero;
  const heroCta = document.querySelector(hero === 'b' ? '.story-hero__actions .btn' : '.hero__actions .btn, .course-hero__actions .btn');   // the hero on show (A/B test; a course page's own hero)
  const navCta = document.querySelector('.nav-cta');
  if (!navCta) return;
  const past = (yes) => {
    document.body.classList.toggle('is-past-hero-cta', yes);
    navCta.inert = !yes;   // hidden, so not tabbable
  };
  if (!heroCta || !('IntersectionObserver' in window)) { past(true); return; }
  // Past = above the screen; below it (a short screen at load) still counts as not reached
  new IntersectionObserver(([entry]) => past(!entry.isIntersecting && entry.boundingClientRect.top < 0)).observe(heroCta);
})();

/* ============================================================
   03c · Hero CTA — a click on the hero's call to action goes to window.dataLayer with the hero the visitor saw (Hero B
   for everyone since the A/B test ended; the <head> script pushes which); a team preview of Hero A (?hero=a) is
   marked hero_preview, to leave out of the results
   ============================================================ */
(function heroTest() {
  const variant = document.documentElement.dataset.hero;
  const preview = new URLSearchParams(location.search).has('hero');
  const cta = document.querySelector(variant === 'b' ? '.story-hero__actions .btn' : '.hero__actions .btn');
  cta?.addEventListener('click', () => {
    (window.dataLayer = window.dataLayer || []).push({ event: 'hero_cta_click', hero_variant: variant, hero_preview: preview });
  });
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
   12b · Contact group
   Phone / Telegram / WhatsApp sit behind one contact button, which
   opens them as one group and stays outside it as the ✕ that closes it.
   Below 1280px the webinar bar folds into an icon-only CTA at the start
   of the row while the group is open (body.is-contact-open).
   ============================================================ */
(function contactGroup() {
  const trigger = document.querySelector('.fab--contact');
  const actions = [...document.querySelectorAll('.fab-group .fab')];
  const promoBtn = document.querySelector('.promo__btn');
  if (!trigger || !actions.length) return;

  function setOpen(open) {
    document.body.classList.toggle('is-contact-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Փակել կապի կոճակները' : 'Կապ');
  }

  trigger.addEventListener('click', () => setOpen(!document.body.classList.contains('is-contact-open')));
  actions.forEach((action) => action.addEventListener('click', () => setOpen(false)));
  promoBtn?.addEventListener('click', () => setOpen(false));
  window.addEventListener('scroll', () => {
    if (!document.body.classList.contains('is-scrolled')) setOpen(false);
  }, { passive: true });

  setOpen(false);
})();

/* ============================================================
   05 / 06 · Slider arrows for the learn tiles and teacher cards
   ============================================================ */
(function cardSliders() {
  const sliders = [
    { row: '.teachers__row', arrows: '.teachers__arrow', item: '.teacher' },
  ];

  sliders.forEach(({ row: rowSelector, arrows: arrowSelector, item }) => {
    const row = document.querySelector(rowSelector);
    const arrows = document.querySelectorAll(arrowSelector);
    if (!row || !arrows.length) return;

    const step = () => {
      const card = row.querySelector(item);
      if (!card) return row.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap) || 0;
      return card.getBoundingClientRect().width + gap;
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
  });
})();

/* ============================================================
   05d · «Ի՞նչ սովորել» slider — the arrows step one view: forward to the first tile that isn't fully in view,
   back by as much. Arrows switch off at the ends, and the right-edge fade goes once the last tile is in.
   ============================================================ */
(function learnSlider() {
  const row = document.querySelector('.learn-grid');
  const arrows = [...document.querySelectorAll('.courses__arrow')];
  if (!row || !arrows.length) return;
  const cols = [...row.querySelectorAll('.learn-col')];
  const stops = () => cols.map((c) => row.scrollLeft + c.getBoundingClientRect().left - row.getBoundingClientRect().left);

  function update() {
    const max = row.scrollWidth - row.clientWidth - 2;
    arrows[0].disabled = row.scrollLeft <= 2;
    arrows[1].disabled = row.scrollLeft >= max;
    row.classList.toggle('is-end', row.scrollLeft >= max);
  }
  arrows.forEach((btn) => btn.addEventListener('click', () => {
    const dir = Number(btn.dataset.dir), x = row.scrollLeft, all = stops();
    const colW = cols[0].getBoundingClientRect().width;
    const view = Math.max(colW, row.getBoundingClientRect().width - parseFloat(getComputedStyle(row).paddingRight));   // the page column
    const next = dir > 0
      ? all.find((p) => p + colW > x + view + 4)                        // the first tile not fully in view
      : [...all].reverse().find((p) => p <= Math.max(0, x - view) + 4) ?? 0;
    row.scrollTo({ left: next ?? row.scrollWidth });
  }));
  row.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ============================================================
   08 · MISSION — the crowd: the brand's eyes drifting under «1,000,000 AI-գրագետ հայ», each pair someone who
   learned. The row is built twice (the CSS drift moves it by half, so it loops seamlessly). Now and then a pair
   blinks or glances somewhere new; while the pointer is over the band, they all look at it (mouse screens only).
   It only works while the band is on screen, and stands still for reduced motion.
   ============================================================ */
(function missionCrowd() {
  const track = document.querySelector('.crowd__track');
  if (!track) return;
  const COUNT = 16;
  const LOOKS = ['left', 'right', 'up', 'down', 'up-left', 'up-right', 'down-left', 'down-right', null];   // null: at you
  const PUPIL_TRAVEL = { x: 9, y: 10.54 };   // the brand's pupil oval (BRAND.md → Eyes)
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const look = (eyes, dir) => { if (dir) eyes.dataset.look = dir; else delete eyes.dataset.look; };

  for (let i = 0; i < COUNT; i++) { const eyes = makeEyes(); look(eyes, pick(LOOKS)); track.append(eyes); }
  [...track.children].forEach((eyes) => track.append(eyes.cloneNode(true)));
  const crowd = [...track.children];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let onScreen = false, following = false;
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(track);

  (function blink() {
    setTimeout(() => {
      if (onScreen) {
        const eyes = pick(crowd);
        eyes.classList.add('is-blink');
        setTimeout(() => eyes.classList.remove('is-blink'), 140);
      }
      blink();
    }, 300 + Math.random() * 700);
  })();
  (function glance() {
    setTimeout(() => {
      if (onScreen && !following) look(pick(crowd), pick(LOOKS));
      glance();
    }, 400 + Math.random() * 900);
  })();

  const band = track.closest('section');
  if (!band || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let px = 0, py = 0, raf = 0;
  const follow = () => {
    raf = 0;
    crowd.forEach((eyes) => {
      const box = eyes.getBoundingClientRect();
      const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160) / d;
      eyes.style.setProperty('--look-x', (dx * k * PUPIL_TRAVEL.x).toFixed(2));
      eyes.style.setProperty('--look-y', (dy * k * PUPIL_TRAVEL.y).toFixed(2));
    });
  };
  band.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    following = true; px = e.clientX; py = e.clientY;
    raf ||= requestAnimationFrame(follow);
  });
  band.addEventListener('pointerleave', () => {
    following = false;
    crowd.forEach((eyes) => { eyes.style.removeProperty('--look-x'); eyes.style.removeProperty('--look-y'); });
  });
})();

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
   05d · 3-FRIENDS FORM — «Գրանցվել ընկերներով» opens the popup
   (.modal, a native <dialog>: Escape closes it, focus stays inside).
   «Գրանցվել ընկերներով» stays disabled until every field is filled in:
   valid emails and 8 digits after +374. Front end only: the submit is
   the developer's (TODO: send it, then payment).
   ============================================================ */
(function friendsForm() {
  const dialog = document.getElementById('friends-form');
  if (!dialog) return;
  const form = dialog.querySelector('form');
  const submit = form.querySelector('button[type="submit"]');
  const phone = form.elements.phone1;

  function update() {
    const digits = phone.value.replace(/\D/g, '');
    const ok = Array.from(form.querySelectorAll('input')).every((input) => input.value.trim() !== '' && input.checkValidity());
    submit.disabled = !(ok && digits.length === 8);
  }

  document.querySelectorAll('[data-open="friends-form"]').forEach((btn) => btn.addEventListener('click', () => dialog.showModal()));
  dialog.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // a click on the dimmed page around it

  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => {
    e.preventDefault();               // no backend yet
    if (submit.disabled) return;
    // TODO (developer): send the three people (new FormData(form)), then go on to payment / the confirmation
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
   05 · «Ի՞նչ սովորել» tiles → the course card
   Each tile names the card that teaches it (data-pkg="master": the AI-Master
   card, the whole course). Wide screens: scroll to the card, name the topic
   in a banner inside it (.pkg-spot), and once the scroll lands spotlight it
   (.packages[data-spotlight]): it lifts. The spotlight ends when the card
   leaves the screen, or at once via the banner's ✕ (which also hides it).
   Stacked (below lg): just scroll to the card. (The fade / hover-back below
   is for a card that steps back; no card does at the moment.)
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

    const title = tile.querySelector('.learn-tile__title');
    card.querySelector('.pkg-spot__topic').textContent = title.dataset.topic || title.textContent;   // the full wording reads as a sentence
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
   Brand shapes — shared by the bubble-shaped tiles (05c) and the hero's bubble button (03b)
   roundedOutline: a closed path through [x, y, radius] points, each corner rounded with a circle-like curve
   (radius 0 = sharp). shapeElement: cuts an element to that outline (clip-path) and adds a ring along it for
   keyboard focus (.shape-ring), since the clipped element loses its outline.
   ============================================================ */
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
function shapeElement(el, pts) {
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
const canClip = 'clipPath' in document.documentElement.style;

// The brand's eyes as an inline 96 × 50 SVG (.eyes: white ovals, black pupils; data-look / --look-x, --look-y turn the
// pupils) — the learn tiles' peeking eyes (05c) and the mission's crowd (08)
function makeEyes() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'eyes');
  svg.setAttribute('viewBox', '0 0 96 50');
  svg.setAttribute('aria-hidden', 'true');
  [23.05, 72.94].forEach((cx) => {              // the brand's eyes (index.html, the hero's walk), no ™ as a character
    const white = document.createElementNS(NS, 'ellipse');
    Object.entries({ class: 'eyes__white', cx, cy: 24.98, rx: 23.05, ry: 24.98 }).forEach(([k, v]) => white.setAttribute(k, v));
    svg.append(white);
  });
  [23.05, 72.94].forEach((cx) => {
    const pupil = document.createElementNS(NS, 'circle');
    Object.entries({ class: 'eyes__pupil', cx, cy: 24.98, r: 10.93 }).forEach(([k, v]) => pupil.setAttribute(k, v));
    svg.append(pupil);
  });
  return svg;
}

/* ============================================================
   03b · The hero's bubble button («Սովորի՛ր», .btn--inline)
   Cut to the brand's chat bubble at its real size: straight sides with small corners (8), the right side
   stepping in a little at the bottom, then an angled tail at the bottom-right pointing down; from the tail the
   bottom edge falls away to the bottom-left corner. The tail takes the button's extra bottom padding (T);
   proportions are the brand bubble's (240 × 302 drawing), measured in T so the tail keeps its shape at any width.
   ============================================================ */
(function heroBubble() {
  // also the reviews' bubbles (05f · .quote__bubble) and Hero B's draw bubble (03 B), whose corners scale up 1.5× for their size
  const buttons = [...document.querySelectorAll('.btn--inline, .quote__bubble, .story-hero__bubble')];
  if (!buttons.length || !canClip) return;
  function shape(el) {
    const W = el.offsetWidth, H = el.offsetHeight;
    const cs = getComputedStyle(el);
    const T = parseFloat(cs.paddingBottom) - parseFloat(cs.paddingTop);   // the tail's room at the bottom
    if (!W || !H || T <= 0) return;
    const Hb = H - T, e = 0.17 * T;
    const r = el.matches('.quote__bubble, .story-hero__bubble') ? 1.5 : 1;   // corner scale
    shapeElement(el, [
      [0, 0, 8 * r], [W, 0, 8 * r],
      [W, Hb, 4 * r],                           // the right side ends…
      [W - e, Hb + 0.13 * T, 6 * r],            // …stepping in a little
      [W - e, H, 3 * r],                        // the tail's straight side, down to its tip
      [W - e - 0.6 * T, Hb + 0.34 * T, 8 * r],  // the tail's angled side, back up to the bottom edge
      [0, H, 8 * r],                            // the bottom edge falls away to the bottom-left corner
    ]);
  }
  const all = () => buttons.forEach(shape);
  all();
  const resizer = new ResizeObserver((entries) => entries.forEach((en) => shape(en.target)));
  buttons.forEach((b) => resizer.observe(b));
  document.fonts?.ready.then(all);
})();

/* ============================================================
   15 · Course page (ai-grager.html) — the week's eyes: they rise from behind the card's top-right corner while the pointer is
   on the card (or a lesson link in it has keyboard focus), follow the pointer over the hero and blink now and then,
   as the «Ի՞նչ սովորել» tiles' eyes (05c). The rise is in tailwind.css (.course-week > .eyes)
   ============================================================ */
(function courseWeekEyes() {
  const card = document.querySelector('.course-week');
  const eyes = card?.querySelector(':scope > .eyes');
  if (!eyes) return;
  const PUPIL_TRAVEL = { x: 9, y: 10.54 };   // the brand's pupil oval, in the eyes' 96 × 50 units (BRAND.md → Eyes)
  const show = () => eyes.classList.add('is-up');
  const hide = () => eyes.classList.remove('is-up');
  card.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(); });
  card.addEventListener('pointerleave', hide);
  card.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) show(); });   // keyboard focus, not a tap
  card.addEventListener('focusout', (e) => { if (!card.contains(e.relatedTarget)) hide(); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hero = card.closest('section');
  if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let px = 0, py = 0, raf = 0;
    const follow = () => {
      raf = 0;
      const box = eyes.getBoundingClientRect();
      const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160) / d;   // nearer than 160px: less far off-centre
      eyes.style.setProperty('--look-x', (dx * k * PUPIL_TRAVEL.x).toFixed(2));
      eyes.style.setProperty('--look-y', (dy * k * PUPIL_TRAVEL.y).toFixed(2));
    };
    hero.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(follow); });
    hero.addEventListener('pointerleave', () => { eyes.style.removeProperty('--look-x'); eyes.style.removeProperty('--look-y'); });
  }

  (function blink() {
    setTimeout(() => {
      if (eyes.classList.contains('is-up')) { eyes.classList.add('is-blink'); setTimeout(() => eyes.classList.remove('is-blink'), 140); }
      blink();
    }, 1200 + Math.random() * 2400);
  })();
})();

/* ============================================================
   05c · Bubble-shaped tiles (BRAND.md → Bubble construction)
   Each «Ի՞նչ սովորել» tile is cut into the brand bubble: rounded rectangles merged (outer corners 24, inner
   12: the brand's 20 / 10 ratio, at the site's tile rounding), with one straight, angled tail at a top corner, a
   stepped corner, and on some a slit in the right side where there's room. Every tile gets its own mix (SHAPES, in page order),
   computed for its real size, and nothing is cut where the text sits. Without script the tiles stay rounded
   rectangles.
   The eyes peek from just outside each bubble (BRAND.md → Bubble construction: Peek; Figma slide 41, «The eyes as a
   character»: never on top of the shape): they sit on the shoulder of the cut-out top corner (the tail's if there is
   one), beside the raised part. They only come out on hover (or keyboard focus): they rise from behind the shoulder,
   follow the pointer and blink now and then, and sink back when the pointer leaves.
   Shape and crop: when the row scrolls into view each tile starts as a plain rounded rectangle and its corner is cut
   in, one tile after another. On hover the cut goes a little deeper as the eyes come up.
   ============================================================ */
(function learnShapes() {
  const tiles = [...document.querySelectorAll('.learn-tile')];
  if (!tiles.length || !canClip) return;
  const SHAPES = [               // page order
    'tail-left',                  // AI հիմունքներ
    'step-right',                 // Նկարներ
    'step-left tail-right slit',  // Հետազոտություն
    'tail-right',                 // Կյանքի 10 իրավիճակ
    'step-left',                  // Վիդեոներ
    'tail-left slit',             // Կայքէջեր — the bubble as drawn in the brandbook
    'step-right',                 // Առաջին նախագիծ
    'step-left tail-right',       // Ավտոմատացում
    'tail-right slit',            // Ագենտներ
  ];
  const R = 24, r = 12, TAIL = 22, SLIT = 12, INSET = 16;
  const EYES_GAP = 4;                             // air between the eyes and the shape
  const PUPIL_TRAVEL = { x: 9, y: 10.54 };        // the brand's pupil oval, in the eyes' 96 × 50 units (BRAND.md → Eyes)
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eyesOf = new Map();                       // tile → its eyes (an <svg class="eyes"> in the tile's column)
  const HOVER = 1.3;                              // how much deeper the cut goes on hover
  const progress = new Map();                     // tile → its cut: 0 a plain rectangle · 1 the bubble · HOVER on hover
  const animating = !reduced && 'IntersectionObserver' in window;


  // On the shoulder of the cut-out corner (height t), clear of the raised part by EYES_GAP; outside the tile's clip
  function placeEyes(tile, { left, right, a, t, tFull, W }) {
    const side = left === 'tail' ? 'left' : right === 'tail' ? 'right' : left ? 'left' : right ? 'right' : null;
    let eyes = eyesOf.get(tile);
    if (!side) { eyes?.remove(); eyesOf.delete(tile); return; }
    if (!eyes) {
      eyes = makeEyes();   // hidden (below the shoulder) until the tile is hovered: .is-up
      tile.before(eyes);
      eyesOf.set(tile, eyes);
    }
    const kind = side === 'left' ? left : right;
    const room = (kind === 'tail' ? a - TAIL : a) - 2 * EYES_GAP;   // the cut-out's width (a tail leans out at the top)
    const w = Math.min(room, (tFull - 2 * EYES_GAP) * 96 / 50), h = w * 50 / 96;   // sized by the full cut: same size on hover
    const x = side === 'left'
      ? room + EYES_GAP - w                                 // left of the raised part
      : W - room - EYES_GAP;                                // right of it
    Object.assign(eyes.style, {
      left: `${(tile.offsetLeft + x).toFixed(1)}px`,
      top: `${(tile.offsetTop + t - EYES_GAP - h).toFixed(1)}px`,
      width: `${w.toFixed(1)}px`,
    });
    eyes.dataset.look = side === 'left' ? 'down-right' : 'down-left';   // at rest: looking into their bubble
  }

  function shape(tile, i) {
    const W = tile.clientWidth, H = tile.clientHeight;
    if (!W || !H) return;
    const has = (f) => (SHAPES[i % SHAPES.length] || '').split(' ').includes(f);
    const title = tile.querySelector('.learn-tile__pkg, .learn-tile__title');   // the course line sits above the title
    const safe = title ? title.offsetTop - 12 : H;   // keep every cut above the text
    const p = progress.get(tile) ?? 1;
    const a = clamp(W * 0.3, 56, 150);
    const tFull = Math.min(clamp(H * 0.12, 28, 52), safe - 8);     // the cut's depth when the bubble is whole
    const t = Math.max(2, Math.min(tFull * p, safe - 8));           // …and right now (crop-in, hover)
    const tail = TAIL * Math.min(1, p);                             // the tail leans out as the cut goes in
    const s = Math.round(H * 0.38);
    const left = tFull >= 20 && (has('tail-left') ? 'tail' : has('step-left') ? 'step' : null);
    const right = tFull >= 20 && (has('tail-right') ? 'tail' : has('step-right') ? 'step' : null);
    const slit = has('slit') && s >= tFull + 2 * R && s + SLIT + 2 * R < safe;

    const pts = [];
    if (left) pts.push([0, t, R], [a, t, r], left === 'tail' ? [a - tail, 0, 0] : [a, 0, R]);
    else pts.push([0, 0, R]);
    if (right) pts.push(right === 'tail' ? [W - a + tail, 0, 0] : [W - a, 0, R], [W - a, t, r], [W, t, R]);
    else pts.push([W, 0, R]);
    if (slit) {
      const d = Math.round(INSET + 2 + (W * 0.38 - INSET - 2) * Math.min(1, p));   // the slit opens with the cut
      pts.push([W, s, R], [W - d, s, SLIT / 2], [W - d, s + SLIT, SLIT / 2], [W - INSET, s + SLIT, R], [W - INSET, H, R]);
    } else pts.push([W, H, R]);
    pts.push([0, H, R]);
    shapeElement(tile, pts);
    placeEyes(tile, { left, right, a, t, tFull, W });
  }

  // Eases one tile's cut from where it is to `to` (ms long, after `delay`); `done` runs at the end
  const tweens = new Map();
  function cutTo(tile, to, ms, delay = 0, done) {
    cancelAnimationFrame(tweens.get(tile));
    const from = progress.get(tile) ?? 1, i = tiles.indexOf(tile);
    const start = performance.now() + delay;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    (function frame(now) {
      const k = Math.min(1, Math.max(0, (now - start) / ms));
      progress.set(tile, from + (to - from) * ease(k));
      shape(tile, i);
      if (k < 1) tweens.set(tile, requestAnimationFrame(frame));
      else done?.();
    })(performance.now());
  }

  if (animating) tiles.forEach((tile) => progress.set(tile, 0));   // plain rectangles until the row comes into view

  const all = () => tiles.forEach(shape);
  all();
  const resizer = new ResizeObserver((entries) => entries.forEach((en) => shape(en.target, tiles.indexOf(en.target))));
  tiles.forEach((tile) => resizer.observe(tile));   // reshape when a tile changes size (screen width, layout)
  document.fonts?.ready.then(all);   // titles settle once the font is in, which can move the safe line

  // Crop-in: once the row is in view, the corners are cut one tile after another
  const ready = new Set(animating ? [] : tiles);   // tiles whose bubble is whole
  if (animating) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      tiles.forEach((tile, i) => cutTo(tile, 1, 650, i * 90, () => ready.add(tile)));
    }, { threshold: 0.35 });
    io.observe(tiles[0].closest('.learn-grid'));
  }

  // Hover / keyboard focus: the eyes come up from behind the shoulder (and the cut goes a little deeper)
  tiles.forEach((tile) => {
    const show = () => {
      if (!ready.has(tile)) return;
      eyesOf.get(tile)?.classList.add('is-up');
      if (animating) cutTo(tile, HOVER, 320);
    };
    const hide = () => {
      eyesOf.get(tile)?.classList.remove('is-up');
      if (animating && ready.has(tile)) cutTo(tile, 1, 420);
    };
    const mouse = (fn) => (e) => { if (e.pointerType !== 'touch') fn(); };   // a tap goes to the packages; no eyes left up behind
    tile.addEventListener('pointerenter', mouse(show));
    tile.addEventListener('pointerleave', mouse(hide));
    tile.addEventListener('focus', () => { if (tile.matches(':focus-visible')) show(); });   // keyboard focus, not a tap
    tile.addEventListener('blur', hide);
  });
  if (reduced) return;

  // The eyes follow the pointer while it's over the section (mouse screens only), within the brand's pupil oval
  const section = tiles[0].closest('section');
  if (section && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let px = 0, py = 0, raf = 0;
    const follow = () => {
      raf = 0;
      eyesOf.forEach((eyes) => {
        const box = eyes.getBoundingClientRect();
        const dx = px - (box.left + box.width / 2), dy = py - (box.top + box.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160) / d;   // nearer than 160px: less far off-centre
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

  // Now and then the eyes that are out blink (.eyes.is-blink)
  (function blink() {
    setTimeout(() => {
      const all = [...eyesOf.values()].filter((e) => e.classList.contains('is-up'));
      const eyes = all[Math.floor(Math.random() * all.length)];
      if (eyes) { eyes.classList.add('is-blink'); setTimeout(() => eyes.classList.remove('is-blink'), 140); }
      blink();
    }, 1200 + Math.random() * 2400);
  })();
})();


/* ============================================================
   09b · WEBINAR WORDMARK — «AI քեզ» + the role word from data-words
   on .wordmark__role (now just «վեբինար»; with several words, e.g.
   "վեբինար|բժիշկ", it rotates through them). Every few seconds every letter
   of both lines flips through random font styles and the role's letters
   scramble and settle left-to-right (LETTER SHUFFLE helpers, top of this
   file), then all of them land in the headline cut (ExtraBold Italic) and
   hold, so at rest the wordmark reads. Pauses while off screen.
   ============================================================ */
(function wordmarkShuffle() {
  const box = document.querySelector('.wordmark__type');
  const fixed = document.querySelector('.wordmark__fixed');
  const role = document.querySelector('.wordmark__role');
  if (!box || !fixed || !role) return;

  const WORDS = role.dataset.words.split('|');
  const HOLD = 6000;   // ms the settled wordmark stays still on screen
  const calm = (glyphs) => glyphs.forEach((g) => { g.dataset.f = '0'; });   // at rest: data-f 0, ExtraBold Italic
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.fonts.ready.then(() => {   // slot widths need the real fonts
    const spell = makeSpeller(box);
    const fixedGlyphs = spell(fixed, fixed.textContent.trim()).map(({ glyph }) => glyph);
    calm(fixedGlyphs);
    let index = WORDS.indexOf(role.textContent.trim());
    calm(spell(role, WORDS[index]).map(({ glyph }) => glyph));

    if (reduced) {   // no flicker: just swap the role word
      setInterval(() => {
        index = (index + 1) % WORDS.length;
        calm(spell(role, WORDS[index]).map(({ glyph }) => glyph));
      }, HOLD + 1000);
      return;
    }

    let cancel = () => {}, timer = 0, running = false;
    function play() {
      index = (index + 1) % WORDS.length;
      const letters = spell(role, WORDS[index]);
      cancel = shuffleIn(letters, { also: fixedGlyphs, onDone: () => {
        calm(fixedGlyphs);
        calm(letters.map(({ glyph }) => glyph));
        timer = setTimeout(play, HOLD);
      } });
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
