/* GROWING THINGS and THE MORNING BOAT. Seeds sprout after a day and become trees after three; the stage travels in the
   link; the boat is decided by the clock and the date. Run node tests/extract-core.js first. */
const { ISLE, makeWorld, place, erase, undo, encode, decode, idx, topZ, isPlant, plantStage, grow, seedSpot, VISITORS, boatAt, boatGift, boatLine,
  worldStats, questTable, pickQuest, questMet, chapter, bedtimeQuestion, nextThing, dayHash } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + ' ' + (extra || '')); } }
ISLE.ALL_LAND = true;

ok('SEED, SPROUT, TREE are ids 12, 13, 14', ISLE.TYPES[12].name === 'SEED' && ISLE.TYPES[13].name === 'SPROUT' && ISLE.TYPES[14].name === 'TREE');
ok('one id is still free for the future', ISLE.TYPES.length === 15);
ok('isPlant knows the three and nothing else', isPlant(12) && isPlant(13) && isPlant(14) && !isPlant(8) && !isPlant(11) && !isPlant(15));
ok('stage by age: 0 seed, 1 and 2 sprout, 3 plus tree, never backwards', plantStage(0) === 12 && plantStage(1) === 13 && plantStage(2) === 13 && plantStage(3) === 14 && plantStage(40) === 14 && plantStage(-2) === 12);

// planting rules
const w = makeWorld();
ok('a seed goes on bare ground', place(w, 10, 10, 12).ok && w.cols[idx(10, 10, 0)] === 12);
place(w, 12, 12, 2);
ok('a seed on top of a block is refused: soil', place(w, 12, 12, 12).why === 'soil');
ok('a sprout is never placed by hand', place(w, 14, 14, 13).why === 'grow');
ok('a tree is never placed by hand', place(w, 14, 14, 14).why === 'grow');
ok('nothing is built on a growing thing', place(w, 10, 10, 3).why === 'plant');
ok('a seed can be erased', erase(w, 10, 10).ok && topZ(w, 10, 10) < 0);
ok('and undone back', undo(w).ok && w.cols[idx(10, 10, 0)] === 12);

// growth
const garden = {};
let ch = grow(w, garden, '2026-09-01');
ok('a plant with no planting day is adopted today, nothing changes', ch.length === 0 && garden['10,10'] === '2026-09-01');
ch = grow(w, garden, '2026-09-01');
ok('same day again: still a seed', ch.length === 0 && w.cols[idx(10, 10, 0)] === 12);
ch = grow(w, garden, '2026-09-02');
ok('next day it sprouts', ch.length === 1 && ch[0].from === 12 && ch[0].to === 13 && w.cols[idx(10, 10, 0)] === 13);
ch = grow(w, garden, '2026-09-03');
ok('day two: still a sprout', ch.length === 0 && w.cols[idx(10, 10, 0)] === 13);
ch = grow(w, garden, '2026-09-04');
ok('day three: a tree', ch.length === 1 && ch[0].to === 14 && w.cols[idx(10, 10, 0)] === 14);
ch = grow(w, garden, '2026-09-30');
ok('a tree stays a tree', ch.length === 0 && w.cols[idx(10, 10, 0)] === 14);
ch = grow(w, garden, '2026-08-01');
ok('a clock set backwards never ungrows anything', ch.length === 0 && w.cols[idx(10, 10, 0)] === 14);
place(w, 20, 20, 12); garden['20,20'] = '2026-09-01';
ch = grow(w, garden, '2026-09-08');
ok('a seed planted a week ago jumps straight to a tree', ch.length === 1 && ch[0].to === 14);
erase(w, 20, 20);
grow(w, garden, '2026-09-08');
ok('the garden forgets a cell that no longer holds a plant', !('20,20' in garden) && ('10,10' in garden));
place(w, 22, 22, 12); garden['22,22'] = '2026-09-01';
const undoBefore = w.undo.length;
ok('growth adds nothing to the undo stack', grow(w, garden, '2026-09-08').length === 1 && w.undo.length === undoBefore);

// the stage travels in the link
const w2 = makeWorld(); place(w2, 30, 30, 12); place(w2, 31, 30, 12); place(w2, 32, 30, 12);
const g2 = { '30,30': '2026-09-01', '31,30': '2026-09-03', '32,30': '2026-09-04' };
grow(w2, g2, '2026-09-04');
const back = decode(encode(w2));
ok('seed, sprout and tree roundtrip through the link', back && back.cols[idx(30, 30, 0)] === 14 && back.cols[idx(31, 30, 0)] === 13 && back.cols[idx(32, 30, 0)] === 12);
const st = worldStats(w2);
ok('worldStats counts seeds, sprouts, trees and plants', st.seeds === 1 && st.sprouts === 1 && st.trees === 1 && st.plants === 3);
ok('hostile id 15 still rejected by v2', (function () { const raw = [2, 0, 0, 1, 1, 0x1F]; const b = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return decode(b) === null; })());

