// BUILD REPLAY. Hold UNDO and the last placements go down again.
// Tap UNDO stays undo. Long-press replays a longer recent run.
// The tape is the trailing place ops on w.undo. Peel via undo,
// then place() puts the same blocks back. Encode matches. Nothing
// new rides in #i=. PLAY and DREAM stay the dock heroes.
// No lock. No sell. No fourth gesture. No second world codec.
const { ISLE, PROFILE, makeWorld, place, erase, undo, encode, decode, buildHash, parseHash,
  chapter, questTable, pickQuest, questMet, bedtimeQuestion, nextThing,
  DREAM_HOLD_MS, DREAM_LONG_MS, dreamPressKind,
  PLAY_HOLD_MS, PLAY_LONG_MS,
  PHONE_CAP, dockSpan, dockFitsPhone,
  REPLAY_HOLD_MS, REPLAY_LONG_MS, REPLAY_LAST, REPLAY_ALL,
  replayPressKind, replayPressAct, runReplayAct, replayTape, peelReplay, replayStep, replayLine
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('replayPressKind is the gesture clock', typeof replayPressKind === 'function');
ok('replayPressAct is the door table', typeof replayPressAct === 'function');
ok('runReplayAct is the resolver', typeof runReplayAct === 'function');
ok('replayTape reads the undo stack', typeof replayTape === 'function');
ok('peelReplay lifts the tape', typeof peelReplay === 'function');
ok('replayStep is one place()', typeof replayStep === 'function');
ok('replayLine is the chapter beat', typeof replayLine === 'function');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('Replay shares the Dream clock', REPLAY_HOLD_MS === DREAM_HOLD_MS && REPLAY_HOLD_MS === 280);
ok('Replay long-press matches the Dream clock', REPLAY_LONG_MS === DREAM_LONG_MS && REPLAY_LONG_MS === 900);
ok('Play still shares that same clock', PLAY_HOLD_MS === REPLAY_HOLD_MS && PLAY_LONG_MS === REPLAY_LONG_MS);
ok('long-press is after hold', REPLAY_LONG_MS > REPLAY_HOLD_MS);
ok('a short last-run is kid-short', REPLAY_LAST >= 4 && REPLAY_LAST <= 16);
ok('a long run stays a short sequence', REPLAY_ALL >= REPLAY_LAST && REPLAY_ALL <= 32);

// the clock: three kinds, never a fourth, same edges as Dream and Play
ok('0 ms is a tap', replayPressKind(0) === 'tap');
ok('100 ms is a tap', replayPressKind(100) === 'tap');
ok('just under hold is a tap', replayPressKind(REPLAY_HOLD_MS - 1) === 'tap');
ok('hold starts at the threshold', replayPressKind(REPLAY_HOLD_MS) === 'hold');
ok('mid hold stays hold', replayPressKind(500) === 'hold');
ok('just under long is hold', replayPressKind(REPLAY_LONG_MS - 1) === 'hold');
ok('long starts at the threshold', replayPressKind(REPLAY_LONG_MS) === 'long');
ok('two seconds is still long, never a fourth kind', replayPressKind(2000) === 'long');
ok('negative and NaN fall back to tap', replayPressKind(-3) === 'tap' && replayPressKind(NaN) === 'tap');
ok('Replay and Dream share one clock', replayPressKind(0) === dreamPressKind(0)
  && replayPressKind(280) === dreamPressKind(280)
  && replayPressKind(900) === dreamPressKind(900));
ok('only three kinds exist', ['tap', 'hold', 'long'].indexOf(replayPressKind(0)) !== -1
  && ['tap', 'hold', 'long'].indexOf(replayPressKind(400)) !== -1
  && ['tap', 'hold', 'long'].indexOf(replayPressKind(1200)) !== -1);

// TAP: UNDO stays undo. That is the existing home.
(function () {
  const act = replayPressAct('tap', {});
  ok('tap names the undo door', act.door === 'undo' && act.kind === 'tap');
  const r = runReplayAct(makeWorld(), act, {});
  ok('tap resolves to undo', r.ok && r.door === 'undo' && r.kind === 'tap');
})();

// HOLD: replay the last short run. Instant apply restores the island.
(function () {
  const act = replayPressAct('hold', {});
  ok('hold names the last-run door', act.door === 'replayLast' && act.kind === 'hold');
  const w = makeWorld();
  place(w, 40, 40, 3); place(w, 41, 40, 3); place(w, 42, 40, 3);
  const before = encode(w);
  const r = runReplayAct(w, act, {});
  ok('hold replays a live tape', r.ok && r.door === 'replayLast' && r.tape && r.tape.length === 3, r);
  ok('hold restore matches the start encode', encode(w) === before);
  ok('hold leaves the same count', w.count === 3);
})();

// LONG-PRESS: a longer recent run, still the same blocks.
(function () {
  const act = replayPressAct('long', {});
  ok('long-press names the long door', act.door === 'replayLong' && act.kind === 'long');
  const w = makeWorld();
  for (let i = 0; i < 10; i++) place(w, 30 + i, 30, 3);
  const before = encode(w);
  const r = runReplayAct(w, act, {});
  ok('long replays the trailing places', r.ok && r.door === 'replayLong' && r.tape.length === 10);
  ok('long restore matches the start encode', encode(w) === before);
})();

ok('no fourth door on any path', (function () {
  const doors = [
    replayPressAct('tap').door,
    replayPressAct('hold').door,
    replayPressAct('long').door
  ];
  return doors.join() === 'undo,replayLast,replayLong';
})());
ok('resolved doors are only the live hooks', (function () {
  const allow = { undo: 1, replayLast: 1, replayLong: 1 };
  const w = makeWorld();
  place(w, 20, 20, 3);
  const rows = [
    runReplayAct(w, replayPressAct('tap'), {}),
    runReplayAct(w, replayPressAct('hold'), {}),
    runReplayAct(w, replayPressAct('long'), {})
  ];
  return rows.every(function (r) { return r.ok && allow[r.door]; });
})());
ok('a missing act is a none door', runReplayAct(makeWorld(), null).ok === false && runReplayAct(makeWorld(), null).door === 'none');

// Replay never steals PLAY or DREAM on the dock
ok('PLAY stays the dock hero', PHONE_CAP.PLAY_W >= 80);
ok('DREAM stays the second hero', PHONE_CAP.DREAM_W >= 76);
ok('Replay is not a third dock hero width', PHONE_CAP.REPLAY_W == null);
ok('dock span is unchanged by Replay', dockSpan(false) ===
  PHONE_CAP.DOCK_PAD * 2 + 7 * PHONE_CAP.TOOL_W + PHONE_CAP.CUR_W
  + PHONE_CAP.PLAY_W + PHONE_CAP.DREAM_W + 9 * PHONE_CAP.DOCK_GAP);
ok('a 390 phone still cannot hold the dock', dockFitsPhone(390, false) === false);

// tape: trailing place ops only. An erase cuts the run.
(function () {
  const w = makeWorld();
  ok('empty world has an empty tape', replayTape(w, 8).length === 0);
  place(w, 10, 10, 3);
  place(w, 11, 10, 4);
  place(w, 12, 10, 5);
  const t = replayTape(w, 8);
  ok('three places make a three-long tape', t.length === 3);
  ok('tape is chronological', t[0].x === 10 && t[1].x === 11 && t[2].x === 12);
  ok('tape keeps the real ids', t[0].id === 3 && t[1].id === 4 && t[2].id === 5);
  ok('n caps the tape', replayTape(w, 2).length === 2 && replayTape(w, 2)[0].x === 11);
  erase(w, 12, 10);
  ok('a trailing erase ends the run', replayTape(w, 8).length === 0);
  place(w, 13, 10, 3);
  ok('a new place starts a fresh run', replayTape(w, 8).length === 1 && replayTape(w, 8)[0].x === 13);
})();

// peel then step restores, and uses the real place() door
(function () {
  const w = makeWorld();
  place(w, 16, 16, 3); place(w, 17, 16, 3); place(w, 17, 16, 4);
  const before = encode(w);
  const count = w.count;
  const tape = replayTape(w, 8);
  ok('stacked tape has three blocks', tape.length === 3 && tape[2].z === 1);
  const peel = peelReplay(w, tape);
  ok('peel lifts every taped block', peel.ok && peel.peeled === 3 && w.count === 0);
  ok('peel changes the encode', encode(w) !== before);
  for (let i = 0; i < tape.length; i++) {
    const step = replayStep(w, tape, i);
    ok('step ' + i + ' is a place', step.ok && step.x === tape[i].x && step.id === tape[i].id);
  }
  ok('steps restore the count', w.count === count);
  ok('steps restore the encode', encode(w) === before);
  const w2 = decode(encode(w));
  ok('restored island still decodes', !!w2 && encode(w2) === before);
})();

// instant:false peels and leaves the blocks off, so the kid can watch
(function () {
  const w = makeWorld();
  place(w, 22, 22, 3); place(w, 23, 22, 3);
  const before = encode(w);
  const r = runReplayAct(w, replayPressAct('hold'), { instant: false });
  ok('held replay peels first', r.ok && w.count === 0 && encode(w) !== before);
  ok('the tape is still there to play', r.tape.length === 2);
  replayStep(w, r.tape, 0);
  replayStep(w, r.tape, 1);
  ok('watching them go down restores the island', encode(w) === before);
})();

ok('empty hold is honest, never a lock', (function () {
  const r = runReplayAct(makeWorld(), replayPressAct('hold'), {});
  return r.ok === false && r.why === 'empty' && r.door === 'replayLast';
})());
ok('empty long-press is the same honest miss', runReplayAct(makeWorld(), replayPressAct('long'), {}).why === 'empty');

// replay never plants grow ids, never invents a second codec
(function () {
  const w = makeWorld();
  place(w, 8, 8, 3); place(w, 9, 8, 12);
  const tape = replayTape(w, 8);
  ok('tape ids are live blocks', tape.every(function (t) { return t.id >= 1 && t.id <= 12 && t.id !== 13 && t.id !== 14; }));
  const before = encode(w);
  runReplayAct(w, replayPressAct('hold'), {});
  ok('replay of a seed stays a seed', encode(w) === before && w.cols[(8 * ISLE.N + 9) * ISLE.ZMAX] === 12);
})();

// chapter line
ok('quiet replay still has a line', /went down again/.test(replayLine({})));
ok('one block is named', /One block went down again/.test(replayLine({ n: 1 })));
ok('many blocks stay kid-clear', /6 blocks went down again/.test(replayLine({ n: 6 })));
ok('the line says you keep building', /kept building/.test(replayLine({ n: 4 })));
ok('no em dash in the replay line', replayLine({ n: 3 }).indexOf('\u2014') === -1);
ok('no lock language', ['LOCKED', 'BUY', 'UNLOCK', 'COIN TO PLAY'].every(function (w) {
  return replayLine({ n: 3 }).toUpperCase().indexOf(w) === -1;
}));

const quiet = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0] });
ok('a quiet day does not invent a replay', quiet[0].lines.join(' ').indexOf('went down again') === -1);
const watched = chapter({ name: 'OLLIE', stats: { blocks: 4 }, prevStats: {}, quest: questTable()[0], replayed: true, replayedN: 4 });
const watchedAll = watched.map(function (p) { return p.lines.join(' '); }).join(' ');
ok('replay writes the living chapter line', /went down again/.test(watchedAll) && /kept building/.test(watchedAll));
ok('replay still uses his name', watchedAll.indexOf('Captain Ollie') !== -1);
ok('replay still has three beats', watched.length === 3);
ok('replay never empties a page', watched.every(function (p) { return p.lines.every(function (l) { return l.length > 0; }); }));

