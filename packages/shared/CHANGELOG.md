# @pya/shared

## 0.1.0

### Minor Changes

- a9ca6bf: Initial release of the Pya platform packages. Extracted from `pyaeats-app`, consumed by `pyaeats-app` (food delivery) and `pyaserv` (services classifieds).

  Each package exposes a Hono router factory (auth/cms/reviews/comments) or a typed helper (email/audit/cf) parameterised over Cloudflare D1 + KV bindings. UI primitives ship as Lit web components on top of `@pya/tokens` (CSS custom properties). See `ROADMAP.md` and `docs/phase-6-rollout.md` for the consumer cutover plan.
