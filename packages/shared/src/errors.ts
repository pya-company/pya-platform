import { Data } from 'effect'

/** Domain-tagged errors. Mapped to HTTP by `mapErrorToResponse`. */
export class UnauthorizedError extends Data.TaggedError('Unauthorized')<{
  readonly reason: string
}> {}

export class ForbiddenError extends Data.TaggedError('Forbidden')<{
  readonly required: string
}> {}

export class NotFoundError extends Data.TaggedError('NotFound')<{
  readonly resource: string
  readonly id?: string
}> {}

export class ValidationError extends Data.TaggedError('Validation')<{
  readonly issues: readonly { readonly path: string; readonly message: string }[]
}> {}

export class ConflictError extends Data.TaggedError('Conflict')<{
  readonly reason: string
}> {}

export class RateLimitedError extends Data.TaggedError('RateLimited')<{
  readonly retryAfterSec: number
}> {}

export class UpstreamError extends Data.TaggedError('Upstream')<{
  readonly provider: string
  readonly status: number
}> {}

export class InvalidTokenError extends Data.TaggedError('InvalidToken')<{
  readonly reason: string
}> {}

export class IdentityConflictError extends Data.TaggedError('IdentityConflict')<{
  readonly provider: string
}> {}

export class ProviderNotEnabledError extends Data.TaggedError('ProviderNotEnabled')<{
  readonly provider: string
}> {}

export type DomainError =
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ValidationError
  | ConflictError
  | RateLimitedError
  | UpstreamError
  | InvalidTokenError
  | IdentityConflictError
  | ProviderNotEnabledError

export const mapErrorToStatus = (error: DomainError): number => {
  switch (error._tag) {
    case 'Unauthorized':
      return 401
    case 'Forbidden':
      return 403
    case 'NotFound':
      return 404
    case 'Validation':
      return 422
    case 'Conflict':
      return 409
    case 'RateLimited':
      return 429
    case 'Upstream':
      return 502
    case 'InvalidToken':
      return 401
    case 'IdentityConflict':
      return 409
    case 'ProviderNotEnabled':
      return 501
  }
}
