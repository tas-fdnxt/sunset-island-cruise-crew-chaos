# FORGE 11: THE CAPTAIN'S CONTROLS. Real Chromium, touchscreen, iPad first. Written red, before the build.
# Every ask from the playtest about buttons and screens, as something a robot can prove on his actual screen sizes.
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8099/island.html'
SHOT = os.environ.get('F11_SHOT', '/tmp/f11')
os.makedirs(SHOT, exist_ok=True)
n = 0
fails = []
VIEWS = [
    ('ipad-portrait', 820, 1180, 'crew=OLLIE', True),
    ('ipad-landscape', 1180, 820, 'crew=OLLIE', True),
    ('ipad-mini', 768, 1024, 'crew=OLLIE', True),
    ('ipad-pro-landscape', 1366, 1024, 'crew=OLLIE', True),
    ('phone', 390, 844, 'crew=OLLIE', False),
    ('everyone-ipad', 820, 1180, 'crew=PIP', True),
]
SHEETS = ['dreampanel', 'gamemenu', 'lookmenu', 'drawer', 'people', 'board', 'voymenu', 'modepop']

def ck(name, ok, got=''):
    global n
    n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:260]))
    if not ok:
        fails.append(name)

def settle(pg):
    for _ in range(8):
        for sel in ['#bclose', '#sclose', '#mclose', '#morning button', '#gift-later', '#wclose']:
            try:
                loc = pg.locator(sel)
                if loc.count() and loc.first.is_visible():
                    loc.first.click(timeout=1200); pg.wait_for_timeout(150)
            except Exception:
                pass
        if not pg.evaluate("['book','story','morning','gift','win'].some(i=>{const e=document.getElementById(i);return e&&e.classList.contains('on')})"):
            break
    pg.wait_for_timeout(250)

VISIBLE_BUTTONS = """()=>{const out=[];for(const e of document.querySelectorAll('button,#pop')){const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  if(r.width<2||r.height<2||s.visibility==='hidden'||s.display==='none'||+s.opacity===0)continue;
  let p=e,hid=false;while(p){const ps=getComputedStyle(p);if(ps.display==='none'||ps.visibility==='hidden'){hid=true;break;}p=p.parentElement;}
  if(hid)continue; if(r.bottom<=0||r.right<=0||r.top>=innerHeight||r.left>=innerWidth)continue;
  const peek=!!e.closest('#bottombar')&&(r.left<0||r.right>innerWidth); /* the phone dock scrolls: a clipped button at its edge is the hint to swipe */
  if(peek)continue;
  out.push({id:e.id||e.className,t:(e.innerText||'').replace(/\\s+/g,' ').trim().slice(0,18),x:r.left,y:r.top,w:r.width,h:r.height,
   inside:r.left>=-0.5&&r.top>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5,
   hit:(()=>{const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===e||e.contains(h));})()});}return out;}"""

OPEN = "(()=>%s.filter(i=>{const e=document.getElementById(i);return e&&e.classList.contains('on')}).concat(document.body.classList.contains('railopen')?['rail']:[]))()" % str(SHEETS)

