# FORGE 10: THE CAPTAIN'S FIX LIST, in real Chromium with a real touchscreen.
# iPad first, because Ollie plays on his iPad. Phone second.
# Every check is a fault from the 11 Sep 2026 playtest. Written red, before the fix.
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('FIX_SHOT', '/tmp/fixes')
os.makedirs(SHOT, exist_ok=True)
n = 0
fails = []

VIEWS = [  # Ollie's edition on every iPad shape, then everyone's edition (Cleo) on iPad and phone
    ('ipad-portrait', 820, 1180, 'crew=OLLIE'),
    ('ipad-landscape', 1180, 820, 'crew=OLLIE'),
    ('ipad-pro', 1024, 1366, 'crew=OLLIE'),
    ('ipad-mini', 768, 1024, 'crew=OLLIE'),
    ('phone', 390, 844, 'crew=OLLIE'),
    ('everyone-ipad', 820, 1180, 'p=CLEO'),
    ('everyone-phone', 390, 844, 'p=CLEO'),
]

def ck(name, ok, got=''):
    global n
    n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:220]))
    if not ok:
        fails.append(name)

def dismiss(pg):
    for _ in range(14):
        moved = False
        for sel in ['#bclose', '#booknav button:last-child', '#sclose', '#mclose', '#morning button', '#lk-close']:
            try:
                loc = pg.locator(sel)
                if loc.count() and loc.first.is_visible():
                    loc.first.click(timeout=1500)
                    moved = True
                    pg.wait_for_timeout(180)
            except Exception:
                pass
        blocked = pg.evaluate(
            "(()=>{const ids=['book','story','morning','lookmenu'];"
            "return ids.some(i=>{const e=document.getElementById(i);return e&&e.classList.contains('on')})})()")
        if not blocked:
            break
        if not moved:
            pg.keyboard.press('Escape')
            pg.wait_for_timeout(180)
    pg.wait_for_timeout(200)

TOP = "(x,y)=>{const I=window.__ISLAND,N=I.ISLE.N,Z=I.ISLE.ZMAX,c=I.world.ref.cols;for(let z=Z-1;z>=0;z--) if(c[(y*N+x)*Z+z]) return z; return -1}"

def top_z(pg, x, y):
    return pg.evaluate("(a)=>(%s)(a[0],a[1])" % TOP, [x, y])

def count(pg):
    return pg.evaluate("window.__ISLAND.world.ref.count")

def screen_of(pg, x, y, z):
    return pg.evaluate("(a)=>{const I=window.__ISLAND,c=I.cam;return {sx:I.isoX(a[0],a[1])*c.zoom+c.x, sy:I.isoY(a[0],a[1],a[2])*c.zoom+c.y}}", [x, y, z])

def free_land(pg, need=1):
    # a clear patch of land near the middle, found by the engine's own isLand
    return pg.evaluate("""(need)=>{const I=window.__ISLAND,N=I.ISLE.N,c=I.world.ref.cols,Z=I.ISLE.ZMAX;
      const clear=(x,y)=>{if(!I.isLand(x,y)) return false; for(let z=0;z<Z;z++) if(c[(y*N+x)*Z+z]) return false; return true;};
      for(let r=0;r<40;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
        const x=(N>>1)+dx,y=(N>>1)+dy; let good=true;
        for(let j=-need;j<=need&&good;j++) for(let i=-need;i<=need&&good;i++) if(!clear(x+i,y+j)) good=false;
        if(good) return {x,y};
      } return null}""", need)

def boxes_overlap(a, b):
    return not (a['x'] + a['width'] <= b['x'] + 1 or b['x'] + b['width'] <= a['x'] + 1 or
                a['y'] + a['height'] <= b['y'] + 1 or b['y'] + b['height'] <= a['y'] + 1)

