import { type ProviderClaims, ProviderClaimsSchema } from '@pya-platform/shared'
import { InvalidTokenError, UpstreamError } from '@pya-platform/shared'
import { type JSONWebKeySet, createLocalJWKSet, jwtVerify } from 'jose'
import * as v from 'valibot'

const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS: ReadonlySet<string> = new Set(['accounts.google.com', 'https://accounts.google.com'])

interface TokenResponse {
  readonly id_token?: string
}

const buildBody = (
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  verifier: string,
): URLSearchParams =>
  new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  })

interface JwksEntry {
  readonly jwks: JSONWebKeySet
  readonly fetchedAt: number
}
const jwksCache = new Map<string, JwksEntry>()
const JWKS_TTL_MS = 6 * 60 * 60 * 1000

const fetchJwks = async (url: string): Promise<JSONWebKeySet> => {
  const cached = jwksCache.get(url)
  if (cached !== undefined && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.jwks
  }
  const res = await fetch(url)
  if (!res.ok) throw new UpstreamError({ provider: 'google', status: res.status })
  const jwks = (await res.json()) as JSONWebKeySet
  jwksCache.set(url, { jwks, fetchedAt: Date.now() })
  return jwks
}

/** Test-only: clear JWKS cache. */
export const __resetJwksCache = (): void => {
  jwksCache.clear()
}

export const exchangeAndVerifyGoogle = async (
  env: Env,
  redirectUri: string,
  code: string,
  verifier: string,
  nonce: string,
): Promise<ProviderClaims> => {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID ?? ''
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
  const tokenUrl = env.GOOGLE_TOKEN_URL ?? DEFAULT_TOKEN_URL
  const jwksUrl = env.GOOGLE_JWKS_URL ?? DEFAULT_JWKS_URL

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildBody(code, clientId, clientSecret, redirectUri, verifier),
  })
  if (!res.ok) throw new UpstreamError({ provider: 'google', status: res.status })

  const tokenJson = (await res.json()) as TokenResponse
  const idToken = tokenJson.id_token
  if (idToken === undefined) {
    throw new InvalidTokenError({ reason: 'missing id_token' })
  }

  const jwksSet = createLocalJWKSet(await fetchJwks(jwksUrl))
  const verified = await verifyOrThrow(idToken, jwksSet, clientId)
  const payload = verified.payload

  if (typeof payload.iss !== 'string' || !ISSUERS.has(payload.iss)) {
    throw new InvalidTokenError({ reason: 'bad iss' })
  }
  if (payload.nonce !== nonce) {
    throw new InvalidTokenError({ reason: 'nonce mismatch' })
  }
  if (payload.email_verified !== true) {
    throw new InvalidTokenError({ reason: 'email_unverified' })
  }
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new InvalidTokenError({ reason: 'missing sub/email' })
  }

  return v.parse(ProviderClaimsSchema, {
    provider: 'google',
    subject: payload.sub,
    email: payload.email,
    emailVerified: true,
    displayName: typeof payload.name === 'string' ? payload.name : undefined,
    locale: typeof payload.locale === 'string' ? payload.locale : undefined,
  })
}

const verifyOrThrow = async (
  idToken: string,
  jwks: ReturnType<typeof createLocalJWKSet>,
  audience: string,
): Promise<Awaited<ReturnType<typeof jwtVerify>>> => {
  try {
    return await jwtVerify(idToken, jwks, { audience })
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'verify failed'
    throw new InvalidTokenError({ reason })
  }
}
