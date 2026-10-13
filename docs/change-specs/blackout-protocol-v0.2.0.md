# Blackout Protocol v0.2.0 — Stage B: MathQuest classroom cartridge

**Status:** Approved by William McAda 2026-10-13 (Asia/Shanghai) with the recommended options: D1 blackout-protocol stays canonical for the puzzle core, vendored into MathQuest; D2 optional tap hook in MathQuest's shared game host; platform version 0.10.1. Implements Stage B of the approved v0.1 spec (§2, §8). This is a specification, not a verification claim.
**Owner:** William McAda · A WILLIAM MCADA PRODUCT
**Sources read:**
- **Game:** williammcada/blackout-protocol at `88aafca`. The game is Stage A v0.1.3, verified checkpoint `1250611`.
- **Platform:** williammcada/mathquest `main` at `a4405f8` (MathQuest 0.10.0, Math Engine).
- **MathQuest files read:**
  - `AGENTS.md`, `docs/PROJECT-BRIEF.md`, `schema/CARTRIDGE_V09_CONTRACT.md`.
  - `public/cartridges.js` and `public/cartridges/{ironbreak,blackline}.js`.
  - `src/cartridges/{registry.js,nightfall/server.js,ironbreak/server.js,blackline/validation.js}` and `src/worker.js`.
  - `src/engine/equipment.js`.
  - `public/engine/{game-host.js,controls.js,dev-playtest.js,teacher-tools.js}` and `public/review-presentation.js`.
  - `scripts/{validate-release.mjs,build-review-bundles.mjs}`.
  - Tests `test/{ironbreak,blackline-cartridge,combined-cartridges,narrative-separation}.test.mjs`.
  - Change specs for Ironbreak v0.1.0, BLACKLINE v0.2.0, v0.10.0 Math Engine and the Netlify frontend migration.
- **Handbook:** williammcada/mcada-project-handbook at `7e134a8`: AI-START-HERE, UNIVERSAL-RULES U-01–U-15, CONDITIONAL-STANDARDS S-02/S-03/S-03-A/S-04, RELEASE-CHECKLIST.

## 1. What this release does

It adds Blackout Protocol to MathQuest as a playable classroom cartridge, following the BLACKLINE pattern.

**Classroom flow:**
- Briefing.
- Math Engine gates.
- Early crew vote.
- Equipment preparation.
- One five-minute puzzle run per student.
- Final crew vote.
- Epilogue.
- Reports.

**Owner tools:** the puzzle also gets an owner DEV entry and a practice entry inside MathQuest.

**Unchanged:** the puzzle rules are exactly those of accepted v0.1.3: five districts, the tuning accepted at v0.1.2, three power-ups, fuses, Energize, the guided route and the "Substation 9" score.

## 2. Where the code lives (decision D1)

**Recommended: blackout-protocol stays canonical for the puzzle core; MathQuest vendors it.**
- `src/core.js` (rules, boards, run state) is the single source of truth.
- MathQuest gets an ES-module copy at `public/games/blackout/core.js`, made by a new `scripts/sync-blackout.mjs`. The script records the source commit and SHA-256, the same way MathQuest already vendors the Math Engine.
- The Worker's validator and the classroom adapter both import that one copy, so the rules cannot drift between client and server.
- The classroom screen code (the MathQuest adapter) lives in MathQuest, like every other cartridge.

**Alternative: move everything into MathQuest** and freeze this repository as the Stage A prototype. This is simpler day to day, but it makes this repository history only.

**The standalone file after Stage B.** Under U-13, DEV mode must run the same game code as the classroom version. Once Stage B lands, the owner DEV entry becomes the MathQuest review bundle (`reviews/BlackoutProtocol-v0.2.0.html?dev=action`), built from the classroom adapter. The Stage A file `blackout-protocol-v0.1.3.html` is kept as a historical prototype and no longer updated.

## 3. Platform touch points (MathQuest)

Cartridges are wired into MathQuest by hard-coded id checks, not by a manifest. Every point below is required. Missing any one of them breaks session creation, dispatch or reports.

