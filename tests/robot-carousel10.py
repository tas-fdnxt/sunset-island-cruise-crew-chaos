# CAROUSEL TEN. Real Chromium, iPad first. Claims only Forge 10. Pictures drawn live, no photos, no network.
import os, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/ollie-update-10.html'
SHOT = os.environ.get('C10_SHOT', '/tmp/c10'); os.makedirs(SHOT, exist_ok=True)
n = 0; fails = []
def ck(name, ok, got=''):
    global n
    n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:200]))
    if not ok: fails.append(name)
with sync_playwright() as pw:
    for label, w, h in [('ipad', 820, 1180), ('ipad-landscape', 1180, 820), ('phone', 390, 844)]:
        b = pw.chromium.launch(args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=True)
        errs, ext = [], []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://127.0.0.1', 'http://localhost', 'data:')) else None)
        pg.goto(BASE, wait_until='load'); pg.wait_for_timeout(700)
        cards = pg.locator('.card').count()
        ck(label + ' twelve cards', cards == 12, cards)
        txt = pg.locator('#rail').inner_text().upper()
        for word in ['MANSION. DONE.', 'TAP THE TOP', 'ONE BLOCK AT A TIME', 'FINDS SAND', 'HOLD THE YELLOW', 'THREE NEW CARS', 'DRIVE INTO THE SEA', 'FOUR SEAS', 'A CARD FOR EVERY ISLANDER', 'NO MORE PINK TREES']:
            ck(label + ' claims ' + word, word in txt)
        ck(label + ' never locks or sells', all(x not in txt for x in ['LOCKED IN', 'BUY NOW', 'UNLOCK', 'COINS TO PLAY']))
        ck(label + ' no surname anywhere', 'DIAZ' not in pg.content().upper())
        ck(label + ' no em dash anywhere', '\u2014' not in pg.content())
        ink = pg.evaluate("""()=>[...document.querySelectorAll('canvas.pic')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let k=0;for(let i=0;i<d.length;i+=16){if((d[i]<90&&d[i+1]<80&&d[i+2]<110)||(d[i+1]>d[i]+25&&d[i+1]>d[i+2]+10))k++;}return k;})""")
        ck(label + ' every picture is actually drawn', len(ink) == 4 and all(k > 60 for k in ink), ink)
        for i in range(cards):
            pg.evaluate("(i)=>{const r=document.getElementById('rail');r.scrollTo({left:i*r.clientWidth})}", i); pg.wait_for_timeout(250)
            if label == 'ipad': pg.screenshot(path='%s/%s-%02d.png' % (SHOT, label, i))
        ck(label + ' the last card is reached', pg.evaluate("document.getElementById('next').disabled") is True)
        ck(label + ' the button goes to Ollie\'s island', pg.locator('a.go').get_attribute('href') == 'island.html?crew=OLLIE')
        ck(label + ' zero console errors', not errs, errs[:2])
        ck(label + ' zero external requests', not ext, ext[:2])
        b.close()
print('robot-carousel10: %d checks, %d failed' % (n, len(fails)))
sys.exit(1 if fails else 0)
