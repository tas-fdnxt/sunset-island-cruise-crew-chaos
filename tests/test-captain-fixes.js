// FORGE 10: THE CAPTAIN'S FIX LIST. Every check here is a fault Ollie hit in the
// 11 Sep 2026 playtest. Written red first, before a line of the fix.
//  00:15 "I try to build higher. It doesn't really work."      -> pickColumn
//  03:00 "The dream could not find land." "Look how much space" -> dreamSpot sees the world
//  02:25 the pitch outline sat on top of his blocks             -> bpSpot checks the whole rectangle
//  06:55 "What is this?" (the WARM chip)                        -> kid words on LOOK
//  01:41 a dragged finger builds out of control                 -> ONE is the default build mode
const { ISLE, makeWorld, place, topZ, idx, isLand, encode, decode,
  dreamScript, applyDream, runDreamAct, dreamPickAct, bpSpot, bpSize, blueprintById,
  PRETTY_IDS, PRETTY_NAMES, prettyOf,
  pickColumn, dreamWhyLine, BUILD_MODES, buildModeOf, bpRectFree
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info === undefined ? '' : info); } }

/* ---------- 1. HANDS: a tap on the top of a tall column lands on that column ---------- */
// The same iso numbers the renderer uses: TW 44, TH 22, ZH 18. A block at z has its top
// diamond centred on isoY(x, y, z) = (x + y) * TH / 2 - z * ZH (relative to ORIGIN).
const TW = 44, TH = 22, ZH = 18;
function sx(x, y) { return (x - y) * TW / 2; }
function sy(x, y, z) { return (x + y) * TH / 2 - z * ZH; }
ok('pickColumn exists', typeof pickColumn === 'function');
if (typeof pickColumn === 'function') {
  const w = makeWorld();
  for (let z = 0; z < 6; z++) place(w, 20, 20, 3);
  const top = pickColumn(w, sx(20, 20), sy(20, 20, 5), TW, TH, ZH);
  ok('top face of a 6 high column picks that column', top && top.x === 20 && top.y === 20, JSON.stringify(top));
  ok('it reports the column top', top && top.z === 5, JSON.stringify(top));
  // the front vertical edge, halfway down the tower, is still the tower
  const side = pickColumn(w, sx(20, 20) - 6, sy(20, 20, 2) + TH / 2, TW, TH, ZH);
  ok('the side of the tower picks the tower', side && side.x === 20 && side.y === 20, JSON.stringify(side));
  // an empty cell far from anything behaves exactly like the old ground plane
  const g = pickColumn(w, sx(30, 26), sy(30, 26, -1), TW, TH, ZH);
  ok('bare ground picks the ground cell under the finger', g && g.x === 30 && g.y === 26 && g.z === -1, JSON.stringify(g));
  // a column standing in FRONT hides the ground behind it: the finger gets what it sees
  const w2 = makeWorld();
  for (let z = 0; z < 4; z++) place(w2, 24, 24, 4);
  const hid = pickColumn(w2, sx(22, 22), sy(22, 22, -1), TW, TH, ZH);
  ok('a tall column in front wins over the hidden ground behind it', hid && hid.x === 24 && hid.y === 24, JSON.stringify(hid));
  // and a short column behind a taller one: the tap on the taller one never leaks through
  const w3 = makeWorld();
  place(w3, 10, 10, 3);
  for (let z = 0; z < 5; z++) place(w3, 12, 12, 3);
  const t3 = pickColumn(w3, sx(12, 12), sy(12, 12, 4), TW, TH, ZH);
  ok('the taller front column is picked, not the one behind', t3 && t3.x === 12 && t3.y === 12, JSON.stringify(t3));
  // stacking by tapping the top again and again climbs one column
  const w4 = makeWorld(); place(w4, 40, 40, 3);
  let climbs = 0;
  for (let k = 0; k < 6; k++) {
    const c = pickColumn(w4, sx(40, 40), sy(40, 40, topZ(w4, 40, 40)), TW, TH, ZH);
    if (c && c.x === 40 && c.y === 40) { place(w4, c.x, c.y, 3); climbs++; }
  }
  ok('six taps on the top climb one column to seven', climbs === 6 && topZ(w4, 40, 40) === 6, 'climbs=' + climbs + ' top=' + topZ(w4, 40, 40));
  ok('out of the world is nothing', pickColumn(makeWorld(), -99999, -99999, TW, TH, ZH) === null);
}

