// @undeadliner/pya-auth — public surface.
//
// Hono router factories + middleware. Each consumer wires its own Worker
// like so:
//
//   const app = new Hono<{ Bindings: Env }>()
//   app.route('/api/auth', passwordlessRoutes)
//   app.route('/api/auth', oauthRoutes)
//   app.route('/api/auth/dev', createDevBypassRoutes({ onCronSweep }))
//   app.use('/v1/*', requireAuth)
//
// The `Env` interface is contributed by `./env.ts` (PyaAuthBindings). Hosts
// extend it with their own bindings — Hono merges via intersection.

import './env.ts'

export type { PyaAuthBindings } from './env.ts'
export { requireAuth, issueSession, revokeSession } from './session.ts'
export { passwordlessRoutes } from './routes/passwordless.ts'
export { oauthRoutes } from './routes/oauth.ts'
export { createDevBypassRoutes } from './routes/dev-bypass.ts'
export { logAuth, type AuthEvent } from './log.ts'
export { provisionOrLink } from './identity-link.ts'
export {
  newSessionId,
  readSession,
  touchSession,
  writeSession,
  deleteSession,
} from './store/session-store.ts'
// Re-export domain errors so consumers don't need to import @undeadliner/pya-shared
// separately just for `mapErrorToStatus` / `UnauthorizedError` / etc.
export {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitedError,
  UpstreamError,
  InvalidTokenError,
  IdentityConflictError,
  ProviderNotEnabledError,
  mapErrorToStatus,
  type DomainError,
} from '@undeadliner/pya-shared'
