# SUNSET ISLAND: HANDOVER TO THE TERMINAL

Written 5 September 2026, updated 11 September 2026 after Forge 10. This file is the checkpoint. The repo is the only thing that
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
| `island.html` | see section 5 | Forge 10: the Captain's fix list. The Punch LOOK (`ff4cb285`) was already live on main before it; the old "not live until merge" note was wrong. |
| `arcade.html` | `bc0420d9` | OLLIE'S. Do not edit without Fabian asking. |
| `storybook.html` | `bef56030` | OLLIE'S. Do not edit without Fabian asking. |
| `ollie-update.html` | `a646da7a` | Carousel one, 17 cards. Shipped. |
| `ollie-update-2.html` | `304535ad` | Carousel two, 11 cards. Shipped. |
| `ollie-update-3.html` | live | Carousel three, Dream button. Shipped. |
| `ollie-update-4.html` | live | Carousel four, walk soccer + PLAY. Shipped. |
| `ollie-update-5.html` | live | Carousel five, overnight + NPC memory only. Shipped. |
| `ollie-update-6.html` | `86572075` | Carousel six, build replay only. |
| `ollie-update-7.html` | `afe7c68b` | Carousel seven, pretty modes + day/night + soft corners only. |
| `ollie-update-8.html` | `46626217` | Carousel eight, synth suite + bigger dock only. |
| `ollie-update-9.html` | `285109ac` | Carousel nine, punch LOOK only. Tested on this branch. |

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
2. All 35 headless suites green
3. Robots in real Chromium driving the actual UI, on BOTH editions
4. Screenshots taken and actually looked at
5. Hygiene: zero console errors, zero external requests
6. Live curl sha match after deploy, plus proof Ollie's files are unchanged

**Current state: 36 suites, including `test-captain-fixes` (50), `test-pretty` (134), `test-synth` (72), `test-dock` (47), all green. Robot `robot-fixes` runs Ollie's edition on four iPad shapes and a phone, and everyone's edition on iPad and phone. Ollie plays on his iPad: iPad is the first viewport, always.**

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
| test-houses | 8 | test-overnight | 110 |
| test-replay | 104 | test-pretty | 134 |
| test-synth | 72 | test-dock | 47 |

Robots: `robot-pretty` (78, punch LOOK), `robot-synth` (64), `robot-dock` (48), `robot-chrome` (78),
`robot-replay` (44), `robot-overnight` (46), `robot-soccer` (74),
`robot-carousel9` (53, punch LOOK only), `robot-carousel8` (synth + bigger dock only),
`robot-carousel7` (51, pretty + day/night + corners only),
`robot-carousel6` (51, build replay only), `robot-carousel5` (overnight + NPC memory),
`robot-carousel4`, `robot-carousel3`, plus `robot-carousel2`, `robot-carousel`, `robot-poster`, `robot-challenge`,
`robot-blueprints`, `robot-voyage`, `robot-cast`, `robot-sync`, `robot-trips`.

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
Link gate is 1700 chars. The challenge suffix `&v=no.done.all` is 12 chars worst case.
NPC memory rides as `&m=` (compact codec, empty adds nothing). One islander is 6 hash chars.
Eight is 15. Worst-case island plus full memory measured 1277. **Anything new that rides in
the link must be measured against 1700.**

---

## 5. WHAT SHIPPED TODAY

### Forge 10, 11 September 2026: the Captain's fix list

From a recorded playtest with Ollie on the live island. Every item was a red test before it was fixed
(`tests/test-captain-fixes.js`, `tests/robot-fixes.py`), proven red on the live bytes `ff4cb285`.

- **Stacking.** `cellAt` undid the view at ground level only, so a tap on the top of a 5 high tower placed a
  block on the ground five squares behind it, drawn where the tower top is. New pure `pickColumn` walks every
  column that could be under the finger and returns the front-most one whose picture contains the point.
- **ONE AT A TIME is the default.** A drag moves the island. Hold the block in the hand for ONE / LOTS
  (`#modepop`). LOTS brings back the stroke painter. The block in the hand wears a badge (x1 or LOTS).
- **Dream.** `dreamSpot` ignored what was built, so every DREAM tap laid the next castle on top of the last
  until the middle was 8 high and it said THE DREAM COULD NOT FIND LAND with sand all around. With a world it
  now only lands on clear sand. Every failure has its own sentence (`dreamWhyLine`); the old line is gone.
