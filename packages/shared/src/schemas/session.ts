import * as v from 'valibot'
import { UuidSchema } from './id.ts'
import { RoleSchema } from './user.ts'

/** Stored in KV under key `sess:<sid>`. Never sent to the client. */
export const SessionRecordSchema = v.object({
  userId: UuidSchema,
  roles: v.array(RoleSchema),
  storeIds: v.array(UuidSchema),
  iat: v.number(),
  lastSeen: v.number(),
  ipHash: v.string(),
  uaHash: v.string(),
  mfaAt: v.optional(v.number()),
})
export type SessionRecord = v.InferOutput<typeof SessionRecordSchema>

/** Stored in KV under key `oauth:state:<state>`, TTL 600s. */
export const OAuthStateSchema = v.object({
  verifier: v.string(),
  provider: v.picklist(['google', 'apple', 'facebook']),
  redirectAfter: v.string(),
  nonce: v.string(),
  intent: v.optional(v.picklist(['login', 'link'])),
  currentUserId: v.optional(UuidSchema),
})
export type OAuthState = v.InferOutput<typeof OAuthStateSchema>
