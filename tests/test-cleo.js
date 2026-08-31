const { nextThing, cleoFact, coatLevel, CLEO_FACTS, chapter, questTable } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
const q = { id: 'houses3', tell: 'build a third house', done: 'x' };

// the advisor: one sentence, always the most useful thing
ok('empty island: tap the sand', nextThing({}).key === 'tap');
ok('blocks but no house: build a ring with a door', nextThing({ blocks: 3, walls: 3 }).key === 'house');
ok('walls but no door: put a door in', nextThing({ blocks: 8, walls: 8, doors: 0 }).key === 'door');
ok('house ghost offered', nextThing({ blocks: 3 }).ghost === 'house' && nextThing({ blocks: 8, walls: 8 }).ghost === 'door');
ok('house done, quest open: the book says', nextThing({ blocks: 30, houses: 1, quest: q }).key === 'quest');
ok('quest line uses the quest words', nextThing({ blocks: 30, houses: 1, quest: q }).line.indexOf('build a third house') !== -1);
ok('quest met: move on', nextThing({ blocks: 30, houses: 1, quest: q, questMet: true }).key === 'flag');
ok('no flag: plant a flag', nextThing({ blocks: 30, houses: 1 }).key === 'flag');
ok('no ramp learned: ramp with ghost', nextThing({ blocks: 30, houses: 1, flags: 1 }).key === 'ramp' && nextThing({ blocks: 30, houses: 1, flags: 1 }).ghost === 'ramp');
ok('evening: the moon', nextThing({ blocks: 30, houses: 1, flags: 1, ramp: true, hour: 19 }).key === 'moon');
ok('late night too', nextThing({ blocks: 30, houses: 1, flags: 1, ramp: true, hour: 2 }).key === 'moon');
const day = { blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11 };
ok('daytime, all done: rotating ideas', nextThing(Object.assign({ tick: 0 }, day)).key === 'tall' && nextThing(Object.assign({ tick: 1 }, day)).key === 'share');
ok('ideas rotate and wrap', nextThing(Object.assign({ tick: 7 }, day)).key === 'tall' && nextThing(Object.assign({ tick: 5 }, day)).key === 'compass' && nextThing(Object.assign({ tick: 6 }, day)).key === 'seed');
ok('the seed idea changes once the garden exists', /Plant a SEED/.test(nextThing(Object.assign({ tick: 6 }, day)).line) && /growing/.test(nextThing(Object.assign({ tick: 6, plants: 2 }, day)).line));
ok('every line is one sentence, no lists', [{}, { blocks: 3 }, { blocks: 8, walls: 8 }, day].every(st => { const l = nextThing(st).line; return l.length < 90 && l.indexOf('\n') === -1; }));
ok('quest comes before flag and ramp', nextThing({ blocks: 30, houses: 1, quest: q, flags: 0 }).key === 'quest');

// facts
ok('seventeen facts, all short', CLEO_FACTS.length === 17 && CLEO_FACTS.every(f => f.length > 30 && f.length < 130));
ok('no two facts the same', new Set(CLEO_FACTS).size === CLEO_FACTS.length);
ok('fact per chapter, cycles', cleoFact(1) === CLEO_FACTS[0] && cleoFact(17) === CLEO_FACTS[16] && cleoFact(18) === CLEO_FACTS[0]);
ok('facts contain no scary words', CLEO_FACTS.every(f => !/kill|die|dead|blood/i.test(f)));

// coat
ok('puppy coat to start', coatLevel(0) === 0 && coatLevel(9) === 0);
ok('coat grows every ten chapters', coatLevel(10) === 1 && coatLevel(20) === 2 && coatLevel(30) === 3);
ok('full show coat caps at three', coatLevel(99) === 3);

// chapter carries the fact and Cleo waits
const t = questTable();
const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], fact: cleoFact(3), keeper: 'CLEO', questDays: 2 });
const p3 = pages[2].lines.join(' ');
ok('fact on page three', p3.indexOf('Cleo\u2019s fact for tonight: ' + CLEO_FACTS[2]) !== -1);
ok('the keeper waits', p3.indexOf('CLEO has been waiting 2 days for that one') !== -1);
ok('no fact line when none given', chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0] })[2].lines.join(' ').indexOf('fact') === -1);
ok('facts without a dog skip the dog lines', !/like me|Watch me|I know exactly/.test(cleoFact(4, false)) && !/like me|Watch me|I know exactly/.test(cleoFact(9, false)));
ok('fact line names the keeper', chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], fact: 'x', keeper: 'COCO' })[2].lines.join(' ').indexOf('Coco\u2019s fact for tonight') !== -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
