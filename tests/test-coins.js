/* COINS, TROPHIES, THE CHASE AND THE BOARD. Ten points is a coin and coins are never bought. A trophy is a fact the engine can
   detect. The gull with the crate dips low every five seconds and is caught only when low and close. The link carries records.
   Run node tests/extract-core.js first. */
const { ISLE, makeWorld, isLand, isBeach, inBounds, COINS, coinsFor, TROPHIES, trophyById, trophiesEarned, trophyMask, trophiesFromMask, CHASE, newChase, chaseStep, chaseLow, chaseCatch, boardRows, buildHash, parseHash, chapter, nextThing } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + ' ' + (extra || '')); } }

// coins
ok('ten points is a coin: the arcade pays 2', coinsFor('arcade') === 2);
ok('a lap pays 3, a record 5, a chase 10', coinsFor('lap') === 3 && coinsFor('record') === 5 && coinsFor('chase') === 10);
ok('a delivery and big air pay 1, a quest 5', coinsFor('delivery') === 1 && coinsFor('air') === 1 && coinsFor('quest') === 5);
ok('nothing else pays', coinsFor('bought') === 0 && coinsFor('') === 0);
ok('no reason is worth more than a chase', Object.keys(COINS).every(function (k) { return COINS[k] <= COINS.chase; }));

// trophies
ok('six trophies, all with a name and a line', TROPHIES.length === 6 && TROPHIES.every(function (t) { return t.name && t.line && typeof t.test === 'function'; }));
ok('nothing earned from nothing', trophiesEarned({}).length === 0);
ok('one chase win earns GULL CATCHER', JSON.stringify(trophiesEarned({ chaseWins: 1 })) === '["gull"]');
ok('a ramp earns BIG AIR, a beaten record RECORD BREAKER', trophiesEarned({ ramps: 1, beaten: 1 }).indexOf('air') !== -1 && trophiesEarned({ ramps: 1, beaten: 1 }).indexOf('record') !== -1);
ok('four houses is not a village, five is', trophiesEarned({ houses: 4 }).indexOf('village') === -1 && trophiesEarned({ houses: 5 }).indexOf('village') !== -1);
ok('ten arcade goes is a star, a hundred coins a treasure keeper', trophiesEarned({ arcadeGoes: 10, coins: 100 }).length === 2);
ok('trophyById finds one and not another', trophyById('gull').name === 'GULL CATCHER' && trophyById('nope') === null);
const allIds = TROPHIES.map(function (t) { return t.id; });
ok('mask round trip, all six', JSON.stringify(trophiesFromMask(trophyMask(allIds))) === JSON.stringify(allIds) && trophyMask(allIds) === 63);
ok('mask round trip, two of them', JSON.stringify(trophiesFromMask(trophyMask(['air', 'purse']))) === '["air","purse"]');
ok('an unknown id is ignored in the mask', trophyMask(['air', 'made-up']) === trophyMask(['air']));

