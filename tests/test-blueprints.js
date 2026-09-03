// BLUEPRINTS AND THE CREW. Pins the tables, the price, the column lifecycle, the quest, the advisor and the chapter.
const { ISLE, makeWorld, place, erase, idx, topZ, houses, flags, worldStats, questTable, questMet, nextThing, chapter,
  BLUEPRINTS, blueprintById, scrollFor, bpBlocks, bpPrice, bpSize, bpLaid, bpRemaining, bpNext, bpDone, bpSpot } = require('./isle-core.js');
let P = 0, F = 0;
function ok(name, cond) { P += cond ? 1 : 0; F += cond ? 0 : 1; console.log((cond ? 'PASS  ' : 'FAIL  ') + name); }

// The table
ok('five blueprints', BLUEPRINTS.length === 5);
ok('ids are unique', new Set(BLUEPRINTS.map(b => b.id)).size === 5);
ok('every name is loud', BLUEPRINTS.every(b => b.name === b.name.toUpperCase() && b.name.length >= 4));
ok('every block id is a real placeable block', BLUEPRINTS.every(b => b.cols.every(c => c.ids.every(id => id >= 1 && id <= 11 || id === 2 || id === 9))));
ok('no blueprint uses seeds or grown plants', BLUEPRINTS.every(b => b.cols.every(c => c.ids.every(id => id !== 12 && id !== 13 && id !== 14))));
ok('blueprintById finds and misses', blueprintById('castle').name === 'CASTLE' && blueprintById('nope') === null);

// The counts and the price. Coins buy labour, never access: the price exists, a gate does not.
ok('block counts: house 24, light 10, castle 36, race 5, square 36',
  bpBlocks(blueprintById('house')) === 24 && bpBlocks(blueprintById('light')) === 10 && bpBlocks(blueprintById('castle')) === 36 && bpBlocks(blueprintById('race')) === 5 && bpBlocks(blueprintById('square')) === 36);
ok('one coin per four blocks', bpPrice(24) === 6 && bpPrice(36) === 9 && bpPrice(10) === 3);
ok('the crew never costs less than three', bpPrice(5) === 3 && bpPrice(1) === 3 && bpPrice(4) === 3);
ok('sizes fit the island', BLUEPRINTS.every(b => { const s = bpSize(b); return s.w <= 20 && s.h <= 20; }));

// The scroll rotation
ok('the same day gives every child the same scroll', scrollFor('2026-09-05').id === scrollFor('2026-09-05').id);
const seen = new Set(); for (let d = 1; d <= 25; d++) seen.add(scrollFor('2026-10-' + d).id);
ok('the scroll rotates through the designs', seen.size >= 3);

// The lifecycle, per blueprint, on a fresh world
BLUEPRINTS.forEach(function (bp) {
  const w = makeWorld();
  const sp = bpSpot(w, bp, { x: ISLE.N / 2, y: ISLE.N / 2 });
  ok(bp.id + ': a spot is found on open ground', !!sp);
  if (!sp) return;
  let laid = 0, guard = 0;
  while (!bpDone(w, bp, sp.x, sp.y) && guard++ < 200) {
    const next = bpNext(w, bp, sp.x, sp.y);
    if (!next.length) break;
    const c = next[0], r = place(w, c.x, c.y, c.id);
    if (!r.ok) break;
    laid++;
  }
  ok(bp.id + ': building every next cell finishes it', bpDone(w, bp, sp.x, sp.y));
  ok(bp.id + ': it took exactly the counted blocks', laid === bpBlocks(bp));
  ok(bp.id + ': laid equals the count and nothing remains', bpLaid(w, bp, sp.x, sp.y) === bpBlocks(bp) && bpRemaining(w, bp, sp.x, sp.y).length === 0);
});

// What the finished buildings really are. The promise is mapped to what the engine detects.
function build(id) { const bp = blueprintById(id), w = makeWorld(); const sp = bpSpot(w, bp, { x: ISLE.N / 2, y: ISLE.N / 2 }); let g = 0; while (!bpDone(w, bp, sp.x, sp.y) && g++ < 200) { const n = bpNext(w, bp, sp.x, sp.y); if (!n.length) break; place(w, n[0].x, n[0].y, n[0].id); } return w; }
ok('the LITTLE HOUSE is a real house: an islander moves in', houses(build('house')).length === 1);
ok('the CASTLE is a real house too', houses(build('castle')).length === 1);
ok('the VILLAGE SQUARE brings three islanders', houses(build('square')).length === 3);
ok('the LIGHTHOUSE is the tallest thing on a new island', worldStats(build('light')).tallest === 6);
ok('the RACE RUN plants a real flag', flags(build('race')).length === 1);

