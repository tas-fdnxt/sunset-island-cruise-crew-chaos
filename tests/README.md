# Captain's Island test suites

The safety net. Run these before every deploy. Four hundred and twenty five checks across fifteen files. The building suites run on a flat test grid with no sea (extract-core.js sets ISLE.ALL_LAND, which the game never does); test-shore.js turns the sea back on.

## Running them

From the repo root:

    node tests/extract-core.js
    node tests/test-island-core.js
    node tests/test-houses.js
    node tests/test-drive.js
    node tests/test-remix.js
    node tests/test-story.js
    node tests/test-shop.js
    node tests/test-profile.js
    node tests/test-book.js
    node tests/test-cleo.js
    node tests/test-ladders.js
    node tests/test-compass.js
    node tests/test-shore.js
    node tests/test-living.js
    node tests/test-garden.js
    node tests/test-walk.js

`extract-core.js` pulls the pure logic module out of the first script block in `island.html`,
so the suites always test the real shipped code rather than a copy that can drift.

`tests/isle-core.js` is generated. Do not edit it and do not commit it.

## What each file guards

- **test-island-core.js** world rules, height cap, cargo cap, codec roundtrip, hostile link rejection,
  and the link size budget gate. If a change pushes the worst case link over 1700 characters this fails,
  because links longer than that get truncated by messaging apps and the island dies in transit.
- **test-houses.js** house detection. A door alone is not a house. Two doors on one building is still one
  house. Islanders cap at eight. Houses survive the link byte for byte.
- **test-drive.js** the FLAG block, lap time formatting, backward compatibility with links made before
  driving existed, and the budget again with a lap record attached.
- **test-remix.js** name sanitising (no injection, no oversized names), link building and parsing,
  the three deep credit chain, and the budget with a full chain and a record.
- **test-story.js** world statistics, quest integrity (every quest must map to something the game can
  actually detect), chapter generation, quiet days still reading like a story, and hostile names.
- **test-shop.js** the ARCADE and FACTORY blocks (ids 10 and 11). New ids survive the link, old links still
  load, id 12 is rejected. The chocolate factory gift: nothing before three houses, lands on open ground never
  inside a house, counts as cargo, cannot be undone but can be erased, is never given twice, refused when cargo
  is full. Quests for both map to real stats and Story Time reports them once, never on a quiet day.
- **test-profile.js** the captain profile carried in ?p= (nickname plus tap choices, nothing else). Roundtrip,
  name sanitising, ten character cap, hostile and out of range bytes rejected, every dream quest maps to a real stat,
  the dream quest comes first, grass is counted for the garden, and Story Time speaks in the chosen title.
- **test-book.js** the Book. Day keys, one chapter per calendar day (a second tap re-reads, never rewrites),
  400 chapter cap, symmetry detection (mirrored house yes, lopsided house no, lone door no), bedtime questions
  built from what actually happened today with the answers flipping on odd chapters, chapters that remember last
  night's answer and the waiting Storykeeper, and the grown-ups summary counting only the last seven days.
- **test-cleo.js** the advisor and the keeper. nextThing priorities (tap, house, door, quest, flag, ramp, moon, then
  rotating ideas), one sentence every time, ghost shapes offered, seventeen facts all short and unique with the
  dog lines skipped on Ollie's edition, coat growth every ten chapters, and the keeper's fact on page three.
- **test-ladders.js** the skill ladders. Three ladders with a job on every rung, stepping (three days fluent moves
  up, two misses drops back, never below zero), ladder quests with islander names, one rung above with rungs the
  child already proved skipped, rotation by day, dream quest first, deliveries told as sums in the chapter and asked
  at bedtime, and the mastery lines on the grown-ups page.
- **test-compass.js** the compass (north is the top corner, measured from the first flag), the space ladder that
  uses it, thirty words of the island with meanings, the word in the chapter, and the word question every third night.
- **test-shore.js** the bigger island: 128 wide, eight high, a thousand blocks. The shore is a pure function, the middle is
  land, the corners are sea, the old 64 grid centred is all land, building on the sea is refused, first-format links
  open centred, the v2 column-run codec roundtrips a full island of houses under the link budget, hostile v2 bytes are
  rejected, and a scattered carpet is refused by the link gate rather than the cargo cap.
- **test-living.js** the living island. The sky by the real hour (day, night, dawn, sunset, sun east to west, continuous
  across midnight), weather decided by the date (about a quarter of days, two hours of rain then an hour of rainbow),
  the tide, islander routines (asleep at night, arcade after school), the rainy day in the chapter, the advisor in the rain.

## The rule

A failing suite blocks the deploy. Never ship bytes that were not tested, and never edit a test to make a
real failure disappear. If a test is wrong, fix the test deliberately and say so.
- **test-garden.js** growing things and the morning boat. Seeds sprout after one real day and become trees after three,
  never backwards, never undoable; the stage roundtrips through the link; a seed needs bare ground and nothing is built on a
  growing thing; the boat's clock and its three daily gifts; the chapter, bedtime questions and advisor lines about the garden.
- **test-walk.js** the island on foot. Floors from the stack, seeds and sprouts walked over, one block is a step and two is a
  wall, a jump is for fun not for climbing, the sea and the grid edge are walls, spawning near home facing the door, and the
  mesh that draws the world: every exposed face and no hidden one, with doors and windows drawn as faces (a frame, a leaf
  or a pane, a handle or mullions, a sill) that sit just outside the wall and never further than 0.04.
