// S2B GUARD. Pins the boot boundary and the sync wiring in the source itself.
const fs = require('fs');
const h = fs.readFileSync(process.argv[2] || 'island.html', 'utf8');
const j = fs.existsSync('join.html') ? fs.readFileSync('join.html', 'utf8') : '';
let P = 0, F = 0;
function t(c, what) { P += c ? 1 : 0; F += c ? 0 : 1; console.log((c ? 'PASS  ' : 'FAIL  ') + what); }
function count(s, re) { return (s.match(re) || []).length; }
t(/const MODE = \(SESSION && new URLSearchParams\(location\.search\)\.get\('s'\) === '1'\) \? 'SIGNED' : 'ANON';/.test(h), 'MODE is SIGNED only with a session AND ?s=1, otherwise ANON');
t(count(h, /const MODE = /g) === 1, 'the boot mode is decided in exactly one place');
const share = h.slice(h.indexOf('function shareUrl()'), h.indexOf('async function share()'));
t(share.length > 0 && !/['"]s=|&s=|s=1/.test(share), 'a shared link never carries ?s=1');
t(count(h, /SYNC\.push\('save'\)/g) === 1 && count(h, /SYNC\.push\('journal'\)/g) === 1 && count(h, /SYNC\.push\('purse'\)/g) === 1 && count(h, /SYNC\.push\('answers'\)/g) === 1, 'each of the four drawers pushes exactly once');
t(/if \(dead \|\| !key\(d\)\) return;/.test(h), 'push is a no-op in ANON');
t(/let childId = null, dead = MODE !== 'SIGNED';/.test(h), 'the sync is dead unless SIGNED');
t(/  boot\(\);\n  SYNC\.boot\(\);\n\}\)\(\);/.test(h), 'SYNC.boot runs inside the game scope, after the game boots');
t(!/service_role|sb_secret_/.test(h + j), 'no secret key anywhere in the shipped pages');
t(/sb_publishable_/.test(h) && (!j || /sb_publishable_/.test(j)), 'the publishable key is the only key');
t(count(h, /supabase\.co/g) === 1, 'the API host appears once in the game');
t(/sessionStorage\.getItem\('sunset-adopted'\)/.test(h), 'the adopt-and-reload is guarded against loops');
t(/refresh_token/.test(h), 'an expired session is refreshed, not fatal');
t(!j || /throw it away|thrown away|never stored/i.test(j), 'join: the page says the birth year is thrown away');
t(!j || !/localStorage\.setItem\([^)]*year/i.test(j), 'join: the birth year is never written to storage');
t(!j || /replace\(\/\[\^A-Za-z\]\/g, ''\)\.toUpperCase\(\)\.slice\(0, 10\)/.test(j), 'join: nickname is letters only, ten at most, on the client too');
t(!j || /'island\.html\?crew=' \+ encodeURIComponent\(k\.nickname\) \+ '&s=1'/.test(j), 'join: PLAY boots the island SIGNED');
t(/if \(r && \(!local \|\| \(t\[d\] && r\.updated_at > t\[d\]\)\)\)/.test(h), 'the server wins only over an empty device or one that has synced before and is behind');
t(/} else if \(r && local && !t\[d\]\) {\n          \/\* a real drawer that has never synced: local wins and pushes, never adopts \*\/\n          push\(d, true\);/.test(h), 'an unsynced local drawer wins and pushes, never adopts');
console.log('RESULT: ' + (P + F) + ' checks, ' + P + ' passed, ' + F + ' failed');
process.exit(F ? 1 : 0);
