import { createValidationError } from './errors.js'
import type { LarkDocumentReference } from './types.js'

export function parseLarkDocumentReference(input: string): LarkDocumentReference {
  const normalized = extractMarkdownLinkUrl(input) || input.trim()
  if (!normalized) {
    throw createValidationError('请输入 documentId、飞书文档链接或 wiki 链接。')
  }

  const fromUrl = parseLarkDocumentReferenceFromUrl(normalized)
  if (fromUrl) {
    return {
      ...fromUrl,
      matchedText: input.trim(),
      sourceRef: normalized,
    }
  }

  if (/^wik/i.test(normalized)) {
    return {
      kind: 'wiki',
      token: normalized,
      matchedText: input.trim(),
      sourceRef: normalized,
    }
  }

  if (/^doc/i.test(normalized) && !/^docx/i.test(normalized)) {
    return {
      kind: 'doc',
      token: normalized,
      matchedText: input.trim(),
      sourceRef: normalized,
    }
  }

  return {
    kind: 'docx',
    token: normalized,
    matchedText: input.trim(),
    sourceRef: normalized,
  }
}

export function extractLarkDocumentReferences(text: string): LarkDocumentReference[] {
  const input = text.trim()
  if (!input) return []

  const matches: Array<{ text: string, sourceRef: string }> = []
  const seenSources = new Set<string>()

  for (const match of extractMarkdownLinkUrls(input)) {
    const normalized = match.url.trim()
    if (!normalized || seenSources.has(normalized)) continue
    seenSources.add(normalized)
    matches.push({
      text: match.text,
      sourceRef: normalized,
    })
  }

  for (const raw of extractHttpUrls(input)) {
    const normalized = stripTrailingUrlPunctuation(raw)
    if (!normalized || seenSources.has(normalized)) continue
    seenSources.add(normalized)
    matches.push({
      text: normalized,
      sourceRef: normalized,
    })
  }

  if (!matches.length) {
    if (!looksLikeStandaloneDocumentToken(input)) {
      return []
    }

    try {
      return [parseLarkDocumentReference(input)]
    } catch {
      return []
    }
  }

  const refs: LarkDocumentReference[] = []
  const seenKeys = new Set<string>()
  for (const match of matches) {
    try {
      const parsed = parseLarkDocumentReference(match.text)
      const key = `${parsed.kind}:${parsed.token}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      refs.push({
        ...parsed,
        matchedText: match.text,
        sourceRef: match.sourceRef,
      })
    } catch {}
  }

  return refs
}

export function extractFirstLarkDocumentReference(text: string) {
  return extractLarkDocumentReferences(text)[0] || null
}

export function stripLarkDocumentReference(text: string, reference: Pick<LarkDocumentReference, 'matchedText' | 'sourceRef'>) {
  let result = text

  if (reference.matchedText) {
    result = result.replace(reference.matchedText, ' ')
  }

  if (reference.sourceRef && reference.sourceRef !== reference.matchedText) {
    result = result.replace(reference.sourceRef, ' ')
  }

  return result
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMarkdownLinkUrl(input: string) {
  const match = input.trim().match(/^\[[^\]]*]\((https?:\/\/[^)\s]+)\)$/i)
  return match?.[1]
}

function extractMarkdownLinkUrls(input: string) {
  const matches = input.matchAll(/(\[[^\]]*]\((https?:\/\/[^)\s]+)\))/gi)
  return Array.from(matches, match => ({
    text: match[1],
    url: match[2],
  })).filter((value): value is { text: string, url: string } => (
    typeof value.text === 'string'
    && typeof value.url === 'string'
    && Boolean(value.text)
    && Boolean(value.url)
  ))
}

function extractHttpUrls(input: string) {
  const matches = input.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)
  return Array.from(matches, match => match[0]).filter((value): value is string => typeof value === 'string' && Boolean(value))
}

function stripTrailingUrlPunctuation(input: string) {
  return input.replace(/[.,!?;:)\]}。，、！？；：]+$/u, '')
}

function looksLikeStandaloneDocumentToken(input: string) {
  const normalized = input.trim()
  if (!normalized || /\s/.test(normalized)) return false
  return /^wik/i.test(normalized) || /^docx/i.test(normalized) || /^doc/i.test(normalized)
}

function parseLarkDocumentReferenceFromUrl(input: string) {
  try {
    const url = new URL(input)
    const segments = url.pathname.split('/').filter(Boolean)
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      const token = segments[index + 1]
      if (!segment || !token) continue

      if (segment === 'wiki') {
        return { kind: 'wiki' as const, token: decodeURIComponent(token) }
      }

      if (segment === 'docx') {
        return { kind: 'docx' as const, token: decodeURIComponent(token) }
      }

      if (segment === 'doc') {
        return { kind: 'doc' as const, token: decodeURIComponent(token) }
      }
    }
  } catch {}

  return null
}
