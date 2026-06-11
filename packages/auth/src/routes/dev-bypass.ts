import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { uuidV7 } from '@undeadliner/pya-shared'
import { writeSession, newSessionId } from '../store/session-store.ts'
import { ForbiddenError } from '@undeadliner/pya-shared'

// Optional sweep hook the host app can inject (e.g. PyaEats wires up its
// stale-order cancel sweep). The router accepts undefined and skips
// /cron-sweep when not provided.
type DevSweepFn = (env: Env) => Promise<Record<string, unknown>>

const COOKIE_NAME = 'pya_sid'
const CSRF_COOKIE = 'pya_csrf'
const SESSION_LIFETIME_SEC = 60 * 60 * 24 * 30

/** Dev-only "magic login" — creates a fake customer session.
 *  Disabled in production (ENVIRONMENT==='production' returns 403). */
export const createDevBypassRoutes = (opts: { readonly onCronSweep?: DevSweepFn } = {}): Hono<{ Bindings: Env }> => {
  const app = new Hono<{ Bindings: Env }>()

app.post('/login', async (c) => {
  if (c.env.ENVIRONMENT === 'production') {
    throw new ForbiddenError({ required: 'non-production environment' })
  }

  const email = c.req.query('email') ?? `dev+${Date.now()}@pya.local`
  const role = (c.req.query('role') ?? 'customer') as 'customer' | 'store_owner' | 'admin'
  const now = Math.floor(Date.now() / 1000)

  // Reuse the existing user when the email is already registered — otherwise
  // we'd write a session keyed on a userId that points to nothing in `users`.
  const existing = await c.env.DB
    .prepare("SELECT id FROM users WHERE email = ? AND status != 'deleted'")
    .bind(email)
    .first<{ id: string }>()
  const userId = existing?.id ?? uuidV7()
  if (existing === null) {
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, email_verified, display_name, locale, created_at, status)
       VALUES (?, ?, 1, ?, 'es-PY', ?, 'active')`
    ).bind(userId, email, `Dev ${role}`, now).run()
  }

  const sid = newSessionId()
  const ipHash = await sha256((c.req.header('CF-Connecting-IP') ?? '') + (c.env.SESSION_PEPPER ?? ''))
  const uaHash = await sha256(c.req.header('User-Agent') ?? '')

  await writeSession(c.env.SESSIONS, sid, {
    userId, roles: [role], storeIds: [], iat: now, lastSeen: now, ipHash, uaHash,
  })

  // Preview/staging serves site and api from different eTLD+1 (pages.dev vs workers.dev),
  // so cookies must be SameSite=None to ride cross-origin fetches.
  // Note: production branch was thrown above, so ENVIRONMENT is narrowed to 'preview' | 'staging'.
  const sameSite: 'None' = 'None'
  const csrfToken = newSessionId()
  setCookie(c, COOKIE_NAME, sid, {
    path: '/', httpOnly: true, secure: true, sameSite, maxAge: SESSION_LIFETIME_SEC,
  })
  setCookie(c, CSRF_COOKIE, csrfToken, {
    path: '/', secure: true, sameSite, maxAge: SESSION_LIFETIME_SEC,
  })

  // Return sessionToken + csrfToken in body so cross-origin clients (preview deploys
  // where third-party cookies are blocked) can hold them and authenticate via
  // Authorization: Bearer + X-CSRF-Token headers on subsequent requests.
  return c.json({ ok: true, userId, email, role, sessionToken: sid, csrfToken })
})

const sha256 = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

  /** Dev-only manual trigger for a host-supplied sweep job. CF cron fires it
   *  on its own; this lets us verify the logic on demand from tests. */
  if (opts.onCronSweep !== undefined) {
    const sweep = opts.onCronSweep
    app.post('/cron-sweep', async (c) => {
      if (c.env.ENVIRONMENT === 'production') {
        throw new ForbiddenError({ required: 'non-production environment' })
      }
      const result = await sweep(c.env)
      return c.json({ ok: true, ...result })
    })
  }

  return app
}
