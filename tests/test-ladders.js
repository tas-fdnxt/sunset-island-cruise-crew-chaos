const { LADDERS, LADDER_NAMES, newMastery, ladderStep, ladderQuest, pickQuest, questMet, chapter, bedtimeQuestion, masteryLines, parentSummary, questTable } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }

// tables
ok('four ladders', Object.keys(LADDERS).join() === 'counting,geometry,number,space');
ok('every rung has need, n, tell, done, skill', Object.keys(LADDERS).every(k => LADDERS[k].every(r => r.need && r.n > 0 && r.tell && r.done && r.skill)));
ok('rungs climb: counting totals go up', LADDERS.counting.map(r => r.n).join() === '3,5,7,10,9' && LADDERS.counting[4].job.length === 3);
ok('counting jobs sum to n', LADDERS.counting.every(r => r.job.reduce((a, b) => a + b, 0) === r.n));
ok('names for every ladder', Object.keys(LADDERS).every(k => LADDER_NAMES[k]));

// stepping
let m = { rung: 0, streak: 0, miss: 0 };
m = ladderStep(m, true); ok('one day done: streak 1, same rung', m.rung === 0 && m.streak === 1);
m = ladderStep(m, true); m = ladderStep(m, true);
ok('three days fluent: rung up, streak reset', m.rung === 1 && m.streak === 0);
m = ladderStep(m, false); ok('one miss: nothing changes', m.rung === 1 && m.miss === 1);
m = ladderStep(m, false); ok('two misses: drop back a rung, quietly', m.rung === 0 && m.miss === 0);
m = ladderStep(m, false); m = ladderStep(m, false);
ok('never below rung zero', m.rung === 0);
m = ladderStep(m, true); m = ladderStep(m, false); m = ladderStep(m, true);
ok('a miss breaks the streak', m.streak === 1);
ok('undefined mastery tolerated', ladderStep(undefined, true).streak === 1);
const fresh = newMastery();
ok('new mastery starts at the bottom of every ladder', Object.keys(LADDERS).every(k => fresh[k].rung === 0 && fresh[k].streak === 0));

// ladder quests
let q = ladderQuest('counting', 0, ['PEARL']);
ok('counting rung 0 needs one name', q && q.tell === 'deliver 3 crates to PEARL' && q.job[0].name === 'PEARL' && q.job[0].left === 3 && q.need === 'delivered' && q.n === 3);
ok('rung 2 needs two names', ladderQuest('counting', 2, ['PEARL']) === null && ladderQuest('counting', 2, ['PEARL', 'MANGO']).tell === 'deliver 4 crates to PEARL and 3 to MANGO');
ok('geometry needs no names', ladderQuest('geometry', 1).need === 'ramps');
ok('past the top returns null', ladderQuest('number', 3) === null && ladderQuest('nope', 0) === null);
ok('ids carry ladder and rung', ladderQuest('number', 1).id === 'ladder:number:1');

// picking one rung up, rotating by day
const names = ['PEARL', 'MANGO', 'SHELLY'];
const st0 = { houses: 1, delivered: 0 };
ok('day 0: counting first', pickQuest(st0, null, -1, newMastery(), 0, names).ladder === 'counting');
ok('day 1: geometry', pickQuest(st0, null, -1, newMastery(), 1, names).ladder === 'geometry' && pickQuest(st0, null, -1, newMastery(), 1, names).rung === 1);
ok('day 2: number', pickQuest(st0, null, -1, newMastery(), 2, names).ladder === 'number');
ok('day 3 is space, day 4 wraps to counting', pickQuest(st0, null, -1, newMastery(), 3, names).ladder === 'space' && pickQuest(st0, null, -1, newMastery(), 4, names).ladder === 'counting');
const mm = newMastery(); mm.counting.rung = 2;
ok('rung two asks for two deliveries', pickQuest(st0, null, -1, mm, 0, names).tell.indexOf('4 crates to PEARL and 3 to MANGO') !== -1);
ok('no islanders: counting skipped, geometry chosen', pickQuest(st0, null, -1, newMastery(), 0, []).ladder === 'geometry');
const maxed = newMastery(); Object.keys(maxed).forEach(k => { maxed[k].rung = 99; });
ok('all ladders done: falls back to the base table', !pickQuest(st0, null, -1, maxed, 0, names).ladder);
ok('dream quest beats the ladder', pickQuest({ factories: 0 }, null, 3, newMastery(), 0, names).id === 'dream');
ok('dream already done: ladder next', pickQuest({ factories: 1, houses: 1 }, null, 3, newMastery(), 0, names).ladder === 'counting');
ok('old three-argument call still works', pickQuest({ houses: 0 }, null).id === 'houses3');
ok('delivered stat meets the quest', questMet(ladderQuest('counting', 0, names), { delivered: 3 }) && !questMet(ladderQuest('counting', 0, names), { delivered: 2 }));

// chapter and bedtime
const job = [{ name: 'PEARL', n: 4, left: 0 }, { name: 'MANGO', n: 3, left: 0 }];
let pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0], job: job, rungUp: 'count to 3' });
const p1 = pages[0].lines.join(' '), p2 = pages[1].lines.join(' ');
ok('chapter tells the delivery as a sum', p1.indexOf('4 to PEARL and 3 to MANGO. 4 and 3 makes 7.') !== -1, p1);
ok('chapter says the rung moved', p2.indexOf('three days running') !== -1);
pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0], job: [{ name: 'PEARL', n: 3, left: 3 }] });
ok('nothing delivered: no delivery line', pages[0].lines.join(' ').indexOf('crates') === -1);
let bq = bedtimeQuestion({ keys: ['delivery'], n: 2, job: job });
ok('bedtime asks the sum', bq.ask.indexOf('4 to PEARL and 3 to MANGO') !== -1 && bq.a[bq.rightIdx] === '7' && bq.a[1 - bq.rightIdx] === '6');
bq = bedtimeQuestion({ keys: [], n: 1, job: [{ name: 'PEARL', n: 5, left: 0 }] });
ok('single delivery asks the count', bq.ask.indexOf('PEARL') !== -1 && bq.a[bq.rightIdx] === '5');
ok('unfinished job: no delivery question', bedtimeQuestion({ keys: [], n: 1, job: [{ name: 'PEARL', n: 5, left: 2 }], stats: { houses: 0 } }).ask.indexOf('crates') === -1);

// grown-ups
const ml = masteryLines({ counting: { rung: 2, streak: 1 }, geometry: { rung: 0, streak: 0 }, number: { rung: 3, streak: 0 } }, 'ollie');
ok('counting line shows fluent and working on', ml[0].indexOf('rung 3 of 5') !== -1 && ml[0].indexOf('Fluent up to "count to 5"') !== -1 && ml[0].indexOf('Working on "add two small numbers", done 1 day running') !== -1, ml[0]);
ok('geometry at the bottom', ml[1].indexOf('rung 1 of 5') !== -1 && ml[1].indexOf('Fluent') === -1);
ok('number finished', ml[2].indexOf('every rung done') !== -1);
const ps = parentSummary({ book: [], ledger: [], mastery: newMastery() }, '2026-08-31', 'OLLIE').join(' ');
ok('parent summary includes the ladders', ps.indexOf('Counting: rung 1 of 5') !== -1 && ps.indexOf('Shapes and building: rung 1 of 5') !== -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
