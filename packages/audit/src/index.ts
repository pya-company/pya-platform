// @pya/audit — structured audit logging.
//
// Every event is a single JSON line on stdout, prefixed with stream:'audit'.
// Cloudflare Workers tail logs aggregate by stream tag; downstream pipelines
// (Logpush → R2 → BigQuery / DuckDB) consume only audit-tagged lines.
//
// Don't throw, don't buffer, don't fetch — the audit log must work even when
// every other dependency is broken.

export interface AuditEvent {
  /** Dot-separated event name. `<feature>.<action>` ([.modifier]). */
  readonly event: string
  /** When it happened. Defaults to "now" if omitted. */
  readonly ts?: number
  /** Subject of the action — typically a user id. */
  readonly actorId?: string
  /** Object of the action — order id, store id, comment id, etc. */
  readonly targetId?: string
  /** Outcome label. Examples: ok, created, linked, rejected, sent, failed. */
  readonly outcome?: string
  /** Free-form context. Keep small — log lines must not exceed ~32 KB. */
  readonly meta?: Readonly<Record<string, unknown>>
}

export const audit = (event: AuditEvent): void => {
  const ts = event.ts ?? Math.floor(Date.now() / 1000)
  const { ts: _evTs, ...rest } = event
  console.log(JSON.stringify({ stream: 'audit', ts, ...rest }))
}
