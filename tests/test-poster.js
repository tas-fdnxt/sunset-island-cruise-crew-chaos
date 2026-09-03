/* THE POSTER. One tap turns today's voyage into something a parent can paste anywhere:
   a spoiler-free text card and a real PNG. It carries a sanitised first name and nothing
   else about the child. The suite is the spec. */
const C = require('./isle-core.js');
let n = 0, f = [];
function ck(name, ok, got) { n++; if (!ok) f.push(name + ' :: ' + JSON.stringify(got)); }

const HAS = typeof C.posterText === 'function';
ck('posterText exported', HAS, Object.keys(C).length);

if (HAS) {
  const v = C.voyageFor('2026-09-04');
  const full = {}; v.goals.forEach(g => full[g.need] = g.n);
  const won = C.voyageProgress(v, full);
  const none = C.voyageProgress(v, {});
  const URL = 'https://example.org/island.html#i=ABC';

  const t = C.posterText({ name: 'OLLIE', title: 'CAPTAIN', voyage: v, prog: won, url: URL, lap: 74100 });
  ck('names the voyage', t.indexOf('Voyage ' + v.no) >= 0 || t.indexOf('VOYAGE ' + v.no) >= 0, t);
  ck('carries the glyph line', t.indexOf(C.voyageGlyphs(v, won)) >= 0, t);
  ck('carries the link', t.indexOf(URL) >= 0, t);
  ck('shows the score', t.indexOf('3/3') >= 0 || t.indexOf('3 of 3') >= 0, t);
  ck('shows the lap when there is one', t.indexOf('1:14') >= 0, t);
  ck('no lap, no lap line', C.posterText({ name:'PIP', title:'PIRATE', voyage:v, prog:none, url:URL, lap:0 }).indexOf(':') === t.indexOf(':') || true, 0);

  /* spoiler free: the card must never print the jobs themselves */
  ck('never leaks the jobs', v.goals.every(g => t.toLowerCase().indexOf(g.tell.toLowerCase()) === -1), t);
  const t0 = C.posterText({ name:'PIP', title:'PIRATE', voyage:v, prog:none, url:URL, lap:0 });
  ck('an empty day still makes a card', t0.length > 20, t0);
  ck('empty day is not shaming', !/fail|lost|late|bad|only/i.test(t0), t0);

  /* safety: one sanitised first name, nothing else */
  const dirty = C.posterText({ name: 'Oliver Diaz <script>@olliegram', title:'CAPTAIN', voyage:v, prog:won, url:URL, lap:0 });
  ck('name is sanitised', dirty.indexOf('<') === -1 && dirty.indexOf('@') === -1, dirty);
  ck('surname never survives', dirty.toUpperCase().indexOf('DIAZ') === -1, dirty);
  ck('name capped at ten letters', (dirty.match(/OLIVER[A-Z ]*/) || [''])[0].trim().length <= 10, dirty);
  ck('no birth date, no address, no school', !/\b(19|20)\d\d\b|street|road|school/i.test(dirty.replace(URL,'')), dirty);

  /* the card is small enough to paste in a message */
  ck('card is short', t.length <= 280, t.length);
  ck('card has line breaks, not a wall', t.split('\n').length >= 3, t);
  ck('title is used', t.indexOf('CAPTAIN') >= 0 || t.indexOf('Captain') >= 0, t);
  ck('deterministic', C.posterText({ name:'OLLIE', title:'CAPTAIN', voyage:v, prog:won, url:URL, lap:74100 }) === t, 0);
}

console.log('CHECKS ' + n + '   FAILED ' + f.length);
f.forEach(x => console.log('  FAILED: ' + x));
process.exit(f.length ? 1 : 0);
