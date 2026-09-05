# BIGGER KID DOCK. Real Chromium. Tools stay about 2cm on a phone.
# PLAY and DREAM stay the heroes. LOOK stays sand-side. The bar scrolls.
# No second dock. Picture is the test.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('DOCK_SHOT', '/tmp/dock')
os.makedirs(SHOT, exist_ok=True)
os.makedirs('/opt/cursor/artifacts/screenshots', exist_ok=True)
n = 0
fails = []
EDGE = 16

def ck(name, ok, got=''):
    global n
    n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:180]))
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
            "(()=>{const b=document.getElementById('book');const s=document.getElementById('story');"
            "const m=document.getElementById('morning');const l=document.getElementById('lookmenu');"
            "return !!((b&&b.classList.contains('on'))||(s&&s.classList.contains('on'))"
            "||(m&&m.classList.contains('on'))||(l&&l.classList.contains('on')))})()")
        if not blocked:
            break
        if not moved:
            pg.keyboard.press('Escape')
            pg.mouse.click(8, 8)
            pg.wait_for_timeout(180)
    pg.wait_for_timeout(200)

def shot(pg, name):
    pg.screenshot(path='%s/%s.png' % (SHOT, name))
    try:
        pg.screenshot(path='/opt/cursor/artifacts/screenshots/%s.png' % name)
    except OSError:
        pass

def box(pg, sel):
    return pg.locator(sel).bounding_box()

def run(pw, url, label, w, hgt):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    pg = b.new_page(viewport={'width': w, 'height': hgt})
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(2400)
    dismiss(pg)

    ck(label + ' the island booted', pg.evaluate("!!window.__ISLAND"))
    ck(label + ' one dock only', pg.locator('#bottombar').count() == 1)
    ck(label + ' no second dock', pg.locator('#bottombar2, #dock2, #tooldock').count() == 0)

    dock = pg.evaluate("""()=>{
      const b=document.getElementById('bottombar');
      const st=getComputedStyle(b);
      return {sw:b.scrollWidth,cw:b.clientWidth,ox:st.overflowX,gap:parseFloat(st.gap)||0,
        pl:parseFloat(st.paddingLeft),pr:parseFloat(st.paddingRight)};
    }""")
    ck(label + ' dock declares horizontal scroll', dock['ox'] in ('auto', 'scroll'), dock)
    ck(label + ' dock side pad is at least the edge', dock['pl'] >= EDGE - 0.5 and dock['pr'] >= EDGE - 0.5, dock)
    ck(label + ' dock gap grew with the buttons', dock['gap'] >= 7.5, dock)
    if w <= 400:
        ck(label + ' phone dock is wider than the screen', dock['sw'] > dock['cw'] + 8, dock)
        pg.evaluate("document.getElementById('bottombar').scrollLeft=9999")
        pg.wait_for_timeout(200)
        sl = pg.evaluate("document.getElementById('bottombar').scrollLeft")
        ck(label + ' the dock actually moves', sl > 0, sl)
        pg.evaluate("document.getElementById('bottombar').scrollLeft=0")
        pg.wait_for_timeout(160)

    play = box(pg, '#btn-play')
    dream = box(pg, '#btn-dream')
    erase = box(pg, '#btn-erase')
    walk = box(pg, '#btn-walk')
    ck(label + ' PLAY is the huge hero', play and play['width'] >= 112 and play['height'] >= 112, play)
    ck(label + ' DREAM is the second hero', dream and dream['width'] >= 104 and dream['height'] >= 104, dream)
    ck(label + ' PLAY is bigger than DREAM', play and dream and play['width'] >= dream['width'] - 0.5, (play, dream))
    ck(label + ' ERASE is about 2cm', erase and erase['width'] >= 72, erase)
    ck(label + ' WALK is about 2cm', walk and walk['width'] >= 72, walk)
    ck(label + ' tools stay smaller than PLAY', erase and play and erase['width'] < play['width'] - 4, (erase, play))
    ck(label + ' tools stay smaller than DREAM', erase and dream and erase['width'] <= dream['width'] + 0.5, (erase, dream))

    look = box(pg, '#lookchip')
    ck(label + ' LOOK is a kid-can-not-miss chip', look and look['width'] >= 90 and look['height'] >= 90, look)
    ck(label + ' LOOK is labeled LOOK', 'LOOK' in pg.locator('#lookchip').inner_text().upper())
    ck(label + ' LOOK sits on the sand, not the dock', pg.evaluate("document.getElementById('lookchip').parentElement.id!=='bottombar'"))
    ck(label + ' LOOK is not a third dock hero', pg.locator('#btn-look').count() == 0)
    if look and play:
        ck(label + ' LOOK sits above the dock', look['y'] + look['height'] <= play['y'] + 8, (look, play))

    pg.evaluate("document.getElementById('bottombar').scrollLeft=0")
    pg.wait_for_timeout(160)
    first = box(pg, '#btn-undo')
    ck(label + ' first dock button clears the left edge', first and first['x'] >= EDGE - 2, first)
    shot(pg, '%s-dock' % label.replace(' ', '-'))
    pg.evaluate("document.getElementById('bottombar').scrollLeft=9999")
    pg.wait_for_timeout(200)
    last = pg.evaluate("""()=>{
      const all=[...document.querySelectorAll('#bottombar .dock')].filter(el=>{
        const st=getComputedStyle(el); return st.display!=='none' && st.visibility!=='hidden';
      });
      const el=all[all.length-1]; if(!el) return null;
      const r=el.getBoundingClientRect();
      return {x:r.left,w:r.width,r:r.right};
    }""")
    ck(label + ' last dock button clears the right edge', last and last['r'] <= w - EDGE + 2, last)
    shot(pg, '%s-dock-end' % label.replace(' ', '-'))
    pg.evaluate("document.getElementById('bottombar').scrollLeft=0")

    ck(label + ' Sleep still lives on the moon', pg.evaluate("document.getElementById('btn-story')!==null"))
    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    b.close()

with sync_playwright() as pw:
    root = BASE.split('/island.html')[0] if '/island.html' in BASE else BASE.rstrip('/')
    if BASE.endswith('.html') or '?crew=' in BASE or '?p=' in BASE:
        run(pw, BASE if 'crew=' in BASE or 'p=' in BASE else BASE + ('&' if '?' in BASE else '?') + 'crew=OLLIE', 'phone', 390, 844)
        run(pw, (BASE.split('?')[0] + '?p=CLEO') if 'island.html' in BASE else root + '/island.html?p=CLEO', 'tablet', 820, 1180)
    else:
        run(pw, root + '/island.html?crew=OLLIE', 'phone', 390, 844)
        run(pw, root + '/island.html?p=CLEO', 'tablet', 820, 1180)

print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails:
    print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
