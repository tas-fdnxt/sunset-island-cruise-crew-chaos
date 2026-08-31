const { ISLE, makeWorld, place, erase, undo, encode, decode, topZ, idx } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info || ''); } }

let w = makeWorld();
ok('empty world count', w.count === 0);
let r = place(w, 5, 5, 3);
ok('place ok', r.ok && r.z === 0);
r = place(w, 5, 5, 4);
ok('stack z1', r.ok && r.z === 1);
for (let z = 2; z < ISLE.ZMAX - 1; z++) place(w, 5, 5, 4); place(w, 5, 5, 7);
r = place(w, 5, 5, 3);
ok('height cap', !r.ok && r.why === 'height');
ok('topZ', topZ(w, 5, 5) === ISLE.ZMAX - 1);
r = erase(w, 5, 5);
ok('erase top', r.ok && r.z === ISLE.ZMAX - 1 && r.id === 7);
const T = ISLE.ZMAX - 1;
ok('count after erase', w.count === T);
r = undo(w);
ok('undo erase restores', r.ok && w.count === T + 1 && w.cols[idx(5,5,T)] === 7);
undo(w);
ok('undo place removes', w.count === T && w.cols[idx(5,5,T)] === 0 && w.cols[idx(5,5,T - 1)] !== 0);
ok('oob rejected', !place(w, -1, 0, 3).ok && !place(w, ISLE.N, 0, 3).ok);
ok('bad id rejected', !place(w, 0, 0, 0).ok && !place(w, 0, 0, 99).ok);
ok('erase empty rejected', !erase(w, 40, 40).ok);

w = makeWorld();
// a real island: houses two walls high with a roof, packed in rows. This is what a child builds, and it must reach the cap.
let last = null;
outer: for (let oy = 2; oy < ISLE.N - 6; oy += 6) for (let ox = 2; ox < ISLE.N - 6; ox += 6) {
  for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) {
    const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4);
    if (e) { last = place(w, x, y, 3); if (!last.ok) break outer; last = place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); if (!last.ok) break outer; }
    last = place(w, x, y, 7); if (!last.ok) break outer;
  }
}
ok('cargo fills to cap with real houses', w.count === ISLE.MAX_BLOCKS, w.count + ' ' + JSON.stringify(last));
ok('cargo overflow rejected', !place(w, ISLE.N - 1, ISLE.N - 1, 3).ok);
console.log('full island of houses, link:', encode(w).length, 'chars');

w = makeWorld();
for (let x = 10; x <= 14; x++) for (let y = 10; y <= 14; y++) {
  const edge = (x === 10 || x === 14 || y === 10 || y === 14);
  if (edge) { place(w, x, y, 3); place(w, x, y, (x === 12 && y === 14) ? 6 : ((x + y) % 2 ? 5 : 4)); }
}
for (let x = 10; x <= 14; x++) for (let y = 10; y <= 14; y++) { place(w, x, y, 7); }
place(w, 8, 8, 8); place(w, 16, 16, 8);
const enc = encode(w);
const w2 = decode(enc);
ok('decode not null', !!w2);
ok('roundtrip count', w2 && w2.count === w.count);
let same = true;
if (w2) for (let i = 0; i < w.cols.length; i++) if (w.cols[i] !== w2.cols[i]) { same = false; break; }
ok('roundtrip exact', same);

w = makeWorld();
let n = 0;
outer2: for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) for (let k = 0; k < 4; k++) {
  if (!place(w, x, y, 1 + ((x * 7 + y * 13 + k) % 8)).ok) continue;
  n++; if (n >= ISLE.MAX_BLOCKS) break outer2;
}
const worst = encode(w);
ok('worst-case blocks', w.count === ISLE.MAX_BLOCKS);
ok('LINK BUDGET <= 1700 chars', worst.length <= 1700, 'len=' + worst.length);
console.log('worst-case link payload:', worst.length, 'chars');

ok('garbage rejected', decode('!!!not-base64!!!') === null);
ok('wrong version rejected', decode(Buffer.from([99, 0, 1, 1, 19]).toString('base64')) === null);
ok('oob block rejected', decode(Buffer.from([1, 0, 200, 200, 19]).toString('base64')) === null);
ok('dup cell rejected', decode(Buffer.from([1, 0, 5, 5, 3, 5, 5, 3]).toString('base64')) === null);
ok('truncated rejected', decode(Buffer.from([1, 0, 5, 5]).toString('base64')) === null);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
