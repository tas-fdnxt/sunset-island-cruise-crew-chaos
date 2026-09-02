# S2B ROBOT. Real Chromium driving the real UI.
#   1. ANON, network cut dead, both editions: the game boots, a block saves, nothing is fetched, nothing syncs.
#   2. SIGNED against a faithful mock of the Sydney API: a newer island on the server is adopted on boot,
#      and a placed block is pushed to child_state within two seconds.
#   3. join.html end to end: under-18 stopped, adult through, account made, child added, consent recorded,
#      the card names the child, PLAY boots SIGNED. The birth year is thrown away.
# Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/robot-sync.py [dir]
import os, sys, json, threading, http.server, socketserver, functools, time
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
from playwright.sync_api import sync_playwright

D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = 8961
SB = 'https://whhzezkpejplaghiuuyk.supabase.co'
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=D)
H.log_message = lambda *a, **k: None
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = 'http://127.0.0.1:%d/' % PORT

DIS = """() => { for (const s of ['#bclose','#sclose','#wclose','#bdclose','#ag-exit']) { const e=document.querySelector(s); if(e&&e.offsetParent!==null) e.click(); }
  document.querySelectorAll('#book,#story,#win,#board,#agame').forEach(e=>e.classList.remove('on')); return true; }"""
SESSION = {'access_token': 'tok-A', 'refresh_token': 'ref-A', 'expires_at': 4102444800, 'user_id': '11111111-1111-1111-1111-111111111111'}
SAVEKEY = 'captains-island-save-v1-OLLIE'

P = F = 0
def ok(cond, what, detail=''):
    global P, F
    P += 1 if cond else 0; F += 0 if cond else 1
    print(('PASS  ' if cond else 'FAIL  ') + what + (('  [' + str(detail) + ']') if detail else ''))

def settle(pg, ms=1400):
    pg.wait_for_timeout(ms)
    for _ in range(6): pg.evaluate(DIS); pg.wait_for_timeout(150)

def tap_sand(pg):
    box = pg.locator('#world').bounding_box()
    # off-centre on open sand: Cleo stands at the middle on the everyone edition and a tap on her talks, correctly
    pg.mouse.click(box['x'] + box['width'] * 0.36, box['y'] + box['height'] * 0.66)

