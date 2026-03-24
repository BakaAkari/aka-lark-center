import { createValidationError } from '../../shared/errors.js'
import type { LarkSessionAttachmentSource, LarkSessionAttachmentTarget, SessionLike } from '../../shared/types.js'

export interface LarkAttachmentCandidate {
  source: LarkSessionAttachmentSource
  messageId: string
  fileKey: string
}

export interface LarkMessageAttachmentReference {
  messageId: string
  fileKey: string
  type?: string
}

export function selectSessionAttachmentCandidate(
  session?: SessionLike,
  target: LarkSessionAttachmentTarget = 'auto',
): LarkAttachmentCandidate {
  const candidates = getSessionAttachmentCandidates(session)

  if (!candidates.length) {
    throw createValidationError('当前会话上下文里没有可读取的文件附件。请直接传 fileToken，或回复一条飞书文件消息后再调用。')
  }

  if (target === 'auto') {
    if (candidates.length === 1) return candidates[0]!
    throw createValidationError(
      `当前会话里有多个文件附件候选，无法自动判断要读取哪个。请显式指定 source=current 或 source=quote。候选来源：${candidates.map(candidate => `${candidate.source}:${candidate.messageId}`).join(', ')}`,
      { candidates },
    )
  }

  const filtered = candidates.filter(candidate => candidate.source === target)
  if (filtered.length === 1) return filtered[0]!
  if (!filtered.length) {
    throw createValidationError(`当前会话里没有 source=${target} 的文件附件候选。`, {
      target,
      candidates,
    })
  }

  throw createValidationError(`source=${target} 的文件附件候选不止一个，无法自动判断。`, {
    target,
    candidates: filtered,
  })
}

export function getSessionAttachmentCandidates(session?: SessionLike): LarkAttachmentCandidate[] {
  const candidates: LarkAttachmentCandidate[] = []

  const currentCandidate = getCurrentMessageAttachmentCandidate(session)
  if (currentCandidate) candidates.push(currentCandidate)

  const quoteCandidates = getQuotedMessageAttachmentCandidates(session)
  for (const candidate of quoteCandidates) {
    candidates.push(candidate)
  }

  return dedupeAttachmentCandidates(candidates)
}

function getCurrentMessageAttachmentCandidate(session?: SessionLike): LarkAttachmentCandidate | null {
  const rawMessage = (session as SessionLike & {
    lark?: {
      event?: {
        message?: {
          message_id?: string
          message_type?: string
          content?: string
        }
      }
    }
  })?.lark?.event?.message
  const rawMessageId = normalizeString(rawMessage?.message_id)
  const rawContent = normalizeString(rawMessage?.content)

  if (rawMessage?.message_type === 'file' && rawMessageId && rawContent) {
    const rawCandidate = parseAttachmentCandidateFromRawMessage(rawMessageId, rawContent)
    if (rawCandidate) return rawCandidate
  }

  return parseAttachmentCandidateFromContent(
    'current',
    typeof session?.content === 'string' ? session.content : undefined,
    rawMessageId || normalizeString(session?.messageId),
  )
}

function getQuotedMessageAttachmentCandidates(session?: SessionLike): LarkAttachmentCandidate[] {
  const quote = session?.quote
  const elements = Array.isArray(quote?.elements) ? quote.elements : []
  const messageId = normalizeString(quote?.id || quote?.messageId)
  const fallbackCandidate = parseAttachmentCandidateFromContent(
    'quote',
    typeof quote?.content === 'string' ? quote.content : undefined,
    messageId,
  )

  const candidates: LarkAttachmentCandidate[] = []
  if (messageId) {
    for (const element of elements) {
      const candidate = parseQuotedAttachmentElement(messageId, element)
      if (candidate) candidates.push(candidate)
    }
  }
  if (fallbackCandidate) candidates.push(fallbackCandidate)

  return candidates
}

function parseQuotedAttachmentElement(messageId: string, element: unknown): LarkAttachmentCandidate | null {
  if (!element || typeof element !== 'object') return null

  const fileElement = element as {
    type?: string
    attrs?: {
      src?: string
      url?: string
    }
  }

  if (fileElement.type !== 'file') return null

  const resourceUrl = fileElement.attrs?.src || fileElement.attrs?.url
  if (typeof resourceUrl !== 'string' || !resourceUrl.trim()) return null

  const parsed = parseMessageResourceUrl(resourceUrl)
  if (!parsed || parsed.type !== 'file') return null
  if (parsed.messageId !== messageId) return null

  return {
    source: 'quote',
    messageId,
    fileKey: parsed.fileKey,
  }
}

export function parseAttachmentReferenceInput(input: string): LarkMessageAttachmentReference | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const fileTagSrc = trimmed.match(/\bsrc="([^"]+)"/)?.[1]
  const resourceUrl = fileTagSrc || trimmed
  return parseMessageResourceUrl(resourceUrl)
}

function parseMessageResourceUrl(resourceUrl: string): LarkMessageAttachmentReference | null {
  try {
    const url = new URL(resourceUrl)
    const normalizedPath = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`
    const match = normalizedPath.match(/\/im\/v1\/messages\/([^/]+)\/resources\/([^/]+)/)
    if (!match) return null
    const [, messageId, fileKey] = match
    if (!messageId || !fileKey) return null

    return {
      messageId: decodeURIComponent(messageId),
      fileKey: decodeURIComponent(fileKey),
      type: url.searchParams.get('type') || undefined,
    }
  } catch {
    return null
  }
}

function parseAttachmentCandidateFromRawMessage(messageId: string, content: string): LarkAttachmentCandidate | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return null
  }

  const fileKey = normalizeString((parsed as { file_key?: unknown })?.file_key)
  if (!fileKey) return null

  return {
    source: 'current',
    messageId,
    fileKey,
  }
}

function parseAttachmentCandidateFromContent(
  source: LarkSessionAttachmentSource,
  content?: string,
  messageIdHint?: string,
): LarkAttachmentCandidate | null {
  const normalizedContent = normalizeString(content)
  if (!normalizedContent) return null

  const parsed = parseAttachmentReferenceInput(normalizedContent)
  if (!parsed || parsed.type !== 'file') return null

  const normalizedHint = normalizeString(messageIdHint)
  if (normalizedHint && parsed.messageId !== normalizedHint) return null

  return {
    source,
    messageId: normalizedHint || parsed.messageId,
    fileKey: parsed.fileKey,
  }
}

function dedupeAttachmentCandidates(candidates: LarkAttachmentCandidate[]): LarkAttachmentCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = `${candidate.source}:${candidate.messageId}:${candidate.fileKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