| Area | File | Change |
| --- | --- | --- |
| Cartridge object | `public/cartridges/blackout.js` (new) | `BLACKOUT` with `id:'blackout-protocol'`, `title`, `revision:'blackout-protocol-0.2.0'`, `contract:'mq.cartridge/1.0'`, `gameId:'blackout'`, `activeLimitMs:300000`, `teamWindowMs:300000`, `budget:0`, `resolution`, `presentation`, `gates`/`inserts`, `routes`, `choices`, `items`, `assets`, `endings`, `BLACKOUT_PERSONAL` outcome labels |
| Registry and scenes | `public/cartridges.js` | Import, add to `CARTRIDGES`, add a `sceneFor` branch to `blackoutScene()` |
| Server registry | `src/cartridges/registry.js` | `['blackout-protocol', {advance(team){return advanceExpansion(this,team);}}]` |
| Expansion dispatch | `src/cartridges/nightfall/server.js` | Add the id to `expansionFor`; add a validator hook `c.id==='blackout-protocol'` → `validateBlackout`; allow outcomes `success`, `partial`, `lost`, `timed_out`, `assisted_completed` |
| Validator | `src/cartridges/blackout/validation.js` (new) | §6 |
| Worker | `src/worker.js` | Import `BLACKOUT_PERSONAL`; add a `fateFor` branch; add a `reportCsv` section "BLACKOUT PROTOCOL · ENGAGEMENT ONLY" |
| Client dispatch | `public/app.js` | Add the id to the expansion id lists (4 places); the host is the generic `FinaleHost`; advance the import cache keys |
| Student panels | `public/expansion-ui.js` | Personal-label branch |
| Game registry | `public/games/registry.js` | `blackout: {adapter, practice:'./blackout-practice.html'}` |
| Game adapter | `public/games/blackout/{adapter.js,core.js,render.js,audio.js}` | §5 |
| Shared host | `public/engine/game-host.js` | Optional tap hook (decision D2) |
| DEV and review | `public/engine/teacher-tools.js`, `public/cartridge-review.html`, `scripts/build-review-bundles.mjs` | DEV homepage entry; review hub card; review bundle with `?dev=action` |
| Assets | `public/assets/blackout/` | §7 |
| Tests | `test/blackout-cartridge.test.mjs` (new), `test/combined-cartridges.test.mjs` | §9; add `'blackout-protocol'` to the exact catalog id list |
| Versions (U-01) | `brand.js`, Worker `VERSION`, `package.json`, `index.html`, `?v=` keys, connection test, `Deploy_Backend_Windows.bat` | Platform **0.10.1**. Cartridge revision `blackout-protocol-0.2.0`, shown separately |
| Records | MathQuest `docs/PROJECT-BRIEF.md`, change spec, release notes | Record this cartridge, the U-15 art exception (§7) and the hosting limit (§10) |

**Decision D2: how taps reach the puzzle.** MathQuest's shared `GameHost` only feeds games through button-pad controls. It has no way to pass a tap on the game canvas to the game.
- **Recommended:** add one optional adapter hook, `tap(s, x, y)`, to `GameHost`. The host converts the canvas position to game coordinates and calls the hook only if the adapter defines it.
  - Existing adapters don't define the hook, so their behavior is unchanged. Their test suites must still pass, and this is verified.
  - This follows the contract's direction to "use the adapter interface rather than extending shared UI with cartridge branches."
- **Alternative:** a Blackout-only host class, like Ironbreak's. This means more cartridge-specific code and duplicate pause, help and reconnect logic.

## 4. Classroom flow and story

The structure follows Nightfall, BLACKLINE and Ironbreak. Every scene supplies separate `paragraphs` (story) and `instructions` (U-11), so the automatic narrative-separation test covers it.

**Gates.** The first two and the last are always present; the two inserts are added for 4- and 5-gate sessions.
- `gates`: *Cold Start* · *Reading LANTERN's Logs* · *The Manual Switchyard*
- `inserts`: *Theo's Radio Net* · *The Frozen Relay*
- Questions come from the Math Engine through MathQuest's question provider (U-14). The cartridge declares no math.

**Early vote** (after gate 1), `routes`:
- *Harbor Pumps first* (flood risk).
- *Northside Hospital first* (generator fuel).
- The vote changes only narration and the epilogue. Boards, difficulty and equipment are the same either way.

**Preparation.** `items` are Spare Fuse, Grid Scanner and Surge Stabilizer.
- One slot to start, and one more for each extra teacher-sized question block, up to three. This is MathQuest's existing equipment provider.
- The team proposes; each member readies; the Event Lead commits.

