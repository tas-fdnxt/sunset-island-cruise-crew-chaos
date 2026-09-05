// CHROME AND PHONE_CAP. A 390-point phone cannot hold the whole dock once
// PLAY and DREAM are kid-sized. The bar must scroll. Chrome never kisses a
// side. Warmth is a colour mix, not a second walk engine. LINK_MAX stays.
const { ISLE, PROFILE, PHONE_CAP, dockSpan, dockFitsPhone, chromeEdge, warmRgb,
  encode, decode, makeWorld, place } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('PHONE_CAP is the honest phone width', PHONE_CAP.W === 390);
ok('chrome never sits closer than 16 points to a side', PHONE_CAP.EDGE === 16 && chromeEdge() === 16);
ok('dock side pad matches the edge', PHONE_CAP.DOCK_PAD === PHONE_CAP.EDGE);
ok('tool buttons are at least about 2cm', PHONE_CAP.TOOL_W >= 76);
ok('PLAY is the hero and bigger than a tool', PHONE_CAP.PLAY_W >= 92 && PHONE_CAP.PLAY_W > PHONE_CAP.TOOL_W);
ok('DREAM is the second hero', PHONE_CAP.DREAM_W >= 84 && PHONE_CAP.DREAM_W > PHONE_CAP.TOOL_W);
ok('the current block is bigger than a pin', PHONE_CAP.CUR_W > PHONE_CAP.TOOL_W);
ok('ten slots show when remix is hidden', PHONE_CAP.SLOTS_VISIBLE === 10);
ok('eleven slots when a foreign island is open', PHONE_CAP.SLOTS_ALL === 11);

const span = dockSpan(false);
const spanRemix = dockSpan(true);
ok('the honest dock is wider than a 390 phone', span > PHONE_CAP.W, span);
ok('remix makes it wider still', spanRemix > span);
ok('a 390 phone does not fit the dock', dockFitsPhone(390, false) === false);
ok('a 390 phone does not fit even without remix', dockFitsPhone(PHONE_CAP.W) === false);
ok('an invented "never scrolls" claim is false on a phone', dockFitsPhone(390, false) === false);
ok('an 820 tablet portrait cannot hold the bigger phone dock', dockFitsPhone(820, false) === false, span);
ok('a 1180 landscape can hold the phone-sized dock', dockFitsPhone(1180, false) === true, span);
ok('a 2000 point desk can hold it', dockFitsPhone(2000, false) === true);
ok('missing width uses the phone width', dockFitsPhone() === false);

ok('chromeEdge is always the same number', chromeEdge(390) === 16 && chromeEdge(820) === 16);
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);

ok('warmRgb leaves colour alone when off', (function () {
  const a = [0.2, 0.4, 0.6];
  const b = warmRgb(a, false);
  return b === a && a[0] === 0.2;
})());
ok('warmRgb leaves a missing colour alone', warmRgb(null, true) === null);
ok('warmRgb mixes toward peach, not a new mesh', (function () {
  const a = [0.4, 0.4, 0.4];
  const b = warmRgb(a, true);
  return b[0] > a[0] && b[1] > a[1] * 0.9 && b[2] < a[2] + 0.05 && b !== a;
})());
ok('warmth never invents a fourth channel', warmRgb([1, 1, 1], true).length === 3);
ok('warmth stays in 0..1', (function () {
  const b = warmRgb([1, 0, 0], true);
  return b.every(function (n) { return n >= 0 && n <= 1; });
})());

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  dockFitsPhone(390, false);
  warmRgb([0.5, 0.5, 0.5], true);
  ok('PHONE_CAP decisions never write the world', encode(w) === before);
  ok('PHONE_CAP decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
  ok('the island still roundtrips', encode(decode(before)) === before);
})();

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
