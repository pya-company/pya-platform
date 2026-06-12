import {
  type OAuthProvider,
  OAuthProviderSchema,
  type OAuthState,
  OAuthStateSchema,
  type ProviderClaims,
} from '@pya-platform/shared'
import { UnauthorizedError } from '@pya-platform/shared'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import * as v from 'valibot'
import { provisionOrLink } from './identity-link.ts'
import { logAuth } from './log.ts'
import { exchangeAndVerifyApple } from './providers/apple.ts'
import { exchangeAndVerifyFacebook } from './providers/facebook.ts'
import { exchangeAndVerifyGoogle } from './providers/google.ts'
import { issueSession } from './session.ts'

export const buildRedirectUri = (env: Env, provider: OAuthProvider): string =>
  `${env.API_ORIGIN}/api/auth/callback/${provider}`

const exchangeForProvider = (
  env: Env,
  provider: OAuthProvider,
  redirectUri: string,
  code: string,
  state: OAuthState,
): Promise<ProviderClaims> => {
  switch (provider) {
    case 'google':
      return exchangeAndVerifyGoogle(env, redirectUri, code, state.verifier, state.nonce)
    case 'facebook':
      return exchangeAndVerifyFacebook(env, redirectUri, code, state.verifier, state.nonce)
    case 'apple':
      return exchangeAndVerifyApple(env, redirectUri, code, state.verifier, state.nonce)
  }
}

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const outcomeOf = (created: boolean, linked: boolean): 'created' | 'linked' | 'reused' =>
  created ? 'created' : linked ? 'linked' : 'reused'

export const handleOAuthCallback = async (c: Context<{ Bindings: Env }>): Promise<Response> => {
  const provider = v.parse(OAuthProviderSchema, c.req.param('provider'))

  const code = c.req.query('code')
  const stateQ = c.req.query('state')
  const cookieState = getCookie(c, 'pya_oauth_state')
  deleteCookie(c, 'pya_oauth_state', { path: '/api/auth' })

  if (
    code === undefined ||
    stateQ === undefined ||
    cookieState === undefined ||
    stateQ !== cookieState
  ) {
    throw new UnauthorizedError({ reason: 'invalid state' })
  }

  const raw = await c.env.OAUTH_STATE.get(`oauth:state:${stateQ}`, { type: 'json' })
  if (raw === null) {
    throw new UnauthorizedError({ reason: 'expired or replayed state' })
  }
  await c.env.OAUTH_STATE.delete(`oauth:state:${stateQ}`)

  const stateRecord = v.parse(OAuthStateSchema, raw)
  if (stateRecord.provider !== provider) {
    throw new UnauthorizedError({ reason: 'provider mismatch' })
  }

  const redirectUri = buildRedirectUri(c.env, provider)
  const claims = await exchangeForProvider(c.env, provider, redirectUri, code, stateRecord)

  const link = await provisionOrLink(
    c.env.DB,
    claims,
    stateRecord.intent ?? 'login',
    stateRecord.currentUserId,
  )

  const ip = c.req.header('CF-Connecting-IP') ?? ''
  logAuth({
    event: 'auth.login.oauth',
    ts: Math.floor(Date.now() / 1000),
    userId: link.userId,
    provider,
    ipHash: await sha256Hex(ip + (c.env.SESSION_PEPPER ?? '')),
    outcome: outcomeOf(link.created, link.linked),
  })

  await issueSession(c, setCookie, false, {
    userId: link.userId,
    roles: ['customer'],
    storeIds: [],
  })

  return c.redirect(stateRecord.redirectAfter, 302)
}
