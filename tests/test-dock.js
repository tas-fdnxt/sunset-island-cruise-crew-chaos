// BIGGER KID DOCK. Tools stay about 2cm on a phone. PLAY and DREAM stay
// the heroes. LOOK stays sand-side. The bar already scrolls. No second dock.
// PHONE_CAP stays the honest fit test. Nothing new rides in #i=.
const { ISLE, PROFILE, makeWorld, place, encode, decode, buildHash, parseHash,
  PHONE_CAP, dockSpan, dockFitsPhone, chromeEdge, chromeCorner,
  prettyOf, PRETTY_IDS
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('PHONE_CAP is the honest phone width', PHONE_CAP.W === 390);
ok('a CSS centimetre is recorded', PHONE_CAP.CM >= 37 && PHONE_CAP.CM <= 39);
ok('tools aim at two centimetres', PHONE_CAP.TOOL_CM === 2);
ok('chrome never sits closer than 16 points to a side', PHONE_CAP.EDGE === 16 && chromeEdge() === 16);
ok('dock side pad matches the edge', PHONE_CAP.DOCK_PAD === PHONE_CAP.EDGE);
ok('corners stay soft', PHONE_CAP.CORNER >= 18 && chromeCorner() === PHONE_CAP.CORNER);
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);

const toolCm = PHONE_CAP.TOOL_W / PHONE_CAP.CM;
ok('a tool is at least about 2cm', toolCm >= 1.95, 'cm=' + toolCm.toFixed(2) + ' w=' + PHONE_CAP.TOOL_W);
ok('a tool is a kid target in points', PHONE_CAP.TOOL_W >= 76 && PHONE_CAP.TOOL_H >= 80);
ok('PLAY screams bigger than the old 84', PHONE_CAP.PLAY_W >= 112 && PHONE_CAP.PLAY_W > PHONE_CAP.TOOL_W);
ok('PLAY is a huge kid square', PHONE_CAP.PLAY_H >= PHONE_CAP.PLAY_W - 2);
ok('DREAM screams bigger than the old 80', PHONE_CAP.DREAM_W >= 104 && PHONE_CAP.DREAM_W > PHONE_CAP.TOOL_W);
ok('DREAM stays smaller than PLAY', PHONE_CAP.DREAM_W < PHONE_CAP.PLAY_W);
ok('the hero gap is obvious next to a tool', PHONE_CAP.PLAY_W - PHONE_CAP.TOOL_W >= 40);
ok('LOOK stays far smaller than PLAY', PHONE_CAP.LOOK_W <= PHONE_CAP.PLAY_W - 32);
ok('the current block is bigger than a tool', PHONE_CAP.CUR_W > PHONE_CAP.TOOL_W);
ok('gap grew with the buttons', PHONE_CAP.DOCK_GAP >= 8);
ok('ten slots show when remix is hidden', PHONE_CAP.SLOTS_VISIBLE === 10);
ok('eleven slots when a foreign island is open', PHONE_CAP.SLOTS_ALL === 11);
ok('LOOK stays a sand-side target', PHONE_CAP.LOOK_W >= 76 && PHONE_CAP.LOOK_H >= 76);
ok('LOOK is not a third dock hero slot', PHONE_CAP.LOOK_DOCK == null);
ok('LOOK stays smaller than PLAY', PHONE_CAP.LOOK_W < PHONE_CAP.PLAY_W);
ok('no second dock was invented', PHONE_CAP.DOCKS == null && PHONE_CAP.DOCK2 == null);

const span = dockSpan(false);
const spanRemix = dockSpan(true);
ok('the honest dock is the pad plus the live buttons', span ===
  PHONE_CAP.DOCK_PAD * 2 + 7 * PHONE_CAP.TOOL_W + PHONE_CAP.CUR_W
  + PHONE_CAP.PLAY_W + PHONE_CAP.DREAM_W + 9 * PHONE_CAP.DOCK_GAP);
ok('the honest dock is wider than a 390 phone', span > PHONE_CAP.W, span);
ok('remix makes it wider still', spanRemix > span);
ok('a 390 phone does not fit the dock', dockFitsPhone(390, false) === false);
ok('an invented "never scrolls" claim is false on a phone', dockFitsPhone(PHONE_CAP.W) === false);
ok('an 820 tablet portrait cannot hold the bigger phone dock', dockFitsPhone(820, false) === false, span);
ok('a 1180 landscape can hold the phone-sized dock', dockFitsPhone(1180, false) === true, span);
ok('a 2000 point desk can hold it', dockFitsPhone(2000, false) === true);
ok('missing width uses the phone width', dockFitsPhone() === false);
ok('LOOK does not change the span', dockSpan(false) === span);

ok('pretty looks are still the live three', PRETTY_IDS.join() === 'soft,warm,crisp');
ok('prettyOf still works', prettyOf('warm') === 'warm');

ok('chromeEdge is always the same number', chromeEdge(390) === 16 && chromeEdge(820) === 16);

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  dockFitsPhone(390, false);
  dockSpan(true);
  const after = encode(w);
  ok('PHONE_CAP decisions never write the world', after === before);
  ok('PHONE_CAP decisions stay under LINK_MAX', after.length <= ISLE.LINK_MAX);
  ok('the island still roundtrips', encode(decode(before)) === before);
  ok('dock adds no &dock= to a bare hash', buildHash(before, 0, 'OLLIE', []).indexOf('dock') === -1);
  ok('old links still parse', parseHash(buildHash(before, 0, 'OLLIE', [])).enc === before);
})();

(function () {
  const w = makeWorld();
  let n = 0;
  outer: for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) for (let k = 0; k < 4; k++) {
    if (!place(w, x, y, 1 + ((x * 7 + y * 13 + k) % 9)).ok) continue;
    n++; if (n >= ISLE.MAX_BLOCKS) break outer;
  }
  const before = encode(w);
  const worst = buildHash(before, 3599999, 'ABCDEFGHIJ', ['ABCDEFGHIJ', 'ABCDEFGHIJ', 'ABCDEFGHIJ'],
    { coins: 999999, mask: 1023, houses: 99 }, { no: 99999, done: 3, all: 3 });
  ok('WORST-CASE LINK WITH BIGGER DOCK (no extra field) <= 1700', worst.length <= 1700, 'len=' + worst.length);
  ok('still under LINK_MAX', worst.length <= ISLE.LINK_MAX);
  dockFitsPhone(390, true);
  ok('full-island encode is unchanged by a fit test', encode(w) === before);
  console.log('worst-case dock link (unchanged hash):', worst.length, 'chars');
})();

ok('place and encode still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
