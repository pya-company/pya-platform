import { uuidV7, type ProviderClaims } from '@undeadliner/pya-shared'
import { IdentityConflictError } from '@undeadliner/pya-shared'

export interface LinkResult {
  readonly userId: string
  readonly created: boolean
  readonly linked: boolean
}

const insertIdentity = (db: D1Database, userId: string, claims: ProviderClaims, ts: number) =>
  db
    .prepare(
      `INSERT INTO user_identities (user_id, provider, subject, email_at_link, linked_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(userId, claims.provider, claims.subject, claims.email, ts)

export const provisionOrLink = async (
  db: D1Database,
  claims: ProviderClaims,
  intent: 'login' | 'link',
  currentUserId: string | undefined
): Promise<LinkResult> => {
  const now = Math.floor(Date.now() / 1000)

  const existing = await db
    .prepare('SELECT user_id FROM user_identities WHERE provider = ? AND subject = ?')
    .bind(claims.provider, claims.subject)
    .first<{ user_id: string }>()

  if (existing !== null) {
    if (intent === 'link' && currentUserId !== undefined && existing.user_id !== currentUserId) {
      throw new IdentityConflictError({ provider: claims.provider })
    }
    return { userId: existing.user_id, created: false, linked: false }
  }

  if (intent === 'link' && currentUserId !== undefined) {
    await insertIdentity(db, currentUserId, claims, now).run()
    return { userId: currentUserId, created: false, linked: true }
  }

  const existingUser = await db
    .prepare("SELECT id FROM users WHERE email = ? AND status != 'deleted'")
    .bind(claims.email)
    .first<{ id: string }>()

  if (existingUser !== null) {
    await insertIdentity(db, existingUser.id, claims, now).run()
    return { userId: existingUser.id, created: false, linked: true }
  }

  const userId = uuidV7()
  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, email, email_verified, display_name, locale, created_at, status)
         VALUES (?, ?, 1, ?, ?, ?, 'active')`
      )
      .bind(userId, claims.email, claims.displayName ?? null, claims.locale ?? 'es-PY', now),
    insertIdentity(db, userId, claims, now),
  ])
  return { userId, created: true, linked: false }
}
