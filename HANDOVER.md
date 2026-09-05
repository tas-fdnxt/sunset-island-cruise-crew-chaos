# SUNSET ISLAND: HANDOVER TO THE TERMINAL

Written 5 September 2026. This file is the checkpoint. The repo is the only thing that
survives a sandbox, so this lives here, not in a chat.

Read `sunset-island-doctrine.md` first if it is attached to the session. When the Doctrine and
this file disagree, the Doctrine wins and this file gets corrected.

---

## 1. WHAT IS LIVE RIGHT NOW

Repo: `tas-fdnxt/sunset-island-cruise-crew-chaos`, public, GitHub Pages from `main` at `/`.
Base: `https://tas-fdnxt.github.io/sunset-island-cruise-crew-chaos`

Verify every session with a cache-buster. These are the true shas as at this handover:

| File | sha256 (first 8) | What it is |
|---|---|---|
| `island.html` | `e2b32d55` | The island. All the work happens here. |
| `arcade.html` | `bc0420d9` | OLLIE'S. Do not edit without Fabian asking. |
| `storybook.html` | `bef56030` | OLLIE'S. Do not edit without Fabian asking. |
| `ollie-update.html` | `a646da7a` | Carousel one, 17 cards. Shipped. |
| `ollie-update-2.html` | `304535ad` | Carousel two, 11 cards. Shipped. |
| `ollie-update-3.html` | live | Carousel three, Dream button. Shipped. |
| `ollie-update-4.html` | live | Carousel four, walk soccer + PLAY. Shipped. |

```bash
B=https://tas-fdnxt.github.io/sunset-island-cruise-crew-chaos
for f in island.html arcade.html storybook.html ollie-update.html ollie-update-2.html; do
  printf "%-22s " "$f"; curl -s "$B/$f?v=$RANDOM" | sha256sum | cut -c1-8
done
```

Two editions, one engine, switched by `OWNER`:
- Ollie and Sibella: `arcade.html`, `?crew=OLLIE` or `?crew=SIBELLA`. Coco keeps the book. Family lines.
- Everyone: `captain.html`, any `?p=` profile. Cleo the Yorkshire Terrier show dog. No family lines.

---

## 2. FIRST FIVE COMMANDS OF ANY SESSION

```bash
git clone https://github.com/tas-fdnxt/sunset-island-cruise-crew-chaos.git && cd sunset-island-cruise-crew-chaos
node tests/extract-core.js                        # pulls the pure module out of island.html
for f in tests/test-*.js; do node $f >/dev/null 2>&1 || echo "RED $f"; done   # must print nothing
python3 -m playwright install chromium --only-shell
(python3 -m http.server 8099 &) ; sleep 2 ; python3 tests/robot-soccer.py http://localhost:8099/island.html
```

---

## 3. THE TEST LADDER (LAW)

Nothing ships that has not been through all six rungs, in order:

1. `node --check` on both script blocks of `island.html`
2. All 25 headless suites green
3. Robots in real Chromium driving the actual UI, on BOTH editions
4. Screenshots taken and actually looked at
5. Hygiene: zero console errors, zero external requests
6. Live curl sha match after deploy, plus proof Ollie's files are unchanged

**Current state: 25 suites, 937 checks, all green.**

| Suite | Checks | Suite | Checks |
|---|---|---|---|
| test-voyage | 140 | test-garden | 45 |
| test-trips | 91 | test-coins | 43 |
| test-hands | 72 | test-ladders | 39 |
| test-blueprints | 55 | test-profile | 39 |
| test-walk | 46 | test-shop | 35 |
| test-book | 31 | test-cleo | 28 |
| test-shore | 28 | test-soccer | 28 |
| test-arcade | 24 | test-island-core | 24 |
| test-living | 24 | test-remix | 24 |
| test-challenge | 23 | test-story | 22 |
| test-compass | 20 | test-poster | 18 |
| test-sync | 18 | test-drive | 12 |
| test-houses | 8 | | |

Robots: `robot-soccer` (40), `robot-carousel2` (37), `robot-poster` (34), `robot-challenge` (29),
`robot-blueprints` (27), `robot-voyage` (25), plus `robot-carousel`, `robot-cast`, `robot-sync`, `robot-trips`.

Note: `robot-voyage`, `robot-poster` and `robot-challenge` bind their own ports (8234, 8235, 8240).
Start servers on those ports or they fail to navigate and it looks like a code fault.

---

## 4. THE ENGINE, WHERE THINGS ARE

`island.html` has exactly two `<script>` blocks. The FIRST is the pure core and ends with
`module.exports`. `tests/extract-core.js` rips it out to `tests/isle-core.js`. Anything that must be
tested headless goes in block one and gets exported. Anything touching the DOM goes in block two.

