# Chrome honesty. Phone and tablet: nothing kisses a side, the dock
# admits it must scroll on a 390 phone, panels have air, walk HUD wraps,
# WARM is a colour mix only. Picture is the test.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099'
URL = BASE.rstrip('/') + '/island.html?crew=OLLIE'
EDGE = 16
SHOT = os.environ.get('CHROME_SHOT', '/tmp/polish-after')
os.makedirs(SHOT, exist_ok=True)
os.makedirs('/opt/cursor/artifacts/screenshots', exist_ok=True)
n = 0
fails = []

def ck(name, ok, got=''):
    global n
    n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:180]))
    if not ok:
        fails.append(name)

def dismiss(pg):
    for _ in range(14):
        moved = False
        for sel in ['#bclose', '#booknav button:last-child', '#mclose', '#morning button']:
            try:
                loc = pg.locator(sel)
                if loc.count() and loc.first.is_visible():
                    loc.first.click(timeout=1500)
                    moved = True
                    pg.wait_for_timeout(180)
            except Exception:
                pass
        blocked = pg.evaluate(
            "(()=>{const b=document.getElementById('book');const m=document.getElementById('morning');"
            "return !!((b&&b.classList.contains('on'))||(m&&m.classList.contains('on')))})()")
        if not blocked:
            break
        if not moved:
            pg.keyboard.press('Escape')
            pg.mouse.click(8, 8)
            pg.wait_for_timeout(180)

def shot(pg, name):
    path = '%s/%s.png' % (SHOT, name)
    pg.screenshot(path=path)
    try:
        pg.screenshot(path='/opt/cursor/artifacts/screenshots/%s.png' % name)
    except OSError:
        pass

def measure(pg, sel):
    return pg.evaluate("""(sel)=>{
      const el=document.querySelector(sel);
      if(!el) return null;
      const st=getComputedStyle(el);
      if(st.display==='none' || st.visibility==='hidden' || Number(st.opacity)===0) return null;
      const r=el.getBoundingClientRect();
      if(r.width<2 || r.height<2) return null;
      return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};
    }""", sel)

def inset_ok(box, vw, vh, extra=0):
    if not box:
        return True
    pad = EDGE - extra
    return box['l'] >= pad - 1 and box['r'] <= vw - pad + 1

