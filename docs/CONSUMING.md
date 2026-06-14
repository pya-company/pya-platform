# Consuming `@pya-company/*`

Published to **GitHub Packages** under the `pya-company` org. Packages inherit the visibility of their source repository — since `pya-company/pya-platform` is **public**, `@pya-company/*` are public too. **No authentication needed for install.**

## In a consumer repo

### `.npmrc` (repo root, checked in)

Just registry routing — no token line, because GH Packages serves public packages without auth:

```
@pya-company:registry=https://npm.pkg.github.com
```

### `package.json`

```jsonc
{
  "dependencies": {
    "@pya-company/auth": "^0.1.0",
    "@pya-company/shared": "^0.1.0"
  }
}
```

### GitHub Actions

Nothing special:

```yaml
- run: bun install --frozen-lockfile
```

### Local install

Just `bun install`. No `~/.npmrc`, no PAT, no `gh auth refresh`.

### Local cross-repo workspace (faster iteration on the platform)

When you're iterating on the platform itself, point the consumer at the sibling checkout via Bun overrides — same package names, no install round-trip:

```jsonc
// pyaeats-app/package.json
{
  "dependencies": {
    "@pya-company/auth": "^0.1.0"
  },
  "overrides": {
    "@pya-company/auth": "file:../pya-platform/packages/auth"
  }
}
```

This is what `pyaeats-app` and `pyaserv` use during active development.
