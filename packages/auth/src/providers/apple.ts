import type { ProviderClaims } from '@pya-platform/shared'
import { ProviderNotEnabledError } from '@pya-platform/shared'

export const exchangeAndVerifyApple = async (
  _env: Env,
  _redirectUri: string,
  _code: string,
  _verifier: string,
  _nonce: string,
): Promise<ProviderClaims> => {
  throw new ProviderNotEnabledError({ provider: 'apple' })
}
