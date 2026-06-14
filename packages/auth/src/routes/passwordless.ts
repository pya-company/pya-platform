import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import {
  OtpVerifyBodySchema,
  PasskeyAuthVerifyBodySchema,
  PasskeyRegisterVerifyBodySchema,
  type ProviderClaims,
  type Role,
  RoleSchema,
  StartBodySchema,
} from '@pya-company/shared'
import { ForbiddenError, UnauthorizedError, ValidationError } from '@pya-company/shared'
import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import * as v from 'valibot'
import { provisionOrLink } from '../identity-link.ts'
import { logAuth } from '../log.ts'
import {
  countUnusedCodes,
  invalidateAllPasskeysForUser,
  redeemRecoveryCode,
  regenerateRecoveryCodes,
} from '../recovery-codes.ts'
import { issueSession, requireAuth, revokeSession } from '../session.ts'
import { generateCode, maskEmail, sendOtpEmail, storeOtp, verifyOtp } from '../store/otp-store.ts'
import {
  countPasskeysByUser,
  deletePasskey,
  findPasskeyByCredentialId,
  findPasskeysByUser,
  insertPasskey,
} from '../store/passkey-store.ts'
import {
  genAuthOptions,
  genRegOptions,
  uint8ToBase64url,
  verifyAuth,
  verifyReg,
} from '../webauthn.ts'

const REDIRECT_ALLOWLIST: ReadonlyArray<RegExp> = [
  /^\/$/,
  /^\/stores\/[a-z0-9-]+$/,
  /^\/cart$/,
  /^\/checkout$/,
  /^\/orders\/[a-z0-9-]+$/,
  /^\/profile$/,
]
const safeRedirect = (input: string | undefined): string => {
  if (input === undefined) return '/'
  return REDIRECT_ALLOWLIST.some((re) => re.test(input)) ? input : '/'
}

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const parseOrThrow = <T>(schema: v.GenericSchema<unknown, T>, raw: unknown): T => {
  const parsed = v.safeParse(schema, raw)
  if (!parsed.success) {
    throw new ValidationError({
      issues: parsed.issues.map((i) => ({
        path: i.path?.map((p) => String(p.key)).join('.') ?? 'body',
        message: i.message,
      })),
    })
  }
  return parsed.output as T
}

const findUserByEmail = async (
  db: D1Database,
  email: string,
): Promise<{ id: string; email: string } | undefined> => {
  const r = await db
    .prepare("SELECT id, email FROM users WHERE email = ? AND status != 'deleted'")
    .bind(email)
    .first<{ id: string; email: string }>()
  return r === null ? undefined : r
}

/** Load distinct roles + owned/staffed store IDs for the session payload.
 *  Always includes 'customer' so anyone can place orders. Unknown role rows
 *  (schema drift) are dropped via Valibot parse. */
const loadSessionRoles = async (
  db: D1Database,
  userId: string,
): Promise<{ roles: Role[]; storeIds: string[] }> => {
  const { results } = await db
    .prepare('SELECT role, store_id FROM roles WHERE user_id = ?')
    .bind(userId)
    .all<{ role: string; store_id: string | null }>()
  const roleSet = new Set<Role>(['customer'])
  const storeIds: string[] = []
  for (const r of results) {
    const parsed = v.safeParse(RoleSchema, r.role)
    if (!parsed.success) continue
    roleSet.add(parsed.output)
    if (
      r.store_id !== null &&
      (parsed.output === 'store_owner' || parsed.output === 'store_staff')
    ) {
      storeIds.push(r.store_id)
    }
  }
  return { roles: [...roleSet], storeIds }
}

const app = new Hono<{ Bindings: Env }>()

// ───── /start ─────
// Two branches:
//   has passkey → return passkey auth options (no OTP)
//   else        → send OTP (code + magic link in email)
// `force:'otp'` skips the passkey check and always sends OTP.
app.post('/start', async (c) => {
  const body = parseOrThrow(StartBodySchema, await c.req.json())
  const email = body.email.toLowerCase()
  const redirectAfter = safeRedirect(body.redirect)

  if (body.force !== 'otp') {
    const user = await findUserByEmail(c.env.DB, email)
    if (user !== undefined) {
      const passkeys = await findPasskeysByUser(c.env.DB, user.id)
      if (passkeys.length > 0) {
        const options = await genAuthOptions(c.env, passkeys)
        await c.env.OAUTH_STATE.put(
          `webauthn:auth:${await sha256Hex(email)}`,
          JSON.stringify({ challenge: options.challenge, redirectAfter, ts: Date.now() }),
          { expirationTtl: 300 },
        )
        return c.json({ method: 'passkey' as const, options })
      }
    }
  }

  const code = generateCode()
  await storeOtp(c.env.OAUTH_STATE, c.env, email, code, redirectAfter)
  await sendOtpEmail(c.env, email, code)
  return c.json({ method: 'otp' as const, sentTo: maskEmail(email) })
})

