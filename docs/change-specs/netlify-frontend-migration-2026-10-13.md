# MathQuest frontend migration to Netlify — change specification

**Stage:** SUPERSEDED 14 October 2026 by [render-frontend-migration-2026-10-14.md](render-frontend-migration-2026-10-14.md); never approved or implemented. Originally proposed 13 October 2026 (Asia/Shanghai). No implementation, deployment or verification is claimed by this document.
**Owner:** William McAda · A WILLIAM MCADA PRODUCT
**Source baseline:** `main` at `e79fdb8960cb4416e4953bba422bcbd8be545389` (frontend `public/` and session engine `src/`, both 0.9.7).
**Live service observed 13 October 2026:** `https://vault7mathquest.netlify.app/api/health` reported `version 0.9.7`, `journeyBuild jttw-0.1.0-stage9-feedback`, `transport https-polling`.
**Handbook consulted:** `williammcada/mcada-project-handbook` at `fd43308` — AI-START-HERE, UNIVERSAL-RULES (U-01, U-06, U-07), CONDITIONAL-STANDARDS (S-04).

## 1. Purpose

Serve the student and teacher frontend from Netlify instead of GitHub Pages. Motivation: owner reports students having trouble reaching GitHub-hosted addresses. This also lets the repository become private later without taking the game offline.

## 2. Owner decisions — 13 October 2026

| Question | Decision |
| --- | --- |
| New address | `https://mcada-mathquest.netlify.app` (matches `mcada-matharcade`, `mcada-applied-math`) |
| Old `williammcada.github.io/mathquest/` address | Forward to the new address for a few weeks, then retire Pages and make the repository private |
| Timing | Not in classroom use this week; switch as soon as the new site passes verification |

## 3. Conflicts with the current brief

`docs/PROJECT-BRIEF.md` §1 says "Preserve existing GitHub Pages frontend and relay/service architecture," and §24 lists "no … frontend migration." This owner request supersedes both **for frontend hosting only**. The Cloudflare Worker `mathquest-prototype`, its `SESSIONS` binding, `QuestSession` storage and migrations, and the session protocol are unchanged. The brief will be updated to record this.

## 4. Current architecture (inspected at baseline)

- GitHub Pages serves `main` from the repository root; the root `index.html` forwards into `public/`.
- `public/hosting.js`: when the page origin is the configured Pages origin, API calls go to the Netlify relay `vault7mathquest.netlify.app/api/`; on **any other origin** they go to the same origin's `/api/`.
- `public/_redirects` proxies `/api/*` to `https://mathquest-prototype.willmcada-apps.workers.dev/api/:splat`.
- The relay site `vault7mathquest` is a manual drag-and-drop deploy (11 September 2026): a stub `index.html` plus that one redirect rule.
- The Worker rejects browser origins outside `CORS_ALLOWED_ORIGINS` (`src/cors.js`), currently `https://williammcada.github.io,https://vault7mathquest.netlify.app`.
- Journey combat WebSockets connect directly to the existing `workers.dev` endpoint (brief §24 exception). Unchanged here.

Consequence: a Netlify site that publishes `public/` already routes API traffic same-origin through its own `_redirects`. Students still never make HTTP API calls to `workers.dev`.

## 5. Changes