// seed spot near the dock
const w3 = makeWorld(); for (let x = 60; x < 70; x++) for (let y = 60; y < 70; y++) place(w3, x, y, 2);
const sp = seedSpot(w3, { x: 64.5, y: 64.5 });
ok('seedSpot finds open ground within eight cells', sp && topZ(w3, sp.x, sp.y) < 0 && Math.max(Math.abs(sp.x - 64), Math.abs(sp.y - 64)) <= 8);
ISLE.ALL_LAND = false;
ok('seedSpot never picks the sea', (function () { const s = seedSpot(makeWorld(), { x: 2.5, y: 2.5 }); return s === null; })());
ISLE.ALL_LAND = true;

// quest and book
const qt = questTable();
const gq = qt.find(q => q.id === 'garden');
ok('the garden quest exists and maps to plants', gq && gq.need === 'plants' && gq.n === 3);
ok('it is met by three plants of any stage', questMet(gq, worldStats(w2)) && !questMet(gq, { plants: 2 }));
let pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, garden: { planted: 2, sprouted: 1, treed: 1 }, boat: { kind: 'seed', landed: true } });
const p1 = pages[0].lines.join(' ');
ok('chapter: planted, sprouted, tree', /planted 2 seeds/.test(p1) && /pushed up a little green sprout/.test(p1) && /grew into a whole tree/.test(p1));
ok('chapter: the boat and what it brought', /morning boat came in with a long low horn/.test(p1) && /seed, and left it on the sand/.test(p1));
pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, garden: { planted: 0, sprouted: 0, treed: 0 }, boat: null });
ok('a quiet garden and no boat say nothing', !/seed/.test(pages[0].lines.join(' ')) && !/boat/.test(pages[0].lines.join(' ')));
ok('visitor line names the visitor', /visitor called LULU/.test(boatLine({ kind: 'visitor', name: 'LULU' })));
ok('chocolate line', /chocolate bars/.test(boatLine({ kind: 'chocolate' })));
const bq = bedtimeQuestion({ keys: ['grow'], n: 2 });
ok('bedtime asks how long a seed takes', /seed take to sprout/.test(bq.ask) && bq.a[bq.rightIdx] === 'One whole day');
const bq2 = bedtimeQuestion({ keys: ['plant'], n: 2 });
ok('bedtime asks where a seed goes', /Where does a seed/.test(bq2.ask) && bq2.a[bq2.rightIdx] === 'On bare ground');
const day = { blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11, tick: 6 };
ok('advisor: plant a seed, then wait for the garden', /Plant a SEED/.test(nextThing(day).line) && /come back tomorrow/.test(nextThing(Object.assign({ plants: 1 }, day)).line));

// the boat
ok('away before half past six and after half past twelve', boatAt(6).state === 'away' && boatAt(12.5).state === 'away' && boatAt(20).state === 'away');
ok('coming between half six and seven, u rising', boatAt(6.5).state === 'coming' && boatAt(6.75).u > 0.4 && boatAt(6.75).u < 0.6 && boatAt(6.99).state === 'coming');
ok('in from seven to twelve', boatAt(7).state === 'in' && boatAt(9.5).state === 'in' && boatAt(11.99).state === 'in');
ok('going from twelve to half past', boatAt(12).state === 'going' && boatAt(12.25).u > 0.4 && boatAt(12.49).state === 'going');
ok('hour wraps', boatAt(31).state === 'in' && boatAt(-1).state === 'away');
const kinds = {};
for (let d = 1; d <= 90; d++) { const g = boatGift('2026-10-' + String((d % 28) + 1).padStart(2, '0') + ':' + d); kinds[g.kind] = (kinds[g.kind] || 0) + 1; }
ok('three gifts, all appear over ninety days', kinds.visitor > 15 && kinds.seed > 15 && kinds.chocolate > 15, JSON.stringify(kinds));
ok('the same date gives the same gift for everyone', boatGift('2026-09-05').kind === boatGift('2026-09-05').kind && boatGift('2026-09-05').name === boatGift('2026-09-05').name);
ok('a visitor has a curated name, other gifts have none', (function () { for (let d = 1; d <= 60; d++) { const g = boatGift('2026-11-' + d); if (g.kind === 'visitor' && VISITORS.indexOf(g.name) === -1) return false; if (g.kind !== 'visitor' && g.name !== '') return false; } return true; })());
ok('the boat does not share its hash with the weather', boatGift('2026-09-05').kind !== undefined && dayHash('2026-09-05:boat') !== dayHash('2026-09-05'));

console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
