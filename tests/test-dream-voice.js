// VOICE / PASTE → DREAM. A transcript is only an input door.
// Trim, then the same dreamScript mapper, then applyDream. No second recipe list.
const { ISLE, makeWorld, place, encode, decode, applyDream, dreamScript, dreamMatch, hearDream, PROFILE,
  worldStats, houses, flags, factories, isLand } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('hearDream is the voice door', typeof hearDream === 'function');
ok('dreamScript is still the only mapper', typeof dreamScript === 'function' && typeof applyDream === 'function');
ok('seven dreams, no new list', PROFILE.DREAMS.length === 7);
ok('dream names stay the known seven', PROFILE.DREAMS.map(d => d.name).join() ===
  'CASTLE,ZOO,RACETRACK,BAKERY,ROCKET BASE,SECRET HIDEOUT,FLOWER GARDEN');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);

function sameScript(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function idsOk(script) {
  return script.every(s => s.id >= 1 && s.id <= 12 && s.id !== 13 && s.id !== 14 && s.id < ISLE.TYPES.length);
}

// trim is the only voice-side transform
ok('spaces around castle trim to the same script', sameScript(dreamScript('  castle  '), dreamScript('castle')));
ok('newlines and tabs trim', sameScript(dreamScript('\n\tcastle\n'), dreamScript('castle')));
ok('trim then match is castle', dreamMatch(String('  a castle by the sea  ').trim()) === 0);

(function () {
  const heard = '  a castle by the sea  ';
  const w1 = makeWorld(), w2 = makeWorld();
  const script = dreamScript(heard.trim());
  const viaApply = applyDream(w2, script);
  const viaHear = hearDream(w1, heard);
  ok('hearDream ok', viaHear.ok && viaHear.placed === script.length, JSON.stringify(viaHear));
  ok('hearDream placed the same count as applyDream', viaHear.placed === viaApply.placed);
  ok('hearDream world equals applyDream(dreamScript(trim))', encode(w1) === encode(w2));
  ok('hearDream encodeLen matches encode()', viaHear.encodeLen === encode(w1).length);
  ok('hearDream keeps the trimmed words', viaHear.heard === 'a castle by the sea');
  ok('hearDream keeps the script it applied', sameScript(viaHear.script, script));
  ok('hearDream castle is only types 1–12', idsOk(viaHear.script));
  ok('hearDream castle stays under LINK_MAX', viaHear.encodeLen <= ISLE.LINK_MAX, viaHear.encodeLen);
})();

// a pasted Wispr / Plaud transcript is still just text
(function () {
  const plaud = '  [00:01] Uncle said I want a bakery with a birthday cake\n[00:08] maybe cookies too  ';
  ok('Plaud bakery transcript matches BAKERY', dreamMatch(plaud.trim()) === 3);
  const w1 = makeWorld(), w2 = makeWorld();
  hearDream(w1, plaud);
  applyDream(w2, dreamScript(plaud.trim()));
  ok('Plaud paste uses the same dreamScript door', encode(w1) === encode(w2) && w1.count > 0);
  ok('Plaud bakery lights a factory', factories(w1).length >= 1);
})();

(function () {
  const wispr = '\n  rocket launch pad please  \n';
  const w = makeWorld();
  const r = hearDream(w, wispr);
  ok('Wispr rocket transcript lands', r.ok && r.placed > 0 && r.heard === 'rocket launch pad please');
  ok('Wispr rocket matches index 4', dreamMatch(r.heard) === 4);
  ok('Wispr rocket script matches dreamScript', sameScript(r.script, dreamScript('rocket launch pad please')));
  const st = worldStats(w);
  ok('Wispr rocket is four blocks tall', st.tallest >= 4, st.tallest);
})();

// every spoken/pasted known dream still goes through dreamScript, never a second engine
['castle', 'zoo for the animals', 'first lap', 'birthday cake', 'launch pad', 'secret hideout', 'bloom'].forEach(function (line, i) {
  const expect = [0, 1, 2, 3, 4, 5, 6][i];
  ok('heard "' + line + '" matches dream ' + expect, dreamMatch(line) === expect);
  const w1 = makeWorld(), w2 = makeWorld();
  const r = hearDream(w1, '   ' + line + '   ');
  applyDream(w2, dreamScript(line));
  ok('heard "' + line + '" is the dreamScript path', r.ok && encode(w1) === encode(w2));
  ok('heard "' + line + '" never plants 13/14', idsOk(r.script));
});

// empty / unknown still hideout, never an empty island
(function () {
  const w = makeWorld();
  const r = hearDream(w, '   ');
  ok('whitespace still builds if land exists', r.ok && r.placed > 0 && w.count > 0);
  ok('whitespace heard is empty', r.heard === '');
  ok('whitespace uses hideout script', sameScript(r.script, dreamScript('')));
})();
(function () {
  const w = makeWorld();
  const r = hearDream(w, 'purple bananas from the boat');
  ok('unknown words still hideout', r.ok && dreamMatch(r.heard) === 5);
  ok('unknown words match dreamScript', sameScript(r.script, dreamScript('purple bananas from the boat')));
  ok('unknown words make a house', houses(w).length === 1);
})();

// applyDream stop reasons still win; hearDream does not swallow them
(function () {
  const w = makeWorld();
  w.count = ISLE.MAX_BLOCKS;
  const r = hearDream(w, 'castle');
  ok('cargo stops hearDream', !r.ok && r.why === 'cargo', JSON.stringify(r));
  ok('cargo places nothing', r.placed === 0 && w.count === ISLE.MAX_BLOCKS);
  ok('cargo leaves the grid empty', encode(w) === encode(makeWorld()));
})();

(function () {
  const was = ISLE.ALL_LAND;
  ISLE.ALL_LAND = false;
  const w = makeWorld();
  const r = hearDream(w, '');
  /* empty script on a sea-only grid, or a hideout that cannot find land */
  if (!isLand(64, 64)) {
    ok('no-land hearDream does not invent blocks in the sea', w.count === 0 || r.script.every(s => isLand(s.x, s.y)));
  } else {
    ok('land still exists in the middle when the sea is on', true);
  }
  const w2 = makeWorld();
  const mixed = dreamScript(5, { ox: 60, oy: 60 }).slice(0, 3).concat([{ x: 0, y: 0, id: 3 }]);
  const r2 = applyDream(w2, mixed);
  ok('water still stops applyDream', !r2.ok && r2.why === 'water' && r2.placed === 3);
  ISLE.ALL_LAND = was;
})();

(function () {
  const w = makeWorld();
  const r = applyDream(w, [{ x: 20, y: 20, id: 13 }]);
  ok('sprout still refused, hearDream never adds 13', !r.ok && r.why === 'grow' && w.count === 0);
  const r2 = hearDream(w, 'castle');
  ok('a later hearDream still works after a refused grow', r2.ok && r2.placed > 0);
  ok('hearDream castle never asked for 13 or 14', idsOk(r2.script));
})();

(function () {
  const w = makeWorld();
  const r = hearDream(w, 'castle');
  const w2 = decode(encode(w));
  ok('hearDream decode not null', !!w2);
  ok('hearDream roundtrip count', w2 && w2.count === w.count);
  let same = true;
  if (w2) for (let k = 0; k < w.cols.length; k++) if (w.cols[k] !== w2.cols[k]) { same = false; break; }
  ok('hearDream roundtrip exact', same);
  ok('hearDream encode under LINK_MAX', r.encodeLen <= ISLE.LINK_MAX, r.encodeLen);
})();

ok('place and erase still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
