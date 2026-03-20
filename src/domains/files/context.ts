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

  return candidates
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

  if (!rawMessage || rawMessage.message_type !== 'file') return null
  if (typeof rawMessage.message_id !== 'string' || !rawMessage.message_id.trim()) return null
  if (typeof rawMessage.content !== 'string' || !rawMessage.content.trim()) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawMessage.content)
  } catch {
    return null
  }

  const fileKey = typeof (parsed as { file_key?: unknown })?.file_key === 'string'
    ? (parsed as { file_key: string }).file_key.trim()
    : ''
  if (!fileKey) return null

  return {
    source: 'current',
    messageId: rawMessage.message_id.trim(),
    fileKey,
  }
}

function getQuotedMessageAttachmentCandidates(session?: SessionLike): LarkAttachmentCandidate[] {
  const quote = session?.quote
  const elements = Array.isArray(quote?.elements) ? quote.elements : []
  const messageId = quote?.id || quote?.messageId
  if (typeof messageId !== 'string' || !messageId.trim()) return []

  const candidates: LarkAttachmentCandidate[] = []
  for (const element of elements) {
    const candidate = parseQuotedAttachmentElement(messageId.trim(), element)
    if (candidate) candidates.push(candidate)
  }

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