// ───── /otp/verify ─────
app.post('/otp/verify', async (c) => {
  const body = parseOrThrow(OtpVerifyBodySchema, await c.req.json())
  const email = body.email.toLowerCase()

  const result = await verifyOtp(c.env.OAUTH_STATE, c.env, email, body.code)
  if (result.status === 'expired') throw new UnauthorizedError({ reason: 'code_expired' })
  if (result.status === 'locked') throw new UnauthorizedError({ reason: 'too_many_attempts' })
  if (result.status === 'invalid') {
    throw new UnauthorizedError({ reason: `invalid_code:${result.remaining}_remaining` })
  }

  const claims: ProviderClaims = {
    provider: 'email',
    subject: email,
    email,
    emailVerified: true,
  }
  const link = await provisionOrLink(c.env.DB, claims, 'login', undefined)
  const passkeyCount = await countPasskeysByUser(c.env.DB, link.userId)

  const ip = c.req.header('CF-Connecting-IP') ?? ''
  logAuth({
    event: 'auth.login.email',
    ts: Math.floor(Date.now() / 1000),
    userId: link.userId,
    provider: 'email',
    ipHash: await sha256Hex(ip + (c.env.SESSION_PEPPER ?? '')),
    outcome: link.created ? 'created' : link.linked ? 'linked' : 'reused',
  })

  const { roles, storeIds } = await loadSessionRoles(c.env.DB, link.userId)
  const session = await issueSession(c, setCookie, false, {
    userId: link.userId,
    roles,
    storeIds,
  })

  return c.json({
    ok: true,
    sid: session.sid,
    csrf: session.csrf,
    hasPasskey: passkeyCount > 0,
    redirect: result.record.redirectAfter,
  })
})

// ───── /passkey/auth/verify ─────
app.post('/passkey/auth/verify', async (c) => {
  const body = parseOrThrow(PasskeyAuthVerifyBodySchema, await c.req.json())
  const email = body.email.toLowerCase()

  const stateKey = `webauthn:auth:${await sha256Hex(email)}`
  const state = await c.env.OAUTH_STATE.get<{ challenge: string; redirectAfter: string }>(
    stateKey,
    {
      type: 'json',
    },
  )
  if (state === null) throw new UnauthorizedError({ reason: 'challenge_expired' })
  await c.env.OAUTH_STATE.delete(stateKey)

  const user = await findUserByEmail(c.env.DB, email)
  if (user === undefined) throw new UnauthorizedError({ reason: 'no_user' })

  const assertion = body.assertion as unknown as AuthenticationResponseJSON
  const passkey = await findPasskeyByCredentialId(c.env.DB, assertion.id)
  if (passkey === undefined || passkey.userId !== user.id) {
    throw new UnauthorizedError({ reason: 'unknown_credential' })
  }

  const verified = await verifyAuth(c.env, assertion, state.challenge, passkey)
  if (!verified.verified) throw new UnauthorizedError({ reason: 'assertion_invalid' })

  await c.env.DB.prepare(
    'UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE credential_id = ?',
  )
    .bind(
      verified.authenticationInfo.newCounter,
      Math.floor(Date.now() / 1000),
      passkey.credentialId,
    )
    .run()

  const ip = c.req.header('CF-Connecting-IP') ?? ''
  logAuth({
    event: 'auth.login.passkey',
    ts: Math.floor(Date.now() / 1000),
    userId: user.id,
    provider: 'email',
    ipHash: await sha256Hex(ip + (c.env.SESSION_PEPPER ?? '')),
    outcome: 'reused',
  })

  const { roles, storeIds } = await loadSessionRoles(c.env.DB, user.id)
  const session = await issueSession(c, setCookie, false, {
    userId: user.id,
    roles,
    storeIds,
  })

  return c.json({
    ok: true,
    sid: session.sid,
    csrf: session.csrf,
    redirect: state.redirectAfter,
  })
})

// ───── /passkey/register/options ─────  (requires session)
app.post('/passkey/register/options', requireAuth, async (c) => {
  const session = c.get('session')
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(session.userId)
    .first<{ email: string }>()
  if (user === null) throw new ForbiddenError({ required: 'user' })

  const existing = await findPasskeysByUser(c.env.DB, session.userId)
  const options = await genRegOptions(c.env, session.userId, user.email, existing)
  const challengeId = crypto.randomUUID()
  await c.env.OAUTH_STATE.put(
    `webauthn:reg:${challengeId}`,
    JSON.stringify({ userId: session.userId, challenge: options.challenge, ts: Date.now() }),
    { expirationTtl: 300 },
  )
  return c.json({ challengeId, options })
})

