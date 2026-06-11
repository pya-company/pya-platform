# `@pya/*` package publishing — decision needed before Phase 6

## State

All 11 packages compile and re-export real code (see `ROADMAP.md`). What's missing: a registry consumers can `bun install` from. Phase 6 (refactor pyaeats-app onto the platform) and Phase 7 (PyaServ backend) both need this resolved.

## Constraint discovered late

GitHub Packages **requires** the npm scope to match the repository owner. So `@pya/auth` published from `undeadliner/pya-platform` would have to be **`@undeadliner/auth`** — which fights the brand naming we set up.

## Three real options

### A — Public npm.org (recommended)

Publish under the existing `@pya` scope on the public npm registry. Free, no token gymnastics for consumers, no name distortion.

**Trade-off**: the engine is public from day one. Anyone can build a "Pya-style app", which is arguably what we want anyway (the README already pitches it as a reusable engine).

**Steps:**
1. Create the `@pya` scope on npm.org (free with personal account).
2. `npm token create` for CI.
3. Add `NPM_TOKEN` to `undeadliner/pya-platform` repo secrets.
4. Add changeset config + `.github/workflows/release.yml` (changesets/action — handles versioning + publish).
5. Land a first changeset, merge, → packages live on npm.

### B — Create a `pyaeats` GitHub org, publish to GH Packages as `@pyaeats/*`

Rename brands across the board (CSS classes, docs already say "PyaEats"). Lots of mechanical churn.

**Trade-off**: keeps everything private, no public attack surface. Costs a brand-naming cleanup pass.

### C — Create a GitHub org `pya`, publish to GH Packages as `@pya/*`

Cleanest from a naming standpoint, but `pya` is short and may already be taken on GitHub. Cheap to check (`gh api orgs/pya`).

**Trade-off**: org creation + verifying name availability + adding consumer PAT setup (consumers must auth to GH Packages, public-org packages still require auth for download).

## Recommendation

**Go with A.** The engine is generic — auth, i18n, UI primitives, CMS — none of it is competitive moat. Public publishing matches reality and eliminates the consumer-side PAT setup that would slow every new Pya project bootstrap.

Action needed from you:

- [ ] Decide which option (A/B/C).
- [ ] If A: create `@pya` scope on npm.org, generate publish token, paste into repo secret `NPM_TOKEN`.
- [ ] If B or C: create GitHub org, transfer repos, paste PAT.

Once decided I'll add the release workflow + first changeset and we land `@pya/*@0.1.0` so Phase 6 can begin.
