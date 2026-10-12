# Project Brief — MathQuest

**Brief version:** 0.8 — Journey Thursday play-test resources
**Owner:** William McAda · **Credit:** A WILLIAM MCADA PRODUCT  
**Status:** v0.9.4 remains this branch's host baseline. Journey's stage-5 authored combat work is isolated on `implement/journey-encounters-stage5`; no merge or deployment. Historical release observations below retain their original dates.
**Repository:** `williammcada/Math-Quest---Vault-7-`; host source on `main`, Journey development on `implement/journey-encounters-stage5`.
**Current source baseline:** Journey remote `f93b9f6a15ead3a13b0c88f309d6ffc6f2f81716`; stage-5 local test candidate `e120c62`. Canonical frontend `public/`, session engine `src/`. This isolated candidate has not been reconciled with newer main or deployed. Earlier source and release observations below are historical.
**Source/baseline:** v0.9.0 baseline commit `601184761b8247999b731a9720261788c79f3c66`; recovered v0.9.1 implementation checkpoint `576b711c10b28b6d8491495c90f37c42bb57c8d9`; canonical v0.9.1 source directory `public/`; deployment repair commit `66a0f59c17309398084bdfb831cc02a9eebeb75d`.  
**Next work:** Thursday solo practice and human feedback; current-main reconciliation before multiplayer deployment; live Cloudflare/physical-device/school verification. Stage-8 source now includes enemy/environment art, timed specials, procedural audio, original story and offline solo packaging. Historical baseline/status paragraphs above remain provenance, not current completion claims. Latest progress is section 21.

## 1. Purpose, audience and detailed scope

- Reusable teacher-led classroom engine with discrete cartridges, initially Vault Seven and Nightfall: Last Bus Out. Teacher Windows PC; approximately 23 student landscape iPads. Mathematics is the primary activity, narrative second, short individual minigame reward third.
- Teacher selects academic modules, question counts, difficulty and teams; retain custom question-bank import and math-native answer controls. Every student contributes mathematical evidence. Allocate selected topics across gates; mixed modules per gate are allowed.
- Retain teacher dashboard, launch/briefing flow, QR/join, voting and Event Lead, resources/market, hints, end-session reports, diagnostic export, pause/reconnect/recovery and supported question extensions. Academic accuracy and action-game success must remain separate.
- Vault Seven combines infiltration narrative, gates, resource decisions, cipher-piece assembly and final choice/epilogue. Prior requested ending thresholds were <50%, <80%, and >=80%; reconcile their current scope against source before editing. Preserve variable cipher solutions rather than a fixed predictable word.
- v0.9.1 accepted changes include clearer objectives, removal of Maintenance Map, Scanner as cipher insurance, one-use five-second Cloak; Nightfall collision/interactions, alarms, GAS barrels, breakable windows, key-collection-triggered horde, fire half damage to player/lethal damage to mobs with animation/warnings. The consolidated specification controls exact implementation.
- One meaningful live action run per student where specified. Do not silently add retries or classroom multiplayer combat. Keep cartridge-specific mechanics, assets and outcomes distinct.
- Pilot privacy target: generated aliases, no identifying metadata, 48-hour retention in the consolidated target, teacher deletion and credential expiration; verify exact rules against v0.9.1 spec. No GradePal connection, learner accounts, telemetry or new recurring paid dependency.
- Preserve existing GitHub Pages frontend and relay/service architecture. School teacher/student Wi-Fi differ; prior Netlify success does not establish current end-to-end connectivity. Do not replace service infrastructure or rename repository during stabilization.
- Future cartridge roadmap: Temple runner, Starfall Express vehicle shooter, Blackout Protocol circuit puzzle, Lost Observatory precision platformer. Roadmap is not current release scope.

## 2. This task and boundaries

Current revision follows [v0.9.4](change-specs/v0.9.4.md). New v0.9.4 Nightfall rooms insert First Response after the first vote and before Gate 2. The one-live-action-run wording is superseded only for this chapter: unlimited validated downed retries share one authoritative five-minute window. Teacher whole-session pause freezes it once; local pause, delayed Start, disconnect and retry do not extend it. All personal records resolved or expiry/teacher closure opens shared Gate 2 without completing any mathematics.

Route chooses Imani’s clinic or Tomas’s Depot Garage. Twenty authored zombies (5/10/5), one gas hazard, one alarm, pistol with 15 rounds, no earned gear, one +1-health and one +10-round pickup. Initial 3-health baseline, two coherent retry checkpoints, broader noncombatant immunity, locked door/two windows and fixed narrative closure bridge are selected candidate tuning from the draft. Actual escort success and unstarted/time/teacher closure remain separate engagement evidence. No early inventory, retry or outcome leaks into the later city run.

Retain U-04 fraction validation, academic evidence, equipment slots, Vault 7, v0.9.3 neutral branding/alarm indicators and existing hosting/storage/privacy. Old v0.9.2 saved rooms retain their original sequence and credentials. New feature tests require fresh v0.9.4 rooms. Backend deployment is required; no live deployment or address rename is implied by a source candidate. Teacher extensions skip live rescue teams and resume at academic stages.

## 3. Standards and adoption

