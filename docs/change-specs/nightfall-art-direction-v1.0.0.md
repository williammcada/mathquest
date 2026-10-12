# Nightfall Art Direction v1.0.0 — sprites, readable obstacles and furnished locations

**Stage:** CHANGE SPEC. Owner-approved decisions recorded 12 October 2026 (Asia/Shanghai). No implementation, art production or verification is claimed by this document.

**Covers all three Nightfall games:**

| Game | Entry | Source | Current identity |
|---|---|---|---|
| First Response (early rescue inside Last Bus Out) | `practice-nightfall.html` chapter "rescue"; classroom phase `early-rescue` | `rescue-world.js`, `rescue.js`, `rescue-host.js` | `RESCUE_REVISION` `nightfall-rescue-1` |
| Last Bus Out (city finale) | `practice-nightfall.html`; classroom Nightfall cartridge | `world.js`, `simulation.js`, `adapter.js` | `CONFIG_REVISION` |
| False Haven (Chapter 2) | `practice-false-haven.html`, `false-haven-preview.html`; cartridge `nightfall-false-haven` | `false-haven-world.js`, `false-haven-adapter.js`, `false-haven-renderer.js` | v0.3.0, `HAVEN_REVISION` `false-haven-0.1.0` |

Shared renderer: `public/games/nightfall/renderer.js` and `hardware.js`.

## 1. Baseline and sources consulted

- Canonical repository `williammcada/mathquest`, main `cd35fd912fbde2007f8fade6b93b1c2a1421275c` (newest branch; `release/six-cartridges-v0.9.7` has identical Nightfall files).
- `williammcada/Math-Arcade` `361fe63` vendors the same commit; it receives this work only by a sync after the verified release.
- Project: `docs/PROJECT-BRIEF.md`, `docs/change-specs/nightfall-chapter-2-v0.1.0.md`, `docs/change-specs/false-haven-v0.3.0.md`, `docs/change-specs/v0.9.4.md` (First Response), `docs/NIGHTFALL_ASSET_PROVENANCE.md`.
- Handbook `williammcada/mcada-project-handbook` `fd4330863f4cc0812180fbf1de122970a42c7885`: AI-START-HERE, UNIVERSAL-RULES (U-01, U-05, U-06, U-07, U-08, U-10, U-11), CONDITIONAL-STANDARDS S-03/S-04, PROJECT-MAP, DECISIONS-AND-CHANGES.
- Companion art specification: [`docs/art/NIGHTFALL-SPRITE-BRIEF-v1.md`](../art/NIGHTFALL-SPRITE-BRIEF-v1.md).

## 2. Owner decisions (12 October 2026)

| # | Decision |
|---|---|
| D1 | Predesigned sprites replace code-drawn world objects. Recorded as Nightfall franchise standard **NF-ART-01** in the project brief, not as a handbook universal rule (handbook lists "a single art style" as not automatically universal; U-08). |
| D2 | New art is AI-generated atlases matching the existing Nightfall pipeline. Claude supplies the sprite brief; the owner generates images in an image-capable session and commits them. |
| D3 | False Haven's two movable barricades are removed. This overrides the "two selectable barricades" item in `nightfall-chapter-2-v0.1.0.md` §4. |
| D4 | The inspection-lane speaker trap is retained unchanged in behavior, with distinct broadcast-tower and gate sprites. |
| D5 | Buildings receive painted roofs outside, floor decals inside, and wall-hugging furniture with collision, guarded by an automated reachability test. No mid-room cover furniture. |
| D6 | First Response gets the full treatment: city blocks become rooftops; the clinic and depot get real interiors. |
| D7 | One combined Nightfall art release for all three games. |

## 3. Problems this revision fixes (observed in baseline source)

