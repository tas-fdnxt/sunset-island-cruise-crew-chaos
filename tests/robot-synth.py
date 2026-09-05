# SYNTH SFX SUITE. Real Chromium. Seven kid-safe voices, mute silences
# every one, no audio files, no external requests. PLAY and DREAM stay
# the dock heroes. LOOK stays sand-side. SOUND lives on the look sheet.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('SYNTH_SHOT', '/tmp/synth')
os.makedirs(SHOT, exist_ok=True)
os.makedirs('/opt/cursor/artifacts/screenshots', exist_ok=True)
n = 0
fails = []
VOICES = ['place', 'erase', 'dream', 'sleep', 'look', 'goal', 'toast']

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

    ck(label + ' the island engine booted', pg.evaluate("!!window.__ISLAND && typeof window.__ISLAND.playSfx==='function'"))
    ck(label + ' PLAY stays on the dock', pg.locator('#btn-play').count() == 1)
    ck(label + ' DREAM stays on the dock', pg.locator('#btn-dream').count() == 1)
    ck(label + ' LOOK is not a third dock hero', pg.locator('#btn-look').count() == 0)
    ck(label + ' mute is not a dock button', pg.locator('#btn-mute').count() == 0)
    ck(label + ' the seven voices are live', pg.evaluate("window.__ISLAND.SFX_IDS.join()==='place,erase,dream,sleep,look,goal,toast'"))

    pg.evaluate("window.__ISLAND.setSfxMute(false)")
    heard = []
    for name in VOICES:
        row = pg.evaluate("(n)=>{const r=window.__ISLAND.playSfx(n); const last=window.__ISLAND.lastSfx(); return {ok:!!r&&r.ok, silent:!!r.silent, id:r&&r.id, last:last&&last.id, lastSilent:!!(last&&last.silent)};}", name)
        heard.append(row)
        ck(label + ' ' + name + ' plays', row['ok'] and row['silent'] is False and row['id'] == name and row['last'] == name, row)
    ck(label + ' every voice was distinct in order', [h['id'] for h in heard] == VOICES)

    before = pg.evaluate("window.__ISLAND.shareUrl()")
    pg.evaluate("window.__ISLAND.setSfxMute(true)")
    mute = pg.evaluate("(()=>{const r=window.__ISLAND.playSfx('place'); const last=window.__ISLAND.lastSfx(); return {muted:window.__ISLAND.sfxMute()===true, silent:!!r.silent, why:r.why, lastSilent:!!(last&&last.silent)};})()")
    ck(label + ' mute silences place', mute['muted'] and mute['silent'] and mute['why'] == 'mute' and mute['lastSilent'], mute)
    dream_m = pg.evaluate("window.__ISLAND.playSfx('dream')")
    ck(label + ' mute silences dream', dream_m.get('silent') is True and dream_m.get('why') == 'mute', dream_m)
    pg.evaluate("window.__ISLAND.setSfxMute(false)")
    again = pg.evaluate("window.__ISLAND.playSfx('goal')")
    ck(label + ' unmute lets goal speak', again.get('silent') is False and again.get('id') == 'goal', again)
    after = pg.evaluate("window.__ISLAND.shareUrl()")
    ck(label + ' synth adds nothing to the share link', before == after)
    ck(label + ' the share link stays under 1700', pg.evaluate("window.__ISLAND.shareUrl().length <= 1700"))

    land = pg.evaluate("(()=>{for(let y=30;y<90;y++)for(let x=30;x<90;x++)if(window.__ISLAND.isLand(x,y))return {x:x,y:y}; return null;})()")
    if land:
        pg.evaluate("(c)=>window.__ISLAND.place(c.x,c.y,3)", land)
        last = pg.evaluate("window.__ISLAND.lastSfx()")
        ck(label + ' a real place uses the place voice', last and last.get('id') == 'place' and last.get('silent') is False, last)
        pg.evaluate("(c)=>window.__ISLAND.erase(c.x,c.y)", land)
        last = pg.evaluate("window.__ISLAND.lastSfx()")
        ck(label + ' a real erase uses the erase voice', last and last.get('id') == 'erase' and last.get('silent') is False, last)

    pg.evaluate("window.__ISLAND.tapPretty()")
    pg.wait_for_timeout(200)
    last = pg.evaluate("window.__ISLAND.lastSfx()")
    ck(label + ' a look change uses the look voice', last and last.get('id') == 'look', last)

    pg.evaluate("window.__ISLAND.longPretty()")
    pg.wait_for_timeout(280)
    ck(label + ' the look sheet opened', pg.evaluate("window.__ISLAND.lookOpen()===true"))
    sound = pg.locator('#lk-sound')
    ck(label + ' SOUND lives on the look sheet', sound.count() == 1)
    txt = sound.inner_text().upper()
    ck(label + ' SOUND is on after unmute', 'SOUND ON' in txt, txt)
    ck(label + ' SOUND never locks or sells', all(w not in txt for w in ['LOCKED', 'BUY', 'UNLOCK', 'COINS']))
    shot(pg, '%s-sound' % label.replace(' ', '-'))
    pg.evaluate("document.getElementById('lk-sound').click()")
    pg.wait_for_timeout(200)
    ck(label + ' SOUND toggles mute', pg.evaluate("window.__ISLAND.sfxMute()===true"))
    ck(label + ' SOUND reads OFF', 'OFF' in pg.locator('#lk-sound').inner_text().upper())
    pg.evaluate("window.__ISLAND.setSfxMute(false)")
    pg.evaluate("window.__ISLAND.closeLook()")
    pg.wait_for_timeout(160)

    ck(label + ' Sleep still lives on the moon', pg.evaluate("typeof window.__ISLAND.holdSleep==='function'"))
    ck(label + ' Replay still lives on UNDO', pg.evaluate("typeof window.__ISLAND.holdReplay==='function'"))
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