/* ---------- 2. DREAM: it looks at what is already built ---------- */
(function () {
  const w = makeWorld();
  let allOk = true, tallest = 0, why = '';
  for (let k = 0; k < 4; k++) {
    const r = runDreamAct(w, dreamPickAct(0)); // CASTLE, four times in a row, like a kid tapping DREAM again
    if (!r.ok || r.placed !== r.script.length) { allOk = false; why = r.why; }
  }
  for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) tallest = Math.max(tallest, topZ(w, x, y) + 1);
  ok('four castles in a row all land', allOk, why);
  ok('a second dream never stacks on the first', tallest === 4, 'tallest=' + tallest);
  const d2 = decode(encode(w));
  ok('four castles still round trip', d2 && d2.count === w.count);
})();
(function () {
  // every dream on one island, one after another: none of them reports a failure
  const w = makeWorld(); let bad = [];
  for (let i = 0; i < 7; i++) { const r = runDreamAct(w, dreamPickAct(i)); if (!r.ok) bad.push(i + ':' + r.why); }
  ok('all seven dreams fit side by side on one island', !bad.length, bad.join(' '));
})();
ok('dreamScript without a world is unchanged (the old suites)', (function () {
  const a = JSON.stringify(dreamScript(0)); return a === JSON.stringify(dreamScript(0)) && dreamScript(0).length === 18;
})());
ok('dreamWhyLine exists', typeof dreamWhyLine === 'function');
if (typeof dreamWhyLine === 'function') {
  const seen = {};
  ['height', 'plant', 'soil', 'grow', 'room', 'cargo', 'link', 'water', 'bounds', 'mystery'].forEach(function (k) {
    const line = dreamWhyLine(k, { w: 3, h: 3 });
    seen[k] = line;
    ok('dream failure ' + k + ' has a kid line', typeof line === 'string' && line.length > 8, line);
    ok('dream failure ' + k + ' never says COULD NOT FIND LAND', !/COULD NOT FIND LAND/i.test(line || ''), line);
  });
  ok('room says how big a patch to clear', /3/.test(seen.room || ''), seen.room);
}

/* ---------- 3. BLUEPRINT: the plan never sits on his blocks ---------- */
(function () {
  const bp = blueprintById('pitch');
  ok('the pitch blueprint exists', !!bp);
  if (!bp) return;
  const sz = bpSize(bp);
  const w = makeWorld();
  // a little hut exactly where a hollow pitch would otherwise go: inside the rectangle, not on the outline
  const near = { x: 40, y: 40 };
  const first = bpSpot(w, bp, near);
  ok('an empty island finds a pitch spot', !!first);
  if (!first) return;
  place(w, first.x + 3, first.y + 2, 3); place(w, first.x + 4, first.y + 3, 6);
  const sp = bpSpot(w, bp, near);
  let clash = 0;
  if (sp) for (let y = sp.y; y < sp.y + sz.h; y++) for (let x = sp.x; x < sp.x + sz.w; x++) if (topZ(w, x, y) >= 0) clash++;
  ok('the pitch rectangle never encloses his blocks', sp && clash === 0, 'clash=' + clash + ' at ' + JSON.stringify(sp));
  ok('bpRectFree exists', typeof bpRectFree === 'function');
  if (typeof bpRectFree === 'function') {
    ok('bpRectFree says no over the hut', bpRectFree(w, bp, first.x, first.y) === false);
    ok('bpRectFree says yes on clear sand', sp && bpRectFree(w, bp, sp.x, sp.y) === true);
  }
})();

/* ---------- 4. LOOK: words a six year old can read ---------- */
ok('LOOK keys stay soft, warm, crisp (saves keep working)', PRETTY_IDS.join() === 'soft,warm,crisp');
ok('default look is still warm under the hood', prettyOf('nope') === 'warm');
const shown = PRETTY_IDS.map(function (k) { return PRETTY_NAMES[k]; });
ok('no grown-up words on the LOOK chip', shown.every(function (s) { return ['SOFT', 'WARM', 'CRISP'].indexOf(s) === -1; }), shown.join());
ok('kid words: SUNNY, SUNSET, BRIGHT', shown.join() === 'SUNNY,SUNSET,BRIGHT', shown.join());

/* ---------- 5. ONE AT A TIME is the default ---------- */
ok('BUILD_MODES exists', Array.isArray(BUILD_MODES));
if (Array.isArray(BUILD_MODES)) {
  ok('two build modes: one and lots', BUILD_MODES.join() === 'one,lots', BUILD_MODES.join());
  ok('an unknown mode is ONE', buildModeOf(undefined) === 'one' && buildModeOf('zzz') === 'one');
  ok('lots stays lots', buildModeOf('lots') === 'lots');
}

console.log('test-captain-fixes: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