**Puzzle run.** One run per student, using the generic `minigame.*` protocol.
- The 300-second authoritative team window starts at `market.continue`.
- The 300 seconds of active play for each student follow S-03-A.
- Teacher pause freezes the window. Teacher advance and end close open runs as `timed_out`.

**Final vote**, `choices`:
- *Restore LANTERN with safeguards*
- *Keep the grid on manual control*
- *Split into neighborhood microgrids*
- Everyone votes, whatever their run outcome. Ties are settled by the Event Lead, using the existing rule.

**Epilogue.**
- One authored ending per choice, plus a paragraph for each route.
- Lines specific to the inserted gates, matching the existing pattern.
- A neutral bridge when the crew restored few districts.

**Personal outcome labels:**

| Outcome | Label |
| --- | --- |
| `success` | All five districts restored |
| `partial` | Some districts restored |
| `lost` | Panel lost every fuse |
| `timed_out` | Shift ended |
| `assisted_completed` | Restored with the guided route |
| not started | Panel not reached |

**Engagement only.** Run outcomes never change answers, scores, mastery or voting rights (cartridge contract v0.9).

## 5. Puzzle in MathQuest (adapter)

A `blackoutAdapter` for the generic `GameHost`:
- **Required fields:** `id`, `title`, `instructions`, `controlProfile`, `activeLimitSeconds:300`, `create(run)`, `step(s,input,dt)`, `render(ctx,s,art)`, `loadArt()`, `hud(s)`, `objective(s)`, `resultLabels`, `assisted(...)`, `createAudio()`, `music(s)` and `tap(s,x,y)`.
- **Rules:** come from the vendored `core.js`. Boards are seeded from the run id, so every reconnect gets the same five boards.
- **Board:** drawn on canvas with the same neon polygon look as Stage A.
- **Buttons:** Energize and Grid Scanner are buttons in the control profile. Keyboard support is arrows, Space, Enter and S.
- **Input reliability (U-10):** shared input code and native-menu, zoom and selection protection on the board and HUD; there are no held controls.
- **Guided route:** goes through `GameHost`'s existing assist button (`minigame.assist`). It highlights the next tile, as in Stage A.
- **Music:** in-run, the "Substation 9" score plays through `createAudio()`, under the host's existing sound button.
- **Snapshot:** district, fuses, tile rotations, elapsed time, surge state, scanner use, stats and outcome. It stays under MathQuest's 60k-character limit.

## 6. Server validation (`validateBlackout`)

Like BLACKLINE's validator, it returns an error message or nothing.

**Envelope checks:**
- revision unchanged;
- loadout unchanged;
- elapsed time only increases, never past 300 s or past real time;
- sequence numbers only increase;
- fuses only decrease, never below 0;
- the restored-district count only increases;
- the district index matches the count restored.

**Stronger than other cartridges.** For each district the client reports as restored, the validator rebuilds that board from the run's seed and the reported tile rotations, and checks that the circuit really connects. Rotation counts must be possible. This makes "districts restored" checkable, not just client-reported.

`success` requires all five districts restored.

**Limits.** This is still not anti-cheat: timing, and which tiles were tapped in what order, remain client-reported. Records say so (`validation: 'client-reported; server-checked boards'`).

## 7. Art and sound

**Story scenes.** Polygon/procedural SVG scenes drawn in code by Claude: `cover`, `radio` (the switchyard), `market` (preparation bench) and `ending` (dawn over Port Calder), plus a LANTERN-core scene for the decision.
- Each is an SVG file in `public/assets/blackout/`, more than 1000 bytes as `validate-release` requires, with no text in the image.
- This is permitted by U-15 and the owner's 2026-10-13 decision, and is recorded in both briefs as an exception to MathQuest's 8 Oct painted-art direction, which was written for Ironbreak and BLACKLINE.

**Room music** (teacher dashboard: `assets.ambient`, `assets.finale`).
- These are WAV files rendered from the same "Substation 9" synth by recording the score in headless Chromium. They are not separately composed.

**Asset provenance.** Recorded in `docs/releases`: art maker Claude, music original and generated.

## 8. DEV and practice (U-13)

**DEV.**
- A review bundle `public/reviews/BlackoutProtocol-v0.2.0.html` runs the real `QuestSession` in memory, using the existing pattern.
- `?dev=action` opens the shared `showDevPanel` with all three power-ups and starting districts 1–5. It skips math, writes no records and shows the standard banner.
- It is listed in the DEV homepage `practiceTools` and on the review hub.

