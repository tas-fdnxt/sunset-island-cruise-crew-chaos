const { makeWorld, place, houses, dayKey, daysBetween, symmetry, bookAdd, bedtimeQuestion, parentSummary, chapter, questTable, fmtLap } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
function house(w, ox, oy, mirror) {
  for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) {
    const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4);
    if (e) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); }
  }
  if (!mirror) place(w, ox, oy + 2, 7); // one extra block on the left wall breaks the mirror
}

// days
ok('dayKey shape', /^\d{4}-\d{2}-\d{2}$/.test(dayKey()));
ok('dayKey of a timestamp', dayKey(new Date(2026, 7, 31, 20, 0).getTime()) === '2026-08-31');
ok('days between', daysBetween('2026-08-28', '2026-08-31') === 3 && daysBetween('2026-08-31', '2026-08-31') === 0);
ok('days between across months', daysBetween('2026-08-30', '2026-09-02') === 3);
ok('bad keys give zero', daysBetween('nope', '2026-08-31') === 0);

// symmetry
let w = makeWorld(); house(w, 10, 10, true);
ok('mirrored house is symmetric', symmetry(w) === 1, symmetry(w));
w = makeWorld(); house(w, 10, 10, false);
ok('lopsided house is not', symmetry(w) === 0, symmetry(w));
w = makeWorld(); house(w, 10, 10, true); house(w, 30, 10, false);
ok('counts only the mirrored ones', symmetry(w) === 1);
w = makeWorld(); place(w, 5, 5, 6);
ok('a lone door is not a house, not symmetric', symmetry(w) === 0);

// the book
const j = { book: [] };
ok('first chapter written', bookAdd(j, { day: '2026-08-31', pages: [] }) === true && j.book[0].n === 1);
ok('second tap same day refused', bookAdd(j, { day: '2026-08-31', pages: [] }) === false && j.book.length === 1);
ok('next day is chapter two', bookAdd(j, { day: '2026-09-01', pages: [] }) === true && j.book[1].n === 2);
const big = { book: [] }; for (let i = 0; i < 405; i++) bookAdd(big, { day: 'd' + i });
ok('book capped at 400 chapters', big.book.length === 400);

// bedtime questions
let q = bedtimeQuestion({ keys: ['ramp'], n: 1, stats: {} });
ok('ramp question', q.ask.indexOf('ramp') !== -1 && q.a.length === 2 && q.a[q.rightIdx] === 'One block high');
ok('answers flip on odd chapters', bedtimeQuestion({ keys: ['ramp'], n: 1 }).rightIdx === 1 && bedtimeQuestion({ keys: ['ramp'], n: 2 }).rightIdx === 0);
q = bedtimeQuestion({ keys: ['lap'], n: 2, bestLap: 30000 });
ok('lap question uses his real time', q.a[q.rightIdx] === '0:30.0' && q.a[1 - q.rightIdx] === '0:37.0');
ok('symmetry question', bedtimeQuestion({ keys: ['sym'], n: 2 }).a[0] === 'Symmetry');
ok('arcade question is 40', bedtimeQuestion({ keys: ['arcade'], n: 2 }).a[0] === '40 points');
ok('counting fallback uses real house count', bedtimeQuestion({ keys: [], n: 2, stats: { houses: 3 } }).a[0] === '3');
ok('empty island fallback', bedtimeQuestion({ keys: [], n: 2, stats: { houses: 0 } }).a[0] === 'A door');
ok('starts unanswered', q.picked === -1);

// chapter memory
const t = questTable();
let pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], bedtime: { ask: 'How high is a ramp?', right: true } });
let all = pages.map(p => p.lines.join(' ')).join(' ');
ok('remembers a right bedtime answer', all.indexOf('Ollie knew the answer') !== -1);
pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], bedtime: { ask: 'How high is a ramp?', right: false } });
ok('a wrong answer is kind', pages[1].lines.join(' ').indexOf('had a good guess') !== -1);
pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], keeper: 'COCO', questDays: 3 });
ok('the keeper waits', pages[2].lines.join(' ').indexOf('COCO has been waiting 3 days') !== -1);
pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[0], keeper: 'COCO', questDays: 1 });
ok('no waiting line on day one', pages[2].lines.join(' ').indexOf('waiting') === -1);

// grown-ups
const jj = { book: [
  { day: '2026-08-29', stats: { blocks: 40, houses: 2 }, prevStats: { blocks: 10, houses: 1 }, lapBeaten: true, questDone: 'A flag went up.', q: { picked: 0, rightIdx: 0 } },
  { day: '2026-08-31', stats: { blocks: 70, houses: 3 }, prevStats: { blocks: 40, houses: 2 }, q: { picked: 1, rightIdx: 0 } },
  { day: '2026-08-10', stats: { blocks: 999, houses: 9 }, prevStats: { blocks: 0, houses: 0 }, q: { picked: 0, rightIdx: 0 } },
], ledger: [
  { day: '2026-08-30', cat: 'geometry', line: 'A ramp is one block high.' }, { day: '2026-08-31', cat: 'number', line: 'Smaller number, faster lap.' },
  { day: '2026-07-01', cat: 'geometry', line: 'Old news.' },
] };
const lines = parentSummary(jj, '2026-08-31', 'ollie');
all = lines.join(' ');
ok('counts this week only', all.indexOf('read 2 chapters, carried 60 blocks and built 2 new houses') !== -1, lines[0]);
ok('quests and laps', all.indexOf('finished 1 quest') !== -1 && all.indexOf('lap record 1 time') !== -1);
ok('bedtime tally', all.indexOf('1 right out of 2') !== -1);
ok('ledger by category, this week only', all.indexOf('Shapes and building: A ramp is one block high.') !== -1 && all.indexOf('Old news') === -1);
ok('empty device reads kindly', parentSummary({}, '2026-08-31', 'X').join(' ').indexOf('Nothing on this device yet') !== -1);
ok('name sanitised', parentSummary({}, '2026-08-31', '<b>').join(' ').indexOf('<') === -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
