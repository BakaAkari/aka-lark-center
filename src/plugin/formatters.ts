import type { LarkCenterErrorCode } from '../shared/errors.js'
import { LarkCenterError } from '../shared/errors.js'
import { formatJson, formatErrorMessage, formatToolJson } from '../shared/utils.js'
import type {
  LarkOutputPreferences,
} from '../shared/types.js'
import type {
  AddMessageReactionPresentation,
  AppendDocumentContentPresentation,
  ChatListPresentation,
  CreateDocumentPresentation,
  PingPresentation,
  ReadDocumentContentPresentation,
  ReplyMessagePresentation,
  SendMessagePresentation,
  TransferDocumentOwnershipPresentation,
} from './presenters.js'

export interface ErrorPresentation {
  code: LarkCenterErrorCode | 'unknown_error'
  message: string
  details?: Record<string, unknown>
}

export function presentError(error: unknown): ErrorPresentation {
  if (error instanceof LarkCenterError) {
    return {
      code: error.code,
      message: error.message,
      details: error.options.details,
    }
  }

  return {
    code: 'unknown_error',
    message: formatErrorMessage(error),
  }
}

export function formatCommandError(error: unknown) {
  return presentError(error).message
}

export function formatToolError(toolName: string, error: unknown, output: LarkOutputPreferences) {
  const presented = presentError(error)
  return formatToolJson({
    ok: false,
    tool: toolName,
    error: {
      code: presented.code,
      message: presented.message,
      details: presented.details,
    },
  }, output.maxResponseLength)
}

export function formatPingResult(result: PingPresentation) {
  return [
    'Lark 凭证可用。',
    `baseUrl: ${result.baseUrl}`,
    `expireInSeconds: ${result.expireInSeconds}`,
    `tokenPreview: ${result.tokenPreview}`,
  ].join('\n')
}

export function formatChatListResult(result: ChatListPresentation, output: LarkOutputPreferences) {
  if (!result.items.length) {
    return formatJson(result.raw, output.maxResponseLength)
  }

  const lines = result.items.map((item, index) => {
    const title = item.name || '(未命名会话)'
    const chatId = item.chat_id || '(无 chat_id)'
    const description = item.description ? ` | ${item.description}` : ''
    return `${index + 1}. ${title}\nchat_id: ${chatId}${description}`
  })

  if (result.hasMore && result.nextPageToken) {
    lines.push(`next_page_token: ${result.nextPageToken}`)
  }

  return lines.join('\n\n')
}

export function formatCreateDocumentResult(result: CreateDocumentPresentation) {
  return [
    '文档创建成功。',
    `document_id: ${result.document.documentId || '(unknown)'}`,
    result.document.title ? `title: ${result.document.title}` : '',
    typeof result.document.revisionId === 'number' ? `revision_id: ${result.document.revisionId}` : '',
    result.document.url ? `url: ${result.document.url}` : '',
    result.ownershipTransferred ? `owner_open_id: ${result.ownerOpenId || '(unknown)'}` : '',
    result.ownershipTransferred && result.retainedBotPermission ? `bot_perm: ${result.retainedBotPermission}` : '',
    `appended: ${result.appended ? 'yes' : 'no'}`,
  ].filter(Boolean).join('\n')
}

export function formatTransferDocumentOwnershipResult(result: TransferDocumentOwnershipPresentation) {
  return [
    '文档 owner 转移成功。',
    `document_id: ${result.documentId}`,
    `owner_open_id: ${result.ownerOpenId}`,
    `bot_perm: ${result.retainedBotPermission}`,
    `stay_put: ${result.stayPut ? 'yes' : 'no'}`,
    result.url ? `url: ${result.url}` : '',
  ].filter(Boolean).join('\n')
}

export function formatAppendDocumentContentResult(result: AppendDocumentContentPresentation) {
  return [
    '文档内容追加成功。',
    `document_id: ${result.documentId}`,
    `parent_block_id: ${result.parentBlockId}`,
    `block_count: ${result.blockCount}`,
  ].join('\n')
}

export function formatReadDocumentContentResult(result: ReadDocumentContentPresentation, output: LarkOutputPreferences) {
  const header = [
    '文档内容读取成功。',
    `document_id: ${result.documentId}`,
    result.title ? `title: ${result.title}` : '',
    result.url ? `url: ${result.url}` : '',
  ].filter(Boolean).join('\n')

  const content = result.content || '(文档当前为空)'
  const text = `${header}\n\n${content}`
  if (text.length <= output.maxResponseLength) {
    return text
  }

  const reserved = header.length + '\n\n...\n'.length
  const truncatedContent = content.slice(0, Math.max(output.maxResponseLength - reserved, 0))
  return `${header}\n\n${truncatedContent}\n...`
}

export function formatSendMessageResult(result: SendMessagePresentation) {
  return [
    '消息发送成功。',
    `receive_id_type: ${result.receiveIdType}`,
    `message_id: ${result.messageId || '(unknown)'}`,
    result.rootId ? `root_id: ${result.rootId}` : '',
  ].filter(Boolean).join('\n')
}

export function formatReplyMessageResult(result: ReplyMessagePresentation) {
  return [
    '消息回复成功。',
    `message_id: ${result.messageId || '(unknown)'}`,
    result.parentId ? `parent_id: ${result.parentId}` : '',
    result.threadId ? `thread_id: ${result.threadId}` : '',
    result.rootId ? `root_id: ${result.rootId}` : '',
  ].filter(Boolean).join('\n')
}

export function formatAddMessageReactionResult(result: AddMessageReactionPresentation) {
  return [
    '表情回复添加成功。',
    `message_id: ${result.messageId}`,
    `emoji_type: ${result.emojiType}`,
    result.reactionId ? `reaction_id: ${result.reactionId}` : '',
  ].filter(Boolean).join('\n')
}
