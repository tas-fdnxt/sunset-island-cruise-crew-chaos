# F1 ROBOT. The cast. Real Chromium, network cut, both editions.
import os, sys, json, datetime, threading, http.server, socketserver, functools
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
from playwright.sync_api import sync_playwright

D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = 8971
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=D); H.log_message = lambda *a, **k: None
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = 'http://127.0.0.1:%d/' % PORT
DIS = """() => { for (const s of ['#bclose','#sclose','#wclose','#bdclose','#ag-exit']) { const e=document.querySelector(s); if(e&&e.offsetParent!==null) e.click(); } return true; }"""
EVEN = datetime.date.today().day % 2 == 0
P = F = 0
def ok(c, what, detail=''):
    global P, F
    P += 1 if c else 0; F += 0 if c else 1
    print(('PASS  ' if c else 'FAIL  ') + what + (('  [' + str(detail) + ']') if detail else ''))

def open_edition(br, query):
    ctx = br.new_context(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True)
    errs, outside = [], []
    def route(r):
        if r.request.url.startswith(U): return r.continue_()
        outside.append(r.request.url); r.abort()
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U + 'island.html' + query, wait_until='load'); pg.wait_for_timeout(1400)
    for _ in range(6): pg.evaluate(DIS); pg.wait_for_timeout(150)
    return ctx, pg, errs, outside

def build_house(pg, cx, cy):
    ring = [(cx-1, cy-1), (cx+1, cy-1), (cx-1, cy), (cx+1, cy), (cx-1, cy+1), (cx, cy+1), (cx+1, cy+1)]
    # a house is a door with ten or more blocks within three cells, so the walls go two high like test-houses.js
    for x, y in ring:
        pg.evaluate("([x,y])=>window.__ISLAND.place(x,y,3)", [x, y]); pg.evaluate("([x,y])=>window.__ISLAND.place(x,y,5)", [x, y])
    r = pg.evaluate("([x,y])=>window.__ISLAND.place(x,y,6)", [cx, cy-1])
    return r

def tap_islander(pg, i):
    for dy in (0, -14, -28, -42, 12):
        p = pg.evaluate("i=>{const p=window.__ISLAND.islandersRef()[i]; return {x:p.x,y:p.y,name:p.name}}", i)
        s = pg.evaluate("([x,y])=>window.__ISLAND.cellScreen(Math.floor(x),Math.floor(y))", [p['x'], p['y']])
        pg.evaluate("([sx,sy])=>window.__ISLAND.tapAt(sx,sy)", [s['sx'], s['sy'] + dy]); pg.wait_for_timeout(150)
        if pg.evaluate("()=>document.getElementById('orders').classList.contains('on')"): return p
    return None

