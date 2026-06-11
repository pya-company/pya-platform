# Phase 6 — refactor pyaeats-app onto pya-platform

Touches production. No big-bang — incremental, with rollback after every step.

## Pre-conditions

- [ ] `@pya/*` packages live on the chosen registry (see [`publishing.md`](./publishing.md)).
- [ ] `pyaeats-app` has a non-prod branch for the cutover (`phase-6-platform` or similar).
- [ ] Existing e2e green on `main` so we have a regression baseline.

## Order of operations (lowest risk → highest)

### 1. `@pya/shared` swap

The schemas are identical to `@pyaeats/shared`. Add `@pya/shared` as a dep alongside `@pyaeats/shared`, then sed-rename the imports file by file. Type-checker catches misses.

- Files touched: ~40 across `apps/api`, `apps/site`, `apps/admin`.
- Risk: schemas drift between the two shared packages mid-rollout.
- Mitigation: keep `@pyaeats/shared` re-exporting from `@pya/shared` during the swap; delete only after the last consumer is migrated.

### 2. `@pya/audit` + `@pya/email`

Both are new code, no existing equivalent to delete. Add deps, then change every `console.log(JSON.stringify({stream: 'audit', ...}))` to `audit({...})` and every Resend `fetch(...)` to `sendEmail(...)`.

- Files touched: `apps/api/src/features/auth/log.ts`, `features/orders/notify.ts`, a few others.
- Risk: minimal — both packages have stricter input validation than the ad-hoc helpers, so type errors flag mismatches.

### 3. `@pya/ui` + `@pya/tokens` swap

Replace `import '@pyaeats/tokens/index.css'` with `import '@pya/tokens/index.css'` and `from '@pyaeats/ui'` with `from '@pya/ui'`. CSS variables are byte-identical between the two; visual regression should be zero.

- Visual smoke test: load each route in the prod-built site and diff against pre-cutover screenshots.

### 4. `@pya/auth` cutover (the big one)

`apps/api/src/features/auth/*` already lives in `@pya/auth`. The refactor:

```ts
// apps/api/src/index.ts
import { passwordlessRoutes, oauthRoutes, createDevBypassRoutes, requireAuth } from '@pya/auth'
import { sweepStalePlaced } from './features/orders/cron.ts'

app.route('/api/auth', passwordlessRoutes)
app.route('/api/auth', oauthRoutes)
app.route('/api/auth/dev', createDevBypassRoutes({ onCronSweep: sweepStalePlaced }))
app.use('/v1/*', requireAuth)
```

Then `rm -rf apps/api/src/features/auth apps/api/src/infra/kv/session-store.ts apps/api/src/shared/errors.ts`.

- Risk: highest. Auth touches every authenticated request.
- Strategy: deploy to preview first, run full e2e (including the green-path demo with passkey enroll/login). Only promote to prod when preview is clean.

### 5. Lift real code into `@pya/{cf,reviews,comments,cms}`

These four packages ship as scaffolds today. Phase 6 is the right time to lift their code in — doing it earlier would mean fixing the same imports in two places when this refactor lands.

For each:
1. Copy `apps/api/src/features/<feature>/*.ts` → `pya-platform/packages/<feature>/src/*.ts`.
2. Generalise the table-name / env-binding parameter (notes in each scaffold's `index.ts`).
3. Replace the pyaeats-app feature dir with a thin re-export from `@pya/<feature>`.
4. `bun run type-check` from both repo roots; deploy to preview.

Each takes ~1h. Doing them sequentially gives 4 clean rollback points.

## Acceptance per step

After every step:
- [ ] `bun run type-check` clean across pyaeats-app.
- [ ] Existing Playwright e2e green.
- [ ] Preview deploy smokes the changed surface.
- [ ] Manual MCP-browser pass on the prod URL after promotion.

Only when all 5 steps land does the `@pyaeats/shared` / `@pyaeats/tokens` / `@pyaeats/ui` packages get deleted entirely from pyaeats-app.

## Estimated effort

| Step | Time | Risk |
|---|---|---|
| 1 — `@pya/shared` | 1 h | low |
| 2 — `@pya/audit` + `@pya/email` | 1 h | low |
| 3 — `@pya/ui` + `@pya/tokens` | 1 h | low-medium (visual regression) |
| 4 — `@pya/auth` | 3-4 h | **high** — full preview e2e first |
| 5 — `@pya/{cf,reviews,comments,cms}` | 4 h | medium |

Total: ~10 h, ideally one focused session per step.
