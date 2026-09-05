// PLAY MULTI-BUTTON. Tap / hold / long-press are three doors into games that already exist.
// Tap continues the current game (kick the pitch ball, or keep a cabinet going).
// Hold cycles Soccer → Whale → Bonk → Stack. Long-press opens the GAMES sheet.
// No fourth engine. No lock. No sell. Nothing rides in the share link.
const { ISLE, makeWorld, place, encode, decode, CABINETS, cabinetGame,
  pitchOf, ballStart, goalScored, stepBall, kickTowardGoal, PITCH_W, PITCH_H,
  BLUEPRINTS, bpSize, PROFILE,
  PLAY_HOLD_MS, PLAY_LONG_MS, PLAY_IDS, PLAY_NAMES,
  playPressKind, playPressAct, playLastOf, playNextOf, playCabinetOf,
  rememberPlay, runPlayAct, playKickVel, dreamPressKind, DREAM_HOLD_MS, DREAM_LONG_MS
} = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

ok('playPressKind is the gesture clock', typeof playPressKind === 'function');
ok('playPressAct is the door table', typeof playPressAct === 'function');
ok('runPlayAct is the resolver', typeof runPlayAct === 'function');
ok('playKickVel reuses kickTowardGoal', typeof playKickVel === 'function' && typeof kickTowardGoal === 'function');
ok('four play ids, no fifth game', PLAY_IDS.join() === 'soccer,whale,bonk,stack');
ok('play names reuse the live titles', PLAY_NAMES.soccer === 'SOCCER'
  && PLAY_NAMES.whale === CABINETS[0] && PLAY_NAMES.bonk === CABINETS[1] && PLAY_NAMES.stack === CABINETS[2]);
ok('cabinets stay the three live ones', CABINETS.join('|') === 'WHALE SONG|SEAGULL BONK|CARGO STACK');
ok('LINK_MAX stays 1900', ISLE.LINK_MAX === 1900);
ok('MAX_BLOCKS stays 1000', ISLE.MAX_BLOCKS === 1000);
ok('PROFILE.VER stays 1', PROFILE.VER === 1);
ok('hold threshold matches the dream clock', PLAY_HOLD_MS === DREAM_HOLD_MS && PLAY_HOLD_MS === 280);
ok('long-press matches the dream clock', PLAY_LONG_MS === DREAM_LONG_MS && PLAY_LONG_MS === 900);
ok('long-press is after hold', PLAY_LONG_MS > PLAY_HOLD_MS);

// the clock: three kinds, never a fourth, same edges as Dream
ok('0 ms is a tap', playPressKind(0) === 'tap');
ok('100 ms is a tap', playPressKind(100) === 'tap');
ok('just under hold is a tap', playPressKind(PLAY_HOLD_MS - 1) === 'tap');
ok('hold starts at the threshold', playPressKind(PLAY_HOLD_MS) === 'hold');
ok('mid hold stays hold', playPressKind(500) === 'hold');
ok('just under long is hold', playPressKind(PLAY_LONG_MS - 1) === 'hold');
ok('long starts at the threshold', playPressKind(PLAY_LONG_MS) === 'long');
ok('two seconds is still long, never a fourth kind', playPressKind(2000) === 'long');
ok('negative and NaN fall back to tap', playPressKind(-3) === 'tap' && playPressKind(NaN) === 'tap');
ok('Play and Dream share one clock', playPressKind(0) === dreamPressKind(0)
  && playPressKind(280) === dreamPressKind(280)
  && playPressKind(900) === dreamPressKind(900));
ok('only three kinds exist', ['tap', 'hold', 'long'].indexOf(playPressKind(0)) !== -1
  && ['tap', 'hold', 'long'].indexOf(playPressKind(400)) !== -1
  && ['tap', 'hold', 'long'].indexOf(playPressKind(1200)) !== -1);

// last game: stored id, else soccer. Never invent a fifth.
ok('remembered whale wins', playLastOf('whale') === 'whale');
ok('empty last falls to soccer', playLastOf('') === 'soccer' && playLastOf(null) === 'soccer');
ok('unknown last falls to soccer', playLastOf('chess') === 'soccer' && playLastOf(99) === 'soccer');
ok('rememberPlay keeps a live id', rememberPlay('soccer', 'bonk') === 'bonk');
ok('rememberPlay refuses a made-up game', rememberPlay('whale', 'locked-soccer') === 'soccer');
ok('rememberPlay does not invent PROFILE.VER', PROFILE.VER === 1);

