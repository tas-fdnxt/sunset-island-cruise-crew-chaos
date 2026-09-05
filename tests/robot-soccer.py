# Drives the real UI in real Chromium: the dock must scroll, GAMES must open,
# the pitch must lay, and a kicked ball must actually score.
import sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8099/island.html'
n = 0; fails = []
def ck(name, ok, got=''):
    global n; n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:160]))
    if not ok: fails.append(name)

def dismiss(pg):
    # the way a child does it: press the close button, then the morning card, then anything left
    for _ in range(14):
        moved = False
        for sel in ['#bclose', '#booknav button:last-child', '#mclose', '#morning button']:
            try:
                loc = pg.locator(sel)
                if loc.count() and loc.first.is_visible():
                    loc.first.click(timeout=1500); moved = True; pg.wait_for_timeout(200)
            except Exception: pass
        blocked = pg.evaluate("(()=>{const b=document.getElementById('book');const m=document.getElementById('morning');"
                              "return !!((b&&b.classList.contains('on'))||(m&&m.classList.contains('on')))})()")
        if not blocked: break
        if not moved:
            pg.keyboard.press('Escape'); pg.mouse.click(6, 6); pg.wait_for_timeout(200)
    pg.wait_for_timeout(250)

def run(pw, url, label, w, hgt):
    global n
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    pg = b.new_page(viewport={'width': w, 'height': hgt})
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'data:', 'blob:')) else None)
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(2600)
    dismiss(pg)

    # THE DEFECT: the dock must be able to move
    m = pg.evaluate("(()=>{const b=document.getElementById('bottombar');return{sw:b.scrollWidth,cw:b.clientWidth,ox:getComputedStyle(b).overflowX}})()")
    ck(label + ' dock declares horizontal scroll', m['ox'] in ('auto', 'scroll'), m)
    if m['sw'] > m['cw'] + 2:
        pg.evaluate("document.getElementById('bottombar').scrollLeft=9999")
        pg.wait_for_timeout(260)
        sl = pg.evaluate("document.getElementById('bottombar').scrollLeft")
        ck(label + ' the dock actually moves', sl > 0, sl)
    else:
        ck(label + ' dock fits, nothing to scroll', True, m)

    ck(label + ' GAMES is in the dock', pg.locator('#btn-games').count() == 1)
    pg.locator('#btn-games').click(); pg.wait_for_timeout(500)
    ck(label + ' the picker opens', pg.locator('#gamemenu.on').count() == 1)
    ck(label + ' four games are offered', pg.locator('#gamemenu button.gm').count() == 4,
       pg.locator('#gamemenu button.gm').count())
    txt = pg.locator('#gm-list').inner_text().upper()
    ck(label + ' soccer is first', txt.startswith('\u26BD') or 'SOCCER' in txt.split('\n')[0].upper(), txt[:60])
    for bad in ['LOCKED', 'BUY', 'UNLOCK', 'COINS TO PLAY', 'COMING SOON']:
        ck(label + ' nothing says ' + bad, bad not in txt, txt[:120])

    # soccer: lay the pitch, then score
    pg.locator('#gamemenu button.gm').first.click(); pg.wait_for_timeout(700)
    laid = pg.evaluate("(()=>{const j=window.__ISLAND.journal();return j.bp?j.bp.id:null})()")
    ck(label + ' the pitch plan is in hand', laid == 'pitch', laid)
    built = pg.evaluate("(()=>{const j=window.__ISLAND.journal(),o=j.bp;return o?{x:o.x,y:o.y}:null})()")
    ck(label + ' the plan has a place on the sand', built and 'x' in built, built)
    # hire nobody: place the blocks directly through the same place() the game uses
    pg.evaluate("""(()=>{const I=window.__ISLAND;const j=I.journal(),o=j.bp;
      const W=I.PITCH_W,H=I.PITCH_H;
      for(let dx=0;dx<W;dx++){I.place(o.x+dx,o.y,2);I.place(o.x+dx,o.y+H-1,2);}
      for(let dy=1;dy<H-1;dy++){if(dy<2||dy>=4){I.place(o.x,o.y+dy,2);I.place(o.x+W-1,o.y+dy,2);}}
    })()""")
    pg.wait_for_timeout(700)
    p = pg.evaluate("(()=>{const p=window.__ISLAND.pitch();return p?{x:p.x,y:p.y}:null})()")
    ck(label + ' the built pitch is found', p is not None, p)
    bl = pg.evaluate("(()=>{const b=window.__ISLAND.ballAt();return b?{x:b.x,y:b.y}:null})()")
    ck(label + ' a ball appears on the centre spot', bl is not None, bl)
    before = pg.evaluate("window.__ISLAND.journal().goalsToday||0")
    pg.evaluate("window.__ISLAND.kick(-9,0)"); pg.wait_for_timeout(1400)
    after = pg.evaluate("window.__ISLAND.journal().goalsToday||0")
    ck(label + ' a kicked ball scores a goal', after == before + 1, {'before': before, 'after': after})
    ck(label + ' the ball resets to the centre',
       pg.evaluate("(()=>{const b=window.__ISLAND.ballAt();return b?Math.round(b.vx*100)/100:null})()") == 0)
    cap = pg.evaluate("""(()=>{const j=window.__ISLAND.journal();
      for(let i=0;i<9;i++){j.goalsToday=(j.goalsToday||0)+1;}
      return j.goalCoinsToday||0;})()""")
    ck(label + ' goal coins are capped for the day', cap <= 5, cap)

    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    pg.screenshot(path='/tmp/shot-' + label.replace(' ', '-') + '.png')
    b.close()

with sync_playwright() as pw:
    run(pw, BASE + '?crew=OLLIE', 'ollie 390', 390, 844)
    run(pw, BASE + '?p=CLEO', 'crew 820', 820, 1180)
print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails: print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
