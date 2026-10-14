# MathQuest Render frontend — deployment record

**Live:** https://mcada-mathquest.onrender.com/ · **Deployed commit:** `39660e2` (merge of implementation checkpoint `a1f70c8`) · Worker `mathquest-prototype` 0.11.0 (unchanged)
Checked 14 October 2026 (Asia/Shanghai) by Claude in the owner's built-in desktop browser (Chromium, desktop). Not a physical iPad or school-network test.

| Check | Result |
| --- | --- |
| `/api/health` through Render's rewrite reports MathQuest 0.11.0 | Passed |
| Connection test page 1.1.0: game page loaded; session server connected (0.11.0, 1763 modules); two-way access passed | Passed |
| POST through the rewrite (`POST /api/health` → 200) with the Render origin, so the Cloudflare allowlist edit is live | Passed |
| Served bytes equal the commit (SHA-256) for `index.html`, `app.js`, `hosting.js`, `connection-test.html` | Passed |
| Every request on the homepage and connection test went to `mcada-mathquest.onrender.com` only | Passed |
| Teacher creates a room; student joins from a second device; QR points to Render | Not run (owner) |
| Journey combat starts from the Render origin | Not run (owner) |
| github.io forwards to Render (`pages-forwarding`) | Not run — Pages switch pending |
| Student iPad on school Wi-Fi plays a session | Not run (owner) — required before classroom use |
