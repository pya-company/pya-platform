import { type SessionRecord, SessionRecordSchema } from '@undeadliner/pya-shared'
import * as v from 'valibot'

const SESSION_TTL_SEC = 60 * 60 * 24 * 30
const SLIDING_LAST_SEEN_MIN_SEC = 60

/** Generate an opaque session id (32 random bytes, base64url). */
export const newSessionId = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export const writeSession = async (
  kv: KVNamespace,
  sid: string,
  record: SessionRecord,
): Promise<void> => {
  await kv.put(`sess:${sid}`, JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SEC,
  })
}

export const readSession = async (
  kv: KVNamespace,
  sid: string,
): Promise<SessionRecord | undefined> => {
  const raw = await kv.get(`sess:${sid}`, { type: 'json' })
  if (raw === null) return undefined
  const parsed = v.safeParse(SessionRecordSchema, raw)
  return parsed.success ? parsed.output : undefined
}

export const touchSession = async (
  kv: KVNamespace,
  sid: string,
  record: SessionRecord,
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000)
  const shouldWrite = now - record.lastSeen >= SLIDING_LAST_SEEN_MIN_SEC
  if (!shouldWrite) return
  await writeSession(kv, sid, { ...record, lastSeen: now })
}

export const deleteSession = async (kv: KVNamespace, sid: string): Promise<void> => {
  await kv.delete(`sess:${sid}`)
}