ok('soccer cycles to whale', playNextOf('soccer') === 'whale');
ok('whale cycles to bonk', playNextOf('whale') === 'bonk');
ok('bonk cycles to stack', playNextOf('bonk') === 'stack');
ok('stack cycles back to soccer', playNextOf('stack') === 'soccer');
ok('bad current still cycles from soccer', playNextOf('') === 'whale');
ok('a full lap is four steps', (function () {
  let g = 'soccer';
  const seen = [g];
  for (let i = 0; i < 4; i++) { g = playNextOf(g); seen.push(g); }
  return seen.join() === 'soccer,whale,bonk,stack,soccer';
})());

ok('soccer has no cabinet', playCabinetOf('soccer') === null);
ok('whale is cabinet 0', playCabinetOf('whale') === 0 && cabinetGame(0, 0) === 0);
ok('bonk is cabinet 1', playCabinetOf('bonk') === 1 && cabinetGame(1, 0) === 1);
ok('stack is cabinet 2', playCabinetOf('stack') === 2 && cabinetGame(2, 0) === 2);
ok('openCabinet(g,0) still opens game g', cabinetGame(0, 0) === 0 && cabinetGame(1, 0) === 1 && cabinetGame(2, 0) === 2);

// TAP: continue current. Soccer with a ball kicks through kickTowardGoal. Cabinets reuse openCabinet.
(function () {
  const act = playPressAct('tap', { last: 'soccer' });
  ok('tap soccer names the soccer door', act.door === 'soccer' && act.kind === 'tap' && act.game === 'soccer');
  const kick = runPlayAct(act, { hasPitch: true, hasBall: true });
  ok('tap soccer with a ball is a kick', kick.ok && kick.door === 'kick' && kick.remember === 'soccer');
  const show = runPlayAct(act, { hasPitch: true, hasBall: false });
  ok('tap soccer with a pitch and no ball centres it', show.ok && show.door === 'soccer');
  const lay = runPlayAct(act, { hasPitch: false, hasBall: false });
  ok('tap soccer with no pitch lays the plan', lay.ok && lay.door === 'layPitch' && lay.remember === 'soccer');
})();

(function () {
  const act = playPressAct('tap', { last: 'whale' });
  ok('tap whale names the cabinet door', act.door === 'cabinet' && act.cabinet === 0 && act.game === 'whale');
  const open = runPlayAct(act, { cabinetOpen: false });
  ok('tap whale opens the whale cabinet', open.ok && open.door === 'cabinet' && open.cabinet === 0);
  const keep = runPlayAct(act, { cabinetOpen: true, cabinetGame: 0, cabinetOver: false });
  ok('tap whale while singing continues', keep.ok && keep.door === 'continue' && keep.remember === 'whale');
  const again = runPlayAct(act, { cabinetOpen: true, cabinetGame: 0, cabinetOver: true });
  ok('tap whale when the song ended replays', again.ok && again.door === 'replay');
  const other = runPlayAct(act, { cabinetOpen: true, cabinetGame: 2, cabinetOver: false });
  ok('tap whale while stacking opens whale', other.ok && other.door === 'cabinet' && other.cabinet === 0);
})();

['bonk', 'stack'].forEach(function (id, i) {
  const act = playPressAct('tap', { last: id });
  ok('tap ' + id + ' names cabinet ' + (i + 1), act.door === 'cabinet' && act.cabinet === i + 1);
  const r = runPlayAct(act, {});
  ok('tap ' + id + ' opens that cabinet', r.ok && r.door === 'cabinet' && r.cabinet === i + 1 && r.remember === id);
});

(function () {
  const act = playPressAct('tap', { last: '' });
  ok('tap with nothing continues soccer', act.door === 'soccer' && act.game === 'soccer');
})();

// HOLD: switch to the next live game. Does not kick. Does not open the sheet.
(function () {
  const act = playPressAct('hold', { last: 'soccer' });
  ok('hold soccer switches toward whale', act.door === 'switch' && act.from === 'soccer' && act.game === 'whale' && act.cabinet === 0);
  const r = runPlayAct(act, {});
  ok('hold soccer opens whale', r.ok && r.door === 'cabinet' && r.cabinet === 0 && r.remember === 'whale' && r.kind === 'hold');
})();

(function () {
  const act = playPressAct('hold', { last: 'stack' });
  ok('hold stack switches toward soccer', act.door === 'switch' && act.game === 'soccer' && act.cabinet === null);
  const withPitch = runPlayAct(act, { hasPitch: true, hasBall: true });
  ok('hold onto soccer with a ball centres, never kicks', withPitch.ok && withPitch.door === 'soccer' && withPitch.remember === 'soccer');
  const noPitch = runPlayAct(act, { hasPitch: false });
  ok('hold onto soccer with no pitch lays the plan', noPitch.ok && noPitch.door === 'layPitch');
})();

