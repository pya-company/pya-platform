---
'@undeadliner/pya-shared': minor
'@undeadliner/pya-i18n': minor
'@undeadliner/pya-tokens': minor
'@undeadliner/pya-ui': minor
'@undeadliner/pya-auth': minor
'@undeadliner/pya-email': minor
'@undeadliner/pya-audit': minor
'@undeadliner/pya-cf': minor
'@undeadliner/pya-reviews': minor
'@undeadliner/pya-comments': minor
'@undeadliner/pya-cms': minor
---

Initial release of the Pya platform packages. Extracted from `pyaeats-app`, consumed by `pyaeats-app` (food delivery) and `pyaserv` (services classifieds).

Each package exposes a Hono router factory (auth/cms/reviews/comments) or a typed helper (email/audit/cf) parameterised over Cloudflare D1 + KV bindings. UI primitives ship as Lit web components on top of `@undeadliner/pya-tokens` (CSS custom properties). See `ROADMAP.md` and `docs/phase-6-rollout.md` for the consumer cutover plan.
