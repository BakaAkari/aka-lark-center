import type { Context } from 'koishi'
import { resolveCommandContext } from '../../plugin/request-context.js'
import type { LarkCenter } from '../../plugin/service.js'
import { extractLarkDocumentReferences, stripLarkDocumentReference } from '../../shared/resource-ref.js'
import {
  buildContextPrefixBlock,
  formatLarkResourceContextBlock,
  formatLarkResourceErrorBlock,
  prependContextBlockToMessage,
} from '../../shared/resource-context.js'
import { formatErrorMessage } from '../../shared/utils.js'
import type { Config, LarkKnowledgeLookupResult, SessionLike } from '../../shared/types.js'
import {
  buildAutomaticKnowledgeLookupParams,
  looksLikeKnowledgeLookupQuestion,
  looksLikeKnowledgeScopeStatement,
} from './knowledge-strategy.js'

interface ChatLunaHumanMessageLike {
  content?: unknown
}

interface ChatLunaTextPartLike {
  type?: string
  text?: string
  content?: string
  [key: string]: unknown
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
    if (!originalText || hasLarkContextBlock(originalText)) return

    const references = extractLarkDocumentReferences(originalText)
    logger.debug('lark context injection candidates=%s', references.length)
    if (!references.length) {
      const scopeBlock = looksLikeKnowledgeScopeStatement(originalText)
        ? buildKnowledgeScopeBlock()
        : ''

      if (looksLikeKnowledgeLookupQuestion(originalText)) {
        const request = resolveCommandContext(center, config, session)
        if (!request.permission.granted) {
          injectError(message, promptVariables, request.permission.error || '权限不足，无法自动检索飞书文档。')
          return
        }

        try {
          const lookupParams = buildAutomaticKnowledgeLookupParams(originalText, config.chatlunaContextMaxChars)
          logger.debug('auto-running Lark knowledge lookup for current turn')
          const knowledgeResult = await center.knowledgeLookup(lookupParams)
          injectKnowledgeLookup(message, session, promptVariables, originalText, knowledgeResult, scopeBlock)
          logger.debug(
            'lark knowledge lookup injected successfully, query=%s, items=%s, contexts=%s',
            lookupParams.query,
            knowledgeResult.items.length,
            knowledgeResult.contexts.length,
          )
        } catch (error) {
          logger.warn('failed to auto-run Lark knowledge lookup: %s', formatErrorMessage(error))
          injectKnowledgeLookupError(message, session, promptVariables, originalText, formatErrorMessage(error), scopeBlock)
        }
      } else if (scopeBlock) {
        injectKnowledgeScope(message, session, promptVariables, originalText, scopeBlock)
        logger.debug('lark knowledge scope context injected for current turn')
      }
      return
    }

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
      const userQuestion = stripLarkDocumentReference(originalText, reference) || '请说明当前飞书文档无法通过 lark-center 读取，不要尝试使用网页抓取工具读取该飞书链接。'
      injectDocumentReadError(message, session, promptVariables, userQuestion, formatErrorMessage(error))
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
  const originalContent = message.content
  const nextContent = prependContextBlockToMessage(userQuestion, contextBlock)
  setAugmentedMessageContent(message, originalContent, contextBlock, nextContent)
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
  setAugmentedMessageContent(message, message.content, contextBlock, nextContent)

  if (promptVariables) {
    promptVariables.larkResourceContext = contextBlock
    promptVariables.larkResourceContextError = errorMessage
    promptVariables.input = nextContent
  }
}

function injectDocumentReadError(
  message: ChatLunaHumanMessageLike,
  session: SessionLike | undefined,
  promptVariables: ChatLunaPromptVariablesLike | null,
  userQuestion: string,
  errorMessage: string,
) {
  const contextBlock = [
    '[LARK_RESOURCE_CONTEXT]',
    'status: error',
    `error: ${errorMessage}`,
    'instruction: The Feishu/Lark document link has already been detected, but lark-center failed to read it directly.',
    'instruction: Do not use generic web fetching tools to read Feishu/Lark wiki/doc/docx links, because they usually return page shell HTML instead of document content.',
    'instruction: Explain the direct-read failure clearly and only ask for a direct manual fallback such as another readable Feishu link or pasted content if necessary.',
    '[/LARK_RESOURCE_CONTEXT]',
  ].join('\n')

  const nextContent = prependContextBlockToMessage(userQuestion, contextBlock)
  setAugmentedMessageContent(message, message.content, contextBlock, nextContent)

  if (session) {
    session.content = userQuestion
  }

  if (promptVariables) {
    promptVariables.larkResourceContext = contextBlock
    promptVariables.larkResourceContextError = errorMessage
    promptVariables.input = nextContent
    promptVariables.userInput = userQuestion
  }
}

function injectKnowledgeLookup(
  message: ChatLunaHumanMessageLike,
  session: SessionLike | undefined,
  promptVariables: ChatLunaPromptVariablesLike | null,
  userQuestion: string,
  result: LarkKnowledgeLookupResult,
  scopeBlock?: string,
) {
  const contextBlock = [scopeBlock, formatKnowledgeLookupContextBlock(result)].filter(Boolean).join('\n\n')
  const nextContent = prependContextBlockToMessage(userQuestion, contextBlock)
  setAugmentedMessageContent(message, message.content, contextBlock, nextContent)

  if (session) {
    session.content = userQuestion
  }

  if (promptVariables) {
    promptVariables.larkKnowledgeLookup = true
    promptVariables.larkKnowledgeLookupData = result
    promptVariables.input = nextContent
    promptVariables.userInput = userQuestion
  }
}

