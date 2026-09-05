// PRETTY MODES + DAY/NIGHT + SOFT CORNERS.
// LOOK is a kid-clear control, not a dock hero. Tap cycles soft / warm / crisp.
// Hold peeks day or night on the existing skyAt clock. Long-press opens the sheet.
// Sleep overnight still brings morning. Nothing new rides in #i=.
// Warmth stays a colour mix. No Three rewrite. No lock. No sell.
const { ISLE, PROFILE, makeWorld, place, encode, decode, buildHash, parseHash,
  chapter, questTable, pickQuest, questMet, bedtimeQuestion, nextThing,
  DREAM_HOLD_MS, DREAM_LONG_MS, dreamPressKind,
  PLAY_HOLD_MS, PLAY_LONG_MS,
  SLEEP_HOLD_MS, SLEEP_LONG_MS, runSleepAct, sleepPressAct,
  PHONE_CAP, dockSpan, dockFitsPhone, chromeEdge, warmRgb,
  skyAt, dayHash, dayKey, mixHex, hexRGB,
  PRETTY_HOLD_MS, PRETTY_LONG_MS, PRETTY_IDS, PRETTY_NAMES,
  prettyPressKind, prettyPressAct, runPrettyAct,
  prettyOf, prettyNextOf, prettyTimeOf, prettyPeekTime, prettyClockHour,
  prettyMixRgb, prettySky, prettyLine, prettyAfterSleep, chromeCorner
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('prettyPressKind is the gesture clock', typeof prettyPressKind === 'function');
ok('prettyPressAct is the door table', typeof prettyPressAct === 'function');
ok('runPrettyAct is the resolver', typeof runPrettyAct === 'function');
ok('prettyMixRgb is a colour mix, not a mesh', typeof prettyMixRgb === 'function');
ok('prettySky tints the living sky', typeof prettySky === 'function');
ok('prettyLine is the chapter beat', typeof prettyLine === 'function');
ok('three pretty ids, no fourth look', PRETTY_IDS.join() === 'soft,warm,crisp');
ok('kid-clear names', PRETTY_NAMES.soft === 'SOFT' && PRETTY_NAMES.warm === 'WARM' && PRETTY_NAMES.crisp === 'CRISP');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('Pretty shares the Dream clock', PRETTY_HOLD_MS === DREAM_HOLD_MS && PRETTY_HOLD_MS === 280);
ok('Pretty long-press matches the Dream clock', PRETTY_LONG_MS === DREAM_LONG_MS && PRETTY_LONG_MS === 900);
ok('Play and Sleep still share that clock', PLAY_HOLD_MS === PRETTY_HOLD_MS && SLEEP_HOLD_MS === PRETTY_HOLD_MS
  && PLAY_LONG_MS === PRETTY_LONG_MS && SLEEP_LONG_MS === PRETTY_LONG_MS);
ok('long-press is after hold', PRETTY_LONG_MS > PRETTY_HOLD_MS);

// the clock: three kinds, never a fourth
ok('0 ms is a tap', prettyPressKind(0) === 'tap');
ok('100 ms is a tap', prettyPressKind(100) === 'tap');
ok('just under hold is a tap', prettyPressKind(PRETTY_HOLD_MS - 1) === 'tap');
ok('hold starts at the threshold', prettyPressKind(PRETTY_HOLD_MS) === 'hold');
ok('mid hold stays hold', prettyPressKind(500) === 'hold');
ok('just under long is hold', prettyPressKind(PRETTY_LONG_MS - 1) === 'hold');
ok('long starts at the threshold', prettyPressKind(PRETTY_LONG_MS) === 'long');
ok('two seconds is still long, never a fourth kind', prettyPressKind(2000) === 'long');
ok('negative and NaN fall back to tap', prettyPressKind(-3) === 'tap' && prettyPressKind(NaN) === 'tap');
ok('Pretty and Dream share one clock', prettyPressKind(0) === dreamPressKind(0)
  && prettyPressKind(280) === dreamPressKind(280)
  && prettyPressKind(900) === dreamPressKind(900));
ok('only three kinds exist', ['tap', 'hold', 'long'].indexOf(prettyPressKind(0)) !== -1
  && ['tap', 'hold', 'long'].indexOf(prettyPressKind(400)) !== -1
  && ['tap', 'hold', 'long'].indexOf(prettyPressKind(1200)) !== -1);

ok('empty mode falls to soft', prettyOf('') === 'soft' && prettyOf(null) === 'soft');
ok('unknown mode falls to soft', prettyOf('locked') === 'soft' && prettyOf(99) === 'soft');
ok('live modes stay themselves', prettyOf('warm') === 'warm' && prettyOf('crisp') === 'crisp' && prettyOf('soft') === 'soft');
ok('soft cycles to warm', prettyNextOf('soft') === 'warm');
ok('warm cycles to crisp', prettyNextOf('warm') === 'crisp');
ok('crisp cycles back to soft', prettyNextOf('crisp') === 'soft');
ok('a full lap is three looks', (function () {
  let m = 'soft';
  const seen = [m];
  for (let i = 0; i < 3; i++) { m = prettyNextOf(m); seen.push(m); }
  return seen.join() === 'soft,warm,crisp,soft';
})());

ok('empty time is auto', prettyTimeOf('') === 'auto' && prettyTimeOf(null) === 'auto');
ok('unknown time is auto', prettyTimeOf('locked') === 'auto');
ok('day and night stay themselves', prettyTimeOf('day') === 'day' && prettyTimeOf('night') === 'night');
ok('auto stays auto', prettyTimeOf('auto') === 'auto');

// TAP: cycle the look. That is the home door.
(function () {
  const act = prettyPressAct('tap', { mode: 'soft' });
  ok('tap names the cycle door', act.door === 'cycle' && act.kind === 'tap' && act.mode === 'warm');
  const r = runPrettyAct(act, { mode: 'soft', time: 'auto' });
  ok('tap resolves to the next look', r.ok && r.door === 'cycle' && r.mode === 'warm' && r.time === 'auto');
})();

// HOLD: peek the other side of the existing sky. Not a second clock.
(function () {
  const act = prettyPressAct('hold', { time: 'auto', hour: 14 });
  ok('hold names the peek door', act.door === 'peek' && act.kind === 'hold');
  const r = runPrettyAct(act, { time: 'auto', hour: 14, mode: 'soft' });
  ok('a day sky peeks night', r.ok && r.door === 'peek' && r.time === 'night');
})();
(function () {
  const act = prettyPressAct('hold', { time: 'auto', hour: 2 });
  const r = runPrettyAct(act, { time: 'auto', hour: 2, mode: 'warm' });
  ok('a night sky peeks day', r.ok && r.door === 'peek' && r.time === 'day');
})();
(function () {
  const r = runPrettyAct(prettyPressAct('hold', { time: 'night', hour: 2 }), { time: 'night', hour: 2 });
  ok('hold from a night peek returns to day', r.ok && r.time === 'day');
})();

// LONG-PRESS: the LOOK sheet. Even if a look is already on.
(function () {
  const act = prettyPressAct('long', { mode: 'crisp' });
  ok('long-press opens the sheet', act.door === 'sheet' && act.kind === 'long');
  const r = runPrettyAct(act, { mode: 'crisp', time: 'night' });
  ok('long-press does not cycle or peek', r.ok && r.door === 'sheet' && r.kind === 'long' && r.mode === 'crisp' && r.time === 'night');
})();

ok('no fourth door on any path', (function () {
  const doors = [
    prettyPressAct('tap', { mode: 'soft' }).door,
    prettyPressAct('hold', { time: 'auto', hour: 12 }).door,
    prettyPressAct('long').door
  ];
  return doors.join() === 'cycle,peek,sheet';
})());
ok('resolved doors are only the live hooks', (function () {
  const allow = { cycle: 1, peek: 1, sheet: 1 };
  const rows = [
    runPrettyAct(prettyPressAct('tap', { mode: 'warm' }), { mode: 'warm' }),
    runPrettyAct(prettyPressAct('hold', { time: 'auto', hour: 14 }), { hour: 14 }),
    runPrettyAct(prettyPressAct('long'), {})
  ];
  return rows.every(function (r) { return r.ok && allow[r.door]; });
})());
ok('a missing act is a none door', runPrettyAct(null).ok === false && runPrettyAct(null).door === 'none');

// LOOK never steals PLAY or DREAM on the dock
ok('PLAY stays the dock hero', PHONE_CAP.PLAY_W >= 80);
ok('DREAM stays the second hero', PHONE_CAP.DREAM_W >= 76);
ok('LOOK is a kid target, not a dock hero width', PHONE_CAP.LOOK_W >= 76 && PHONE_CAP.LOOK_H >= 76 && PHONE_CAP.LOOK_W < PHONE_CAP.PLAY_W + 8);
ok('LOOK is not a third dock hero slot', PHONE_CAP.LOOK_DOCK == null);
ok('dock span is unchanged by LOOK', dockSpan(false) ===
  PHONE_CAP.DOCK_PAD * 2 + 7 * PHONE_CAP.TOOL_W + PHONE_CAP.CUR_W
  + PHONE_CAP.PLAY_W + PHONE_CAP.DREAM_W + 9 * PHONE_CAP.DOCK_GAP);
ok('a 390 phone still cannot hold the dock', dockFitsPhone(390, false) === false);
ok('chrome still never kisses a side', chromeEdge() === 16 && PHONE_CAP.EDGE === 16);
ok('corners are soft and kid-round', PHONE_CAP.CORNER >= 18 && chromeCorner() === PHONE_CAP.CORNER);

// day/night uses the living sky, not a second clock home
ok('prettyClockHour auto keeps the real hour nearby', Math.abs(prettyClockHour('2026-09-05', 14, 'auto') - 14) < 0.5);
ok('prettyClockHour day is afternoon on the live sky', (function () {
  const h = prettyClockHour('2026-09-05', 2, 'day');
  const sky = skyAt(h);
  return sky.night < 0.2 && !!sky.sun && !sky.moon;
})());
ok('prettyClockHour night is night on the live sky', (function () {
  const h = prettyClockHour('2026-09-05', 14, 'night');
  const sky = skyAt(h);
  return sky.night > 0.8 && !sky.sun && !!sky.moon;
})());
ok('dayHash blush does not invent a new clock', (function () {
  const a = prettyClockHour('2026-09-05', 12, 'auto');
  const b = prettyClockHour('2026-09-06', 12, 'auto');
  return a !== b && Math.abs(a - 12) < 0.5 && Math.abs(b - 12) < 0.5;
})());
ok('peek from noon is night', prettyPeekTime('auto', 12) === 'night');
ok('peek from midnight is day', prettyPeekTime('auto', 2) === 'day');
ok('sleep overnight wakes into day', prettyAfterSleep(true) === 'day');
ok('no sleep leaves the sky on auto', prettyAfterSleep(false) === 'auto');
ok('Sleep hold is still overnight, not a pretty door', runSleepAct(sleepPressAct('hold')).door === 'overnight');

// colour mixes: steal the WARM feel, add soft and crisp. Never a fourth channel.
ok('prettyMixRgb leaves a missing colour alone', prettyMixRgb(null, 'warm') === null);
ok('warm pretty is the same peach mix', (function () {
  const a = [0.4, 0.4, 0.4];
  const w = prettyMixRgb(a, 'warm');
  const old = warmRgb(a, true);
  return w[0] === old[0] && w[1] === old[1] && w[2] === old[2];
})());
ok('soft lifts toward cream', (function () {
  const a = [0.4, 0.4, 0.4];
  const b = prettyMixRgb(a, 'soft');
  return b[0] > a[0] && b[1] > a[1] && b !== a;
})());
ok('crisp is cooler than warm', (function () {
  const a = [0.5, 0.4, 0.3];
  const w = prettyMixRgb(a, 'warm');
  const c = prettyMixRgb(a, 'crisp');
  return c[2] / (c[0] + 0.01) > w[2] / (w[0] + 0.01) && c[0] !== w[0];
})());
ok('the three looks are visibly different', (function () {
  const a = [0.45, 0.45, 0.5];
  const s = prettyMixRgb(a, 'soft').join();
  const w = prettyMixRgb(a, 'warm').join();
  const c = prettyMixRgb(a, 'crisp').join();
  return s !== w && w !== c && s !== c;
})());
ok('pretty mixes stay in 0..1', ['soft', 'warm', 'crisp'].every(function (m) {
  return prettyMixRgb([1, 0, 0], m).every(function (n) { return n >= 0 && n <= 1; });
}));
ok('pretty never invents a fourth channel', prettyMixRgb([1, 1, 1], 'crisp').length === 3);

ok('prettySky keeps sun and moon from skyAt', (function () {
  const day = prettySky(skyAt(14), 'soft');
  const night = prettySky(skyAt(2), 'warm');
  return day.sun && !day.moon && night.moon && !night.sun && day.night < 0.2 && night.night > 0.8;
})());
ok('prettySky tints the top colour', (function () {
  const raw = skyAt(14);
  const warm = prettySky(raw, 'warm');
  return warm.top !== raw.top && /rgb\(/.test(warm.top);
})());
ok('prettySky leaves a missing sky alone', prettySky(null, 'soft') === null);
ok('mixHex still works', mixHex('#000000', '#FFFFFF', 0.5) === 'rgb(128,128,128)');
ok('hexRGB still works', hexRGB('#FFFFFF')[0] === 1);

// chapter line
ok('quiet pretty still has a line', /look/.test(prettyLine({})));
ok('soft is named', /soft/.test(prettyLine({ mode: 'soft' })));
ok('warm is named', /warm/.test(prettyLine({ mode: 'warm' })));
ok('crisp is named', /crisp/.test(prettyLine({ mode: 'crisp' })));
ok('night peek is named', /night/.test(prettyLine({ mode: 'soft', time: 'night' })));
ok('day peek is named', /day/.test(prettyLine({ mode: 'warm', time: 'day' })));
ok('no em dash in the pretty line', prettyLine({ mode: 'warm', time: 'night' }).indexOf('\u2014') === -1);
ok('no lock language', ['LOCKED', 'BUY', 'UNLOCK', 'COIN TO PLAY'].every(function (w) {
  return prettyLine({ mode: 'crisp' }).toUpperCase().indexOf(w) === -1;
}));

const quiet = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0] });
ok('a quiet day does not invent a pretty line', quiet[0].lines.join(' ').indexOf('put on a') === -1);
const looked = chapter({ name: 'OLLIE', stats: { blocks: 4 }, prevStats: {}, quest: questTable()[0], prettyed: true, prettyMode: 'warm', prettyTime: 'night' });
const lookedAll = looked.map(function (p) { return p.lines.join(' '); }).join(' ');
ok('pretty writes the living chapter line', /warm/.test(lookedAll) && /night/.test(lookedAll));
ok('pretty still uses his name', lookedAll.indexOf('Captain Ollie') !== -1);
ok('pretty still has three beats', looked.length === 3);
ok('pretty never empties a page', looked.every(function (p) { return p.lines.every(function (l) { return l.length > 0; }); }));

