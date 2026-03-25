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
  DriveFileListPresentation,
  DriveRootFolderPresentation,
  KnowledgeLookupPresentation,
  PingPresentation,
  ReadDocumentContentPresentation,
  ReadFileContentPresentation,
  ReadMessageAttachmentPresentation,
  ReplyMessagePresentation,
  SearchDocsPresentation,
  SendMessagePresentation,
  TransferDocumentOwnershipPresentation,
  WikiNodeListPresentation,
  WikiNodePresentation,
  WikiSpaceListPresentation,
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

export function formatDriveRootFolderResult(result: DriveRootFolderPresentation) {
  return [
    '根文件夹获取成功。',
    result.id ? `id: ${result.id}` : '',
    result.token ? `token: ${result.token}` : '',
    result.name ? `name: ${result.name}` : '',
    result.parentId ? `parent_id: ${result.parentId}` : '',
    result.ownerId ? `owner_id: ${result.ownerId}` : '',
  ].filter(Boolean).join('\n')
}

export function formatDriveFileListResult(result: DriveFileListPresentation, output: LarkOutputPreferences) {
  if (!result.items.length) {
    return [
      '当前文件夹下没有可列出的资源。',
      result.folderToken ? `folder_token: ${result.folderToken}` : '',
    ].filter(Boolean).join('\n')
  }

  const header = [
    '文件夹清单获取成功。',
    result.folderToken ? `folder_token: ${result.folderToken}` : '',
  ].filter(Boolean).join('\n')

  const body = result.items.map((item, index) => [
    `${index + 1}. ${item.name || '(未命名资源)'}`,
    item.type ? `type: ${item.type}` : '',
    item.token ? `token: ${item.token}` : '',
    item.parentToken ? `parent_token: ${item.parentToken}` : '',
    item.url ? `url: ${item.url}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const footer = result.hasMore && result.nextPageToken
    ? `\n\nnext_page_token: ${result.nextPageToken}`
    : ''

  return truncateBlock(`${header}\n\n${body}${footer}`, output.maxResponseLength)
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
  if (!output.maxResponseLength || text.length <= output.maxResponseLength) {
    return text
  }

  const reserved = header.length + '\n\n...\n'.length
  const truncatedContent = content.slice(0, Math.max(output.maxResponseLength - reserved, 0))
  return `${header}\n\n${truncatedContent}\n...`
}

export function formatReadFileContentResult(result: ReadFileContentPresentation, output: LarkOutputPreferences) {
  const titleLine = result.title && result.title !== result.fileName
    ? `title: ${result.title}`
    : ''

  const header = [
    '文件内容读取成功。',
    `file_token: ${result.fileToken}`,
    result.fileName ? `file_name: ${result.fileName}` : '',
    titleLine,
    result.mimeType ? `mime_type: ${result.mimeType}` : '',
    result.extension ? `extension: ${result.extension}` : '',
    typeof result.sizeBytes === 'number' ? `size_bytes: ${result.sizeBytes}` : '',
    result.url ? `url: ${result.url}` : '',
  ].filter(Boolean).join('\n')

  const content = result.text || '(文件当前为空)'
  const text = `${header}\n\n${content}`
  if (!output.maxResponseLength || text.length <= output.maxResponseLength) {
    return text
  }

  const reserved = header.length + '\n\n...\n'.length
  const truncatedContent = content.slice(0, Math.max(output.maxResponseLength - reserved, 0))
  return `${header}\n\n${truncatedContent}\n...`
}

export function formatReadMessageAttachmentResult(result: ReadMessageAttachmentPresentation, output: LarkOutputPreferences) {
  const header = [
    '消息附件内容读取成功。',
    `message_id: ${result.messageId}`,
    `file_key: ${result.fileKey}`,
    result.contextSource ? `source: ${result.contextSource}` : '',
    result.fileName ? `file_name: ${result.fileName}` : '',
    result.mimeType ? `mime_type: ${result.mimeType}` : '',
    result.extension ? `extension: ${result.extension}` : '',
    typeof result.sizeBytes === 'number' ? `size_bytes: ${result.sizeBytes}` : '',
  ].filter(Boolean).join('\n')

  const content = result.text || '(附件当前为空)'
  const text = `${header}\n\n${content}`
  if (!output.maxResponseLength || text.length <= output.maxResponseLength) {
    return text
  }

  const reserved = header.length + '\n\n...\n'.length
  const truncatedContent = content.slice(0, Math.max(output.maxResponseLength - reserved, 0))
  return `${header}\n\n${truncatedContent}\n...`
}

export function formatSearchDocsResult(result: SearchDocsPresentation, output: LarkOutputPreferences) {
  if (!result.items.length) {
    return `未找到匹配的飞书文档。\nsearch_key: ${result.searchKey}`
  }

  const header = [
    '文档搜索完成。',
    `search_key: ${result.searchKey}`,
    typeof result.total === 'number' ? `total: ${result.total}` : '',
  ].filter(Boolean).join('\n')

  const body = result.items.map((item, index) => [
    `${index + 1}. ${item.title || '(未命名文档)'}`,
    `docs_type: ${item.docsType || '(unknown)'}`,
    `docs_token: ${item.docsToken || '(unknown)'}`,
    item.url ? `url: ${item.url}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const footer = result.hasMore && typeof result.nextOffset === 'number'
    ? `\n\nnext_offset: ${result.nextOffset}`
    : ''

  return truncateBlock(`${header}\n\n${body}${footer}`, output.maxResponseLength)
}

export function formatKnowledgeLookupResult(result: KnowledgeLookupPresentation, output: LarkOutputPreferences) {
  const header = [
    '飞书知识检索完成。',
    `query: ${result.query}`,
    typeof result.total === 'number' ? `total: ${result.total}` : '',
  ].filter(Boolean).join('\n')

  const candidates = result.items.length
    ? result.items.map((item, index) => [
      `${index + 1}. ${item.title || '(未命名文档)'}`,
      `docs_type: ${item.docsType || '(unknown)'}`,
      `docs_token: ${item.docsToken || '(unknown)'}`,
      item.url ? `url: ${item.url}` : '',
    ].filter(Boolean).join('\n')).join('\n\n')
    : '未找到匹配的飞书文档候选。'

  const contexts = result.contexts.length
    ? result.contexts.map((item, index) => [
      `[context ${index + 1}] ${item.title || '(未命名文档)'}`,
      item.docsType ? `docs_type: ${item.docsType}` : '',
      item.docsToken ? `docs_token: ${item.docsToken}` : '',
      item.readError ? `read_error: ${item.readError}` : '',
      item.content ? item.content : '',
      item.truncated ? '...' : '',
    ].filter(Boolean).join('\n')).join('\n\n')
    : '当前没有自动读取到可直接用于回答的正文上下文。'

  const footer = result.hasMore && typeof result.nextOffset === 'number'
    ? `\n\nnext_offset: ${result.nextOffset}`
    : ''

  return truncateBlock(`${header}\n\n候选文档：\n${candidates}\n\n已读取上下文：\n${contexts}${footer}`, output.maxResponseLength)
}

export function formatWikiSpaceListResult(result: WikiSpaceListPresentation, output: LarkOutputPreferences) {
  if (!result.items.length) {
    return '当前没有可访问的知识空间。'
  }

  const body = result.items.map((item, index) => [
    `${index + 1}. ${item.name || '(未命名知识空间)'}`,
    `space_id: ${item.spaceId || '(unknown)'}`,
    item.description ? `description: ${item.description}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const footer = result.hasMore && result.nextPageToken
    ? `\n\nnext_page_token: ${result.nextPageToken}`
    : ''

  return truncateBlock(`知识空间列表获取成功。\n\n${body}${footer}`, output.maxResponseLength)
}

export function formatWikiNodeResult(result: WikiNodePresentation) {
  return [
    '知识库节点读取成功。',
    result.title ? `title: ${result.title}` : '',
    result.spaceId ? `space_id: ${result.spaceId}` : '',
    result.nodeToken ? `node_token: ${result.nodeToken}` : '',
    result.parentNodeToken ? `parent_node_token: ${result.parentNodeToken}` : '',
    result.objType ? `obj_type: ${result.objType}` : '',
    result.objToken ? `obj_token: ${result.objToken}` : '',
    typeof result.hasChild === 'boolean' ? `has_child: ${result.hasChild ? 'yes' : 'no'}` : '',
    result.url ? `url: ${result.url}` : '',
  ].filter(Boolean).join('\n')
}

export function formatWikiNodeListResult(result: WikiNodeListPresentation, output: LarkOutputPreferences) {
  if (!result.items.length) {
    return [
      '当前节点下没有子节点。',
      `space_id: ${result.spaceId}`,
      result.parentNodeToken ? `parent_node_token: ${result.parentNodeToken}` : '',
    ].filter(Boolean).join('\n')
  }

  const header = [
    '知识库子节点列表获取成功。',
    `space_id: ${result.spaceId}`,
    result.parentNodeToken ? `parent_node_token: ${result.parentNodeToken}` : '',
  ].filter(Boolean).join('\n')

  const body = result.items.map((item, index) => [
    `${index + 1}. ${item.title || '(未命名节点)'}`,
    `node_token: ${item.nodeToken || '(unknown)'}`,
    item.objType ? `obj_type: ${item.objType}` : '',
    item.objToken ? `obj_token: ${item.objToken}` : '',
    item.url ? `url: ${item.url}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const footer = result.hasMore && result.nextPageToken
    ? `\n\nnext_page_token: ${result.nextPageToken}`
    : ''

  return truncateBlock(`${header}\n\n${body}${footer}`, output.maxResponseLength)
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

function truncateBlock(text: string, maxLength: number) {
  if (!maxLength || text.length <= maxLength) return text
  return `${text.slice(0, Math.max(maxLength - 4, 0))}\n...`
}
