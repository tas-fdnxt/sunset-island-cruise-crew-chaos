/* THE CHALLENGE IN THE LINK. A shared island now carries the sender's voyage result,
   so the receiver opens it and sees what to beat. Nothing new is asked of anyone: it is
   two numbers on the end of a link that already existed. The suite is the spec. */
const C = require('./isle-core.js');
let n = 0, f = [];
function ck(name, ok, got) { n++; if (!ok) f.push(name + ' :: ' + JSON.stringify(got)); }

const base = C.buildHash('ABC', 0, 'OLLIE', [], null);
ck('plain link still plain', base.indexOf('&v=') === -1, base);
ck('old links still parse', C.parseHash(base).b === 'OLLIE', 0);

const withV = C.buildHash('ABC', 74100, 'OLLIE', [], null, { no: 4, done: 3, all: 3 });
ck('challenge rides in the link', withV.indexOf('&v=') >= 0, withV);
const p = C.parseHash(withV);
ck('voyage number survives', p.v && p.v.no === 4, p.v);
ck('score survives', p.v && p.v.done === 3 && p.v.all === 3, p.v);
ck('lap still survives beside it', p.t === 74100, p.t);
ck('builder still survives beside it', p.b === 'OLLIE', p.b);
const same = C.buildHash('ABC', 74100, 'OLLIE', [], null);
ck('link stays short', withV.length - same.length <= 12, withV.length - same.length);
ck('worst case field is 12 chars', C.buildHash('ABC', 0, '', [], null, { no: 99999, done: 3, all: 3 }).length - C.buildHash('ABC', 0, '', [], null).length === 12, 0);

/* zero is a real answer and must survive, so a quiet day still challenges honestly */
const zero = C.parseHash(C.buildHash('ABC', 0, 'PIP', [], null, { no: 9, done: 0, all: 3 }));
ck('a zero score still travels', zero.v && zero.v.no === 9 && zero.v.done === 0, zero.v);

/* junk in the link can never reach a child's screen */
['&v=', '&v=abc', '&v=9.9.9.9', '&v=-4.2.3', '&v=999999999.2.3', '&v=4.9.3', '&v=4.2.99'].forEach(function (bad, i) {
  const q = C.parseHash('#i=ABC' + bad);
  ck('junk rejected or clamped ' + i, q !== null && (!q.v || (q.v.no >= 0 && q.v.done >= 0 && q.v.done <= q.v.all && q.v.all <= 3)), [bad, q && q.v]);
});
const inj = C.parseHash('#i=ABC&v=<script>.2.3');
ck('script in the field is refused', !inj.v || typeof inj.v.no === 'number', inj.v);

/* the line a child reads */
if (typeof C.challengeLine !== 'function') { ck('challengeLine exported', false, 'missing'); }
else {
const line = C.challengeLine('OLLIE', { no: 4, done: 3, all: 3 }, 74100);
ck('line names the sender', line.indexOf('OLLIE') >= 0, line);
ck('line gives the score', line.indexOf('3') >= 0, line);
ck('line invites, never shames', !/fail|lost|beat you|loser|bad/i.test(line), line);
const line0 = C.challengeLine('PIP', { no: 9, done: 0, all: 3 }, 0);
ck('a zero score is still kind', line0.length > 10 && !/fail|only|lost/i.test(line0), line0);
ck('no sender, no line', C.challengeLine('', null, 0) === '', 0);

}
console.log('CHECKS ' + n + '   FAILED ' + f.length);
f.forEach(x => console.log('  FAILED: ' + x));
process.exit(f.length ? 1 : 0);
