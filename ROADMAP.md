# Roadmap — pya-platform extraction

The plan agreed in the design session (2026-06-11). Each phase is a separate work block. We deliberately keep `pyaeats-app` deployable at the end of every phase — no half-extracted state in production.

## Phase 1 — git pyaeats-app ✅

Initial commit of the existing monorepo to `undeadliner/pyaeats-app`. Secret audit pass; `.env.local`, `.wrangler/`, perf reports, and journey snapshots stay out of git.

## Phase 2 — bootstrap pya-platform (current)

This repo. Skeleton with TypeScript / Biome / Bun workspaces / CI / Terraform layout. `@pya-company/shared`, `@pya-company/i18n`, `@pya-company/ui` exist as starter packages with a re-export shim, but no extracted code yet.

## Phase 3 — `@pya-company/auth` ✅

All 14 source files + 3 migrations moved into `packages/auth/`:
- `routes/passwordless.ts` — OTP + magic link + passkey enrollment
- `routes/oauth.ts` + `providers/{google,apple,facebook}.ts` — OAuth flow
- `routes/dev-bypass.ts` — generalised: accepts an optional `onCronSweep` hook so the host app (PyaEats) wires in its food-specific cron without polluting auth
- `session.ts` — `requireAuth` middleware + `issueSession`/`revokeSession` (Bearer + cookie + CSRF, env-aware SameSite)
- `recovery-codes.ts`, `identity-link.ts`, `webauthn.ts`, `log.ts`
- `store/{session-store,otp-store,passkey-store}.ts`
- `migrations/{0001_users_sessions,0002_passkeys,0003_recovery_codes}.sql`

Env contract in `env.ts` (`PyaAuthBindings`) — declared as a global `Env` augmentation so existing code compiles unchanged. Type-checks clean.

## Phase 4 — Content packages ✅ (partial)

Fully written:
- `@pya-company/email` — `sendEmail()` Resend wrapper, never-throws, audit-logs on failure
- `@pya-company/audit` — `audit()` structured stdout writer for the `audit` stream

Scaffolds (package.json + tsconfig + TODO-stub `index.ts`):
- `@pya-company/cf` — D1 migrations runner, KV typed wrappers, R2+KV media fallback (3 plumbing modules in pyaeats-app's `infra/`)
- `@pya-company/reviews` — repo extraction trivial (single file, generic over `targetId`)
- `@pya-company/comments` — same
- `@pya-company/cms` — articles repo + routes

The scaffolded packages all type-check empty. Phase 6 lifts the real code in one pass alongside the pyaeats-app refactor so we don't double-maintain.

## Phase 5 — `@pya-company/ui` shell (placeholder)

Tokens CSS + `<Topbar>` + login pages + theme toggle still live in pyaeats-app. The `@pya-company/ui` package has a starter `tokens.css` to anchor the eventual move.

## Phase 6 — Refactor pyaeats-app onto the platform

`apps/api` keeps only food-domain features (orders, stores, menu items, geo, hours). `apps/site` and `apps/admin` rewire imports to `@pya-company/*`. **One transitional release** where old code and new imports coexist; only then delete the now-duplicated code in `pyaeats-app`. Phase 6 also lifts the real reviews/comments/cms/cf code into the scaffolded packages — doing it now would mean fixing the same imports in two places when the refactor lands.

## Phase 7 — PyaServ

`undeadliner/pyaserv`. Two-sided services classifieds. Initial deploy: static Astro on GitHub Pages (no backend yet); two pages — `/specialists` (offer side) and `/clients` (request side). Backend on Cloudflare Workers comes later, on the same auth/i18n/UI shell.

A lite first cut of this phase happens in parallel with Phase 2 so we can publicly hold the `pyaserv.com` domain and start collecting interest.

## Phase 8 — Terraform IaC ✅ (scaffold)

`iac/modules/pya-cf-project/` is in place with `versions.tf`, `variables.tf`, `main.tf`, `outputs.tf`, and an import playbook in the module README. Provisions D1 + 4 KV namespaces + (optional) R2 + Pages project + DNS records.

Outstanding before the first real `terraform apply`:
- Worker resource + custom-domain route (Pages is in; Workers TBD)
- Email Routing rule (CF provider still unstable for this — dashboard-only for now)
- R2-backed remote state (`pya-iac-state` bucket — gated on R2 ticket)
- Import of pyaeats-app resources (instructions in module README)

State backend: R2 bucket `pya-iac-state` in the same Cloudflare account.
