// DREAM MULTI-BUTTON. Tap / hold / long-press are three doors into the same mapper.
// No second recipe list. Hear and script stay the only placement paths.
const { ISLE, makeWorld, place, encode, decode, applyDream, dreamScript, dreamMatch, hearDream,
  dreamPressKind, dreamPressAct, dreamPickAct, dreamLastOf, runDreamAct, rememberDream,
  DREAM_HOLD_MS, DREAM_LONG_MS, PROFILE, worldStats, houses, factories } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('dreamPressKind is the gesture clock', typeof dreamPressKind === 'function');
ok('dreamPressAct is the door table', typeof dreamPressAct === 'function');
ok('dreamPickAct is the picker door', typeof dreamPickAct === 'function');
ok('runDreamAct applies through existing doors', typeof runDreamAct === 'function');
ok('hearDream is still the voice door', typeof hearDream === 'function');
ok('dreamScript is still the only mapper', typeof dreamScript === 'function' && typeof applyDream === 'function');
ok('seven dreams, no new list', PROFILE.DREAMS.length === 7);
ok('dream names stay CASTLE to GARDEN', PROFILE.DREAMS.map(d => d.name).join() ===
  'CASTLE,ZOO,RACETRACK,BAKERY,ROCKET BASE,SECRET HIDEOUT,FLOWER GARDEN');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('hold threshold is under a third of a second', DREAM_HOLD_MS === 280);
ok('long-press is under a second', DREAM_LONG_MS === 900);
ok('long-press is after hold', DREAM_LONG_MS > DREAM_HOLD_MS);

