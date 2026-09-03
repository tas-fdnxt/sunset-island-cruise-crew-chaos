import asyncio, sys, base64, io
from playwright.async_api import async_playwright
from PIL import Image
CHECKS=[0]; FAILS=[]
def ck(name, ok, got=''):
    CHECKS[0]+=1
    print(('  ok   ' if ok else '  FAIL ')+name+('' if ok else ' :: '+str(got)))
    if not ok: FAILS.append(name)
async def settle(pg):
    for sel in ['#bdclose','#ag-exit','#wclose','#sclose','#bclose','#morncard button','#bp-hands']:
        try:
            el=await pg.query_selector(sel)
            if el and await el.is_visible(): await el.click(); await pg.wait_for_timeout(300)
        except Exception: pass
async def run():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        for label,url in [('ollie','island.html?crew=OLLIE'),('pip','island.html?crew=PIP')]:
            errs=[]; ext=[]; shared={}
            pg=await b.new_page(viewport={'width':390,'height':844})
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('request', lambda r: ext.append(r.url) if '127.0.0.1' not in r.url and not r.url.startswith('data:') and not r.url.startswith('blob:') else None)
            await pg.goto('http://127.0.0.1:8235/'+url); await pg.wait_for_timeout(1500); await settle(pg)
            await pg.evaluate("""navigator.share = async (d)=>{window.__shared=d;};
                                 navigator.canShare = ()=>false;""")
            await pg.eval_on_selector('#voybtn','e=>e.click()'); await pg.wait_for_timeout(400)
            pb = await pg.query_selector('#voy-poster')
            ck(label+': poster button in the voyage card', pb is not None and await pb.is_visible())
            box = await pb.bounding_box()
            ck(label+': poster button is thumb sized', box['height']>=44, box)
            await pb.click(); await pg.wait_for_timeout(900)
            ck(label+': poster opens', await pg.eval_on_selector('#posterwrap','e=>e.classList.contains("on")'))
            src = await pg.eval_on_selector('#posterimg','e=>e.src')
            ck(label+': poster is a real png', src.startswith('data:image/png;base64,'), src[:30])
            im = Image.open(io.BytesIO(base64.b64decode(src.split(',')[1]))).convert('RGB')
            ck(label+': poster is portrait 800x1000', im.size==(800,1000), im.size)
            px=im.load(); w,hh=im.size
            cols=set(px[x,y] for x in range(0,w,17) for y in range(0,hh,17))
            ck(label+': poster is not blank', len(cols)>40, len(cols))
            gold=sum(1 for x in range(0,w,7) for y in range(0,hh,7) if px[x,y][0]>210 and 150<px[x,y][1]<225 and px[x,y][2]<130)
            ck(label+': the island frame and gold are there', gold>120, gold)
            top=set(px[x,y] for x in range(0,w,17) for y in range(0,120,9))
            bot=set(px[x,y] for x in range(0,w,17) for y in range(hh-120,hh,9))
            ck(label+': sunset runs top to bottom', len(top)>3 and len(bot)>3, (len(top),len(bot)))
            card = await pg.evaluate("__ISLAND.posterCard()")
            ck(label+': card carries a link', 'island.html' in card, card[:60])
            ck(label+': card names the voyage', 'Voyage' in card, card[:60])
            v = await pg.evaluate("__ISLAND.voyage()")
            ck(label+': card never leaks the jobs', all(g['tell'].lower() not in card.lower() for g in v['goals']), card)
            ck(label+': card holds no surname or handle', ('DIAZ' not in card.upper()) and ('@' not in card), card)
            ck(label+': card is short enough to paste', len(card)<=280, len(card))
            await pg.eval_on_selector('#poster-share','e=>e.click()'); await pg.wait_for_timeout(600)
            sh = await pg.evaluate("window.__shared||null")
            ck(label+': share sheet gets the card', bool(sh) and 'island.html' in (sh.get('text') or ''), sh)
            await pg.eval_on_selector('#poster-close','e=>e.click()'); await pg.wait_for_timeout(300)
            ck(label+': poster closes', not await pg.eval_on_selector('#posterwrap','e=>e.classList.contains("on")'))
            await pg.screenshot(path='/home/claude/ship/cshots/poster-'+label+'.png')
            open('/home/claude/ship/cshots/poster-art-'+label+'.png','wb').write(base64.b64decode(src.split(',')[1]))
            ck(label+': zero console errors', len(errs)==0, errs[:2])
            ck(label+': zero external requests', len(ext)==0, ext[:2])
            await pg.close()
        await b.close()
asyncio.run(run())
print('='*34); print('CHECKS '+str(CHECKS[0])+'   FAILED '+str(len(FAILS)))
for x in FAILS: print('  FAILED: '+x)
sys.exit(1 if FAILS else 0)
