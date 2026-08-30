const { ISLE, makeWorld, place, encode, sanitizeName, parseHash, buildHash } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
ok('uppercases', sanitizeName('ollie') === 'OLLIE');
ok('strips punctuation and tag chars', sanitizeName('Ol<b>lie!') === 'OLBLIE');
ok('strips script tags', sanitizeName('<script>x</script>') === 'SCRIPTXSCRIPT'.slice(0, 10));
ok('caps at 10 chars', sanitizeName('ABCDEFGHIJKLMNOP').length === 10);
ok('null safe', sanitizeName(null) === '' && sanitizeName(undefined) === '');
ok('trims', sanitizeName('  OLLIE  ') === 'OLLIE');
const hs = buildHash('ABC', 42100, 'OLLIE', ['SIBELLA', 'DAD']);
ok('hash has all parts', hs === '#i=ABC&t=42100&b=OLLIE&c=SIBELLA,DAD', hs);
let p = parseHash(hs);
ok('parse enc', p.enc === 'ABC');
ok('parse time', p.t === 42100);
ok('parse builder', p.b === 'OLLIE');
ok('parse chain', JSON.stringify(p.c) === '["SIBELLA","DAD"]');
const long = buildHash('X', 0, 'A', ['B', 'C', 'D', 'E', 'F']);
ok('chain capped at 3', parseHash(long).c.length === 3, long);
ok('no time means no t param', long.indexOf('&t=') === -1);
ok('garbage hash null', parseHash('#nonsense') === null);
ok('empty null', parseHash('') === null);
ok('bad percent escape survives', parseHash('#i=ABC&b=%E0%A4%A') !== null);
p = parseHash('#i=ABC&b=%3Cimg%20src%3Dx%3E&c=%3Cb%3E,OK');
ok('injected builder sanitised', p.b.indexOf('<') === -1 && p.b.indexOf('>') === -1, p.b);
ok('injected chain sanitised', p.c.every(x => x.indexOf('<') === -1), JSON.stringify(p.c));
ok('absurd lap ignored', parseHash('#i=ABC&t=999999999').t === 0);
ok('negative lap ignored', parseHash('#i=ABC&t=-5').t === 0);
function doRemix(builder, chain) { return [builder].concat(chain).slice(0, 3); }
ok('remix prepends', JSON.stringify(doRemix('SIBELLA', [])) === '["SIBELLA"]');
ok('remix chains', JSON.stringify(doRemix('DAD', ['SIBELLA'])) === '["DAD","SIBELLA"]');
ok('remix caps at 3', doRemix('D', ['C', 'B', 'A']).length === 3);
let w = makeWorld();
let n = 0;
outer: for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) for (let k = 0; k < 4; k++) {
  if (!place(w, x, y, 1 + ((x * 7 + y * 13 + k) % 9)).ok) continue;
  n++; if (n >= ISLE.MAX_BLOCKS) break outer;
}
const worst = buildHash(encode(w), 3599999, 'ABCDEFGHIJ', ['ABCDEFGHIJ', 'ABCDEFGHIJ', 'ABCDEFGHIJ']);
ok('WORST-CASE LINK <= 1700', worst.length <= 1700, 'len=' + worst.length);
console.log('worst-case remix link:', worst.length, 'chars');
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