const t = questTable();
const prettyQ = t.filter(function (q) { return q.id === 'pretty1'; });
ok('pretty1 is appended once', prettyQ.length === 1);
ok('pretty1 maps to prettyToday', prettyQ[0] && prettyQ[0].need === 'prettyToday' && prettyQ[0].n === 1);
ok('pretty1 is kid-clear', /LOOK/.test(prettyQ[0].tell) && /soft|warm|crisp/.test(prettyQ[0].tell));
ok('pretty1 is last, never inserted', t[t.length - 1].id === 'pretty1');
ok('replay1 is still there', t.filter(function (q) { return q.id === 'replay1'; }).length === 1);
ok('sleep1 is still there', t.filter(function (q) { return q.id === 'sleep1'; }).length === 1);
ok('pretty1 is met by one look', questMet(prettyQ[0], { prettyToday: 1 }) && !questMet(prettyQ[0], { prettyToday: 0 }));
ok('houses3 is still first without a dream', t[0].id === 'houses3');
ok('pickQuest still prefers an unmet house', pickQuest({ houses: 0 }, null).id === 'houses3');

const bq = bedtimeQuestion({ keys: ['pretty'], n: 2 });
ok('bedtime can ask about the look', /LOOK|soft|warm|crisp|night/.test(bq.ask + bq.a.join(' ')));
ok('bedtime never sells a lock', (bq.ask + bq.a.join(' ')).toUpperCase().indexOf('BUY') === -1);

