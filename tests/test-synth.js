// SYNTH SFX SUITE. Seven kid-safe voices, WebAudio only, no files.
// place, erase, dream, sleep, look, goal, toast. Mute silences every one.
// Nothing new rides in #i=. PLAY and DREAM stay the dock heroes.
const { ISLE, PROFILE, makeWorld, place, encode, decode, buildHash, parseHash,
  chapter, questTable, pickQuest, questMet,
  PHONE_CAP, dockSpan, dockFitsPhone,
  SFX_IDS, SFX, sfxOf, sfxMuted, sfxSafe, sfxPlayPlan, sfxVoice
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('SFX_IDS is the seven-voice suite', SFX_IDS.join() === 'place,erase,dream,sleep,look,goal,toast');
ok('SFX holds one voice per id', SFX_IDS.every(function (id) { return SFX[id] && SFX[id].id === id; }));
ok('sfxOf reads a live voice', typeof sfxOf === 'function' && sfxOf('place').id === 'place');
ok('sfxMuted is the mute door', typeof sfxMuted === 'function');
ok('sfxSafe is the kid-safe gate', typeof sfxSafe === 'function');
ok('sfxPlayPlan is the play table', typeof sfxPlayPlan === 'function');
ok('sfxVoice can pitch a place by height', typeof sfxVoice === 'function');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('no eighth suite voice', Object.keys(SFX).length === 7 && SFX_IDS.length === 7);

ok('empty name is unknown', sfxOf('') === null && sfxOf(null) === null);
ok('unknown name is unknown', sfxOf('locked') === null && sfxOf('buy') === null);
ok('every live name stays itself', SFX_IDS.every(function (id) { return sfxOf(id).id === id; }));

ok('mute off is audible', sfxMuted(false) === false && sfxMuted(0) === false && sfxMuted(null) === false);
ok('mute on is silent', sfxMuted(true) === true && sfxMuted(1) === true && sfxMuted('on') === true);

ok('every voice is kid-safe', SFX_IDS.every(function (id) { return sfxSafe(sfxOf(id)); }));
ok('a missing voice is not safe', sfxSafe(null) === false && sfxSafe({}) === false);
ok('a piercing voice is refused', sfxSafe({ id: 'x', wave: 'sine', hz: [4000], dur: 0.1, vol: 0.1 }) === false);
ok('a rumble is refused', sfxSafe({ id: 'x', wave: 'sine', hz: [40], dur: 0.1, vol: 0.1 }) === false);
ok('a long drone is refused', sfxSafe({ id: 'x', wave: 'sine', hz: [440], dur: 2.4, vol: 0.1 }) === false);
ok('a shout is refused', sfxSafe({ id: 'x', wave: 'sine', hz: [440], dur: 0.1, vol: 0.9 }) === false);
ok('a harsh square is refused', sfxSafe({ id: 'x', wave: 'square', hz: [440], dur: 0.1, vol: 0.1 }) === false);
ok('a five-note song is refused', sfxSafe({ id: 'x', wave: 'sine', hz: [261, 293, 329, 349, 392], dur: 0.1, vol: 0.1 }) === false);
ok('only sine or triangle in the suite', SFX_IDS.every(function (id) {
  const w = sfxOf(id).wave;
  return w === 'sine' || w === 'triangle';
}));
ok('suite volumes stay gentle', SFX_IDS.every(function (id) { return sfxOf(id).vol <= 0.24; }));
ok('suite notes stay short', SFX_IDS.every(function (id) { return sfxOf(id).dur <= 0.28 && sfxOf(id).hz.length <= 4; }));
ok('suite pitches stay in the kid band', SFX_IDS.every(function (id) {
  return sfxOf(id).hz.every(function (h) { return h >= 140 && h <= 1200; });
}));

const fingerprints = SFX_IDS.map(function (id) {
  const v = sfxOf(id);
  return v.wave + ':' + v.hz.join('-') + ':' + v.dur;
});
ok('every voice sounds different', new Set(fingerprints).size === 7, fingerprints.join('|'));
ok('place is a landing thunk', sfxOf('place').wave === 'triangle' && sfxOf('place').hz[0] < 280);
ok('erase falls away', sfxOf('erase').slide === true && sfxOf('erase').hz[0] > sfxOf('erase').hz[sfxOf('erase').hz.length - 1]);
ok('dream climbs', sfxOf('dream').hz[0] < sfxOf('dream').hz[sfxOf('dream').hz.length - 1] && sfxOf('dream').hz.length >= 3);
ok('sleep falls and stays soft', sfxOf('sleep').hz[0] > sfxOf('sleep').hz[sfxOf('sleep').hz.length - 1] && sfxOf('sleep').vol <= 0.16);
ok('look is brighter than place', sfxOf('look').hz[0] > sfxOf('place').hz[0]);
ok('goal is a three-note cheer', sfxOf('goal').hz.length >= 3 && sfxOf('goal').hz[0] < sfxOf('goal').hz[2]);
ok('toast is a short ping', sfxOf('toast').hz.length === 1 && sfxOf('toast').dur <= 0.12);

(function () {
  const a = sfxPlayPlan('place', false);
  ok('place plan is audible', a.ok && a.silent === false && a.id === 'place' && a.voice.id === 'place');
})();
(function () {
  const a = sfxPlayPlan('erase', true);
  ok('mute silences erase', a.ok && a.silent === true && a.id === 'erase' && a.why === 'mute' && !a.voice);
})();
ok('mute silences the whole suite', SFX_IDS.every(function (id) {
  const a = sfxPlayPlan(id, true);
  return a.ok && a.silent && a.why === 'mute' && a.id === id;
}));
ok('unmute leaves the whole suite audible', SFX_IDS.every(function (id) {
  const a = sfxPlayPlan(id, false);
  return a.ok && a.silent === false && a.voice && sfxSafe(a.voice);
}));
ok('unknown plan stays silent', sfxPlayPlan('locked', false).ok === false
  && sfxPlayPlan('locked', false).silent === true
  && sfxPlayPlan('locked', false).why === 'unknown');
ok('muted unknown is still unknown', sfxPlayPlan('buy', true).why === 'unknown');

(function () {
  const low = sfxVoice('place', { z: 0 });
  const high = sfxVoice('place', { z: 6 });
  ok('a taller block lands higher', high.hz[0] > low.hz[0] && high.id === 'place');
  ok('a tall place stays kid-safe', sfxSafe(high) && sfxSafe(low));
  ok('erase ignores height', sfxVoice('erase', { z: 6 }).hz.join() === sfxOf('erase').hz.join());
})();
ok('a muted tall place is still silent', sfxPlayPlan('place', true, { z: 7 }).silent === true);

ok('no lock language on the suite', SFX_IDS.every(function (id) {
  return id.indexOf('lock') < 0 && id.indexOf('buy') < 0;
}));
ok('no em dash in voice ids', SFX_IDS.every(function (id) { return id.indexOf('\u2014') === -1; }));

// PLAY and DREAM stay the heroes. LOOK stays sand-side. Mute is not a dock hero.
ok('PLAY stays the dock hero', PHONE_CAP.PLAY_W >= 80);
ok('DREAM stays the second hero', PHONE_CAP.DREAM_W >= 76);
ok('LOOK is not a third dock hero', PHONE_CAP.LOOK_DOCK == null);
ok('mute is not a dock hero width', PHONE_CAP.MUTE_W == null && PHONE_CAP.SFX_W == null);
ok('dock span is unchanged by the suite', dockSpan(false) ===
  PHONE_CAP.DOCK_PAD * 2 + 7 * PHONE_CAP.TOOL_W + PHONE_CAP.CUR_W
  + PHONE_CAP.PLAY_W + PHONE_CAP.DREAM_W + 9 * PHONE_CAP.DOCK_GAP);
ok('a 390 phone still cannot hold the dock', dockFitsPhone(390, false) === false);

// share hash: synth adds nothing. Measure the 1700 gate out loud.
ok('synth adds no &sfx= to a bare hash', buildHash('ABC', 0, 'OLLIE', []).indexOf('sfx') === -1
  && buildHash('ABC', 0, 'OLLIE', []).indexOf('mute') === -1
  && buildHash('ABC', 0, 'OLLIE', []).indexOf('sound') === -1);
ok('old links still parse', parseHash(buildHash('ABC', 0, 'OLLIE', [])).enc === 'ABC');

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  sfxPlayPlan('place', false);
  sfxPlayPlan('goal', true);
  sfxVoice('place', { z: 3 });
  const after = encode(w);
  ok('a synth decision hashes the same', buildHash(after, 0, 'OLLIE', []) === buildHash(before, 0, 'OLLIE', []));
  ok('synth cost in #i= is zero', buildHash(after, 42100, 'OLLIE', ['SIBELLA']).length === buildHash(before, 42100, 'OLLIE', ['SIBELLA']).length);
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
  ok('WORST-CASE LINK WITH SYNTH (no extra field) <= 1700', worst.length <= 1700, 'len=' + worst.length);
  ok('still under LINK_MAX', worst.length <= ISLE.LINK_MAX);
  sfxPlayPlan('toast', false);
  ok('full-island encode is unchanged by a voice plan', encode(w) === before);
  console.log('worst-case synth link (unchanged hash):', worst.length, 'chars');
})();

(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  SFX_IDS.forEach(function (id) { sfxPlayPlan(id, false); sfxPlayPlan(id, true); });
  ok('door-table decisions leave the grid alone', encode(w) === before && w.count === 1);
  ok('decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
})();

const t = questTable();
ok('pretty1 is still last, never inserted', t[t.length - 1].id === 'pretty1');
ok('replay1 is still there', t.filter(function (q) { return q.id === 'replay1'; }).length === 1);
ok('sleep1 is still there', t.filter(function (q) { return q.id === 'sleep1'; }).length === 1);
ok('no synth quest was invented', t.filter(function (q) { return q.id === 'synth1' || q.id === 'sfx1'; }).length === 0);
ok('houses3 is still first without a dream', t[0].id === 'houses3');
ok('pickQuest still prefers an unmet house', pickQuest({ houses: 0 }, null).id === 'houses3');
ok('pretty1 is still met by one look', questMet(t.filter(function (q) { return q.id === 'pretty1'; })[0], { prettyToday: 1 }));

const quiet = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0] });
ok('a quiet day does not invent a synth line', quiet[0].lines.join(' ').toLowerCase().indexOf('synth') === -1);

ok('place and encode still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
