# Consuming `@pya/*`

Published to **npmjs.org** under the `pya` org. Packages are **public** — no auth needed to install.

## In a consumer repo

### `package.json`

```jsonc
{
  "dependencies": {
    "@pya/auth": "^0.1.0",
    "@pya/shared": "^0.1.0"
  }
}
```

`bun install` works out of the box. No `.npmrc`, no token.

### GitHub Actions

Nothing special:

```yaml
- run: bun install --frozen-lockfile
```

### Local cross-repo workspace (faster iteration on the platform)

When you're iterating on the platform itself, point the consumer at the sibling checkout via Bun overrides — same package names, no install round-trip:

```jsonc
// pyaeats-app/package.json
{
  "dependencies": {
    "@pya/auth": "^0.1.0"
  },
  "overrides": {
    "@pya/auth": "file:../pya-platform/packages/auth"
  }
}
```

This is what `pyaeats-app` and `pyaserv` use during active development. CI checks out only the consumer, so `bun install` resolves through the registry instead (overrides on a missing sibling fall back to the dep). Drop the overrides for prod-only branches if you want a registry-pinned build.
