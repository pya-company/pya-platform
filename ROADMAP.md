# Roadmap — pya-platform extraction

The plan agreed in the design session (2026-06-11). Each phase is a separate work block. We deliberately keep `pyaeats-app` deployable at the end of every phase — no half-extracted state in production.

## Phase 1 — git pyaeats-app ✅

Initial commit of the existing monorepo to `undeadliner/pyaeats-app`. Secret audit pass; `.env.local`, `.wrangler/`, perf reports, and journey snapshots stay out of git.

## Phase 2 — bootstrap pya-platform (current)

This repo. Skeleton with TypeScript / Biome / Bun workspaces / CI / Terraform layout. `@pya/shared`, `@pya/i18n`, `@pya/ui` exist as starter packages with a re-export shim, but no extracted code yet.

## Phase 3 — `@pya/auth`

Move `apps/api/src/features/auth/*` from pyaeats-app into a Hono router factory that takes `D1Database`, `KVNamespace`, and a config object. Includes:

- Passwordless (OTP + magic link)
- Passkey/WebAuthn enroll + login
- OAuth (Google + Apple + Facebook)
- Recovery codes
- Session middleware + Bearer + cookie + CSRF
- SQL migrations (`users`, `sessions`, `passkeys`, `recovery_codes`)

## Phase 4 — Content packages

Sequentially: `@pya/email`, `@pya/audit`, `@pya/reviews`, `@pya/comments`, `@pya/cms`. Each is a small, independent extraction; each follows the same pattern (Hono router factory + SQL migrations + admin UI building blocks).

## Phase 5 — `@pya/ui` shell

Topbar / Base layout / login pages / theme toggle / i18n init. Parameterize hardcoded `pyaeats` branding via slots and config.

## Phase 6 — Refactor pyaeats-app onto the platform

`apps/api` keeps only food-domain features (orders, stores, menu items, geo, hours). `apps/site` and `apps/admin` rewire imports to `@pya/*`. **One transitional release** where old code and new imports coexist; only then delete the now-duplicated code in `pyaeats-app`.

## Phase 7 — PyaServ

`undeadliner/pyaserv`. Two-sided services classifieds. Initial deploy: static Astro on GitHub Pages (no backend yet); two pages — `/specialists` (offer side) and `/clients` (request side). Backend on Cloudflare Workers comes later, on the same auth/i18n/UI shell.

A lite first cut of this phase happens in parallel with Phase 2 so we can publicly hold the `pyaserv.com` domain and start collecting interest.

## Phase 8 — Terraform IaC

Write `iac/modules/pya-cf-project` (D1 + KV + R2 + Pages + Workers + DNS + Email Routing). Existing pyaeats-app resources get imported into Terraform state (no recreation), then pyaserv gets a fresh `terraform apply` from the same module.

State backend: R2 bucket `pya-iac-state` in the same Cloudflare account.
