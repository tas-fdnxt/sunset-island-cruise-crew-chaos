const { PROFILE, buildProfile, parseProfile, questTable, pickQuest, worldStats, makeWorld, place, chapter, sanitizeName } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }

// tables
ok('seven titles', PROFILE.TITLES.length === 7);
ok('eight colours with hex', PROFILE.COLOURS.length === 8 && PROFILE.COLOURS.every(c => /^#[0-9A-F]{6}$/.test(c.hex)));
ok('three rides match the garage', PROFILE.RIDES.join() === 'RED ROCKET,SAND BUGGY,SEA CRUISER');
ok('seven dreams', PROFILE.DREAMS.length === 7);
ok('every dream quest maps to a real stat', PROFILE.DREAMS.every(d => ['houses', 'palms', 'flags', 'tallest', 'arcades', 'factories', 'grass'].indexOf(d.quest.need) !== -1));
ok('every dream quest has tell and done', PROFILE.DREAMS.every(d => d.quest.tell.length > 10 && d.quest.done.length > 5));
ok('three age bands, never a birth date', PROFILE.AGES.length === 3);

// roundtrip
const enc = buildProfile({ name: 'Mia', grownup: true, title: 2, colour: 6, ride: 2, dream: 3, age: 1 });
ok('encodes short', enc.length > 0 && enc.length <= 40, enc.length);
ok('url safe', /^[A-Za-z0-9_-]+$/.test(enc));
const p = parseProfile(enc);
ok('roundtrip name upper', p && p.name === 'MIA');
ok('roundtrip fields', p && p.grownup === true && p.title === 2 && p.colour === 6 && p.ride === 2 && p.dream === 3 && p.age === 1);
ok('title word cased', p && p.titleWord === 'Princess');
ok('hex from colour', p && p.hex === '#8C5BC9');
const self = parseProfile(buildProfile({ name: 'ollie', title: 0, colour: 0, ride: 0, dream: 0, age: 0 }));
ok('self made profile', self && self.grownup === false && self.name === 'OLLIE');

// sanitising and hostility
ok('name sanitised on build', parseProfile(buildProfile({ name: '<img src=x>Zoe!', title: 0 })).name === 'IMG SRCXZO');
ok('ten char cap', parseProfile(buildProfile({ name: 'ABCDEFGHIJKLMNOP' })).name.length === 10);
ok('empty name refused', buildProfile({ name: '   ' }) === '');
ok('out of range clamped', parseProfile(buildProfile({ name: 'A', title: 99, colour: -5, ride: 7, dream: 40, age: 9 })).title === 6);
ok('garbage rejected', parseProfile('not base64 at all!!') === null);
ok('empty rejected', parseProfile('') === null && parseProfile(null) === null);
ok('overlong rejected', parseProfile('A'.repeat(41)) === null);
const b64 = (arr) => Buffer.from(arr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
ok('bad version rejected', parseProfile(b64([2, 0, 0, 0, 0, 0, 0, 0, 0, 65])) === null);
ok('title index too big rejected', parseProfile(b64([1, 0, 7, 0, 0, 0, 0, 0, 0, 65])) === null);
ok('colour index too big rejected', parseProfile(b64([1, 0, 0, 8, 0, 0, 0, 0, 0, 65])) === null);
ok('lowercase name bytes rejected', parseProfile(b64([1, 0, 0, 0, 0, 0, 0, 0, 0, 109, 105, 97])) === null);
ok('script in name bytes rejected', parseProfile(b64([1, 0, 0, 0, 0, 0, 0, 0, 0, 60, 66, 62])) === null);
ok('no name rejected', parseProfile(b64([1, 0, 0, 0, 0, 0, 0, 0, 0])) === null);

// dream quest first, then the normal table
const t = questTable(3);
ok('dream quest first', t[0].id === 'dream' && t[0].need === 'factories');
ok('base table still follows', t.length === questTable().length + 1 && t[1].id === 'houses3');
ok('no dream when none', questTable(-1)[0].id === 'houses3' && questTable()[0].id === 'houses3');
let w = makeWorld();
ok('grass counted', (place(w, 1, 1, 1), place(w, 2, 1, 1), worldStats(w).grass === 2));
ok('garden quest unmet then met', !pickQuest(worldStats(w), null, 6).need || pickQuest(worldStats(w), null, 6).id === 'dream');
for (let i = 0; i < 10; i++) place(w, 10 + i, 3, 1);
ok('garden quest detected at ten grass', worldStats(w).grass >= 10 && pickQuest(worldStats(w), null, 6).id !== 'dream');
ok('pickQuest without dream unchanged', pickQuest({ houses: 0 }, null).id === 'houses3');

// story time speaks in their title
const pages = chapter({ name: 'MIA', title: 'PRINCESS', stats: { blocks: 5 }, prevStats: {}, quest: t[0] });
const all = pages.map(pg => pg.lines.join(' ')).join(' ');
ok('title in the first line', all.indexOf('Princess Mia woke up') !== -1);
ok('title in tomorrow line', all.indexOf('Tomorrow, Princess Mia is going to open a factory') !== -1);
ok('sleep well uses title', all.indexOf('Sleep well, Princess.') !== -1);
const def = chapter({ name: 'OLLIE', stats: {}, prevStats: {}, quest: t[1] });
ok('no title means Captain', def[0].lines[0].indexOf('Captain Ollie') === 0);
const nasty = chapter({ name: 'MIA', title: '<b>x</b>', stats: {}, prevStats: {}, quest: t[1] });
ok('hostile title falls back to Captain', nasty[0].lines[0].indexOf('Captain Mia') === 0);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
