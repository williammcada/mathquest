# MathQuest

**A WILLIAM MCADA PRODUCT**

MathQuest is a cartridge-based classroom mathematics game platform. Teachers configure academic content and a shared classroom session; students complete mathematics, team decisions, resource choices, and individual action-game sequences inside cartridge-specific narratives.

**v0.9.8** (13 Oct 2026): harder, longer action games — Coastal Escape flight v0.4.0, Ironbreak v0.2.1, Blackline v0.3.2 — and the U-13 DEV playtest mode. Includes Vault Seven, Nightfall: Last Bus Out, False Haven, Ironbreak, Coastal Escape and Blackline. See [v0.9.8 release notes](docs/releases/v0.9.8.md); the frontend and the Cloudflare session engine must be deployed together.

## Current address

[Open MathQuest](https://williammcada.github.io/mathquest/) · [Cartridge reviews](https://williammcada.github.io/mathquest/public/cartridge-review.html). Six games are available through Developer tools; the full six-cartridge classroom deployment is being consolidated. Earlier version sections below are historical.

## Historical v0.9.4 project status

**Candidate:** MathQuest v0.9.4, branch `release/v0.9.4`. Nightfall First Response inserts a personal rescue/escort between the first team vote and Gate 2. Unlimited retries share one server-controlled five-minute team window.

**Starting main source:** merged v0.9.3, `c7ea42d7e54402357b5c56c52c44856666e4c2b9`. Canonical frontend `public/`; session engine `src/`. Both components identify v0.9.4. This feature requires the updated Worker.

**Existing addresses:** repository `williammcada/mathquest`; Pages `https://williammcada.github.io/mathquest/`; Netlify relay `https://vault7mathquest.netlify.app/api/`. The repository and Pages address were renamed on 8 October 2026. The relay hostname remains unchanged.

See the [v0.9.4 candidate report](docs/releases/v0.9.4-candidate.md), [change specification](docs/change-specs/v0.9.4.md), and [address migration handoff](docs/migrations/v0.9.3-addresses.md). Earlier candidate reports and specifications remain historical evidence.

## Test/deploy this candidate at the existing addresses

1. Download `release/v0.9.4` from its repository Code page using **Code → Download ZIP**, then extract the full directory.
2. Finish active classroom sessions. Run `Deploy_Backend_Windows.bat` to check and update the **existing** Cloudflare Worker to v0.9.4. Keep its Worker name, storage binding and migration unchanged. Publishing only the frontend cannot enable First Response.
3. Publish the frontend through the established Pages process when ready for hosted review. Pages remains `main` and `/ (root)`; root entry points forward into `public/`. Do not copy `public/` over the repository root.
4. Run `public/connection-test.html`; expect frontend and server v0.9.4. Create fresh teacher/student rooms for the new sequence. Existing v0.9.2 rooms remain compatible and retain their original sequence, without a retroactive rescue insertion.
5. Open Nightfall practice and select **First Response · five-minute rescue window**, then Clinic or Depot Garage. The practice timer includes delayed Start and local pauses; Restart practice is outside classroom evidence. Later-city equipment/threat/checkpoint controls are disabled for this chapter.
6. Verify live rescue → Gate 2, pause/reconnect/expiry, later city independence, and both cartridges on target devices. The unchanged Netlify relay needs no upload. No repository/address rename is part of this feature.

## Architecture

MathQuest currently uses the established classroom hosting architecture:

* GitHub Pages front end
* existing relay/service infrastructure
* teacher-controlled classroom rooms
* student join flow
* team state and shared narrative decisions
* independent student action-game runs
* academic and gameplay evidence reported separately

Infrastructure replacement or renaming is a separate migration task and must not be introduced casually during a gameplay release.

## Project documentation

* [Project Brief](docs/PROJECT-BRIEF.md)
* [Migration Baseline](docs/MIGRATION-BASELINE.md)
* [Technical Specifications](docs/specifications/)
* [MathQuest v0.9.1 Change Specification](docs/change-specs/v0.9.1.md)
* [McAda Project Handbook](https://github.com/williammcada/mcada-project-handbook)

The project brief identifies the canonical source, must-retain behavior, applicable handbook standards, deployment constraints, and definition of done.

Version-specific change specifications record the approved changes for each release so implementation does not depend on reconstructing decisions from chat history.

## Release workflow

Substantial MathQuest revisions follow this sequence:

1. **Design** — discuss feedback, defects, and proposed changes.
2. **Change specification** — consolidate approved decisions into a versioned specification.
3. **Implement** — modify the canonical source against that specification.
4. **Implementation checkpoint** — preserve an identifiable source state before extended verification.
5. **Verify** — run applicable automated, hosted, gameplay, reconnect, device, and workflow checks.
6. **Verified checkpoint** — preserve the tested candidate.
7. **Release** — approve the verified checkpoint as a release.
8. **Deploy** — publish that exact released source.

## Coastal Escape aerial practice v0.2.0

[Play the aerial practice](https://williammcada.github.io/mathquest/aerial-shooter-practice.html) · [Change specification](docs/change-specs/aerial-shooter-v0.2.0.md) · [Verification and limits](docs/releases/aerial-shooter-v0.2.0.md)

Five-minute flight, double regular enemies, +10% player movement, and shared touch-release/native-menu prevention. See root AGENTS.md and handbook U-10 for required shared input checks. Physical iPhone/iPad retesting remains pending.

## Coastal Escape cartridge candidate

[Coastal Escape story preview](public/coastal-escape-preview.html) includes the fictional-island story, choices, original artwork/music and existing five-minute flight. It skips math explicitly for owner review and records no classroom evidence. The full v0.3.0 cartridge / v0.9.5 platform candidate is on `coastal-escape-v0.3-candidate`; see [deployment and verification](docs/releases/coastal-escape-v0.3.0.md). The current classroom frontend stays paired with its backend until the candidate Worker is deployed.

## Journey Stage 9 solo playtest candidate — 8 October 2026

Build `jttw-0.1.0-stage9-feedback`: removes geometric range overlays, adds original
painted baozi/elixir/crate assets, doubles pre-boss crates, improves action Foley,
and adds Space/Z/X/C keyboard aliases plus Escape pause/Enter resume in solo.
See [change specification](docs/change-specs/journey-stage9-feedback.md) and
[local verification](docs/verification/journey-stage9.md). The standalone package
opens directly in desktop Chrome/Edge; it saves no academic records. Rebuild with
`scripts/build-journey-practice.mjs` and JOURNEY_ESBUILD pointing to esbuild's main.js.
Source remains isolated from newer MathQuest main; this is not a classroom release.

## Nightfall II: False Haven — v0.1.0 practice candidate

[Play Chapter 2](https://williammcada.github.io/mathquest/public/practice-false-haven.html) · [Specification](docs/change-specs/nightfall-chapter-2-v0.1.0.md) · [Verification and limits](docs/releases/false-haven-v0.1.0.md)

Escape a compromised safe zone using power, drainage, a speaker trap, movable cargo and the original Nightfall weapons/enemies. Map footprint is 2.25× Chapter 1; measured reachable area is 2.34×. Five active minutes. Practice has no math gate or student evidence; classroom/Arcade integration remains separate. Candidate 0124d53 passed 178 automated tests and hosted smoke checks; physical iPhone/iPad and sustained combat playtesting remain pending.

## DEV homepage update — 2026-10-06

Open Developer tools on the [MathQuest homepage](https://williammcada.github.io/mathquest/public/) for question-free action practice: Vault 7, Nightfall, Nightfall II, Blackline, Ironbreak and Coastal Escape. Existing story reviews remain available separately (Ironbreak story review retains sample math). Frontend-only update; no new classroom cartridge activation. All six hosted starts checked in desktop Chrome. Owner/device playtesting remains pending October 8. [Verification record](docs/releases/dev-homepage-2026-10-06.md).

### False Haven v0.3.0

Performance repair, explicit unsafe-camp/authority-abandonment narrative, and new chapter-specific illustrated artwork. [Story and playable mission](https://williammcada.github.io/mathquest/public/false-haven-preview.html) · [Direct practice](https://williammcada.github.io/mathquest/public/practice-false-haven.html). See [release evidence](docs/releases/false-haven-v0.3.0.md). 186 tests and Chromium checks pass; Windows Chrome owner replay and physical iOS remain pending. Live classroom Worker activation is separate.
