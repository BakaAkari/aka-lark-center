import { LARK_METHODS, RECEIVE_ID_TYPES } from './constants.js'
import { createApiError, createValidationError } from './errors.js'
import type { DocumentContentType, DriveMemberPermission, LarkApiResponse, LarkMethod, ReceiveIdType } from './types.js'

export function buildMessageContent(messageType: string, content: string, treatContentAsJson: boolean) {
  if (treatContentAsJson) {
    try {
      JSON.parse(content)
    } catch (error) {
      throw createValidationError(`消息 content 不是合法 JSON：${formatErrorMessage(error)}`)
    }
    return content
  }

  if (messageType !== 'text') {
    throw createValidationError('非 text 消息必须使用 -j 提供符合 Lark 要求的 content JSON。')
  }

  return JSON.stringify({ text: content })
}

export function resolveReceiveIdType(value: unknown, fallback: ReceiveIdType): ReceiveIdType | null {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  const normalized = value.trim()
  return RECEIVE_ID_TYPES.has(normalized as ReceiveIdType) ? normalized as ReceiveIdType : null
}

export function resolveDocumentContentType(value: unknown): DocumentContentType | null {
  if (value == null || value === '') return 'plain_text'
  if (typeof value !== 'string') return null
  const normalized = value.trim() as DocumentContentType
  return normalized === 'plain_text' || normalized === 'markdown' || normalized === 'html' ? normalized : null
}

export function normalizeMethod(value: unknown): LarkMethod | null {
  if (typeof value !== 'string') return null
  const method = value.trim().toUpperCase() as LarkMethod
  return LARK_METHODS.has(method) ? method : null
}

export function resolveDriveMemberPermission(value: unknown, fallback: DriveMemberPermission): DriveMemberPermission {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  const normalized = value.trim() as DriveMemberPermission
  return normalized === 'view' || normalized === 'edit' || normalized === 'full_access'
    ? normalized
    : fallback
}

export function assertLarkResponseOk(response: unknown): asserts response is LarkApiResponse {
  if (!response || typeof response !== 'object') {
    throw createApiError('Lark 返回了空响应。')
  }

  const larkResponse = response as LarkApiResponse
  const code = typeof larkResponse.code === 'number' ? larkResponse.code : undefined
  if (code !== undefined && code !== 0) {
    const message = [
      typeof larkResponse.msg === 'string' ? larkResponse.msg : '',
      typeof larkResponse.message === 'string' ? larkResponse.message : '',
    ].filter(Boolean).join(' | ')
    throw createApiError(message || `Lark API code=${code}`, undefined, { code })
  }
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

export function normalizeOpenApiPath(apiPath: string) {
  let normalized = apiPath.trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.startsWith('/open-apis/')) normalized = `/open-apis${normalized}`
  return normalized
}

export function formatJson(value: unknown, maxLength: number) {
  const text = JSON.stringify(value, null, 2) || String(value)
  if (text.length <= maxLength) {
    return `\`\`\`json\n${text}\n\`\`\``
  }
  return `\`\`\`json\n${text.slice(0, maxLength)}\n...\n\`\`\``
}

export function formatErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown error'
}

export function maskToken(token: string) {
  if (token.length <= 10) return token
  return `${token.slice(0, 6)}...${token.slice(-4)}`
}

export function normalizeDocumentContent(content: string, contentType: DocumentContentType) {
  if (contentType === 'markdown') {
    return {
      content_type: 'markdown',
      content,
    }
  }

  if (contentType === 'html') {
    return {
      content_type: 'html',
      content,
    }
  }

  return {
    content_type: 'html',
    content: plainTextToHtml(content),
  }
}

export function plainTextToHtml(content: string) {
  return content
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function parseToolInput(input: string, required: boolean) {
  const text = input?.trim()
  if (!text) {
    if (required) {
      throw createValidationError('input is required and must be a JSON object string.')
    }
    return {} as Record<string, unknown>
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw createValidationError(`input must be valid JSON: ${formatErrorMessage(error)}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createValidationError('input must be a JSON object.')
  }

  return parsed as Record<string, unknown>
}

export function expectToolString(value: unknown, key: string) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  throw createValidationError(`${key} must be a non-empty string.`, { key })
}

export function formatToolJson(value: unknown, maxLength: number) {
  const text = JSON.stringify(value, null, 2) || String(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n...`
}
