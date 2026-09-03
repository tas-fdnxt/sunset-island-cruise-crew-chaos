import asyncio, sys
from playwright.async_api import async_playwright
CHECKS=[0]; FAILS=[]
def ck(name, ok, got=''):
    CHECKS[0]+=1
    print(('  ok   ' if ok else '  FAIL ')+name+('' if ok else ' :: '+str(got)))
    if not ok: FAILS.append(name)
async def settle(pg):
    for sel in ['#bdclose','#ag-exit','#wclose','#sclose','#bclose','#morncard button','#voyage-done','#bp-hands']:
        try:
            el = await pg.query_selector(sel)
            if el and await el.is_visible(): await el.click(); await pg.wait_for_timeout(300)
        except Exception: pass
async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        seen = {}
        for label, url in [('ollie','island.html?crew=OLLIE'),('pip','island.html?crew=PIP')]:
            errs=[]; ext=[]
            pg = await b.new_page(viewport={'width':390,'height':844})
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('request', lambda r: ext.append(r.url) if '127.0.0.1' not in r.url else None)
            await pg.goto('http://127.0.0.1:8234/'+url); await pg.wait_for_timeout(1500); await settle(pg)
            btn = await pg.query_selector('#voybtn')
            ck(label+': voyage button is on screen', btn is not None and await btn.is_visible())
            box = await btn.bounding_box()
            ck(label+': button is thumb sized', box['width']>=44 and box['height']>=44, box)
            await btn.click(); await pg.wait_for_timeout(500)
            ck(label+': card opens', await pg.eval_on_selector('#voymenu','e=>e.classList.contains("on")'))
            rows = await pg.eval_on_selector_all('.voyrow','rs=>rs.map(r=>r.textContent.trim())')
            ck(label+': three jobs listed', len(rows)==3, rows)
            ck(label+': jobs are worded for a child', all(len(r)>12 for r in rows), rows)
            title = await pg.eval_on_selector('#voyno','e=>e.textContent')
            ck(label+': card names the voyage number', 'VOYAGE' in title and 'OF 3' in title, title)
            foot = await pg.eval_on_selector('#voyfoot','e=>e.textContent')
            ck(label+': promises nothing is lost', 'never lost' in foot.lower(), foot)
            v = await pg.evaluate("__ISLAND.voyage()")
            seen[label]=v
            ck(label+': glyph card is spoiler free', len(v['glyphs'])>=3 and all(g['tell'][:10].lower() not in v['glyphs'].lower() for g in v['goals']), v['glyphs'])
            ck(label+': nothing reads like a deadline', not any(w in (g['tell'] or '').lower() for g in v['goals'] for w in ['fail','late','miss','must','expire']), [g['tell'] for g in v['goals']])
            await pg.eval_on_selector('#voy-close','e=>e.click()'); await pg.wait_for_timeout(300)
            ck(label+': card closes', not await pg.eval_on_selector('#voymenu','e=>e.classList.contains("on")'))
            await pg.screenshot(path='/home/claude/ship/cshots/voyage-'+label+'.png')
            ck(label+': zero console errors', len(errs)==0, errs[:2])
            ck(label+': zero external requests', len(ext)==0, ext[:2])
            await pg.close()
        ck('both editions get the same voyage today', seen['ollie']['no']==seen['pip']['no'] and [g['need'] for g in seen['ollie']['goals']]==[g['need'] for g in seen['pip']['goals']], [seen['ollie']['no'],seen['pip']['no']])
        await b.close()
asyncio.run(run())
print('='*34); print('CHECKS '+str(CHECKS[0])+'   FAILED '+str(len(FAILS)))
for x in FAILS: print('  FAILED: '+x)
sys.exit(1 if FAILS else 0)
