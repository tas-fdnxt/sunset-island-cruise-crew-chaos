/* WALK. The island on foot. Floors, stepping up one block, gravity and jumping, the sea as a wall, spawning near home, and the
   mesh that draws the world (every exposed face, none hidden). Run node tests/extract-core.js first. */
const { ISLE, makeWorld, place, idx, WALK, floorAt, footprintFloor, walkStep, walkSpawn, buildWalkMesh, hexRGB, isLand, chapter, nextThing } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + ' ' + (extra || '')); } }
function run(w, p, inp, seconds) { for (let i = 0; i < seconds * 60; i++) walkStep(w, p, inp, 1 / 60); return p; }
function walker(x, y, yaw) { return { x: x, y: y, z: 0, vz: 0, yaw: yaw || 0, pitch: 0, onGround: true, steps: 0, jumps: 0 }; }

ISLE.ALL_LAND = false;
const w = makeWorld();
ok('empty sand is floor 0', floorAt(w, 64.5, 64.5) === 0);
ok('the sea is no floor at all', floorAt(w, 2.5, 2.5) === null && !isLand(2, 2));
ok('outside the grid is no floor', floorAt(w, -1, 5) === null);
place(w, 70, 64, 3); place(w, 70, 64, 3);
ok('two blocks is floor 2', floorAt(w, 70.5, 64.5) === 2);
place(w, 72, 64, 12);
ok('a seed is walked over', floorAt(w, 72.5, 64.5) === 0);
place(w, 74, 64, 12); w.cols[idx(74, 64, 0)] = 13;
ok('a sprout is walked over', floorAt(w, 74.5, 64.5) === 0);
w.cols[idx(74, 64, 0)] = 14;
ok('a tree is one block of floor', floorAt(w, 74.5, 64.5) === 1);
ok('footprint takes the highest corner', footprintFloor(w, 70.5 + WALK.R + 0.01, 64.5) === 2 && footprintFloor(w, 71.5, 64.5) === 0);
ok('footprint over the sea is null', footprintFloor(w, 3.5, 3.5) === null);

// walking on the flat
let p = run(w, walker(64.5, 64.5, 0), { fwd: 1 }, 1);
ok('a second forward walks about three and a half blocks east', p.x > 67.5 && p.x < 68.5 && Math.abs(p.y - 64.5) < 0.01, p.x);
ok('steps are counted', p.steps > 3 && p.steps < 4);
p = run(w, walker(64.5, 64.5, Math.PI / 2), { fwd: 1 }, 1);
ok('yaw turns the walk', p.y > 67.5 && Math.abs(p.x - 64.5) < 0.01);
p = run(w, walker(64.5, 64.5, 0), { side: 1 }, 1);
ok('strafing goes to the right of the facing', p.y > 67.5 && Math.abs(p.x - 64.5) < 0.01, p.y);
p = run(w, walker(64.5, 64.5, 0), { fwd: 1, run: true }, 1);
ok('running is faster', p.x > 69);

// one block is a step, two is a wall
const w2 = makeWorld(); place(w2, 66, 64, 2);
p = run(w2, walker(64.5, 64.5, 0), { fwd: 1 }, 0.5);
ok('one block high is stepped onto', p.x > 66 && p.x < 67 && p.z === 1 && p.onGround, JSON.stringify(p));
place(w2, 68, 64, 4); place(w2, 68, 64, 4);
p = run(w2, walker(64.5, 64.5, 0), { fwd: 1 }, 2);
ok('two blocks high is a wall after stepping back down', p.x < 68 - WALK.R + 0.01 && p.x > 67.5 && p.z === 0, JSON.stringify(p));
place(w2, 64, 62, 3); place(w2, 64, 62, 3); place(w2, 64, 62, 3);
p = run(w2, walker(64.5, 64.5, -Math.PI / 2), { fwd: 1 }, 2);
ok('three blocks high is a wall', p.y > 62 + 1 - WALK.R - 0.02 && p.z === 0, JSON.stringify(p));
p = run(w2, walker(66.5, 64.5, Math.PI), { fwd: 1 }, 1);
ok('stepping off a block drops to the sand', p.x < 65.5 && p.z === 0 && p.onGround);

