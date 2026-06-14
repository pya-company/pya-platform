import { UnauthorizedError } from '@pya-company/shared'
import type { SessionRecord } from '@pya-company/shared'
import { type deleteCookie, getCookie, type setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import {
  deleteSession,
  newSessionId,
  readSession,
  touchSession,
  writeSession,
} from './store/session-store.ts'

const COOKIE_NAME = 'pya_sid'
const COOKIE_NAME_ADMIN = 'pya_sid_admin'
const CSRF_COOKIE = 'pya_csrf'
const SESSION_LIFETIME_SEC = 60 * 60 * 24 * 30

interface SessionVariables {
  readonly session: SessionRecord
  readonly sid: string
}

/** Verify the session cookie, attach `session` + `sid` to context. */
export const requireAuth = createMiddleware<{
  Bindings: Env
  Variables: SessionVariables
}>(async (c, next) => {
  const isAdmin = c.req.url.startsWith(`${c.env.ADMIN_ORIGIN}/admin`)
  // Accept session either as cookie (same-site) or as Authorization: Bearer
  // (cross-origin preview where third-party cookies are blocked).
  const cookieSid = getCookie(c, isAdmin ? COOKIE_NAME_ADMIN : COOKIE_NAME)
  const auth = c.req.header('Authorization')
  const bearerSid = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : undefined
  const sid = cookieSid ?? bearerSid
  if (sid === undefined) {
    throw new UnauthorizedError({ reason: 'missing session token' })
  }
  const record = await readSession(c.env.SESSIONS, sid)
  if (record === undefined) {
    throw new UnauthorizedError({ reason: 'session not found or expired' })
  }
  // Sliding write-behind every 60s.
  await touchSession(c.env.SESSIONS, sid, record)
  c.set('session', record)
  c.set('sid', sid)
  await next()
})

/** SameSite policy: in production, site and api share a parent domain → Lax/Strict OK.
 *  In preview/staging, site (pages.dev) and api (workers.dev) are cross-site → require None. */
const customerSameSite = (env: Env): 'Lax' | 'None' =>
  env.ENVIRONMENT === 'production' ? 'Lax' : 'None'

export interface IssuedSession {
  readonly sid: string
  readonly csrf: string
}

export const issueSession = async (
  c: { env: Env; req: { header: (k: string) => string | undefined } },
  setCookieFn: typeof setCookie,
  isAdmin: boolean,
  baseRecord: Omit<SessionRecord, 'iat' | 'lastSeen' | 'ipHash' | 'uaHash'>,
): Promise<IssuedSession> => {
  const now = Math.floor(Date.now() / 1000)
  const ip = c.req.header('CF-Connecting-IP') ?? ''
  const ua = c.req.header('User-Agent') ?? ''
  const record: SessionRecord = {
    ...baseRecord,
    iat: now,
    lastSeen: now,
    ipHash: await sha256(ip + (c.env.SESSION_PEPPER ?? '')),
    uaHash: await sha256(ua),
  }
  const sid = newSessionId()
  await writeSession(c.env.SESSIONS, sid, record)
  const sameSite = isAdmin ? 'Strict' : customerSameSite(c.env)
  setCookieFn(c as never, isAdmin ? COOKIE_NAME_ADMIN : COOKIE_NAME, sid, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite,
    maxAge: SESSION_LIFETIME_SEC,
  })
  const csrf = newSessionId()
  setCookieFn(c as never, CSRF_COOKIE, csrf, {
    path: '/',
    secure: true,
    sameSite: customerSameSite(c.env),
    maxAge: SESSION_LIFETIME_SEC,
  })
  return { sid, csrf }
}

export const revokeSession = async (
  c: { env: Env },
  setCookieFn: typeof deleteCookie,
  sid: string,
  isAdmin: boolean,
): Promise<void> => {
  await deleteSession(c.env.SESSIONS, sid)
  setCookieFn(c as never, isAdmin ? COOKIE_NAME_ADMIN : COOKIE_NAME, { path: '/' })
  setCookieFn(c as never, CSRF_COOKIE, { path: '/' })
}

const sha256 = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
