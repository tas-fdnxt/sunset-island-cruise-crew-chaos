// OVERNIGHT + NPC MEMORY. Sleep rides the moon, not a new dock hero.
// Tap still opens tonight's chapter. Hold sleeps the island and writes
// the overnight beat. Long-press opens the shelf. Islanders remember a
// tiny durable state in #i= via &m=, measured against the 1700-char gate.
// No lock. No sell. No fourth gesture. No second world codec.
const { ISLE, PROFILE, makeWorld, place, encode, decode, buildHash, parseHash,
  chapter, questTable, pickQuest, questMet, bedtimeQuestion,
  DREAM_HOLD_MS, DREAM_LONG_MS, dreamPressKind,
  PLAY_HOLD_MS, PLAY_LONG_MS,
  PHONE_CAP, dockSpan, dockFitsPhone,
  NPC_NAMES, NPC_KINDS, NPC_MEM_VER, NPC_MEM_MAX,
  SLEEP_HOLD_MS, SLEEP_LONG_MS,
  sleepPressKind, sleepPressAct, runSleepAct,
  encodeNpcMem, decodeNpcMem, npcRemember, npcRememberedNames,
  npcTalkLine, overnightLine, emptyNpcMem
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('sleepPressKind is the gesture clock', typeof sleepPressKind === 'function');
ok('sleepPressAct is the door table', typeof sleepPressAct === 'function');
ok('runSleepAct is the resolver', typeof runSleepAct === 'function');
ok('overnightLine is the chapter beat', typeof overnightLine === 'function');
ok('encodeNpcMem is the compact codec', typeof encodeNpcMem === 'function');
ok('decodeNpcMem is the compact decoder', typeof decodeNpcMem === 'function');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('Sleep shares the Dream clock', SLEEP_HOLD_MS === DREAM_HOLD_MS && SLEEP_HOLD_MS === 280);
ok('Sleep long-press matches the Dream clock', SLEEP_LONG_MS === DREAM_LONG_MS && SLEEP_LONG_MS === 900);
ok('Play still shares that same clock', PLAY_HOLD_MS === SLEEP_HOLD_MS && PLAY_LONG_MS === SLEEP_LONG_MS);
ok('long-press is after hold', SLEEP_LONG_MS > SLEEP_HOLD_MS);

// the clock: three kinds, never a fourth, same edges as Dream and Play
ok('0 ms is a tap', sleepPressKind(0) === 'tap');
ok('100 ms is a tap', sleepPressKind(100) === 'tap');
ok('just under hold is a tap', sleepPressKind(SLEEP_HOLD_MS - 1) === 'tap');
ok('hold starts at the threshold', sleepPressKind(SLEEP_HOLD_MS) === 'hold');
ok('mid hold stays hold', sleepPressKind(500) === 'hold');
ok('just under long is hold', sleepPressKind(SLEEP_LONG_MS - 1) === 'hold');
ok('long starts at the threshold', sleepPressKind(SLEEP_LONG_MS) === 'long');
ok('two seconds is still long, never a fourth kind', sleepPressKind(2000) === 'long');
ok('negative and NaN fall back to tap', sleepPressKind(-3) === 'tap' && sleepPressKind(NaN) === 'tap');
ok('Sleep and Dream share one clock', sleepPressKind(0) === dreamPressKind(0)
  && sleepPressKind(280) === dreamPressKind(280)
  && sleepPressKind(900) === dreamPressKind(900));
ok('only three kinds exist', ['tap', 'hold', 'long'].indexOf(sleepPressKind(0)) !== -1
  && ['tap', 'hold', 'long'].indexOf(sleepPressKind(400)) !== -1
  && ['tap', 'hold', 'long'].indexOf(sleepPressKind(1200)) !== -1);

// TAP: the moon still opens tonight's chapter. That is the existing home.
(function () {
  const act = sleepPressAct('tap', {});
  ok('tap names the story door', act.door === 'story' && act.kind === 'tap');
  const r = runSleepAct(act, {});
  ok('tap resolves to tonight\'s chapter', r.ok && r.door === 'story' && r.kind === 'tap');
})();

// HOLD: the overnight beat. Writes the living chapter, never a lock.
(function () {
  const act = sleepPressAct('hold', {});
  ok('hold names the overnight door', act.door === 'overnight' && act.kind === 'hold');
  const r = runSleepAct(act, { hasChapter: false });
  ok('hold sleeps the island', r.ok && r.door === 'overnight' && r.slept === true);
  const again = runSleepAct(act, { hasChapter: true });
  ok('hold still sleeps if a chapter is already written', again.ok && again.door === 'overnight');
})();

// LONG-PRESS: the shelf. Even if a chapter exists.
(function () {
  const act = sleepPressAct('long', {});
  ok('long-press opens the shelf', act.door === 'shelf' && act.kind === 'long');
  const r = runSleepAct(act, { hasChapter: true });
  ok('long-press does not sleep or rewrite', r.ok && r.door === 'shelf' && r.kind === 'long' && !r.slept);
})();

ok('no fourth door on any path', (function () {
  const doors = [
    sleepPressAct('tap').door,
    sleepPressAct('hold').door,
    sleepPressAct('long').door
  ];
  return doors.join() === 'story,overnight,shelf';
})());
ok('resolved doors are only the live hooks', (function () {
  const allow = { story: 1, overnight: 1, shelf: 1 };
  const rows = [
    runSleepAct(sleepPressAct('tap'), {}),
    runSleepAct(sleepPressAct('hold'), {}),
    runSleepAct(sleepPressAct('long'), {})
  ];
  return rows.every(function (r) { return r.ok && allow[r.door]; });
})());
ok('a missing act is a none door', runSleepAct(null).ok === false && runSleepAct(null).door === 'none');

// Sleep never steals PLAY or DREAM on the dock
ok('PLAY stays the dock hero', PHONE_CAP.PLAY_W >= 80);
ok('DREAM stays the second hero', PHONE_CAP.DREAM_W >= 76);
ok('Sleep is not a third dock hero width', PHONE_CAP.SLEEP_W == null);
ok('dock span is unchanged by Sleep', dockSpan(false) ===
  PHONE_CAP.DOCK_PAD * 2 + 7 * PHONE_CAP.TOOL_W + PHONE_CAP.CUR_W
  + PHONE_CAP.PLAY_W + PHONE_CAP.DREAM_W + 9 * PHONE_CAP.DOCK_GAP);
ok('a 390 phone still cannot hold the dock', dockFitsPhone(390, false) === false);

// NPC names are the eight curated islanders. Never invent a ninth.
ok('eight curated names', NPC_NAMES.length === 8);
ok('Coco keeps the book', NPC_NAMES[0] === 'COCO');
ok('Barnacle Bob is second', NPC_NAMES[1] === 'BARNACLE BOB');
ok('Biscuit is last', NPC_NAMES[7] === 'BISCUIT');
ok('no invented name', NPC_NAMES.indexOf('OLLIE') === -1 && NPC_NAMES.indexOf('FABIAN') === -1);
ok('four talk kinds, none is first', NPC_KINDS.join() === 'none,hello,sleep,word');
ok('memory version is 1', NPC_MEM_VER === 1);
ok('max eight slots', NPC_MEM_MAX === 8);

// compact codec: empty adds nothing; eight slots stay tiny
ok('empty memory encodes to empty', encodeNpcMem(null) === '' && encodeNpcMem([]) === '' && encodeNpcMem(emptyNpcMem()) === '');
ok('empty decode is empty', decodeNpcMem('').length === 0 && decodeNpcMem(null).length === 0);
ok('garbage memory is empty, never throws', decodeNpcMem('!!!') .length === 0 && decodeNpcMem('%3Cscript%3E').length === 0);

(function () {
  let mem = emptyNpcMem();
  mem = npcRemember(mem, 0, 'hello');
  ok('hello marks Coco as met', mem[0].kind === 'hello' && mem[0].met === true && mem[0].nights === 0);
  const enc = encodeNpcMem(mem);
  ok('one hello is a short token', enc.length > 0 && enc.length <= 8, enc);
  const back = decodeNpcMem(enc);
  ok('one hello roundtrips', back[0] && back[0].kind === 'hello' && back[0].met === true && back[0].nights === 0);
  ok('hello does not invent nights', back[0].nights === 0);
})();

(function () {
  let mem = emptyNpcMem();
  mem = npcRemember(mem, 0, 'hello');
  mem = npcRemember(mem, 0, 'sleep');
  mem = npcRemember(mem, 1, 'sleep');
  ok('sleep bumps nights', mem[0].nights === 1 && mem[1].nights === 1);
  ok('sleep keeps the hello as met', mem[0].met === true);
  mem = npcRemember(mem, 0, 'sleep');
  ok('a second night counts', mem[0].nights === 2);
  for (let i = 0; i < 20; i++) mem = npcRemember(mem, 0, 'sleep');
  ok('nights cap at 15', mem[0].nights === 15);
  const names = npcRememberedNames(mem);
  ok('remembered names are Coco and Barnacle Bob', names.join() === 'COCO,BARNACLE BOB', names.join());
})();

(function () {
  let mem = emptyNpcMem();
  for (let i = 0; i < NPC_MEM_MAX; i++) mem = npcRemember(mem, i, 'sleep');
  const enc = encodeNpcMem(mem);
  ok('eight slots encode', enc.length > 0);
  ok('eight slots cost at most 12 base64url chars', enc.length <= 12, 'len=' + enc.length + ' ' + enc);
  const back = decodeNpcMem(enc);
  ok('eight slots roundtrip', back.length === 8 && back.every(function (s) { return s.nights === 1 && s.kind === 'sleep'; }));
  const raw = Buffer.from(enc.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - enc.length % 4) % 4), 'base64');
  ok('raw payload is at most 9 bytes (header + 8 slots)', raw.length <= 9, 'bytes=' + raw.length);
})();

