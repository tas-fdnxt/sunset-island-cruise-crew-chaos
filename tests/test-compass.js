const { makeWorld, place, compassOf, compassStats, LADDERS, LADDER_NAMES, newMastery, pickQuest, questMet, ladderQuest, WORDS, wordOfDay, wordQuestion, chapter, bedtimeQuestion, questTable, masteryLines } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
function house(w, ox, oy) { for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) { const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4); if (e) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); } } }
// compass
const f = { x: 32, y: 32 };
ok('north is towards the top corner', compassOf(f, { x: 20, y: 20 }) === 'north');
ok('south is towards the bottom corner', compassOf(f, { x: 44, y: 44 }) === 'south');
ok('east is towards the right corner', compassOf(f, { x: 44, y: 20 }) === 'east');
ok('west is towards the left corner', compassOf(f, { x: 20, y: 44 }) === 'west');
ok('too close is nothing', compassOf(f, { x: 33, y: 33 }) === '');
ok('diagonal picks the bigger part', compassOf(f, { x: 20, y: 26 }) === 'north');
let w = makeWorld();
ok('no flag, no directions', compassStats(w).north === 0 && compassStats(w).east === 0);
place(w, 32, 32, 9); house(w, 18, 18); place(w, 44, 20, 8); place(w, 20, 44, 8);
const cs = compassStats(w);
ok('house north, palm east, palm west', cs.north === 1 && cs.east === 1 && cs.west === 1 && cs.south === 0, cs);
// space ladder
ok('four ladders now', Object.keys(LADDERS).length === 4 && LADDER_NAMES.space === 'Space and direction');
ok('space rungs map to compass stats', LADDERS.space.map(r => r.need).join() === 'flags,north,east,south,west');
ok('space quest met by the compass', questMet(ladderQuest('space', 1), cs) && !questMet(ladderQuest('space', 3), cs));
ok('rotation reaches space on day three', pickQuest({ houses: 1, flags: 0 }, null, -1, newMastery(), 3, ['A']).ladder === 'space');
ok('mastery lines include space', masteryLines(newMastery(), 'x').some(l => l.indexOf('Space and direction: rung 1 of 5') !== -1));
// words
ok('thirty words, all with a meaning', WORDS.length === 30 && WORDS.every(x => /^[A-Z]+$/.test(x.w) && x.d.length > 5));
ok('no duplicate words', new Set(WORDS.map(x => x.w)).size === 30);
ok('word of the day cycles', wordOfDay(1).w === 'SPLENDID' && wordOfDay(31).w === 'SPLENDID' && wordOfDay(2).w === 'ENORMOUS');
const wq = wordQuestion(3, wordOfDay(3));
ok('word question asks the meaning with a wrong meaning from another word', wq.ask === 'What does TINY mean?' && wq.right === 'very small' && wq.wrong !== wq.right);
const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0], word: wordOfDay(1), wordHeard: true });
ok('chapter uses the word', pages[0].lines.join(' ').indexOf('The word of the island today was SPLENDID. It means really, really good. Ollie heard it from an islander.') !== -1);
const bq = bedtimeQuestion({ keys: ['word'], n: 3, word: wordOfDay(3) });
ok('bedtime asks the word on every third chapter', bq.ask === 'What does TINY mean?' && bq.a[bq.rightIdx] === 'very small');
ok('other nights ask something else', bedtimeQuestion({ keys: ['word', 'ramp'], n: 2, word: wordOfDay(2) }).ask.indexOf('ramp') !== -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
