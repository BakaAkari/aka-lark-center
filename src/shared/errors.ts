export type LarkCenterErrorCode =
  | 'validation_error'
  | 'auth_error'
  | 'permission_error'
  | 'api_error'
  | 'not_found'
  | 'unsupported'
  | 'capability_disabled'

export class LarkCenterError extends Error {
  constructor(
    readonly code: LarkCenterErrorCode,
    message: string,
    readonly options: {
      cause?: unknown
      details?: Record<string, unknown>
    } = {},
  ) {
    super(message)
    this.name = 'LarkCenterError'
  }
}

export function createValidationError(message: string, details?: Record<string, unknown>) {
  return new LarkCenterError('validation_error', message, { details })
}

export function createAuthError(message: string, cause?: unknown, details?: Record<string, unknown>) {
  return new LarkCenterError('auth_error', message, { cause, details })
}

export function createPermissionError(message: string, details?: Record<string, unknown>) {
  return new LarkCenterError('permission_error', message, { details })
}

export function createApiError(message: string, cause?: unknown, details?: Record<string, unknown>) {
  return new LarkCenterError('api_error', message, { cause, details })
}

export function createUnsupportedError(message: string, details?: Record<string, unknown>) {
  return new LarkCenterError('unsupported', message, { details })
}

export function createCapabilityError(capability: string, message?: string) {
  return new LarkCenterError(
    'capability_disabled',
    message || `当前版本尚未启用 ${capability} 能力。`,
    { details: { capability } },
  )
}

export function createNotFoundError(resource: string, details?: Record<string, unknown>) {
  return new LarkCenterError('not_found', `未找到对应的 ${resource}。`, { details })
}

export function ensureNonEmptyString(value: unknown, label: string) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw createValidationError(`请输入 ${label}。`, { label })
}

export function wrapDomainError(prefix: string, error: unknown) {
  if (error instanceof LarkCenterError) {
    if (error.message.startsWith(`${prefix}：`)) {
      return error
    }

    return new LarkCenterError(error.code, `${prefix}：${error.message}`, {
      cause: error.options.cause ?? error,
      details: error.options.details,
    })
  }

  return createApiError(`${prefix}：${formatUnknownError(error)}`, error)
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown error'
}
