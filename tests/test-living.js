const { skyAt, weatherAt, tideAt, routineAt, dayHash, mixHex, chapter, questTable, nextThing } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
ok('mix hex halfway', mixHex('#000000', '#FFFFFF', 0.5) === 'rgb(128,128,128)');
const noon = skyAt(12), night = skyAt(23), dawn = skyAt(6.5), sunset = skyAt(18.5);
ok('noon is day', noon.night === 0 && noon.sun && !noon.moon);
ok('night is night', night.night === 1 && !night.sun && night.moon);
ok('sunset keeps the sunset palette', sunset.night < 0.3 && sunset.sun);
ok('dawn is in between', dawn.night > 0.2 && dawn.night < 0.6);
ok('sun rises in the east and sets in the west', skyAt(7).sun.x < skyAt(12).sun.x && skyAt(12).sun.x < skyAt(18).sun.x);
ok('sun is highest at midday', skyAt(12.5).sun.y < skyAt(7).sun.y && skyAt(12.5).sun.y < skyAt(18).sun.y);
ok('sky is continuous across midnight', skyAt(23.99).top === skyAt(0).top);
ok('hours wrap', skyAt(25).night === skyAt(1).night && skyAt(-1).night === skyAt(23).night);
// weather is decided by the date
let rainy = 0;
for (let d = 1; d <= 100; d++) if (weatherAt('2026-09-' + String(d).padStart(2, '0'), 12).rainDay) rainy++;
ok('about a quarter of days have a shower', rainy > 12 && rainy < 40, rainy);
ok('same day, same weather, every device', weatherAt('2026-09-03', 14).kind === weatherAt('2026-09-03', 14).kind);
let found = null; for (let d = 1; d <= 60 && !found; d++) { const day = '2026-10-' + String(d).padStart(2, '0'); if (weatherAt(day, 12).rainDay) found = day; }
const wx = weatherAt(found, 12);
ok('a rainy day has a start between ten and six', wx.start >= 10 && wx.start <= 18, wx.start);
ok('it rains for two hours', weatherAt(found, wx.start + 0.5).kind === 'rain' && weatherAt(found, wx.start + 1.9).kind === 'rain' && weatherAt(found, wx.start + 2.1).kind !== 'rain');
ok('then a rainbow for an hour', weatherAt(found, wx.start + 2.5).kind === 'rainbow' && weatherAt(found, wx.start + 3.5).kind === 'clear');
ok('clear before it starts', weatherAt(found, wx.start - 1).kind === 'clear');
ok('a dry day never rains', !weatherAt('nope', 12).rainDay || weatherAt('nope', 12).start >= 10);
// tide
ok('tide breathes twice a day', Math.abs(tideAt(0) - tideAt(12)) < 0.01 && tideAt(3) > tideAt(9));
ok('tide stays on the beach', [0, 3, 6, 9, 12, 15, 18, 21].every(h => tideAt(h) >= 0 && tideAt(h) <= 3));
// routines
ok('asleep at night', routineAt(22) === 'sleep' && routineAt(2) === 'sleep' && routineAt(6) === 'sleep');
ok('arcade after school', routineAt(15.5) === 'arcade' && routineAt(17.9) === 'arcade');
ok('wandering the rest of the time', routineAt(9) === 'wander' && routineAt(13) === 'wander' && routineAt(19) === 'wander');
// chapter and advisor
const pages = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0], weather: { rainDay: true } });
ok('a rainy day is in the chapter', pages[0].lines.join(' ').indexOf('a rainbow stood over the sea') !== -1);
ok('a dry day is not', chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: questTable()[0], weather: { rainDay: false } })[0].lines.join(' ').indexOf('rainbow') === -1);
ok('advisor mentions the rain', nextThing({ blocks: 30, houses: 1, flags: 1, ramp: true, hour: 14, rain: true }).key === 'rain');
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
