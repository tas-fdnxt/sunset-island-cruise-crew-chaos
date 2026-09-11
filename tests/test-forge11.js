// FORGE 11: THE CAPTAIN'S CONTROLS. Written red first.
// Uncle Tabs, 11 Sep 2026: "Buttons like a Mac dock... extras pop up and go back."
// Ollie: "I'm trying to press it. Nothing happens."  Ollie on his iPad: DREAM, HELP and SHARE were off the edge.
// dockPlan(w, h, remixOn) is the one honest answer to "does the whole dock fit this screen".
const { dockPlan, PHONE_CAP } = require('./isle-core.js');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; } else { fail++; console.log('FAIL', name, info === undefined ? '' : info); } }

ok('dockPlan exists', typeof dockPlan === 'function');
if (typeof dockPlan === 'function') {
  const IPADS = [[768, 1024], [1024, 768], [744, 1133], [1133, 744], [820, 1180], [1180, 820], [834, 1194], [1194, 834], [1024, 1366], [1366, 1024]];
  IPADS.forEach(function (s) {
    [false, true].forEach(function (remix) {
      const p = dockPlan(s[0], s[1], remix), tag = s[0] + 'x' + s[1] + (remix ? ' visiting' : '');
      const ids = p.items.map(function (i) { return i.id; });
      ok(tag + ': the whole dock fits, no swiping', p.scroll === false && p.total <= s[0], JSON.stringify({ scroll: p.scroll, total: p.total }));
      ok(tag + ': every tool is big enough for his finger', p.items.every(function (i) { return i.w >= 60 && i.h >= 60; }), JSON.stringify(p.items));
      ok(tag + ': PLAY and DREAM stay the heroes', p.items.filter(function (i) { return i.id === 'play' || i.id === 'dream'; }).every(function (i) { return i.w >= 96; }));
      ok(tag + ': the block in his hand stays the biggest tool', p.items.filter(function (i) { return i.id === 'cur'; })[0].w >= 88);
      ['undo', 'cur', 'erase', 'walk', 'drive', 'play', 'dream', 'help'].forEach(function (id) { ok(tag + ': ' + id + ' is on the dock', ids.indexOf(id) !== -1, ids.join()); });
      ok(tag + ': HELP sits right beside DREAM', ids.indexOf('help') === ids.indexOf('dream') + 1, ids.join());
      ok(tag + ': SHARE is not squeezed onto his dock', ids.indexOf('share') === -1, ids.join());
      ok(tag + ': REMIX only when visiting', (ids.indexOf('remix') !== -1) === remix, ids.join());
      ok(tag + ': the total is honest', p.total === p.pad * 2 + p.items.reduce(function (a, i) { return a + i.w; }, 0) + (p.items.length - 1) * p.gap, p.total);
    });
  });
  // Taught 12 Sep 2026 (Forge 11b). Uncle Tabs: "The buttons are still too big... for mobile phone is not good enough."
  // The phone used to keep 76 to 120 point buttons and scroll, so PLAY, DREAM and HELP hid behind a swipe.
  const PHONES = [[360, 780], [375, 667], [375, 812], [390, 844], [393, 852], [412, 915], [430, 932], [844, 390], [932, 430]];
  PHONES.forEach(function (s) {
    [false, true].forEach(function (remix) {
      const p = dockPlan(s[0], s[1], remix), tag = 'phone ' + s[0] + 'x' + s[1] + (remix ? ' visiting' : '');
      const ids = p.items.map(function (i) { return i.id; });
      const tools = p.items.filter(function (i) { return i.id !== 'cur' && i.id !== 'play' && i.id !== 'dream'; });
      const cur = p.items.filter(function (i) { return i.id === 'cur'; })[0], play = p.items.filter(function (i) { return i.id === 'play'; })[0];
      ok(tag + ': the whole dock fits, no swiping', p.scroll === false && p.total <= s[0], JSON.stringify({ scroll: p.scroll, total: p.total }));
      ok(tag + ': phone buttons are phone sized, not iPad sized', tools.every(function (i) { return i.w >= 36 && i.w <= 60 && i.h >= 40 && i.h <= 66; }), JSON.stringify(tools));
      ok(tag + ': PLAY and DREAM stay the biggest', play.w > cur.w && cur.w > tools[0].w, JSON.stringify([play, cur, tools[0]]));
      ['undo', 'cur', 'erase', 'walk', 'drive', 'play', 'dream', 'help'].forEach(function (id) { ok(tag + ': ' + id + ' is on the dock', ids.indexOf(id) !== -1, ids.join()); });
      ok(tag + ': HELP sits right beside DREAM', ids.indexOf('help') === ids.indexOf('dream') + 1, ids.join());
      ok(tag + ': SHARE lives on the side', ids.indexOf('share') === -1, ids.join());
      ok(tag + ': REMIX sits on the side on a phone, never on the dock', ids.indexOf('remix') === -1, ids.join());
      ok(tag + ': the total is honest', p.total === p.pad * 2 + p.items.reduce(function (a, i) { return a + i.w; }, 0) + (p.items.length - 1) * p.gap, p.total);
    });
  });
  ok('PHONE_CAP stays as the record of the old phone sizes', PHONE_CAP.TOOL_W === 76);
  ok('a nonsense screen falls back to a small phone plan that fits 360', dockPlan(undefined, undefined, false).total <= 360);
}

console.log('test-forge11: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
