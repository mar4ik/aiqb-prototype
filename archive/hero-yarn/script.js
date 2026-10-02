/* Yarn thread animation — one continuous SVG path that tells a tiny story and writes «AI քեզ բան».
   A yarn ball rolls along the path and the thread is revealed behind it
   (stroke-dasharray / stroke-dashoffset) while a camera follows the ball scene by scene.
   At the end the camera pulls back to show the whole drawing, the thread is reeled back in, and it loops.

   Story: AI → someone walks along the thread, leaps and flies → քեզ → someone stops and wonders (?) → բան

   Used by both example pages here: index.html (plain demo) and hero.html (inside a copy of the site hero).
   Both load GSAP first and this file as a module, with the same SVG markup (.yarn, #thread, #ball, #ball-spin).
   Every element marked data-yarn-bg gets data-bg="<colour>" for the current scene — the page's CSS turns that
   into the backdrop. */

/* ------------------------------------------------------------------
   THE THREAD — one path, split into pieces so each letter / scene is easy to tweak.
   Every piece starts where the previous one ends (only the first has "M").
   Guide lines (viewBox units): baseline y=400 · x-height y=300 ·
   capitals / ascenders y≈228 · descenders y≈470 · the figures stand on the ground y=440.
   ------------------------------------------------------------------ */
const THREAD = [
  // lead-in: out of the ball, one lazy loop, then a long swash under the A up to its right foot
  ['lead-in', 'M 50 468 C 85 490, 130 482, 140 458 C 148 438, 130 424, 116 436 C 102 448, 114 472, 142 470' +
              ' C 200 468, 300 440, 324 402'],

  // A: up the right leg, down the left, curl at the foot, crossbar left → right
  ['A', 'C 314 360, 290 285, 273 231 C 270 223, 265 223, 262 231 C 245 285, 222 350, 206 398' +
        ' C 202 410, 188 414, 185 398 C 182 372, 200 344, 228 340 C 252 339, 282 339, 306 340'],

  // I: the crossbar sweeps up into the stem
  ['I', 'C 330 341, 356 300, 371 232 C 373 290, 372 350, 372 400'],

  // scene 1 · walking: down to the ground, back foot, leg, body, head, both arms swinging, front leg
  ['walk', 'C 372 425, 386 440, 412 440 C 436 440, 460 440, 480 440' +               // ground
           ' C 474 437, 469 434, 467 430' +                                           // back foot, heel up
           ' C 472 418, 480 408, 485 398 C 490 385, 495 368, 500 352' +               // back leg
           ' C 502 330, 503 305, 507 288' +                                           // back
           ' C 500 284, 497 272, 499 262 C 501 250, 511 246, 518 247' +               // head
           ' C 528 249, 534 258, 532 268 C 530 277, 523 282, 514 286' +
           ' C 518 305, 528 318, 536 328 C 542 336, 548 342, 553 345' +               // front arm…
           ' C 548 349, 538 340, 530 332 C 522 322, 517 312, 515 300' +               // …and back
           ' C 510 312, 500 324, 492 332 C 486 338, 478 344, 472 346' +               // back arm…
           ' C 478 350, 488 342, 495 336 C 504 326, 511 316, 515 304' +               // …and back
           ' C 516 318, 514 336, 511 352' +                                           // chest
           ' C 514 368, 519 382, 522 395 C 525 410, 528 425, 532 437' +               // front leg
           ' C 536 440, 542 440, 550 440 C 575 440, 595 440, 612 432'],               // foot, ground

  // scene 2 · flying: leap off the ground, legs, body, scarf flapping, head, arm reaching forward, a loop in the air
  ['fly', 'C 628 418, 636 338, 660 318' +                                             // leap
          ' C 684 300, 712 292, 742 284' +                                            // straight leg
          ' C 736 296, 730 308, 722 316 C 716 322, 706 326, 694 324' +                // bent leg…
          ' C 706 322, 716 318, 725 311 C 733 303, 739 292, 744 284' +                // …and back
          ' C 766 278, 790 270, 808 262' +                                            // body
          ' C 796 250, 776 246, 760 240 C 748 236, 740 244, 730 238' +                // scarf…
          ' C 742 236, 752 232, 764 234 C 782 238, 800 246, 814 254' +                // …and back
          ' C 812 244, 816 222, 832 218 C 848 215, 854 232, 848 244 C 844 252, 834 256, 826 256' + // head
          ' C 846 262, 876 252, 906 238' +                                            // arm forward
          ' C 918 232, 928 220, 926 208 C 924 194, 906 194, 906 208' +                // loop
          ' C 906 232, 944 262, 955 330 C 962 370, 965 418, 985 420 C 995 421, 998 410, 1005 392'], // glide down

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

  // scene 3 · wondering: someone stands still, hand on chin; a «?» rises out of the hand
  // and hangs in the air, its dot tied to the ground like a balloon string
  ['wonder', 'C 1340 470, 1356 440, 1380 440 C 1390 440, 1398 440, 1404 440' +       // ground
             ' C 1406 425, 1410 410, 1412 398 C 1415 384, 1417 368, 1418 354' +       // back leg
             ' C 1422 370, 1428 384, 1430 396 C 1432 410, 1434 426, 1436 438' +       // front leg…
             ' C 1440 440, 1444 440, 1448 440' +
             ' C 1442 436, 1438 420, 1436 404 C 1432 386, 1428 370, 1424 356' +       // …and back up
             ' C 1422 330, 1422 306, 1426 292' +                                      // back
             ' C 1421 286, 1420 276, 1422 266 C 1425 254, 1432 248, 1442 248' +       // head
             ' C 1454 248, 1460 256, 1460 266 C 1460 276, 1454 283, 1446 286' +
             ' C 1442 300, 1450 326, 1460 334' +                                      // arm to the elbow
             ' C 1466 322, 1462 302, 1456 292' +                                      // hand to chin
             ' C 1458 270, 1470 225, 1482 205' +                                      // the question rises
             ' C 1488 190, 1494 170, 1508 166 C 1524 162, 1534 176, 1530 190' +       // ? hook
             ' C 1526 202, 1508 204, 1507 220 C 1507 226, 1507 232, 1507 236' +       // ? stem
             ' C 1507 242, 1501 248, 1504 253 C 1507 257, 1514 254, 1513 248' +       // ? dot
             ' C 1512 243, 1506 244, 1506 250' +
             ' C 1506 300, 1508 400, 1514 432 C 1518 440, 1528 440, 1540 440'],       // string down, ground

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
];