// advisor rotation: append only
const day = { blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11 };
const ideaKeys = [];
for (let k = 0; k < 24; k++) {
  const key = nextThing(Object.assign({ tick: k }, day)).key;
  if (k && key === 'tall') break;
  ideaKeys.push(key);
}
ok('pretty hint is appended to the rotating ideas', ideaKeys.indexOf('pretty') === ideaKeys.length - 1, ideaKeys.join());
ok('pretty hint did not steal an older slot', ideaKeys.indexOf('compass') === 5 && ideaKeys.indexOf('seed') === 6 && ideaKeys.indexOf('replay') === ideaKeys.indexOf('chase') + 1);
ok('pretty hint is one short sentence', nextThing(Object.assign({ tick: ideaKeys.indexOf('pretty') }, day)).line.length < 90
  && nextThing(Object.assign({ tick: ideaKeys.indexOf('pretty') }, day)).line.indexOf('\n') === -1);

// share hash: pretty adds nothing. Measure the 1700 gate out loud.
ok('pretty adds no &look= to a bare hash', buildHash('ABC', 0, 'OLLIE', []).indexOf('look') === -1
  && buildHash('ABC', 0, 'OLLIE', []).indexOf('pretty') === -1);
ok('old links still parse', parseHash(buildHash('ABC', 0, 'OLLIE', [])).enc === 'ABC');
ok('dayKey is still the calendar day', /^\d{4}-\d{2}-\d{2}$/.test(dayKey(Date.UTC(2026, 8, 5))) && dayHash('2026-09-05') > 0);

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  prettyMixRgb([0.5, 0.5, 0.5], 'warm');
  prettySky(skyAt(14), 'crisp');
  prettyClockHour('2026-09-05', 14, 'night');
  const after = encode(w);
  ok('a pretty decision hashes the same', buildHash(after, 0, 'OLLIE', []) === buildHash(before, 0, 'OLLIE', []));
  ok('pretty cost in #i= is zero', buildHash(after, 42100, 'OLLIE', ['SIBELLA']).length === buildHash(before, 42100, 'OLLIE', ['SIBELLA']).length);
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
  ok('WORST-CASE LINK WITH PRETTY (no extra field) <= 1700', worst.length <= 1700, 'len=' + worst.length);
  ok('still under LINK_MAX', worst.length <= ISLE.LINK_MAX);
  prettySky(skyAt(2), 'soft');
  ok('full-island encode is unchanged by a pretty mix', encode(w) === before);
  console.log('worst-case pretty link (unchanged hash):', worst.length, 'chars');
})();

// decisions never plant blocks
(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  prettyPressAct('tap', { mode: 'soft' });
  prettyPressAct('hold', { time: 'auto', hour: 14 });
  prettyPressAct('long');
  prettyLine({ mode: 'crisp', time: 'night' });
  ok('door-table decisions leave the grid alone', encode(w) === before && w.count === 1);
  ok('decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
})();

ok('no lock or sell language on the Pretty table', ['soft', 'warm', 'crisp'].every(function (d) {
  return d.indexOf('lock') < 0 && d.indexOf('buy') < 0;
}));
ok('place and encode still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
