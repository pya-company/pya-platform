import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import * as v from 'valibot'
import { OAuthProviderSchema, type OAuthProvider, type OAuthState } from '@undeadliner/pya-shared'
import { ValidationError } from '../errors.ts'
import { handleOAuthCallback, buildRedirectUri } from '../oauth-callback.ts'
import { revokeSession } from '../session.ts'

const STATE_TTL_SEC = 600
const REDIRECT_ALLOWLIST: ReadonlyArray<RegExp> = [
  /^\/$/,
  /^\/stores\/[a-z0-9-]+$/,
  /^\/cart$/,
  /^\/checkout$/,
  /^\/orders\/[a-z0-9-]+$/,
  /^\/profile$/,
]

const app = new Hono<{ Bindings: Env }>()

app.get('/start', async (c) => {
  const providerRaw = c.req.query('provider')
  const parsed = v.safeParse(OAuthProviderSchema, providerRaw)
  if (!parsed.success) {
    throw new ValidationError({ issues: [{ path: 'provider', message: 'Unknown provider' }] })
  }
  const provider = parsed.output

  const redirectAfter = c.req.query('redirect') ?? '/'
  const safeRedirect = REDIRECT_ALLOWLIST.some((re) => re.test(redirectAfter)) ? redirectAfter : '/'

  const state = randomToken(32)
  const verifier = randomToken(64)
  const challenge = await s256Challenge(verifier)
  const nonce = randomToken(16)

  const stateRecord: OAuthState = {
    verifier,
    provider,
    redirectAfter: safeRedirect,
    nonce,
    intent: 'login',
  }
  await c.env.OAUTH_STATE.put(`oauth:state:${state}`, JSON.stringify(stateRecord), {
    expirationTtl: STATE_TTL_SEC,
  })
  setCookie(c, 'pya_oauth_state', state, {
    path: '/api/auth',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: STATE_TTL_SEC,
  })

  const authUrl = buildProviderAuthUrl(provider, c.env, state, challenge, nonce)
  return c.redirect(authUrl, 302)
})

app.get('/callback/:provider', handleOAuthCallback)

app.post('/logout', async (c) => {
  const sid = getCookie(c, 'pya_sid')
  if (sid !== undefined) await revokeSession(c, deleteCookie, sid, false)
  return c.json({ ok: true })
})

const randomToken = (bytes: number): string => {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return btoa(String.fromCharCode(...buf))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

const s256Challenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

const buildProviderAuthUrl = (
  provider: OAuthProvider,
  env: Env,
  state: string,
  challenge: string,
  nonce: string
): string => {
  const redirectUri = buildRedirectUri(env, provider)
  const common = {
    response_type: 'code',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    nonce,
  }
  const params = new URLSearchParams(common)
  switch (provider) {
    case 'google':
      params.set('client_id', env.GOOGLE_OAUTH_CLIENT_ID ?? '')
      return `${env.GOOGLE_AUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth'}?${params}`
    case 'facebook':
      params.set('client_id', env.FACEBOOK_APP_ID ?? '')
      return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
    case 'apple':
      return `${env.SITE_ORIGIN}/login?error=apple_not_implemented`
  }
}

export { app as oauthRoutes }