/* ------------------------------------------------------------------
   STORY BEATS — the ball reaches the end of each piece after N seconds, and each beat has its own
   background colour (the site hero's «warhol» palette, in the same order; colours live in styles.css).
   The ball eases in and out of every beat, so it takes a breath between scenes — that's when the colour cuts.
   ------------------------------------------------------------------ */
const BEATS = [
  ['I', 2.4, 'orange'],      // AI
  ['walk', 2.4, 'yellow'],   // someone walks…
  ['fly', 2.6, 'mint'],      // …leaps and flies
  ['զ', 2.4, 'cyan'],        // քեզ
  ['wonder', 2.6, 'tan'],    // someone wonders
  ['tail', 2.8, 'orchid'],   // բան (the colour stays through the zoom-out)
];

/* TIMING (seconds) around the drawing — the whole loop is ≈ 21s */
const TIMING = {
  appear: 0.4,   // ball pops in at the start
  reveal: 1.6,   // camera pulls back to show the whole drawing
  hold: 2.2,     // the finished drawing rests
  reel: 1.6,     // thread is pulled back into the ball, start first
  vanish: 0.3,   // ball shrinks away, then the loop restarts
};

/* CAMERA — while drawing it shows a window VIEW_H units tall (as wide as the screen allows) around the ball */
const VIEW_TOP = 130;      // top edge of the camera window
const VIEW_H = 380;        // height of the camera window (sky above the figures → below the descenders)
const SMOOTH = 450;        // camera glides on the average position of ±450 units of thread around the ball

/* LOOK */
const THREAD_WIDTH = 3;    // SVG units…
const MIN_THREAD_PX = 1.2; // …but never thinner than this on screen (the zoomed-out view)
const BALL_R = 18;         // ball radius in SVG units (see index.html)
const MIN_BALL_PX = 8;     // …never smaller than this on screen
const BALL_SHRINK = 0.3;   // ball loses 30% of its size once all the thread is out
const SPIN = 0.9;          // degrees of ball rotation per unit of thread travelled

/* ------------------------------------------------------------------ */

const svg = document.querySelector('.yarn');
const bgTargets = document.querySelectorAll('[data-yarn-bg]');
const thread = document.getElementById('thread');
const ball = document.getElementById('ball');
const ballSpin = document.getElementById('ball-spin');

