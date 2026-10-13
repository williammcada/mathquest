# Action difficulty revision — Coastal Escape, Ironbreak, Blackline

**Stage:** CHANGE SPEC → IMPLEMENT, 13 October 2026 (Asia/Shanghai). Owner request in chat; implemented on branch `implement/action-difficulty-2026-10-13`. Not deployed.
**Owner:** William McAda · A WILLIAM MCADA PRODUCT
**Source baseline:** `main` at `d84063179efd8e04875e634e07866c9ff848e490` (platform 0.9.7).
**Handbook consulted:** `williammcada/mcada-project-handbook` at `445557c` — AI-START-HERE `6557a45`, UNIVERSAL-RULES `b79ed26` (U-01, U-06, U-07, U-10, U-11), CONDITIONAL-STANDARDS `1a79498` (S-03, S-03-A, S-04), RELEASE-CHECKLIST `21d07be`. Repository `AGENTS.md` and `docs/PROJECT-BRIEF.md` read.

## Owner request (verbatim intent)

- **Coastal Escape:** enemy count +100% ("too slow, easy, and boring"); enemy projectile speed +25%; battleships 200% stronger; power-ups persist until they leave the screen; the final boss's final attack must not be geometrically drawn; boss harder (the sentence was cut off: "If boss is harder more").
- **Ironbreak:** enemy count +100% and level length +100% ("I can finish the game in 90 seconds"); boss projectiles faster; a new aerial mortar boss attack.
- **Blackline:** a few road obstacles to avoid; the targeting hit zone occurs more often and is preceded by an animated aerial projectile that appears at the horizon, approaches in five animation steps and lands after three seconds.

## Decisions and interpretations

| Item | Implementation |
| --- | --- |
| Coastal enemy count | Every combat formation now arrives four times (original, mirror +3 s, original +6 s, mirror +9 s): 128 regular enemies instead of 64. Same five-minute timeline, checkpoints and boss timing. |
| Coastal projectiles | All enemy and boss shell speeds × 1.25 (65/85/100 → 81.25/106.25/125 units/s). |
| Coastal battleships | `ship` hull 80 → 240 (three times as durable). Shore batteries unchanged. |
| Coastal power-ups | Dropped pickups no longer time out; they drift until they leave the bottom of the screen. |
| Coastal boss finale | Core-phase visuals use the existing painted explosion sprite sheet: a burning breach replaces the drawn rectangles, a growing muzzle flare replaces the warning ring, and heavy shells are sprite fireballs. Gun health bars stay as HUD. |
| Coastal boss difficulty | Interpreted from the truncated sentence: wing guns 240 → 320, core 600 → 800, core salvo every 2.4 s instead of 2.8 s. Flagged for owner confirmation. |
| Ironbreak length | A second loop of the Coolant Works → Transfer Lock → Foundry → Security Approach sections is inserted before the boss chamber. Distance to the boss arena 5,552 → 10,128 px; a new MID2 checkpoint sits in the second Transfer Lock, guarded by a second heavy robot. |
| Ironbreak enemies | Interpreted as twice the enemy density: every non-mandatory robot gains a twin on the same platform or water lane. 24 → 86 regular robots across the doubled level. |
| Ironbreak boss | Shot speeds +30%; new "MORTAR BARRAGE" attack lobs three shells onto marked landing spots around the player; rotation is high volley → floor sweep → mortar → overhead strike. |
| Blackline obstacles | 14 authored road obstacles (barricades and crates) away from ramps and repair kits; striking one costs 12 integrity and speed. Pursuers steer around them. |
| Blackline strikes | Interceptor bursts become aerial strikes: a shell appears at the horizon, grows through five frames over 3.0 s, the hit zone appears at 1.2 s, locks at 1.8 s and the shell lands at 3.0 s. Interceptors strike about twice as often, and a background artillery battery adds strikes when no pursuer is attacking. |

## Retained

Three lives / one life, checkpoints, upgrades, academic and narrative rules, story artwork, music, held-input implementation (U-10), U-11 story/instruction separation, saved-work deletion, all other cartridges.

## Conflicts and risks

1. **Ironbreak 300-second window (S-03-A).** The window is unchanged. A level that a skilled player cleared in 90 s now needs roughly 3–4 minutes; slower students may reach "time window closed". Owner to confirm after play.
2. **Classroom Worker coupling.** Ironbreak and Blackline runs are validated by the Worker, and Coastal flights are replayed there. These changes need a frontend and Worker deployed together; publishing only the frontend would break classroom runs. No deployment in this stage.
3. **Review bundles.** DEV "Play action" links open self-contained review files. New versioned files replace the links (Blackline v0.3.0, Ironbreak v0.2.0); the old files stay as history.

## Versions (U-01)

Coastal flight 0.2.0 → 0.3.0 (level `coast/3`, tuning `standard/3`); Ironbreak 0.1.0 → 0.2.0 (shooter `shooter-0.2.0`, map `industrial-level-loop-0.3`); Blackline racer 0.2.0 → 0.3.0. Platform remains 0.9.7 until the release stage.

## Verification required

Unit/regression tests; deterministic headless runs (bounded populations, boss completion within limits, strike/obstacle avoidability); Chromium rendering of each game's new elements; DEV links open the new versions. Physical iOS checks remain Not run.

## Addendum — U-13 DEV playtest mode (13 Oct 2026)

Owner approved handbook U-13 (handbook commit `0304be1`). Applied here: shared `public/engine/dev-playtest.js` panel (banner "DEV PLAYTEST · [Game] v[version] · no questions, no records", every power-up selectable, starting point selectable, Start; return to setup). Blackline v0.3.1 (sections), Ironbreak v0.2.1 (START/MID/MID2/BOSS), Coastal Escape flight v0.3.1 (take-off/midpoint/boss). Display versions advance per U-01 because the playtest files changed; data contracts (`blackline-racer-0.3.0`, `ironbreak-0.2.0`, aerial `0.3.0` config) are unchanged. Vault Seven, Nightfall and False Haven are not yet migrated.