ok('out of range remember is ignored', npcRemember(emptyNpcMem(), 99, 'sleep').every(function (s) { return s.nights === 0; }));
ok('unknown kind is ignored', npcRemember(emptyNpcMem(), 0, 'locked').every(function (s) { return s.kind === 'none'; }));
ok('npcRemember does not invent PROFILE.VER', PROFILE.VER === 1);

// talk lines are kid-clear and never put words in Ollie's mouth
ok('sleep talk is a good morning', /remembered last night/.test(npcTalkLine({ nights: 1, kind: 'sleep', met: true }, 'COCO', 'Captain', 'OLLIE')));
ok('hello talk remembers the hello', /remember your hello/.test(npcTalkLine({ nights: 0, kind: 'hello', met: true }, 'PEARL', 'Captain', 'OLLIE')));
ok('empty slot has no invented line', npcTalkLine({ nights: 0, kind: 'none', met: false }, 'COCO', 'Captain', 'OLLIE') === '');
ok('talk line never quotes Ollie', npcTalkLine({ nights: 1, kind: 'sleep', met: true }, 'COCO', 'Captain', 'OLLIE').indexOf('Ollie said') === -1);

// overnight chapter line
ok('quiet overnight still has a line', /The island slept/.test(overnightLine({})));
ok('one name is named', /COCO remembered you in the morning/.test(overnightLine({ remembered: ['COCO'] })));
ok('two names use and', /COCO and PEARL remembered you in the morning/.test(overnightLine({ remembered: ['COCO', 'PEARL'] })));
ok('three names stay kid-clear', /COCO, PEARL and MANGO remembered you in the morning/.test(overnightLine({ remembered: ['COCO', 'PEARL', 'MANGO'] })));
ok('no em dash in the overnight line', overnightLine({ remembered: ['COCO'] }).indexOf('\u2014') === -1);
ok('no lock language', ['LOCK', 'BUY', 'UNLOCK', 'COIN TO PLAY'].every(function (w) {
  return overnightLine({ remembered: ['COCO'] }).toUpperCase().indexOf(w) === -1;
}));