- **Blueprint rectangle.** `bpSpot` checked only a plan's outline, so the hollow pitch could close around a
  hut. `bpRectFree` checks every square, and a full outward sweep runs before anyone is told no.
- **The plan moves.** An untouched blueprint can be held and dragged (`bpDragStart/To/End`). Green when it
  fits, red when not, springs back to clear sand. Pinned once its first block is laid.
- **The block row pops up.** On an iPad `#rail` sat on screen all the time. Now the block in the hand pops it
  up and picking a block puts it away (`body.railopen`). A phone still uses the drawer.
- **Side columns.** The side buttons were placed by hand, one `top:` each, and on an iPad LOG sat on top of
  the find-my-island button. They now live in two stacks, `#sideR` and `#sideL`.
- **Title pill.** His own island shows a small anchor pill; a tap shows the whole name. A friend's island
  keeps the full name, it is the credit.
- **LOOK words.** SOFT / WARM / CRISP became SUNNY / SUNSET / BRIGHT. Keys unchanged, saves unchanged.
- **HELP beside DREAM.** Eighth tool on the dock. `PHONE_CAP.SLOTS_*` are 11 and 12.
- **The dock leans in.** Buttons under the finger grow into the dock's own top padding (off under reduced motion).
- **Trees.** The three fruit on a grown tree shared one canvas path with no `moveTo`, so every tree had a
  big pink wedge across it. Ollie: "The trees are pink and green. I don't want that." Separate circles, gold.

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

**Chrome polish.** Side chrome uses `--pad-l` / `--pad-r` (16px or the safe-area, whichever is larger).
PHONE_CAP says a 390-point phone cannot hold the dock once PLAY and DREAM are kid-sized, so the bar
scrolls and the old "never scrolls" comment is gone. Toasts, the walk hint, drawer, dream and games
sit inside that edge. WARM on the walk HUD is a peach mix on fog and sky, not a Three rewrite.
Place and kick get a tiny synth click. Carousel four is unchanged and still does not claim pretty modes.

**Overnight + NPC memory.** Sleep rides the moon, not a new dock hero. Same tap / hold / long-press
clock as Dream (280ms / 900ms). Tap still opens tonight's chapter. Hold sleeps the island, writes
the overnight chapter line, opens the morning card, and bumps islander memory. Long-press opens
the existing shelf. Compact `&m=` in the share hash: 6 chars for one islander, 15 for eight,
worst-case island plus memory 1277. Quest `sleep1` is appended. No lock. No sell.

**Build replay.** UNDO is the Build path. PLAY and DREAM stay the dock heroes. Same clock
(280ms / 900ms). Tap still undoes. Hold peels the trailing place ops and places them back
so the kid watches the blocks go down again, then keeps playing. Long-press watches a longer
recent run (up to 24). The tape is session-local from `w.undo`. Nothing new in `#i=`.
Quest `replay1` is appended. No lock. No sell.

**Pretty modes + day/night + soft corners.** LOOK is a kid-clear chip, not a dock hero.
Same clock (280ms / 900ms). Tap cycles SOFT / WARM / CRISP. Hold peeks day or night on
the living `skyAt` clock. Long-press opens the picker. Sleep overnight still wakes into
morning. Colour mixes and a CSS tint, not a Three rewrite. Soft corners on LOOK, dock,
and chips. Nothing new in `#i=`. Quest `pretty1` is appended. No lock. No sell.

**Punch LOOK.** Soft was the default and too quiet, so a hard refresh still looked like
the old island. Default open is now WARM. Soft, Warm and Crisp use stronger tints.
Night is a deep sky with stars, not a scavenger hunt. LOOK is a labeled high-contrast
sand chip with instant tap feedback. PLAY and DREAM stay the oversized heroes from
PR #11. Hold LOOK still flips day or night in one peek. Nothing new in `#i=`.
Worst-case link stayed 1262. No lock. No sell. Carousel nine may claim this punch.
Carousels one to eight do not.

