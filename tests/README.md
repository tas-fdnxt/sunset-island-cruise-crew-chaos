# Captain's Island test suites

The safety net. Run these before every deploy. Ninety checks across five files.

## Running them

From the repo root:

    node tests/extract-core.js
    node tests/test-island-core.js
    node tests/test-houses.js
    node tests/test-drive.js
    node tests/test-remix.js
    node tests/test-story.js

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

## The rule

A failing suite blocks the deploy. Never ship bytes that were not tested, and never edit a test to make a
real failure disappear. If a test is wrong, fix the test deliberately and say so.
