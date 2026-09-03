import asyncio, os, sys, json
from playwright.async_api import async_playwright

ROOT = "/home/claude/ship/serve"
PORT = 8231
FAILS = []
CHECKS = [0]

def ck(name, cond, extra=""):
    CHECKS[0] += 1
    if cond:
        print("  ok   " + name)
    else:
        print("  FAIL " + name + " " + str(extra))
        FAILS.append(name)

VIEWPORTS = [
    ("ipad-land", 1024, 768),
    ("ipad-port", 768, 1024),
    ("ipadair-land", 1180, 820),
    ("ipadair-port", 820, 1180),
    ("ipadpro-land", 1366, 1024),
    ("iphone", 390, 844),
    ("iphone-se", 375, 667),
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        for label, w, h in VIEWPORTS:
            print("\n=== " + label + " " + str(w) + "x" + str(h) + " ===")
            ctx = await browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=2,
                has_touch=True,
                is_mobile=(label == "iphone"),
            )
            page = await ctx.new_page()
            errors = []
            external = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))

            def on_req(r):
                u = r.url
                if not u.startswith("http://127.0.0.1:" + str(PORT)) and not u.startswith("data:"):
                    external.append(u)

            page.on("request", on_req)

            await page.goto("http://127.0.0.1:" + str(PORT) + "/ollie-update.html")
            await page.wait_for_timeout(900)

            n = await page.evaluate("document.querySelectorAll('.card').length")
            ck("seventeen cards", n == 17, n)

            # the sprite is a CSS background on .shot, not an <img>.
            # prove the data URI genuinely decodes, and the panels have real size.
            sprite = await page.evaluate(
                """(async()=>{
                  const el=document.querySelector('.shot i');
                  if(!el) return {ok:false,why:'no .shot i'};
                  const bg=getComputedStyle(el).backgroundImage;
                  const m=bg.match(/url\\("?(data:image\\/webp;base64,[^")]+)"?\\)/);
                  if(!m) return {ok:false,why:'no webp background'};
                  const dims=await new Promise(res=>{
                    const i=new Image();
                    i.onload=()=>res({w:i.naturalWidth,h:i.naturalHeight});
                    i.onerror=()=>res({w:0,h:0});
                    i.src=m[1];
                  });
                  const shots=[...document.querySelectorAll('.shot')].map(s=>{
                    const r=s.getBoundingClientRect();
                    return Math.round(r.width)+'x'+Math.round(r.height);
                  });
                  return {ok:dims.w>0&&dims.h>0,dims:dims,count:shots.length,shots:shots};
                })()"""
            )
            ck("sprite webp decodes", sprite.get("ok"), sprite)
            ck("six screenshot panels", sprite.get("count") == 6, sprite.get("shots"))
            ck(
                "every panel has real size",
                len(sprite.get("shots", [])) == 6
                and all(
                    int(s.split("x")[0]) > 0 and int(s.split("x")[1]) > 0
                    for s in sprite.get("shots", [])
                ),
                sprite.get("shots"),
            )

            # THE SLICE INVARIANT.
            # Each panel must show the same fraction of the sprite on every
            # screen size. If the sprite is scaled but the offsets are not,
            # a panel shows a neighbour's photo. That shipped once. Never again.
            slices = await page.evaluate(
                """(()=>[...document.querySelectorAll('.shot')].map(s=>{
                  const i=s.querySelector('i');
                  const cs=getComputedStyle(i);
                  const spriteH=parseFloat(cs.height);
                  const spriteW=parseFloat(cs.width);
                  const top=Math.abs(parseFloat(cs.top));
                  const winH=s.getBoundingClientRect().height;
                  return {
                    from:+(top/spriteH).toFixed(3),
                    to:+((top+winH)/spriteH).toFixed(3),
                    covered:+(winH/spriteH).toFixed(3),
                    fits: spriteH>=top+winH-1,
                    wideEnough: spriteW>=s.getBoundingClientRect().width-1
                  };})
                )()"""
            )
            EXPECT = [
                {"from": 0.0, "to": 0.402},
                {"from": 0.402, "to": 0.574},
                {"from": 0.574, "to": 1.0},
                {"from": 0.0, "to": 0.238},
                {"from": 0.238, "to": 0.664},
                {"from": 0.664, "to": 1.0},
            ]
            for n, (got, want) in enumerate(zip(slices, EXPECT), 1):
                ck(
                    "panel " + str(n) + " shows its own slice",
                    abs(got["from"] - want["from"]) < 0.01
                    and abs(got["to"] - want["to"]) < 0.01,
                    got,
                )
                ck("panel " + str(n) + " slice inside sprite", got["fits"], got)
                ck("panel " + str(n) + " sprite covers the frame", got["wideEnough"], got)

            # no horizontal overflow inside a card
            overflow = await page.evaluate(
                "(()=>{let bad=0;document.querySelectorAll('.card').forEach(c=>{"
                "if(c.scrollWidth>c.clientWidth+2)bad++;});return bad;})()"
            )
            ck("no card overflows sideways", overflow == 0, overflow)

            # a squashed photo crops itself silently. a clipped card hides text.
            voverflow = await page.evaluate(
                "(()=>{let bad=[];document.querySelectorAll('.card').forEach((c,i)=>{"
                "if(c.scrollHeight>c.clientHeight+2)bad.push(i+':'+c.scrollHeight+'>'+c.clientHeight);"
                "});return bad;})()"
            )
            ck("no card overflows downward", len(voverflow) == 0, voverflow)

            squashed = await page.evaluate(
                "(()=>{let bad=[];document.querySelectorAll('.shot').forEach(s=>{"
                "const want=parseFloat(getComputedStyle(s).height);"
                "const got=s.getBoundingClientRect().height;"
                "if(Math.abs(want-got)>1)bad.push(Math.round(want)+' vs '+Math.round(got));"
                "});return bad;})()"
            )
            ck("no photo squashed by flex", len(squashed) == 0, squashed)

            # swipe through every card by scrolling the rail
            reached = []
            for i in range(17):
                await page.evaluate(
                    "i=>{const r=document.getElementById('rail');"
                    "r.scrollTo({left:i*r.clientWidth,behavior:'auto'});}", i
                )
                await page.wait_for_timeout(220)
                idx = await page.evaluate(
                    "(()=>{const r=document.getElementById('rail');"
                    "return Math.round(r.scrollLeft/r.clientWidth);})()"
                )
                reached.append(idx)
            ck("scrolled to all seventeen cards", reached == list(range(17)), reached)

            # buttons
            hrefs = await page.evaluate(
                "[...document.querySelectorAll('a')].map(a=>a.getAttribute('href'))"
            )
            ck("continue button to Ollie's island", "island.html?crew=OLLIE" in hrefs, hrefs)
            ck("rescue button present", "rescue.html" in hrefs, hrefs)

            # tappable size of the two real buttons
            small = await page.evaluate(
                "(()=>{let bad=[];[...document.querySelectorAll('a')].forEach(a=>{"
                "const r=a.getBoundingClientRect();"
                "if(r.width>0&&(r.height<44||r.width<44))bad.push(a.getAttribute('href')+' '"
                "+Math.round(r.width)+'x'+Math.round(r.height));});return bad;})()"
            )
            ck("buttons at least 44pt", len(small) == 0, small)

            # dots track the card
            await page.evaluate(
                "()=>{const r=document.getElementById('rail');"
                "r.scrollTo({left:5*r.clientWidth,behavior:'auto'});}"
            )
            await page.wait_for_timeout(400)
            dot = await page.evaluate(
                "(()=>{const d=document.querySelectorAll('#dots i');"
                "let a=-1;d.forEach((x,i)=>{if(x.classList.contains('on'))a=i;});return a;})()"
            )
            ck("dot follows to card 6", dot == 5, dot)

            ck("zero console errors", len(errors) == 0, errors[:3])
            ck("zero external requests", len(external) == 0, external[:3])

            for shot, card in (("first", 0), ("rescue", 9), ("last", 10)):
                await page.evaluate(
                    "i=>{const r=document.getElementById('rail');"
                    "r.scrollTo({left:i*r.clientWidth,behavior:'auto'});}", card
                )
                await page.wait_for_timeout(350)
                await page.screenshot(
                    path="/home/claude/ship/cshots/" + label + "-" + shot + ".png"
                )
            await ctx.close()
        await browser.close()

    print("\n==================================")
    print("CHECKS " + str(CHECKS[0]) + "   FAILED " + str(len(FAILS)))
    if FAILS:
        for f in FAILS:
            print("  FAILED: " + f)
        sys.exit(1)
    print("ALL PASS")

asyncio.run(run())
