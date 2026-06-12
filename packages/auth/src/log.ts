import type { IdentityProvider } from '@pya-platform/shared'

export type AuthEvent =
  | 'auth.login.oauth'
  | 'auth.login.email'
  | 'auth.login.passkey'
  | 'auth.login.recovery'
  | 'auth.login.rejected'
  | 'auth.email.send_failed'
  | 'auth.passkey.registered'
  | 'auth.recovery.generated'

export type AuthProvider = IdentityProvider | 'recovery'

export interface AuthLogEvent {
  readonly event: AuthEvent
  readonly ts: number
  readonly userId?: string
  readonly provider: AuthProvider
  readonly ipHash?: string
  readonly outcome: 'created' | 'linked' | 'reused' | 'rejected' | 'sent'
  readonly reason?: string
}

export const logAuth = (event: AuthLogEvent): void => {
  console.log(JSON.stringify({ stream: 'audit', ...event }))
}
