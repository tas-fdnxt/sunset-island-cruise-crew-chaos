/* THE DAILY VOYAGE. The date is the seed, so every child everywhere gets the same three
   goals on the same day with no server. Each goal is a fact the engine already detects.
   Nothing expires, nothing is scored against the child. The suite is the spec. */
const C = require('./isle-core.js');
let n = 0, f = [];
function ck(name, ok, got) { n++; if (!ok) f.push(name + ' :: ' + JSON.stringify(got)); }

const HAS = typeof C.voyageFor === 'function' && typeof C.voyageProgress === 'function' && typeof C.voyageGlyphs === 'function';
ck('voyage functions exported', HAS, Object.keys(C).length);

if (HAS) {
  const v = C.voyageFor('2026-09-04');
  ck('three goals', v.goals.length === 3, v.goals.length);
  ck('voyage has a day number', v.no > 0, v.no);
  ck('same day same voyage', JSON.stringify(C.voyageFor('2026-09-04')) === JSON.stringify(v), 0);
  ck('different day differs', JSON.stringify(C.voyageFor('2026-09-05')) !== JSON.stringify(v), 0);
  ck('day number climbs', C.voyageFor('2026-09-05').no === v.no + 1, C.voyageFor('2026-09-05').no);

  /* every goal must be a stat the engine really detects */
  const REAL = ['blocks','houses','palms','flags','tallest','arcades','factories','plants','goalsToday',
                'bpFinishedToday','tripsToday','laps','delivered','symmetry','gain'];
  let allReal = true, allWorded = true;
  for (let d = 0; d < 60; d++) {
    const day = '2026-' + String(1 + (d % 12)).padStart(2,'0') + '-' + String(1 + (d % 28)).padStart(2,'0');
    const vv = C.voyageFor(day);
    ck('three goals on ' + day, vv.goals.length === 3, vv.goals.length);
    vv.goals.forEach(function (g) {
      if (REAL.indexOf(g.need) === -1) allReal = false;
      if (!(g.tell && g.tell.length > 8 && g.n > 0 && g.icon)) allWorded = false;
    });
    const kinds = {}; vv.goals.forEach(function (g) { kinds[g.need] = 1; });
    ck('no repeated goal on ' + day, Object.keys(kinds).length === 3, kinds);
  }
  ck('every goal maps to a real detected stat', allReal, 0);
  ck('every goal has words, a target and an icon', allWorded, 0);

  /* progress is read from real stats, never stored opinion */
  const v2 = C.voyageFor('2026-09-04');
  const none = C.voyageProgress(v2, {});
  ck('empty day is zero done', none.done === 0 && none.all === 3, none);
  ck('progress never crashes on missing stats', Array.isArray(none.marks) && none.marks.length === 3, none);
  const full = {};
  v2.goals.forEach(function (g) { full[g.need] = g.n; });
  const won = C.voyageProgress(v2, full);
  ck('meeting every target completes', won.done === 3 && won.complete === true, won);
  const part = {}; part[v2.goals[0].need] = v2.goals[0].n;
  const p1 = C.voyageProgress(v2, part);
  ck('partial counts honestly', p1.done === 1 && p1.complete === false, p1);
  ck('over target still counts once', C.voyageProgress(v2, (function(){const o={};v2.goals.forEach(g=>o[g.need]=g.n*5);return o;})()).done === 3, 0);

  /* the shareable card is spoiler free: glyphs and numbers, never the plan */
  const g = C.voyageGlyphs(v2, won);
  ck('glyph line exists', typeof g === 'string' && g.length >= 3, g);
  ck('glyphs one per goal', Array.from(g).filter(ch => ch.codePointAt(0) > 0x2000).length >= 3, g);
  ck('glyphs leak no instructions', v2.goals.every(function (gg) { return g.toLowerCase().indexOf(gg.tell.toLowerCase().slice(0, 10)) === -1; }), g);
  const gz = C.voyageGlyphs(v2, none);
  ck('an empty day still draws a card', typeof gz === 'string' && gz.length >= 3, gz);
  ck('done and not done look different', g !== gz, 0);

  /* nothing expires: yesterday is still readable, never scored against the child */
  ck('yesterday still resolves', C.voyageFor('2026-09-03').goals.length === 3, 0);
  ck('no goal is ever a deadline word', C.voyageFor('2026-09-04').goals.every(function (gg) {
    return !/fail|lose|lost|late|miss|expire|must/i.test(gg.tell); }), 0);
}

console.log('CHECKS ' + n + '   FAILED ' + f.length);
f.forEach(x => console.log('  FAILED: ' + x));
process.exit(f.length ? 1 : 0);
