/* THE HANDS. Ollie could not put a block where he meant to, and every repeat tap built him a tower.
   This suite guards the fixes: the tablet switch, the cell size, the painted stroke, the wheel, the engine, the coin arc. */
const C = require('./isle-core.js');
const { paintable, cellLine, bigScreen, zoomsFor, zoomCapFor, cellSizeAt, CAR, steerToward, turnRate,
        carTopSpeed, driftOf, camLead, engineHz, coinArc, ISLE, makeWorld, place, topZ } = C;
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i === undefined ? '' : i); } }

/* ---- the tablet switch. It must agree with the CSS media query, which is
   (min-width:700px) and (min-height:700px), (min-width:1000px). */
function css(w, h) { return (w >= 700 && h >= 700) || w >= 1000; }
ok('iPhone 14 portrait is not a big screen', bigScreen(390, 844) === false);
ok('iPhone 14 landscape is not a big screen', bigScreen(844, 390) === false);
ok('iPad 10.9 portrait is a big screen', bigScreen(820, 1180) === true);
ok('iPad 10.9 landscape is a big screen', bigScreen(1180, 820) === true);
ok('iPad mini portrait is a big screen', bigScreen(744, 1133) === true);
ok('iPad mini landscape is a big screen', bigScreen(1133, 744) === true);
ok('the switch is symmetric in w and h', bigScreen(1180, 820) === bigScreen(820, 1180));
ok('CSS and JS agree on every size from 320 to 1400', (function () {
  for (let w = 320; w <= 1400; w += 4) for (let h = 320; h <= 1400; h += 4) if (css(w, h) !== bigScreen(w, h)) return false;
  return true;
})());

/* ---- cells he can actually hit. Apple asks for a 44 point target and his cell was 39.6 by 19.8. */
ok('phone build zoom unchanged', zoomsFor(390, 844).build === 0.9);
ok('tablet build zoom is bigger', zoomsFor(1180, 820).build > zoomsFor(390, 844).build);
ok('the old phone cell did NOT clear 44 wide', cellSizeAt(0.9).w < 44, cellSizeAt(0.9).w);
ok('tablet cell clears 44 points wide', cellSizeAt(zoomsFor(1180, 820).build).w >= 44, cellSizeAt(zoomsFor(1180, 820).build).w);
ok('tablet cell is at least 33 points tall', cellSizeAt(zoomsFor(1180, 820).build).h >= 33, cellSizeAt(zoomsFor(1180, 820).build).h);
ok('tablet cell is 76 percent bigger than the phone cell', cellSizeAt(zoomsFor(1180, 820).build).w / cellSizeAt(0.9).w > 1.7);
ok('three zoom levels on both screens', Object.keys(zoomsFor(390, 844)).length === 3 && Object.keys(zoomsFor(1180, 820)).length === 3);
ok('zoom levels ascend on a phone', zoomsFor(390, 844).whole < zoomsFor(390, 844).build && zoomsFor(390, 844).build < zoomsFor(390, 844).close);
ok('zoom levels ascend on a tablet', zoomsFor(1180, 820).whole < zoomsFor(1180, 820).build && zoomsFor(1180, 820).build < zoomsFor(1180, 820).close);
ok('the zoom cap is never below the closest snap', zoomCapFor(1180, 820) >= zoomsFor(1180, 820).close && zoomCapFor(390, 844) >= zoomsFor(390, 844).close);

