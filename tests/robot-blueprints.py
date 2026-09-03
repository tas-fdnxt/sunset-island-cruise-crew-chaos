# BLUEPRINTS ROBOT. Real Chromium driving the real UI, network cut dead, both editions.
#   OLLIE: the scroll waits on the dock, a tap opens the outline, a hand-placed block counts down,
#          the banner hires the crew for coins, the crew finishes it, the book learns about it.
#   PIP (everyone): the scroll is there too, and an empty purse is never a gate: the hire refuses warmly, hands stay free.
# Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/robot-blueprints.py [dir]
import os, sys, json, threading, http.server, socketserver, functools
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
from playwright.sync_api import sync_playwright

D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = 8967
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=D)
H.log_message = lambda *a, **k: None
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = 'http://127.0.0.1:%d/' % PORT

DIS = """() => { for (const s of ['#bclose','#sclose','#wclose','#bdclose','#ag-exit']) { const e=document.querySelector(s); if(e&&e.offsetParent!==null) e.click(); }
  document.querySelectorAll('#book,#story,#win,#board,#agame').forEach(e=>e.classList.remove('on')); return true; }"""

P = F = 0
def ok(cond, what, detail=''):
    global P, F
    P += 1 if cond else 0; F += 0 if cond else 1
    print(('PASS  ' if cond else 'FAIL  ') + what + (('  [' + str(detail) + ']') if detail else ''))

def settle(pg, ms=1400):
    pg.wait_for_timeout(ms)
    for _ in range(6): pg.evaluate(DIS); pg.wait_for_timeout(150)