function sameScript(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function idsOk(script) {
  return script.every(s => s.id >= 1 && s.id <= 12 && s.id !== 13 && s.id !== 14 && s.id < ISLE.TYPES.length);
}

// the clock: three kinds, never a fourth
ok('0 ms is a tap', dreamPressKind(0) === 'tap');
ok('100 ms is a tap', dreamPressKind(100) === 'tap');
ok('just under hold is a tap', dreamPressKind(DREAM_HOLD_MS - 1) === 'tap');
ok('hold starts at the threshold', dreamPressKind(DREAM_HOLD_MS) === 'hold');
ok('mid hold stays hold', dreamPressKind(500) === 'hold');
ok('just under long is hold', dreamPressKind(DREAM_LONG_MS - 1) === 'hold');
ok('long starts at the threshold', dreamPressKind(DREAM_LONG_MS) === 'long');
ok('two seconds is still long, never a fourth kind', dreamPressKind(2000) === 'long');
ok('negative and NaN fall back to tap', dreamPressKind(-3) === 'tap' && dreamPressKind(NaN) === 'tap');
ok('only three kinds exist', ['tap', 'hold', 'long'].indexOf(dreamPressKind(0)) !== -1
  && ['tap', 'hold', 'long'].indexOf(dreamPressKind(400)) !== -1
  && ['tap', 'hold', 'long'].indexOf(dreamPressKind(1200)) !== -1);

// last dream: stored words, else the profile dream, else empty (open the picker)
ok('remembered castle wins', dreamLastOf('castle', 3) === 'castle');
ok('empty last falls to profile CASTLE', dreamLastOf('', 0) === 0);
ok('null last falls to profile BAKERY', dreamLastOf(null, 3) === 3);
ok('no last and no profile opens the picker', dreamLastOf('', null) === '' && dreamLastOf(null, undefined) === '');
ok('out of range profile is not a last dream', dreamLastOf('', 99) === '');
ok('rememberDream keeps a spoken line', rememberDream(null, '  a castle by the sea  ') === 'a castle by the sea');
ok('rememberDream keeps a picker index', rememberDream('old', 6) === 6);
ok('rememberDream does not invent PROFILE.VER', PROFILE.VER === 1);

// TAP: last dream goes through dreamScript, never hearDream, never a second mapper
(function () {
  const act = dreamPressAct('tap', { last: 'castle' });
  ok('tap + last castle uses dreamScript', act.door === 'dreamScript' && act.kind === 'tap' && act.dream === 'castle');
  const w1 = makeWorld(), w2 = makeWorld();
  const viaAct = runDreamAct(w1, act);
  const viaScript = applyDream(w2, dreamScript('castle'));
  ok('tap castle placed', viaAct.ok && viaAct.placed === viaScript.placed && viaAct.placed > 0);
  ok('tap castle encode matches applyDream(dreamScript)', encode(w1) === encode(w2));
  ok('tap castle door stays dreamScript', viaAct.door === 'dreamScript');
  ok('tap castle never plants 13/14', idsOk(viaAct.script));
  ok('tap castle under LINK_MAX', viaAct.encodeLen <= ISLE.LINK_MAX, viaAct.encodeLen);
})();

(function () {
  const act = dreamPressAct('tap', { last: '', profileDream: 0 });
  ok('tap with profile CASTLE uses dreamScript 0', act.door === 'dreamScript' && act.dream === 0);
  const w1 = makeWorld(), w2 = makeWorld();
  runDreamAct(w1, act);
  applyDream(w2, dreamScript(0));
  ok('tap profile CASTLE matches index 0', encode(w1) === encode(w2));
  ok('tap profile CASTLE is four high', worldStats(w1).tallest >= 4);
})();

(function () {
  const act = dreamPressAct('tap', { last: '', profileDream: null });
  ok('tap with nothing opens the picker', act.door === 'picker' && act.kind === 'tap');
  const w = makeWorld();
  const r = runDreamAct(w, act);
  ok('tap picker places nothing', r.door === 'picker' && r.placed === 0 && w.count === 0);
  ok('tap picker does not invent a mapper', r.ok === false && r.why === 'picker');
})();

// HOLD: voice words go through hearDream, which is still trim → dreamScript → applyDream
(function () {
  const heard = '  a castle by the sea  ';
  const act = dreamPressAct('hold', { heard: heard });
  ok('hold uses hearDream', act.door === 'hearDream' && act.kind === 'hold' && act.text === 'a castle by the sea');
  const w1 = makeWorld(), w2 = makeWorld(), w3 = makeWorld();
  const viaAct = runDreamAct(w1, act);
  const viaHear = hearDream(w2, heard);
  applyDream(w3, dreamScript(heard.trim()));
  ok('hold castle placed', viaAct.ok && viaAct.placed === viaHear.placed && viaAct.placed > 0);
  ok('hold encode matches hearDream', encode(w1) === encode(w2));
  ok('hold encode matches dreamScript', encode(w1) === encode(w3));
  ok('hold door stays hearDream', viaAct.door === 'hearDream');
  ok('hold keeps the trimmed words', viaAct.heard === 'a castle by the sea');
  ok('hold never plants 13/14', idsOk(viaAct.script));
})();

(function () {
  const act = dreamPressAct('hold', { heard: '  birthday cake  ' });
  const w1 = makeWorld(), w2 = makeWorld();
  runDreamAct(w1, act);
  hearDream(w2, 'birthday cake');
  ok('hold bakery matches hearDream', encode(w1) === encode(w2));
  ok('hold bakery lights a factory', factories(w1).length >= 1);
  ok('hold bakery matches dream 3', dreamMatch(act.text) === 3);
})();

(function () {
  const act = dreamPressAct('hold', { heard: '   ' });
  ok('empty hold still names the hearDream door', act.door === 'hearDream' && act.text === '');
})();

// LONG-PRESS: opens the picker. A pick then uses dreamScript.
(function () {
  const act = dreamPressAct('long', { last: 'castle', heard: 'zoo' });
  ok('long-press opens the picker even if a last dream exists', act.door === 'picker' && act.kind === 'long');
  const w = makeWorld();
  const r = runDreamAct(w, act);
  ok('long-press places nothing by itself', r.door === 'picker' && r.placed === 0 && w.count === 0);
})();

PROFILE.DREAMS.forEach(function (d, i) {
  const pick = dreamPickAct(i);
  ok(d.name + ' pick uses dreamScript', pick.door === 'dreamScript' && pick.kind === 'pick' && pick.dream === i);
  const w1 = makeWorld(), w2 = makeWorld();
  const viaPick = runDreamAct(w1, pick);
  applyDream(w2, dreamScript(i));
  ok(d.name + ' pick encode matches dreamScript', viaPick.ok && encode(w1) === encode(w2));
  ok(d.name + ' pick never plants 13/14', idsOk(viaPick.script));
  ok(d.name + ' pick under LINK_MAX', viaPick.encodeLen <= ISLE.LINK_MAX, viaPick.encodeLen);
});

(function () {
  const pick = dreamPickAct('a castle by the sea');
  ok('free-text pick uses dreamScript', pick.door === 'dreamScript' && pick.dream === 'a castle by the sea');
  const w1 = makeWorld(), w2 = makeWorld(), w3 = makeWorld();
  const viaPick = runDreamAct(w1, pick);
  applyDream(w2, dreamScript('a castle by the sea'));
  hearDream(w3, 'a castle by the sea');
  ok('free-text pick matches dreamScript', encode(w1) === encode(w2));
  ok('free-text pick matches hearDream of the same words', encode(w1) === encode(w3));
  ok('free-text pick is CASTLE', dreamMatch(pick.dream) === 0 && viaPick.ok);
})();

(function () {
  const pick = dreamPickAct('  bloom  ');
  const w1 = makeWorld(), w2 = makeWorld();
  runDreamAct(w1, pick);
  applyDream(w2, dreamScript('  bloom  '));
  ok('garden free text matches dreamScript', encode(w1) === encode(w2) && worldStats(w1).grass >= 10);
})();

// cargo / grow still win; the gesture table does not swallow them
(function () {
  const w = makeWorld();
  w.count = ISLE.MAX_BLOCKS;
  const r = runDreamAct(w, dreamPressAct('tap', { last: 'castle' }));
  ok('cargo stops a tap', !r.ok && r.why === 'cargo' && r.placed === 0);
  ok('cargo leaves the grid empty', encode(w) === encode(makeWorld()));
})();

(function () {
  const w = makeWorld();
  const r = applyDream(w, [{ x: 20, y: 20, id: 13 }]);
  ok('sprout still refused', !r.ok && r.why === 'grow' && w.count === 0);
  const r2 = runDreamAct(w, dreamPickAct(0));
  ok('a later pick still works after a refused grow', r2.ok && r2.placed > 0);
  ok('pick castle never asked for 13 or 14', idsOk(r2.script));
})();

// roundtrip and hideout default stay the same doors
(function () {
  const w = makeWorld();
  const r = runDreamAct(w, dreamPressAct('hold', { heard: 'purple bananas from the boat' }));
  ok('unknown hold is still hideout', r.ok && dreamMatch(r.heard) === 5 && houses(w).length === 1);
  const w2 = decode(encode(w));
  ok('hold decode not null', !!w2);
  ok('hold roundtrip count', w2 && w2.count === w.count);
  let same = true;
  if (w2) for (let k = 0; k < w.cols.length; k++) if (w.cols[k] !== w2.cols[k]) { same = false; break; }
  ok('hold roundtrip exact', same);
})();

ok('place and erase still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');
ok('no fourth door on any path', ['dreamScript', 'hearDream', 'picker'].indexOf(dreamPressAct('tap', { last: 'x' }).door) !== -1
  && dreamPressAct('hold', { heard: 'x' }).door === 'hearDream'
  && dreamPressAct('long').door === 'picker'
  && dreamPickAct(1).door === 'dreamScript');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