const quiet = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0] });
ok('a quiet day does not invent an overnight', quiet[0].lines.join(' ').indexOf('The island slept') === -1);
const slept = chapter({ name: 'OLLIE', stats: { blocks: 4 }, prevStats: {}, quest: questTable()[0], overnight: true, remembered: ['COCO'] });
const sleptAll = slept.map(function (p) { return p.lines.join(' '); }).join(' ');
ok('overnight writes the living chapter line', /The island slept, and COCO remembered you in the morning/.test(sleptAll));
ok('overnight still uses his name', sleptAll.indexOf('Captain Ollie') !== -1);
ok('overnight still has three beats', slept.length === 3);
ok('overnight never empties a page', slept.every(function (p) { return p.lines.every(function (l) { return l.length > 0; }); }));

const t = questTable();
const sleepQ = t.filter(function (q) { return q.id === 'sleep1'; });
ok('sleep1 is appended once', sleepQ.length === 1);
ok('sleep1 maps to sleptToday', sleepQ[0] && sleepQ[0].need === 'sleptToday' && sleepQ[0].n === 1);
ok('sleep1 is kid-clear', /sleep on the island/.test(sleepQ[0].tell) && /remembered/.test(sleepQ[0].done));
ok('sleep1 stays after goal1, never inserted', t.map(function (q) { return q.id; }).indexOf('sleep1') > t.map(function (q) { return q.id; }).indexOf('goal1')
  && t[0].id !== 'sleep1');
ok('sleep1 is met by one sleep', questMet(sleepQ[0], { sleptToday: 1 }) && !questMet(sleepQ[0], { sleptToday: 0 }));
ok('houses3 is still first without a dream', t[0].id === 'houses3');
ok('pickQuest still prefers an unmet house', pickQuest({ houses: 0 }, null).id === 'houses3');

const bq = bedtimeQuestion({ keys: ['sleep'], n: 2 });
ok('bedtime can ask who remembers', /remember/.test(bq.ask) && bq.a[bq.rightIdx] === 'The islanders');

