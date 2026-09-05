# OVERNIGHT + NPC MEMORY. Real Chromium. The moon is Sleep.
# Tap still opens tonight's chapter. Hold sleeps the island and the
# islanders remember in the share hash. Long-press opens the shelf.
# PLAY and DREAM stay the dock heroes. No lock. No sell.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('OVERNIGHT_SHOT', '/tmp/overnight')
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
        for sel in ['#bclose', '#booknav button:last-child', '#sclose', '#mclose', '#morning button']:
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
            "const m=document.getElementById('morning');"
            "return !!((b&&b.classList.contains('on'))||(s&&s.classList.contains('on'))||(m&&m.classList.contains('on')))})()")
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

    ck(label + ' the island engine booted', pg.evaluate("!!window.__ISLAND && typeof window.__ISLAND.holdSleep==='function'"))
    ck(label + ' tap Sleep is a live hook', pg.evaluate("typeof window.__ISLAND.tapSleep==='function' && typeof window.__ISLAND.longSleep==='function'"))
    ck(label + ' PLAY stays on the dock', pg.locator('#btn-play').count() == 1)
    ck(label + ' DREAM stays on the dock', pg.locator('#btn-dream').count() == 1)
    ck(label + ' Sleep is not a third dock hero', pg.locator('#btn-sleep').count() == 0)
    moon = pg.locator('#btn-story').bounding_box()
    ck(label + ' the moon is a kid target', moon and moon['width'] >= 56 and moon['height'] >= 56, moon)
    ck(label + ' the moon says Sleep', 'sleep' in (pg.locator('#btn-story').get_attribute('aria-label') or '').lower())

    pg.evaluate("window.__ISLAND.tapSleep()")
    pg.wait_for_timeout(500)
    ck(label + ' tap opens tonight\'s chapter', pg.evaluate("document.getElementById('story').classList.contains('on')===true"))
    title = pg.locator('#storytitle').inner_text()
    ck(label + ' tap is a chapter, not a shop', 'CHAPTER' in title.upper() or 'WHAT' in title.upper(), title)
    shot(pg, '%s-tap-chapter' % label.replace(' ', '-'))
    pg.locator('#sclose').click()
    pg.wait_for_timeout(250)

    built = pg.evaluate("""(()=>{
      const I=window.__ISLAND, ox=58, oy=58;
      for (let x=ox; x<=ox+4; x++) for (let y=oy; y<=oy+4; y++) {
        const e = (x===ox || x===ox+4 || y===oy || y===oy+4);
        if (e) { I.place(x,y,3); I.place(x,y,(x===ox+2 && y===oy+4)?6:4); }
      }
      I.popCheck();
      return { houses: I.houses().length, folk: I.islandersRef().length };
    })()""")
    ck(label + ' a house brings an islander', built and built.get('houses', 0) >= 1 and built.get('folk', 0) >= 1, built)

    pg.evaluate("""(()=>{
      const I=window.__ISLAND;
      const p = I.islandersRef()[0];
      if (p) I.talkToKeeper ? null : null;
      const hit = { p: p, px: 200, py: 200 };
      // talk the way a child does: centre and tap
      I.centreOn(p.x, p.y);
    })()""")
    pg.wait_for_timeout(200)
    # mark a hello through a tap on the islander after centering
    pg.evaluate("""(()=>{
      const I=window.__ISLAND, p=I.islandersRef()[0];
      if (!p) return;
      const c = I.cellScreen(Math.floor(p.x), Math.floor(p.y));
      I.tapAt && I.tapAt(c.sx, c.sy);
    })()""")
    pg.wait_for_timeout(400)

    pg.evaluate("window.__ISLAND.holdSleep()")
    pg.wait_for_timeout(700)
    ck(label + ' hold opens the morning card', pg.evaluate("document.getElementById('story').classList.contains('on')===true"))
    head = pg.locator('#storytitle').inner_text()
    body = pg.locator('#storybody').inner_text()
    ck(label + ' morning card says THIS MORNING', 'MORNING' in head.upper(), head)
    ck(label + ' morning names a remembered islander', 'remembered' in body.lower() or 'slept' in body.lower(), body[:200])
    ck(label + ' morning never locks or sells', all(w not in body.upper() for w in ['LOCKED', 'BUY NOW', 'UNLOCK', 'COINS TO PLAY']))
    ck(label + ' journal recorded the sleep', pg.evaluate("!!(window.__ISLAND.journal().overnight || window.__ISLAND.journal().sleptToday || (window.__ISLAND.journal().book||[]).length)"))
    shot(pg, '%s-morning' % label.replace(' ', '-'))
    pg.locator('#sclose').click()
    pg.wait_for_timeout(200)

    mem = pg.evaluate("(()=>{const m=window.__ISLAND.npcMem(); return m && m.some(s=>s && (s.nights>0 || s.kind==='sleep' || s.kind==='hello'));})()")
    ck(label + ' an islander now has durable memory', mem is True, mem)
    url = pg.evaluate("window.__ISLAND.shareUrl()")
    ck(label + ' the share link carries &m=', isinstance(url, str) and '&m=' in url, url[-80:] if isinstance(url, str) else url)
    parsed = pg.evaluate("""(()=>{
      const I=window.__ISLAND, u=I.shareUrl(), hash=u.slice(u.indexOf('#'));
      const p=I.parseHash(hash);
      return p && p.m && p.m.some(s=>s && (s.nights>0 || s.kind==='sleep' || s.kind==='hello'));
    })()""")
    ck(label + ' parseHash restores the memory', parsed is True, parsed)
    ck(label + ' the share link stays under 1700', pg.evaluate("window.__ISLAND.shareUrl().length <= 1700"))

    pg.evaluate("window.__ISLAND.longSleep()")
    pg.wait_for_timeout(400)
    ck(label + ' long-press opens the story card', pg.evaluate("document.getElementById('story').classList.contains('on')===true"))
    ck(label + ' long-press opens the shelf', pg.evaluate("document.getElementById('shelf').classList.contains('on')===true"))
    shot(pg, '%s-shelf' % label.replace(' ', '-'))
    pg.evaluate("document.getElementById('shelf').classList.remove('on')")

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
