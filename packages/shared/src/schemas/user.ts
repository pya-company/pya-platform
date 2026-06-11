import * as v from 'valibot'
import { UuidSchema } from './id.ts'

/** Application roles. Customer is implicit when no other role applies.
 *  `system` is a synthetic actor used by cron / background jobs for
 *  transitions (e.g. auto-cancel after acknowledge window). */
export const RoleSchema = v.picklist([
  'customer',
  'store_owner',
  'store_staff',
  'courier',
  'admin',
  'super_admin',
  'system',
])
export type Role = v.InferOutput<typeof RoleSchema>

export const OAuthProviderSchema = v.picklist(['google', 'apple', 'facebook'])
export type OAuthProvider = v.InferOutput<typeof OAuthProviderSchema>

/** Includes email as an identity provider (magic link). */
export const IdentityProviderSchema = v.picklist(['google', 'apple', 'facebook', 'email'])
export type IdentityProvider = v.InferOutput<typeof IdentityProviderSchema>

export const EmailSchema = v.pipe(v.string(), v.email(), v.toLowerCase(), v.maxLength(254))
export type Email = v.InferOutput<typeof EmailSchema>

export const LocaleSchema = v.picklist(['es-PY', 'gn-PY'])
export type Locale = v.InferOutput<typeof LocaleSchema>

export const UserStatusSchema = v.picklist(['active', 'suspended', 'deleted'])
export type UserStatus = v.InferOutput<typeof UserStatusSchema>

export const UserSchema = v.object({
  id: UuidSchema,
  email: EmailSchema,
  emailVerified: v.boolean(),
  displayName: v.optional(v.string()),
  locale: v.optional(LocaleSchema, 'es-PY'),
  createdAt: v.number(),
  status: UserStatusSchema,
})
export type User = v.InferOutput<typeof UserSchema>

export const UserIdentitySchema = v.object({
  userId: UuidSchema,
  provider: OAuthProviderSchema,
  subject: v.string(),
  emailAtLink: v.optional(EmailSchema),
  linkedAt: v.number(),
})
export type UserIdentity = v.InferOutput<typeof UserIdentitySchema>

export const RoleAssignmentSchema = v.object({
  userId: UuidSchema,
  role: RoleSchema,
  storeId: v.optional(UuidSchema),
  grantedBy: v.optional(UuidSchema),
  grantedAt: v.number(),
})
export type RoleAssignment = v.InferOutput<typeof RoleAssignmentSchema>
