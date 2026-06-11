# Consuming `@undeadliner/pya-*`

Published to **GitHub Packages** under the `@undeadliner` scope, since GH Packages requires the npm scope to match the repository owner. Brand identity is preserved in the package suffix (`@undeadliner/pya-auth`, not `@undeadliner/auth`) so a future org migration is a flat rename.

## In a consumer repo

### `.npmrc` (repo root)

```
@undeadliner:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
```

Local devs need a PAT with `read:packages` scope in their shell env:

```bash
export GH_PACKAGES_TOKEN=ghp_xxxxxxxxxxxx
bun install
```

### GitHub Actions

CI doesn't need a PAT — `GITHUB_TOKEN` carries `packages: read` once the workflow opts in:

```yaml
permissions:
  packages: read
steps:
  - run: echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Local cross-repo workspace (no token needed)

When you're iterating on the platform itself, drop the registry deps and point at the sibling checkout via Bun overrides — same package names, no install round-trip:

```jsonc
// pyaeats-app/package.json
{
  "dependencies": {
    "@undeadliner/pya-auth": "*"
  },
  "overrides": {
    "@undeadliner/pya-auth": "file:../pya-platform/packages/auth"
  }
}
```

This is what `pyaeats-app` and `pyaserv` use today during the Phase 6 cutover, with the registry deps activated once each app's CI is rewired.