// the sea and the edge
const w3 = makeWorld();
p = run(w3, walker(64.5, 64.5, Math.PI), { fwd: 1 }, 30);
ok('walking west for thirty seconds stops at the beach, never in the sea', isLand(Math.floor(p.x), Math.floor(p.y)) && p.x < 20, p.x);
ISLE.ALL_LAND = true;
p = run(makeWorld(), walker(2.5, 2.5, Math.PI), { fwd: 1 }, 3);
ok('the grid edge is a wall too', p.x >= WALK.R - 0.01 && p.x < 2.6, p.x);
ISLE.ALL_LAND = false;

// jumping
p = walker(64.5, 64.5, 0);
walkStep(w3, p, { jump: true }, 1 / 60);
ok('a jump leaves the ground', !p.onGround && p.vz > 0 && p.jumps === 1);
let top = 0; for (let i = 0; i < 90; i++) { walkStep(w3, p, {}, 1 / 60); top = Math.max(top, p.z); }
ok('the jump peaks about a block up and lands', top > 0.9 && top < 1.3 && p.z === 0 && p.onGround, top);
walkStep(w3, p, { jump: true }, 1 / 60); walkStep(w3, p, { jump: true }, 1 / 60);
ok('no double jump in the air', p.jumps === 2);
const w4 = makeWorld(); place(w4, 66, 64, 3); place(w4, 66, 64, 3);
p = walker(64.9, 64.5, 0); walkStep(w4, p, { jump: true }, 1 / 60);
run(w4, p, { fwd: 1 }, 1.2);
ok('a jump does not clear a two block wall, on purpose', p.x < 66 - WALK.R + 0.02 && p.z === 0, JSON.stringify(p));

// spawn
ISLE.ALL_LAND = false;
const w5 = makeWorld();
let sp = walkSpawn(w5);
ok('empty island spawns in the middle, on the sand', sp.z === 0 && Math.abs(sp.x - 64.5) < 1 && sp.onGround);
for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) { place(w5, 70 + dx, 70 + dy, 3); place(w5, 70 + dx, 70 + dy, 3); }
w5.cols[idx(70, 71, 0)] = 6;
sp = walkSpawn(w5);
ok('with a house, spawn a few steps from its door, facing it', Math.hypot(sp.x - 70.5, sp.y - 71.5) > 2 && Math.hypot(sp.x - 70.5, sp.y - 71.5) < 6 && Math.cos(sp.yaw) * (70.5 - sp.x) + Math.sin(sp.yaw) * (71.5 - sp.y) > 0, JSON.stringify(sp));
ok('spawn floor is real', footprintFloor(w5, sp.x, sp.y) === sp.z);

// the mesh
const w6 = makeWorld();
const m0 = buildWalkMesh(w6, '#FFF3E2');
let land = 0; for (let y = 0; y < ISLE.N; y++) for (let x = 0; x < ISLE.N; x++) if (isLand(x, y)) land++;
ok('empty island: one ground quad per land cell plus the skirt', m0.count >= land * 6 && m0.count < land * 6 + 4000 && m0.pos.length === m0.count * 3 && m0.col.length === m0.count * 3, m0.count + ' vs ' + land * 6);
place(w6, 64, 64, 3);
const m1 = buildWalkMesh(w6, '#FFF3E2');
ok('a lone block adds five faces: top and four sides', m1.count - m0.count === 30, m1.count - m0.count);
place(w6, 64, 64, 3);
const m2 = buildWalkMesh(w6, '#FFF3E2');
ok('a second block on top hides the first top: four new sides only', m2.count - m1.count === 24, m2.count - m1.count);
place(w6, 65, 64, 3);
const m3 = buildWalkMesh(w6, '#FFF3E2');
ok('a neighbour hides the shared face on both blocks', m3.count - m2.count === 18, m3.count - m2.count);
place(w6, 60, 60, 9);
const m4 = buildWalkMesh(w6, '#FF6E6C');
ok('a flag adds a pole and a banner both ways', m4.count - m3.count === 30 + 12, m4.count - m3.count);
const fc = hexRGB('#FF6E6C');
let bannerHit = false; for (let i = 0; i < m4.count; i++) if (Math.abs(m4.col[i * 3] - fc[0]) < 0.01 && Math.abs(m4.col[i * 3 + 1] - fc[1]) < 0.01) bannerHit = true;
ok('the banner is in the child\u2019s colour', bannerHit);
ok('no NaN anywhere in the mesh', !Array.from(m4.pos).some(isNaN) && !Array.from(m4.col).some(isNaN));
ok('hexRGB', JSON.stringify(hexRGB('#FF8000').map(v => Math.round(v * 255))) === '[255,128,0]');

