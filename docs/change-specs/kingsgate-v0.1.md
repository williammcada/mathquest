# Kingsgate cartridge v0.1 — MathQuest implementation notes

**Canonical specification:** [williammcada/kingsgate `docs/change-specs/kingsgate-v0.1.md`](https://github.com/williammcada/kingsgate/blob/main/docs/change-specs/kingsgate-v0.1.md), revision 2, approved by William McAda on 2026-10-13. This file records only how it lands in MathQuest.

**Baseline:** mathquest `main` `a4405f8` (MathQuest v0.10.0 on the Math Engine). Handbook `678b139` (v0.1.6).

## Added
- `public/games/kingsgate/`: config (approved tuning), deterministic simulation, renderer, Web Audio score, GameHost adapter, sprites generated from the approved art reference.
- `public/cartridges/kingsgate.js`: cartridge `kingsgate`, game `kingsgate-defense`, story scenes, three endings, route and insert epilogues, personal result text.
- `src/cartridges/kingsgate/validation.js`: server envelope checks (loadout effects, gold balance, bounty limits, gate health, wave progress, tower placement, outcomes).
- `public/assets/kingsgate/`: four polygon story scenes, room soundtrack and finale music.
- `public/kingsgate-dev.html`: owner DEV playtest (U-13), linked from Developer tools.
- Tests: `test/kingsgate-sim.test.mjs`, `test/kingsgate-cartridge.test.mjs`.

## Shared code touched
- `public/engine/game-host.js`: optional `adapter.pointer` for tap-to-act games (field coordinates 640×360), `adapter.noMap`, and hiding the empty thumb-control bar and Reset controls when a game has no held controls. Existing games are unaffected: none define these fields.
- Registries and cartridge lists in `public/cartridges.js`, `public/games/registry.js`, `public/app.js`, `public/expansion-ui.js`, `public/review-presentation.js`, `public/engine/teacher-tools.js`, `src/cartridges/registry.js`, `src/cartridges/nightfall/server.js`, `src/worker.js`; the catalog test now expects eight cartridges.

## Added beyond the canonical spec
- A guided defense (assisted route), because GameHost offers every cartridge game an assisted route. Recorded separately as `assisted_completed`, as in Blackline.

## Not in this change
- Math Arcade entry (separate Math-Arcade change, after this merges).
- MathQuest platform version number change; the cartridge revision is `kingsgate-cartridge-0.1.0`.