with sync_playwright() as pw:
    br = pw.chromium.launch()

    # ---------- EVERYONE'S EDITION ----------
    ctx, pg, errs, outside = open_edition(br, '?crew=PIP')
    ok(pg.evaluate("()=>window.__ISLAND.dog") is False and pg.evaluate("()=>window.__ISLAND.keep") is True, 'everyone: DOG off, KEEP on')
    ok(pg.inner_text('#keeper').strip() == 'LOG', 'everyone: the keeper button says LOG, not CLEO', pg.inner_text('#keeper'))
    ok('CLEO' not in pg.evaluate("()=>document.body.innerText"), 'everyone: no CLEO anywhere on screen')
    pg.click('#keeper'); pg.wait_for_timeout(400)
    kb = pg.evaluate("()=>document.getElementById('kbubble') ? document.getElementById('kbubble').innerText : document.body.innerText")
    ok('CLEO' not in kb, 'everyone: tapping the keeper does not summon Cleo')
    r = build_house(pg, 64, 64)
    ok(r and r.get('ok'), 'everyone: a house with a door was built')
    toast = pg.inner_text('#toast')
    n = pg.evaluate("()=>window.__ISLAND.islandersRef().length")
    ok(n == 1, 'everyone: one islander moved in', n)
    ok('MOVED IN' in toast and 'so somebody came' in toast, 'everyone: the move-in moment says who and why', toast)
    kn = pg.evaluate("()=>window.__ISLAND.keeperName()"); nm = pg.evaluate("()=>window.__ISLAND.islandersRef()[0].name")
    ok(kn == nm, 'everyone: the first islander keeps the book', kn)
    ok(pg.evaluate("()=>window.__ISLAND.familyVisitor('MARINA')") == 'MARINA', 'everyone: the boat visitor is never family')
    # a second house so there is a non-keeper islander to boss about
    r2 = build_house(pg, 70, 70)
    n2 = pg.evaluate("()=>window.__ISLAND.islandersRef().length")
    ok(n2 == 2, 'everyone: a second house, a second islander', n2)
    p = tap_islander(pg, 1)
    ok(p is not None, 'everyone: tapping an islander opens the orders', p)
    if p:
        ok(pg.evaluate("()=>[...document.querySelectorAll('#orders button')].map(b=>b.textContent)") == ['GO OUTSIDE', 'COME HERE', 'GET IN THE CAR'], 'everyone: three orders, in his words')
        pg.screenshot(path='shot-cast-orders.png')
        home = pg.evaluate("()=>{const p=window.__ISLAND.islandersRef()[1]; return {x:p.home.x,y:p.home.y}}")
        pg.click('#orders button[data-order="out"]'); pg.wait_for_timeout(200)
        t = pg.evaluate("()=>{const p=window.__ISLAND.islandersRef()[1]; return {tx:p.tx,ty:p.ty,wait:p.wait}}")
        far = ((t['tx'] - home['x']) ** 2 + (t['ty'] - home['y']) ** 2) ** 0.5
        ok(far >= 3.5 and t['wait'] >= 25, 'everyone: GO OUTSIDE sends them well away from the house and holds it', {'far': round(far, 1), 'wait': t['wait']})
        ok('went outside' in pg.inner_text('#toast') and 'Get out of my house' not in pg.inner_text('#toast'), 'everyone: the toast, without Ollie\'s private line', pg.inner_text('#toast'))
        ok(not pg.evaluate("()=>document.getElementById('orders').classList.contains('on')"), 'everyone: the orders close after an order')
        p = tap_islander(pg, 1)
        pg.click('#orders button[data-order="here"]'); pg.wait_for_timeout(200)
        ok('coming over' in pg.inner_text('#toast'), 'everyone: COME HERE', pg.inner_text('#toast'))
        p = tap_islander(pg, 1)
        pg.click('#orders button[data-order="car"]'); pg.wait_for_timeout(200)
        ok(pg.evaluate("()=>window.__ISLAND.islandersRef()[1].rider") is True, 'everyone: GET IN THE CAR makes a rider')
        pg.click('#btn-drive'); pg.wait_for_timeout(1500)
        d = pg.evaluate("()=>{const p=window.__ISLAND.islandersRef()[1]; return {x:p.x,y:p.y,hx:p.home.x,hy:p.home.y}}")
        ok(abs(d['x'] - d['hx']) + abs(d['y'] - d['hy']) > 2, 'everyone: the rider left home with the car', d)
        ok(pg.evaluate("()=>(window.__ISLAND.islandersRef()[1].rider)") is True, 'everyone: still riding while driving')
    ok(pg.evaluate('()=>window.__MODE') == 'ANON' and len(outside) == 0, 'everyone: ANON, nothing left the device', outside[:1])
    ok(len(errs) == 0, 'everyone: zero console errors', errs[:2])
    ctx.close()

    # ---------- OLLIE'S EDITION ----------
    ctx, pg, errs, outside = open_edition(br, '?crew=OLLIE')
    ok(pg.inner_text('#keeper').strip() == 'LOG', 'ollie: keeper button LOG as before')
    fv = pg.evaluate("()=>window.__ISLAND.familyVisitor('MARINA')")
    ok(fv == ('SIBELLA' if EVEN else 'MARINA'), 'ollie: Sibella rides the boat on even days', {'today_even': EVEN, 'got': fv})
    r = build_house(pg, 64, 64)
    ok('so somebody came' in pg.inner_text('#toast'), 'ollie: the move-in moment', pg.inner_text('#toast'))
    pg.wait_for_timeout(3500)  # the house also triggers his 'you wanted to build houses' callback; let it pass before ordering
    p = tap_islander(pg, 0)
    ok(p is not None, 'ollie: even the keeper can be bossed', p)
    if p:
        pg.click('#orders button[data-order="out"]'); pg.wait_for_timeout(200)
        ok('Get out of my house' in pg.inner_text('#toast'), 'ollie: his own words come back to him', pg.inner_text('#toast'))
    ok(len(errs) == 0, 'ollie: zero console errors', errs[:2])
    ctx.close()

    # ---------- SIBELLA'S EDITION ----------
    ctx, pg, errs, outside = open_edition(br, '?crew=SIBELLA')
    fv = pg.evaluate("()=>window.__ISLAND.familyVisitor('MARINA')")
    ok(fv == ('OLLIE' if EVEN else 'MARINA'), 'sibella: Ollie visits her island on even days', fv)
    ok(len(errs) == 0, 'sibella: zero console errors', errs[:2])
    ctx.close()
    br.close()

srv.shutdown()
print('RESULT: %d checks, %d passed, %d failed' % (P + F, P, F))
sys.exit(1 if F else 0)
