// The shape every Pya host worker must supply to `@pya/auth` via `Bindings`.
// Hosts can extend this with their own bindings — Hono merges via intersection.
// Keep this interface narrow: only what auth itself touches.

export interface PyaAuthBindings {
  /** Primary database (sessions/users/passkeys/recovery_codes/audit) */
  readonly DB: D1Database
  /** Session KV — bound to a separate namespace from cache KVs */
  readonly SESSIONS: KVNamespace
  /** OAuth state KV — short-TTL nonces */
  readonly OAUTH_STATE: KVNamespace
  /** Deployment env — controls SameSite policy and dev-bypass gating */
  readonly ENVIRONMENT: 'development' | 'preview' | 'staging' | 'production'
  /** Customer-facing site origin (cookie domain anchoring) */
  readonly SITE_ORIGIN: string
  /** Admin site origin (separate cookie name) */
  readonly ADMIN_ORIGIN: string
  /** API self origin (for OAuth callback URL construction) */
  readonly API_ORIGIN: string

  /** Pepper for IP/UA hashes — rotate without invalidating sessions */
  readonly SESSION_PEPPER?: string
  /** CSRF HMAC signing key */
  readonly CSRF_HMAC_KEY?: string
  /** Cloudflare Turnstile secret (bot protection) */
  readonly TURNSTILE_SECRET?: string

  /** Resend API key (passwordless email) */
  readonly RESEND_API_KEY?: string
  /** Email "from" domain — must be verified in Resend */
  readonly EMAIL_DOMAIN?: string

  /** WebAuthn relying-party identifier (e.g. `pyaeats.com`) */
  readonly WEBAUTHN_RP_ID?: string
  /** Comma-separated allowed origins for WebAuthn assertions */
  readonly WEBAUTHN_ORIGINS?: string

  /** OAuth provider secrets — optional, providers without secrets return 501 */
  readonly GOOGLE_OAUTH_CLIENT_ID?: string
  readonly GOOGLE_OAUTH_CLIENT_SECRET?: string
  readonly FACEBOOK_APP_ID?: string
  readonly FACEBOOK_APP_SECRET?: string

  /** OAuth endpoint overrides (E2E sidecar). Defaults baked in providers/*.ts */
  readonly GOOGLE_AUTH_URL?: string
  readonly GOOGLE_TOKEN_URL?: string
  readonly GOOGLE_JWKS_URL?: string
}

// Re-exported as global `Env` so the existing code (which references `Env`
// directly via Hono's `Bindings`) compiles without further edits. Each host
// worker declares its own `Env` that extends `PyaAuthBindings` plus host-
// specific fields; that augmented `Env` is what Hono sees at runtime.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Env extends PyaAuthBindings {}
}