// A wrong block blocks its column until it is erased. Hands can always mend it.
(function () {
  const bp = blueprintById('house'), w = makeWorld();
  const sp = bpSpot(w, bp, { x: ISLE.N / 2, y: ISLE.N / 2 });
  const c0 = bp.cols[0], x = sp.x + c0.dx, y = sp.y + c0.dy;
  place(w, x, y, 1); // grass where wood belongs
  ok('a wrong block leaves the column out of next', bpNext(w, bp, sp.x, sp.y).every(q => !(q.x === x && q.y === y)));
  ok('the blueprint cannot finish around a wrong block', !bpDone(w, bp, sp.x, sp.y));
  erase(w, x, y);
  ok('erasing the wrong block opens the column again', bpNext(w, bp, sp.x, sp.y).some(q => q.x === x && q.y === y && q.id === c0.ids[0]));
})();

// bpSpot refuses ground that is not clear
(function () {
  const bp = blueprintById('race'), w = makeWorld();
  const sp = bpSpot(w, bp, { x: ISLE.N / 2, y: ISLE.N / 2 });
  bp.cols.forEach(c => place(w, sp.x + c.dx, sp.y + c.dy, 1));
  const sp2 = bpSpot(w, bp, { x: ISLE.N / 2, y: ISLE.N / 2 });
  ok('a taken spot is never offered twice', !(sp2 && sp2.x === sp.x && sp2.y === sp.y));
})();

// The quest keeps the promise and the engine can verify it
const row = questTable(-1).find(q => q.id === 'bp1');
ok('the quest table carries the blueprint', !!row && row.need === 'bpFinishedToday' && row.n === 1);
ok('finishing one today meets it', questMet(row, { bpFinishedToday: 1 }) && !questMet(row, { bpFinishedToday: 0 }));

// The advisor speaks about the outline, after the quest, and never invents one
const bpSt = { blocks: 9, houses: 1, flags: 1, walls: 0, doors: 1, ramp: 1, hour: 12, bp: 'CASTLE', bpToGo: 5, tick: 0 };
const n1 = nextThing(bpSt);
ok('the advisor points at the outline', n1.key === 'bp' && n1.line.indexOf('CASTLE') !== -1 && n1.line.indexOf('5 blocks') !== -1);
ok('the quest still comes first', nextThing(Object.assign({}, bpSt, { quest: { tell: 'do a thing' }, questMet: false })).key === 'quest');
ok('no outline, no advice about one', nextThing(Object.assign({}, bpSt, { bp: '', bpToGo: 0 })).key !== 'bp');
ok('a finished outline goes quiet', nextThing(Object.assign({}, bpSt, { bpToGo: 0 })).key !== 'bp');

// The chapter tells the truth about the day
const base = { name: 'OLLIE', title: 'CAPTAIN', stats: { blocks: 5 }, prevStats: {}, learned: [] };
function flat(pages) { return pages.map(p => p.lines.join(' ')).join(' '); }
const done = flat(chapter(Object.assign({}, base, { bpToday: { finished: 'CASTLE', hired: 9 } })));
ok('the chapter names the finished blueprint and the crew', done.indexOf('CASTLE blueprint became a real building') !== -1 && done.indexOf('hired for 9 coins') !== -1);
const hands = flat(chapter(Object.assign({}, base, { bpToday: { finished: 'LITTLE HOUSE' } })));
ok('a hand-built blueprint is credited to the hands', hands.indexOf('own hands') !== -1);
const started = flat(chapter(Object.assign({}, base, { bpToday: { started: 'LIGHTHOUSE' } })));
ok('a started blueprint glows in the chapter', started.indexOf('rolled-up blueprint: the LIGHTHOUSE') !== -1);
ok('no blueprint, no line about one', flat(chapter(base)).indexOf('blueprint') === -1);

console.log('RESULT: ' + (P + F) + ' checks, ' + P + ' passed, ' + F + ' failed');
process.exit(F ? 1 : 0);