/* ---- the stroke. A dragged finger fills bare ground only, so it can never build a tower. */
let w = makeWorld();
ok('bare ground is paintable', paintable(w, 40, 40) === true);
place(w, 40, 40, 3);
ok('a filled column is NOT paintable, so a stroke cannot stack', paintable(w, 40, 40) === false);
ok('the neighbour is still paintable', paintable(w, 41, 40) === true);
ok('the sea is never paintable', paintable(w, 0, 0) === false || ISLE.ALL_LAND);
ok('outside the grid is never paintable', paintable(w, -1, 5) === false && paintable(w, ISLE.N, 5) === false);
ok('a stroke over its own path lays nothing twice', (function () {
  const t = makeWorld(); let n = 0;
  for (let pass2 = 0; pass2 < 2; pass2++) for (const c of cellLine({ x: 20, y: 20 }, { x: 26, y: 20 })) if (paintable(t, c.x, c.y)) { place(t, c.x, c.y, 3); n++; }
  return n === 6;
})(), 'a second pass must add nothing');
ok('nothing a stroke lays is ever more than one block high', (function () {
  const t = makeWorld();
  for (let pass2 = 0; pass2 < 5; pass2++) for (const c of cellLine({ x: 30, y: 30 }, { x: 38, y: 34 })) if (paintable(t, c.x, c.y)) place(t, c.x, c.y, 3);
  for (let x = 28; x < 42; x++) for (let y = 28; y < 38; y++) if (topZ(t, x, y) > 0) return false;
  return true;
})());
ok('one cell is one cell', cellLine({ x: 5, y: 5 }, { x: 5, y: 5 }).length === 1);
ok('a run of four is four cells', cellLine({ x: 5, y: 5 }, { x: 9, y: 5 }).length === 4);
ok('a column of four is four cells', cellLine({ x: 5, y: 5 }, { x: 5, y: 9 }).length === 4);
ok('a diagonal of four is four cells', cellLine({ x: 5, y: 5 }, { x: 9, y: 9 }).length === 4);
ok('the line ends exactly where the finger is', (function () {
  const a = cellLine({ x: 3, y: 7 }, { x: 19, y: 11 });
  return a[a.length - 1].x === 19 && a[a.length - 1].y === 11;
})());
ok('a fast finger leaves no gaps', (function () {
  const a = cellLine({ x: 2, y: 3 }, { x: 60, y: 31 });
  let p = { x: 2, y: 3 };
  for (const c of a) { if (Math.abs(c.x - p.x) > 1 || Math.abs(c.y - p.y) > 1) return false; p = c; }
  return true;
})());
ok('every cell in a line is a whole number', cellLine({ x: 1, y: 1 }, { x: 17, y: 9 }).every(function (c) { return c.x === Math.round(c.x) && c.y === Math.round(c.y); }));
ok('backwards lines work too', cellLine({ x: 19, y: 11 }, { x: 3, y: 7 }).length === 16);
ok('four strokes close the ring he never managed to build', (function () {
  const t = makeWorld(), seen = {};
  const corners = [[20, 20], [24, 20], [24, 24], [20, 24], [20, 20]];
  for (let i = 0; i < 4; i++) {
    for (const c of cellLine({ x: corners[i][0], y: corners[i][1] }, { x: corners[i + 1][0], y: corners[i + 1][1] })) {
      if (paintable(t, c.x, c.y)) { place(t, c.x, c.y, 3); seen[c.x + ',' + c.y] = 1; }
    }
  }
  return Object.keys(seen).length === 16;
})(), 'sixteen cells, every corner counted once');

/* ---- the wheel */
ok('a centred wheel with no input stays centred', steerToward(0, 0, 0.016) === 0);
ok('the wheel eases over, it does not snap to lock', steerToward(0, 1, 0.016) < 0.12, steerToward(0, 1, 0.016));
ok('holding longer turns harder', steerToward(steerToward(0, 1, 0.05), 1, 0.05) > steerToward(0, 1, 0.05));
ok('the wheel arrives exactly and never overshoots', steerToward(0.99, 1, 0.5) === 1);
ok('the wheel springs back to centre', steerToward(1, 0, 0.1) < 1 && steerToward(1, 0, 0.1) >= 0);
ok('left and right are symmetric', steerToward(0, 1, 0.05) === -steerToward(0, -1, 0.05));
ok('the wheel never leaves the minus one to one range', (function () {
  let s = 0; for (let i = 0; i < 500; i++) { s = steerToward(s, i % 3 ? 1 : -1, 0.05); if (s > 1 || s < -1) return false; } return true;
})());
ok('full lock takes about a fifth of a second', Math.abs(1 / CAR.STEER_RATE - 0.185) < 0.02, 1 / CAR.STEER_RATE);