// share hash: &m= rides beside &v= and &r=. Empty adds nothing.
ok('empty mem adds nothing to the hash', buildHash('ABC', 0, 'OLLIE', []).indexOf('&m=') === -1);
ok('empty mem arg still adds nothing', buildHash('ABC', 0, 'OLLIE', [], null, null, emptyNpcMem()).indexOf('&m=') === -1);
ok('old links still parse with m null', parseHash(buildHash('ABC', 0, 'OLLIE', [])).m == null
  || parseHash(buildHash('ABC', 0, 'OLLIE', [])).m.length === 0);

(function () {
  let mem = npcRemember(emptyNpcMem(), 0, 'sleep');
  mem = npcRemember(mem, 2, 'hello');
  const hs = buildHash('ABC', 42100, 'OLLIE', ['SIBELLA'], null, null, mem);
  ok('hash carries &m=', hs.indexOf('&m=') !== -1, hs);
  const p = parseHash(hs);
  ok('parse keeps enc and builder', p.enc === 'ABC' && p.b === 'OLLIE' && p.t === 42100);
  ok('parse keeps the chain', JSON.stringify(p.c) === '["SIBELLA"]');
  ok('parse restores Coco slept', p.m && p.m[0] && p.m[0].kind === 'sleep' && p.m[0].nights === 1);
  ok('parse restores Pearl hello', p.m && p.m[2] && p.m[2].kind === 'hello');
  const again = buildHash(p.enc, p.t, p.b, p.c, p.r, p.v, p.m);
  ok('memory hash roundtrips', again === hs, again + ' vs ' + hs);
})();

ok('hostile m= is ignored', (function () {
  const p = parseHash('#i=ABC&m=%3Cscript%3E');
  return p && p.enc === 'ABC' && (!p.m || !p.m.length);
})());
ok('voyage suffix still parses beside memory', (function () {
  let mem = npcRemember(emptyNpcMem(), 0, 'sleep');
  const hs = buildHash('ABC', 0, 'OLLIE', [], null, { no: 4, done: 1, all: 3 }, mem);
  const p = parseHash(hs);
  return p.v && p.v.no === 4 && p.m && p.m[0].nights === 1;
})());

// byte cost, named out loud
(function () {
  const bare = buildHash('ABC', 0, '', [], null, null, null);
  const one = buildHash('ABC', 0, '', [], null, null, npcRemember(emptyNpcMem(), 0, 'hello'));
  const fullMem = (function () {
    let m = emptyNpcMem();
    for (let i = 0; i < 8; i++) m = npcRemember(m, i, 'sleep');
    return m;
  })();
  const full = buildHash('ABC', 0, '', [], null, null, fullMem);
  const oneCost = one.length - bare.length;
  const fullCost = full.length - bare.length;
  ok('one islander costs at most 11 hash chars including &m=', oneCost <= 11, 'cost=' + oneCost);
  ok('eight islanders cost at most 15 hash chars including &m=', fullCost <= 15, 'cost=' + fullCost);
  console.log('NPC memory hash cost: one=' + oneCost + ' full=' + fullCost + ' chars');
})();

// worst-case island plus a full memory still under the 1700 gate
(function () {
  const w = makeWorld();
  let n = 0;
  outer: for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) for (let k = 0; k < 4; k++) {
    if (!place(w, x, y, 1 + ((x * 7 + y * 13 + k) % 9)).ok) continue;
    n++; if (n >= ISLE.MAX_BLOCKS) break outer;
  }
  let mem = emptyNpcMem();
  for (let i = 0; i < 8; i++) mem = npcRemember(mem, i, 'sleep');
  const before = encode(w);
  const worst = buildHash(before, 3599999, 'ABCDEFGHIJ', ['ABCDEFGHIJ', 'ABCDEFGHIJ', 'ABCDEFGHIJ'],
    { coins: 999999, mask: 1023, houses: 99 }, { no: 99999, done: 3, all: 3 }, mem);
  ok('WORST-CASE LINK WITH NPC MEMORY <= 1700', worst.length <= 1700, 'len=' + worst.length);
  ok('still under LINK_MAX', worst.length <= ISLE.LINK_MAX);
  ok('the grid is unchanged by the codec', encode(w) === before);
  const w2 = decode(before);
  ok('the island still roundtrips after a memory hash', !!w2 && encode(w2) === before);
  console.log('worst-case overnight link:', worst.length, 'chars');
})();

// decisions never plant blocks
(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  runSleepAct(sleepPressAct('tap'), {});
  runSleepAct(sleepPressAct('hold'), {});
  runSleepAct(sleepPressAct('long'), {});
  encodeNpcMem(npcRemember(emptyNpcMem(), 0, 'sleep'));
  overnightLine({ remembered: ['COCO'] });
  ok('decisions leave the grid alone', encode(w) === before && w.count === 1);
  ok('decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
})();

ok('no lock or sell language on the Sleep table', ['story', 'overnight', 'shelf'].every(function (d) {
  return d.indexOf('lock') < 0 && d.indexOf('buy') < 0;
}));
ok('place and encode still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
