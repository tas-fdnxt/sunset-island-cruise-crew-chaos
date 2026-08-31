const { ISLE, makeWorld, place, erase, undo, encode, decode, idx, houses, arcades, factories, factorySpot, giftFactory, worldStats, questTable, pickQuest, questMet, chapter, buildHash } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(n, c, i) { if (c) pass++; else { fail++; console.log('FAIL', n, i || ''); } }
function house(w, ox, oy) {
  for (let x = ox; x <= ox + 4; x++) for (let y = oy; y <= oy + 4; y++) {
    const e = (x === ox || x === ox + 4 || y === oy || y === oy + 4);
    if (e) { place(w, x, y, 3); place(w, x, y, (x === ox + 2 && y === oy + 4) ? 6 : 4); }
  }
}

// types
ok('ARCADE is id 10', ISLE.TYPES[10] && ISLE.TYPES[10].name === 'ARCADE');
ok('FACTORY is id 11', ISLE.TYPES[11] && ISLE.TYPES[11].name === 'FACTORY');
ok('ids fit the 4 bit codec field', ISLE.TYPES.length - 1 <= 15);

// placing and detecting
let w = makeWorld();
ok('place arcade', place(w, 10, 10, 10).ok);
ok('place factory', place(w, 20, 20, 11).ok);
ok('arcades detected', arcades(w).length === 1 && arcades(w)[0].x === 10);
ok('factories detected', factories(w).length === 1 && factories(w)[0].y === 20);
ok('stats carry arcades and factories', worldStats(w).arcades === 1 && worldStats(w).factories === 1);
ok('a factory alone is not a house', houses(w).length === 0);

// codec: new ids survive the link, old links still load, unknown ids rejected
const enc = encode(w);
const back = decode(enc);
ok('roundtrip keeps new ids', back && back.cols[idx(10, 10, 0)] === 10 && back.cols[idx(20, 20, 0)] === 11);
const old = makeWorld(); place(old, 1, 1, 1); place(old, 2, 2, 9);
ok('old style link still decodes', decode(encode(old)).count === 2);
const bad = Buffer.from([1, 0, 5, 5, 12]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
ok('id 12 rejected by decoder', decode(bad) === null);
const full = makeWorld();
let lastR = null;
for (let i = 0; i < ISLE.MAX_BLOCKS; i++) { lastR = place(full, i % 64, Math.floor(i / 64), 11); if (!lastR.ok) break; }
ok('a carpet of single blocks hits the link gate before the cargo cap', !lastR.ok && lastR.why === 'link' && full.count > 600);
ok('the link stays under budget with a record and a full chain', buildHash(encode(full), 599999, 'CAPTAINABC', ['AAAAAAAAAA', 'BBBBBBBBBB', 'CCCCCCCCCC']).length < 2000);

// the gift: three houses make a village, a village gets a factory
w = makeWorld();
house(w, 5, 5); house(w, 20, 5);
ok('no spot before three houses', factorySpot(w) === null);
ok('no gift before three houses', giftFactory(w) === null && factories(w).length === 0);
house(w, 35, 5);
ok('three houses detected', houses(w).length === 3);
const sp = factorySpot(w);
ok('spot exists at three houses', !!sp);
ok('spot is open ground', sp && w.cols[idx(sp.x, sp.y, 0)] === 0);
ok('spot is not inside a house', sp && houses(w).every(h => Math.max(Math.abs(h.x - sp.x), Math.abs(h.y - sp.y)) >= 5));
const before = w.count, undoLen = w.undo.length;
const g = giftFactory(w);
ok('gift places a factory', g && g.ok && g.id === 11 && factories(w).length === 1);
ok('gift counts as cargo', w.count === before + 1);
ok('gift is not undoable', w.undo.length === undoLen);
ok('undo after gift removes the last hand placed block, not the factory', (undo(w), factories(w).length === 1));
ok('second gift refused while one stands', giftFactory(w) === null);
const fx = factories(w)[0];
ok('gift can be erased like any block', erase(w, fx.x, fx.y).ok && factories(w).length === 0);
ok('houses unchanged by the gift and its removal', houses(w).length === 3);
const crowded = makeWorld();
house(crowded, 5, 5); house(crowded, 20, 5); house(crowded, 35, 5);
for (let i = crowded.count; i < ISLE.MAX_BLOCKS; i++) place(crowded, 60, 60 - (i % 40), 1);
ok('gift refused when cargo is full', crowded.count >= ISLE.MAX_BLOCKS ? giftFactory(crowded) === null : true);

// quests and story
const t = questTable();
ok('arcade quest maps to a stat', t.some(q => q.id === 'arcade' && q.need === 'arcades'));
ok('factory quest maps to a stat', t.some(q => q.id === 'choco' && q.need === 'factories'));
const st = worldStats(w);
ok('factory quest met when a factory stands', (place(w, 50, 50, 11), questMet(t.find(q => q.id === 'choco'), worldStats(w))));
const pages = chapter({ name: 'OLLIE', stats: { blocks: 80, houses: 3, arcades: 1, factories: 1 },
  prevStats: { blocks: 40, houses: 2, arcades: 0, factories: 0 }, newIslanders: [], learned: [], arcadePlays: 4,
  quest: t.find(q => q.id === 'arcade') });
const all = pages[0].lines.join(' ');
ok('story reports the arcade', all.indexOf('arcade machine lit up') !== -1);
ok('story reports the factory', all.indexOf('chocolate factory opened') !== -1);
ok('story counts the dings', all.indexOf('DING 4 times') !== -1);
const quiet = chapter({ name: 'OLLIE', stats: { arcades: 1, factories: 1 }, prevStats: { arcades: 1, factories: 1 }, quest: t[0] });
ok('no repeat announcement on a quiet day', quiet[0].lines.join(' ').indexOf('lit up') === -1 && quiet[0].lines.join(' ').indexOf('opened its doors') === -1);
console.log('RESULT:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
