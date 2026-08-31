/* THE CABINETS. Which game a cabinet runs is decided by where it stands, the whale's song is seeded and never repeats a note
   twice running, the gull window shrinks but never below a five year old's reach, a crate keeps only what overlaps, and ten
   points is a coin here like everywhere. Run node tests/extract-core.js first. */
const { CABINETS, cabinetGame, coinsForScore, whaleSeq, bonkUpTime, stackLand, chapter, nextThing } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + ' ' + (extra || '')); } }

ok('three cabinets: the whale, the gull, the crates', CABINETS.join('|') === 'WHALE SONG|SEAGULL BONK|CARGO STACK');
ok('a cabinet always runs the same game', cabinetGame(70, 70) === cabinetGame(70, 70));
const seen = {}; for (let x = 60; x < 70; x++) for (let y = 60; y < 70; y++) seen[cabinetGame(x, y)] = true;
ok('ten by ten of ground offers all three games', seen[0] && seen[1] && seen[2]);
ok('next door is usually a different game', cabinetGame(70, 70) !== cabinetGame(71, 70));

ok('ten points is a coin: 0, 9, 10, 95', coinsForScore(0) === 0 && coinsForScore(9) === 0 && coinsForScore(10) === 1 && coinsForScore(95) === 9);
ok('a broken score pays nothing', coinsForScore(-20) === 0 && coinsForScore(undefined) === 0);

const s1 = whaleSeq(7, 6), s2 = whaleSeq(7, 6), s3 = whaleSeq(8, 6);
ok('the song is the same for the same seed', JSON.stringify(s1) === JSON.stringify(s2));
ok('a different seed sings a different song', JSON.stringify(s1) !== JSON.stringify(s3));
ok('six notes, all on the three shells', s1.length === 6 && s1.every(v => v >= 0 && v <= 2));
let rep = false; for (let i = 1; i < s1.length; i++) if (s1[i] === s1[i - 1]) rep = true;
ok('never the same note twice running', !rep, s1.join(','));
ok('the song can be any length', whaleSeq(3, 2).length === 2 && whaleSeq(3, 9).length === 9);

ok('the gull starts up for just over a second', Math.abs(bonkUpTime(0) - 1.05) < 1e-9);
ok('the window shrinks as the round goes on', bonkUpTime(20) < bonkUpTime(5));
ok('but never below what a five year old can hit', bonkUpTime(120) === 0.55 && bonkUpTime(9999) === 0.55);

const base = { x: 0.5, w: 0.4 };
const dead = stackLand(base, 0.5, 0.4);
ok('a straight drop is perfect and keeps the width', dead && dead.perfect && dead.w === 0.4 && dead.x === 0.5);
const near = stackLand(base, 0.55, 0.4);
ok('nearly straight still counts as perfect', near && near.perfect);
const off = stackLand(base, 0.62, 0.4);
ok('an off drop keeps only the overlap', off && !off.perfect && Math.abs(off.w - 0.28) < 1e-9 && Math.abs(off.x - 0.56) < 1e-9, JSON.stringify(off));
ok('a clean miss is a splash', stackLand(base, 1.0, 0.4) === null);
ok('a sliver of overlap is still a splash', stackLand(base, 0.92, 0.4) === null);
ok('the stack narrows as drops go wide', (function () { let c = { x: 0.5, w: 0.4 }; for (let i = 0; i < 3; i++) c = stackLand(c, c.x + 0.1, c.w); return c && c.w < 0.4 && c.w > 0; })());

const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, cabinet: { 'WHALE SONG': 40, 'CARGO STACK': 85 } });
const p1 = pages[0].lines.join(' ');
ok('the chapter says which cabinets were on and the best scores', /WHALE SONG best 40/.test(p1) && /CARGO STACK best 85/.test(p1), p1);
ok('and repeats the law: ten points is a coin', /Ten points is a coin/.test(p1));
ok('a day with no arcade says nothing about it', !/arcade was switched on/.test(chapter({ name: 'OLLIE', stats: {}, prevStats: {} })[0].lines.join(' ')));
ok('the advisor now says to tap the cabinet', (function () { for (let k = 0; k < 20; k++) { const t = nextThing({ blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11, tick: k }); if (t.key === 'arcade') return /tap it/i.test(t.line); } return false; })());

console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
