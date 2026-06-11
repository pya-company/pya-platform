import type { ProviderClaims } from '@pya/shared'
import { ProviderNotEnabledError } from '../errors.ts'

export const exchangeAndVerifyApple = async (
  _env: Env,
  _redirectUri: string,
  _code: string,
  _verifier: string,
  _nonce: string
): Promise<ProviderClaims> => {
  throw new ProviderNotEnabledError({ provider: 'apple' })
}