1. **Netlify project** `mcada-mathquest`, connected to GitHub `williammcada/mathquest`, branch `main`, publish directory `public`, no build command. Pushes to `main` redeploy automatically, as Pages does today. Add a root `netlify.toml` recording these settings, so the configuration lives in the repository rather than only in the dashboard.
2. **Worker allowlist:** add `https://mcada-mathquest.netlify.app` to `CORS_ALLOWED_ORIGINS`. Change it in `wrangler.jsonc` (source) **and** in the live Worker through the Cloudflare dashboard variable editor. Do **not** run `Deploy_Backend_Windows.bat` or `wrangler deploy` for this change: it must not ship any other Worker code. Keep the GitHub Pages and `vault7mathquest` origins during the forwarding period.
3. **App code:** no change to classroom JavaScript or the 0.9.7 frontend/server protocol, so the Worker's version matching is unaffected.
4. **Connection test fallback:** `public/connection-test.html` links local-file users to the github.io hosted test. Point it at the Netlify address. Per U-01, this page gets a new visible version; this must not alter the 0.9.7 protocol version reported to the Worker.
5. **Old-address forwarding:** create branch `pages-forwarding`, holding only `index.html` and `404.html` ("MathQuest has moved," visibly versioned v1.0.0 per U-01). The script maps `…/mathquest/[public/]<path>?<query>#<hash>` to `https://mcada-mathquest.netlify.app/<path>?<query>#<hash>` and shows a visible link as a fallback. The owner switches the Pages source to this branch. The app files on `main` are not modified for forwarding.
6. **Hosting tests:** add a case to `test/hosting.test.mjs` asserting that a page on `https://mcada-mathquest.netlify.app/` gets `apiBase` `https://mcada-mathquest.netlify.app/api/`, and that session and QR links stay on that origin.
7. **Records:** update the README's current address, add a brief section, and add the migration record `docs/migrations/netlify-frontend-2026-10-13.md`.

## 6. Must retain

- Every classroom feature, cartridge, practice page and asset served at the same relative paths.
- Worker identity, storage and existing rooms. Server-side rooms are unaffected.
- The relay site `vault7mathquest` until github.io is retired, because the forwarding period and any not-yet-forwarded tab still use it.
- Privacy: no new cookies, accounts or telemetry; same alias and credential handling.

**Known, accepted limitation:** browser storage is per origin. Saved room credentials and practice saves on github.io do **not** carry over to Netlify. Students and teachers rejoin or start fresh rooms. The cutover therefore happens between classes.

## 7. Out of scope

Worker code deployment; renaming or removing the `vault7mathquest` relay; a custom domain; the Nightfall v0.9.8 release; any gameplay change.

## 8. Verification (U-07, S-04)

| Check | Who / how |
| --- | --- |
| `npm test` and `npm run build` pass on the implementation checkpoint | Claude |
| Netlify serves `public/` from the checkpoint commit; hashes of the served entry HTML/JS match the commit | Claude |
| `/api/health` through `mcada-mathquest.netlify.app` reports 0.9.7 | Claude |
| `connection-test.html` on Netlify: frontend and server 0.9.7, two-way access | Claude, then owner |
| Teacher creates a fresh room; a student joins from a second browser; a QR/session link points to Netlify | Owner (Claude provides steps) |
| Journey combat start from the Netlify origin (WebSocket ticket accepted) | Owner |
| Forwarding: old root, old `/public/?session=…&student=1`, a deep page, and a fragment all land at the matching Netlify URL | Claude |
| School Wi-Fi on a student iPad reaches Netlify and plays a session | Owner — **required before classroom use**; recorded as Not run until done |

## 9. Owner manual steps (instructions provided at each stage)

1. Netlify: **Add new project → Import an existing project → GitHub → `williammcada/mathquest`**, branch `main`, publish directory `public`, name `mcada-mathquest`.
2. Cloudflare: **Workers & Pages → mathquest-prototype → Settings → Variables and Secrets → `CORS_ALLOWED_ORIGINS` → Edit**, append `,https://mcada-mathquest.netlify.app`, then **Deploy**.
3. After verification: GitHub **Settings → Pages → Branch: `pages-forwarding`, `/ (root)` → Save**.
4. Retirement (suggested no earlier than 6 November 2026): **Settings → Pages → Unpublish site**, then make the repository private. Before making it private, confirm that Netlify's GitHub app still has access to it.

## 10. Rollback

Before step 3, delete or ignore the Netlify project; github.io continues unchanged. After step 3, set the Pages source back to `main`. The extra allowlist origin is harmless and can stay.

## 11. Release workflow

DESIGN → CHANGE SPEC (this document) → IMPLEMENT (items 5.1–5.7) → CHECKPOINT ("MathQuest Netlify frontend implementation checkpoint") → VERIFY (§8) → VERIFIED CHECKPOINT → RELEASE (README/brief) → DEPLOY (Pages forwarding switch; owner school-network check).
