/* THE PITCH. A sixth blueprint lays a soccer pitch. One ball sits on the centre spot,
   derived from the pitch so it travels in the link for free. Kick it walking or nudge it
   driving, and a ball crossing a goal mouth scores. The suite is the spec. */
const C = require('./isle-core.js');
let n = 0, f = [];
function ck(name, ok, got) { n++; if (!ok) f.push(name + ' :: ' + JSON.stringify(got)); }

const bp = (C.BLUEPRINTS || []).filter(b => b.id === 'pitch')[0];
ck('the pitch blueprint exists', !!bp, (C.BLUEPRINTS||[]).map(b=>b.id));

if (bp) {
  ck('it is named for a child', bp.name.indexOf('PITCH') >= 0 || bp.name.indexOf('SOCCER') >= 0, bp.name);
  const sz = C.bpSize(bp);
  ck('it fits a small island', sz.w <= 12 && sz.h <= 10, sz);
  ck('it is one block high everywhere', bp.cols.every(c => c.ids.length === 1), bp.cols.map(c=>c.ids.length));
  ck('it is affordable from play', C.bpPrice(C.bpBlocks(bp)) <= 8, C.bpPrice(C.bpBlocks(bp)));
  ck('the pitch has two goals', typeof C.pitchGoals === 'function' && C.pitchGoals(bp).length === 2, 0);
}

const HAS = typeof C.pitchOf === 'function' && typeof C.ballStart === 'function' && typeof C.goalScored === 'function' && typeof C.stepBall === 'function';
ck('pitch functions exported', HAS, Object.keys(C).length);
ck('walk kick uses the same pitch, not a second one', typeof C.kickTowardGoal === 'function' && typeof C.ballNudge === 'function' && typeof C.walkKick === 'function', 0);
ck('walk reach is huge for a child', C.BALL_WALK_REACH >= 1.3 && C.BALL_WALK_REACH <= 1.8, C.BALL_WALK_REACH);
ck('car reach is unchanged', C.BALL_CAR_REACH === 1.1, C.BALL_CAR_REACH);

