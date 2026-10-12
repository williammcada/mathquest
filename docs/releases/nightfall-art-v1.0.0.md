# Nightfall Art Direction v1.0.0 — release candidate record

**Status:** RELEASE CANDIDATE, not a verified release. The implementation checkpoint passed every check that could run in this environment. Ten DOM-based runtime test files, physical-device checks, Worker deployment and hosted verification remain **Not run** (see below). Do not merge to `main` or deploy until those are resolved, because `main` publishes GitHub Pages.

- Specification: [Nightfall Art Direction v1.0.0](../change-specs/nightfall-art-direction-v1.0.0.md); sprite brief and sheets at `e79fdb8`.
- Branch: `implement/nightfall-art-v1.0.0`.
- Implementation checkpoint: `7d4b9a7494f713b9b8d663d8d38321094f3fb60b`. Game code, Worker code and tests under verification are this commit. The later evidence commit adds only verification scripts, evidence and documentation.
- Baseline for comparison: `main` `e79fdb8`, the current Pages source.
- Handbook: `mcada-project-handbook` `fd43308` (U-01, U-05, U-06, U-07, U-08, U-10, U-11; S-03, S-04). Project standard NF-ART-01.
- Environment: Linux cloud container, Node 22.22.0, Playwright 1.56 headless Chromium 1194, `@napi-rs/canvas` for review frames.

## Delivered identity

| Item | Value |
|---|---|
| Platform | MathQuest v0.9.8 (`brand.js`, Worker `VERSION`, every `?v=` query, `package.json`) |
| False Haven | v0.4.0. Map revision `false-haven-0.4.0`, asset `false-haven-art-4`, presentation `false-haven-0.4.0`; session envelope `false-haven-cartridge-0.2.0` unchanged |
| Last Bus Out | Nightfall v1.1.0, config revision `nightfall-city-6` |
| First Response | Nightfall v1.1.0, rescue revision `nightfall-rescue-2` |

## Implemented

1. **NF-ART-01 sprites.** New `sprites.js` and five sheets. The following now draw from sprites:
   - windows (intact and shattered);
   - ordinary doors (roll gate plus health bar);
   - Chapter 1 locked gates (the fire tile is no longer used);
   - False Haven chain-link fences at full contrast;
   - inspection gate, open and closed;
   - broadcast tower, idle and active;
   - fuel drums, ready and burnt;
   - cargo rail, buffer stops and trolley;
   - flooded passage, as water tiles with a waterline and drain;
   - generator, selector, pump, hatch, shutter, barrier arms and gate console, each with its states;
   - power conduit;
   - sign boards for building and zone names.
2. **False Haven ground.** Plain yard gravel with a marked evacuation route and mud by the passage. The Chapter 1 street grid no longer repeats across the compound.
3. **Barricades removed** everywhere they appeared:
   - world data, switches and collision cache key;
   - save restoration and Worker validation;
   - instruction text.

   Pre-update saves are rejected with the existing restart path.
4. **Buildings.**
   - Painted roofs with parapets and rooftop clutter. Roofs fade out over 0.25 s when the player enters, and switch instantly under reduced motion.
   - Floor decals.
   - Wall furniture with collision in all 12 room layouts: 5 city rooms, the 2 First Response routes (clinic and depot) and 5 False Haven buildings.
   - First Response city blocks render as rooftops.
5. **Enemy placement.** The enemy-seeding random sequence is preserved. Two Chapter 1 spawns sat inside new furniture and are nudged to the nearest free point: `e4` (353,822 → 369,822) and `e6` (2299,663 → 2311,693), identical at every threat level. False Haven and First Response enemies are byte-identical to the baseline.

## Verification

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Repository test suite (`npm test`) | **Passed** for 267 of 277 tests. The 10 failing entries are whole test files that cannot load `happy-dom` (below) | Same 10 files fail identically on the baseline in this environment |
| 1a | DOM runtime suites: blackline-runtime, false-haven-runtime, held-input, ironbreak-input, journey-input, migration-ui, nightfall-runtime, runtime, v093, v094-runtime | **Not run** | `npm ci` was refused by the network policy for registry.npmjs.org, so `happy-dom` could not be installed. Re-run once dependencies install |
| 2 | Release validation (`npm run build`), including the five new sheets | **Passed** | Checks each sheet is a 1024 × 1024 PNG |
| 3 | Reachability and keep-out (`test/nightfall-reachability.test.mjs`) | **Passed**, 13 tests | 4 games/routes × all reachable topology states; every door, window side, task, pickup, switch and enemy home still reachable; floor area ≥ 97% of baseline (`test/fixtures/nightfall-baseline-area.json`); no furniture in keep-out zones; no corridor under 48 px |
| 4 | Barricade removal and save compatibility tests | **Passed** | `false-haven.test.mjs`, `false-haven-performance.test.mjs` |
| 5 | Rendered review frames of every changed object and room, inspected by eye | **Passed** after fixes: two sign placements and city roof contrast | `evidence/nightfall-art-v1.0.0/frames/review-g1…g5.jpg` (`scripts/render-nightfall-art-review.mjs`) |
| 6 | Real-time Chromium play, False Haven | **Passed** | See note 6 below |
| 7 | Real-time Chromium play, First Response and Last Bus Out | **Passed** (start, movement, no errors) | `rescue-live.jpg`, `city-live.jpg`. A full Chapter 1 objective run was not scripted in the browser; that flow is covered by Node simulation tests only |
| 8 | Performance against baseline, same machine | **Passed** | Render cost across six busy False Haven views: mean 1.24 ms per frame against 1.26 ms on the baseline; worst view 2.0 ms against 2.7 ms. Both hold the 60 Hz cap (16.7 ms median and p95). Synthetic headless timing, not device FPS |
| 9 | Hosted Pages files and visible versions | **Not run** | Candidate is not on `main` |
| 10 | Worker deployment and classroom revision handshake (S-04) | **Not run** | See deployment note |
| 11 | Owner Windows Chrome replay; physical iPad/iPhone (U-05, U-10) | **Not run** | Requires the owner's devices |
| 12 | Narrative/instruction separation (U-11) | **Not applicable** to new work | No story text changed. The one instruction edit (barricades removed) stays in the instruction block |

**Note 6 — False Haven browser run** (`browser-results.json` and the `fh-*.jpg` screenshots):
- v0.4.0 shown in the page title;
- all sheets decode in the browser;
- the player walks through the Shelter 04 door;
- no barricade switch remains at the old position;
- all eight machinery objectives complete in order;
- the inspection gate closes and reopens from its console;
- reload resumes the run with progress intact;
- the escape completes at the bus;
- zero console or page errors.

## Deployment note

Platform v0.9.8 changes `BRAND.engineVersion`. A v0.9.8 frontend refuses a v0.9.7 Worker for every cartridge, not only Nightfall. Deploy the Worker from this candidate and the Pages frontend together, at a time with no live classroom session. Then:
- run `public/connection-test.html` and expect frontend and server v0.9.8;
- create a fresh room for each Nightfall cartridge.

## Open items before VERIFIED CHECKPOINT

1. Install dependencies and run the 10 DOM runtime suites.
2. Owner replay on Windows Chrome and an iPad, including furniture collisions, roof fade and legibility.
3. Then record the verified checkpoint, merge, and deploy the Worker together with Pages.