// Where each piece ends along the thread (for the story beats), then the whole path
const pieceEnd = {};
THREAD.forEach(([name], i) => {
  thread.setAttribute('d', THREAD.slice(0, i + 1).map(([, d]) => d).join(' '));
  pieceEnd[name] = thread.getTotalLength();
});
const LENGTH = thread.getTotalLength();
const BEAT_ENDS = BEATS.map(([piece]) => pieceEnd[piece]);

// The whole drawing, with a margin — the zoomed-out view
const bbox = thread.getBBox();
const FULL = { x: bbox.x - 40, y: bbox.y - 40, w: bbox.width + 80, h: bbox.height + 80 };

// Camera x for every point of the thread, averaged so it glides instead of jiggling with each stroke
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

// Animated values: `head` = where the ball is, `tail` = where the visible thread starts (0 → 1 along the path),
// `size` = ball size, `zoom` = 0 following the ball → 1 whole drawing
const state = { head: 0, tail: 0, size: 0, zoom: 0 };

let screen = { w: 1, h: 1 };
function measure() { screen = { w: svg.clientWidth || 1, h: svg.clientHeight || 1 }; }
measure();

const lerp = (a, b, t) => a + (b - a) * t;

function camera(len) {
  // Follow view: fixed height, as wide as the SVG's shape allows, centred on the smoothed ball position
  const w = VIEW_H * (screen.w / screen.h);
  const i = len / STEP, i0 = Math.floor(i);
  let x = lerp(camX[i0], camX[i0 + 1] ?? camX[i0], i - i0);
  x = w >= FULL.w ? FULL.x + FULL.w / 2 : Math.min(Math.max(x, FULL.x + w / 2), FULL.x + FULL.w - w / 2);
  const follow = { x: x - w / 2, y: VIEW_TOP, w, h: VIEW_H };

  const t = state.zoom;
  return { x: lerp(follow.x, FULL.x, t), y: lerp(follow.y, FULL.y, t), w: lerp(follow.w, FULL.w, t), h: lerp(follow.h, FULL.h, t) };
}

function render() {
  const head = state.head * LENGTH;
  const tail = state.tail * LENGTH;
  const visible = head - tail;

  // Background: the colour of the beat the ball is in
  const beat = BEAT_ENDS.findIndex((end) => head <= end + 0.5);
  const color = BEATS[beat < 0 ? BEATS.length - 1 : beat][2];
  bgTargets.forEach((el) => { if (el.dataset.bg !== color) el.dataset.bg = color; });

  // Camera
  const view = camera(head);
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const pxPerUnit = Math.min(screen.w / view.w, screen.h / view.h);

  // Show only the stretch of path between tail and head
  thread.style.strokeDasharray = `${visible} ${LENGTH + 1}`;
  thread.style.strokeDashoffset = -tail;
  thread.style.strokeWidth = Math.max(THREAD_WIDTH, MIN_THREAD_PX / pxPerUnit);
  thread.style.visibility = visible > 0.5 ? 'visible' : 'hidden';

  // Ball sits on the head, spins as it travels, shrinks while its thread is out
  const p = thread.getPointAtLength(head);
  const minScale = MIN_BALL_PX / (BALL_R * pxPerUnit);
  const scale = state.size * Math.max(1, minScale) * (1 - BALL_SHRINK * (visible / LENGTH));
  ball.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
  ballSpin.setAttribute('transform', `rotate(${(head + tail) * SPIN})`);
}

window.addEventListener('resize', () => { measure(); render(); });
render();   // start hidden (no thread, no ball) until the first frame

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion || !window.gsap) {
  // No animation: show the whole finished drawing with the ball resting at the end
  Object.assign(state, { head: 1, tail: 0, size: 1, zoom: 1 });
  render();
} else {
  const tl = gsap.timeline({ repeat: -1, onUpdate: render })
    .fromTo(state, { head: 0, tail: 0, size: 0, zoom: 0 }, { size: 1, duration: TIMING.appear, ease: 'back.out(2)' });
  BEATS.forEach(([piece, seconds]) => {
    tl.to(state, { head: pieceEnd[piece] / LENGTH, duration: seconds, ease: 'sine.inOut' });
  });
  tl.to(state, { zoom: 1, duration: TIMING.reveal, ease: 'power2.inOut' })
    .to(state, { tail: 1, duration: TIMING.reel, ease: 'power2.in' }, `+=${TIMING.hold}`)
    .to(state, { size: 0, duration: TIMING.vanish, ease: 'power2.in' });

  // Pause while it's scrolled out of view
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? tl.play() : tl.pause())).observe(svg);
  }
}
