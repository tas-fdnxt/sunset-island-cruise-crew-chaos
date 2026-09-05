const { ISLE, makeWorld, place, worldStats, pickQuest, questMet, questTable, chapter } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
function house(w, ox, oy) {
  for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) {
    const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4);
    if (e) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); }
  }
}
let w = makeWorld();
let st = worldStats(w);
ok('empty stats', st.blocks === 0 && st.houses === 0 && st.tallest === 0);
house(w, 5, 5); place(w, 20, 20, 8); place(w, 22, 20, 8); place(w, 30, 30, 9);
st = worldStats(w);
ok('counts houses', st.houses === 1, st.houses);
ok('counts palms', st.palms === 2, st.palms);
ok('counts flags', st.flags === 1, st.flags);
ok('counts tallest', st.tallest === 2, st.tallest);
const t = questTable();
ok('quests all map to real stats', t.every(q => ['houses','palms','flags','tallest','arcades','factories','plants','bpFinishedToday','tripsToday','goalsToday'].indexOf(q.need) !== -1));
ok('quests all have a told line and a done line', t.every(q => q.tell.length > 10 && q.done.length > 5));
const q = pickQuest(st, null);
ok('picks an unmet quest', !questMet(q, st), JSON.stringify(q));
ok('never repeats the last quest', pickQuest(st, q.id).id !== q.id);
const done = {}; done[q.need] = q.n;
ok('completion detected', questMet(q, done));
const pages = chapter({
  name: 'OLLIE', stats: { blocks: 60, houses: 2, palms: 2, flags: 1, tallest: 3 },
  prevStats: { blocks: 20, houses: 1 }, newIslanders: ['COCO', 'BARNACLE BOB'],
  learned: ['A ramp only works if it is one block high.'], bestLap: 42100,
  remixedFrom: 'SIBELLA', quest: q, lastQuestDone: 'A racing flag went up.',
});
ok('three beats', pages.length === 3, pages.length);
const all = pages.map(p => p.lines.join(' ')).join(' ');
ok('uses his name properly cased', all.indexOf('Captain Ollie') !== -1);
ok('says what he built', all.indexOf('40 blocks') !== -1);
ok('names the islanders who moved in', all.indexOf('COCO and BARNACLE BOB') !== -1);
ok('includes his lap time', all.indexOf('0:42.1') !== -1);
ok('credits who he remixed from', all.indexOf('SIBELLA') !== -1);
ok('reports the finished quest', all.indexOf('A racing flag went up') !== -1);
ok('sets up tomorrow', all.indexOf('Tomorrow, Captain Ollie is going to') !== -1);
ok('has the learning beat', pages[1].lines.join(' ').indexOf('one block high') !== -1);
const quiet = chapter({ name: 'OLLIE', stats: { blocks: 0 }, prevStats: { blocks: 0 }, newIslanders: [], learned: [], quest: q });
ok('quiet day still works', quiet.length === 3 && quiet[0].lines.length >= 2 && quiet[1].lines.length >= 1);
ok('no empty pages ever', quiet.every(p => p.lines.every(l => l.length > 0)));
const nasty = chapter({ name: '<img src=x>', stats: {}, prevStats: {}, quest: q });
ok('hostile name sanitised in story', nasty[0].lines.join(' ').indexOf('<') === -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