// doors and windows are drawn as faces: a frame, a leaf or a pane, a handle or mullions, a sill
// faces are shaded by direction, so a colour matches when it is the same hue at any brightness between 0.6 and 1.1
function hasCol(m, hx) { const c = hexRGB(hx); for (let i = 0; i < m.count; i++) { const k = m.col[i * 3] / c[0]; if (k < 0.6 || k > 1.1) continue; if (Math.abs(m.col[i * 3 + 1] - c[1] * k) < 0.02 && Math.abs(m.col[i * 3 + 2] - c[2] * k) < 0.02) return true; } return false; }
const w7 = makeWorld(); const e0 = buildWalkMesh(w7, '#FFF3E2').count;
place(w7, 64, 64, 6);
const md = buildWalkMesh(w7, '#FFF3E2');
ok('a lone door is a top and four faces of four quads each', md.count - e0 === 6 + 4 * 24, md.count - e0);
ok('the door has a yellow handle', hasCol(md, '#FFD447'));
ok('the door has a wooden leaf', hasCol(md, '#96602F'));
let outside = 0; for (let i = 0; i < md.count; i++) { const x = md.pos[i * 3], y = md.pos[i * 3 + 1], z = md.pos[i * 3 + 2]; if (z > 0 && z <= 1 && (x < 63.96 || x > 65.04 || y < 63.96 || y > 65.04)) outside++; }
ok('door panels sit just outside the wall, never further than 0.04', outside === 0, outside);
let pushed = false; for (let i = 0; i < md.count; i++) { const y = md.pos[i * 3 + 1]; if (y < 64 && y > 63.9) pushed = true; }
ok('door panels are pushed off the face so they never fight it for depth', pushed);
const w8 = makeWorld(); place(w8, 64, 64, 5);
const mw = buildWalkMesh(w8, '#FFF3E2');
ok('a lone window is a top and four faces of four quads each', mw.count - e0 === 6 + 4 * 24, mw.count - e0);
ok('the window has cream mullions and a sky-blue pane', hasCol(mw, '#FFF3E2') && hasCol(mw, '#8FD8E8'));
place(w8, 65, 64, 4);
const mwb = buildWalkMesh(w8, '#FFF3E2');
ok('a brick beside the window hides the shared face on both: one window face and one brick face gone', mwb.count - mw.count === 30 - 6 - 24, mwb.count - mw.count);
const w9 = makeWorld(); place(w9, 64, 64, 4);
ok('a plain block is still five plain faces', buildWalkMesh(w9, '#FFF3E2').count - e0 === 30);

// the book and the advisor
const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, walked: 120, jumped: 3 });
ok('chapter: walked the island, steps and jumps', /walked the island on foot, 120 steps/.test(pages[0].lines.join(' ')) && /jumped 3 times/.test(pages[0].lines.join(' ')));
ok('a walk idea exists in the rotation', (function () { for (let k = 0; k < 12; k++) if (nextThing({ blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11, tick: k }).key === 'walk') return true; return false; })());

console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