def wait_key(pg, key, ms=4000):
    for _ in range(ms // 100):
        v = pg.evaluate("k=>localStorage.getItem(k)", key)
        if v: return v
        pg.wait_for_timeout(100)
    return None

with sync_playwright() as pw:
    br = pw.chromium.launch()

    # ---------- 1. ANON, NETWORK CUT, BOTH EDITIONS ----------
    server_save = None
    for name, query in [('ollie', '?crew=OLLIE'), ('everyone', '?crew=PIP')]:
        ctx = br.new_context(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True)
        errs, outside = [], []
        def route(r):
            if r.request.url.startswith(U): return r.continue_()
            outside.append(r.request.url); r.abort()
        ctx.route('**/*', route)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(U + 'island.html' + query, wait_until='load'); settle(pg)
        ok(pg.evaluate('()=>window.__MODE') == 'ANON', name + ': boots ANON with no session')
        tap_sand(pg)
        key = 'captains-island-save-v1-' + ('OLLIE' if name == 'ollie' else 'PIP')
        saved = wait_key(pg, key)
        ok(bool(saved), name + ': a tapped block saved to the device')
        pg.wait_for_timeout(2200)
        st = pg.evaluate('()=>window.__SYNC.stat')
        ok(st['pushes'] == 0 and st['pulls'] == 0, name + ': ANON never syncs', st)
        ok(len(outside) == 0, name + ': zero requests leave the device with the network cut', outside[:2])
        ok(len(errs) == 0, name + ': zero console errors', errs[:2])
        if name == 'ollie':
            server_save = json.loads(saved); pg.screenshot(path='shot-sync-anon.png')
        ctx.close()

    # ---------- 2. SIGNED AGAINST A FAITHFUL MOCK ----------
    server_save['at'] = server_save['at'] + 1000
    calls, children_made = [], []
    def api(r):
        req = r.request; url = req.url; path = url[len(SB):]
        calls.append({'m': req.method, 'p': path, 'auth': req.headers.get('authorization'), 'key': req.headers.get('apikey'), 'body': req.post_data})
        def j(data, status=200): r.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        if path.startswith('/rest/v1/children?select=id&nickname=eq.OLLIE'): return j([{'id': 'kid1'}] if children_made else [])
        if path.startswith('/rest/v1/families'): return j([{'id': 'fam1'}])
        if path.startswith('/rest/v1/children') and req.method == 'POST': children_made.append(json.loads(req.post_data)); return j([{'id': 'kid1'}], 201)
        if path.startswith('/rest/v1/child_state?select=') and req.method == 'GET':
            return j([{'drawer': 'save', 'value': server_save, 'updated_at': '2030-01-01T00:00:00+00:00'}])
        if path.startswith('/rest/v1/child_state?on_conflict') and req.method == 'POST':
            return j([{'updated_at': '2030-01-02T00:00:00+00:00'}], 201)
        j({'unexpected': path}, 500)
    ctx = br.new_context(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True)
    ctx.add_init_script("localStorage.setItem('sunset-session-v1', %s)" % json.dumps(json.dumps(SESSION)))
    errs, outside = [], []
    def route2(r):
        if r.request.url.startswith(U): return r.continue_()
        if r.request.url.startswith(SB): return api(r)
        outside.append(r.request.url); r.abort()
    ctx.route('**/*', route2)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U + 'island.html?crew=OLLIE&s=1', wait_until='load')
    for _ in range(80):
        try:
            if pg.evaluate("()=>sessionStorage.getItem('sunset-adopted')") == '1' and pg.evaluate('()=>document.readyState') == 'complete': break
        except Exception:
            pass  # the page is mid-reload, which is the thing we are waiting for
        pg.wait_for_timeout(100)
    pg.wait_for_load_state('load'); settle(pg)
    ok(pg.evaluate('()=>window.__MODE') == 'SIGNED', 'signed: boots SIGNED with session plus ?s=1')
    ok(pg.evaluate("()=>sessionStorage.getItem('sunset-adopted')") == '1', 'signed: reloaded exactly once after adopting the server island')
    local = pg.evaluate("k=>JSON.parse(localStorage.getItem(k))", SAVEKEY)
    ok(local and local.get('at') == server_save['at'] and local.get('i') == server_save['i'], 'signed: the newer server island replaced the device copy')
    ok(len(children_made) == 1 and children_made[0]['nickname'] == 'OLLIE' and children_made[0]['family_id'] == 'fam1', 'signed: child row made once in the family', children_made)
    ok(all(c['auth'] == 'Bearer tok-A' and c['key'] for c in calls), 'signed: every call carries the session and the key')
    n0 = len([c for c in calls if c['p'].startswith('/rest/v1/child_state?on_conflict') and json.loads(c['body']).get('drawer') == 'save'])
    # fresh sand: the adopted island already has a block where the ANON run tapped, and a tap on a block no longer stacks
    box = pg.locator('#world').bounding_box(); pg.mouse.click(box['x'] + box['width'] * 0.62, box['y'] + box['height'] * 0.6)
    for _ in range(100):
        if len([c for c in calls if c['p'].startswith('/rest/v1/child_state?on_conflict') and json.loads(c['body']).get('drawer') == 'save']) > n0: break
        pg.wait_for_timeout(100)
    ups = [c for c in calls if c['p'].startswith('/rest/v1/child_state?on_conflict') and json.loads(c['body']).get('drawer') == 'save']
    ok(len(ups) > n0, 'signed: a placed block reached the server within ten seconds', pg.evaluate('()=>window.__SYNC.stat'))
    body = json.loads(ups[-1]['body']) if ups else {}
    ok(body.get('child_id') == 'kid1' and body.get('drawer') == 'save' and isinstance(body.get('value'), dict) and 'i' in body['value'], 'signed: the upsert carries child, drawer and the island', {k: body.get(k) for k in ('child_id', 'drawer')})
    stamp = pg.evaluate("()=>JSON.parse(localStorage.getItem('captains-island-synct-v1-OLLIE')||'{}')")
    ok(stamp.get('save') == '2030-01-02T00:00:00+00:00', 'signed: the device remembers the server timestamp', stamp)
    ok(len(outside) == 0, 'signed: nothing goes anywhere but Sydney', outside[:2])
    ok(len(errs) == 0, 'signed: zero console errors', errs[:2])
    pg.screenshot(path='shot-sync-signed.png')
    ctx.close()

    # ---------- 3. THE GROWN-UP PAGE ----------
    auth, made, consents = {'signin': 0, 'signup': 0}, [], []
    fam_rows = []
    def api3(r):
        req = r.request; path = req.url[len(SB):]
        def j(data, status=200): r.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        if path.startswith('/auth/v1/token?grant_type=password'):
            auth['signin'] += 1
            return j({'error': 'invalid_grant'}, 400) if auth['signup'] == 0 else j({'access_token': 'tok-B', 'refresh_token': 'ref-B', 'expires_at': 4102444800, 'user': {'id': 'u-B'}})
        if path.startswith('/auth/v1/signup'):
            auth['signup'] += 1; return j({'access_token': 'tok-B', 'refresh_token': 'ref-B', 'expires_at': 4102444800, 'user': {'id': 'u-B'}})
        if path.startswith('/rest/v1/families?select=id&limit=1'): return j(fam_rows)
        if path.startswith('/rest/v1/families?select=id') and req.method == 'POST':
            fam_rows.append({'id': 'famB'}); return j([{'id': 'famB'}], 201)
        if path.startswith('/rest/v1/children?select=id,nickname') and req.method == 'GET': return j(made)
        if path.startswith('/rest/v1/children?select=id,nickname') and req.method == 'POST':
            b = json.loads(req.post_data); row = {'id': 'kidB', 'nickname': b['nickname'], 'age_band': b['age_band'], 'colour': b.get('colour')}; made.append(row); return j([row], 201)
        if path.startswith('/rest/v1/consents') and req.method == 'POST': consents.append(json.loads(req.post_data)); return r.fulfill(status=201, body='')
        j({'unexpected': path}, 500)
    ctx = br.new_context(viewport={'width': 820, 'height': 1180}, device_scale_factor=1, has_touch=True)
    errs = []
    def route3(r):
        if r.request.url.startswith(U): return r.continue_()
        if r.request.url.startswith(SB): return api3(r)
        r.abort()
    ctx.route('**/*', route3)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if (m.type == 'error' and 'status of 400' not in m.text) else None)
    pg.goto(U + 'join.html', wait_until='load'); pg.wait_for_timeout(300)
    ok(pg.evaluate('()=>window.__J.screen') == 'year', 'join: opens on the age gate')
    pg.fill('#year', '2015'); pg.click('#b-year'); pg.wait_for_timeout(200)
    ok(pg.evaluate('()=>window.__J.screen') == 'notyet', 'join: under 18 is stopped and told to ask a grown-up')
    pg.click('#b-back-year'); pg.fill('#year', '1980'); pg.click('#b-year'); pg.wait_for_timeout(200)
    ok(pg.evaluate('()=>window.__J.screen') == 'email', 'join: an adult reaches the account screen')
    ok(pg.evaluate("()=>document.getElementById('year').value") == '', 'join: the birth year is thrown away after the check')
    ok('1980' not in pg.evaluate("()=>JSON.stringify(localStorage)"), 'join: the birth year is never stored')
    pg.fill('#email', 'Parent@Example.com'); pg.fill('#pass', 'correct horse'); pg.click('#b-email')
    for _ in range(40):
        if pg.evaluate('()=>window.__J.screen') == 'kids': break
        pg.wait_for_timeout(100)
    ok(pg.evaluate('()=>window.__J.screen') == 'kids', 'join: no account yet, so one is created and the crew screen opens')
    ok(auth['signin'] == 1 and auth['signup'] == 1, 'join: sign-in tried first, then sign-up', auth)
    ok(len(fam_rows) == 1, 'join: a family row is made for the new account')
    sess = pg.evaluate("()=>JSON.parse(localStorage.getItem('sunset-session-v1'))")
    ok(sess and sess['access_token'] == 'tok-B' and sess['user_id'] == 'u-B', 'join: the session is kept on the device')
    pg.fill('#nick', 'ollie 6!'); 
    ok(pg.evaluate("()=>document.getElementById('nick').value") == 'OLLIE', 'join: the nickname is letters only, uppercased, as typed')
    pg.click('#b-add')
    for _ in range(40):
        if pg.evaluate('()=>window.__J.screen') == 'yes': break
        pg.wait_for_timeout(100)
    ok(len(made) == 1 and made[0]['nickname'] == 'OLLIE' and made[0]['age_band'] == '5-8', 'join: the child row is made with the band', made)
    ok(len(consents) == 1 and consents[0]['child_id'] == 'kidB' and consents[0]['family_id'] == 'famB', 'join: the consent is recorded against the child', consents)
    ok(pg.evaluate('()=>window.__J.screen') == 'yes', 'join: the card is shown')
    ok(pg.inner_text('#yes-title').startswith('OLLIE, your grown-up said yes'), 'join: the card names the child', pg.inner_text('#yes-title'))
    ok(pg.evaluate('()=>window.__J.play') == 'island.html?crew=OLLIE&s=1', 'join: PLAY boots the island SIGNED', pg.evaluate('()=>window.__J.play'))
    pg.screenshot(path='shot-join-yes.png')
    ok(len(errs) == 0, 'join: zero console errors', errs[:2])
    ctx.close()
    br.close()

srv.shutdown()
print('RESULT: %d checks, %d passed, %d failed' % (P + F, P, F))
sys.exit(1 if F else 0)
