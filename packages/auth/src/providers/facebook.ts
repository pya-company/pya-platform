import type { ProviderClaims } from '@pya-company/shared'
import { ProviderNotEnabledError } from '@pya-company/shared'

export const exchangeAndVerifyFacebook = async (
  _env: Env,
  _redirectUri: string,
  _code: string,
  _verifier: string,
  _nonce: string,
): Promise<ProviderClaims> => {
  throw new ProviderNotEnabledError({ provider: 'facebook' })
}
