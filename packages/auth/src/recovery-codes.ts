/**
 * Recovery-code lifecycle: generate, hash, store, redeem.
 *
 * Format on display (one per line): `XXXX-XXXX-XXXX` where X is a base32
 * letter from the unambiguous alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`
 * (no 0/O, 1/I/L). 12 chars = 60 bits of entropy. We generate 8 codes per
 * `generate` call — past industry standard (GitHub, Google, etc).
 *
 * Storage: only `(salt_hex, code_hash)` ever lands in D1. Plaintext is shown
 * to the user exactly once, then dropped from memory.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LEN = 12 // characters, formatted as 4-4-4
const CODE_COUNT = 8

const randomChars = (n: number): string => {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  // Modulo-bias against 30 chars is negligible at 8-bit input.
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET.charAt((bytes[i] ?? 0) % ALPHABET.length)
  return s
}

const formatCode = (raw: string): string =>
  `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`

const stripFormat = (input: string): string => input.replace(/[\s-]/g, '').toUpperCase()

const toHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const fromHex = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** Per-row salt + PBKDF2-SHA256 single round. Plenty of cost for 60-bit
 *  unguessable inputs; not Argon2 because we're tight on Worker CPU time. */
const hashCode = async (plaintext: string, saltHex: string): Promise<string> => {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(plaintext),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromHex(saltHex) as BufferSource,
      iterations: 1,
    },
    key,
    256,
  )
  return toHex(bits)
}

const randomSaltHex = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface GeneratedSet {
  /** Plaintext codes — display to user, never persisted. */
  readonly codes: ReadonlyArray<string>
  readonly count: number
}

/** Generate a fresh set, replacing any prior unused codes for the user. */
export const regenerateRecoveryCodes = async (
  db: D1Database,
  userId: string,
): Promise<GeneratedSet> => {
  // Wipe prior codes — regeneration is total, no partial overlap with old.
  await db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').bind(userId).run()
  const now = Math.floor(Date.now() / 1000)
  const plaintextCodes: string[] = []
  const inserts: Array<{ saltHex: string; hash: string }> = []
  for (let i = 0; i < CODE_COUNT; i++) {
    const raw = randomChars(CODE_LEN)
    const saltHex = randomSaltHex()
    const hash = await hashCode(raw, saltHex)
    plaintextCodes.push(formatCode(raw))
    inserts.push({ saltHex, hash })
  }
  const stmt = db.prepare(
    'INSERT INTO recovery_codes (user_id, salt_hex, code_hash, used_at, created_at) VALUES (?, ?, ?, NULL, ?)',
  )
  await db.batch(inserts.map((r) => stmt.bind(userId, r.saltHex, r.hash, now)))
  return { codes: plaintextCodes, count: plaintextCodes.length }
}

export interface RedeemResult {
  readonly ok: boolean
}

/** Try every unused code-row for the user; constant-time compare not needed
 *  (the candidate hash already incorporates a per-row salt). */
export const redeemRecoveryCode = async (
  db: D1Database,
  userId: string,
  candidatePlaintext: string,
): Promise<RedeemResult> => {
  const candidate = stripFormat(candidatePlaintext)
  if (candidate.length !== CODE_LEN) return { ok: false }
  // biome-ignore lint/style/useNamingConvention: D1 raw columns
  type Row = { salt_hex: string; code_hash: string }
  const { results } = await db
    .prepare('SELECT salt_hex, code_hash FROM recovery_codes WHERE user_id = ? AND used_at IS NULL')
    .bind(userId)
    .all<Row>()
  for (const row of results) {
    const candidateHash = await hashCode(candidate, row.salt_hex)
    if (candidateHash === row.code_hash) {
      const now = Math.floor(Date.now() / 1000)
      await db
        .prepare('UPDATE recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ?')
        .bind(now, userId, row.code_hash)
        .run()
      return { ok: true }
    }
  }
  return { ok: false }
}

export const countUnusedCodes = async (db: D1Database, userId: string): Promise<number> => {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL')
    .bind(userId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/** Wipe ALL passkeys for a user — fired on successful recovery-code redeem
 *  because the redeeming party may not be the legitimate user. */
export const invalidateAllPasskeysForUser = async (
  db: D1Database,
  userId: string,
): Promise<void> => {
  await db.prepare('DELETE FROM passkeys WHERE user_id = ?').bind(userId).run()
}
