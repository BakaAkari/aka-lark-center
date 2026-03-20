import type {
  LarkAddMessageReactionResult,
  LarkAppendDocumentContentResult,
  LarkChatSummary,
  LarkCreateDocumentResult,
  LarkDocumentSummary,
  LarkListChatsResult,
  LarkPingResult,
  LarkReadDocumentContentResult,
  LarkReadFileContentResult,
  LarkReadMessageAttachmentResult,
  LarkReplyMessageResult,
  LarkSendMessageResult,
  LarkTransferDocumentOwnershipResult,
} from '../shared/types.js'

export interface PingPresentation {
  status: 'ok'
  baseUrl: string
  expireInSeconds: number
  tokenPreview: string
}

export interface ChatListPresentation {
  items: LarkChatSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface CreateDocumentPresentation {
  document: LarkDocumentSummary
  appended: boolean
  ownershipTransferred: boolean
  ownerOpenId?: string
  retainedBotPermission?: LarkTransferDocumentOwnershipResult['retainedBotPermission']
}

export interface TransferDocumentOwnershipPresentation {
  documentId: string
  ownerOpenId: string
  retainedBotPermission: LarkTransferDocumentOwnershipResult['retainedBotPermission']
  stayPut: boolean
  url?: string
}

export interface AppendDocumentContentPresentation {
  documentId: string
  parentBlockId: string
  blockCount: number
  childBlockIds: string[]
}

export interface ReadDocumentContentPresentation {
  ok: true
  documentId: string
  title?: string
  url?: string
  content: string
}

export interface ReadFileContentPresentation {
  ok: true
  fileToken: string
  fileName?: string
  title?: string
  url?: string
  mimeType?: string
  extension?: string
  sizeBytes?: number
  text: string
}

export interface ReadMessageAttachmentPresentation {
  ok: true
  messageId: string
  fileKey: string
  contextSource?: LarkReadMessageAttachmentResult['contextSource']
  fileName?: string
  mimeType?: string
  extension?: string
  sizeBytes?: number
  text: string
}

export interface SendMessagePresentation {
  ok: true
  receiveIdType: LarkSendMessageResult['receiveIdType']
  messageId?: string
  rootId?: string
}

export interface ReplyMessagePresentation {
  ok: true
  messageId?: string
  parentId?: string
  threadId?: string
  rootId?: string
}

export interface AddMessageReactionPresentation {
  ok: true
  messageId: string
  emojiType: string
  reactionId?: string
}

export function presentPingResult(result: LarkPingResult, baseUrl: string, tokenPreview: string): PingPresentation {
  return {
    status: 'ok',
    baseUrl,
    expireInSeconds: result.expireInSeconds,
    tokenPreview,
  }
}

export function presentChatListResult(result: LarkListChatsResult): ChatListPresentation {
  return {
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
    raw: result.raw,
  }
}

export function presentCreateDocumentResult(result: LarkCreateDocumentResult): CreateDocumentPresentation {
  return {
    document: result.document,
    appended: result.appended,
    ownershipTransferred: result.ownershipTransferred,
    ownerOpenId: result.ownerOpenId,
    retainedBotPermission: result.retainedBotPermission,
  }
}

export function presentTransferDocumentOwnershipResult(
  result: LarkTransferDocumentOwnershipResult,
): TransferDocumentOwnershipPresentation {
  return {
    documentId: result.documentId,
    ownerOpenId: result.ownerOpenId,
    retainedBotPermission: result.retainedBotPermission,
    stayPut: result.stayPut,
    url: result.url,
  }
}

export function presentAppendDocumentContentResult(
  result: LarkAppendDocumentContentResult,
): AppendDocumentContentPresentation {
  return {
    documentId: result.documentId,
    parentBlockId: result.parentBlockId,
    blockCount: result.blockCount,
    childBlockIds: result.childBlockIds,
  }
}

export function presentReadDocumentContentResult(
  result: LarkReadDocumentContentResult,
): ReadDocumentContentPresentation {
  return {
    ok: true,
    documentId: result.documentId,
    title: result.title,
    url: result.url,
    content: result.content,
  }
}

export function presentReadFileContentResult(
  result: LarkReadFileContentResult,
): ReadFileContentPresentation {
  return {
    ok: true,
    fileToken: result.fileToken,
    fileName: result.fileName,
    title: result.title,
    url: result.url,
    mimeType: result.mimeType,
    extension: result.extension,
    sizeBytes: result.sizeBytes,
    text: result.text,
  }
}

export function presentReadMessageAttachmentResult(
  result: LarkReadMessageAttachmentResult,
): ReadMessageAttachmentPresentation {
  return {
    ok: true,
    messageId: result.messageId,
    fileKey: result.fileKey,
    contextSource: result.contextSource,
    fileName: result.fileName,
    mimeType: result.mimeType,
    extension: result.extension,
    sizeBytes: result.sizeBytes,
    text: result.text,
  }
}

export function presentSendMessageResult(result: LarkSendMessageResult): SendMessagePresentation {
  return {
    ok: true,
    receiveIdType: result.receiveIdType,
    messageId: result.messageId,
    rootId: result.rootId,
  }
}

export function presentReplyMessageResult(result: LarkReplyMessageResult): ReplyMessagePresentation {
  return {
    ok: true,
    messageId: result.messageId,
    parentId: result.parentId,
    threadId: result.threadId,
    rootId: result.rootId,
  }
}

export function presentAddMessageReactionResult(
  messageId: string,
  result: LarkAddMessageReactionResult,
): AddMessageReactionPresentation {
  return {
    ok: true,
    messageId,
    emojiType: result.emojiType,
    reactionId: result.reactionId,
  }
}
