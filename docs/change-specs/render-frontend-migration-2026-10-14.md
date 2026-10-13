# MathQuest frontend migration to Render — change specification

**Stage:** Approved 14 October 2026 (Asia/Shanghai); implementation checkpoint on `implement/render-hosting`. Hosted, classroom and school-network checks are recorded below as Not run until done.
**Owner:** William McAda · A WILLIAM MCADA PRODUCT
**Source baseline:** `main` at `9dbc63e` (MathQuest 0.11.0, Kingsgate merged).
**Handbook consulted:** `williammcada/mcada-project-handbook` at `7e134a8` — AI-START-HERE, UNIVERSAL-RULES (U-01, U-07, U-08, U-12), CONDITIONAL-STANDARDS (S-04).
**Supersedes:** [netlify-frontend-migration-2026-10-13.md](netlify-frontend-migration-2026-10-13.md), which was never approved or implemented (no `mcada-mathquest` Netlify project exists). Its analysis of the current architecture (§4) still holds and is not repeated here.
**Related:** the same move for Math Arcade and Applied Math Projects, each under its own specification.

## 1. Purpose

Serve the student and teacher frontend from Render instead of GitHub Pages, and make student API calls same-origin on that address. Netlify's credit-based plan charges for deploys and requests; Render does not meter deploys that way. Retiring GitHub Pages later lets the repository become private.

## 2. Owner decisions — 14 October 2026

| Question | Decision |
| --- | --- |
| Front door | Render static site `mcada-mathquest` → `https://mcada-mathquest.onrender.com` |
| Backend | Unchanged: Cloudflare Worker `mathquest-prototype` with its Durable Object storage |
| Network | Owner tested `onrender.com` on student iPads on the school Wi-Fi: it works |
| Expected load | Up to about 140 students, about twice a month once in regular use |
| Netlify | Remains an acceptable student host; MathQuest does not need it once Render is verified |
| Old addresses | `williammcada.github.io/mathquest/` forwards to Render for a few weeks, then Pages is retired |

## 3. Changes

1. **`render.yaml`:** static site `mcada-mathquest`, branch `main`, publish `public/`, no-op build. A build filter rebuilds only when `public/**` or `render.yaml` change, so documentation and branch work do not rebuild. A rewrite route sends `/api/*` to `https://mathquest-prototype.willmcada-apps.workers.dev/api/*`. This replaces `public/_redirects`, which Render does not read; that file stays for the Netlify relay.
2. **No classroom JavaScript change.** `public/hosting.js` already sends API calls to the page's own `/api/` on any origin other than GitHub Pages, and keeps session and QR links on the page's address. New tests prove this for the Render address.
3. **Worker allowlist:** add `https://mcada-mathquest.onrender.com` to `CORS_ALLOWED_ORIGINS` in `wrangler.jsonc` and to the default list in `src/cors.js`, so the next normal Worker deploy keeps it. The live Worker gets the same addition through the Cloudflare dashboard variable editor now. **Do not** run `Deploy_Backend_Windows.bat` for this change.
4. **Connection test page 1.1.0:** its local-file fallback link opens the Render connection test instead of github.io. Visible page version 1.1.0 (U-01); the platform/protocol version stays 0.11.0.
5. **Old-address forwarding:** branch `pages-forwarding` holds only `index.html` and `404.html` ("MathQuest has moved", forwarding page v1.0.0). They map `…/mathquest/[public/]<path>?<query>#<hash>` to `https://mcada-mathquest.onrender.com/<path>?<query>#<hash>`. The owner switches the Pages source to that branch after verification.
6. **Records:** README current address, project brief section, this specification.

## 4. Must retain

Every classroom feature, cartridge, practice and review page at the same paths relative to `public/`; Worker identity, storage and existing rooms; the `vault7mathquest` relay until github.io is retired; privacy (no new cookies, accounts or telemetry). The Journey combat WebSocket still connects to the `workers.dev` endpoint under the existing exception (brief §24).

**Known, accepted limitation:** browser storage belongs to one address, so saved room credentials and practice saves on github.io do not carry to Render. Teachers start fresh rooms; cut over between classes.

## 5. Risk to check first

Render documents that a rewrite may point to an external URL but does not document request methods, headers or WebSockets through it. The first hosted check is therefore a POST through the rewrite (connection test → create no rooms; health check). If Render's rewrite drops POST bodies or the `Authorization`/`Origin` headers, the fallback is a small Render web service relay like Math Arcade's. That fallback needs its own approval because a free web service sleeps after 15 idle minutes.

## 6. Bandwidth

Render's free workspace plan includes 5 GB of outbound bandwidth a month for all sites together, then $0.15/GB; without a payment method, free services are suspended for the rest of the month instead. Served sizes: core pages and scripts about 1–2 MB; most cartridges' art 1–4 MB; Nightfall 21 MB; Journey 56 MB. API traffic through the rewrite also counts. At about 140 students twice a month, ordinary cartridges fit comfortably; a Journey or Nightfall class could use a large share of the allowance. Mitigation is a payment method on the Render workspace (overage then costs cents to a few dollars) — the owner's decision.

## 7. Out of scope

Worker code deployment; gameplay changes; a custom domain; removing the `vault7mathquest` relay; Math Arcade.

## 8. Verification

| Check | Who | Status |
| --- | --- | --- |
| New hosting tests: Render page → same-origin API, session/QR links on Render; Worker accepts the Render origin from both the configured and default lists; Blueprint publishes `public/` and rewrites only `/api/` | Claude | Passed locally (`test/hosting.test.mjs`, 8/8) |
| Full `npm test` and `npm run build` on the checkpoint | Claude | Build passed. 286 of 296 tests passed; 10 browser-DOM files could not load `happy-dom` because the package registry was unreachable from the build workspace — identical result on unchanged `main`. Full suite runs in GitHub CI on the pull request |
| Render serves `public/` from the merged commit; served `index.html` matches the commit | Claude after owner setup | Not run |
| `/api/health` through Render reports 0.11.0; connection test passes both checks | Claude, then owner | Not run |
| Teacher creates a room; student joins from a second device; QR/session link points to Render | Owner | Not run |
| Journey combat starts from the Render origin | Owner | Not run |
| github.io forwarding: root, `/public/?session=…&student=1`, deep page and fragment land at the matching Render URL | Claude after owner switch | Not run |
| Student iPad on school Wi-Fi plays a session from Render | Owner — required before classroom use | Not run |

## 9. Owner manual steps

Given step by step in the hand-off message: Render Blueprint creation, the Cloudflare allowlist edit, and the GitHub Pages source switch.

## 10. Rollback

GitHub Pages and the `vault7mathquest` relay keep working throughout. If Render fails, keep giving students the github.io address (or switch Pages back from `pages-forwarding` to `main`, `/ (root)`). The added allowlist origin is harmless.

## 11. Release workflow

DESIGN → CHANGE SPEC (this document) → IMPLEMENT → CHECKPOINT ("MathQuest Render frontend implementation checkpoint") → VERIFY (§8) → VERIFIED CHECKPOINT → RELEASE (README/brief) → DEPLOY (Render live; Pages forwarding; owner school-network check).