const t = questTable();
const replayQ = t.filter(function (q) { return q.id === 'replay1'; });
ok('replay1 is appended once', replayQ.length === 1);
ok('replay1 maps to replayedToday', replayQ[0] && replayQ[0].need === 'replayedToday' && replayQ[0].n === 1);
ok('replay1 is kid-clear', /watch your blocks/.test(replayQ[0].tell) && /went down again/.test(replayQ[0].done));
ok('replay1 is last, never inserted', t[t.length - 1].id === 'replay1');
ok('sleep1 is still there', t.filter(function (q) { return q.id === 'sleep1'; }).length === 1);
ok('replay1 is met by one watch', questMet(replayQ[0], { replayedToday: 1 }) && !questMet(replayQ[0], { replayedToday: 0 }));
ok('houses3 is still first without a dream', t[0].id === 'houses3');
ok('pickQuest still prefers an unmet house', pickQuest({ houses: 0 }, null).id === 'houses3');

const bq = bedtimeQuestion({ keys: ['replay'], n: 2 });
ok('bedtime can ask about watching again', /blocks/.test(bq.ask) && /again/.test(bq.a[bq.rightIdx].toLowerCase() + bq.ask.toLowerCase()));
ok('bedtime never sells a lock', (bq.ask + bq.a.join(' ')).toUpperCase().indexOf('BUY') === -1);

