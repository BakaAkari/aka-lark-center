import type { SessionLike } from '../../shared/types.js'

interface DiagnosticSummary {
  messageId?: string
  contentPreview?: string
  quoteId?: string
  quoteContentPreview?: string
  quoteElementsCount?: number
  sessionKeys: string[]
  quoteKeys: string[]
  hasLarkEvent: boolean
  larkEventType?: string
  larkMessageId?: string
  larkMessageType?: string
  larkContentPreview?: string
}

export function summarizeChatLunaSession(session?: SessionLike): DiagnosticSummary {
  const rawSession = asRecord(session)
  const quote = asRecord(rawSession?.quote)
  const lark = asRecord(rawSession?.lark)
  const larkEvent = asRecord(lark?.event)
  const larkMessage = asRecord(larkEvent?.message)

  return {
    messageId: normalizeString(rawSession?.messageId),
    contentPreview: previewText(rawSession?.content),
    quoteId: normalizeString(quote?.id) || normalizeString(quote?.messageId),
    quoteContentPreview: previewText(quote?.content),
    quoteElementsCount: Array.isArray(quote?.elements) ? quote.elements.length : undefined,
    sessionKeys: Object.keys(rawSession || {}).sort(),
    quoteKeys: Object.keys(quote || {}).sort(),
    hasLarkEvent: Boolean(larkEvent),
    larkEventType: normalizeString(asRecord(rawSession?.event?.referrer)?.type),
    larkMessageId: normalizeString(larkMessage?.message_id),
    larkMessageType: normalizeString(larkMessage?.message_type),
    larkContentPreview: previewText(larkMessage?.content),
  }
}

function asRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === 'object' ? value as Record<string, any> : undefined
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function previewText(value: unknown, maxLength = 160): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}