/* ---- the turn, the speed, the drift */
ok('a straight wheel turns not at all', turnRate(0, 3) === 0);
ok('a turned wheel turns the car', turnRate(1, 1) > 0);
ok('the car bites less the faster it goes', turnRate(1, CAR.TOP) < turnRate(1, 0));
ok('turning right is the mirror of turning left', turnRate(1, 2) === -turnRate(-1, 2));
ok('a straight line is the fastest line', carTopSpeed(0) === CAR.TOP);
ok('a corner costs speed', carTopSpeed(1) < carTopSpeed(0));
ok('a corner never stops the car dead', carTopSpeed(1) > CAR.TOP * 0.5, carTopSpeed(1));
ok('the new top speed beats the old fixed 3.4', CAR.TOP > 3.4, CAR.TOP);
ok('gentle cornering never drifts', driftOf(0.3, 2) === 0);
ok('hard cornering at speed drifts', driftOf(1, CAR.TOP) > 0, driftOf(1, CAR.TOP));
ok('a parked car never drifts', driftOf(1, 0) === 0);
ok('drift grows with how hard you turn', driftOf(1, CAR.TOP) > driftOf(0.8, CAR.TOP));

/* ---- the camera looks where he is going */
ok('a stopped camera sits on the car', camLead(0, 0).x === 0 && camLead(0, 0).y === 0);
ok('a moving camera looks ahead', Math.hypot(camLead(CAR.TOP, 0).x, camLead(CAR.TOP, 0).y) > 3);
ok('it looks ahead further the faster he goes', Math.hypot(camLead(CAR.TOP, 1).x, camLead(CAR.TOP, 1).y) > Math.hypot(camLead(1, 1).x, camLead(1, 1).y));
ok('it looks the way the car is pointed', Math.abs(camLead(CAR.TOP, 0).x - CAR.LEAD) < 0.001 && Math.abs(camLead(CAR.TOP, 0).y) < 0.001);
ok('lead never runs away past the limit', Math.hypot(camLead(99, 0).x, camLead(99, 0).y) <= CAR.LEAD + 0.001);

/* ---- the engine */
ok('the engine idles at a standstill', engineHz(0) === CAR.IDLE);
ok('the note rises with speed', engineHz(CAR.TOP) > engineHz(1) && engineHz(1) > engineHz(0));
ok('the note never drops below idle', engineHz(-9) === CAR.IDLE);
ok('the note stays in an audible engine range', engineHz(CAR.TOP) < 400 && engineHz(0) > 40, engineHz(CAR.TOP));
ok('flat out is well over double the idle note', engineHz(CAR.TOP) / engineHz(0) > 2);

/* ---- coins that fly */
const p = { x: 100, y: 200, vx: 60, vy: -250, life: 1 };
ok('a coin starts where it was won', coinArc(p, 0).x === 100 && coinArc(p, 0).y === 200);
ok('a coin goes up first', coinArc(p, 0.1).y < 200);
ok('a coin comes down again', coinArc(p, 1).y > coinArc(p, 0.3).y);
ok('a coin drifts sideways as it flies', coinArc(p, 0.5).x > 100);
ok('a coin is solid when it is thrown', coinArc(p, 0).a === 1);
ok('a coin fades as it falls', coinArc(p, 0.5).a < 1 && coinArc(p, 0.5).a > 0);
ok('a coin is gone at the end of its life', coinArc(p, 1).a === 0);
ok('a coin never fades past invisible', coinArc(p, 5).a === 0);

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