def run(pw, w, hgt, label):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    pg = b.new_page(viewport={'width': w, 'height': hgt})
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(2200)
    dismiss(pg)

    vw, vh = w, hgt
    ck(label + ' the island booted', pg.evaluate("!!window.__ISLAND"))

    # dock honesty
    dock = pg.evaluate("""()=>{
      const b=document.getElementById('bottombar');
      const st=getComputedStyle(b);
      return {sw:b.scrollWidth,cw:b.clientWidth,ox:st.overflowX,
        pl:parseFloat(st.paddingLeft),pr:parseFloat(st.paddingRight)};
    }""")
    ck(label + ' dock declares horizontal scroll', dock['ox'] in ('auto', 'scroll'), dock)
    ck(label + ' dock side pad is at least the edge', dock['pl'] >= EDGE - 0.5 and dock['pr'] >= EDGE - 0.5, dock)
    if w <= 400:
        ck(label + ' phone dock is wider than the screen (PHONE_CAP)', dock['sw'] > dock['cw'] + 8, dock)
        pg.evaluate("document.getElementById('bottombar').scrollLeft=9999")
        pg.wait_for_timeout(200)
        sl = pg.evaluate("document.getElementById('bottombar').scrollLeft")
        ck(label + ' the dock actually moves', sl > 0, sl)
        pg.evaluate("document.getElementById('bottombar').scrollLeft=0")
        pg.wait_for_timeout(160)

    play = pg.locator('#btn-play').bounding_box()
    dream = pg.locator('#btn-dream').bounding_box()
    ck(label + ' PLAY is a huge kid target', play and play['width'] >= 112 and play['height'] >= 112, play)
    ck(label + ' DREAM is the second hero', dream and dream['width'] >= 104 and dream['height'] >= 104, dream)
    ck(label + ' PLAY is bigger than DREAM', play and dream and play['width'] >= dream['width'] - 0.5, (play, dream))

    # first and last visible dock buttons stay off the glass
    pg.evaluate("document.getElementById('bottombar').scrollLeft=0")
    pg.wait_for_timeout(160)
    first = measure(pg, '#bottombar .dock')
    ck(label + ' first dock button clears the left edge', inset_ok(first, vw, vh), first)
    pg.evaluate("document.getElementById('bottombar').scrollLeft=9999")
    pg.wait_for_timeout(200)
    last = pg.evaluate("""()=>{
      const all=[...document.querySelectorAll('#bottombar .dock')].filter(el=>{
        const st=getComputedStyle(el); return st.display!=='none' && st.visibility!=='hidden';
      });
      const el=all[all.length-1]; if(!el) return null;
      const r=el.getBoundingClientRect();
      return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};
    }""")
    ck(label + ' last dock button clears the right edge', inset_ok(last, vw, vh), last)
    shot(pg, '%s-dock-end' % label)

    for sel, name in [('#topbar', 'topbar'), ('#title-badge', 'title chip'),
                      ('#cargo', 'cargo chip'), ('#mini', 'mini map'),
                      ('#btn-book', 'book'), ('#btn-story', 'story'),
                      ('#voybtn', 'voyage'), ('#lookchip', 'LOOK chip')]:
        box = measure(pg, sel)
        ck(label + ' ' + name + ' clears the sides', inset_ok(box, vw, vh), box)
    look = measure(pg, '#lookchip')
    ck(label + ' LOOK is a kid target', look and look['w'] >= 76 and look['h'] >= 76, look)
    rad = pg.evaluate("parseFloat(getComputedStyle(document.getElementById('lookchip')).borderRadius)")
    ck(label + ' LOOK has a soft corner', rad >= 18, rad)

    # one toast only. If the morning boat already spoke, leave it.
    if not measure(pg, '#toast'):
        pg.evaluate("""(()=>{const el=document.getElementById('toast');
          el.textContent='THE MORNING BOAT IS IN! It brought a seed for the island.';
          el.classList.add('on');})()""")
        pg.wait_for_timeout(80)
    toast = measure(pg, '#toast')
    ck(label + ' toast is on and clears the sides', toast and inset_ok(toast, vw, vh), toast)
    shot(pg, '%s-home' % label)

    # drawer
    pg.evaluate("document.getElementById('cur').click()")
    pg.wait_for_timeout(240)
    drawer = measure(pg, '#drawer')
    ck(label + ' drawer opens', drawer is not None, drawer)
    ck(label + ' drawer clears the sides', inset_ok(drawer, vw, vh), drawer)
    shot(pg, '%s-drawer' % label)
    pg.evaluate("document.getElementById('drawer').classList.remove('on')")

    # dream + games
    pg.evaluate("window.__ISLAND.openDream()")
    pg.wait_for_timeout(240)
    dream_p = measure(pg, '#dreampanel')
    help_b = measure(pg, '#dream-help')
    ck(label + ' dream panel clears the sides', inset_ok(dream_p, vw, vh), dream_p)
    ck(label + ' dream help text clears the sides', inset_ok(help_b, vw, vh), help_b)
    shot(pg, '%s-dream' % label)
    pg.evaluate("window.__ISLAND.closeDream()")

    pg.evaluate("window.__ISLAND.longPlay()")
    pg.wait_for_timeout(240)
    games = measure(pg, '#gamemenu')
    ck(label + ' games sheet clears the sides', inset_ok(games, vw, vh), games)
    shot(pg, '%s-games' % label)
    pg.evaluate("document.getElementById('gamemenu').classList.remove('on')")

    # walk HUD. Kill leftover toasts so the picture is clean.
    pg.evaluate("document.getElementById('toast').classList.remove('on')")
    pg.evaluate("window.__ISLAND.setWalk(true)")
    pg.wait_for_timeout(500)
    ck(label + ' walk mode is on', pg.evaluate("window.__ISLAND.walking()===true"))
    hint = measure(pg, '#w-hint')
    jump = measure(pg, '#w-jump')
    exitb = measure(pg, '#w-exit')
    pretty = measure(pg, '#w-pretty')
    stick = measure(pg, '#stick')
    ck(label + ' walk hint wraps inside the edges', hint and inset_ok(hint, vw, vh), hint)
    ck(label + ' JUMP is a huge kid target', jump and jump['w'] >= 96 and jump['h'] >= 96, jump)
    ck(label + ' JUMP clears the sides', inset_ok(jump, vw, vh), jump)
    ck(label + ' STOP WALKING clears the sides', inset_ok(exitb, vw, vh), exitb)
    ck(label + ' stick clears the sides', inset_ok(stick, vw, vh), stick)
    ck(label + ' WARM is on the walk HUD', pretty is not None, pretty)
    ck(label + ' WARM is a kid target', pretty and pretty['w'] >= 72 and pretty['h'] >= 44, pretty)
    ck(label + ' WARM clears the sides', inset_ok(pretty, vw, vh), pretty)
    shot(pg, '%s-walk' % label)
    pg.evaluate("window.__ISLAND.setWalkPretty(true)")
    pg.wait_for_timeout(200)
    ck(label + ' WARM is a flag, not a second engine', pg.evaluate("window.__ISLAND.walkPretty()===true"))
    ck(label + ' walk still draws after warmth', pg.evaluate("window.__ISLAND.glOk()===true"))
    shot(pg, '%s-walk-warm' % label)
    pg.evaluate("window.__ISLAND.setWalk(false)")

    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    b.close()

with sync_playwright() as pw:
    run(pw, 390, 844, 'phone')
    run(pw, 820, 1180, 'tablet')

print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails:
    print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