// ───── /passkey/register/verify ─────  (requires session)
app.post('/passkey/register/verify', requireAuth, async (c) => {
  const body = parseOrThrow(PasskeyRegisterVerifyBodySchema, await c.req.json())
  const session = c.get('session')

  const stateKey = `webauthn:reg:${body.challengeId}`
  const state = await c.env.OAUTH_STATE.get<{ userId: string; challenge: string }>(stateKey, {
    type: 'json',
  })
  if (state === null || state.userId !== session.userId) {
    throw new UnauthorizedError({ reason: 'challenge_expired' })
  }
  await c.env.OAUTH_STATE.delete(stateKey)

  const attestation = body.attestation as unknown as RegistrationResponseJSON
  const verified = await verifyReg(c.env, attestation, state.challenge)
  if (!verified.verified || verified.registrationInfo === undefined) {
    throw new UnauthorizedError({ reason: 'attestation_invalid' })
  }

  const info = verified.registrationInfo
  await insertPasskey(c.env.DB, {
    credentialId: info.credential.id,
    userId: session.userId,
    publicKey: uint8ToBase64url(info.credential.publicKey),
    signCount: info.credential.counter,
    transports: info.credential.transports ?? [],
    label: body.label,
    backupEligible: info.credentialBackedUp,
    backupState: info.credentialBackedUp,
  })

  logAuth({
    event: 'auth.passkey.registered',
    ts: Math.floor(Date.now() / 1000),
    userId: session.userId,
    provider: 'email',
    outcome: 'created',
  })

  return c.json({ ok: true })
})

// ───── /passkeys (list, delete) — requires session ─────
app.get('/passkeys', requireAuth, async (c) => {
  const session = c.get('session')
  const rows = await findPasskeysByUser(c.env.DB, session.userId)
  return c.json({
    items: rows.map((p) => ({
      credentialId: p.credentialId,
      label: p.label,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    })),
  })
})

app.delete('/passkeys/:id', requireAuth, async (c) => {
  const session = c.get('session')
  await deletePasskey(c.env.DB, c.req.param('id'), session.userId)
  return c.json({ ok: true })
})

// ───── /logout ─────
// ───── recovery codes ─────

/** Authenticated. Generates 8 fresh codes; replaces any prior set
 *  (the plaintext is shown ONCE and the user is responsible for saving). */
app.post('/recovery/generate', requireAuth, async (c) => {
  const session = c.get('session')
  const set = await regenerateRecoveryCodes(c.env.DB, session.userId)
  logAuth({
    event: 'auth.recovery.generated',
    ts: Math.floor(Date.now() / 1000),
    userId: session.userId,
    provider: 'recovery',
    ipHash: await sha256Hex(
      (c.req.header('CF-Connecting-IP') ?? '') + (c.env.SESSION_PEPPER ?? ''),
    ),
    outcome: 'reused',
  })
  return c.json({ data: set })
})

/** Authenticated. Reports how many unused codes are left so the UI can warn
 *  when the bag is empty / down to 1-2. */
app.get('/recovery/status', requireAuth, async (c) => {
  const session = c.get('session')
  const unused = await countUnusedCodes(c.env.DB, session.userId)
  return c.json({ data: { unused, total: 8 } }, 200, { 'Cache-Control': 'private, no-store' })
})

/** PUBLIC — last-resort login when both passkey and email OTP are unreachable.
 *  Marks the code used, wipes ALL passkeys (force re-enroll because a leaked
 *  code means the account is compromised), and mints a session. */
const RecoveryRedeemBody = v.object({
  email: v.pipe(v.string(), v.email()),
  code: v.pipe(v.string(), v.minLength(8), v.maxLength(32)),
})
app.post('/recovery/redeem', async (c) => {
  const body = parseOrThrow(RecoveryRedeemBody, await c.req.json())
  const email = body.email.toLowerCase()

  // biome-ignore lint/style/useNamingConvention: D1 raw columns
  type UserRow = { id: string }
  const userRow = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email = ? AND status != 'deleted'",
  )
    .bind(email)
    .first<UserRow>()
  if (userRow === null) {
    // Don't disclose existence; same error path as a wrong code.
    throw new UnauthorizedError({ reason: 'invalid_recovery' })
  }
  const result = await redeemRecoveryCode(c.env.DB, userRow.id, body.code)
  if (!result.ok) throw new UnauthorizedError({ reason: 'invalid_recovery' })

  // Security: wipe every passkey. The legitimate user re-enrolls.
  await invalidateAllPasskeysForUser(c.env.DB, userRow.id)

  logAuth({
    event: 'auth.login.recovery',
    ts: Math.floor(Date.now() / 1000),
    userId: userRow.id,
    provider: 'recovery',
    ipHash: await sha256Hex(
      (c.req.header('CF-Connecting-IP') ?? '') + (c.env.SESSION_PEPPER ?? ''),
    ),
    outcome: 'reused',
  })

  const { roles, storeIds } = await loadSessionRoles(c.env.DB, userRow.id)
  const session = await issueSession(c, setCookie, false, {
    userId: userRow.id,
    roles,
    storeIds,
  })
  return c.json({ ok: true, sid: session.sid, csrf: session.csrf, passkeysWiped: true })
})

app.post('/logout', requireAuth, async (c) => {
  const sid = c.get('sid')
  // Best-effort: revoke for both customer and admin cookie names.
  await revokeSession({ env: c.env }, deleteCookie, sid, false)
  await revokeSession({ env: c.env }, deleteCookie, sid, true)
  return c.json({ ok: true })
})

export { app as passwordlessRoutes }
