import type { LarkResourceContext } from './types.js'

export function truncateResourceContent(content: string, maxLength?: number) {
  const normalized = typeof content === 'string' ? content : ''
  const limit = typeof maxLength === 'number' && maxLength > 0
    ? Math.floor(maxLength)
    : undefined

  if (!limit || normalized.length <= limit) {
    return {
      content: normalized,
      truncated: false,
      contentLength: normalized.length,
    }
  }

  return {
    content: normalized.slice(0, limit),
    truncated: true,
    contentLength: normalized.length,
  }
}

export function formatLarkResourceContextBlock(context: LarkResourceContext) {
  const lines = [
    '[LARK_RESOURCE_CONTEXT]',
    `type: ${context.type}`,
    context.resolvedType ? `resolved_type: ${context.resolvedType}` : '',
    context.resolvedToken ? `resolved_token: ${context.resolvedToken}` : '',
    context.title ? `title: ${context.title}` : '',
    context.url ? 'source_url_available: true' : '',
    `permission: ${context.permissionState}`,
    `truncated: ${context.truncated ? 'true' : 'false'}`,
    `content_length: ${context.contentLength}`,
    context.error ? `error: ${context.error}` : '',
    'content:',
    context.content || '(empty)',
    '[/LARK_RESOURCE_CONTEXT]',
  ].filter(Boolean)

  return lines.join('\n')
}

export function formatLarkResourceErrorBlock(message: string) {
  return [
    '[LARK_RESOURCE_CONTEXT]',
    'status: error',
    `error: ${message}`,
    '[/LARK_RESOURCE_CONTEXT]',
  ].join('\n')
}

export function prependContextBlockToMessage(original: string, contextBlock: string) {
  const content = original.trim()
  if (!content) return contextBlock

  return [
    '请优先根据下面的飞书资源上下文回答用户问题；如果上下文标记为 truncated=true，请保守回答，不要假设未提供的内容。',
    '',
    contextBlock,
    '',
    '[USER_QUESTION]',
    content,
    '[/USER_QUESTION]',
  ].join('\n')
}

export function buildContextPrefixBlock(contextBlock: string) {
  return [
    '请优先根据下面的飞书资源上下文回答用户问题；如果上下文标记为 truncated=true，请保守回答，不要假设未提供的内容。',
    '',
    contextBlock,
  ].join('\n')
}
