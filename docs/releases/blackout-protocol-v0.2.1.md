# Blackout Protocol cartridge v0.2.1 (MathQuest 0.10.1) — verification record

**Date:** 2026-10-13 (Asia/Shanghai) · A WILLIAM MCADA PRODUCT
**Spec:** `docs/change-specs/blackout-protocol-v0.2.0.md` (approved; canonical copy in williammcada/blackout-protocol). Cartridge revision `blackout-protocol-0.2.1`; puzzle core 0.1.5 (`public/games/blackout/core.provenance.json`).
**Branch:** `implement/blackout-protocol-v0.2.0`.
- Implementation checkpoint v0.2.0: `ade93de`, superseded.
- Implementation checkpoint v0.2.1: `1435b15`.
- Candidate under test: `4bfffa6`. It differs from `1435b15` only in three test files (no product files).

Hashes of the key candidate files are in `blackout-protocol-v0.2.1-browser/candidate-hashes.txt`.

| Check | Result | Evidence |
| --- | --- | --- |
| Full test suite with `happy-dom` (all 333 tests, including the shared-input and DOM runtime tests for every cartridge) | **Passed 333/333** | GitHub Actions run `38403914429` on `4bfffa6` (workflow `tests`) |
| `npm run build` release validation (Math Engine provenance, syntax, cartridge assets, versions) | **Passed** | Same GitHub Actions run, and locally |
| Local run without `happy-dom` (the npm registry does not resolve from the development sandbox) | 279 passed; 10 DOM files could not load | `npm-test-local.txt`. The same files pass on GitHub. |
| Blackout cartridge tests (9): 3/4/5 gates, routes, endings, equipment slots, run issue, validator, guided route, outcomes, reconnect, reports, deletion, isolation | **Passed** | `test/blackout-cartridge.test.mjs`, also repeated 5× locally |
| Browser: a real classroom session (teacher plus two students) through every stage, on a local server with in-memory sessions; board on iPad landscape and phone landscape; portrait rotate prompt; teacher closure; final vote; epilogue | **Passed** | `blackout-protocol-v0.2.1-browser/browser-check.txt` (26/26) and screenshots |
| Server board re-check: 3 districts restored and accepted; blown fuse recorded | **Passed** | browser-check, cartridge tests |
| Shared-host change (tap hook, letterbox tap mapping, opt-in latched presses): BLACKLINE, False Haven and Nightfall practice still start and run | **Passed** | browser-check; full suite on GitHub |
| U-10 on the canvas: touch-action none; native context menu suppressed and the run pauses safely | **Passed** (emulation) | browser-check |
| U-11: Story and Student instructions are separate at every stage and gate count | **Passed** | `test/narrative-separation.test.mjs`; `preview-briefing.png` |
| U-13 DEV: banner and version, all power-ups, five starting districts, banner during play, offline review bundle | **Passed** | browser-check; `dev-setup.png`, `dev-substation-surge.png` |
| U-14: questions only from the Math Engine; cartridge has no generator | **Passed** | the cartridge declares gates only; Math Engine provenance validated |
| U-15: story art polygon SVG by Claude, recorded as the owner-approved exception | **Passed** | `public/assets/blackout/*.svg`, brief |
| Physical iPad/iPhone (stuck input, native menus, viewport stability) | **Not run** | Owner device check |
| School network; classroom concurrency | **Not run** | Needs deployment |
| Hosted frontend and Worker deployment | **Not run, by design** | See below |

## Not deployed, and why it must not merge on its own

- **Merging would deploy half the change.** The `main` branch publishes the GitHub Pages frontend. Merging this branch would ship the 0.10.1 frontend without the matching Worker, and session creation would be refused until the Worker is deployed. So the frontend and the Worker (`npx wrangler deploy`) must ship together, as the Ironbreak precedent requires.
- **Students' address (U-12).** The student address is still GitHub Pages. Classroom use waits for MathQuest's Netlify frontend migration, whose spec is still awaiting approval.
- **Kingsgate.** Branch `implement/kingsgate-v0.1` is a MathQuest **0.11.0** candidate that edits the same cartridge lists. Whichever merges second must rebase and take the next platform version.
