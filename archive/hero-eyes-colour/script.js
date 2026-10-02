/* Watching eyes — one continuous SVG line that tells a tiny story and writes «AI քեզ բան».
   A pair of eyes rides the tip of the line and the line is revealed behind them
   (stroke-dasharray / stroke-dashoffset) while a camera follows the eyes scene by scene.
   The pupils glance around on their own (where the line is going, at you, back, up, down) and blink now and then.
   It never stops: the end of «բան» swoops straight into the next «AI» and the camera keeps walking with the eyes
   (see ENDLESS WALK below).

   Story: AI → a developer walks by with a laptop → a photographer takes a photo → քեզ
          → a teacher points at a board and draws a rising chart → բան

   A copy of ../hero-eyes with new ways for the backdrop colour to change between beats (see BACKDROP below),
   switched in the try-out bar:
   · place  — each beat is a «room» of solid colour laid out in the drawing's coordinates, so the next colour
              slides in with the camera and the eyes walk into it
   · circle — when the eyes finish a beat, the next colour opens from them as a circle
   · cut    — the instant cut of ../hero-eyes, for comparison
   The markup it needs is in index.html (.yarn, #thread, #eyes, #eyes-blink, #pupil-l, #pupil-r, #world, #reveal,
   .tryout). GSAP loads first, this file as a module. Colours live in styles.css ([data-bg="<colour>"]). */

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
   STORY BEATS — the eyes reach the end of each piece after N seconds, and each beat has its own
   background colour in each palette (the site hero's «warhol» palette; colours live in styles.css).
   The eyes ease in and out of every beat, so they take a breath between scenes — that's when the colour changes.
   One lap of beats draws the whole drawing once (≈ 19s); then the next copy follows straight on, forever.
   ------------------------------------------------------------------ */
const BEATS = [
  //                            six (as now)  three (one per word)
  ['I', 2.4,            { six: 'orange', three: 'orange' }],   // AI
  ['developer', 3.2,    { six: 'yellow', three: 'orange' }],   // someone walks with a laptop…
  ['photographer', 3.8, { six: 'mint',   three: 'yellow' }],   // …takes a photo
  ['զ', 2.4,            { six: 'cyan',   three: 'yellow' }],   // քեզ
  ['teacher', 3.6,      { six: 'tan',    three: 'mint' }],     // someone teaches at a board
  ['loop', 3.4,         { six: 'orchid', three: 'mint' }],     // բան, and the swoop into the next «AI»
];

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
const EYES_H = 28;         // height of the eyes in SVG units (see index.html: r = 14)
const MIN_EYES_PX = 14;    // …never smaller than this on screen
const PUPIL_TRAVEL = 6;    // how far a pupil can move from the centre of its eye (SVG units)

/* EYES — every GLANCE seconds (random within the range) the eyes pick somewhere new to look.
   'ahead' follows the direction the line is travelling; the rest are fixed directions (x right, y down). */
const GLANCE = [0.7, 1.8];
const LOOKS = [
  'ahead', 'ahead', 'ahead',           // mostly: where the line is going
  { x: 0, y: 0.15 },                   // at you
  { x: -0.9, y: 0.35 },                // back at what was just drawn
  { x: 0.75, y: -0.7 },                // up and ahead
  { x: -0.7, y: -0.7 },                // up and behind
  { x: 0.2, y: 0.95 },                 // down at the ground
];
const BLINK = [2.2, 5];    // seconds between blinks (random within the range)

/* BACKDROP — how the colour changes (the try-out bar picks one of TRANSITIONS and one of PALETTES)
   place:  one room per beat, from where the previous beat ends to where this one ends (drawing x), so the
           boundary sits exactly where the eyes pause between two beats
   circle: the next colour grows from the eyes to the farthest corner of the screen in REVEAL seconds;
           it starts slow (a bloom behind the eyes) and speeds up as it sweeps off screen */
const TRANSITIONS = ['place', 'circle', 'cut'];
const PALETTES = ['six', 'three'];
const REVEAL = 0.7;

/* ------------------------------------------------------------------ */

const svg = document.querySelector('.yarn');
const world = document.getElementById('world');
const reveal = document.getElementById('reveal');
const thread = document.getElementById('thread');
const eyes = document.getElementById('eyes');
const eyesBlink = document.getElementById('eyes-blink');
const pupils = [document.getElementById('pupil-l'), document.getElementById('pupil-r')];
const PUPIL_HOME = pupils.map((p) => +p.getAttribute('cx'));

// Where each piece ends along one copy of the drawing (for the story beats), and at which x (for the rooms)
const pieceEnd = {};
const pieceEndX = {};
THREAD.forEach(([name], i) => {
  thread.setAttribute('d', THREAD.slice(0, i + 1).map(([, d]) => d).join(' '));
  pieceEnd[name] = thread.getTotalLength();
  pieceEndX[name] = thread.getPointAtLength(pieceEnd[name]).x;
});
const LAP = pieceEnd.loop;   // length of one copy
const BEAT_ENDS = BEATS.map(([piece]) => pieceEnd[piece]);

// The rooms: one per beat, for five copies of the drawing (one before the walk, one after — enough to cover
// any screen)
const rooms = [];
for (let copy = -1; copy <= 3; copy++) {
  BEATS.forEach(([piece, , colours], i) => {
    const from = i ? pieceEndX[BEATS[i - 1][0]] : pieceEndX.loop - TILE;
    const el = document.createElement('div');
    el.className = 'room';
    world.append(el);
    rooms.push({ el, colours, x0: from + copy * TILE, x1: pieceEndX[piece] + copy * TILE });
  });
}

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

// Camera x for every point of the line, averaged so it glides instead of jiggling with each stroke
const STEP = 10;
const camX = (() => {
  const xs = [];
  for (let l = 0; l <= LENGTH + STEP; l += STEP) xs.push(thread.getPointAtLength(Math.min(l, LENGTH)).x);
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

let screen = { w: 1, h: 1, left: 0, top: 0 };
function measure() {
  const r = svg.getBoundingClientRect();
  screen = { w: svg.clientWidth || 1, h: svg.clientHeight || 1, left: r.left, top: r.top };
}
measure();

const lerp = (a, b, t) => a + (b - a) * t;
const rand = ([a, b]) => a + Math.random() * (b - a);

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
  const back = thread.getPointAtLength(Math.max(0, head - 14));
  const here = thread.getPointAtLength(head);
  const dx = here.x - back.x, dy = here.y - back.y, d = Math.hypot(dx, dy);
  if (Math.abs(head - lastHead) > 0.2 && d > 1) travel = { x: dx / d, y: dy / d };
  lastHead = head;
  return travel;
}

const choice = { t: 'place', pal: 'six' };   // set from the URL / try-out bar below

// Place: the world strip sits where drawing x = 0 lands on screen; the rooms are re-laid out only when the
// zoom changes (resize), so every frame is just one transform
let roomsZoom = 0;
function slideRooms(origin, k) {
  if (k !== roomsZoom) {
    roomsZoom = k;
    rooms.forEach(({ el, x0, x1 }) => {
      el.style.left = `${x0 * k}px`;
      el.style.width = `${(x1 - x0) * k + 1}px`;   // +1px: no seam between two rooms
    });
  }
  const dpr = window.devicePixelRatio || 1;
  world.style.transform = `translate3d(${Math.round(origin.x * dpr) / dpr}px, 0, 0)`;
}

// Circle: `shown` is the page colour; a change grows `reveal` (already in the new colour) from the eyes,
// then hands the colour to the page and hides the circle again
let shown = null, eyesAt = { x: 0, y: 0 };
const circle = { r: 0, tween: null };
function drawCircle() {
  const far = Math.hypot(Math.max(eyesAt.x, innerWidth - eyesAt.x), Math.max(eyesAt.y, innerHeight - eyesAt.y));
  reveal.style.clipPath = `circle(${circle.r * far}px at ${eyesAt.x}px ${eyesAt.y}px)`;
}
function setColour(colour, grow) {
  if (colour === shown) return;
  if (circle.tween) circle.tween.progress(1);   // finish a circle still growing (only when scrubbing / switching)
  shown = colour;
  if (!grow) { document.body.dataset.bg = colour; return; }
  reveal.dataset.bg = colour;
  circle.r = 0;
  circle.tween = gsap.to(circle, {
    r: 1, duration: REVEAL, ease: 'power2.in', onUpdate: drawCircle,
    onComplete: () => { document.body.dataset.bg = colour; circle.r = 0; circle.tween = null; drawCircle(); },
  });
}

function render() {
  const lapPos = state.pos * LAP;
  const lapped = state.lapped || (loopTl && loopTl.iteration() > 1);
  const head = (lapped ? LAP : 0) + lapPos;

  // Camera
  const view = camera(head);
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const pxPerUnit = Math.min(screen.w / view.w, screen.h / view.h);

  // Where drawing (0, 0) lands on screen (the viewBox is centred in the SVG when its shape doesn't match,
  // as in the still view) — to place the rooms and find the eyes on screen
  const origin = {
    x: screen.left + (screen.w - view.w * pxPerUnit) / 2 - view.x * pxPerUnit,
    y: screen.top + (screen.h - view.h * pxPerUnit) / 2 - view.y * pxPerUnit,
  };
  const p = thread.getPointAtLength(head);
  eyesAt = { x: origin.x + p.x * pxPerUnit, y: origin.y + p.y * pxPerUnit };

  // Backdrop: rooms slide with the camera (place), or the page takes the colour of the beat the eyes are in
  if (choice.t === 'place') slideRooms(origin, pxPerUnit);
  else {
    const beat = BEAT_ENDS.findIndex((end) => lapPos <= end + 0.5);
    setColour(BEATS[beat < 0 ? BEATS.length - 1 : beat][2][choice.pal], choice.t === 'circle' && !state.still);
    if (circle.tween) drawCircle();   // the circle's centre follows the eyes while it grows
  }

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
  pupils.forEach((pupil, i) => {
    pupil.setAttribute('cx', PUPIL_HOME[i] + look.x * k * PUPIL_TRAVEL);
    pupil.setAttribute('cy', look.y * k * PUPIL_TRAVEL);
  });
}

window.addEventListener('resize', () => { measure(); render(); });

// Try-out bar: transition and palette, kept in the URL. Switching jumps straight to the new look (no circle).
const params = new URLSearchParams(location.search);
if (TRANSITIONS.includes(params.get('t'))) choice.t = params.get('t');
if (PALETTES.includes(params.get('pal'))) choice.pal = params.get('pal');
function applyChoice() {
  rooms.forEach(({ el, colours }) => { el.dataset.bg = colours[choice.pal]; });
  world.hidden = choice.t !== 'place';
  if (circle.tween) circle.tween.progress(1);
  shown = null;
  document.querySelectorAll('.tryout [data-t]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === choice.t));
  document.querySelectorAll('.tryout [data-pal]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pal === choice.pal));
  history.replaceState(null, '', `?t=${choice.t}&pal=${choice.pal}`);
}
document.querySelector('.tryout').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.t) choice.t = b.dataset.t;
  if (b.dataset.pal) choice.pal = b.dataset.pal;
  applyChoice();
  render();
});
applyChoice();

render();   // start hidden (no line, no eyes) until the first frame

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion || !window.gsap) {
  // No animation: show one whole drawing with the eyes resting at the end of «բան», looking at you
  Object.assign(state, { pos: pieceEnd.tail / LAP, size: 1, still: true });
  target = { x: 0, y: 0.15 };
  Object.assign(look, target);
  render();
} else {
  gsap.to(state, { size: 1, duration: APPEAR, ease: 'back.out(2)', onUpdate: render });

  // One lap, repeated forever. From the second lap on the eyes walk the second copy (see ENDLESS WALK).
  const tl = loopTl = gsap.timeline({ repeat: -1, onUpdate: render, onRepeat: () => { state.lapped = true; } });
  BEATS.forEach(([piece, seconds], i) => {
    const from = i ? pieceEnd[BEATS[i - 1][0]] / LAP : 0;
    tl.fromTo(state, { pos: from }, { pos: pieceEnd[piece] / LAP, duration: seconds, ease: 'sine.inOut', immediateRender: false });
  });

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

  // Pause everything while it's scrolled out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const on = entry.isIntersecting;
      [tl, glance, blink].forEach((a) => (on ? a.resume() : a.pause()));
    }).observe(svg);
  }
}
