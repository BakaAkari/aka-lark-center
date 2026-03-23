import type { Context } from 'koishi'
import { createApiError, createAuthError, createUnsupportedError, LarkCenterError } from '../shared/errors.js'
import { assertLarkResponseOk, formatErrorMessage, normalizeBaseUrl, normalizeOpenApiPath } from '../shared/utils.js'
import type {
  Config,
  LarkApiResponse,
  LarkAuthResponse,
  LarkMethod,
  LarkRequestQuery,
  TenantAccessTokenCache,
} from '../shared/types.js'

export class LarkApiClient {
  private tokenCache?: TenantAccessTokenCache

  constructor(
    private readonly ctx: Context,
    private readonly config: Config,
    private readonly logger: ReturnType<Context['logger']>,
  ) {}

  async requestOrThrow<T = unknown>(
    method: LarkMethod,
    apiPath: string,
    data?: unknown,
    query?: LarkRequestQuery,
  ): Promise<LarkApiResponse<T>> {
    const token = await this.getTenantAccessToken()
    const normalizedPath = normalizeOpenApiPath(apiPath)
    const url = this.buildUrl(apiPath, query)
    const requestConfig = {
      timeout: this.config.timeout,
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    }

    let response: LarkApiResponse<T>
    try {
      if (method === 'GET') {
        response = await this.ctx.http.get(url, requestConfig) as LarkApiResponse<T>
      } else if (method === 'POST') {
        response = await this.ctx.http.post(url, data, requestConfig) as LarkApiResponse<T>
      } else if (method === 'PUT') {
        response = await this.ctx.http.put(url, data, requestConfig) as LarkApiResponse<T>
      } else if (method === 'PATCH') {
        response = await this.ctx.http.patch(url, data, requestConfig) as LarkApiResponse<T>
      } else {
        response = await this.ctx.http.delete(url, {
          ...requestConfig,
          data,
        }) as LarkApiResponse<T>
      }
    } catch (error) {
      const failure = extractHttpFailure(error)
      throw createApiError(
        buildRequestFailureMessage(method, normalizedPath, failure),
        error,
        {
          method,
          apiPath: normalizedPath,
          ...failure,
        },
      )
    }

    try {
      assertLarkResponseOk(response)
    } catch (error) {
      throw this.toApiError(error, `Lark API 响应异常：${method} ${normalizedPath}`, {
        method,
        apiPath: normalizedPath,
      })
    }

    return response
  }

  async requestBinary(
    apiPath: string,
    query?: LarkRequestQuery,
  ): Promise<ArrayBuffer> {
    const token = await this.getTenantAccessToken()
    const normalizedPath = normalizeOpenApiPath(apiPath)
    const url = this.buildUrl(apiPath, query)

    let response: ArrayBuffer | Uint8Array | Buffer
    try {
      response = await this.ctx.http.get(url, {
        timeout: this.config.timeout,
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      }) as ArrayBuffer | Uint8Array | Buffer
    } catch (error) {
      throw createApiError(`下载 Lark 二进制资源失败：GET ${normalizedPath}`, error, {
        apiPath: normalizedPath,
      })
    }

    if (response instanceof ArrayBuffer) {
      return response
    }

    if (ArrayBuffer.isView(response)) {
      return response.buffer.slice(response.byteOffset, response.byteOffset + response.byteLength) as ArrayBuffer
    }

    throw createUnsupportedError('Lark 返回的二进制响应结构不受支持。', {
      apiPath: normalizedPath,
    })
  }

  async getTenantAccessToken(): Promise<TenantAccessTokenCache> {
    const now = Date.now()
    if (this.tokenCache && now < this.tokenCache.expiresAt) {
      return this.tokenCache
    }

    let response: LarkAuthResponse
    try {
      response = await this.ctx.http.post(this.buildUrl('/open-apis/auth/v3/tenant_access_token/internal'), {
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }) as LarkAuthResponse
    } catch (error) {
      throw createAuthError('获取 tenant_access_token 失败。', error)
    }

    try {
      assertLarkResponseOk(response)
    } catch (error) {
      throw createAuthError('tenant_access_token 响应异常。', error)
    }

    if (typeof response.tenant_access_token !== 'string' || typeof response.expire !== 'number') {
      throw createAuthError('Lark 返回的 tenant_access_token 响应结构不完整。')
    }

    const expiresAt = now + Math.max(response.expire - this.config.tokenRefreshBufferSeconds, 30) * 1000
    this.tokenCache = {
      token: response.tenant_access_token,
      expireInSeconds: response.expire,
      expiresAt,
    }

    return this.tokenCache
  }

  formatFailure(prefix: string, error: unknown) {
    if (this.config.logApiFailures) {
      this.logger.warn('%s: %s', prefix, formatErrorMessage(error))
    }
    return `${prefix}：${formatErrorMessage(error)}`
  }

  private buildUrl(apiPath: string, query?: LarkRequestQuery) {
    const url = new URL(normalizeOpenApiPath(apiPath), normalizeBaseUrl(this.config.baseUrl))
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) url.searchParams.set(key, value)
    }
    return url.toString()
  }

  private toApiError(error: unknown, message: string, details?: Record<string, unknown>) {
    if (error instanceof LarkCenterError) {
      return error
    }

    return createApiError(message, error, details)
  }
}

interface HttpFailureDetails {
  status?: number
  errorCode?: string
  responseCode?: number
  responseMsg?: string
  responseMessage?: string
  responseBody?: string
}

function buildRequestFailureMessage(method: LarkMethod, apiPath: string, failure: HttpFailureDetails) {
  const parts = [
    typeof failure.status === 'number' ? `HTTP ${failure.status}` : '',
    typeof failure.responseCode === 'number' ? `Lark code=${failure.responseCode}` : '',
    failure.responseMsg || '',
    failure.responseMessage || '',
    failure.errorCode ? `error=${failure.errorCode}` : '',
  ].filter(Boolean)

  const detail = parts.join(' | ')
  return detail
    ? `请求 Lark API 失败：${method} ${apiPath}：${detail}`
    : `请求 Lark API 失败：${method} ${apiPath}`
}

function extractHttpFailure(error: unknown): HttpFailureDetails {
  const top = asRecord(error)
  const response = asRecord(top?.response)
  const body = response?.data ?? response?.body ?? top?.data ?? top?.body
  const bodyRecord = asRecord(body)

  return {
    status: takeNumber(response?.status) ?? takeNumber(top?.status),
    errorCode: takeString(top?.code),
    responseCode: takeNumber(bodyRecord?.code),
    responseMsg: takeString(bodyRecord?.msg),
    responseMessage: takeString(bodyRecord?.message),
    responseBody: formatResponseBody(body),
  }
}

function formatResponseBody(value: unknown) {
  if (value == null) return undefined
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return undefined
    return text.length > 500 ? `${text.slice(0, 500)}...` : text
  }

  if (typeof value === 'object') {
    try {
      const text = JSON.stringify(value)
      return text.length > 500 ? `${text.slice(0, 500)}...` : text
    } catch {}
  }

  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function takeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function takeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
