# pya-platform

Reusable engine that powers PyaEats, PyaServ, and future Pya projects.

The platform exposes a fleet of `@pya-platform/*` npm packages, a Terraform module that provisions a brand-new Cloudflare project (`D1 + KV + R2 + Pages + Workers + DNS + Email Routing`), and project templates for `bunx create-pya-app`.

## What lives here

| Package           | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `@pya-platform/shared`     | Valibot schemas, id helpers, money/time primitives, common types          |
| `@pya-platform/i18n`       | `getT` dictionary helper, locale routing utilities                        |
| `@pya-platform/ui`         | Lit web components, BEM design tokens, layout shells, login flow UI       |
| `@pya-platform/auth`       | Passwordless (OTP + magic link), passkey/WebAuthn, OAuth, recovery codes, sessions (KV), CSRF |
| `@pya-platform/email`      | Resend wrapper, `notifyOnTransition` helper, i18n templates               |
| `@pya-platform/cms`        | Articles CRUD with AI-translation banner + GitHub PR-back links            |
| `@pya-platform/reviews`    | 5-star ratings, running-average rounding, owner reply, generic over `targetId` |
| `@pya-platform/comments`   | Threaded comments on any entity                                            |
| `@pya-platform/audit`      | Audit log scaffolding                                                      |
| `@pya-platform/cf`         | Cloudflare Workers helpers — D1 migrations runner, KV typed wrappers, R2+KV media fallback |

| Path             | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `iac/modules/`   | Terraform modules — each Pya project consumes `pya-cf-project`          |
| `docs/`          | Architecture decisions, package boundaries, extraction roadmap          |

## Consumers

- [`pyaeats-app`](https://github.com/undeadliner/pyaeats-app) — food delivery (Paraguay)
- [`pyaserv`](https://github.com/undeadliner/pyaserv) — services classifieds (Paraguay)

## Status

Phase 2 of the extraction. The repo is a real skeleton — TypeScript config, lint config, CI workflow, and package boundaries are in place. Most `@pya-platform/*` packages are placeholders (just `package.json` + `src/index.ts` re-export stub); the canonical code still lives in `pyaeats-app` and will be migrated package-by-package per [`ROADMAP.md`](./ROADMAP.md).

## Development

```bash
nvm use            # node 22
bun install
bun run type-check
bun run lint
bun run test
```
