import type { Context } from 'koishi'
import { resolveCommandContext } from '../../plugin/request-context.js'
import type { LarkCenter } from '../../plugin/service.js'
import { extractLarkDocumentReferences, stripLarkDocumentReference } from '../../shared/resource-ref.js'
import {
  formatLarkResourceContextBlock,
  formatLarkResourceErrorBlock,
  prependContextBlockToMessage,
} from '../../shared/resource-context.js'
import { formatErrorMessage } from '../../shared/utils.js'
import type { Config, SessionLike } from '../../shared/types.js'

interface ChatLunaHumanMessageLike {
  content?: unknown
}

interface ChatLunaPromptVariablesLike {
  [key: string]: unknown
}

type Disposer = (() => void) | undefined

export function installChatLunaContextInjection(
  ctx: Context,
  center: LarkCenter,
  config: Config,
  logger: ReturnType<Context['logger']>,
) {
  const dispose = (ctx as Context & {
    on: (name: string, listener: (...args: unknown[]) => unknown) => Disposer
  }).on('chatluna/before-chat', async (...args: unknown[]) => {
    const [, messageArg, promptVariablesArg, , sessionArg] = args
    const session = isSessionLike(sessionArg) ? sessionArg : undefined
    const message = asHumanMessage(messageArg)
    const promptVariables = asPromptVariables(promptVariablesArg)

    if (!config.chatlunaContextInjectionEnabled) return
    if (!message) return

    const originalText = getMessageText(message) || getSessionText(session)
    logger.debug('chatluna before-chat hook, messageContentType=%s, hasPromptVariables=%s', describeContentShape(message.content), promptVariables ? 'yes' : 'no')
    if (!originalText || originalText.includes('[LARK_RESOURCE_CONTEXT]')) return

    const references = extractLarkDocumentReferences(originalText)
    logger.debug('lark context injection candidates=%s', references.length)
    if (!references.length) return

    if (references.length > 1) {
      injectError(message, promptVariables, '当前消息中识别到了多个飞书文档链接。请只保留一个 wiki/doc/docx 链接后重试。')
      return
    }

    const request = resolveCommandContext(center, config, session)
    if (!request.permission.granted) {
      injectError(message, promptVariables, request.permission.error || '权限不足，无法自动读取飞书文档上下文。')
      return
    }

    const reference = references[0]
    if (!reference) return

    try {
      logger.debug('auto-reading Lark document for context: %s', reference.sourceRef)
      const resourceContext = await center.readDocumentContext({
        documentRef: reference.sourceRef,
        maxContentLength: config.chatlunaContextMaxChars,
      })
      resourceContext.matchedText = reference.matchedText

      const contextBlock = formatLarkResourceContextBlock(resourceContext)
      const userQuestion = stripLarkDocumentReference(originalText, reference) || '请基于上面的飞书文档内容回答用户刚才的问题。'
      injectContext(message, session, promptVariables, contextBlock, resourceContext, userQuestion)
      logger.debug('lark context injected successfully, resolvedType=%s, truncated=%s, contentLength=%s', resourceContext.resolvedType || resourceContext.type, resourceContext.truncated ? 'yes' : 'no', resourceContext.contentLength)
    } catch (error) {
      logger.warn('failed to auto-inject Lark document context: %s', formatErrorMessage(error))
      injectError(message, promptVariables, formatErrorMessage(error))
    }
  })

  return () => {
    dispose?.()
  }
}

function injectContext(
  message: ChatLunaHumanMessageLike,
  session: SessionLike | undefined,
  promptVariables: ChatLunaPromptVariablesLike | null,
  contextBlock: string,
  contextData: unknown,
  userQuestion: string,
) {
  const nextContent = prependContextBlockToMessage(userQuestion, contextBlock)

  setMessageText(message, nextContent)
  if (session) {
    session.content = userQuestion
  }

  if (promptVariables) {
    promptVariables.larkResourceContext = contextBlock
    promptVariables.larkResourceContextData = contextData
    promptVariables.input = nextContent
    promptVariables.userInput = userQuestion
  }
}

function injectError(
  message: ChatLunaHumanMessageLike,
  promptVariables: ChatLunaPromptVariablesLike | null,
  errorMessage: string,
) {
  const current = getMessageText(message)
  if (!current) return

  const contextBlock = formatLarkResourceErrorBlock(errorMessage)
  const nextContent = prependContextBlockToMessage(current, contextBlock)
  setMessageText(message, nextContent)

  if (promptVariables) {
    promptVariables.larkResourceContext = contextBlock
    promptVariables.larkResourceContextError = errorMessage
    promptVariables.input = nextContent
  }
}

function asHumanMessage(input: unknown) {
  return input && typeof input === 'object'
    ? input as ChatLunaHumanMessageLike
    : null
}

function asPromptVariables(input: unknown) {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? input as ChatLunaPromptVariablesLike
    : null
}

function getMessageText(message: ChatLunaHumanMessageLike) {
  return normalizeMessageContent(message.content)
}

function setMessageText(message: ChatLunaHumanMessageLike, text: string) {
  message.content = text
}

function getSessionText(session?: SessionLike) {
  return session && typeof session.content === 'string'
    ? session.content
    : ''
}

function isSessionLike(input: unknown): input is SessionLike {
  return Boolean(input && typeof input === 'object')
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  const texts = content.map((item) => {
    if (typeof item === 'string') return item
    if (!item || typeof item !== 'object') return ''

    const part = item as { text?: unknown, type?: unknown }
    if (typeof part.text === 'string') return part.text
    if (part.type === 'text' && typeof (item as { content?: unknown }).content === 'string') {
      return (item as { content?: string }).content || ''
    }
    return ''
  }).filter(Boolean)

  return texts.join('\n').trim()
}

function describeContentShape(content: unknown) {
  if (typeof content === 'string') return 'string'
  if (Array.isArray(content)) return 'array'
  if (content == null) return 'empty'
  return typeof content
}
