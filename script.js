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
   motion, the whole drawing shows still. Prototyped in hero-eyes/.
   ============================================================ */
(function heroWalk() {
  const hero = document.querySelector('.hero');
  const svg = hero?.querySelector('.walk');
  if (!svg) return;


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

/* ============================================================
   03b · The hero's bubble button («Սովորի՛ր», .btn--inline)
   Cut to the brand's chat bubble at its real size: straight sides with small corners (8), the right side
   stepping in a little at the bottom, then an angled tail at the bottom-right pointing down; from the tail the
   bottom edge falls away to the bottom-left corner. The tail takes the button's extra bottom padding (T);
   proportions are the brand bubble's (240 × 302 drawing), measured in T so the tail keeps its shape at any width.
   ============================================================ */
(function heroBubble() {
  const buttons = [...document.querySelectorAll('.btn--inline')];
  if (!buttons.length || !canClip) return;
  function shape(el) {
    const W = el.offsetWidth, H = el.offsetHeight;
    const cs = getComputedStyle(el);
    const T = parseFloat(cs.paddingBottom) - parseFloat(cs.paddingTop);   // the tail's room at the bottom
    if (!W || !H || T <= 0) return;
    const Hb = H - T, e = 0.17 * T;
    shapeElement(el, [
      [0, 0, 8], [W, 0, 8],
      [W, Hb, 4],                               // the right side ends…
      [W - e, Hb + 0.13 * T, 6],                // …stepping in a little
      [W - e, H, 3],                            // the tail's straight side, down to its tip
      [W - e - 0.6 * T, Hb + 0.34 * T, 8],      // the tail's angled side, back up to the bottom edge
      [0, H, 8],                                // the bottom edge falls away to the bottom-left corner
    ]);
  }
  const all = () => buttons.forEach(shape);
  all();
  const resizer = new ResizeObserver((entries) => entries.forEach((en) => shape(en.target)));
  buttons.forEach((b) => resizer.observe(b));
  document.fonts?.ready.then(all);
})();

/* ============================================================
   05c · Bubble-shaped tiles (BRAND.md → Bubble construction)
   Each «Ի՞նչ սովորել» tile is cut into the brand bubble: rounded rectangles merged (outer corners 24, inner
   12: the brand's 20 / 10 ratio, at the site's tile rounding), with one straight, angled tail at a top corner, a
   stepped corner, and on some a slit in the right side. Every tile gets its own mix (SHAPES, in page order),
   computed for its real size, and nothing is cut where the title sits. Without script the tiles stay rounded
   rectangles.
   ============================================================ */
(function learnShapes() {
  const tiles = [...document.querySelectorAll('.learn-tile')];
  if (!tiles.length || !canClip) return;
  const SHAPES = [
    'tail-left slit',             // AI հիմունքներ — the bubble as drawn in the brandbook
    'tail-right',                 // Պրեզենտացիաներ
    'step-left',                  // Կայքեր
    'step-right slit',            // Հետազոտություններ
    'step-left tail-right slit',  // Նկարներ
    'tail-left',                  // Վիդեոներ
    'step-right',                 // Ավտոմատացում
    'step-left tail-right',       // Ագենտներ
  ];
  const R = 24, r = 12, TAIL = 22, SLIT = 12, INSET = 16;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function shape(tile, i) {
    const W = tile.clientWidth, H = tile.clientHeight;
    if (!W || !H) return;
    const has = (f) => (SHAPES[i % SHAPES.length] || '').split(' ').includes(f);
    const title = tile.querySelector('.learn-tile__title');
    const safe = title ? title.offsetTop - 12 : H;   // keep every cut above the title
    const a = clamp(W * 0.3, 56, 150);
    const t = Math.min(clamp(H * 0.12, 28, 52), safe - 8);
    const s = Math.round(H * 0.38);
    const left = t >= 20 && (has('tail-left') ? 'tail' : has('step-left') ? 'step' : null);
    const right = t >= 20 && (has('tail-right') ? 'tail' : has('step-right') ? 'step' : null);
    const slit = has('slit') && s >= t + 2 * R && s + SLIT + 2 * R < safe;

    const pts = [];
    if (left) pts.push([0, t, R], [a, t, r], left === 'tail' ? [a - TAIL, 0, 0] : [a, 0, R]);
    else pts.push([0, 0, R]);
    if (right) pts.push(right === 'tail' ? [W - a + TAIL, 0, 0] : [W - a, 0, R], [W - a, t, r], [W, t, R]);
    else pts.push([W, 0, R]);
    if (slit) {
      const d = Math.round(W * 0.38);
      pts.push([W, s, R], [W - d, s, SLIT / 2], [W - d, s + SLIT, SLIT / 2], [W - INSET, s + SLIT, R], [W - INSET, H, R]);
    } else pts.push([W, H, R]);
    pts.push([0, H, R]);
    shapeElement(tile, pts);
  }

  const all = () => tiles.forEach(shape);
  all();
  const resizer = new ResizeObserver((entries) => entries.forEach((en) => shape(en.target, tiles.indexOf(en.target))));
  tiles.forEach((tile) => resizer.observe(tile));   // reshape when a tile changes size (screen width, layout)
  document.fonts?.ready.then(all);   // titles settle once the font is in, which can move the safe line
})();


/* ============================================================
   08 · MISSION — lighthouse, drawn as SVG and added to the mission section
   Teal shading, checkered tower,
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
  const c = (name) => `var(--lh-${name})`;   // palette lives in CSS (.mission__lighthouse): Teal 50–900, glow 100–400
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
  gradient(defs, 'lh-hill', [[0, c('900')], [.45, c('600')], [1, c('200')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  gradient(defs, 'lh-dark', [[0, c('800')], [1, c('600')]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  gradient(defs, 'lh-light', [[0, c('500')], [1, c('100')]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  gradient(defs, 'lh-lantern', [[0, c('700')], [1, c('400')]], { x1: 0, y1: 0, x2: 1, y2: 0 });
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
  for (let x = 211; x <= 375; x += 12) el('rect', { x, y: 306, width: 4, height: 29, fill: c('700') }, house);
  el('rect', { x: 203, y: 299, width: 182, height: 8, rx: 4, fill: 'url(#lh-dark)' }, house);
  // lantern room + windows (the windows light up)
  el('rect', { x: 242, y: 228, width: 104, height: 72, fill: 'url(#lh-lantern)' }, house);
  const windows = el('g', { fill: c('glow-200') }, house);
  el('rect', { x: 251, y: 238, width: 38, height: 46, rx: 2 }, windows);
  el('rect', { x: 299, y: 238, width: 38, height: 46, rx: 2 }, windows);
  // roof + finial
  el('polygon', { points: `218,231 ${CX},176 368,231`, fill: 'url(#lh-dark)' }, house);
  el('circle', { cx: CX, cy: 166, r: 16, fill: c('700') }, house);

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
