const { ISLE, makeWorld, place, encode, decode, houses } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
function buildHouse(w, ox, oy) {
  for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) {
    const edge = (x === ox || x === ox + 4 || y === oy || y === oy + 4);
    if (edge) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); }
  }
}
let w = makeWorld();
ok('no doors no houses', houses(w).length === 0);
place(w, 10, 10, 6);
ok('lone door is not a house', houses(w).length === 0);
w = makeWorld(); buildHouse(w, 10, 10);
ok('full house detected', houses(w).length === 1);
place(w, 13, 14, 6);
ok('two doors one house', houses(w).length === 1);
buildHouse(w, 30, 30);
ok('two separate houses', houses(w).length === 2);
w = makeWorld();
for (let i = 0; i < 10; i++) buildHouse(w, 1 + (i % 4) * 11, 1 + Math.floor(i / 4) * 11);
ok('islander cap at 8', houses(w).length === 8, houses(w).length);
w = makeWorld(); buildHouse(w, 20, 20); buildHouse(w, 5, 36);
const w2 = decode(encode(w));
ok('houses survive the link', w2 && houses(w2).length === 2);
ok('house anchors identical', JSON.stringify(houses(w2)) === JSON.stringify(houses(w)));
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
