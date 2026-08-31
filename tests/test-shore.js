const core = require('./isle-core.js');
const { ISLE, makeWorld, place, erase, encode, decode, isLand, isBeach, shoreR, linkLength, idx, houses } = core;
ISLE.ALL_LAND = false; // this suite tests the real island with the sea around it
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
ok('the island is 128 wide, eight high, a thousand blocks', ISLE.N === 128 && ISLE.ZMAX === 8 && ISLE.MAX_BLOCKS === 1000);
ok('the middle is land', isLand(64, 64) && !isBeach(64, 64));
ok('the corners are sea', !isLand(0, 0) && !isLand(127, 127) && !isLand(0, 127) && !isLand(127, 0));
ok('the old 64 grid, centred, is all land', (function () { for (let x = 32; x < 96; x++) for (let y = 32; y < 96; y++) if (!isLand(x, y)) return false; return true; })());
let land = 0, beach = 0; for (let x = 0; x < 128; x++) for (let y = 0; y < 128; y++) { if (isLand(x, y)) land++; if (isBeach(x, y)) beach++; }
ok('roughly a round island: about half the grid is land', land > 7000 && land < 11000, land);
ok('a ring of beach', beach > 500 && beach < 2000, beach);
ok('out of bounds is not land', !isLand(-1, 5) && !isLand(5, 128));
let w = makeWorld();
ok('cannot build on the sea', !place(w, 2, 2, 3).ok && place(w, 2, 2, 3).why === 'water');
let by = 127; while (by > 64 && !isBeach(64, by)) by--;
ok('can build on the beach', isBeach(64, by) && place(w, 64, by, 3).ok, by);
ok('can build in the middle', place(w, 64, 64, 3).ok);
// v1 links open, centred
const v1 = Buffer.from([1, 0, 5, 5, (0 << 4) | 3, 5, 5, (1 << 4) | 7, 63, 63, (3 << 4) | 9]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const old = decode(v1);
ok('a first-format link still opens', !!old && old.count === 3);
ok('and lands in the middle of the bigger island', old && old.cols[idx(37, 37, 0)] === 3 && old.cols[idx(37, 37, 1)] === 7 && old.cols[idx(95, 95, 3)] === 9);
ok('v1 out of its own grid rejected', decode(Buffer.from([1, 0, 70, 5, 3]).toString('base64')) === null);
ok('v1 too tall rejected', decode(Buffer.from([1, 0, 5, 5, (4 << 4) | 3]).toString('base64')) === null);
// v2 roundtrip on a full island of houses
w = makeWorld();
function house(ox, oy) { for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) { const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4); if (e) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : ((x + y) % 2 ? 5 : 3)); } place(w, x, y, 7); } }
for (let oy = 40; oy < 68; oy += 7) for (let ox = 40; ox < 68; ox += 7) house(ox, oy);
for (let z = 0; z < 8; z++) place(w, 80, 80, 4);
ok('a big island of houses fits the cargo', w.count > 900 && w.count <= 1000, w.count);
const enc = encode(w);
ok('and its link is under budget', enc.length < ISLE.LINK_MAX, enc.length);
const back = decode(enc);
ok('v2 roundtrip is exact', back && back.count === w.count && Buffer.from(back.cols).equals(Buffer.from(w.cols)));
ok('houses survive the link', houses(back).length === houses(w).length);
ok('an eight-high tower survives', back.cols[idx(80, 80, 7)] === 4);
// hostile v2
ok('garbage rejected', decode('zzzz') === null && decode('') === null);
ok('column count past the grid rejected', decode(Buffer.from([2, 0, 255, 255, 1]).toString('base64')) === null);
ok('missing nibbles rejected', decode(Buffer.from([2, 0, 0, 2, 1, 1]).toString('base64')) === null);
ok('height of zero rejected', decode(Buffer.from([2, 1, 0, 1, 1, 0x00]).toString('base64')) === null);
ok('id beyond the table rejected', decode(Buffer.from([2, 0, 0, 1, 1, 0x1F]).toString('base64')) === null);
ok('trailing nibbles rejected', decode(Buffer.from([2, 0, 0, 1, 1, 0x13, 0x33]).toString('base64')) === null);
// the link gate
w = makeWorld();
let r = null, n = 0;
outer: for (let y = 30; y < 100; y += 2) for (let x = 30; x < 100; x += 2) { r = place(w, x, y, 1); if (!r.ok) break outer; n++; }
ok('a scattered carpet is refused by the link gate, not the cargo cap', r && !r.ok && r.why === 'link' && w.count < ISLE.MAX_BLOCKS && w.count > 600, r && r.why + ' ' + w.count);
ok('the gate never leaves the world dirty', linkLength(w) <= ISLE.LINK_MAX);
ok('erase still works after the gate', erase(w, 40, 40).ok);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
