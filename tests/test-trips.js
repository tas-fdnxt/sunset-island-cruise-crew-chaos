/* D1 PASSENGERS: an islander boards the stopped car, asks for a real place by name
   and compass direction, and pays one coin on arrival. The suite is the spec. */
const C = require('./isle-core.js');
let n = 0, f = [];
function ck(name, ok, got) { n++; if (!ok) f.push(name + ' :: ' + JSON.stringify(got)); }

/* compass words hold for trips */
ck('north word', C.compassOf({x:20,y:20},{x:10,y:10}) === 'north', 0);
ck('south word', C.compassOf({x:10,y:10},{x:20,y:20}) === 'south', 0);
ck('east word',  C.compassOf({x:10,y:20},{x:20,y:10}) === 'east', 0);
ck('west word',  C.compassOf({x:20,y:10},{x:10,y:20}) === 'west', 0);

/* a world with two houses, a flag and an arcade */
const w = C.makeWorld();
function house(ox, oy) {
  for (let x = ox; x <= ox+2; x++) for (let y = oy; y <= oy+2; y++)
    if (x===ox||x===ox+2||y===oy||y===oy+2) { C.place(w,x,y,3); C.place(w,x,y,3); }
  C.place(w, ox+1, oy, 6);
}
house(40, 40); house(60, 60);
C.place(w, 50, 50, 9);
C.place(w, 44, 56, 10);
const hs = C.houses(w);
ck('two houses stand', hs.length === 2, hs.length);

const HAS = typeof C.tripDest === 'function' && typeof C.tripLine === 'function';
ck('trip functions exported', HAS, Object.keys(C).length);
/* destinations are real things, never the rider's own house */
if (HAS) {
const from = { x: hs[0].x, y: hs[0].y };
const kinds = {}, seen = {};
for (let s = 0; s < 24; s++) {
  const d = C.tripDest(w, from, s);
  ck('dest exists s'+s, !!d, s);
  if (!d) continue;
  kinds[d.kind] = 1; seen[d.x+','+d.y] = 1;
  ck('never own house s'+s, !(Math.abs(d.x-from.x)<=1 && Math.abs(d.y-from.y)<=1), [d.x,d.y]);
  ck('dest is real s'+s,
    (d.kind==='house' && hs.some(h=>h.x===d.x&&h.y===d.y)) ||
    (d.kind==='flag' && d.x===50 && d.y===50) ||
    (d.kind==='arcade' && d.x===44 && d.y===56), d);
}
ck('at least two kinds over seeds', Object.keys(kinds).length >= 2, kinds);
ck('deterministic by seed', JSON.stringify(C.tripDest(w,from,7)) === JSON.stringify(C.tripDest(w,from,7)), 0);

/* the ask carries the name, the place and the direction */
const d7 = C.tripDest(w, from, 7);
const line = C.tripLine('MARU', from, d7, 'CAPTAIN');
ck('line has name', line.indexOf('MARU') >= 0, line);
ck('line has title', line.indexOf('CAPTAIN') >= 0, line);
const dir = C.compassOf(from, d7);
ck('line has direction', dir === '' || line.indexOf(dir) >= 0, line);

/* empty island: no destinations, no crash */
const w0 = C.makeWorld();
ck('empty island no dest', C.tripDest(w0, {x:64,y:64}, 1) === null, 0);

}
/* quest */
const qt = C.questTable(-1);
const tr = qt.filter(q => q.id === 'trip1');
ck('trip1 exists once', tr.length === 1, tr.length);
ck('trip1 need', tr.length && tr[0].need === 'tripsToday' && tr[0].n === 2, tr[0]);
ck('trip1 met', C.questMet(tr[0], { tripsToday: 2 }), 0);
ck('trip1 not met', !C.questMet(tr[0], { tripsToday: 1 }), 0);

/* chapter: the line appears only when trips happened */
const base = { name: 'OLLIE', title: 'CAPTAIN', stats: { blocks: 5 }, prevStats: {}, learned: [], tripsToday: 0 };
const flat = pages => pages.map(pg => pg.lines.join(' ')).join(' ');
const c0 = flat(C.chapter(base));
ck('no trips no passenger word', c0.indexOf('passenger') < 0, 0);
const c2 = flat(C.chapter(Object.assign({}, base, { tripsToday: 2 })));
ck('two trips told', c2.indexOf('passenger') >= 0 && c2.indexOf('2') >= 0, c2.slice(0,120));
const c1 = flat(C.chapter(Object.assign({}, base, { tripsToday: 1 })));
ck('one trip told singular', c1.indexOf('passenger') >= 0, 0);

console.log('CHECKS ' + n + '   FAILED ' + f.length);
f.forEach(x => console.log('  FAILED: ' + x));
process.exit(f.length ? 1 : 0);
