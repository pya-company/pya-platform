import * as v from 'valibot'

export const UuidSchema = v.pipe(
  v.string(),
  v.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID'),
)

/** UUID v7 — time-ordered, sortable, monotonic enough for our load levels. */
export const uuidV7 = (): string => {
  const ts = BigInt(Date.now())
  const rand = crypto.getRandomValues(new Uint8Array(10))
  const tsHex = ts.toString(16).padStart(12, '0')
  const a = tsHex.slice(0, 8)
  const b = tsHex.slice(8, 12)
  const c = `7${(rand[0]! & 0x0f).toString(16).padStart(1, '0')}${rand[1]!.toString(16).padStart(2, '0')}`
  const d = `${((rand[2]! & 0x3f) | 0x80).toString(16).padStart(2, '0')}${rand[3]!.toString(16).padStart(2, '0')}`
  const e = Array.from(rand.slice(4, 10), (x) => x.toString(16).padStart(2, '0')).join('')
  return `${a}-${b}-${c}-${d}-${e}`
}
