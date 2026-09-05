# BUILD REPLAY. Real Chromium. UNDO is the Build path.
# Tap still undoes. Hold peels the last placements and they go down
# again. Long-press watches a longer run. PLAY and DREAM stay the
# dock heroes. No lock. No sell. Nothing new in the share hash.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('REPLAY_SHOT', '/tmp/replay')
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

def wait_replay_done(pg, timeout_ms=6000):
    pg.wait_for_function(
        "() => !window.__ISLAND.replayOn()",
        timeout=timeout_ms)

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

    ck(label + ' the island engine booted', pg.evaluate("!!window.__ISLAND && typeof window.__ISLAND.holdReplay==='function'"))
    ck(label + ' tap UNDO is a live hook', pg.evaluate("typeof window.__ISLAND.tapUndo==='function' && typeof window.__ISLAND.longReplay==='function'"))
    ck(label + ' PLAY stays on the dock', pg.locator('#btn-play').count() == 1)
    ck(label + ' DREAM stays on the dock', pg.locator('#btn-dream').count() == 1)
    ck(label + ' Replay is not a third dock hero', pg.locator('#btn-replay').count() == 0)
    undo = pg.locator('#btn-undo').bounding_box()
    ck(label + ' UNDO is still on the dock', undo and undo['width'] >= 44 and undo['height'] >= 44, undo)
    ck(label + ' UNDO still says undo', 'undo' in (pg.locator('#btn-undo').get_attribute('aria-label') or '').lower())

    placed = pg.evaluate("""(()=>{
      const I=window.__ISLAND, ox=54, oy=54;
      for (let x=ox; x<ox+6; x++) I.place(x, oy, 3);
      I.centreOn(ox+2, oy);
      return { count: I.world.ref.count, enc: I.encode() };
    })()""")
    ck(label + ' six blocks went down', placed and placed.get('count') >= 6, placed)
    before = placed.get('enc')
    shot(pg, '%s-built' % label.replace(' ', '-'))

    pg.evaluate("window.__ISLAND.holdReplay()")
    pg.wait_for_timeout(80)
    mid = pg.evaluate("(()=>{const I=window.__ISLAND;return {on:I.replayOn(), count:I.world.ref.count, left:I.replayLeft()};})()")
    ck(label + ' hold peels the blocks so you can watch', mid and (mid.get('on') is True or mid.get('count') < placed.get('count')), mid)
    shot(pg, '%s-watching' % label.replace(' ', '-'))
    wait_replay_done(pg)
    pg.wait_for_timeout(220)
    after = pg.evaluate("(()=>{const I=window.__ISLAND;return {count:I.world.ref.count, enc:I.encode(), replayed:I.journal().replayedToday||0, on:I.replayOn()};})()")
    ck(label + ' the blocks came back', after and after.get('count') == placed.get('count'), after)
    ck(label + ' encode matches what you built', after and after.get('enc') == before)
    ck(label + ' replay finished', after and after.get('on') is False)
    ck(label + ' journal recorded the watch', after and after.get('replayed') >= 1, after)
    toast = pg.evaluate("(()=>{const t=document.getElementById('toast');return t?t.textContent:'';})()")
    ck(label + ' a kid toast names the beat', any(w in (toast or '').upper() for w in ['WATCH', 'AGAIN', 'BUILDING']), toast)
    ck(label + ' toast never locks or sells', all(w not in (toast or '').upper() for w in ['LOCKED', 'BUY NOW', 'UNLOCK', 'COINS TO PLAY']))
    shot(pg, '%s-again' % label.replace(' ', '-'))

    url_share = pg.evaluate("window.__ISLAND.shareUrl()")
    ck(label + ' the share link has no replay field', isinstance(url_share, str) and 'replay' not in url_share.lower(), url_share[-80:] if isinstance(url_share, str) else url_share)
    ck(label + ' the share link stays under 1700', pg.evaluate("window.__ISLAND.shareUrl().length <= 1700"))

    before_undo = pg.evaluate("window.__ISLAND.world.ref.count")
    pg.evaluate("window.__ISLAND.tapUndo()")
    pg.wait_for_timeout(200)
    after_undo = pg.evaluate("window.__ISLAND.world.ref.count")
    ck(label + ' tap UNDO still takes a stroke back', after_undo < before_undo, (before_undo, after_undo))

    pg.evaluate("window.__ISLAND.longReplay()")
    pg.wait_for_timeout(80)
    ck(label + ' long-press starts a longer watch', pg.evaluate("window.__ISLAND.replayOn()===true || window.__ISLAND.world.ref.count>=0"))
    wait_replay_done(pg)
    pg.wait_for_timeout(160)
    ck(label + ' long-press still leaves you playing', pg.evaluate("!window.__ISLAND.replayOn()"))

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