def poll(pg, expr, want, ms=6000):
    for _ in range(ms // 100):
        try:
            if pg.evaluate(expr) == want: return True
        except Exception: pass
        pg.wait_for_timeout(100)
    return False

with sync_playwright() as pw:
    br = pw.chromium.launch()

    # ---------- OLLIE: THE WHOLE LIFE OF A BLUEPRINT ----------
    ctx = br.new_context(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True)
    ctx.add_init_script("localStorage.setItem('captains-island-purse-v1-OLLIE', JSON.stringify({v:1,coins:40,trophies:[],chaseWins:0,arcadeGoes:0,deliveries:0}))")
    errs, outside = [], []
    def route(r):
        if r.request.url.startswith(U): return r.continue_()
        outside.append(r.request.url); r.abort()
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U + 'island.html?crew=OLLIE', wait_until='load'); settle(pg)
    api = "window.__ISLAND"
    ok(pg.evaluate("()=>%s.scrollWaiting()" % api), 'ollie: the scroll waits on the dock with no outline active')
    d = pg.evaluate("()=>%s.dockCell()" % api)
    pg.evaluate("()=>{const d=%s.dockCell(); %s.centreOn(d.x, d.y);}" % (api, api)); pg.wait_for_timeout(400)
    sp = pg.evaluate("()=>%s.scrollScreen()" % api)
    ok(0 < sp['sx'] < 1180 and 0 < sp['sy'] < 820, 'ollie: the scroll is on screen by the dock', sp)
    pg.mouse.click(sp['sx'], sp['sy']); pg.wait_for_timeout(500); pg.evaluate(DIS)
    bp = pg.evaluate("()=>%s.bp()" % api)
    ok(bool(bp), 'ollie: tapping the scroll opens the outline', bp)
    info = pg.evaluate("()=>{const i=%s.bpInfo(); return {name:i.name,toGo:i.toGo};}" % api)
    total = info['toGo']
    ok(info['name'] != '' and total >= 5, 'ollie: the outline knows its name and its count', info)
    ok(pg.evaluate("()=>document.getElementById('bpbar').classList.contains('on')"), 'ollie: the banner is up')
    bartext = pg.evaluate("()=>document.getElementById('bpbar').textContent")
    ok(info['name'] in bartext and 'HIRES THE CREW' in bartext, 'ollie: the banner names it and offers the crew', bartext)
    ok(not pg.evaluate("()=>%s.scrollWaiting()" % api), 'ollie: the scroll leaves the dock while the outline is out')
    pg.screenshot(path='shot-bp-outline.png')

    # a hand-placed block counts down. Hands are free.
    cell = pg.evaluate("()=>%s.bpNextCells()[0]" % api)
    r = pg.evaluate("(c)=>%s.place(c.x, c.y, c.id)" % api, cell)
    ok(r.get('ok'), 'ollie: a hand block lands in the outline', r)
    ok(pg.evaluate("()=>%s.bpInfo().toGo" % api) == total - 1, 'ollie: the count goes down by one')

    # the banner hires the crew for coins
    pg.click('#bpbar'); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.getElementById('bpmenu').classList.contains('on')"), 'ollie: the banner opens two big buttons')
    price = pg.evaluate("()=>parseInt(document.getElementById('bp-hire').textContent.replace(/[^0-9]/g,''),10)")
    pg.click('#bp-hire'); pg.wait_for_timeout(400)
    coins = pg.evaluate("()=>JSON.parse(localStorage.getItem('captains-island-purse-v1-OLLIE')).coins")
    ok(coins == 40 - price, 'ollie: the hire took exactly the price', {'price': price, 'coins': coins})
    ok(pg.evaluate("()=>%s.crewOn()" % api), 'ollie: the crew is on the job')

    # the crew builds it block by block; the robot pumps their clock instead of waiting on the wall
    for _ in range(120):
        if pg.evaluate("()=>%s.bp()" % api) is None: break
        pg.evaluate("()=>%s.crewStep(2)" % api)
        pg.wait_for_timeout(40)
    ok(pg.evaluate("()=>%s.bp()" % api) is None, 'ollie: the blueprint finished')
    jkey = pg.evaluate("()=>Object.keys(localStorage).find(k=>k.indexOf('journal')!==-1&&k.indexOf('OLLIE')!==-1)")
    j = pg.evaluate("(k)=>JSON.parse(localStorage.getItem(k))", jkey)
    ok(j.get('bpFinishedToday') == 1 and j.get('bpDoneEver') == 1, 'ollie: the day and the book both counted it', {'today': j.get('bpFinishedToday'), 'ever': j.get('bpDoneEver')})
    ok((j.get('bpToday') or {}).get('finished') == info['name'], "ollie: tonight's chapter knows its name", j.get('bpToday'))
    ok(any('blueprint' in (e.get('line') or '') for e in (j.get('ledger') or [])), 'ollie: the learning ledger has the blueprint in it')
    ok(not pg.evaluate("()=>document.getElementById('bpbar').classList.contains('on')"), 'ollie: the banner rests when the work is done')
    ok(pg.evaluate("()=>%s.scrollWaiting()" % api), 'ollie: a fresh scroll waits on the dock again')
    hn = pg.evaluate("()=>%s.houses().length" % api)
    pn = pg.evaluate("()=>%s.islandersRef().length" % api)
    ok(hn >= 1 and pn == hn, 'ollie: crew-built doors invite islanders just like hand-built ones', {'houses': hn, 'islanders': pn})
    pg.wait_for_timeout(600); pg.evaluate(DIS)
    pg.screenshot(path='shot-bp-done.png')
    ok(len(outside) == 0, 'ollie: zero requests left the device', outside[:2])
    ok(len(errs) == 0, 'ollie: zero console errors', errs[:2])
    ctx.close()

    # ---------- PIP: AN EMPTY PURSE IS NEVER A GATE ----------
    ctx = br.new_context(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True)
    errs2, outside2 = [], []
    def route2(r):
        if r.request.url.startswith(U): return r.continue_()
        outside2.append(r.request.url); r.abort()
    ctx.route('**/*', route2)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs2.append(str(e)))
    pg.on('console', lambda m: errs2.append(m.text) if m.type == 'error' else None)
    pg.goto(U + 'island.html?crew=PIP', wait_until='load'); settle(pg)
    ok(pg.evaluate("()=>%s.scrollWaiting()" % api), 'everyone: the scroll waits on their dock too')
    pg.evaluate("()=>%s.openBlueprint()" % api); pg.wait_for_timeout(400); pg.evaluate(DIS)
    ok(bool(pg.evaluate("()=>%s.bp()" % api)), 'everyone: the outline opens')
    toGo0 = pg.evaluate("()=>%s.bpInfo().toGo" % api)
    pg.click('#bpbar'); pg.wait_for_timeout(300)
    pg.click('#bp-hire'); pg.wait_for_timeout(300)
    ok(not pg.evaluate("()=>%s.crewOn()" % api), 'everyone: no coins, no crew, and nothing breaks')
    ok(pg.evaluate("()=>!localStorage.getItem('captains-island-purse-v1-PIP') || JSON.parse(localStorage.getItem('captains-island-purse-v1-PIP')).coins === 0"), 'everyone: the purse was never touched')
    cell = pg.evaluate("()=>%s.bpNextCells()[0]" % api)
    r2 = pg.evaluate("(c)=>%s.place(c.x, c.y, c.id)" % api, cell)
    ok(r2.get('ok') and pg.evaluate("()=>%s.bpInfo().toGo" % api) == toGo0 - 1, 'everyone: hands still build for free')
    ok(len(outside2) == 0 and len(errs2) == 0, 'everyone: zero requests, zero console errors', (outside2[:1], errs2[:1]))
    ctx.close()
    br.close()

srv.shutdown()
print('RESULT: %d checks, %d passed, %d failed' % (P + F, P, F))
sys.exit(1 if F else 0)