**Practice.**
- `blackout-practice.html` is a record-free student-style run with no gates.
- `presentation.practice` links to it.

## 9. Verification (definition of done)

**MathQuest suite:**
- `npm test`: every existing test plus the new ones.
- `npm run build`: `validate-release`, assets and versions.

**New `test/blackout-cartridge.test.mjs`,** using the Ironbreak fixture pattern through `QuestSession`:
- 3, 4 and 5 gates;
- both routes and all three endings;
- extra preparation blocks giving up to three items;
- runs issued at `market.continue`, with the window, alarm and pause;
- validator: accepts real solved boards and rejects fake ones, out-of-order sequences, time travel and loadout changes;
- every outcome;
- guided route;
- reconnect returns the same boards;
- teacher advance and end;
- report JSON and CSV fields;
- session deletion clears local records;
- other cartridges cannot use Blackout runs.

**Also:**
- **Shared host regression:** tests for Ironbreak, BLACKLINE, Coastal Escape and Nightfall still pass with the tap hook added.
- **U-11:** the narrative-separation test passes for Blackout at every stage and gate count.
- **Browser** (Playwright, local Worker):
  - one full classroom session, with a teacher and two students, through every stage;
  - the board on iPad and phone in both orientations;
  - DEV entry and practice entry;
  - U-10 protections;
  - music.
- **Not run until actually observed:**
  - physical iPad/iPhone;
  - school network;
  - classroom concurrency;
  - hosted deployment.

**Release.** Implementation checkpoint → verify → verified checkpoint on branch `implement/blackout-protocol-v0.2.0` → pull request to `main`. No deployment in this release.

## 10. Hosting limit (U-12): flagged, not solved here

Students currently reach MathQuest through GitHub Pages, with a Netlify relay for the API only. U-12 requires students to use a Netlify address.
- MathQuest's own Netlify frontend migration spec (13 Oct) is still waiting for approval.
- **This cartridge must not be used in class until that migration is done and verified.** Stage B builds and verifies the cartridge but does not deploy it.

## 11. Coordination and risks

- **Kingsgate** is also becoming a MathQuest cartridge and edits the same hard-coded lists and platform version. Whichever lands second rebases onto the first and takes the next platform version (0.10.2).
- **Brief header.** MathQuest's brief header is stale ("v0.9.4 baseline"). I will add a Blackout section but not rewrite unrelated sections.
- **Push access.** I will request push access to williammcada/mathquest when implementation starts. You will see an approval prompt.

## 12. Decisions for the owner

- **D1:** keep blackout-protocol canonical for the puzzle core, vendored into MathQuest *(recommended)*, or move everything into MathQuest?
- **D2:** add an optional tap hook to MathQuest's shared game host *(recommended)*, or build a Blackout-only host?
- **Platform version 0.10.1** for this addition: OK?

## 13. Not in scope

Math Arcade sync (Stage C); Netlify migration; deployment; changes to other cartridges' gameplay; multiplayer boards; new math.

---

## Implementation notes (MathQuest branch `implement/blackout-protocol-v0.2.0`)

Copied from williammcada/blackout-protocol (canonical spec). Deviations and details settled during implementation:

- **Practice entry.** Practice and owner DEV share one page, `blackout-preview.html`, with `?dev=action` for DEV. This follows BLACKLINE's established pattern instead of the separate `blackout-practice.html` the spec named. The DEV screen keeps the U-13 banner during play as well as on the setup panel.
- **Phones in portrait.** MathQuest's shared GameHost asks phones in portrait (up to 700 px wide) to rotate to landscape. Blackout follows that platform rule. iPads play in both orientations.
- **Guided route runs in GameHost's assisted overlay.** It is a tappable step-by-step board. Storm tiles and surge timers do not run during the guided route, and there is no clock pressure apart from the 300-second limit.
- **Extra shared-host change.** GameHost now hides the Map button for adapters that set `hideMap` (Blackout), as it already did for BLACKLINE.
- **Review bundles.** `scripts/build-review-bundles.mjs` accepts an optional name filter, so only the new Blackout bundle was built. Other cartridges' versioned review files are byte-identical.
- **Narrative-separation test.** The test now compares against `paragraphs` plus explicit `instructions`, the documented convention for new cartridges, and asserts that explicit instructions never enter the story.
