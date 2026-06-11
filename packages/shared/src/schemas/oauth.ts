import * as v from 'valibot'
import { IdentityProviderSchema, EmailSchema } from './user.ts'

export const ProviderClaimsSchema = v.object({
  provider: IdentityProviderSchema,
  subject: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  email: EmailSchema,
  emailVerified: v.boolean(),
  displayName: v.optional(v.pipe(v.string(), v.maxLength(120))),
  locale: v.optional(v.string()),
})
export type ProviderClaims = v.InferOutput<typeof ProviderClaimsSchema>
