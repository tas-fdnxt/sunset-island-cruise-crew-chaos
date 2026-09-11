# FORGE 10, PART TWO, in real Chromium with a touchscreen. iPad first. Written red, before the build.
# The mansion he was promised, the morning gift, cars that face where they drive and splash in the sea,
# backgrounds he can pick, and a card for every islander.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('F10B_SHOT', '/tmp/f10b')
os.makedirs(SHOT, exist_ok=True)
n = 0
fails = []
VIEWS = [
    ('ipad-portrait', 820, 1180, 'crew=OLLIE'),
    ('ipad-landscape', 1180, 820, 'crew=OLLIE'),
    ('phone', 390, 844, 'crew=OLLIE'),
    ('everyone-ipad', 820, 1180, 'crew=PIP'),
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
        for sel in ['#bclose', '#booknav button:last-child', '#sclose', '#mclose', '#morning button', '#lk-close', '#gift-later', '#pp-close']:
            try:
                loc = pg.locator(sel)
                if loc.count() and loc.first.is_visible():
                    loc.first.click(timeout=1500)
                    moved = True
                    pg.wait_for_timeout(180)
            except Exception:
                pass
        blocked = pg.evaluate("(()=>['book','story','morning','lookmenu','gift','people'].some(i=>{const e=document.getElementById(i);return e&&e.classList.contains('on')}))()")
        if not blocked:
            break
        if not moved:
            pg.keyboard.press('Escape')
            pg.wait_for_timeout(180)
    pg.wait_for_timeout(200)

def count(pg):
    return pg.evaluate("window.__ISLAND.world.ref.count")

def houses(pg):
    return pg.evaluate("window.__ISLAND.houses().length")

def sea_cell(pg):
    return pg.evaluate("""()=>{const I=window.__ISLAND,N=I.ISLE.N,m=N>>1;
      for(let x=m;x<N;x++){ if(!I.isLand(x,m) && I.isLand(x-3,m)) return {x:x+2,y:m}; } return null}""")

def run(pw, label, w, h, q):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=(w < 700))
    pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    url = BASE + ('&' if '?' in BASE else '?') + q
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(2400)
    dismiss(pg)
    ck(label + ' booted', pg.evaluate("!!window.__ISLAND"))
    owner = pg.evaluate("!!window.__ISLAND.owner")
    ck(label + ' is the edition it says it is', owner == label.startswith(('ipad', 'phone')), owner)
    ck(label + ' a brand new island gets no gift card', pg.locator('#gift.on').count() == 0)

    # ---- the mansion, from the dream picker ----
    pg.evaluate("window.__ISLAND.openDream()")
    pg.wait_for_timeout(300)
    picks = pg.evaluate("[...document.querySelectorAll('#dream-picks button')].map(b=>b.textContent.trim())")
    ck(label + ' MANSION is in the dream picker', 'MANSION' in picks, picks)
    h0, c0 = houses(pg), count(pg)
    btn = pg.locator('#dream-picks button', has_text='MANSION')
    if btn.count():
        btn.first.tap()
        pg.wait_for_timeout(900)
    ck(label + ' tapping MANSION builds it', count(pg) - c0 >= 100, count(pg) - c0)
    ck(label + ' the mansion is a house', houses(pg) == h0 + 1, (h0, houses(pg)))
    pg.wait_for_timeout(600)
    pg.screenshot(path='%s/%s-mansion.png' % (SHOT, label))
    ck(label + ' somebody moves into the mansion', pg.evaluate("window.__ISLAND.islandersRef().length") >= 1)

    # ---- the morning gift: only Ollie's edition, only on an island he has already played ----
    pg.evaluate("window.__ISLAND.saveNow()")
    pg.evaluate("(()=>{const k=Object.keys(localStorage).find(k=>k.indexOf('journal')!==-1); if(k){const j=JSON.parse(localStorage.getItem(k)); delete j.giftMansion; localStorage.setItem(k, JSON.stringify(j));}})()")
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(2600)
    for sel in ['#bclose', '#sclose', '#mclose', '#morning button']:
        try:
            if pg.locator(sel).count() and pg.locator(sel).first.is_visible():
                pg.locator(sel).first.click(timeout=1500); pg.wait_for_timeout(200)
        except Exception:
            pass
    gift = pg.locator('#gift.on').count() == 1
    if owner:
        ck(label + ' Ollie gets the MANSION. DONE. card the next morning', gift)
        if gift:
            txt = pg.locator('#gift').inner_text().upper()
            ck(label + ' the card keeps the promise in words', 'MANSION' in txt and 'DONE' in txt, txt[:120])
            pg.screenshot(path='%s/%s-gift.png' % (SHOT, label))
            hb = houses(pg)
            pg.locator('#gift-go').tap(); pg.wait_for_timeout(1100)
            ck(label + ' BUILD MY MANSION builds another mansion on clear sand', houses(pg) == hb + 1, (hb, houses(pg)))
            ck(label + ' the card goes away', pg.locator('#gift.on').count() == 0)
            pg.evaluate("window.__ISLAND.saveNow()")
            pg.goto(url, wait_until='load'); pg.wait_for_timeout(2400)
            ck(label + ' the gift never comes twice', pg.locator('#gift.on').count() == 0)
    else:
        ck(label + ' everyone else never gets the family gift card', not gift)
    dismiss(pg)

    # ---- the car faces where it drives, and the sea splashes ----
    s = sea_cell(pg)
    ck(label + ' there is sea to drive into', s is not None, s)
    pg.evaluate("window.__ISLAND.setCar(0); window.__ISLAND.setDrive(true)")
    pg.wait_for_timeout(500)
    if s:
        pg.evaluate("(s)=>{const I=window.__ISLAND; I.warpCar(s.x+0.5, s.y+0.5); I.car.h=0; I.car.sp=5.4;}", s)
        pg.wait_for_timeout(1200)
        st = pg.evaluate("({sp:window.__ISLAND.car.sp, wet:window.__ISLAND.carWet(), splash:window.__ISLAND.splashCount()})")
        ck(label + ' RED ROCKET knows it is in the sea', st['wet'] is True, st)
        ck(label + ' RED ROCKET slows right down in the sea', st['sp'] < 5.4 * 0.5, st)
        ck(label + ' the sea splashes', st['splash'] > 0, st)
        pg.screenshot(path='%s/%s-splash.png' % (SHOT, label))
        pg.evaluate("window.__ISLAND.setCar(2)")
        pg.evaluate("(s)=>{const I=window.__ISLAND; I.warpCar(s.x+0.5, s.y+0.5); I.car.h=Math.PI/2; I.car.sp=5.4;}", s)
        pg.wait_for_timeout(1200)
        st2 = pg.evaluate("({sp:window.__ISLAND.car.sp, wet:window.__ISLAND.carWet()})")
        ck(label + ' SEA CRUISER floats at full speed', st2['wet'] is True and st2['sp'] > 5.4 * 0.8, st2)
        pg.screenshot(path='%s/%s-cruiser.png' % (SHOT, label))
    # a bump into a wall pops the bonnet
    pg.evaluate("window.__ISLAND.setCar(0)")
    wall = pg.evaluate("""()=>{const I=window.__ISLAND,N=I.ISLE.N; for(let r=0;r<30;r++) for(let x=(N>>1)-r;x<=(N>>1)+r;x++){const y=N>>1; if(I.isLand(x,y)&&I.isLand(x+1,y)&&I.isLand(x+2,y)&&I.isLand(x+3,y)){
       let clear=true; for(let k=0;k<4;k++){ for(let z=0;z<I.ISLE.ZMAX;z++) if(I.world.ref.cols[((y*N+x+k)*I.ISLE.ZMAX)+z]) clear=false;} if(clear) return {x,y};}} return null}""")
    if wall:
        pg.evaluate("(p)=>{const I=window.__ISLAND; I.place(p.x+3,p.y,4); I.place(p.x+3,p.y,4); I.warpCar(p.x+0.5,p.y+0.5); I.car.h=0; I.car.sp=5.4;}", wall)
        pg.wait_for_timeout(900)
        ck(label + ' hitting a wall pops the bonnet', pg.evaluate("window.__ISLAND.carBump()") > 0 or pg.evaluate("window.__ISLAND.bumpsEver()") > 0)
    pg.evaluate("window.__ISLAND.setDrive(false)")
    pg.wait_for_timeout(300)

    # ---- pick a background ----
    pg.evaluate("window.__ISLAND.openLook()")
    pg.wait_for_timeout(300)
    bgs = pg.evaluate("[...document.querySelectorAll('#lk-bg button')].map(b=>b.textContent.trim())")
    ck(label + ' the LOOK sheet offers four backgrounds', len(bgs) == 4, bgs)
    if pg.locator('#lk-bg button', has_text='SPACE').count():
        pg.locator('#lk-bg button', has_text='SPACE').first.tap(); pg.wait_for_timeout(500)
    ck(label + ' SPACE is chosen', pg.evaluate("window.__ISLAND.backdrop()") == 'space')
    dismiss(pg)
    pg.evaluate("window.__ISLAND.goHome()"); pg.wait_for_timeout(600)
    pg.screenshot(path='%s/%s-space.png' % (SHOT, label))
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(2400); dismiss(pg)
    ck(label + ' the background is remembered on this device', pg.evaluate("window.__ISLAND.backdrop()") == 'space')
    ck(label + ' nothing new rides in the share link', 'bg=' not in pg.evaluate("window.__ISLAND.shareUrl()"))
    pg.evaluate("window.__ISLAND.setBackdrop('sunset')")

    # ---- a card for every islander ----
    nfolk = pg.evaluate("window.__ISLAND.islandersRef().length")
    if nfolk:
        pg.evaluate("window.__ISLAND.openPeople(0)")
        pg.wait_for_timeout(400)
        ck(label + ' the people card opens', pg.locator('#people.on').count() == 1)
        t1 = pg.locator('#pp-name').inner_text()
        body = pg.locator('#people').inner_text().upper()
        ck(label + ' the card has a name, a job, a story and what they are doing', len(t1) > 1 and 'JOB' in body and 'STORY' in body and 'NOW' in body, body[:200])
        pg.screenshot(path='%s/%s-people.png' % (SHOT, label))
        if nfolk > 1:
            pg.locator('#pp-next').tap(); pg.wait_for_timeout(300)
            ck(label + ' NEXT goes to the next person', pg.locator('#pp-name').inner_text() != t1)
        pg.locator('#pp-close').tap(); pg.wait_for_timeout(300)
        ck(label + ' the card closes', pg.locator('#people.on').count() == 0)
        pg.locator('#pop').tap(timeout=3000); pg.wait_for_timeout(300)
        ck(label + ' tapping the islander count opens the cards', pg.locator('#people.on').count() == 1)
        dismiss(pg)

    ck(label + ' zero console errors', not errs, errs[:3])
    ck(label + ' zero external requests', not ext, ext[:3])
    b.close()

with sync_playwright() as pw:
    only = os.environ.get('F10B_ONLY')
    for label, w, h, q in VIEWS:
        if only and only not in label:
            continue
        run(pw, label, w, h, q)
print('robot-forge10b: %d checks, %d failed' % (n, len(fails)))
sys.exit(1 if fails else 0)