def run(pw, label, w, h, q):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=(w < 700))
    pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    pg.goto(BASE + ('&' if '?' in BASE else '?') + q, wait_until='load')
    pg.wait_for_timeout(2400)
    dismiss(pg)
    ck(label + ' booted', pg.evaluate("!!window.__ISLAND"))
    big = w >= 700 and h >= 700 or w >= 1000

    # ---- 00:15 a tap on the top of a tall tower stacks on the tower ----
    spot = free_land(pg, 6)
    pg.evaluate("(s)=>{const I=window.__ISLAND;I.setTool(3,true);for(let z=0;z<5;z++) I.place(s.x,s.y,3);I.centreOn(s.x,s.y);}", spot)
    pg.wait_for_timeout(900)
    t0, c0 = top_z(pg, spot['x'], spot['y']), count(pg)
    p = screen_of(pg, spot['x'], spot['y'], t0)
    pg.touchscreen.tap(p['sx'], p['sy'])
    pg.wait_for_timeout(350)
    t1 = top_z(pg, spot['x'], spot['y'])
    ck(label + ' tapping the top of a 5 high tower makes it 6', t1 == t0 + 1, 'before=%s after=%s' % (t0, t1))
    ck(label + ' that tap placed exactly one block', count(pg) == c0 + 1, count(pg) - c0)
    pg.screenshot(path='%s/%s-tower.png' % (SHOT, label))
    for k in range(3):
        tz = top_z(pg, spot['x'], spot['y'])
        q = screen_of(pg, spot['x'], spot['y'], tz)
        pg.touchscreen.tap(q['sx'], q['sy'])
        pg.wait_for_timeout(250)
    ck(label + ' three more taps on the top climb to 9? no, to the cap of 8', top_z(pg, spot['x'], spot['y']) == 7, top_z(pg, spot['x'], spot['y']))

    # ---- 01:41 a dragged finger pans by default, and LOTS paints on purpose ----
    sp2 = free_land(pg, 4)
    pg.evaluate("(s)=>window.__ISLAND.centreOn(s.x,s.y)", sp2)
    pg.wait_for_timeout(700)
    c1 = count(pg)
    cam0 = pg.evaluate("({x:window.__ISLAND.cam.x,y:window.__ISLAND.cam.y})")
    a = screen_of(pg, sp2['x'] - 2, sp2['y'], -1)
    bb = screen_of(pg, sp2['x'] + 3, sp2['y'], -1)
    cdp = ctx.new_cdp_session(pg)
    def drag(x0, y0, x1, y1, steps=12):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for i in range(1, steps + 1):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / steps, 'y': y0 + (y1 - y0) * i / steps}]})
            pg.wait_for_timeout(16)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        pg.wait_for_timeout(300)
    drag(a['sx'], a['sy'], bb['sx'], bb['sy'])
    cam1 = pg.evaluate("({x:window.__ISLAND.cam.x,y:window.__ISLAND.cam.y})")
    ck(label + ' ONE is the default: a drag places nothing', count(pg) == c1, count(pg) - c1)
    ck(label + ' ONE is the default: a drag moves the island', abs(cam1['x'] - cam0['x']) + abs(cam1['y'] - cam0['y']) > 20, (cam0, cam1))
    ck(label + ' the build mode reads ONE', pg.evaluate("window.__ISLAND.buildMode ? window.__ISLAND.buildMode() : null") == 'one')
    # press and hold the block in the hand: ONE / LOTS pops up
    cur = pg.locator('#cur').bounding_box()
    ck(label + ' the block in the hand is on the dock', cur is not None, cur)
    if cur:
        cx, cy = cur['x'] + cur['width'] / 2, cur['y'] + cur['height'] / 2
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx, 'y': cy}]})
        pg.wait_for_timeout(750)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        pg.wait_for_timeout(300)
        ck(label + ' holding the block pops ONE / LOTS', pg.locator('#modepop.on').count() == 1)
        pg.screenshot(path='%s/%s-modepop.png' % (SHOT, label))
        if pg.locator('#mode-lots').count():
            pg.locator('#mode-lots').tap(timeout=3000)
            pg.wait_for_timeout(300)
    ck(label + ' LOTS is chosen', pg.evaluate("window.__ISLAND.buildMode ? window.__ISLAND.buildMode() : null") == 'lots')
    pg.evaluate("(s)=>window.__ISLAND.centreOn(s.x,s.y)", sp2)
    pg.wait_for_timeout(700)
    c2 = count(pg)
    a = screen_of(pg, sp2['x'] - 2, sp2['y'], -1)
    bb = screen_of(pg, sp2['x'] + 3, sp2['y'], -1)
    drag(a['sx'], a['sy'], bb['sx'], bb['sy'])
    ck(label + ' in LOTS a drag lays a line', count(pg) - c2 >= 3, count(pg) - c2)
    pg.evaluate("window.__ISLAND.setBuildMode && window.__ISLAND.setBuildMode('one')")

    # ---- 01:15 the row of blocks hides until you want it ----
    if big:
        rail_up = pg.evaluate("(()=>{const r=document.getElementById('rail');return !!r&&getComputedStyle(r).display!=='none'&&r.getBoundingClientRect().height>0})()")
        ck(label + ' the block row is hidden at rest', not rail_up)
        pg.locator('#cur').tap(timeout=5000); pg.wait_for_timeout(350)
        rail_on = pg.evaluate("(()=>{const r=document.getElementById('rail');return !!r&&getComputedStyle(r).display!=='none'&&r.getBoundingClientRect().height>0})()")
        ck(label + ' tapping the block in the hand pops the row up', rail_on)
        pg.screenshot(path='%s/%s-rail.png' % (SHOT, label))
        if rail_on:
            pg.locator('#rail button[data-val="4"]').tap(); pg.wait_for_timeout(350)
            ck(label + ' picking a block puts the row away', not pg.evaluate("(()=>{const r=document.getElementById('rail');return getComputedStyle(r).display!=='none'&&r.getBoundingClientRect().height>0})()"))
            ck(label + ' and that block is in the hand', pg.evaluate("window.__ISLAND.tool()") == 4)
    else:
        pg.locator('#cur').tap(); pg.wait_for_timeout(300)
        ck(label + ' phone: tapping the block in the hand opens the drawer', pg.locator('#drawer.on').count() == 1)
        pg.locator('#drawer button[data-val="4"]').first.tap(); pg.wait_for_timeout(300)
        ck(label + ' phone: picking closes the drawer', pg.locator('#drawer.on').count() == 0)

    # ---- 07:03 no button hides behind another ----
    sels = ['#btn-book', '#btn-story', '#btn-board', '#zin', '#zout', '#home', '#keeper', '#voybtn', '#lookchip', '#mini', '#title-badge']
    bx = {}
    for s in sels:
        if pg.locator(s).count() and pg.locator(s).first.is_visible():
            bx[s] = pg.locator(s).first.bounding_box()
    clashes = []
    keys = list(bx.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            if bx[keys[i]] and bx[keys[j]] and boxes_overlap(bx[keys[i]], bx[keys[j]]):
                clashes.append(keys[i] + ' x ' + keys[j])
    ck(label + ' no side button sits on another', not clashes, clashes)
    hits = pg.evaluate("""(ss)=>ss.filter(s=>{const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect();
        if(!r.width||getComputedStyle(e).display==='none'||getComputedStyle(e).visibility==='hidden') return false;
        const t=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !(t===e||e.contains(t));})""",
        ['#home', '#keeper', '#zin', '#zout', '#btn-book', '#btn-story', '#lookchip'])
    ck(label + ' every side button is the thing under its own centre', not hits, hits)
    pg.screenshot(path='%s/%s-side.png' % (SHOT, label))

    # ---- 02:25 "hold your hand down on the yellow part, you should be able to move it" ----
    if label in ('ipad-portrait', 'ipad-landscape', 'phone', 'everyone-ipad'):
        pg.evaluate("window.__ISLAND.layPitch()")
        pg.wait_for_timeout(900)
        o0 = pg.evaluate("window.__ISLAND.bp()")
        ck(label + ' the pitch plan is out', o0 is not None, o0)
        if o0:
            ck(label + ' an untouched plan can move', pg.evaluate("window.__ISLAND.bpMovable()") is True)
            c3 = count(pg)
            # hold a square of the plan and drag it three squares along x
            g0 = screen_of(pg, o0['x'] + 4, o0['y'] + 3, -1)
            g1 = screen_of(pg, o0['x'] + 7, o0['y'] + 3, -1)
            camA = pg.evaluate("({x:window.__ISLAND.cam.x,y:window.__ISLAND.cam.y})")
            drag(g0['sx'], g0['sy'], g1['sx'], g1['sy'], 16)
            camB = pg.evaluate("({x:window.__ISLAND.cam.x,y:window.__ISLAND.cam.y})")
            o1 = pg.evaluate("window.__ISLAND.bp()")
            ck(label + ' dragging the yellow plan moves it', o1 and o1['x'] == o0['x'] + 3 and o1['y'] == o0['y'], (o0, o1))
            ck(label + ' moving the plan builds nothing', count(pg) == c3, count(pg) - c3)
            ck(label + ' moving the plan does not pan the island away', abs(camA['x'] - camB['x']) + abs(camA['y'] - camB['y']) < 4, (camA, camB))
            pg.screenshot(path='%s/%s-plan-moved.png' % (SHOT, label))
            # a block where the plan would go: dragging onto it is refused and the plan springs back
            pg.evaluate("(o)=>window.__ISLAND.place(o.x+4+3, o.y+3, 3)", o1)
            h0 = screen_of(pg, o1['x'] + 1, o1['y'] + 3, -1)
            h1 = screen_of(pg, o1['x'] + 4, o1['y'] + 3, -1)
            drag(h0['sx'], h0['sy'], h1['sx'], h1['sy'], 16)
            o2 = pg.evaluate("window.__ISLAND.bp()")
            ck(label + ' the plan never lands on a block, it springs back', o2 and o2['x'] == o1['x'] and o2['y'] == o1['y'], (o1, o2))
            pg.evaluate("window.__ISLAND.undo()")
            # once a block of the plan is laid, the plan stays put
            nx = pg.evaluate("window.__ISLAND.bpNextCells()")
            if nx:
                pg.evaluate("(c)=>window.__ISLAND.place(c.x,c.y,c.id)", nx[0])
                ck(label + ' a started plan is pinned down', pg.evaluate("window.__ISLAND.bpMovable()") is False)
                pg.evaluate("window.__ISLAND.undo()")
            pg.evaluate("window.__ISLAND.putAwayBlueprint && window.__ISLAND.putAwayBlueprint()")
            pg.wait_for_timeout(300)

    # ---- 06:55 kid words on LOOK ----
    lk = pg.locator('#lookchip').inner_text().upper()
    ck(label + ' LOOK never shows SOFT, WARM or CRISP', not any(wd in lk for wd in ['SOFT', 'WARM', 'CRISP']), lk)

    # ---- 06:06 the title gives the screen back ----
    tb = pg.locator('#title-badge').bounding_box()
    ck(label + ' the title is a small pill at rest', tb and tb['width'] <= 230, tb)
    try:
        pg.locator('#title-badge').tap(timeout=3000); pg.wait_for_timeout(300)
        tapped = True
    except Exception as e:
        tapped = False
    ck(label + ' the pill takes a finger', tapped)
    ck(label + ' tapping the pill shows the whole name', tapped and "ISLAND" in pg.locator('#title-badge').inner_text().upper(), pg.locator('#title-badge').inner_text())

    # ---- 03:00 DREAM again and again, never COULD NOT FIND LAND ----
    toasts = []
    for k in range(3):
        before = count(pg)
        r = pg.evaluate("window.__ISLAND.pickDream(0)")
        pg.wait_for_timeout(250)
        toasts.append(pg.locator('#toast').inner_text())
        ck(label + ' castle dream %d lands' % (k + 1), r and r.get('ok') and count(pg) > before, (r and r.get('why'), toasts[-1]))
    ck(label + ' the dream never says COULD NOT FIND LAND', not any('COULD NOT FIND LAND' in t.upper() for t in toasts), toasts)
    pg.evaluate("window.__ISLAND.closeDream && window.__ISLAND.closeDream()")
    pg.wait_for_timeout(200)

    # ---- 07:06 help sits next to DREAM ----
    order = pg.evaluate("[...document.querySelectorAll('#bottombar .dock')].map(e=>e.id)")
    ck(label + ' HELP is on the dock right after DREAM', 'btn-help' in order and 'btn-dream' in order and order.index('btn-help') == order.index('btn-dream') + 1, order)
    if pg.locator('#btn-help').count():
        pg.evaluate("document.getElementById('btn-help').scrollIntoView({inline:'center'})")
        pg.wait_for_timeout(200)
        pg.locator('#btn-help').tap(); pg.wait_for_timeout(500)
        ck(label + ' HELP opens the how-to book', pg.locator('#book.on').count() == 1)
        pg.screenshot(path='%s/%s-help.png' % (SHOT, label))
        dismiss(pg)

    # ---- 00:00 "The trees are pink and green. I don't want that." ----
    if label in ('ipad-portrait', 'phone', 'everyone-ipad'):
        tp = free_land(pg, 7)
        pg.evaluate("""(s)=>{const I=window.__ISLAND,N=I.ISLE.N,Z=I.ISLE.ZMAX,w=I.world.ref;
          w.cols[(s.y*N+s.x)*Z]=14; w.count++; I.place(s.x,s.y,1)&&0; I.redrawWorldForRobot&&0;
          I.setPrettyMode('soft'); I.centreOn(s.x+0.5,s.y+0.5); I.zoomAbout(innerWidth/2,innerHeight/2,3.2);}""", tp)
        pg.evaluate("window.__ISLAND.erase(%d,%d)" % (tp['x'], tp['y']) if False else "0")
        pg.evaluate("(s)=>{const I=window.__ISLAND,N=I.ISLE.N,Z=I.ISLE.ZMAX,w=I.world.ref; if(!w.cols[(s.y*N+s.x)*Z]){w.cols[(s.y*N+s.x)*Z]=14;w.count++;} I.place(s.x+1,s.y+1,1); I.undo();}", tp)
        pg.wait_for_timeout(900)
        pt = screen_of(pg, tp['x'], tp['y'], 0)
        clip = {'x': max(0, pt['sx'] - 70), 'y': max(0, pt['sy'] - 110), 'width': 140, 'height': 200}
        pg.screenshot(path='%s/%s-tree.png' % (SHOT, label), clip=clip)
        from PIL import Image
        im = Image.open('%s/%s-tree.png' % (SHOT, label)).convert('RGB')
        pink = 0; green = 0
        for (r, g2, b2) in im.getdata():
            if r - g2 > 60 and r - b2 > 60 and b2 > 0.8 * g2 and g2 < 170:
                pink += 1
            if g2 > r + 25 and g2 > b2 + 10:
                green += 1
        ck(label + ' a grown tree has green leaves', green > 300, green)
        ck(label + ' a grown tree has no pink on it', pink < 25, pink)
        pg.evaluate("window.__ISLAND.setPrettyMode('warm')")
    pg.screenshot(path='%s/%s-rest.png' % (SHOT, label))
    ck(label + ' zero console errors', not errs, errs[:3])
    ck(label + ' zero external requests', not ext, ext[:3])
    b.close()

with sync_playwright() as pw:
    only = os.environ.get('FIX_ONLY')
    for label, w, h, q in VIEWS:
        if only and only not in label:
            continue
        run(pw, label, w, h, q)

print('robot-fixes: %d checks, %d failed' % (n, len(fails)))
sys.exit(1 if fails else 0)