function injectKnowledgeLookupError(
  message: ChatLunaHumanMessageLike,
  session: SessionLike | undefined,
  promptVariables: ChatLunaPromptVariablesLike | null,
  userQuestion: string,
  errorMessage: string,
  scopeBlock?: string,
) {
  const errorBlock = [
    '[LARK_KNOWLEDGE_CONTEXT]',
    'status: error',
    `error: ${errorMessage}`,
    'instruction: Explain that automatic Feishu document lookup failed in the current authorized scope. The search scope is already the accessible Feishu/Lark document scope. Do not ask for generic external document sources such as websites, repositories, or public documentation portals. You may suggest retrying later or asking the user to provide a direct Feishu document link if they want a manual fallback.',
    '[/LARK_KNOWLEDGE_CONTEXT]',
  ].join('\n')

  const contextBlock = [scopeBlock, errorBlock].filter(Boolean).join('\n\n')

  const nextContent = prependContextBlockToMessage(userQuestion, contextBlock)
  setAugmentedMessageContent(message, message.content, contextBlock, nextContent)

  if (session) {
    session.content = userQuestion
  }

  if (promptVariables) {
    promptVariables.larkKnowledgeLookup = true
    promptVariables.larkKnowledgeLookupError = errorMessage
    promptVariables.input = nextContent
    promptVariables.userInput = userQuestion
  }
}

function injectKnowledgeScope(
  message: ChatLunaHumanMessageLike,
  session: SessionLike | undefined,
  promptVariables: ChatLunaPromptVariablesLike | null,
  userQuestion: string,
  scopeBlock: string,
) {
  const nextContent = prependContextBlockToMessage(userQuestion, scopeBlock)
  setAugmentedMessageContent(message, message.content, scopeBlock, nextContent)

  if (session) {
    session.content = userQuestion
  }

  if (promptVariables) {
    promptVariables.larkKnowledgeScope = true
    promptVariables.input = nextContent
    promptVariables.userInput = userQuestion
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

function setAugmentedMessageContent(
  message: ChatLunaHumanMessageLike,
  originalContent: unknown,
  contextBlock: string,
  fallbackText: string,
) {
  const prefix = buildContextPrefixBlock(contextBlock)
  if (typeof originalContent === 'string' || originalContent == null) {
    setMessageText(message, fallbackText)
    return
  }

  if (Array.isArray(originalContent)) {
    message.content = [
      createContextTextPart(prefix),
      ...originalContent,
    ]
    return
  }

  setMessageText(message, fallbackText)
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

function createContextTextPart(text: string): ChatLunaTextPartLike {
  return {
    type: 'text',
    text,
  }
}

function describeContentShape(content: unknown) {
  if (typeof content === 'string') return 'string'
  if (Array.isArray(content)) return 'array'
  if (content == null) return 'empty'
  return typeof content
}

function hasLarkContextBlock(text: string) {
  return text.includes('[LARK_RESOURCE_CONTEXT]')
    || text.includes('[LARK_RESOURCE_ERROR]')
    || text.includes('[LARK_KNOWLEDGE_CONTEXT]')
    || text.includes('[LARK_KNOWLEDGE_SCOPE]')
}

function formatKnowledgeLookupContextBlock(result: LarkKnowledgeLookupResult) {
  const lines: string[] = [
    '[LARK_KNOWLEDGE_CONTEXT]',
    'status: ok',
    `query: ${result.query}`,
    `candidate_count: ${result.items.length}`,
    `read_context_count: ${result.contexts.length}`,
    typeof result.total === 'number' ? `total: ${result.total}` : '',
    'instruction: Use the searched Feishu document candidates and the auto-read contents below to answer the user directly. The search scope is already the currently accessible Feishu/Lark document scope. Do not ask the user for generic external document sources.',
  ].filter(Boolean)

  if (!result.items.length) {
    lines.push('candidates: none')
  } else {
    lines.push('candidates:')
    for (const [index, item] of result.items.slice(0, 8).entries()) {
      lines.push(`${index + 1}. ${item.title || '(未命名文档)'} | type=${item.docsType || 'unknown'} | token=${item.docsToken || 'unknown'}`)
    }
  }

  if (!result.contexts.length) {
    lines.push('read_contexts: none')
  } else {
    lines.push('read_contexts:')
    for (const [index, item] of result.contexts.entries()) {
      lines.push(`--- context ${index + 1} ---`)
      lines.push(`title: ${item.title || '(未命名文档)'}`)
      lines.push(`docs_type: ${item.docsType || 'unknown'}`)
      lines.push(`content_length: ${item.contentLength}`)
      lines.push(`truncated: ${item.truncated ? 'true' : 'false'}`)
      if (item.readError) {
        lines.push(`read_error: ${item.readError}`)
      } else {
        lines.push('content:')
        lines.push(truncateKnowledgeBlockContent(item.content, 1600) || '(empty)')
      }
    }
  }

  lines.push('[/LARK_KNOWLEDGE_CONTEXT]')
  return lines.join('\n')
}

function truncateKnowledgeBlockContent(content: string, maxLength: number) {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}\n...`
}

function buildKnowledgeScopeBlock() {
  return [
    '[LARK_KNOWLEDGE_SCOPE]',
    'scope: current accessible Feishu/Lark documents in the authorized aka-lark-center scope',
    'instruction: Interpret the user request against this Feishu/Lark scope by default. Do not ask for generic external sources such as websites, GitHub repositories, or public docs portals.',
    'If the user asks to search all accessible Feishu documents, understand that they mean this current authorized scope.',
    '[/LARK_KNOWLEDGE_SCOPE]',
  ].join('\n')
}