if (HAS && bp) {
  const w = C.makeWorld();
  ck('no pitch, no ball', C.pitchOf(w) === null, 0);

  /* lay the pitch by hand, exactly as a child or the crew would */
  const OX = 30, OY = 30;
  bp.cols.forEach(c => C.place(w, OX + c.dx, OY + c.dy, c.ids[0]));
  const p = C.pitchOf(w);
  ck('a laid pitch is found', !!p, p);
  ck('the pitch knows where it is', p && p.x === OX && p.y === OY, p);
  const b0 = C.ballStart(p);
  ck('the ball starts on the centre spot', b0 && b0.x > OX && b0.x < OX + C.bpSize(bp).w, b0);
  ck('the ball starts still', b0.vx === 0 && b0.vy === 0, b0);
  ck('the ball is derived, not stored', JSON.stringify(C.ballStart(C.pitchOf(w))) === JSON.stringify(b0), 0);

  /* physics: a kick rolls and friction stops it, so it never runs away from a six year old */
  let b = C.ballStart(p); b.vx = 6; b.vy = 0;
  let moved = 0;
  for (let i = 0; i < 400 && (Math.abs(b.vx) > 0.01 || Math.abs(b.vy) > 0.01); i++) { const before = b.x; b = C.stepBall(w, b, 1/60); if (b.x !== before) moved++; }
  ck('a kick makes it roll', moved > 5, moved);
  ck('friction brings it to rest', Math.abs(b.vx) <= 0.01 && Math.abs(b.vy) <= 0.01, b);
  ck('it never leaves the island', b.x >= 0 && b.y >= 0 && b.x < 128 && b.y < 128, b);

  /* a wall stops it, the same blocks the car already hits */
  C.place(w, OX + 2, OY + 2, 4); C.place(w, OX + 2, OY + 2, 4);
  let bw = { x: OX + 0.5, y: OY + 2.5, vx: 9, vy: 0 };
  for (let i = 0; i < 200; i++) bw = C.stepBall(w, bw, 1/60);
  ck('a wall stops the ball', bw.x < OX + 2.6, bw);

  /* goals */
  const gs = C.pitchGoals(bp);
  ck('the two goals face each other', gs[0].y !== gs[1].y || gs[0].x !== gs[1].x, gs);
  const inGoal = { x: OX + gs[0].dx + 0.5, y: OY + gs[0].dy + 0.5 };
  ck('a ball in the mouth scores', C.goalScored(p, inGoal) !== null, 0);
  ck('a ball in the middle does not', C.goalScored(p, { x: b0.x, y: b0.y }) === null, 0);
  ck('a goal names which end', ['north','south','east','west'].indexOf(String(C.goalScored(p, inGoal))) >= 0 || C.goalScored(p, inGoal) === 1 || C.goalScored(p, inGoal) === 0, C.goalScored(p, inGoal));

  /* walk / 3D: same ball, same goals. A tap aims at the far mouth. A foot shove is the car nudge. */
  const aim = C.kickTowardGoal(p, b0);
  ck('a tap from the spot aims at a goal', !!aim && typeof aim.vx === 'number' && typeof aim.vy === 'number', aim);
  ck('the tap kick is hard enough to score', aim && Math.hypot(aim.vx, aim.vy) >= 6, aim);
  let aimed = { x: b0.x, y: b0.y, vx: aim.vx, vy: aim.vy };
  let scored = null;
  for (let i = 0; i < 240 && !scored; i++) { aimed = C.stepBall(w, aimed, 1/60); scored = C.goalScored(p, aimed); }
  ck('that same kick still scores', scored === 'west' || scored === 'east', scored);
  ck('west-half aims east', C.kickTowardGoal(p, { x: p.x + 1.5, y: b0.y }).vx > 0, 0);
  ck('east-half aims west', C.kickTowardGoal(p, { x: p.x + C.PITCH_W - 1.5, y: b0.y }).vx < 0, 0);
  ck('no pitch, no aim', C.kickTowardGoal(null, b0) === null, 0);

  const still = C.walkKick({ x: b0.x - 0.8, y: b0.y, z: 0 }, b0, { fwd: 0, side: 0 });
  ck('standing still does not kick', still === null, still);
  const far = C.walkKick({ x: b0.x - 3, y: b0.y, z: 0 }, b0, { fwd: 1, side: 0 });
  ck('too far does not kick', far === null, far);
  const foot = C.walkKick({ x: b0.x - 0.8, y: b0.y, z: 0 }, b0, { fwd: 1, side: 0 });
  ck('walking into the ball shoves it away', foot && foot.vx > 2, foot);
  ck('the shove is along the same pitch plane', foot && Math.abs(foot.vy) < 1, foot);
  const carN = C.ballNudge({ x: b0.x - 0.6, y: b0.y }, b0, C.BALL_CAR_REACH, 4);
  ck('the car nudge is the same helper', carN && carN.vx > 0, carN);
  ck('a miss is not a second pitch', C.ballNudge({ x: b0.x - 3, y: b0.y }, b0, C.BALL_CAR_REACH, 4) === null, 0);
}

/* it reaches the rest of the game through one real stat */
const qt = C.questTable(-1).filter(q => q.id === 'goal1');
ck('a soccer quest exists', qt.length === 1, qt.length);
ck('the quest reads on a real stat', qt.length && qt[0].need === 'goalsToday', qt[0]);
ck('the quest is gentle', qt.length && qt[0].n <= 3 && !/fail|must|late/i.test(qt[0].tell), qt[0]);
const vg = (C.VOYAGE_GOALS || []).filter(g => g.need === 'goalsToday');
ck('a voyage goal exists', vg.length === 1, vg.length);
ck('the voyage goal is reachable', vg.length && vg[0].n <= 3, vg[0]);

const base = { name:'OLLIE', title:'CAPTAIN', stats:{blocks:5}, prevStats:{}, learned:[], goalsToday:0 };
const flat = ps => ps.map(p => p.lines.join(' ')).join(' ');
ck('no goals, no boasting', flat(C.chapter(base)).toLowerCase().indexOf('goal') < 0, 0);
const c2 = flat(C.chapter(Object.assign({}, base, { goalsToday: 2 })));
ck('two goals are told', c2.toLowerCase().indexOf('goal') >= 0 && c2.indexOf('2') >= 0, c2.slice(0,140));

console.log('CHECKS ' + n + '   FAILED ' + f.length);
f.forEach(x => console.log('  FAILED: ' + x));
process.exit(f.length ? 1 : 0);