[Canonical handbook](https://github.com/williammcada/mcada-project-handbook). File blob revisions consulted: AI-START-HERE.md `6557a45aaa6d29d7d1abde808e6d0ac248b08820`; UNIVERSAL-RULES.md `aed6fe311aa2e88983f862a30a2d8f05d2ffc04d`; CONDITIONAL-STANDARDS.md `dad2d3a05ca0f18260196ea51ac6351bffffdc1c`; PROJECT-TEMPLATE.md `574f4c6fcf19ecc2f9e27582fd856fb08123e8da`; RELEASE-CHECKLIST.md `4f18c51998e7188ac5b4b4243bd2695056fb6ace`. These are file blobs, not repository commit SHAs.

Relevant rules: U-01 identity, U-02 help, U-03 input validation, U-04 unambiguous math/text where applicable, U-05 reader/device, U-06 preservation, U-07 verification, U-08 local scope. Conditional selection: S-02, S-03, S-04.  
Baseline adoption: selected for this documentation and deployment-reconciliation task within existing user instructions. Handbook still labels shared scope/modules seeded/draft; no new global rule ratification is inferred. Project-specific approved decisions control their own scope.

## 4. Must-retain behavior

The detailed scope above is the feature-preservation inventory. Preserve existing settings, data, accepted content, assets, exports and compatibility confirmed in source. Distinguish implemented behavior, accepted pending changes and historical requests during intake. A missing entry in this brief is not authorization to remove working behavior. Preserve valid user work during migrations and failures.

## 5. Source, release and deployment discipline

The canonical v0.9.0 baseline is commit `601184761b8247999b731a9720261788c79f3c66`. The recovered v0.9.1 implementation checkpoint is commit `576b711c10b28b6d8491495c90f37c42bb57c8d9`; its canonical source is the existing `public/` tree. The root deployment repair is commit `66a0f59c17309398084bdfb831cc02a9eebeb75d`. It redirects the standard Pages URL to `public/` and preserves session/query parameters and URL fragments.

The hosted candidate identified itself as v0.9.1 on 18 September 2026. Its shipped JavaScript and CSS entry assets also declared v0.9.1, and the hosted connection diagnostic passed against session-server v0.9.1 with 25 modules and two-way access. This establishes a reachable hosted candidate and basic service connectivity; it does not establish the full teacher/student flow, reconnect behavior, privacy expiration, reporting, Safari/iPad compatibility, or classroom-scale reliability.

DESIGN → CHANGE SPEC → IMPLEMENT → CHECKPOINT → VERIFY → VERIFIED CHECKPOINT → RELEASE → DEPLOY.

Use “implementation checkpoint,” “hosted candidate,” or “release candidate” before verification. Preserve candidate bytes and logs before packaging; recover that checkpoint after a ZIP/upload failure. Do not rebuild a verified implementation to fix delivery. Repository upload and website deployment are different operations; existing automatic deployments may run when `main` changes.

## 6. Known issues, conflicts and open evidence

Historical defects include blurred text/exponents, launch/empty-team behavior and mobile controls. Their current resolved status still requires exact-source checks. The live version and connection diagnostic have now been verified; the complete teacher/student path, two-device reconnect checks, Safari behavior, deletion/expiration, reporting, approximately 23-device school trial, and school-network behavior remain unverified.

| Conflict or risk | Required handling |
| --- | --- |
| Historical claim versus current source | Inspect exact source; keep historical claim labeled until verified. |
| Proposed next scope versus working baseline | Use the approved version-specific specification; do not silently promote proposals. |
| Other project rules | Do not import AAC quotas, other-game retry counts, or a shared backend without explicit scope. |
| Handbook proposals | No additional exception or proposal is adopted by this brief. |

## 7. Verification contract

Run teacher + students through both cartridges; disconnect/rejoin at gates and action stages; verify one-run enforcement, answers, reports and privacy expiry; record hosted URLs/commit and actual 23-iPad results.

| Evidence required | Result as of 18 September 2026 |
| --- | --- |
| Exact source candidate/commit identified and preserved | Passed — `public/` at recovered checkpoint `576b711c10b28b6d8491495c90f37c42bb57c8d9`; root deployment repair `66a0f59c17309398084bdfb831cc02a9eebeb75d` |
| Hosted root version and entry assets | Passed — root redirected with query and fragment preserved; page and shipped entry assets identified v0.9.1 |
| Hosted connection diagnostic | Passed — session-server v0.9.1, 25 modules, two-way access |
| Previously reported automated suite | Not rerun — 112 passes are historical context only; durable logs have not yet been preserved in the repository |
| Complete teacher/student flow, both cartridges, reconnect, reports and privacy expiry | Not run |
| Save/import/export and malformed-input regression | Not run |
| Intended iPads, Safari, school network and approximately 23-device concurrency | Not run |
| Version, release notes and delivered bytes agree for a verified release | Partial — hosted candidate/specification identity is reconciled; verified-release gate remains open |

The next verification report must name the candidate, environment and actual results. Historical reports of passing tests do not transfer to a changed candidate.

## 8. Handoff and provenance

The indispensable `MathQuest_v0.9_Technical_Specification` and `MathQuest_v0.9.1_Technical_Specification` are preserved as repository-readable Markdown in `docs/specifications/`, with a manifest describing their source documents and checksums. The approved v0.9.1 change specification remains at `docs/change-specs/v0.9.1.md`, and exact source/deployment identity is recorded in `docs/MIGRATION-BASELINE.md`.

Remaining retrieval targets are the original automated-test logs and any other durable evidence associated with the recovered v0.9.1 checkpoint. The exact hosted app, version markers, entry assets, query/fragment redirect behavior and connection diagnostic were inspected directly during this reconciliation. No full room/session or real-device test was performed.

Before substantive implementation, read this brief, the migration baseline, the current source, approved change specification, applicable technical specification and applicable handbook. If an indispensable record is inaccessible, report the gap instead of filling it with invented details. Do not delete unique historical chats/assets until their contents are independently preserved.

## 9. Ecosystem boundary

Shared principles do not establish shared code, accounts or interfaces. MathQuest is engagement, TestForge assessment design, GradePal learner-level evidence, and DataDiver institutional analytics. Integration remains separately specified unless confirmed in source. Other projects remain independent unless their brief explicitly says otherwise.

## 10. v0.9.2 implementation intake — 22 September 2026

Owner authorized implementation of [Consolidated Draft 5](change-specs/v0.9.2.md). This supersedes the earlier Nightfall key ambush, optional clinic encounter, market acquisition and device scope as detailed in §3 of that specification. Its historical no-write statements describe preparation of the supplied draft, not this implementation authorization. Proposals and the future Vault redesign backlog remain distinct from approved requirements.

Source starts at `d081997e363255389dff8ca0e891c975ca2c2a1b`. Handbook re-read at `6de4cbf33c3b9860125c412359fb64ef3d0b20d1`: AI-START-HERE.md, UNIVERSAL-RULES.md, CONDITIONAL-STANDARDS.md S-02–S-04, RELEASE-CHECKLIST.md. No handbook amendment.

The GitHub history omitted the backend, tests and build tools. Recovered these from MathQuest_v0.9.1_GitHub.zip (SHA-256 `3b5aa3c1b3e7f1d7c8222424b635af9ae63bc7130fb8f99f251b777d7f5afa48`). Its public files are byte-identical to GitHub public/ except the missing zero-byte public/.nojekyll marker. Recovered server identity is source provenance, not proof of the exact currently deployed Worker bytes. Preserve the existing Worker and Netlify relay architecture.

Owner evidence: 22 connected iPads with working mathematics/synchronization; seven intentionally sampled action starts, not 15 failed launches. Extend activity received a positive owner smoke test. These are v0.9.1 observations, not candidate verification. Purchased Cloak and Silent Toolkit missing-item reports remain release blockers pending end-to-end audit of all six equipment resources.

Required v0.9.2 changes: one base equipment slot plus one per completed optional block, up to three distinct team items; raw-form simplest-fraction validation (MATH-FRAC-01) with explicit representation exceptions; Nightfall encounters/audio/presentation; iPhone Safari owner-review support for both cartridges. Retain Vault Seven 180-second active maximum and 300-second authoritative team window; unattended clients cannot stall the team.

Windows and landscape classroom iPads remain targets. iPhone Safari action layout targets landscape with portrait setup/help and a rotate prompt. Real iPhone model/iOS/Safari version and smallest supported physical device are pending real-device verification. A candidate is not verified iPhone or classroom support. Hosted practice, complete touch inputs, sound, interruption, recovery, Wi-Fi/mobile-network checks and exact source identity are required per cartridge and for future cartridges.

## 11. Journey to the West design intake — 1 October 2026

**Authorization:** Plan and ask questions before building. The owner approved optional questions during readiness at 08:43 and enemy/audio direction at 08:50; consolidated technical defaults and implementation remain pending approval. Journey to the West is an explicitly requested multiplayer cartridge exception to the host's individual-minigame scope; it does not change Vault Seven or Nightfall action rules.

**Current specification:** [Journey to the West v0.1 — consolidated Review 1](change-specs/journey-to-the-west-v0.1.md), on `design/journey-to-the-west-v0.1`. Review checkpoint commit: `60248a1226997edd66ccd33a2577f89c9525a0ae`. Use that consolidated file for subsequent implementation planning. Preserve the [decision record](change-specs/journey-to-the-west-v0.1-DRAFT.md) as approval history and the [technical draft](change-specs/journey-to-the-west-v0.1-TECHNICAL-DRAFT.md) as historical source research. No game release or verification is implied.

**Product scope:** One three-minute cooperative arcade brawler level, one to five players, five unique heroes from the traveling party, Nezha boss, detailed arcade pixel art, three total lives with automatic respawn, personal math-earned upgrades, and individual magic pickups. Reserve two opening-cutscene positions for later narrative work. Approved art direction and controls are recorded in the decision document.

**Host integration:** Reuse normal MathQuest team joining and credentials. Do not add a second lobby code, student account or teacher team-assignment flow. Preserve required gates, relevant decisions, academic evidence and reports. At the normal minigame handoff, allow up to 60 seconds of readiness; launch early when everyone is ready, otherwise use the ready eligible subset. Keep the three-second launch countdown and 180-second action clock separate. Omitted players wait for the next run; reconnecting starters recover their existing state.

**Confirmed source findings:** Normal joining uses the existing team PIN and currently has no five-member cap. Equipment voting/inventory and extension checkpoints are team-wide. The frontend polls every 2.5 seconds; current GameHost is a local individual-action runner. This cartridge therefore needs scoped personal-preparation changes, a five-member limit in normal joining, a multiplayer host and a combat transport. Exact file/blob provenance is in the technical draft.

**Proposed engineering:** Keep QuestSession responsible for math, authorization and evidence; add a Cloudflare Durable Object per team/run for authoritative combat over WebSockets. Preserve the existing Pages frontend and academic HTTP relay. A selected WebSocket route/hostname, classroom connectivity, account budget, actual concurrency and latency remain unverified. No account, paid service, DNS or deployed source has been changed.

**Privacy:** Carry only existing pseudonymous participant identity and earned entitlements into the combat service. Preserve no learner accounts/telemetry, original session expiry after 48 hours, teacher deletion and credential expiry. Proposed child combat records must expire with the parent and participate in deletion; do not start a new retention period per game.

**Handbook refreshed for this intake:** AI-START-HERE.md blob `6557a45aaa6d29d7d1abde808e6d0ac248b08820`; UNIVERSAL-RULES.md `9ec5c8d2b9ab2757c043892b5d7218bc6090da04`; CONDITIONAL-STANDARDS.md `dad2d3a05ca0f18260196ea51ac6351bffffdc1c`; RELEASE-CHECKLIST.md `fbab310ffaa75f477f8d63b1885fa0cfeb2b20dd`. U-09 and the newly approved U-10 apply. U-10 requires held controls to release through cancellation, lost capture, interruption and teardown, with relevant physical-device verification; stuck input is release-blocking. Earlier U-01–U-08/S-02–S-04 selection remains task-scoped and does not ratify seeded/draft handbook modules globally. No handbook amendment was made.

**Preparation timing approved at 08:43:** After required gates and relevant decisions, optional personal upgrade questions remain available during the existing 60-second readiness window. Only completed blocks earn upgrades. Students finish or leave optional work, select their hero/upgrades and press Ready; launch early when everyone is ready, otherwise start the ready eligible subset at the deadline. Optional work cannot hold the team. Exact cutoff edge cases are proposed in the technical draft. This is design approval, not implementation authorization.

**Enemy/audio direction approved at 08:50:** Horned mountain raiders, scarf-wearing cliff acrobats, talisman casters, bronze shield guards and ox-like brutes in detailed arcade pixel art. Energetic arcade synth with Chinese-inspired percussion, plucked strings and flute; distinct Nezha theme and recognizable weapon, pickup and hero-special effects.

**Consolidated review:** Review 1 gathers the proposed combat/respawn/reconnect/spawn numbers, production plan, result payload and first implementation stage. The owner has not yet approved that complete technical baseline. Narrative/cutscene/ending content remains deliberately deferred; the actual WebSocket hostname, account budget and school-network measurements remain operational gates.

**First implementation stage after approval:** Reconcile the current host source; implement the existing-identity handoff and a small synchronized combat scene with readiness, clock, pause/reconnect and result return; produce one complete hero/enemy animation sample. Verify those components before expanding the full cast/level. Physical-device and school-network evidence remain required for classroom release.

**Evidence state:** Source inspected; design documents saved. No Journey gameplay code, generated production sprite sheets, deployed multiplayer service, game tests, school-network tests or physical-device tests completed. The historical connected-iPad observations for mathematics are not evidence for this cartridge. Use DESIGN → CHANGE SPEC → IMPLEMENT → CHECKPOINT → VERIFY → VERIFIED CHECKPOINT → RELEASE → DEPLOY.

## 12. Journey stage-1 implementation intake — 1 October 2026 at 09:00

Owner approved the consolidated v0.1 specification and first implementation stage. Branch: `implement/journey-to-the-west-v0.1-stage1`, based on planning commit `688433bcce9184cc03f434690d2bc33b6bbd5462` / gameplay main `7ac12fb98f7ccda591be4ee0bd6baa2f0ee81c28`. This scoped authorization supersedes the pending-approval statements in the earlier design intake.

Initial scope: normal team identity and gates; optional personal preparation and one-minute readiness; authoritative per-run WebSocket object; shared movement/sample combat, teacher controls, reconnect and engagement results; Wukong/raider animation atlases. The other hero models use explicit labeled art stand-ins in this development checkpoint. Full special timing, complete authored level/Nezha, remaining art and audio, and narrative remain later-stage work. Preserve all existing cartridges and academic evidence.

Handbook intake revisions remain `AI-START-HERE.md` 6557a45, `UNIVERSAL-RULES.md` 9ec5c8d (U-09/U-10), `CONDITIONAL-STANDARDS.md` dad2d3a (S-02/S-03/S-04 selected). Source checkpoint precedes extended tests. Local runtime checks are not physical-device, real Cloudflare deployment or school-network evidence.

## 13. Recovery continuation — shared controls checkpoint

Recovered source and assets are preserved remotely at `316189b94dd2e0d73fd1dc605242ef40bb5167ff`. Continue on `implement/journey-stage1-controls` using [the bounded control specification](change-specs/journey-stage1-controls.md). This branch imports the canonical held-input module and adapts Journey only; integration with newer main and other in-flight cartridges remains a separate merge task. Existing three-minute timing remains the approved local exception for this checkpoint. No Math Arcade integration or deployment is included.

Controls checkpoint verification: `docs/verification/journey-stage1-controls.md` (179 tests passing; five-client browser bridge passed). Next: short landscape viewport fit and complete hosted session verification. This checkpoint is not a verified release.

## 14. Journey landscape checkpoint — 1 October 2026

Owner authorized the next viewport chunk. Baseline remote 794a6b4; scope: [landscape specification](change-specs/journey-stage1-landscape.md). Active match now fits dynamic viewport height, preserves canvas proportions, reserves touch targets and safe-area padding, and uses a compact landscape toolbar. Preparation retains normal scrolling. Evidence: [landscape verification](verification/journey-landscape.md), 179 tests passing and five-client browser checks across five viewport sizes. Physical-device and hosted verification remain outstanding. No deployment or handbook amendment. Next: isolated integration with current host and full session verification.

## Aerial v0.2.0 and shared controls — 1 October 2026

Owner-approved change: five active minutes, 64 regular enemies (double), +10% player speed, and recurring stuck-control/native iPhone menu prevention. See [v0.2.0 specification](change-specs/aerial-shooter-v0.2.0.md) and [release evidence](releases/aerial-shooter-v0.2.0.md). This supersedes the earlier three-minute aerial target. Midpoint/boss checkpoints move to 150/225 seconds; old saves are retained separately.

Use shared `public/engine/held-input.js` for action controls. Handbook [U-10](https://github.com/williammcada/mcada-project-handbook/blob/main/UNIVERSAL-RULES.md#u-10--prevent-stuck-controls-and-verify-touch-release) was strengthened in `c449f9abd191a989056dd64fd18bfe242d3ce59f`; S-03-A records the five-minute MathQuest default. Current canonical Vault/Nightfall hosts receive shared input recovery without gameplay retiming. Other repositories/historical builds are not claimed fixed. Physical iOS retest and classroom narrative integration remain pending.

## 15. Journey current-host integration — 1 October 2026

Integrated main 59c11c9 and Journey remote 225909f on isolated branch `integrate/journey-stage1-host`. See [scope](change-specs/journey-stage1-host-integration.md) and [verification](verification/journey-host-integration.md). Source candidate 443a657 passed 198 tests, build validation and the actual frontend/Worker-class teacher/student browser flow through a local WebSocket bridge. Main shared-input code/tests and Aerial/Coastal preview assets retained. Full Coastal cartridge stays separately on its candidate branch. No version bump, deployment or verified-release claim. Existing 180-second Journey timing retained. Remaining production work: full cast/level/boss, then deferred story/audio; real Cloudflare endpoint/runtime, physical controls and school testing remain gates.

## 16. Hero animation development checkpoint

Four original hero atlases replace the labeled stand-ins; five-hero render review and 198 tests/build passed with limits in [verification](verification/journey-hero-animation.md). Atlas edge/pivot polish and complete horse choreography remain before production-ready art. Next: those corrections, then authored level/Nezha. No retiming, narrative/audio expansion or deployment.

## 17. Prince horse development checkpoint

Prince now transforms for 300ms, charges under server-authoritative steering for 3000ms, and returns for 300ms. One magic charge; at most two 30-damage hits per target, 600ms apart, Focus bonus retained. Pause freezes charge; stale/disconnected input stops steering and collision damage; death cancels it. Original supplemental horse atlas and expanded bounds for 94/120 hero frames added. Remaining 26 frames need art correction. Source c6385a7 passes 202 tests, build, art browser and teacher/student flow. See [verification](verification/journey-horse-and-frame-polish.md). No deployment, retiming or full-level completion claim.

## 18. Bajie frame repair development checkpoint — 2 October 2026

Baseline remote f5b2612. Twelve affected Bajie poses replaced with a separate, transparent, spaced atlas and explicit mapping. Current implementation branch `implement/journey-bajie-frame-repair`; source candidate 29be454 passed 202 tests, build, alpha-boundary verification and Chromium animation/contact-sheet review. See [verification](verification/journey-bajie-frame-repair.md). 106/120 poses now use isolated original bounds or replacement art; fourteen Wukong/Wujing/Prince poses remain the next art chunk. Gameplay, timing, input and academics unchanged. Full level/Nezha follows art work. No deployment or physical-device acceptance.

Current handbook blobs read: AI-START-HERE 6557a45, UNIVERSAL-RULES 6bde7c1, CONDITIONAL-STANDARDS 1a79498.

## 19. Remaining hero frame repair — 2 October 2026

Fourteen Wukong/Wujing/Prince poses replaced; all 120 frame positions now have isolated bounds or supplemental art. Source candidate passed 202 tests, build, alpha-boundary and Chromium review in both directions. Exact game code/art recovered after interrupted upload; see [verification and recovery](verification/journey-remaining-frame-repair.md). Next: authored encounters and Nezha, with choreography/story/audio still pending. No deployment or physical-device acceptance. Handbook files consulted at 6557a45 / 6bde7c1 / 1a79498 / release checklist 8aeb220.

## 20. Authored combat checkpoint — 3 October 2026

Continuation from remote f93b9f6 on `implement/journey-encounters-stage5`. Mountain/cave/shrine/courtyard waves, five ordinary role behaviors, deterministic supplies and Nezha spear/ring/rush implemented. Preserves 180-second approved local scope, one-to-five fixed starter scaling, math/teacher/reconnect/input behavior and earlier hero art. Runtime identifies `jttw-0.1.0-stage5-combat`.

Source e120c62 passes 218 Node tests and build; five-client stage/render/control checks plus complete teacher/student flow passed through local Node bridges. See [specification](change-specs/journey-encounters-stage5.md) and [verification](verification/journey-encounters-stage5.md). Enemy/boss art is explicitly a technical proxy, not production art; scene assets, four special choreographies, balance, story/audio and real devices/network remain pending. No main merge, release or deployment. Handbook revisions unchanged: 6557a45 / 6bde7c1 / 1a79498 / 8aeb220.

## 21. Thursday play-test resources — 6 October 2026

Owner authorized courtyard, remaining specials, audio, original narrative and a ready-to-open solo package. Runtime jttw-0.1.0-stage8-playtest on isolated Journey branch. Four environments, enemy/boss sprite integration, four timed specials plus retained horse, original 48s/36s synthesized themes, sound cues, two opening story positions and outcome epilogues implemented. Offline solo practice bundles the exact shared model/input and all loaded art; no Cloudflare or classroom evidence. Desktop Chromium file-open, complete art load, start, movement, pause/resume and magic checked. 231 tests/build and local five-client + teacher/student flows pass. See verification/journey-stage8.md and verification/JOURNEY-START-HERE.txt.

Not a deployment or verified classroom release. Current-main reconciliation, physical controls/audio, human balance and school network remain gates. Tang ordinary attacks remain instant finite-range hits rather than traveling projectiles. Do not hide this remaining specification gap.

## 22. Stage 9 owner feedback — 8 October 2026

Owner reports Stage 8 playable and requests cleaner effects, improved action sounds,
more breakables, illustrated elixir/baozi pickups and keyboard playtesting. Source
baseline 975989afdd739b08c5f14f8556f4b1bb77ab4804; isolated branch
implement/journey-stage9-feedback. See change-specs/journey-stage9-feedback.md.
Handbook v0.1.3 at c50115b read including starter, universal rules, selected S-02–04
and release checklist. Preserve 180-second local exception and all academics.
Implementation/testing status is recorded separately in verification/journey-stage9.md.
No main merge, multiplayer deployment or physical-device acceptance implied.

## Nightfall Chapter 2: False Haven — 1 October 2026

Owner accepted the safe-zone escape concept and authorized the next design step. Canonical implementation specification: [Nightfall Chapter 2 v0.1.0](change-specs/nightfall-chapter-2-v0.1.0.md). Stage: CHANGE SPEC; no Chapter 2 implementation or verification claimed.

Source inspected: `59c11c90c2f0893333dfe30b62578fd73deb9bbf`, canonical `public/games/nightfall/`. Preserve shared engine, four existing enemy types and pistol/carbine-primary plus shotgun semantics. New compound bounds target 3840 × 1920 (2.25× existing bounding area), with an independent minimum of 2× reachable walkable area. Add power/drainage, local speaker trap, fixed-track cargo trolley, shortcuts and a gate/bus escape finale. New-level active-time maximum is 300 seconds. Numeric encounter tuning remains subject to playtesting.

Build a separate practice scenario first; retain existing GitHub Pages/Worker delivery. Do not register an unfinished classroom cartridge or silently migrate existing session gate/timer behavior. Future Math-Arcade admission uses math before each new run; classroom integration needs its own explicit lifecycle contract. Target Windows keyboard/browser and landscape iPad/iPhone, with real-device verification pending. Use approved U-10 and shared held-input implementation; U-09 applies to any persisted Chapter 2 progress. Consulted handbook blob revisions and detailed acceptance checks are in the specification.

Next: generalize hard-coded world/navigation dimensions with city/rescue regression checks, then checkpoint the compound implementation before extended verification. Preserve the exact passing candidate before release and deployment.

### False Haven implementation checkpoint — 1 October 2026

[Practice candidate v0.1.0](releases/false-haven-v0.1.0.md) is implemented at exact application commit `0124d53351dd7f69e6c0a8ef58979a878304b808`. Its 178-test suite/build passed, hosted Pages files match, and hosted action-start/map/guided-completion/reload smoke passed. Reachable area measured 2.34× Chapter 1. The earlier CHANGE SPEC status above is historical; physical-device and sustained combat verification remain open. No classroom/Arcade registration or math-gate migration has been performed. Follow the release record for evidence and next verification.

## False Haven cartridge integration — v0.2.0

User authorized production of Chapter 2 as a cartridge, consistent with the established workflow. The integration specification is `docs/change-specs/false-haven-cartridge-v0.2.0.md` (GitHub specification checkpoint `fddd4c91ddcc435970b0798591067c34d9f6d3fb`). New ID `nightfall-false-haven`, content revision `false-haven-cartridge-0.2.0`; preserved map revision `false-haven-0.1.0` and platform engine 0.9.4. Full 3/4/5-gate classroom progression, team decisions, earned equipment, independent action/assisted records and three endings are implemented. Existing approved art/audio are reused. Owner preview: `public/false-haven-preview.html`.

The authoritative five-minute team window begins at `market.continue`; teacher pause extends it, local pause/reload do not. Individual active play is also limited to 300 seconds. Catalog ID/revision prevents the new frontend from creating Chapter 2 against an older Worker. Deployment authentication was unavailable (`wrangler whoami`: not authenticated); do not call the live classroom cartridge verified until the Worker is deployed and tested. See `docs/releases/false-haven-cartridge-v0.2.0.md` for exact candidate and verification evidence.

## Ironbreak cartridge v0.1.0 — 1 October 2026

Owner requested cartridge development around playable shooter alpha.2. Proposed name: Ironbreak. Baselines: main `6631cda52593fde611a3352489814f7d4bfbe3d3` and shooter `b67cd57bcaa09c7bb733c91ab8a24f50b2415dde`; handbook `c50115ba1fea9cb552f3ad1415e670a219118b56` (AI-START-HERE, UNIVERSAL-RULES, CONDITIONAL-STANDARDS S-02/S-03/S-03-A/S-04, RELEASE-CHECKLIST). See [Ironbreak v0.1.0 specification](change-specs/ironbreak-v0.1.0.md). Narrative/name are authored proposals for review under the owner's development instruction, not separately approved final writing.

Reuse current academic and equipment flows. Preserve alpha.2 geometry/combat/audio and other cartridges; replace shooter input with shared held-input mechanism. Add narrative/registry, server-issued individual run identity, three lives, authoritative five-minute team window, checkpoints, recovery, guided alternative and separated engagement reports. U-09 uses existing whole-session deletion/local record registry. U-10 physical device/menu/viewport checks remain required. Existing teacher math configuration stays intact; no claim of synchronized Olivia/Mega Man settings migration. No Math Arcade integration in this change.

Stage: implementation candidate on `feature/ironbreak-cartridge-v0.1`. Frontend and Worker must be deployed together after review. No main update or hosted deployment authorized by this implementation checkpoint.

Release preparation, 1 October: owner requested proceeding with PR #5 and current-main reconciliation. Combine Ironbreak `2d42f3b` with main `59c11c9`, retaining Coastal Escape's preview without importing its separate classroom candidate. No gameplay changes. See [coordinated deployment handoff](releases/ironbreak-v0.1.0-deployment.md). Cloudflare deployment access and physical-device evidence remain outstanding; do not publish the frontend alone or call this a verified classroom release.

## Coastal Escape cartridge v0.3.0 — approved 1 October 2026

See [approved specification](change-specs/coastal-escape-v0.3.0.md). Actual baseline is `6631cda52593fde611a3352489814f7d4bfbe3d3`; handbook `c50115ba1fea9cb552f3ad1415e670a219118b56`. Owner approved fictional Merrow island, operator/records route choice, deliver/exchange/destroy final decisions, Nightfall-style 3–5 math gates, earned team aircraft equipment, one individual five-minute escort and everyone's final vote. Story choices and action outcomes remain independent of academic evidence. Full candidate platform version is v0.9.5, cartridge v0.3.0, unchanged action tuning v0.2.0. Preserve live v0.9.4 frontend until its matching Worker can be deployed. A public owner story preview may ship separately; it produces no classroom evidence.

## Combined cartridges v0.9.6 — 2 October 2026

Owner authorized one combined candidate for Ironbreak and Coastal Escape, preserving main’s False Haven, Nightfall and Vault Seven. See [combined specification](change-specs/combined-cartridges-v0.9.6.md). Canonical combined candidate branch: `release/combined-cartridges-v0.9.6`. Platform identity is v0.9.6; individual game/cartridge revisions remain intact. Publish only the isolated review hub/standalone review ahead of backend deployment. Existing individual-branch deployment instructions are historical; deploy this combined Worker once when ready. No Cloudflare deployment now.

## DEV homepage revision — 6 October 2026

Owner authorized frontend-only access to preserved review/practice builds. Application checkpoint `af87c3b0188cf240117b340a20c84e3bd67be95d` adds question-free action entry for all six games while retaining story review. See `change-specs/dev-homepage-2026-10-06.md` and `releases/dev-homepage-2026-10-06.md`. No gameplay, artwork, classroom registry or backend changes. Owner playtesting remains pending Thursday October 8, 2026.

## False Haven v0.3.0 — 8 October 2026

Owner reported constant lag in Windows Chrome, worse with visible enemies, unclear authority abandonment and repeated Chapter 1 art. Accepted change specification: `docs/change-specs/false-haven-v0.3.0.md`. Candidate `64fe2959588411b6aa53b5c23ff4e5f2be91e85d` caches collision/navigation/ground rendering, clarifies mandatory opening and adds chapter-specific illustrations/ground textures. Tree-identical local candidate passed 186 tests/build and Chromium story/action/reload checks. See `docs/releases/false-haven-v0.3.0.md` for timing evidence and limits. Map, session envelope, enemy/weapon roster, puzzles, mathematics, save keys and timers are retained. Windows owner replay and physical iOS remain pending. Existing Worker activation is a separate unresolved deployment step; Pages frontend verification does not imply live classroom activation.
## Narrative illustration direction — 8 October 2026

Owner requires Ironbreak and Blackline story artwork to match the detailed illustrated treatment of Coastal Escape, Nightfall and Vault Seven; geometric/procedural SVG narrative illustrations are superseded. Eight raster scenes are saved under public/assets/ironbreak/ and public/assets/blackline/ and embedded in the current standalone reviews. See change-specs/painted-cartridge-art-2026-10-08.md and releases/painted-art-2026-10-08.md. Retain this art on later classroom candidate integration; do not regenerate old geometric review bundles over it. This is a narrative illustration revision, not a replacement of the arcade renderers.


## Repository and Pages rename — 8 October 2026

Owner renamed the existing repository (unchanged ID 1369013008) to williammcada/mathquest. Canonical Pages entry: https://williammcada.github.io/mathquest/. Update active runtime addresses, local-file diagnostics and current README links; historical source references remain provenance. The Netlify relay, existing Worker and Durable Object storage are unchanged. GitHub Pages origin stays https://williammcada.github.io, so this path-only rename does not require a CORS change. See migrations/mathquest-address-2026-10-08.md.

## 23. Journey current-main integration — 8 October 2026

Owner approved publication. Canonical repository is now williammcada/mathquest,
ID 1369013008. Candidate merges current main cd96eb2 with Journey checkpoint
6eabeb3, preserving False Haven v0.3 and current narrative artwork. Scope:
change-specs/journey-stage9-integration.md. Runtime jttw-0.1.0-stage9-feedback.
Cloudflare authentication and actual COMBAT_PUBLIC_BASE custom hostname are
required deployment gates. No running backend deployment is claimed until
verified. Prior branch/source headers are historical provenance.


## 24. Existing Worker endpoint exception — 8 October 2026

Owner has no purchased domain and authorized proceeding with the existing Worker.
See change-specs/journey-existing-worker-endpoint.md, superseding the custom-host
requirement in section 23 and Journey hosting section 13 only for the exact
https://mathquest-prototype.willmcada-apps.workers.dev endpoint.
No domain purchase, DNS change, paid plan, frontend migration or academic relay
replacement. Classroom network/WebSocket/reconnect checks remain Not run.

## BLACKLINE cartridge v0.2.0 — 2026-10-02

Implemented and tested in MathQuest candidate `2b8adea20407bb8b77a211f2211172830bf658b9` on `implement/blackline-v0.2.0`. Native classroom preparation gates, cargo and final crew votes, earned one-use upgrades, racer adapter with shared input, guided route, original SVG scene art and music, run validation and reconnect are implemented. The approved alpha.2 racer is retained. See the BLACKLINE v0.2.0 verification record. Deployment and physical iOS checks remain pending. This is a cartridge integration candidate, not a claim that the live Worker has been updated.

## Narrative and directions — U-11, 8 October 2026

Owner requires physical and visual separation in every cartridge and going forward.
Handbook rule saved at 14ab24e. Apply change-specs/narrative-instructions-u11.md:
shared authored story/instruction roles, separate labeled panels in classroom,
preview and maintained standalone delivery. Preserve gameplay and academic rules.
New narrative content should supply separate `scene.paragraphs` (story only) and
`scene.instructions` arrays, consumed by the shared presentation renderer.

## Nightfall franchise art standard NF-ART-01 — 12 October 2026

**Status:** Approved by William McAda on 12 October 2026 (Asia/Shanghai) as a Nightfall franchise standard. Scope is every current and future Nightfall game: First Response, Last Bus Out, False Haven and later chapters. It is deliberately not a handbook universal rule; the handbook treats art style as product-local (U-08, S-03).

**Rule:** Draw every Nightfall world object from predesigned sprite art. This covers structures, terrain features, props, interactables and their visible state changes. Do not substitute code-drawn geometric shapes. Code drawing is limited to the HUD and prompts, minimap, debug overlays, objective markers, aim line, bullets, weather, lighting, short-lived effects, and game-rendered text placed on sprite-backed signs.

**Check:** Rendered frames of every changed object and state show sprite art, readable against the surrounding ground at in-game size. A missing sprite is reported as missing, not silently replaced by shapes.

**First application:** [Nightfall Art Direction v1.0.0](change-specs/nightfall-art-direction-v1.0.0.md) with [sprite brief](art/NIGHTFALL-SPRITE-BRIEF-v1.md). Stage: CHANGE SPEC. Sprite sheets are not yet produced; no implementation or verification is claimed.

Owner decisions:
- One combined release covering all three games.
- False Haven's movable barricades are removed.
- The inspection-lane trap is kept with new sprites.
- Painted roofs, floor decals and wall furniture are added, guarded by a reachability test.
- First Response gets the full treatment.
- Platform target is v0.9.8; False Haven v0.4.0; Chapter 1 gains visible version v1.1.0.

The Worker must be deployed together with the frontend because it validates shared Nightfall geometry.

**Implementation — 12 October 2026:** branch `implement/nightfall-art-v1.0.0`, implementation checkpoint `7d4b9a7`. Platform v0.9.8, False Haven v0.4.0, Chapter 1 v1.1.0. Status: release candidate. All checks that could run passed: suite, build, reachability and keep-out, review frames, Chromium play of all three games, performance. Ten DOM runtime suites could not run (dependency install blocked), and physical-device, hosted Pages and Worker checks are pending. See [release record](releases/nightfall-art-v1.0.0.md). Do not merge to `main` until the Worker deploys alongside Pages, because v0.9.8 needs the matching Worker for every cartridge.
