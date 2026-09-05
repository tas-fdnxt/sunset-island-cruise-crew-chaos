# PRETTY PUNCH. Real Chromium. Default look is WARM. Soft is not the
# default island. Warm / Crisp / Night are unmistakable at a glance.
# LOOK is a labeled sand chip, not a third dock hero. Hold flips the sky.
# PLAY and DREAM stay the heroes. No lock. No sell. Nothing new in the share link.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('PRETTY_SHOT', '/tmp/pretty')
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

    ck(label + ' the island engine booted', pg.evaluate("!!window.__ISLAND && typeof window.__ISLAND.tapPretty==='function'"))
    ck(label + ' PLAY stays on the dock', pg.locator('#btn-play').count() == 1)
    ck(label + ' DREAM stays on the dock', pg.locator('#btn-dream').count() == 1)
    ck(label + ' LOOK is not a third dock hero', pg.locator('#btn-look').count() == 0)
    chip = pg.locator('#lookchip').bounding_box()
    ck(label + ' LOOK is a kid-can-not-miss chip', chip and chip['width'] >= 90 and chip['height'] >= 90, chip)
    ck(label + ' LOOK sits on the island, not the dock', pg.evaluate("document.getElementById('lookchip').parentElement.id!=='bottombar'"))
    rad = pg.evaluate("parseFloat(getComputedStyle(document.getElementById('lookchip')).borderRadius)")
    ck(label + ' LOOK has a soft corner', rad >= 18, rad)
    dock_rad = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#bottombar .dock')).borderRadius)")
    ck(label + ' dock corners are soft', dock_rad >= 16, dock_rad)
    chip_txt = pg.locator('#lookchip').inner_text().upper()
    ck(label + ' LOOK is labeled LOOK', 'LOOK' in chip_txt, chip_txt)
    ck(label + ' LOOK names the live look', 'WARM' in chip_txt, chip_txt)

    def sky_rgb():
        return pg.evaluate("""()=>{
          const c=document.getElementById('world');
          const x=Math.max(2, Math.floor(c.width*0.5));
          const y=Math.max(2, Math.floor(c.height*0.10));
          const d=c.getContext('2d').getImageData(x,y,1,1).data;
          return [d[0],d[1],d[2]];
        }""")

    def rgb_dist(a, b):
        return abs(a[0]-b[0]) + abs(a[1]-b[1]) + abs(a[2]-b[2])

    start = pg.evaluate("window.__ISLAND.prettyMode()")
    ck(label + ' the first look is warm', start == 'warm', start)
    ck(label + ' warm still lights the old WARM flag', pg.evaluate("window.__ISLAND.walkPretty()===true"))
    pg.wait_for_timeout(220)
    warm_sky = sky_rgb()
    ck(label + ' default warm sky leans peach', warm_sky[0] > warm_sky[2] + 12, warm_sky)
    shot(pg, '%s-warm' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(350)
    crisp = pg.evaluate("window.__ISLAND.prettyMode()")
    ck(label + ' tap cycles to crisp', crisp == 'crisp', crisp)
    crisp_sky = sky_rgb()
    ck(label + ' crisp sky is not warm', rgb_dist(crisp_sky, warm_sky) >= 40, (warm_sky, crisp_sky))
    shot(pg, '%s-crisp' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(280)
    ck(label + ' tap cycles to soft', pg.evaluate("window.__ISLAND.prettyMode()") == 'soft')
    soft_sky = sky_rgb()
    ck(label + ' soft sky is not warm', rgb_dist(soft_sky, warm_sky) >= 40, (warm_sky, soft_sky))
    ck(label + ' soft sky is not crisp', rgb_dist(soft_sky, crisp_sky) >= 28, (soft_sky, crisp_sky))
    shot(pg, '%s-soft' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(280)
    ck(label + ' tap cycles back to warm', pg.evaluate("window.__ISLAND.prettyMode()") == 'warm')
    ck(label + ' chip flashes the new look', 'WARM' in pg.locator('#lookchip').inner_text().upper())

    pg.evaluate("window.__ISLAND.setHour(14)")
    pg.evaluate("window.__ISLAND.setPrettyTime('auto')")
    pg.wait_for_timeout(200)
    day_sky = pg.evaluate("(()=>{const s=window.__ISLAND.lookSky(); return s && s.night < 0.2 && !!s.sun;})()")
    ck(label + ' afternoon auto sky is day', day_sky is True, day_sky)
    pg.evaluate("window.__ISLAND.holdPretty()")
    pg.wait_for_timeout(400)
    night = pg.evaluate("window.__ISLAND.prettyTime()")
    night_sky = pg.evaluate("(()=>{const s=window.__ISLAND.lookSky(); return s && s.night > 0.8 && !!s.moon;})()")
    ck(label + ' hold from day peeks night', night == 'night', night)
    ck(label + ' the painted sky is night', night_sky is True, night_sky)
    night_rgb = sky_rgb()
    night_lum = night_rgb[0] * 0.3 + night_rgb[1] * 0.5 + night_rgb[2] * 0.2
    ck(label + ' night sky is dark at a glance', night_lum < 90, (night_rgb, night_lum))
    ck(label + ' chip names NIGHT after the hold', 'NIGHT' in pg.locator('#lookchip').inner_text().upper())
    shot(pg, '%s-night' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.holdPretty()")
    pg.wait_for_timeout(300)
    ck(label + ' hold from night peeks day', pg.evaluate("window.__ISLAND.prettyTime()") == 'day')
    shot(pg, '%s-day' % label.replace(' ', '-'))

    pg.evaluate("window.__ISLAND.longPretty()")
    pg.wait_for_timeout(350)
    ck(label + ' long-press opens the LOOK sheet', pg.evaluate("window.__ISLAND.lookOpen()===true"))
    sheet = pg.locator('#lookmenu').inner_text().upper()
    ck(label + ' the sheet names the three looks', 'SOFT' in sheet and 'WARM' in sheet and 'CRISP' in sheet, sheet[:180])
    ck(label + ' the sheet names day and night', 'DAY' in sheet and 'NIGHT' in sheet, sheet[:180])
    ck(label + ' the sheet never locks or sells', all(w not in sheet for w in ['LOCKED', 'BUY NOW', 'UNLOCK', 'COINS TO PLAY']))
    shot(pg, '%s-sheet' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.closeLook()")
    pg.wait_for_timeout(200)

    before = pg.evaluate("window.__ISLAND.shareUrl()")
    pg.evaluate("window.__ISLAND.setPrettyMode('warm'); window.__ISLAND.setPrettyTime('night')")
    after = pg.evaluate("window.__ISLAND.shareUrl()")
    ck(label + ' pretty adds nothing to the share link', before == after, (before[-40:] if isinstance(before, str) else before, after[-40:] if isinstance(after, str) else after))
    ck(label + ' the share link stays under 1700', pg.evaluate("window.__ISLAND.shareUrl().length <= 1700"))
    ck(label + ' journal recorded the look', pg.evaluate("window.__ISLAND.journal().prettyToday >= 1"))

    pg.evaluate("window.__ISLAND.setWalk(true)")
    pg.wait_for_timeout(400)
    ck(label + ' walk still draws after a pretty mix', pg.evaluate("window.__ISLAND.walking()===true && window.__ISLAND.glOk()===true"))
    wp = pg.locator('#w-pretty').bounding_box()
    ck(label + ' walk LOOK is a kid target', wp and wp['width'] >= 72 and wp['height'] >= 44, wp)
    shot(pg, '%s-walk' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.setWalk(false)")
    pg.wait_for_timeout(200)

    ck(label + ' Sleep still lives on the moon', pg.evaluate("typeof window.__ISLAND.holdSleep==='function' && document.getElementById('btn-story')!==null"))
    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    shot(pg, '%s-home' % label.replace(' ', '-'))
    b.close()

with sync_playwright() as pw:
    root = BASE.split('/island.html')[0] if '/island.html' in BASE else BASE.rstrip('/')
    if BASE.endswith('.html') or '?crew=' in BASE or '?p=' in BASE:
        run(pw, BASE if 'crew=' in BASE or 'p=' in BASE else BASE + ('&' if '?' in BASE else '?') + 'crew=OLLIE', 'ollie 390', 390, 844)
        run(pw, (BASE.split('?')[0] + '?p=CLEO') if 'island.html' in BASE else root + '/island.html?p=CLEO', 'crew 820', 820, 1180)
    else:
        run(pw, root + '/island.html?crew=OLLIE', 'ollie 390', 390, 844)
        run(pw, root + '/island.html?p=CLEO', 'crew 820', 820, 1180)

print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails:
    print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