**Carousel two**, `ollie-update-2.html`, 11 cards, five real screenshots of the live build baked in as a
webp sprite sheet, same design language as carousel one.
**Carousel four**, `ollie-update-4.html`, nine cards, four real photos: the walk ball, walk mode,
the PLAY button, and the GAMES sheet.
**Carousel five**, `ollie-update-5.html`, nine cards, four real photos: the moon, the morning card,
the remembered line, and the shelf. Claims only overnight + NPC memory.
**Carousel seven**, `ollie-update-7.html`, nine cards, four real photos: LOOK, night sky,
the picker sheet, and the tablet. Claims only pretty modes + day/night + soft corners.
**Carousel eight**, `ollie-update-8.html`, nine cards, four real photos: PLAY and DREAM
on a phone, the dock crop, SOUND on the look sheet, and the tablet. Claims only the
synth suite and the bigger dock. Pretty, overnight, and replay are named as already live.
**Carousel nine**, `ollie-update-9.html`, nine cards, four real photos: WARM on a hard
refresh, SOFT after a cycle, NIGHT with stars, and LOOK on a tablet. Claims only the
punch. Synth and the bigger dock are named as already live.

**Synth suite + bigger kid dock.** Seven WebAudio voices: place, erase, dream, sleep,
look, goal, toast. Mute lives on the look sheet and silences every one. Tools stay
about 2cm. PLAY is 120 and DREAM is 112 on a phone, so a hard refresh shows the jump
against live main (PLAY 84, DREAM 80). LOOK stays sand-side. Nothing new in `#i=`.
Worst-case link stayed 1262. No lock. No sell. PR #11 merged. The LOOK punch is
this brick. Do not merge from a sandbox.

### Forge 11b, 12 September 2026: phone-sized buttons

Uncle Tabs: "The buttons are still too big... for iPad it's good but for mobile phone is not good enough." On a 390 phone
only UNDO, DOOR, SAND and WOOD fitted; PLAY, DREAM and HELP hid behind a swipe at 76 to 120 points each.
- `dockPlan` now plans the phone too: one row, no swiping, UNDO, the block in hand, ERASE, WALK, DRIVE, PLAY, DREAM,
  HELP. Tools 36 to 56 (39 on a 390 phone), the block in hand 8 bigger, PLAY and DREAM 14 bigger. Fits 360 to 430 and
  phone landscape. Recent-block shortcuts leave the phone dock; tapping the block in hand still opens every block.
- SHARE lives on the side on a phone too. A visitor's REMIX sits at the top of the right column on a phone.
- Phone side buttons 44, sheets, tips and toasts sit lower to match the shorter dock. The iPad is unchanged.
- Red first: `test-forge11.js` phone section (18 phone shapes) and three phone views in `robot-forge11.py`.
- Wrong tests taught, all encoding the old phone design Uncle Tabs overruled: robot-chrome, robot-dock and robot-soccer
  (phone dock must scroll, 2cm tools, 104 to 112 point heroes, 16 point edge), robot-overnight (56 point moon),
  robot-pretty (16 point corners), robot-replay (44 point UNDO). Each now holds the phone to the phone rule and the
  iPad to its old rule.
- Defect found and fixed in the build: on a 360 phone the plan overshot by 2 points because the gaps shrank slower
  than the buttons; the gaps now give way first.

### Forge 11, 12 September 2026: the Captain's controls

