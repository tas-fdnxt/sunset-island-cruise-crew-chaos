import asyncio, sys
from playwright.async_api import async_playwright
CHECKS=[0]; FAILS=[]
def ck(name, ok, got=''):
    CHECKS[0]+=1
    print(('  ok   ' if ok else '  FAIL ')+name+('' if ok else ' :: '+str(got)))
    if not ok: FAILS.append(name)
async def settle(pg):
    for sel in ['#bdclose','#ag-exit','#wclose','#sclose','#bclose','#morncard button','#bp-hands']:
        try:
            el=await pg.query_selector(sel)
            if el and await el.is_visible(): await el.click(); await pg.wait_for_timeout(280)
        except Exception: pass
async def run():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        for label,url in [('ollie','island.html?crew=OLLIE'),('pip','island.html?crew=PIP')]:
            errs=[]; ext=[]
            # SENDER builds and shares
            s=await b.new_page(viewport={'width':390,'height':844})
            await s.goto('http://127.0.0.1:8240/'+url); await s.wait_for_timeout(1500); await settle(s)
            await s.evaluate("""(()=>{const I=window.__ISLAND;
              for(let x=40;x<=42;x++)for(let y=40;y<=42;y++)
                if(x===40||x===42||y===40||y===42){I.place(x,y,3);I.place(x,y,3);}
              I.place(41,40,6); I.place(50,50,9); I.popCheck&&I.popCheck();})()""")
            await s.wait_for_timeout(600)
            link = await s.evaluate("__ISLAND.shareUrl()")
            v = await s.evaluate("__ISLAND.voyage()")
            ck(label+': share link carries the result', '&v=' in link, link[-40:])
            ck(label+': the field matches today', ('&v='+str(v['no'])+'.'+str(v['done'])+'.'+str(v['all'])) in link, link[-30:])
            ck(label+': link under the 1700 gate', len(link.split('#')[1])<1700, len(link.split('#')[1]))
            await s.close()
            # RECEIVER opens it cold
            r=await b.new_page(viewport={'width':390,'height':844})
            r.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            r.on('request', lambda q: ext.append(q.url) if '127.0.0.1' not in q.url else None)
            path='http://127.0.0.1:8240/'+url.split('?')[0]+link[link.index('?') if '?' in link else len(link):] if False else None
            frag = link[link.index('#'):]
            await r.goto('http://127.0.0.1:8240/'+url+frag); await r.wait_for_timeout(1600); await settle(r)
            lv = await r.evaluate("__ISLAND.linkVoy()")
            ck(label+': receiver reads the challenge', bool(lv) and lv['all']==3, lv)
            line = await r.evaluate("__ISLAND.challengeLine('OLLIE', __ISLAND.linkVoy(), 74100)")
            ck(label+': line names the sender', 'OLLIE' in line, line)
            ck(label+': line invites, never shames', not any(w in line.lower() for w in ['fail','lost','beat you','loser','only']), line)
            ck(label+': receiver still sees the island', await r.evaluate("__ISLAND.worldRef?__ISLAND.worldRef().count>0:true"))
            same = await r.evaluate("__ISLAND.voyage()")
            ck(label+': receiver gets the same voyage today', same['no']==v['no'], [same['no'],v['no']])
            await r.wait_for_timeout(1200)
            pill=await r.evaluate("(()=>{const e=document.getElementById('chalbar');return {on:e.classList.contains('on'),txt:e.textContent};})()")
            ck(label+': the challenge is on screen', pill['on'] and 'sailed' in pill['txt'], pill)
            await r.wait_for_timeout(6000)
            still=await r.evaluate("(()=>{const e=document.getElementById('chalbar');return {on:e.classList.contains('on'),txt:e.textContent};})()")
            ck(label+': it survives the morning toasts', still['on'] and 'sailed' in still['txt'], still)
            box=await r.eval_on_selector('#chalbar','e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height,r:b.right};}')
            ck(label+': it fits the phone', box['w']<=390 and box['r']<=390, box)
            await r.eval_on_selector('#chalbar','e=>e.click()'); await r.wait_for_timeout(300)
            ck(label+': a tap puts it away', not await r.eval_on_selector('#chalbar','e=>e.classList.contains("on")'))
            await r.screenshot(path='/home/claude/ship/cshots/challenge-'+label+'.png')
            ck(label+': zero console errors', len(errs)==0, errs[:2])
            ck(label+': zero external requests', len(ext)==0, ext[:2])
            await r.close()
        # an old link with no result must still open clean
        o=await b.new_page(viewport={'width':390,'height':844})
        await o.goto('http://127.0.0.1:8240/island.html?crew=PIP#i=AAAA'); await o.wait_for_timeout(1400)
        ck('an old link without a result still opens', await o.evaluate("__ISLAND.linkVoy()===null"))
        await o.close()
        await b.close()
asyncio.run(run())
print('='*34); print('CHECKS '+str(CHECKS[0])+'   FAILED '+str(len(FAILS)))
for x in FAILS: print('  FAILED: '+x)
sys.exit(1 if FAILS else 0)
