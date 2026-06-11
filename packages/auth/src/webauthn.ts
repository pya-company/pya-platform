import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server'
import type { PasskeyRow } from './store/passkey-store.ts'

const rpName = 'PyaEats'

const expectedOrigins = (env: Env): ReadonlyArray<string> =>
  (env.WEBAUTHN_ORIGINS ?? '').split(',').map((s) => s.trim()).filter((s) => s.length > 0)

const rpID = (env: Env): string => env.WEBAUTHN_RP_ID ?? 'pyaeats-site.pages.dev'

const base64urlToUint8 = (s: string): Uint8Array<ArrayBuffer> => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=')
  const bin = atob(padded)
  const ab = new ArrayBuffer(bin.length)
  const buf = new Uint8Array(ab)
  for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i)
  return buf
}

export const genAuthOptions = async (
  env: Env,
  passkeys: ReadonlyArray<PasskeyRow>
): Promise<PublicKeyCredentialRequestOptionsJSON> =>
  generateAuthenticationOptions({
    rpID: rpID(env),
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: 'preferred',
    timeout: 60_000,
  })

export const genRegOptions = async (
  env: Env,
  userId: string,
  userEmail: string,
  existing: ReadonlyArray<PasskeyRow>
): Promise<PublicKeyCredentialCreationOptionsJSON> =>
  generateRegistrationOptions({
    rpName,
    rpID: rpID(env),
    userID: new TextEncoder().encode(userId) as Uint8Array<ArrayBuffer>,
    userName: userEmail,
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    timeout: 60_000,
    attestationType: 'none',
  })

export const verifyAuth = async (
  env: Env,
  assertion: AuthenticationResponseJSON,
  expectedChallenge: string,
  passkey: PasskeyRow
): Promise<VerifiedAuthenticationResponse> =>
  verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: expectedOrigins(env) as string[],
    expectedRPID: rpID(env),
    credential: {
      id: passkey.credentialId,
      publicKey: base64urlToUint8(passkey.publicKey),
      counter: passkey.signCount,
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
    requireUserVerification: false,
  })

export const verifyReg = async (
  env: Env,
  attestation: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> =>
  verifyRegistrationResponse({
    response: attestation,
    expectedChallenge,
    expectedOrigin: expectedOrigins(env) as string[],
    expectedRPID: rpID(env),
    requireUserVerification: false,
  })

export const uint8ToBase64url = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
