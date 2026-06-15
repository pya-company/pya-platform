import { UpstreamError } from '@pya-company/shared'

const TTL_SEC = 10 * 60
const MAX_ATTEMPTS = 5

export interface OtpRecord {
  readonly codeHash: string
  readonly email: string
  readonly attempts: number
  readonly redirectAfter: string
  readonly ts: number
}

export type VerifyResult =
  | { readonly status: 'ok'; readonly record: OtpRecord }
  | { readonly status: 'invalid'; readonly remaining: number }
  | { readonly status: 'expired' }
  | { readonly status: 'locked' }

export const generateCode = (): string => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const n = (buf[0] ?? 0) % 1_000_000
  return n.toString().padStart(6, '0')
}

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const keyFor = async (email: string): Promise<string> =>
  `otp:${await sha256Hex(email.toLowerCase())}`
const hashCode = (code: string, email: string, pepper: string): Promise<string> =>
  sha256Hex(`${code}|${email.toLowerCase()}|${pepper}`)

export const storeOtp = async (
  kv: KVNamespace,
  env: { readonly SESSION_PEPPER?: string },
  email: string,
  code: string,
  redirectAfter: string,
): Promise<void> => {
  const record: OtpRecord = {
    codeHash: await hashCode(code, email, env.SESSION_PEPPER ?? ''),
    email: email.toLowerCase(),
    attempts: 0,
    redirectAfter,
    ts: Math.floor(Date.now() / 1000),
  }
  await kv.put(await keyFor(email), JSON.stringify(record), { expirationTtl: TTL_SEC })
}

export const verifyOtp = async (
  kv: KVNamespace,
  env: { readonly SESSION_PEPPER?: string },
  email: string,
  code: string,
): Promise<VerifyResult> => {
  const key = await keyFor(email)
  const raw = await kv.get<OtpRecord>(key, { type: 'json' })
  if (raw === null) return { status: 'expired' }
  if (raw.attempts >= MAX_ATTEMPTS) {
    await kv.delete(key)
    return { status: 'locked' }
  }

  const incoming = await hashCode(code, email, env.SESSION_PEPPER ?? '')
  if (incoming !== raw.codeHash) {
    const next: OtpRecord = { ...raw, attempts: raw.attempts + 1 }
    if (next.attempts >= MAX_ATTEMPTS) {
      await kv.delete(key)
      return { status: 'locked' }
    }
    const remainingTtl = Math.max(60, TTL_SEC - (Math.floor(Date.now() / 1000) - raw.ts))
    await kv.put(key, JSON.stringify(next), { expirationTtl: remainingTtl })
    return { status: 'invalid', remaining: MAX_ATTEMPTS - next.attempts }
  }

  await kv.delete(key)
  return { status: 'ok', record: raw }
}

const renderHtml = (brand: string, code: string, magicLink: string): string => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f6">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="padding:32px 32px 8px;color:#111">
    <h1 style="margin:0 0 8px;font-size:22px">${brand}</h1>
    <p style="margin:0;color:#444;font-size:15px">Tu código de acceso (válido 10 minutos):</p>
  </td></tr>
  <tr><td style="padding:16px 32px">
    <div style="font-size:38px;font-weight:800;letter-spacing:8px;color:#111;background:#f8f8f8;border:1px solid #eee;border-radius:8px;padding:18px;text-align:center;font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">${code}</div>
  </td></tr>
  <tr><td style="padding:16px 32px 4px;text-align:center">
    <a href="${magicLink}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">Acceder ahora →</a>
  </td></tr>
  <tr><td style="padding:8px 32px 24px;color:#666;font-size:13px;line-height:1.5;text-align:center">
    Pegá el código en el sitio o tocá el botón. Si no fuiste vos, podés ignorar este email — nadie puede acceder sin él.
  </td></tr>
</table>
</body></html>`

const renderText = (brand: string, code: string, magicLink: string): string =>
  `${brand} — tu código de acceso (válido 10 min)\n\nCódigo: ${code}\n\nO accedé directamente: ${magicLink}\n\nSi no fuiste vos, ignorá este email.`

export const sendOtpEmail = async (env: Env, email: string, code: string): Promise<void> => {
  const brand = env.EMAIL_BRAND ?? 'PyaEats'
  // Prefer the verified domain whenever EMAIL_DOMAIN is set (regardless of
  // ENVIRONMENT) — that's the marker that domain verify in Resend completed.
  // Fall back to Resend's sandbox sender (onboarding@resend.dev) only when no
  // domain is verified yet (sends restricted to the account-verified address).
  const sender =
    env.EMAIL_DOMAIN !== undefined && env.EMAIL_DOMAIN !== ''
      ? `${brand} <noreply@${env.EMAIL_DOMAIN}>`
      : `${brand} Dev <onboarding@resend.dev>`

  // Site origin without trailing slash. Fragment-encoded so mail scanners that
  // pre-fetch the URL don't consume the one-shot code (fragments aren't sent).
  const siteOrigin = (env.SITE_ORIGIN ?? '').replace(/\/$/, '')
  const magicLink = `${siteOrigin}/login#email=${encodeURIComponent(email)}&code=${code}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender,
      to: email,
      subject: `${code} — tu código de ${brand}`,
      html: renderHtml(brand, code, magicLink),
      text: renderText(brand, code, magicLink),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Surface Resend's reason in worker logs (captured by `wrangler tail`).
    console.error(
      JSON.stringify({
        stream: 'audit',
        event: 'auth.email.send_failed',
        provider: 'resend',
        status: res.status,
        body: body.slice(0, 500),
      }),
    )
    throw new UpstreamError({ provider: 'resend', status: res.status })
  }
}

export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@')
  if (local === undefined || domain === undefined) return email
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}${local.length > 2 ? '***' : ''}@${domain}`
}
