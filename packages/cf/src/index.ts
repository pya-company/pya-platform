// @pya-platform/cf — Cloudflare Workers helpers.
//
// What lands here in Phase 6:
//   - D1 migrations runner (timestamp-ordered, schema_migrations bookkeeping)
//   - KV typed wrappers (`kvGet<T>`, `kvPut<T>` with valibot validation)
//   - R2+KV media fallback (R2 when bound, MEDIA_KV when not — Phase 4-pyaeats had this)
//   - wrangler.jsonc schema validation helper
//
// All three concerns live in pyaeats-app's `apps/api/src/infra/*` today. They
// extract cleanly because none of them touch domain types — they're plumbing.

export {}
