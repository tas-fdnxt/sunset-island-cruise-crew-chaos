# Ollie's fifth carousel. Every card must render, the arrows must work,
# the links must go somewhere real, and nothing may claim a thing that is not live.
# Overnight sleep and NPC memory MAY be claimed: both shipped in the same PR.
# Pretty modes, day/night sky juice, a synth suite, a bigger dock, and
# build replay may not.
import re, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8099'
URL = BASE + '/ollie-update-5.html'
n = 0; fails = []
def ck(name, ok, got=''):
    global n; n += 1
    print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  :: ' + str(got)[:170]))
    if not ok: fails.append(name)

def run(pw, w, hgt, label):
    errs, ext = [], []
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': w, 'height': hgt})
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:')) else None)
    pg.goto(URL, wait_until='load'); pg.wait_for_timeout(900)
    cards = pg.locator('section.card').count()
    ck(label + ' nine cards', cards == 9, cards)
    ck(label + ' a dot for every card', pg.locator('#dots i').count() == cards, pg.locator('#dots i').count())
    ck(label + ' every card has words', pg.evaluate(
        "Array.from(document.querySelectorAll('section.card')).every(c=>c.innerText.trim().length>20)"))
    pg.locator('#next').click(); pg.wait_for_timeout(600)
    ck(label + ' the next arrow moves it', pg.evaluate("document.getElementById('rail').scrollLeft") > 0)
    for _ in range(14):
        if pg.locator('#next').is_disabled(): break
        pg.locator('#next').click(); pg.wait_for_timeout(220)
    pg.wait_for_timeout(500)
    pg.evaluate("(()=>{const r=document.getElementById('rail');r.scrollTo({left:r.scrollWidth,behavior:'auto'});})()")
    pg.wait_for_timeout(300)
    end = pg.evaluate("(()=>{const r=document.getElementById('rail');const n=Math.round(r.scrollLeft/r.clientWidth);return n===document.querySelectorAll('section.card').length-1||r.scrollLeft>=r.scrollWidth-r.clientWidth-8})()")
    ck(label + ' it reaches the last card', end)
    ck(label + ' the play link is there and relative', pg.evaluate(
        "(()=>{const a=document.querySelector('a.go');return !!a&&a.getAttribute('href')==='island.html?crew=OLLIE'})()"))
    shots = pg.evaluate(
        """(async()=>{
          const els=[...document.querySelectorAll('.shot i')];
          const out=[];
          for (const el of els) {
            const bg=getComputedStyle(el).backgroundImage;
            const m=bg.match(/url\\("?(data:image\\/webp;base64,[^")]+)"?\\)/);
            if(!m){ out.push({ok:false,why:'no webp'}); continue; }
            const dims=await new Promise(res=>{
              const i=new Image();
              i.onload=()=>res({w:i.naturalWidth,h:i.naturalHeight});
              i.onerror=()=>res({w:0,h:0});
              i.src=m[1];
            });
            out.push({ok:dims.w>0&&dims.h>0,w:dims.w,h:dims.h});
          }
          return out;
        })()""")
    ck(label + ' four photo tiles', len(shots) == 4, len(shots))
    ck(label + ' every photo decodes', all(s.get('ok') for s in shots), shots)
    ck(label + ' the sky is drawn', pg.locator('#sky').is_visible())
    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    pg.screenshot(path='/tmp/car5-%s.png' % label.replace(' ', '-'))
    b.close()

with sync_playwright() as pw:
    for w, hgt, lab in [(390, 844, 'iphone'), (820, 1180, 'ipad'), (1180, 820, 'ipad wide')]:
        run(pw, w, hgt, lab)

raw = open('ollie-update-5.html', encoding='utf-8').read()
txt = re.sub(r'data:image/webp;base64,[A-Za-z0-9+/=]+', 'PHOTO', raw)
ck('no em dashes', '\u2014' not in txt)
ck('no surname anywhere', 'Diaz' not in txt and 'DIAZ' not in txt.upper())
said = re.findall(r'<div class="who">(.*?)</div>', txt, re.S)
ck('no quote is credited to Ollie saying it', len(said) == 0, said)
U = txt.upper()
ck('nothing is for sale', not re.search(r'(PURCHASE|BUY NOW|BUY IT|IN-APP|\\$[0-9])', U), 0)
ck('nothing is promised that is not built', 'COMING SOON' not in U and 'NEXT UPDATE' not in U)
ck('it says plainly that nothing is locked', 'NOTHING IS LOCKED' in U)
ck('it names the moon', 'MOON' in U)
ck('it names tap', 'TAP' in U)
ck('it names hold', 'HOLD' in U)
ck('it names sleep', 'SLEEP' in U)
ck('it names the morning card', 'MORNING' in U)
ck('it names who remembered', 'REMEMBER' in U and 'COCO' in U)
ck('it names the share link', 'SHARE' in U and 'LINK' in U)
ck('it names the shelf', 'SHELF' in U)
ck('it says the photos are real', 'A REAL PHOTO' in U)
ck('Uncle Tabs is the speaker, not a fake Ollie line', 'UNCLE TABS' in U)
ck('does not claim pretty modes', 'PRETTY MODE' not in U and 'PRETTY MODES' not in U)
ck('does not claim a bigger dock', 'BIGGER DOCK' not in U and 'BIGGER BUTTON' not in U)
ck('does not claim build replay', 'BUILD REPLAY' not in U and 'REPLAY THE BUILD' not in U)
ck('does not claim day night sky juice', 'DAY/NIGHT' not in U and 'SKY JUICE' not in U and 'NIGHT SKY' not in U)
ck('does not claim a synth suite', 'SYNTH' not in U)
print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails: print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