Key pure functions: `makeWorld place erase undo encode decode isLand topZ idx inBounds houses
dayHash dayKey sanitizeName buildHash parseHash chapter questTable(-1) questTableBase VOYAGE_GOALS
voyageFor voyageProgress posterText challengeLine BLUEPRINTS bpBlocks bpPrice bpSize bpLaid bpSpot
pitchOf ballStart stepBall goalScored pitchGoals PITCH_W PITCH_H CABINETS cabinetGame WALK walkStep`

Key runtime: `renderDock renderDrawer tapAt cellAt stepCar clearCell onRamp openCabinet openGames
layPitch ballTick drawBall tapKick kickBall awardCoins spendCoins toast blip centreOn saveJournal
noteLearned refreshNext updateBpBar hireCrew crewStep openBlueprint`

Debug surface for robots: `window.__ISLAND`. Includes `place(x,y,id) journal() pitch() ballAt()
kick(vx,vy) layPitch openGames tapKick PITCH_W PITCH_H pitchGoals goalScored setDrive isDriving
lapInfo remix lineage saveNow openBook openStory`.

Codec: 64x64 grid, height cap 8, 400 blocks, 3 bytes a block, base64url in the fragment.
Link gate is 1700 chars. The challenge suffix `&v=no.done.all` is 12 chars worst case, taking the
worst-case link to 1615. **Anything new that rides in the link must be measured against 1700.**

---

## 5. WHAT SHIPPED TODAY

**The dock scroll defect, fixed.** `#bottombar` is `display:flex` with eight buttons at 52px, 416px of
content on a 390px phone, and the file had no `overflow-x` rule anywhere. It could never scroll, and
the existing code even called `bar2.scrollLeft = 0`, so it was written expecting scroll and never given
it. Now `overflow-x:auto`, momentum scrolling, snap per button, hidden scrollbar, and `::before`/`::after`
auto-margin spacers so it still centres when it fits.

**GAMES button.** New dock button opens `#gamemenu`, a picker of four games playable at any moment:
Soccer, Whale Song, Seagull Bonk, Cargo Stack. Cabinet games open with `openCabinet(i, 0)`, which works
because `cabinetGame(x,y) = ((x*7+y*13)%3+3)%3` and `7 ≡ 1 mod 3`, so `openCabinet(g,0)` opens game `g`.
The robot asserts LOCKED, BUY, UNLOCK, COINS TO PLAY and COMING SOON appear nowhere in it.

**Soccer.** Sixth blueprint, 9x6, one block high, 22 blocks, price 6 coins to hire the crew, hands free.
Two goal mouths at `dy 2..3` on the west and east ends. The ball is derived from the pitch by `ballStart`,
so it costs the share link nothing. Tap it (`tapKick`, wired into `tapAt` ahead of block placement) and it
flies at the far goal. Drive within 1.1 cells and the car nudges it with force scaled to `car.sp`.
A goal pays 1 coin capped at 5 a day (`journal.goalCoinsToday`), islanders stop and cheer, the ball resets.
`journal.goalsToday` feeds a voyage goal, quest row `goal1`, and a chapter line.
Walk mode draws that same ball in first person as a sixteen-triangle cream-and-ink chunk and
kicks it with the same helpers. Tap the projected ball (96px target) or walk into it. Standing
still is not a kick. Carousel four may claim this. Carousel three does not.

**PLAY multi-button.** Replaces the GAMES dock button. Same tap / hold / long-press clock as Dream
(280ms / 900ms). Tap continues the current game (kick via `kickTowardGoal`, or keep a cabinet going).
Hold cycles Soccer → Whale → Bonk → Stack. Long-press opens the existing `#gamemenu` sheet.
Nothing locked, nothing for sale, nothing in the share link.

**Chrome polish.** Side chrome uses `--pad-l` / `--pad-r` (12px or the safe-area, whichever is larger).
PHONE_CAP says a 390-point phone cannot hold the dock once PLAY and DREAM are kid-sized, so the bar
scrolls and the old "never scrolls" comment is gone. Toasts, the walk hint, drawer, dream and games
sit inside that edge. WARM on the walk HUD is a peach mix on fog and sky, not a Three rewrite.
Place and kick get a tiny synth click. Carousel four is unchanged and still does not claim pretty modes.

**Carousel two**, `ollie-update-2.html`, 11 cards, five real screenshots of the live build baked in as a
webp sprite sheet, same design language as carousel one.
**Carousel four**, `ollie-update-4.html`, nine cards, four real photos: the walk ball, walk mode,
the PLAY button, and the GAMES sheet.

---

## 6. DEFECTS FOUND AND FIXED TODAY (ALL MINE)