// advisor rotation: append only
const day = { blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11 };
const ideaKeys = [];
for (let k = 0; k < 24; k++) {
  const key = nextThing(Object.assign({ tick: k }, day)).key;
  if (k && key === 'tall') break;
  ideaKeys.push(key);
}
ok('replay hint is appended to the rotating ideas', ideaKeys.indexOf('replay') === ideaKeys.length - 1, ideaKeys.join());
ok('replay hint did not steal an older slot', ideaKeys.indexOf('compass') === 5 && ideaKeys.indexOf('seed') === 6);
ok('replay hint is one short sentence', nextThing(Object.assign({ tick: ideaKeys.indexOf('replay') }, day)).line.length < 90
  && nextThing(Object.assign({ tick: ideaKeys.indexOf('replay') }, day)).line.indexOf('\n') === -1);

// share hash: replay adds nothing. Measure the 1700 gate out loud.
ok('replay adds no &replay= to a bare hash', buildHash('ABC', 0, 'OLLIE', []).indexOf('replay') === -1);
ok('old links still parse', parseHash(buildHash('ABC', 0, 'OLLIE', [])).enc === 'ABC');

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3); place(w, 41, 40, 3); place(w, 42, 40, 3);
  const before = encode(w);
  runReplayAct(w, replayPressAct('hold'), {});
  const after = encode(w);
  ok('a replayed island hashes the same', buildHash(after, 0, 'OLLIE', []) === buildHash(before, 0, 'OLLIE', []));
  ok('replay cost in #i= is zero', buildHash(after, 42100, 'OLLIE', ['SIBELLA']).length === buildHash(before, 42100, 'OLLIE', ['SIBELLA']).length);
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
  ok('WORST-CASE LINK WITH REPLAY (no extra field) <= 1700', worst.length <= 1700, 'len=' + worst.length);
  ok('still under LINK_MAX', worst.length <= ISLE.LINK_MAX);
  const taped = replayTape(w, REPLAY_ALL);
  ok('a full island still has a short tape', taped.length > 0 && taped.length <= REPLAY_ALL);
  const peeled = peelReplay(w, taped);
  ok('peel on a full island works', peeled.ok);
  for (let i = 0; i < taped.length; i++) replayStep(w, taped, i);
  ok('full-island replay restores encode', encode(w) === before);
  console.log('worst-case replay link (unchanged hash):', worst.length, 'chars; tape', taped.length);
})();

// decisions never plant blocks
(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  replayPressAct('tap');
  replayPressAct('hold');
  replayPressAct('long');
  replayLine({ n: 3 });
  ok('door-table decisions leave the grid alone', encode(w) === before && w.count === 1);
  ok('decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
})();

ok('no lock or sell language on the Replay table', ['undo', 'replayLast', 'replayLong'].every(function (d) {
  return d.indexOf('lock') < 0 && d.indexOf('buy') < 0;
}));
ok('place, undo and encode still exist', typeof place === 'function' && typeof undo === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
