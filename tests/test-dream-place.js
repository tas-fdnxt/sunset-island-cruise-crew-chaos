// DREAM → PLACE. A free-text dream (or a PROFILE.DREAMS index) becomes real place() calls.
const { ISLE, makeWorld, place, encode, decode, applyDream, dreamScript, dreamMatch, PROFILE,
  worldStats, houses, flags, factories, isLand } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('seven dreams to script', PROFILE.DREAMS.length === 7);
ok('dream names stay the known seven', PROFILE.DREAMS.map(d => d.name).join() ===
  'CASTLE,ZOO,RACETRACK,BAKERY,ROCKET BASE,SECRET HIDEOUT,FLOWER GARDEN');

function idsOk(script) {
  return script.every(s => s.id >= 1 && s.id <= 12 && s.id !== 13 && s.id !== 14 && s.id < ISLE.TYPES.length);
}
function cellsLand(script) { return script.every(s => isLand(s.x, s.y)); }

PROFILE.DREAMS.forEach(function (d, i) {
  const script = dreamScript(i);
  ok(d.name + ': script is not empty', script.length > 0, script.length);
  ok(d.name + ': tens of blocks, not hundreds', script.length > 0 && script.length <= 80, script.length);
  ok(d.name + ': only placeable ids 1–12, never 13/14', idsOk(script));
  ok(d.name + ': every cell is land', cellsLand(script));
  const w = makeWorld();
  const before = w.count;
  const r = applyDream(w, script);
  ok(d.name + ': apply ok', r.ok && r.placed === script.length && r.skipped === 0, JSON.stringify(r));
  ok(d.name + ': world grew', w.count === before + script.length);
  ok(d.name + ': encode under LINK_MAX', r.encodeLen <= ISLE.LINK_MAX, r.encodeLen);
  ok(d.name + ': encodeLen matches encode()', r.encodeLen === encode(w).length);
  const w2 = decode(encode(w));
  ok(d.name + ': decode not null', !!w2);
  ok(d.name + ': roundtrip count', w2 && w2.count === w.count);
  let same = true;
  if (w2) for (let k = 0; k < w.cols.length; k++) if (w.cols[k] !== w2.cols[k]) { same = false; break; }
  ok(d.name + ': roundtrip exact', same);
});

// recipes keep the promise the dream quest already made
const st0 = worldStats((function () { const w = makeWorld(); applyDream(w, dreamScript(0)); return w; })());
ok('CASTLE is four blocks tall', st0.tallest >= 4, st0.tallest);
const hz = (function () { const w = makeWorld(); applyDream(w, dreamScript(1)); return houses(w).length; })();
ok('ZOO has three houses', hz === 3, hz);
ok('RACETRACK plants a flag', flags((function () { const w = makeWorld(); applyDream(w, dreamScript(2)); return w; })()).length >= 1);
ok('BAKERY lights a factory', factories((function () { const w = makeWorld(); applyDream(w, dreamScript(3)); return w; })()).length >= 1);
const st4 = worldStats((function () { const w = makeWorld(); applyDream(w, dreamScript(4)); return w; })());
ok('ROCKET BASE is four blocks tall', st4.tallest >= 4, st4.tallest);
ok('SECRET HIDEOUT is a house', houses((function () { const w = makeWorld(); applyDream(w, dreamScript(5)); return w; })()).length === 1);
const st6 = worldStats((function () { const w = makeWorld(); applyDream(w, dreamScript(6)); return w; })());
ok('FLOWER GARDEN lays ten grass', st6.grass >= 10, st6.grass);
ok('FLOWER GARDEN may seed, never sprout or tree', st6.sprouts === 0 && st6.trees === 0 && st6.seeds >= 0);