1. **Put the pitch at the FRONT of `BLUEPRINTS`**, which changed the daily blueprint rotation for every
   child on every day. Caught by `robot-blueprints`. Moved to the end. **Rule: never insert into a rotation,
   always append.**
2. **The repair created a double comma**, giving a seven-long sparse array with a blank entry. Caught by the
   suite. Repaired.
3. **Three tests were wrong, not the code.** `test-blueprints` hardcoded five blueprints; `test-voyage` and
   `test-story` had stat whitelists that did not know `goalsToday`. All three taught the new facts.
4. **Carousel nav slice cut at the inner `dots` div**, so the arrows never rendered. Replaced with real markup.
5. **The carousel robot kept clicking `#next` after it correctly greys out** on the last card. Robot fixed.
6. **A carousel check flagged the very sentence promising the opposite**, "Nothing is locked. You never have
   to buy anything." Replaced with three sharper checks.

---

## 7. WHAT IS NOT BUILT

- **Walk / 3D soccer is live.** Same `pitchOf` / `ballStart` / `stepBall` / `goalScored`.
  A walk tap uses `kickTowardGoal`. Walking into the ball uses `walkKick`. Sixteen-triangle
  cream-and-ink ball. Carousel four may claim it. Carousel three does not.
- **PLAY multi-button is live.** One huge dock control. Tap continues, hold cycles
  Soccer → Whale → Bonk → Stack, long-press opens the GAMES sheet. Same clock as Dream.
- **D2 deliveries and a second passenger seat. D3 named stunts. D4 world reactions.**
- **D2 deliveries and a second passenger seat. D3 named stunts. D4 world reactions.**
- **Real device test with Ollie on an actual iPad.** Still never done. This is not code, it is watching him.
- **PWA install for the hub and the island.**
- **Chocolate fractions, letter crates, Cleo's routine, Backwards Day, tilt steering.**

---

## 8. OPEN QUESTIONS FOR FABIAN

1. **Why was the repo made private?** Never answered. If it was the poster or the first name in the
   challenge link, stripping the name from both is a small tested change. Ask before assuming.
2. **Private hosting.** Vercel returns 403, the token cannot create projects on team
   `team_sgXqLEk32du1yAMoCPw1kAH3`. If private is wanted, fix that permission and migrate. Do not put a
   password wall in front of a shared link, it breaks the whole model.
3. **A domain** (~$15/yr, GoDaddy is connected) would avoid a second link migration later.
4. **Name clearance** for "Sunset Island Cruise Crew Chaos".
5. **Who lodges the YouTube Playables application.** It is not self-service and excludes games
   "specifically made for kids", so aim it at nine to fourteen.

---

## 9. THE HARD-WON RULES

- **The repo is the only durable checkpoint.** Sandboxes recycle mid-session. `/mnt/files` and
  `/home/user` do not survive. Clone fresh.
- **Commit the tests BEFORE the feature.** Spec first, red, then build. This has saved a whole night's work.
- **Read the committed tests before re-forging anything.** Rebuilding an already-shipped feature is the
  known failure mode here.
- **Cache-bust every live read** with `?v=$RANDOM`. A stale CDN read once burned an entire session by
  matching a prior sha and misdirecting everything after it.
- **Patch scripts assert exactly one match per replacement** and write nothing unless every replacement
  succeeds. Count the `rep()` calls, never guess the total.
- **Robots dismiss overlays the way a child would** (the first-visit book `#bclose`, the morning card),
  poll for state instead of trusting wall-clock waits, and read a wandering visitor's position immediately
  before tapping it.
- **Never insert into a rotation list.** Append.
- **Report every defect out loud**, including wrong tests. Errors are corrected once and never repeated.
- **No em dashes.** Categorical answers with receipts.

---

## 10. DEPLOY

From the terminal, `gh` or plain git both work now that Pages is on:

```bash
git add -A && git commit -m "..." && git push
sleep 95
curl -s "$B/island.html?v=$RANDOM" | sha256sum | cut -c1-8   # must equal the sha you tested
```

Committer is Fabian Diaz, fabian.diaz@trafficaccess.com.au.
Shipped must equal tested, byte for byte. A failing test blocks the deploy.
Every deploy proves `arcade.html` and `storybook.html` are unchanged.

---

## 11. WHO IT IS FOR

Ollie, six, Captain. Asked for houses, cars, people to talk to, arcade machines, a chocolate factory.
All built. He loves soccer, which is why the pitch exists, and **no invented quote is ever put in his
mouth**: the carousel says plainly that Uncle Tabs heard it.
Sibella, his sister, First Mate. Never "Arabella".
Fabian, Uncle Tabs. Directs and reviews. Does not hand-write code. Says "Go" and you forge.