1. **Code-drawn world objects** in `false-haven-renderer.js` and `hardware.js`: flooded passage (translucent rectangle), broadcast speaker / inspection gate / barricade switches (28 px squares with text), cargo trolley and track (boxes and dashed outline), fuel barrels (gradient shape with "GAS" text), windows (blue rectangles labeled "GLASS"/"EXIT"), First Response clinic/depot dressing (filled rectangles).
2. **Wrong tile for Chapter 1 gates.** Walls flagged `gate` draw city tile #12, which in the Chapter 1 atlas is burning embers. The locked store and unpowered garage doors therefore render as fire.
3. **Low-contrast fences in False Haven.** Every fence draws the chain-link tile at 16 px over dark gravel and nearly disappears.
4. **Pointless barricades.** Each toggles between two positions 128 px apart in open yard; neither seals a route (barricade A leaves a 96 px gap to the supply building and open yard to the east; barricade B is likewise unanchored).
5. **Chapter 1 ground pattern reused in False Haven.** Road tile #1 is stamped on a 256 px grid and tile #8 on column x=1184, producing scattered yellow road dashes and a dead-end white-line road across the compound.
6. **Empty locations.** `drawInteriors` returns immediately for False Haven, so Shelter 04, Abandoned Canteen, Intake/Medical, Supply/Shotgun and Evacuation Control are bare floors. Chapter 1 rooms have at most two decorative props. From outside every building is a translucent dark box with a text name.
7. **First Response city blocks** are six solid barrier rectangles drawn with the brick wall tile at 16 px.
8. **Unused existing art:** False Haven water tile #15, props #4 (jersey barrier), #9 (hospital bed), #14 (drum).

## 4. Requirements

### 4.1 NF-ART-01 conformance (all three games)

Every world object listed in §3.1 and every new structure, prop, interactable and state change is drawn from a predesigned sprite cell. Code drawing remains allowed only for: HUD and prompts, minimap, debug overlay, objective marker, aim line, bullets, rain, lighting/vignette, short-lived effects (muzzle flash, fire glow, alarm pulse, interaction progress), and text rendered onto sprite-backed signs for legibility (U-05).

| Object | Replacement |
|---|---|
| Windows (all games) | Interactables sheet: intact / shattered |
| Chapter 1 locked store and garage gates | Interactables sheet: security gate closed; the open state is the existing door gap |
| False Haven fixed fences | Interactables sheet: chain-link fence H/V, drawn at full contrast with a posted frame; never the ground tile |
| Inspection-lane gate | Interactables sheet: heavy barred gate closed/open, visually distinct from ordinary fences |
| Broadcast speaker | Interactables sheet: speaker tower idle/active |
| Fuel barrels (all games) | Interactables sheet: hazard drum; warning ring and fire stay as effects |
| Cargo trolley and track | Interactables sheet: trolley; rail segments |
| Flooded passage | Existing False Haven water tile #15 masked to the passage, with a drain-level sprite edge; drains downward as now |
| Generator, pump, power selector, service shortcut, depot shutter, vehicle barrier, evacuation gate booth panel | False Haven machinery sheet, each with before/after state where the task changes it |
| Location names | Sign-board sprite with game-rendered text, mounted at the building's door side |
| First Response clinic/depot dressing | Furniture and decal sheets |

Collision rectangles for every existing object stay exactly as they are; sprites are drawn to fit the existing bounds. Only §4.4 furniture adds collision.

### 4.2 Ground and wall fixes

