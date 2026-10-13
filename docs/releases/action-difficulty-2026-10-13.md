# Action difficulty revision — verification record

Scope: `docs/change-specs/action-difficulty-2026-10-13.md`. Branch `implement/action-difficulty-2026-10-13`; implementation checkpoint `2d33b1b`, followed by visual-readability fixes found during verification (Blackline obstacle/strike sizing and draw order, obstacle HUD notice, larger Coastal fireballs). The verified candidate is the commit that adds this record. Environment: Linux, Node 22.22.0, esbuild 0.28.2 (0.25.12 pinned version unavailable offline), Chromium 1194 headless via Playwright.

| Check | Result | Evidence |
| --- | --- | --- |
| Unit/regression suite | Passed 258 / 268 | `npm-test.txt`. Ten files could not load `happy-dom` (npm registry unreachable from this environment); the same ten fail identically on the unchanged baseline `d840631`. |
| DOM runtime tests (held input, Blackline/Ironbreak runtime, etc.) | Not run | Need `happy-dom`; rerun with `npm test` on a machine with `npm ci`. |
| `npm run build` | Passed | Release validator: 25 modules, recursive syntax. |
| Coastal: 128 enemies, caps, timeline | Passed | Test asserts 128 combatants; full five-minute run with zero cap deferrals; worst-case populations measured (air 11, ground 5, hostile 31) under raised caps air 16 / ground 8. |
| Coastal: shells +25%, ships 3×, tougher boss still beatable | Passed | Tests check exact speeds/hulls; scripted baseline and upgraded aircraft both destroy the boss inside its 75-second section with all lives. |
| Coastal: supplies persist until off-screen | Passed | Test: a supply dropped at the top survives ~17 s and is removed only past the bottom edge. |
| Coastal: boss finale not geometric | Passed (visual) | `coastal.png`, `ironbreak-mortar-and-coastal-salvo.png`: burning breach, charge flare and heavy shells drawn from the painted explosion sheet. |
| Ironbreak: doubled route and robots, MID2 gate | Passed | 86 regular robots (24 before); boss trigger at x 10,160 (5,584 before); second guard blocks MID2 until defeated. |
| Ironbreak: faster shots, mortar | Passed | Tests: shells land within 24 px of each marked spot; scripted boss fight with mortar dodging succeeds in 30–45 s with all lives; live validator accepts the full boss fight. Visual: markers centred on the player. |
| Blackline: obstacles avoidable, strikes frequent | Passed | Binary-input driver finishes in 266 s with all three jumps, 0 obstacle hits, 64 strikes (v0.2.0: 33 bursts), 10 rams, 29 integrity left; server validator accepts every 5-second snapshot. |
| Blackline: five-step incoming shell, 3 s landing | Passed (visual) | `blackline-strike-five-frames.png` (frames at 0, 0.7, 1.3, 1.9, 2.5 s; zone from 1.2 s, locked brackets from 1.8 s). |
| DEV entries open new versions and play | Passed | Homepage DEV menu links to BLACKLINE v0.3.0, Ironbreak v0.2.0, Coastal flight v0.3.0; each started and accepted keyboard input with no page errors (`dev-entries-playing.png`). Story modes show painted art and a separate instructions panel. |
| Owner playtest of difficulty | Not run | Pending owner. |
| Physical iPhone/iPad (stuck input, zoom, native menus) | Not run | Shared held-input code unchanged. |
| Classroom Worker + frontend deployment | Not run | Requires the paired deployment described in the change spec. |

Review bundle hashes are in `review-hashes.txt`.
