const { ISLE, makeWorld, place, encode, decode, flags, fmtLap } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
ok('FLAG type id 9', ISLE.TYPES[9] && ISLE.TYPES[9].name === 'FLAG');
let w = makeWorld();
ok('no flags on empty island', flags(w).length === 0);
place(w, 12, 12, 9);
ok('flag found', flags(w).length === 1 && flags(w)[0].x === 12);
place(w, 30, 8, 9);
ok('two flags found', flags(w).length === 2);
const w2 = decode(encode(w));
ok('flags survive the link', w2 && flags(w2).length === 2);
ok('flag coords exact', JSON.stringify(flags(w2)) === JSON.stringify(flags(w)));
let old = makeWorld();
for (let x = 5; x < 12; x++) place(old, x, 5, 3);
ok('pre-P4 link still valid', decode(encode(old)) !== null);
ok('unknown block id rejected', decode(Buffer.from([1, 0, 5, 5, ISLE.TYPES.length]).toString('base64')) === null);
ok('fmt 42.1s', fmtLap(42100) === '0:42.1', fmtLap(42100));
ok('fmt 1m05.9', fmtLap(65900) === '1:05.9', fmtLap(65900));
ok('fmt zero is blank', fmtLap(0) === '');
w = makeWorld();
let n = 0;
outer: for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) for (let k = 0; k < 4; k++) {
  if (!place(w, x, y, 1 + ((x * 7 + y * 13 + k) % 9)).ok) continue;
  n++; if (n >= ISLE.MAX_BLOCKS) break outer;
}
const worst = encode(w) + '&t=3599999';
ok('LINK BUDGET with lap record <= 1700', worst.length <= 1700, 'len=' + worst.length);
console.log('worst-case link with record:', worst.length, 'chars');
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