Every button, screen and sheet ask from the playtest, audited on his real screen sizes and rebuilt. Red first:
`tests/test-forge11.js` (324 checks, pure `dockPlan`) and `tests/robot-forge11.py` (iPad portrait, iPad landscape,
iPad mini, iPad Pro landscape, phone, everyone's edition), committed before the build.

- **The dock fits his iPad.** The audit found DREAM, HELP and SHARE off the right edge of an 820 wide iPad and PLAY cut
  in half. New pure `dockPlan(w, h, remixOn)` shrinks every dock button together until the whole dock fits with no
  swiping, never under 60 for a tool, 88 for the block in his hand, 96 for PLAY and DREAM. HELP sits beside DREAM.
  The phone keeps its measured sizes and still scrolls, honestly.
- **SHARE and LOOK moved to the side.** SHARE is a side button on an iPad. LOOK is a small sun button with a word under
  it, not a big chip he did not understand.
- **A word under every picture button:** STORY, VOYAGE, HOME, CUPS, LOOK, SHARE.
- **One help button.** The second question mark in the side column is gone; HELP beside DREAM is the one.
- **One thing open at a time.** Sheets used to pile up to four deep, so the one he could see was not the one his finger
  reached. `closeSheets` runs in every opener; a tap on the island closes whatever is open and never drops a block.
- **Every button squishes the moment his finger lands** (`pressed` class on pointerdown), so "nothing happens" never happens.
- **DREAM is pictures.** Every dream tile is drawn by the engine from its own blocks. SOCCER PITCH is the first dream
  (he could not find it). The sheet says "Tap a picture. Your crew builds it."
- **Kid words.** CARGO became BLOCKS on the counter; "CARGO HOLD FULL" became "YOUR ISLAND IS FULL". The CARGO STACK
  game keeps its name.
- **Games sheet sized for an iPad** (rows 76 tall, 20px names). Sheets never taller than 62 percent of the screen, so
  the island always shows above them.

### Forge 10 part two, 11 to 12 September 2026: the morning present

Red first: `tests/test-forge10b.js` (pure core) and `tests/robot-forge10b.py` (iPad portrait, iPad landscape,
phone, everyone's edition), committed before the build.

- **B5b MANSION.** "Our house is like a big mansion." "Mansion. Done." `dreamMatch` gives 7 for MANSION or BIG
  HOUSE, `dreamRecipe(7)` is `mansionCols()`: 7x6, two storeys (brick under wood), windows on both floors, roof
  ring, door, courtyard, two palms, a sand path and a pool. 138 blocks, tallest 5, a real house so somebody moves
  in. MANSION button in the dream picker. A second mansion lands beside the first, never on it.
- **The morning gift card** (`#gift`). Ollie's edition only, on his own saved island only, once only
  (`journal.giftMansion`). Says MANSION. DONE. with a live drawn preview and BUILD MY MANSION. Everyone's edition
  never sees it; a brand new island never sees it.
- **B4 cars.** New `drawCar`: iso toy boxes that face where they drive (`carCorners`), spoiler on RED ROCKET, roll
  cage on SAND BUGGY, tall cabin on SEA CRUISER, lights front and back, bonnet pops on a wall bump, bounce at the
  world edge.
- **B4 water.** Driving into the sea splashes (particles plus a one time toast). `CAR_SEA`: RED ROCKET 0.4 and SAND
  BUGGY 0.45 speed in the sea, SEA CRUISER floats at full speed. The car sinks a little and bobs.
- **B3 sea and backgrounds.** Whole zoom goes wider (0.22 tablet, 0.17 phone, ZMIN 0.14) so the island sits in a
  big sea, with shore foam and moving wave caps. `BACKDROPS`: SUNSET, LAGOON, OCEAN, SPACE (stars), picked on the
  LOOK sheet (`#lk-bg`), remembered on the device (`captains-island-bg-v1`), never in the link.
- **B5 islander cards** (`#people`). Name, face, title, JOB, STORY, LOVES, RIGHT NOW, REMEMBERS, BACK and NEXT.
  Opened from the islander count badge, on whoever was tapped last. Tapping an islander still gives the three
  orders, unchanged.
- **B6 carousel ten** (`ollie-update-10.html`). Twelve cards, pictures drawn live in canvas, only his real quotes
  from the recordings, ends at `island.html?crew=OLLIE`. `tests/robot-carousel10.py` guards it.

---

## 6. DEFECTS FOUND AND FIXED TODAY (ALL MINE)

Forge 11:
- The side-button words were first set while the side columns were detached from the page, so none appeared.
- The words then landed under the wrong buttons (VOYAGE under LOG, LOOK under SHARE): older rules forced those
  buttons static. Fixed with more specific rules.
- The LOOK button then sat on the minimap: its old bottom offset applied once it was positioned relative. The robot
  missed it because it only compared buttons with buttons; it now checks the map too, proven red on the bug.
- My taller DREAM sheet covered the island so a tap could not close it; sheets are now capped at 62 percent.
- Wrong tests taught: robot-chrome, robot-dock and robot-pretty required LOOK to be a 90px chip with its mode name
  printed on it. Forge 11 changes that on purpose (Ollie: "I don't need this. What is this?"). They now require a
  finger-sized side button with the word LOOK under it, and read the live look from its label. Night shows as a moon.
- Wrong test taught: the phone dock scrolls by design, so a button clipped at its edge is the swipe hint, not a fault.
- My own error: an unnecessary git stash round-trip on island.html while testing. Nothing was running; work intact.
- Checked and not a defect: the tall box in the minimap is the "you are here" frame, not a missing glyph.

Forge 10 part two:
- The first sea gradient called `mixHex` on a non-hex colour, crashed the frame and blanked the screen. Now uses
  the backdrop's own hex stops.
- First car drawing: wheels too big and floating. Fixed with `CAR_SCALE` and wheels sized in block units.
- Islander cards first opened on every islander tap, and the card sat over the orders, so GO OUTSIDE could not be
  tapped. `robot-cast` caught it (a real regression, not a wrong test). Tap gives orders again; the card opens
  from the islander count badge.
- Wrong tests taught, a big one: eight robots (dock, fixes, overnight, pretty, replay, soccer, synth and the new
  forge10b) opened "everyone's edition" with `?p=CLEO`. That is not a valid profile code, so `parseProfile` returned
  null and they were all quietly running Ollie's edition. Now `?crew=PIP`, and forge10b asserts the edition it is on.
  All seven older robots pass on the real everyone's edition.
- Wrong test taught: `robot-sync` signed run restores Ollie's saved island, so the one time gift card now
  (correctly) covers the screen; its dismiss list did not know `#gift-later`. Proven by passing on the pushed
  bytes and on the new bytes once taught.
- Wrong test taught: `robot-carousel10` counted only warm pixels as "drawn", so the green tree picture failed.
  It now counts green too.

Forge 10, 11 September 2026:

- **Found in the engine and fixed:** the stacking pick, the dream stacking on itself, the hollow blueprint
  check, the LOG overlap, and the pink tree wedge above. Also three that nobody had noticed:
  the zoom knob shared the id `knob` with the walk stick, so zooming moved the walk stick and the zoom knob
  never moved (it is `zknob` now and rides the real track height); the `#voybtn` size rules sat outside
  their brace since they were written, so the voyage flag drew as a tiny default button; and `#btn-book`
  overlapped `#voybtn`, `#mini` overlapped the title on an iPad.
- **Tests that were wrong, taught out loud:** `robot-blueprints` assumed every day's blueprint has a door and
  failed on the live build on doorless days (racetrack, pitch); `test-pretty` called SOFT/WARM/CRISP kid-clear;
  five suites hardcoded a seven-tool dock span; `robot-chrome` expected the drawer on an iPad; `robot-pretty`
  read the old words.
- **My own slip:** I ran `git stash` while the robot fleet was running, which swapped the file under one robot
  for a few seconds. That fleet run was thrown away and the whole ladder rerun on the final bytes.

Earlier:

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

- **Forge 10 is complete.** Still not built from the playtest (Sprint 11 and 12 in the debrief): jobs, the coin
  shop, spa, pet shop, water park and slide, the World map, level crossing, juice bar.
- **Robot ports.** `robot-carousel` needs a server on 8231 and `robot-trips` on 8233, as well as 8099, 8234,
  8235 and 8240. Start them all or those robots fail to navigate and it looks like a code fault.

- **Walk / 3D soccer is live.** Same `pitchOf` / `ballStart` / `stepBall` / `goalScored`.
  A walk tap uses `kickTowardGoal`. Walking into the ball uses `walkKick`. Sixteen-triangle
  cream-and-ink ball. Carousel four may claim it. Carousel three does not.
- **PLAY multi-button is live.** One huge dock control. Tap continues, hold cycles
  Soccer → Whale → Bonk → Stack, long-press opens the GAMES sheet. Same clock as Dream.
- **Overnight sleep is live.** Hold the moon. Morning card, chapter line, journal, and
  `&m=` memory. Carousel five may claim it. Carousels one to four do not.
- **Build replay is live.** Hold UNDO. Blocks go down again, then you keep playing.
  Carousel six may claim it. Carousels one to five do not.
- **Pretty modes + day/night + soft corners are live.** Tap LOOK.
  Soft, warm, or crisp. Hold for day or night. Soft corners. Carousel seven may claim
  the first pretty brick. Carousels one to six do not. Carousel eight names it as
  already live. Carousel nine claims the punch only.
- **Synth suite + bigger dock are live.** Seven voices. PLAY and DREAM
  scream. Carousel eight may claim it. Carousels one to seven do not.
- **Punch LOOK is live on this branch.** Default WARM. Soft is not the old island.
  Night has stars. LOOK is labeled. Carousel nine may claim it. Carousels one to
  eight do not.
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
