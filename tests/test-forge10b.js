// FORGE 10, PART TWO. Written red first.
//  "Our house is like a big mansion."  Uncle Tabs: "Mansion. Done."        -> the MANSION dream
//  "Can you put new cars on?" "That car looks terrible."                   -> the car is a shaped toy that faces where it drives
//  "I don't want it to just stop on the water." "If you go into it, it should splash." -> sea driving
//  "I want a different background." "The water needs to look bigger."     -> BACKDROPS
//  "See all the different people, their name, their story, what they are doing" -> ISLANDER_CARDS
const { ISLE, makeWorld, place, topZ, houses, encode, decode, worldStats,
  dreamMatch, dreamRecipe, dreamScript, dreamPickAct, runDreamAct, PROFILE,
  BACKDROPS, backdropOf, ISLANDER_CARDS, carCorners, CAR_SEA, seaSpeedCap
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info === undefined ? '' : info); } }

/* ---------- the mansion ---------- */
ok('the seven profile dreams are untouched', PROFILE.DREAMS.length === 7);
ok('MANSION is its own dream', dreamMatch('MANSION') === 7);
ok('a big house is a mansion', dreamMatch('a big house') === 7 && dreamMatch('mansion please') === 7);
ok('castle words still mean castle', dreamMatch('castle') === 0 && dreamMatch('palace') === 0);
ok('a number 7 still falls back like before', dreamMatch(7) === 5);
(function () {
  const w = makeWorld();
  const r = runDreamAct(w, dreamPickAct('MANSION'));
  ok('the mansion lands on an empty island', r.ok && r.placed > 0, JSON.stringify({ ok: r.ok, why: r.why }));
  ok('the mansion is a house, so somebody moves in', houses(w).length === 1, houses(w).length);
  const st = worldStats(w);
  ok('the mansion is two storeys and a roof', st.tallest === 5, st.tallest);
  ok('the mansion is a real size, not a hut', r.placed >= 100 && r.placed <= 140, r.placed);
  ok('the mansion has a garden with palms', st.palms >= 2, st.palms);
  ok('the mansion fits in the link', encode(w).length <= ISLE.LINK_MAX, encode(w).length);
  const d2 = decode(encode(w));
  ok('the mansion round trips exactly', d2 && d2.count === w.count);
  const r2 = runDreamAct(w, dreamPickAct('MANSION'));
  ok('a second mansion lands beside the first, never on it', r2.ok && worldStats(w).tallest === 5, JSON.stringify({ ok: r2.ok, why: r2.why }));
  ok('two mansions, two houses', houses(w).length === 2, houses(w).length);
})();
ok('the mansion recipe is only ids a hand can place', dreamRecipe(7).every(function (c) { return c.ids.every(function (id) { return id >= 1 && id <= 12; }); }));

/* ---------- the cars ---------- */
ok('carCorners exists', typeof carCorners === 'function');
if (typeof carCorners === 'function') {
  const east = carCorners(10, 10, 0, 1.1, 0.6);
  ok('four corners', east.length === 4);
  ok('heading 0 points the nose along +x', east[0].x > 10.5 && east[1].x > 10.5 && east[2].x < 9.5 && east[3].x < 9.5, JSON.stringify(east));
  const south = carCorners(10, 10, Math.PI / 2, 1.1, 0.6);
  ok('heading 90 degrees points the nose along +y', south[0].y > 10.5 && south[1].y > 10.5, JSON.stringify(south));
  const w0 = Math.hypot(east[0].x - east[1].x, east[0].y - east[1].y);
  ok('the car is as wide as asked', Math.abs(w0 - 0.6) < 1e-9, w0);
}

/* ---------- the sea ---------- */
ok('CAR_SEA covers all three cars', CAR_SEA && ['sports', 'buggy', 'truck'].every(function (k) { return typeof CAR_SEA[k] === 'number'; }));
if (typeof seaSpeedCap === 'function') {
  ok('RED ROCKET slows right down in the sea', seaSpeedCap('sports') <= 0.45);
  ok('SAND BUGGY slows down in the sea', seaSpeedCap('buggy') <= 0.5);
  ok('SEA CRUISER floats at full speed', seaSpeedCap('truck') >= 0.95);
  ok('an unknown car is careful in the sea', seaSpeedCap('zzz') <= 0.5);
} else ok('seaSpeedCap exists', false);

/* ---------- the backgrounds ---------- */
ok('BACKDROPS exists', Array.isArray(BACKDROPS));
if (Array.isArray(BACKDROPS)) {
  ok('four backgrounds', BACKDROPS.length === 4, BACKDROPS.length);
  ok('sunset first, then lagoon, ocean, space', BACKDROPS.map(function (b) { return b.id; }).join() === 'sunset,lagoon,ocean,space');
  ok('every background has a kid name and sea colours', BACKDROPS.every(function (b) { return /^[A-Z ]+$/.test(b.name) && b.sea && b.sea.length === 2 && b.tile && b.tile.length === 2; }));
  ok('an unknown background is sunset', backdropOf('zzz') === 'sunset' && backdropOf(undefined) === 'sunset');
  ok('a known background stays', backdropOf('space') === 'space');
}

/* ---------- the islander cards ---------- */
ok('ISLANDER_CARDS exists', ISLANDER_CARDS && typeof ISLANDER_CARDS === 'object');
if (ISLANDER_CARDS) {
  const names = ['COCO', 'BARNACLE BOB', 'PEARL', 'MANGO', 'SALTY SAM', 'CAPTAIN CRUMB', 'SHELLY', 'BISCUIT'];
  names.forEach(function (n) {
    const c = ISLANDER_CARDS[n];
    ok(n + ' has a card', !!c);
    ok(n + ' has a job title, a story and a favourite thing', c && c.title && c.story && c.love, JSON.stringify(c));
    ok(n + ' card is short enough to read aloud', c && (c.story.length <= 140), c && c.story.length);
  });
  const all = JSON.stringify(ISLANDER_CARDS);
  ok('no card says anything about a real family', !/DIAZ|UNCLE|SIBELLA|OLLIE/i.test(all));
}

console.log('test-forge10b: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
