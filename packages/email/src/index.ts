// @pya/email — Resend wrapper.
//
// Single entry: `sendEmail()`. Never throws — notification failure
// must not block whatever caller transition already succeeded.
// Logs to the `audit` stream on failure so it's still observable.

export interface PyaEmailBindings {
  readonly RESEND_API_KEY?: string
  readonly EMAIL_DOMAIN?: string
}

export interface SendEmailParams {
  readonly env: PyaEmailBindings
  readonly to: string
  readonly subject: string
  readonly text: string
  readonly html?: string
  /** Brand name shown in the `From:` header. Defaults to "Pya". */
  readonly brandName?: string
  /** Mailbox local-part. Defaults to "noreply". */
  readonly fromLocal?: string
}

const senderAddress = (env: PyaEmailBindings, brand: string, local: string): string => {
  if (env.EMAIL_DOMAIN !== undefined && env.EMAIL_DOMAIN !== '') {
    return `${brand} <${local}@${env.EMAIL_DOMAIN}>`
  }
  // Resend's free sandbox sender — usable until the domain is verified.
  return `${brand} <onboarding@resend.dev>`
}

export const sendEmail = async (params: SendEmailParams): Promise<{ readonly ok: boolean }> => {
  const { env, to, subject, text, html, brandName = 'Pya', fromLocal = 'noreply' } = params
  const apiKey = env.RESEND_API_KEY ?? ''
  if (apiKey === '') {
    console.error(JSON.stringify({
      stream: 'audit', event: 'email.send_skipped', reason: 'RESEND_API_KEY unset',
      to, subject,
    }))
    return { ok: false }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: senderAddress(env, brandName, fromLocal),
      to,
      subject,
      text,
      ...(html !== undefined ? { html } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(JSON.stringify({
      stream: 'audit', event: 'email.send_failed',
      provider: 'resend', status: res.status,
      to, subject, body: body.slice(0, 500),
    }))
    return { ok: false }
  }
  return { ok: true }
}

/** Minimal HTML escape for embedding user-supplied text in templates.
 *  Use ONLY where the consumer is the email client, not the browser DOM. */
export const escapeHtml = (s: string): string =>
  s.replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