- False Haven ground uses its own layout: plain yard gravel by default, a defined road loop (arrival → utility yard → depot → vehicle exit) using road tiles, mud (#14) and grating (#7) where authored. Remove the 256 px grid stamping and the x=1184 column for this scenario only. Chapter 1 ground is unchanged except where §4.5 places roofs.
- Gate walls use the gate sprite in both games; city tile #12 is no longer used for gates.

### 4.3 Remove False Haven barricades (D3)

Remove from source: `barricadeA`/`barricadeB` in `havenEnvironment`, `havenBarriers`, `HAVEN_SWITCHES`, `havenSwitch`, the collision cache key in `world.js`, restoration in `false-haven-adapter.js`, and Worker validation in `src/cartridges/false-haven/validation.js`.

Retain unchanged: inspection-lane trap and speaker behavior, timing, cooldown, sound radius, occupied-gate refusal, fences, puzzles, objective order, enemy roster and placement, pickups, timers, mathematics and endings.

Update player-facing instruction text in `public/cartridges/false-haven.js` line 34 ("Doors, barricades, alarms and the inspection speaker can buy you time.") to drop barricades. Narrative references to the shelter's barricades (story block, line 23) are in-world description and remain.

Saved-run compatibility: bump `HAVEN_REVISION` to `false-haven-0.4.0`. An in-progress run saved under 0.1.0 shows the existing clear restart path; it is never silently restored with removed state. Ended runs and academic records are untouched.

### 4.4 Interiors: roofs, decals and wall furniture (D5)

**Roofs (no collision).** Replace the translucent dark rectangle drawn over buildings with a roof composed from the roof sheet (nine-slice material plus parapet edges and corners, plus rooftop clutter such as HVAC units, vents, skylights and water tanks). The roof fades out over about 0.25 s when the player enters and back in on exit (instant under reduced motion). The sign board and door marker remain visible.

**Floor decals (no collision).** Rugs, floor markings, papers, tarps, puddles, flattened boxes and similar from the decal sheet. Decals never cover task, pickup, switch or window highlight positions.

**Wall furniture (collision).** Furniture rectangles are added as static solids in each world module (`INTERIORS` data beside `BUILDINGS`) and enter `collisionGeometry`. Placement rules:

- Flush against an interior wall, at most 48 px deep.
- Keep-out zones, none of which furniture may intersect:
  - door approach: the 80 px door width × 112 px inward;
  - each window: 80 px span × 64 px inward;
  - each task, switch and pickup: 48 px radius;
  - the survivor/recruit position: 64 px radius.
- Minimum clear corridor between any two solids inside a room: 48 px (actor radius 10, nav probe 8, with room for an enemy and the player to pass).
- No furniture in rooms whose doors/windows are enemy breach targets if it would sit between the breach point and the room interior.

**Room dressing plan** (exact coordinates are set during implementation and fixed by the reachability test):

| Game | Room | Furniture (wall-hugging) | Decals |
|---|---|---|---|
| Last Bus Out | Maintenance | workbench, tool rack, existing desk, filing cabinet | oil stain, hazard stripes |
| Last Bus Out | Dispatch | radio console, map board, existing desk, lockers | papers, rug |
| Last Bus Out | Sporting Goods | shelving ×2, counter, existing ammo display | scattered stock |
| Last Bus Out | Parking Garage | battery rack, tool rack | painted bay lines, oil stain |
| Last Bus Out | Substation | existing electrical cabinets, cable drum | hazard stripes, grating |
| First Response | Imani's Clinic | hospital bed (existing #9), medical screen, supply shelving, medkit cabinet | floor tiles cross marking, blankets |
| First Response | Depot Garage | workbench, tool rack, crates (existing #6) | oil stain, bay lines |
| False Haven | Shelter 04 | cots ×4–6 along walls, lockers | blankets, rug, flattened boxes |
| False Haven | Abandoned Canteen | serving counter, canteen tables against walls, vending machine | spilled trays, puddle |
| False Haven | Intake / Medical | hospital bed (#9), medical screen, intake desk, medkit cabinet | papers, floor markings |
| False Haven | Supply / Shotgun | shelving ×2, crates (#6), ammo case (#10) | tarp, flattened boxes |
| False Haven | Evacuation Control | radio console, existing desk (#5), electrical panel (#7), map board | evacuation-arrow marking, papers |

First Response city blocks (`BARRIERS`) render as roofs with parapets and rooftop clutter instead of 16 px brick tiles. Their collision is unchanged.

### 4.5 Reachability and collision safety test

Add `test/nightfall-reachability.test.mjs`, run for First Response (both routes), Last Bus Out, and False Haven, in each topology state the game can reach (doors open/closed, store gate, garage before/after power, passage flooded/drained, shortcut, shutter, vehicle barrier, trolley start/end, trap gate open/closed, windows intact/broken):

- Flood-fill at 8 px steps using `solidInGeometry` with the player radius from the start point.
- Assert reachable: every door threshold, task point, switch, pickup, window (both sides once broken), bus/terminal zone and finale route.
- Assert every enemy spawn and home point is non-solid and connected to the player's region (or deliberately inside the inspection lane).
- Assert no furniture intersects any §4.4 keep-out zone and no corridor is narrower than 48 px.
- Assert reachable floor area per game is at least 97% of the baseline value measured on `cd35fd9` before furniture (decals and roofs do not count).

### 4.6 Server parity and deployment

The Worker imports `world.js`, `rescue.js`/`rescue-world.js` and `false-haven-world.js` for validation. Collision furniture and barricade removal therefore change server-validated geometry.

- Bump `CONFIG_REVISION` and `RESCUE_REVISION` alongside `HAVEN_REVISION`.
- Ship frontend and Worker together.
- The classroom cartridge is not considered updated until the matching Worker is deployed and verified (S-04).
- Pages-only practice and preview builds may be published first; classroom launch against an older Worker must fail with the existing revision mismatch message rather than desynchronize.

## 5. Versioning (U-01)

- Platform: MathQuest **v0.9.8**. All `?v=` module query strings and every modified HTML file move to v0.9.8.
- False Haven: **v0.4.0**. Update the visible title in `false-haven-adapter.js` and `practice-false-haven.html`.
- Chapter 1 (Last Bus Out and First Response): gains a visible version, **Nightfall v1.1.0**, shown in the practice page title and the game's start panel; their titles currently show none.
- Release name: "Nightfall Art Direction v1.0.0".

## 6. Must retain (U-06)

- Camera scale and actor size.
- The existing painted cinematic illustrations, actor and weapon sprites, and audio.
- Map dimensions and all collision except §4.3 removals and §4.4 furniture.
- Enemy types, counts, placements and AI.
- Threat presets, timers (300 s windows), pause behavior, objective order, interaction durations.
- Equipment earning and the inspection-lane trap.
- Academic records, story separation (U-11) and shared held-input handling (U-10).
- Performance optimizations from False Haven v0.3.0. Ground chunks remain cached; roofs, decals and furniture are drawn from cached or static layers, with no per-frame atlas rebuilding.

## 7. Workflow and verification

DESIGN ✓ → **CHANGE SPEC (this document)** → ART PRODUCTION (owner, per sprite brief) → IMPLEMENT → CHECKPOINT → VERIFY → VERIFIED CHECKPOINT → RELEASE → DEPLOY.

Implementation starts only after the sheets in the sprite brief are committed and pass the brief's acceptance checks.

**Required verification** (record Passed / Failed / Not run / Not applicable):

1. Full repository test suite and `npm run build` release validation.
2. The new reachability test (§4.5) across all games and states.
3. Updated barricade tests in `test/false-haven-performance.test.mjs` and validation tests.
4. Rendered review frames for every changed object and room in all three games, using the existing `@napi-rs/canvas` review scripts, inspected by eye.
5. Real-time Chromium play of each game: start, movement through every door and window, every task, trap gate, trolley, drainage, finale, pause/resume, reload.
6. Performance comparison against the v0.3.0 False Haven profile in the same environment.
7. Hosted Pages file and visible-version check.
8. Worker deployment and classroom revision handshake (S-04).
9. Owner Windows Chrome replay and physical iPad/iPhone checks (U-05/U-10). These remain Not run until performed.

After the verified release, sync Math Arcade from the verified commit and verify its hosted Nightfall pages separately.

## 8. Out of scope

New enemies, weapons, mechanics, map expansion, story changes, mathematics changes, cinematic illustration changes, mid-room cover furniture, and other MathQuest cartridges (NF-ART-01 is Nightfall-only).
