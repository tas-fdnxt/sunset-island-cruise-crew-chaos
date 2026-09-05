# PRETTY MODES + DAY/NIGHT + SOFT CORNERS. Real Chromium.
# LOOK is a kid-clear control, not a dock hero. Tap cycles soft / warm / crisp.
# Hold peeks day or night on the living sky. Long-press opens the sheet.
# Sleep overnight still wakes into morning. PLAY and DREAM stay the heroes.
# No lock. No sell. Nothing new in the share link.
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
    ck(label + ' LOOK is a kid target', chip and chip['width'] >= 76 and chip['height'] >= 76, chip)
    ck(label + ' LOOK sits on the island, not the dock', pg.evaluate("document.getElementById('lookchip').parentElement.id!=='bottombar'"))
    rad = pg.evaluate("parseFloat(getComputedStyle(document.getElementById('lookchip')).borderRadius)")
    ck(label + ' LOOK has a soft corner', rad >= 18, rad)
    dock_rad = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#bottombar .dock')).borderRadius)")
    ck(label + ' dock corners are soft', dock_rad >= 16, dock_rad)

    start = pg.evaluate("window.__ISLAND.prettyMode()")
    ck(label + ' the first look is soft', start == 'soft', start)
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(350)
    mid = pg.evaluate("window.__ISLAND.prettyMode()")
    ck(label + ' tap cycles to warm', mid == 'warm', mid)
    ck(label + ' warm still lights the old WARM flag', pg.evaluate("window.__ISLAND.walkPretty()===true"))
    shot(pg, '%s-warm' % label.replace(' ', '-'))
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(280)
    crisp = pg.evaluate("window.__ISLAND.prettyMode()")
    ck(label + ' tap cycles to crisp', crisp == 'crisp', crisp)
    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(280)
    ck(label + ' tap cycles back to soft', pg.evaluate("window.__ISLAND.prettyMode()") == 'soft')
    shot(pg, '%s-soft' % label.replace(' ', '-'))

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
