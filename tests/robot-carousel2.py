# Ollie's second carousel. Every card must render, the arrows must work,
# the links must go somewhere real, and nothing may claim Ollie said something he did not.
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8099'
URL = BASE + '/ollie-update-2.html'
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
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'data:', 'blob:')) else None)
    pg.goto(URL, wait_until='load'); pg.wait_for_timeout(900)
    cards = pg.locator('section.card').count()
    ck(label + ' eleven cards', cards == 11, cards)
    ck(label + ' a dot for every card', pg.locator('#dots i').count() == cards, pg.locator('#dots i').count())
    ck(label + ' every card has words', pg.evaluate(
        "Array.from(document.querySelectorAll('section.card')).every(c=>c.innerText.trim().length>20)"))
    # the arrows must actually move it
    pg.locator('#next').click(); pg.wait_for_timeout(600)
    ck(label + ' the next arrow moves it', pg.evaluate("document.getElementById('rail').scrollLeft") > 0)
    for _ in range(14):
        if pg.locator('#next').is_disabled(): break
        pg.locator('#next').click(); pg.wait_for_timeout(220)
    pg.wait_for_timeout(500)
    end = pg.evaluate("(()=>{const r=document.getElementById('rail');return r.scrollLeft>=r.scrollWidth-r.clientWidth-4})()")
    ck(label + ' it reaches the last card', end)
    ck(label + ' the play link is there and relative', pg.evaluate(
        "(()=>{const a=document.querySelector('a.go');return !!a&&a.getAttribute('href')==='island.html?crew=OLLIE'})()"))
    # every screenshot tile is inside the sheet
    ck(label + ' every photo tile exists', pg.evaluate(
        "Array.from(document.querySelectorAll('.shot i')).every(i=>{const t=+getComputedStyle(i).getPropertyValue('--t');return t>=0&&t<=4})"))
    ck(label + ' the sky is drawn', pg.locator('#sky').is_visible())
    ck(label + ' zero console errors', len(errs) == 0, errs[:3])
    ck(label + ' zero external requests', len(ext) == 0, ext[:3])
    pg.screenshot(path='/tmp/car2-%s.png' % label.replace(' ', '-'))
    b.close()

with sync_playwright() as pw:
    for w, hgt, lab in [(390, 844, 'iphone'), (820, 1180, 'ipad'), (1180, 820, 'ipad wide')]:
        run(pw, w, hgt, lab)

txt = open('ollie-update-2.html', encoding='utf-8').read()
ck('no em dashes', '\u2014' not in txt)
ck('no surname anywhere', 'Diaz' not in txt and 'DIAZ' not in txt.upper())
# honesty: the soccer card must not put words in Ollie's mouth
import re
bubs = re.findall(r'<div class="bub">(.*?)</div>', txt, re.S)
said = re.findall(r'<div class="who">(.*?)</div>', txt, re.S)
ck('no quote is credited to Ollie saying it', len(said) == 0, said)
ck('the soccer card says where it came from', 'Uncle Tabs heard' in txt)
# nothing may be sold, and nothing may be promised that is not already built
U = txt.upper()
ck('nothing is for sale', not re.search(r'(PURCHASE|BUY NOW|BUY IT|IN-APP|\\$[0-9])', U), 0)
ck('nothing is promised that is not built', 'COMING SOON' not in U and 'NEXT UPDATE' not in U)
ck('it says plainly that nothing is locked', 'NOTHING IS LOCKED' in U)
print('\nCHECKS %d   FAILED %d' % (n, len(fails)))
for f in fails: print('  FAILED: ' + f)
sys.exit(1 if fails else 0)