// free text and indexes
ok('index 0 is CASTLE', dreamMatch(0) === 0);
ok('string index 0 is CASTLE', dreamMatch('0') === 0);
ok('free-text castle matches CASTLE', dreamMatch('castle') === 0);
ok('CASTLE name matches', dreamMatch('CASTLE') === 0);
ok('a castle by the sea matches CASTLE', dreamMatch('a castle by the sea') === 0);
ok('keep/fort/palace are castle synonyms', dreamMatch('a stone keep') === 0 && dreamMatch('palace') === 0);
ok('zoo animals match ZOO', dreamMatch('zoo for the animals') === 1);
ok('racetrack and lap match', dreamMatch('racetrack') === 2 && dreamMatch('first lap') === 2);
ok('bakery and cake match', dreamMatch('bakery') === 3 && dreamMatch('birthday cake') === 3);
ok('rocket and launch pad match', dreamMatch('rocket') === 4 && dreamMatch('launch pad') === 4);
ok('hideout and secret match', dreamMatch('SECRET HIDEOUT') === 5);
ok('flower garden and bloom match', dreamMatch('FLOWER GARDEN') === 6 && dreamMatch('bloom') === 6);
ok('unknown text defaults to SECRET HIDEOUT', dreamMatch('purple bananas') === 5 && dreamMatch('') === 5);
ok('out of range index defaults to hideout', dreamMatch(99) === 5 && dreamMatch(-1) === 5);
const castleScript = dreamScript('castle');
const i0 = dreamScript(0);
ok('free-text castle script matches index 0', JSON.stringify(castleScript) === JSON.stringify(i0));
ok('unknown text still builds a hideout', dreamScript('asdfgh').length === dreamScript(5).length && dreamScript('asdfgh').length > 0);

// applyDream stops cleanly and does not corrupt
(function () {
  const w = makeWorld();
  w.count = ISLE.MAX_BLOCKS;
  const r = applyDream(w, dreamScript(0));
  ok('cargo stops apply', !r.ok && r.why === 'cargo', JSON.stringify(r));
  ok('cargo places nothing', r.placed === 0 && r.skipped === dreamScript(0).length);
  ok('cargo leaves the grid empty', w.count === ISLE.MAX_BLOCKS && encode(w) === encode(makeWorld()));
})();

(function () {
  const w = makeWorld();
  let last = { ok: true };
  for (let y = 0; y < ISLE.N && last.ok; y++) for (let x = 0; x < ISLE.N && last.ok; x++) {
    last = place(w, x, y, 1);
    if (!last.ok) break;
  }
  ok('a carpet is refused by cargo or the link gate', !last.ok && (last.why === 'link' || last.why === 'cargo'), last && last.why);
  const enc0 = encode(w), count0 = w.count;
  const r = applyDream(w, dreamScript(0));
  ok('apply on a full island stops', !r.ok && (r.why === 'link' || r.why === 'cargo'), JSON.stringify(r));
  ok('apply on a full island places nothing', r.placed === 0);
  ok('apply on a full island does not change the count', w.count === count0);
  ok('apply on a full island does not change the link', encode(w) === enc0);
})();

(function () {
  const was = ISLE.ALL_LAND;
  ISLE.ALL_LAND = false;
  const w = makeWorld();
  const sea = [{ x: 0, y: 0, id: 3 }, { x: 1, y: 0, id: 3 }];
  const r = applyDream(w, sea);
  ok('water stops apply', !r.ok && r.why === 'water', JSON.stringify(r));
  ok('water places nothing on the sea', w.count === 0 && r.placed === 0);
  ok('a mid-script water cell keeps what landed', (function () {
    const w2 = makeWorld();
    const good = dreamScript(5, { ox: 60, oy: 60 });
    ok('hideout near centre is land', good.length > 0 && isLand(good[0].x, good[0].y));
    const mixed = good.slice(0, 3).concat([{ x: 0, y: 0, id: 3 }], good.slice(3));
    const r2 = applyDream(w2, mixed);
    return r2.ok === false && r2.why === 'water' && r2.placed === 3 && w2.count === 3;
  })());
  ISLE.ALL_LAND = was;
})();

(function () {
  const w = makeWorld();
  const script = [{ x: 20, y: 20, id: 13 }, { x: 21, y: 20, id: 3 }];
  const r = applyDream(w, script);
  ok('sprout refused, world empty', !r.ok && r.why === 'grow' && w.count === 0);
  const r2 = applyDream(w, [{ x: 20, y: 20, id: 14 }]);
  ok('tree refused too', !r2.ok && r2.why === 'grow' && w.count === 0);
})();

(function () {
  const w = makeWorld();
  applyDream(w, dreamScript(0));
  const enc = encode(w);
  ok('empty script is a no-op', applyDream(w, []).ok && applyDream(w, []).placed === 0 && encode(w) === enc);
  ok('missing script is a no-op', applyDream(w).ok && w.count > 0 && encode(w) === enc);
})();

// land-exists never yields an empty world
ok('empty string still builds if land exists', dreamScript('').length > 0);
ok('null still builds if land exists', dreamScript(null).length > 0);

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
