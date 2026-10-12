# MathQuest 0.10.0-rc.3 — verification

**rc.3 (2026-10-12):** engine updated to Math Engine 0.34.0-rc.3 (MATH-ENGINE `10127fc`), which adds lesson names; the teacher picker now shows each course item's lesson and lists courses in teaching order. Rerun on rc.3: release validation passed; 260/270 node tests passed (same 10 `happy-dom` files not run); browser checks passed for fraction, number, remainder (2 runs), choice, typed text, Algebra 2 and time inputs; picker lists Intermediate 4 by lesson; no page errors. The rc.2 record below is retained for history.

## rc.2 record

**Candidate:** branch `review/mathquest-0.10.0-engine`, the commit that adds this file. **Engine:** 0.34.0-rc.2 (MATH-ENGINE `414dc38`). **Spec:** [v0.10.0-math-engine](../change-specs/v0.10.0-math-engine.md). **Date:** 2026-10-12 (Asia/Shanghai).
**Environment:** Linux, Node.js 22.22.0; headless Chromium 141 (Playwright) against `public/` served locally, with `/api/*` handled by the real `src/worker.js` and in-memory Durable Objects. No Cloudflare runtime, no hosted deployment, no physical device.

| Check | Result |
| --- | --- |
| `scripts/validate-release.mjs` (engine bundle hash = provenance; teacher catalog and server map agree; 25 retired modules mapped and titled; index version; assets; syntax) | Passed |
| Node test suite: 270 tests | 260 Passed; 10 Not run — see below |
| New `test/engine-integration.test.mjs`: K–Algebra 2 session, answers hidden from students, correct/incorrect submissions, every input type, simplest-form message, malformed entry not counted, retired-module rooms and pre-0.10 assignments, engine defaults, catalog/preview endpoints | Passed (7) |
| Rewritten math tests: all 25 retired modules × 4 difficulty policies × 25 seeds deterministic and self-checking; no generator code left in `src/`; Foundation/Challenge use engine links; MATH-FRAC-01 across all mapped items | Passed |
| Browser, teacher (1280 px): picker by level and search across K, Grade 3, 8/7, Algebra 2, extras; remove defaults; preview; create Vault 7 session; launch | Passed; no page errors |
| Browser, student (834 × 1112, touch): answered and advanced on fraction (Grade 3), number (K, 8/7), remainder `R` keypad (8/7, 3 runs), choice (extras), typed text (8/7), Algebra 2 `x; y` keypad, time `h:mm AM` | Passed; no page errors |
| Rendered page title shows version (`MathQuest 0.10.0-rc.2`) | Passed |

**Not run:** the 10 DOM-runtime test files (`runtime`, `migration-ui`, `held-input`, `blackline-runtime`, `false-haven-runtime`, `ironbreak-input`, `journey-input`, `nightfall-runtime`, `v093`, `v094-runtime`) need the `happy-dom` package, which could not be installed (package registry unreachable). They also could not run on the 0.9.7 baseline here. Their title expectations were updated for the new version. Also not run: `wrangler` Worker build/size check, Journey optional questions in a browser, Cloudflare/hosted check, iPad/iPhone physical devices, school network.

**Defects found during verification and fixed in this candidate:** the engine keypad used four columns, scrambling digit order; typed `a`/`p` did not enter AM/PM; the rendered title lacked the version (U-01).

**Before release:** run `npm install && npm test` on a machine with registry access (the 10 DOM files); `wrangler deploy --dry-run` to confirm Worker size; iPad check of the engine keypad and typed answers.
