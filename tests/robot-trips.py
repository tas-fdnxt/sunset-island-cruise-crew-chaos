import asyncio, sys
from playwright.async_api import async_playwright
CHECKS=[0]; FAILS=[]
def ck(name, ok, got=''):
    CHECKS[0]+=1
    print(('  ok   ' if ok else '  FAIL ')+name+('' if ok else ' :: '+str(got)))
    if not ok: FAILS.append(name)
async def settle(pg):
    for sel in ['#bdclose','#ag-exit','#wclose','#sclose','#bclose','#morncard button','#voyage-done']:
        try:
            el = await pg.query_selector(sel)
            if el and await el.is_visible(): await el.click(); await pg.wait_for_timeout(350)
        except Exception: pass
async def poll(pg, js, want, tries=50, gap=200):
    for _ in range(tries):
        v = await pg.evaluate(js)
        if v == want or (want is True and v): return v
        await pg.wait_for_timeout(gap)
    return await pg.evaluate(js)
async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for label, url in [('ollie','island.html?crew=OLLIE'),('pip','island.html?crew=PIP')]:
            errs=[]; ext=[]
            pg = await b.new_page(viewport={'width':1180,'height':820})
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('request', lambda r: ext.append(r.url) if '127.0.0.1' not in r.url and 'localhost' not in r.url else None)
            await pg.goto('http://127.0.0.1:8233/'+url); await pg.wait_for_timeout(1400); await settle(pg)
            # a flag, two houses, people
            await pg.evaluate("""(()=>{const I=window.__ISLAND;I.place(50,50,9);
              const hs=[[40,40],[60,60]];
              for(const[ox,oy]of hs){for(let x=ox;x<=ox+2;x++)for(let y=oy;y<=oy+2;y++)
                if(x===ox||x===ox+2||y===oy||y===oy+2){I.place(x,y,3);I.place(x,y,3);}
                I.place(ox+1,oy,6);}
              I.popCheck&&I.popCheck();})()""")
            folk = await poll(pg, "window.__ISLAND.islandersRef().length>=2", True)
            ck(label+': two islanders live', folk is True or folk>=2, folk)
            ck(label+': trip debug exposed', await pg.evaluate("typeof __ISLAND.trip==='function'&&typeof __ISLAND.warpCar==='function'"))
            await pg.evaluate("__ISLAND.setDrive(true)")
            p0 = await pg.evaluate("(()=>{const p=__ISLAND.islandersRef()[0];return {x:p.x,y:p.y,name:p.name};})()")
            await pg.evaluate("__ISLAND.warpCar(%f,%f)" % (p0['x']+0.6, p0['y']+0.6))
            boarded = await poll(pg, "!!__ISLAND.trip()", True)
            ck(label+': islander boards the stopped car', boarded is True, boarded)
            trip = await pg.evaluate("__ISLAND.trip()")
            ck(label+': trip has a real destination', bool(trip and trip.get('label')), trip)
            hud = await pg.evaluate("(document.getElementById('tripbar')||{}).textContent||''")
            ck(label+': HUD names the place', bool(trip) and trip['label'].split("'")[0][:6] in hud, hud)
            ck(label+': HUD gives a direction or says here', any(w in hud.lower() for w in ['north','south','east','west','here']), hud)
            coins0 = await pg.evaluate("__ISLAND.purse.coins")
            await pg.evaluate("__ISLAND.warpCar(__ISLAND.trip().x+0.5, __ISLAND.trip().y+0.5)")
            done = await poll(pg, "__ISLAND.trip()===null", True)
            ck(label+': passenger delivered', done is True, done)
            ck(label+': fare paid one coin', await pg.evaluate("__ISLAND.purse.coins") == coins0+1, coins0)
            j = await pg.evaluate("__ISLAND.journal()")
            ck(label+': journal counts the trip', j.get('tripsToday',0)>=1 and j.get('trips',0)>=1, j.get('tripsToday'))
            await pg.screenshot(path='/home/claude/ship/cshots/trip-'+label+'.png')
            ck(label+': zero console errors', len(errs)==0, errs[:2])
            ck(label+': zero external requests', len(ext)==0, ext[:2])
            await pg.close()
        await b.close()
asyncio.run(run())
print('='*34); print('CHECKS '+str(CHECKS[0])+'   FAILED '+str(len(FAILS)))
for x in FAILS: print('  FAILED: '+x)
sys.exit(1 if FAILS else 0)
