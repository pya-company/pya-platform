export interface PasskeyRow {
  readonly credentialId: string
  readonly userId: string
  readonly publicKey: string
  readonly signCount: number
  readonly transports: ReadonlyArray<string>
  readonly label: string | undefined
  readonly createdAt: number
  readonly lastUsedAt: number
  readonly backupEligible: boolean
  readonly backupState: boolean
}

interface RawRow {
  credential_id: string
  user_id: string
  public_key: string
  sign_count: number
  transports: string | null
  label: string | null
  created_at: number
  last_used_at: number
  backup_eligible: number
  backup_state: number
}

const fromRow = (r: RawRow): PasskeyRow => ({
  credentialId: r.credential_id,
  userId: r.user_id,
  publicKey: r.public_key,
  signCount: r.sign_count,
  transports: r.transports === null ? [] : (JSON.parse(r.transports) as string[]),
  label: r.label ?? undefined,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
  backupEligible: r.backup_eligible === 1,
  backupState: r.backup_state === 1,
})

export const findPasskeysByUser = async (
  db: D1Database,
  userId: string
): Promise<ReadonlyArray<PasskeyRow>> => {
  const { results } = await db
    .prepare('SELECT * FROM passkeys WHERE user_id = ?')
    .bind(userId)
    .all<RawRow>()
  return results.map(fromRow)
}

export const findPasskeyByCredentialId = async (
  db: D1Database,
  credentialId: string
): Promise<PasskeyRow | undefined> => {
  const r = await db
    .prepare('SELECT * FROM passkeys WHERE credential_id = ?')
    .bind(credentialId)
    .first<RawRow>()
  return r === null ? undefined : fromRow(r)
}

export const insertPasskey = async (
  db: D1Database,
  row: Omit<PasskeyRow, 'createdAt' | 'lastUsedAt'>
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO passkeys
       (credential_id, user_id, public_key, sign_count, transports, label, created_at, last_used_at, backup_eligible, backup_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      row.credentialId,
      row.userId,
      row.publicKey,
      row.signCount,
      JSON.stringify(row.transports),
      row.label ?? null,
      now,
      now,
      row.backupEligible ? 1 : 0,
      row.backupState ? 1 : 0
    )
    .run()
}

export const updatePasskeyUse = async (
  db: D1Database,
  credentialId: string,
  newSignCount: number
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare('UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE credential_id = ?')
    .bind(newSignCount, now, credentialId)
    .run()
}

export const deletePasskey = async (
  db: D1Database,
  credentialId: string,
  userId: string
): Promise<void> => {
  await db
    .prepare('DELETE FROM passkeys WHERE credential_id = ? AND user_id = ?')
    .bind(credentialId, userId)
    .run()
}

export const countPasskeysByUser = async (
  db: D1Database,
  userId: string
): Promise<number> => {
  const r = await db
    .prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?')
    .bind(userId)
    .first<{ n: number }>()
  return r?.n ?? 0
}