(function () {
  let last = 'soccer';
  const doors = [];
  for (let i = 0; i < 4; i++) {
    const act = playPressAct('hold', { last: last });
    const r = runPlayAct(act, { hasPitch: true });
    doors.push(r.remember);
    last = r.remember;
  }
  ok('four holds walk Soccer Whale Bonk Stack', doors.join() === 'whale,bonk,stack,soccer', doors.join());
})();

// LONG-PRESS: the GAMES sheet. Even if a last game exists.
(function () {
  const act = playPressAct('long', { last: 'whale' });
  ok('long-press opens the games sheet even if a last game exists', act.door === 'games' && act.kind === 'long');
  const r = runPlayAct(act, { last: 'whale', hasPitch: true, hasBall: true, cabinetOpen: true, cabinetGame: 0 });
  ok('long-press does not kick or switch', r.ok && r.door === 'games' && r.kind === 'long');
})();

// the kick door is the live walk/3D aim, not a second pitch
(function () {
  const bp = (BLUEPRINTS || []).filter(function (b) { return b.id === 'pitch'; })[0];
  ok('the pitch blueprint is still the only pitch', !!bp);
  const w = makeWorld();
  const OX = 30, OY = 30;
  bp.cols.forEach(function (c) { place(w, OX + c.dx, OY + c.dy, c.ids[0]); });
  const p = pitchOf(w);
  const b0 = ballStart(p);
  const before = encode(w);
  const aim = playKickVel(p, b0);
  const same = kickTowardGoal(p, b0);
  ok('playKickVel is kickTowardGoal', !!aim && aim.vx === same.vx && aim.vy === same.vy);
  ok('the Play kick is hard enough to score', aim && Math.hypot(aim.vx, aim.vy) >= 6, aim);
  let aimed = { x: b0.x, y: b0.y, vx: aim.vx, vy: aim.vy };
  let scored = null;
  for (let i = 0; i < 240 && !scored; i++) { aimed = stepBall(w, aimed, 1 / 60); scored = goalScored(p, aimed); }
  ok('a Play kick still scores on the same pitch', scored === 'west' || scored === 'east', scored);
  ok('Play never writes the world', encode(w) === before);
  ok('Play never writes the share link', encode(w).length <= ISLE.LINK_MAX);
  const w2 = decode(before);
  ok('the pitch still roundtrips after a Play kick decision', !!w2 && encode(w2) === before);
  ok('no pitch, no Play kick', playKickVel(null, b0) === null);
})();

// runPlayAct is a decision. It must not plant blocks or grow the link.
(function () {
  const w = makeWorld();
  place(w, 40, 40, 3);
  const before = encode(w);
  runPlayAct(playPressAct('tap', { last: 'soccer' }), { hasPitch: false });
  runPlayAct(playPressAct('hold', { last: 'soccer' }), {});
  runPlayAct(playPressAct('long'), {});
  ok('decisions leave the grid alone', encode(w) === before && w.count === 1);
  ok('decisions stay under LINK_MAX', encode(w).length <= ISLE.LINK_MAX);
})();

ok('no lock or sell language on the Play table', ['soccer', 'whale', 'bonk', 'stack'].every(function (id) {
  const n = PLAY_NAMES[id].toUpperCase();
  return n.indexOf('LOCK') < 0 && n.indexOf('BUY') < 0 && n.indexOf('COIN') < 0 && n.indexOf('SOON') < 0;
}));
ok('no fourth door on any path', (function () {
  const doors = [
    playPressAct('tap', { last: 'soccer' }).door,
    playPressAct('tap', { last: 'whale' }).door,
    playPressAct('hold', { last: 'soccer' }).door,
    playPressAct('long').door
  ];
  return doors.join() === 'soccer,cabinet,switch,games';
})());
ok('resolved doors are only the live hooks', (function () {
  const allow = { kick: 1, soccer: 1, layPitch: 1, cabinet: 1, continue: 1, replay: 1, games: 1 };
  const rows = [
    runPlayAct(playPressAct('tap', { last: 'soccer' }), { hasPitch: true, hasBall: true }),
    runPlayAct(playPressAct('tap', { last: 'soccer' }), { hasPitch: false }),
    runPlayAct(playPressAct('tap', { last: 'stack' }), {}),
    runPlayAct(playPressAct('hold', { last: 'bonk' }), { hasPitch: true }),
    runPlayAct(playPressAct('long'), {})
  ];
  return rows.every(function (r) { return r.ok && allow[r.door]; });
})());
ok('place and encode still exist', typeof place === 'function' && typeof encode === 'function' && typeof decode === 'function');
ok('pitch size is unchanged', PITCH_W === 9 && PITCH_H === 6 && bpSize(BLUEPRINTS.filter(function (b) { return b.id === 'pitch'; })[0]).w === 9);

console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