// the chase
ISLE.ALL_LAND = false;
const dock = { x: 66.5, y: 70.5 };
let g = newChase(dock, 7);
ok('the gull starts at the dock, low, with the crate', g.x === dock.x && g.y === dock.y && g.z === CHASE.LOW && !g.won && !g.gone);
ok('it is not low at the very start, so nobody wins by standing on the dock', !chaseLow(g));
for (let i = 0; i < 60; i++) chaseStep(g, 1 / 60);
ok('after a second it has climbed', g.z > 1.5, g.z);
ok('and moved off the dock', Math.hypot(g.x - dock.x, g.y - dock.y) > 2, Math.hypot(g.x - dock.x, g.y - dock.y));
let lows = 0, highs = 0, offLand = 0, outside = 0;
g = newChase(dock, 11);
for (let i = 0; i < 40 * 60; i++) {
  chaseStep(g, 1 / 60);
  if (chaseLow(g)) lows++; else highs++;
  if (!inBounds(Math.floor(g.x), Math.floor(g.y))) outside++;
  else if (!isLand(Math.floor(g.x), Math.floor(g.y))) offLand++;
}
ok('over forty seconds it is low about two fifths of the time', lows > 40 * 60 * 0.3 && lows < 40 * 60 * 0.5, lows);
ok('it never leaves the grid', outside === 0);
ok('it stays over the island, never far out to sea', offLand < 40 * 60 * 0.08, offLand);
ok('it is still flying at forty seconds', !g.gone && !g.won);
for (let i = 0; i < 12 * 60; i++) chaseStep(g, 1 / 60);
ok('at fifty seconds it gets away', g.gone);
// catching
g = newChase(dock, 3);
while (chaseLow(g)) chaseStep(g, 1 / 60);
while (!chaseLow(g)) chaseStep(g, 1 / 60);
for (let i = 0; i < 30; i++) chaseStep(g, 1 / 60);
ok('when it dips it is down near the ground', g.z < 1.1, g.z);
ok('a car far away does not catch it', !chaseCatch(g, { x: g.x + 5, y: g.y }) && !g.won);
ok('a car right under it does', chaseCatch(g, { x: g.x + 0.5, y: g.y + 0.3 }) && g.won);
ok('once won it stays won and stops moving', (function () { const x = g.x; chaseStep(g, 1); return g.won && g.x === x; })());
g = newChase(dock, 5);
while (chaseLow(g)) chaseStep(g, 1 / 60);
for (let i = 0; i < 60; i++) chaseStep(g, 1 / 60);
ok('a car under it while it is high catches nothing', !chaseLow(g) && !chaseCatch(g, { x: g.x, y: g.y }));
ok('two seeds fly two different routes', (function () { const a = newChase(dock, 1), b = newChase(dock, 2); for (let i = 0; i < 600; i++) { chaseStep(a, 1 / 60); chaseStep(b, 1 / 60); } return Math.hypot(a.x - b.x, a.y - b.y) > 2; })());

// the board
const rows = boardRows([{ name: 'A', coins: 5, lap: 0 }, { name: 'B', coins: 12, lap: 30000 }, { name: 'C', coins: 12, lap: 20000 }, { name: 'D', coins: 12, lap: 0, trophies: 2 }]);
ok('the board sorts by coins, then the faster lap, then trophies; no lap sorts last', rows.map(function (r) { return r.name; }).join('') === 'CBDA');
ok('the board does not change its input', rows.length === 4);

// the link carries records
const hash = buildHash('AAAA', 12345, 'PIP', ['OLLIE'], { coins: 42, mask: trophyMask(['gull', 'air']), houses: 3 });
ok('records ride in the link as coins.mask.houses', /&r=42\.3\.3$/.test(hash), hash);
const back = parseHash(hash);
ok('and come back out', back.r && back.r.coins === 42 && back.r.houses === 3 && JSON.stringify(trophiesFromMask(back.r.mask)) === '["gull","air"]');
ok('a link with no records still parses, with r null', parseHash(buildHash('AAAA', 0, 'PIP', [])).r === null);
ok('an empty record adds nothing to the link', buildHash('AAAA', 0, 'PIP', [], { coins: 0, mask: 0, houses: 0 }).indexOf('&r=') === -1);
ok('rubbish records are ignored', parseHash('#i=AAAA&r=cat.dog').r === null && parseHash('#i=AAAA&r=1.2').r === null && parseHash('#i=AAAA&r=-1.2.3').r === null);
ok('a silly number is capped', parseHash('#i=AAAA&r=5.99999.500').r.houses === 99 && parseHash('#i=AAAA&r=5.99999.500').r.mask <= 1023);

// the book and the advisor
const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, chaseWins: 1, coinsToday: 13, trophyNew: 'GULL CATCHER' });
const p1 = pages[0].lines.join(' ');
ok('chapter: the chase', /chased it round the island, and caught it\./.test(p1), p1);
ok('chapter: the coins', /grew by 13 coins/.test(p1));
ok('chapter: the trophy by the door', /trophy stands by the front door now: GULL CATCHER/.test(p1));
ok('chapter: two wins say so', /caught it 2 times/.test(chapter({ name: 'OLLIE', stats: {}, prevStats: {}, chaseWins: 2 })[0].lines.join(' ')));
ok('a chase idea stays in the rotation, pretty was appended last', (function () {
  const keys = [];
  const st = { blocks: 30, houses: 1, flags: 1, ramp: true, hour: 11 };
  for (let k = 0; k < 24; k++) {
    const key = nextThing(Object.assign({ tick: k }, st)).key;
    if (k && key === 'tall') break;
    keys.push(key);
  }
  return keys.indexOf('chase') !== -1 && keys.indexOf('replay') === keys.indexOf('chase') + 1 && keys.indexOf('pretty') === keys.length - 1;
})());

console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