def run(pw, label, w, h, q, big):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=(w < 700))
    pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    url = BASE + ('&' if '?' in BASE else '?') + q
    pg.goto(url, wait_until='load'); pg.wait_for_timeout(2400); settle(pg)
    I = 'window.__ISLAND'

    # ---- the dock: like a Mac dock, everything he needs is there without swiping (iPad) ----
    dock = pg.evaluate("""()=>{const bar=document.getElementById('bottombar');return {sw:bar.scrollWidth,cw:bar.clientWidth,
      items:[...bar.querySelectorAll('button')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,l:r.left,r:r.right,w:r.width,h:r.height}})}}""")
    ids = [i['id'] for i in dock['items']]
    if big:
        ck(label + ' the whole dock fits his screen, no swiping', dock['sw'] <= dock['cw'] + 1, (dock['sw'], dock['cw']))
        ck(label + ' every dock button is fully on screen', all(i['l'] >= -0.5 and i['r'] <= w + 0.5 for i in dock['items']), [(i['id'], round(i['l']), round(i['r'])) for i in dock['items'] if i['l'] < 0 or i['r'] > w])
        ck(label + ' HELP sits right beside DREAM', 'btn-dream' in ids and 'btn-help' in ids and ids.index('btn-help') == ids.index('btn-dream') + 1, ids)
    else:
        ck(label + ' the phone dock still holds PLAY and DREAM', 'btn-play' in ids and 'btn-dream' in ids, ids)
    share = pg.evaluate("(()=>{const e=document.getElementById('btn-share');if(!e)return null;const r=e.getBoundingClientRect();return {w:r.width,h:r.height,in:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}})()")
    if big:
        ck(label + ' SHARE is on screen without swiping', bool(share and share['in'] and share['w'] >= 44), share)

    # ---- every button answers: nothing sits on top of another, every centre reaches its own button ----
    vb = pg.evaluate(VISIBLE_BUTTONS)
    minsz = 60 if big else 44
    small = [(v['id'], round(v['w']), round(v['h'])) for v in vb if (v['w'] < minsz or v['h'] < minsz) and v['id'] != 'pop']
    ck(label + ' every button is big enough for a six year old (%dpx)' % minsz, not small, small)
    popb = [v for v in vb if v['id'] == 'pop']
    ck(label + ' the islander count is big enough to tap', bool(popb) and popb[0]['h'] >= 40, popb)
    blocked = [(v['id'], v['t']) for v in vb if not v['hit']]
    ck(label + ' tapping the middle of every button reaches that button', not blocked, blocked)
    over = []
    for i in range(len(vb)):
        for j in range(i + 1, len(vb)):
            a, c = vb[i], vb[j]
            ix = min(a['x'] + a['w'], c['x'] + c['w']) - max(a['x'], c['x'])
            iy = min(a['y'] + a['h'], c['y'] + c['h']) - max(a['y'], c['y'])
            if ix > 1 and iy > 1:
                over.append((a['id'], c['id']))
    ck(label + ' no button sits on top of another', not over, over)
    mini = pg.evaluate("(()=>{const r=document.getElementById('mini').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()")
    onmap = [v['id'] for v in vb if min(v['x'] + v['w'], mini['x'] + mini['w']) - max(v['x'], mini['x']) > 1 and min(v['y'] + v['h'], mini['y'] + mini['h']) - max(v['y'], mini['y']) > 1]
    ck(label + ' no button sits on the map', not onmap, onmap)
    ck(label + ' every button is inside the screen', all(v['inside'] for v in vb), [v['id'] for v in vb if not v['inside']])
    qs = [v for v in vb if v['t'].startswith('?')]
    ck(label + ' one help button, not two question marks', len(qs) <= 1, [(v['id'], v['t']) for v in qs])

    # ---- words he can read ----
    txt = pg.evaluate("document.body.innerText")
    import re
    ck(label + ' no grown-up CARGO counter', not re.search(r'CARGO \d', txt), re.findall(r'CARGO[^\n]{0,12}', txt)[:2])
    ck(label + ' the block counter says BLOCKS', pg.evaluate("document.getElementById('cargo').textContent").startswith('BLOCKS'), pg.evaluate("document.getElementById('cargo').textContent"))
    labels = pg.evaluate("['btn-story','voybtn','home','btn-board','lookchip'].map(i=>{const e=document.getElementById(i);return [i, e?(e.getAttribute('data-w')||''):null]})")
    ck(label + ' every picture button has a word under it', all(l[1] for l in labels), labels)
    look = pg.evaluate("(()=>{const r=document.getElementById('lookchip').getBoundingClientRect();return {w:r.width,h:r.height}})()")
    ck(label + ' LOOK is a small side button, not a big chip', look['w'] <= (72 if big else 56), look)

    # ---- press feedback: a finger on a button always shows something ----
    pg.evaluate("(()=>{const e=document.getElementById('btn-help');e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));})()")
    ck(label + ' a button squishes the moment his finger lands', pg.evaluate("document.getElementById('btn-help').classList.contains('pressed')"))
    pg.evaluate("(()=>{const e=document.getElementById('btn-help');e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));})()")
    pg.wait_for_timeout(300)
    ck(label + ' and springs back', not pg.evaluate("document.getElementById('btn-help').classList.contains('pressed')"))

    pg.screenshot(path='%s/%s-main.png' % (SHOT, label))

    # ---- one thing open at a time ----
    seq = [('DREAM', I + '.openDream()'), ('GAMES', I + '.openGames()'), ('LOOK', I + '.openLook()'),
           ('BOARD', "document.getElementById('btn-board').click()"), ('VOYAGE', "document.getElementById('voybtn').click()"),
           ('DREAM again', I + '.openDream()')]
    for nm, js in seq:
        pg.evaluate(js); pg.wait_for_timeout(250)
        op = pg.evaluate(OPEN)
        ck(label + ' opening %s leaves only one thing open' % nm, len(op) == 1, op)
    c0 = pg.evaluate(I + '.world.ref.count')
    pg.mouse.click(w * 0.5, h * 0.18); pg.wait_for_timeout(300)
    ck(label + ' tapping the island closes the open sheet', pg.evaluate(OPEN) == [], pg.evaluate(OPEN))
    ck(label + ' and that tap never drops a block', pg.evaluate(I + '.world.ref.count') == c0, (c0, pg.evaluate(I + '.world.ref.count')))

    # ---- DREAM: pictures to pick from, and the soccer pitch he could not find ----
    pg.evaluate(I + '.openDream()'); pg.wait_for_timeout(400)
    picks = pg.evaluate("""[...document.querySelectorAll('#dream-picks .dream-pick')].map(b=>{const c=b.querySelector('canvas');let ink=0;
      if(c){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=16)if(d[i]>0)ink++;}
      return {t:b.innerText.trim(),ink:ink}})""")
    names = [p['t'] for p in picks]
    ck(label + ' SOCCER PITCH is a dream he can pick', any('SOCCER' in t for t in names), names)
    ck(label + ' every dream has a picture, not just a word', len(picks) >= 9 and all(p['ink'] > 40 for p in picks), picks)
    help_txt = pg.evaluate("document.getElementById('dream-help').innerText")
    ck(label + ' the dream sheet speaks in short words', len(help_txt) <= 60, help_txt)
    go = pg.evaluate("(()=>{const e=document.getElementById('dream-close');const r=e.getBoundingClientRect();const p=document.getElementById('dreampanel').getBoundingClientRect();return {b:r.bottom,top:p.top,h:innerHeight,scroll:document.getElementById('dreampanel').scrollHeight>document.getElementById('dreampanel').clientHeight+1}})()")
    ck(label + ' the dream sheet never runs off the screen', go['top'] >= 0 and (go['b'] <= go['h'] or go['scroll']), go)
    pg.screenshot(path='%s/%s-dream.png' % (SHOT, label))
    pg.locator('#dream-picks .dream-pick', has_text='SOCCER').first.tap(); pg.wait_for_timeout(700)
    bp = pg.evaluate(I + '.bp()')
    has = pg.evaluate(I + '.pitch()')
    ck(label + ' tapping SOCCER PITCH lays the pitch plan', (bp and bp.get('id') == 'pitch') or bool(has), (bp, has))
    ck(label + ' and the dream sheet gets out of the way', pg.evaluate(OPEN) == [], pg.evaluate(OPEN))

    # ---- the games sheet is sized for his iPad ----
    pg.evaluate(I + '.openGames()'); pg.wait_for_timeout(400)
    rows = pg.evaluate("[...document.querySelectorAll('#gm-list button.gm')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b.querySelector('span'));return {h:r.height,f:parseFloat(s.fontSize)}})")
    if big:
        ck(label + ' game rows are big enough to tap and read', rows and all(r['h'] >= 64 and r['f'] >= 18 for r in rows), rows)
    pg.screenshot(path='%s/%s-games.png' % (SHOT, label))
    pg.locator('#gm-close').tap(); pg.wait_for_timeout(250)

    ck(label + ' zero console errors', not errs, errs[:3])
    ck(label + ' zero external requests', not ext, ext[:3])
    b.close()

with sync_playwright() as pw:
    only = os.environ.get('F11_ONLY')
    for v in VIEWS:
        if only and only not in v[0]:
            continue
        run(pw, *v)
print('robot-forge11: %d checks, %d failed' % (n, len(fails)))
sys.exit(1 if fails else 0)
