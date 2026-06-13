# Consuming `@undeadliner/pya-*`

Published to **GitHub Packages** (`https://npm.pkg.github.com`). Packages are private to the scope owner, so consumers authenticate with `GITHUB_TOKEN` (CI) or a personal `read:packages` token (local installs without sibling checkout).

## In a consumer repo

### `.npmrc` (repo root, checked in)

```
@undeadliner:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

### `package.json`

```jsonc
{
  "dependencies": {
    "@undeadliner/pya-auth": "^0.1.0",
    "@undeadliner/pya-shared": "^0.1.0"
  }
}
```

### GitHub Actions

The built-in `GITHUB_TOKEN` already has `packages: read` once the workflow opts in:

```yaml
permissions:
  packages: read

steps:
  - run: bun install --frozen-lockfile
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Local installs (no sibling platform checkout)

You need a personal access token with the `read:packages` scope:

```bash
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxx
bun install
```

### Local cross-repo workspace (faster iteration on the platform — preferred)

When you're iterating on the platform itself, point the consumer at the sibling checkout via Bun overrides — same package names, no install round-trip and no token needed:

```jsonc
// pyaeats-app/package.json
{
  "dependencies": {
    "@undeadliner/pya-auth": "^0.1.0"
  },
  "overrides": {
    "@undeadliner/pya-auth": "file:../pya-platform/packages/auth"
  }
}
```

This is what `pyaeats-app` and `pyaserv` use during active development. The override resolves before bun looks at the registry, so day-to-day work needs no `NODE_AUTH_TOKEN` at all. CI checks out only the consumer (no sibling), so it falls through to the registry and uses the workflow's `GITHUB_TOKEN`.
