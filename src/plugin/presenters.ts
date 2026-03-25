import type {
  LarkAddMessageReactionResult,
  LarkAppendDocumentContentResult,
  LarkBitableCreateRecordResult,
  LarkBitableFieldSummary,
  LarkBitableListFieldsResult,
  LarkBitableListTablesResult,
  LarkBitableQueryRecordsResult,
  LarkBitableTableSummary,
  LarkBitableUpdateRecordResult,
  LarkCalendarCreateEventResult,
  LarkCalendarEventSummary,
  LarkCalendarListEventsResult,
  LarkCalendarUpdateEventResult,
  LarkChatSummary,
  LarkContactGetUserResult,
  LarkContactSearchUserResult,
  LarkCreateDocumentResult,
  LarkCreateWikiNodeResult,
  LarkDeleteDocumentBlocksResult,
  LarkDeleteMessageReactionResult,
  LarkDeleteMessageResult,
  LarkDeleteWikiNodeResult,
  LarkDocxBlockSummary,
  LarkDriveFileSummary,
  LarkDriveRootFolderResult,
  LarkDocumentSummary,
  LarkGetWikiNodeResult,
  LarkListChatsResult,
  LarkListDriveFilesResult,
  LarkListMessagesResult,
  LarkListWikiNodesResult,
  LarkListWikiSpacesResult,
  LarkKnowledgeLookupResult,
  LarkKnowledgeContextItem,
  LarkMessageSummary,
  LarkReadDocumentBlocksResult,
  LarkSearchDocsResult,
  LarkSearchDocumentSummary,
  LarkPingResult,
  LarkReadDocumentContentResult,
  LarkReadFileContentResult,
  LarkReadMessageAttachmentResult,
  LarkReplyMessageResult,
  LarkSendMessageResult,
  LarkTaskCreateResult,
  LarkTaskListResult,
  LarkTaskSummary,
  LarkTaskUpdateResult,
  LarkTransferDocumentOwnershipResult,
  LarkUpdateMessageResult,
  LarkUserProfile,
  LarkWikiNodeSummary,
  LarkWikiSpaceSummary,
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

export interface DriveRootFolderPresentation {
  ok: true
  id?: string
  token?: string
  name?: string
  parentId?: string
  ownerId?: string
}

export interface DriveFileListPresentation {
  folderToken?: string
  items: LarkDriveFileSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
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

export interface SearchDocsPresentation {
  searchKey: string
  items: LarkSearchDocumentSummary[]
  total?: number
  hasMore: boolean
  nextOffset?: number
  raw: unknown
}

export interface KnowledgeLookupPresentation {
  query: string
  items: LarkSearchDocumentSummary[]
  contexts: LarkKnowledgeContextItem[]
  total?: number
  hasMore: boolean
  nextOffset?: number
  raw: unknown
}

export interface WikiSpaceListPresentation {
  items: LarkWikiSpaceSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface WikiNodePresentation {
  ok: true
  spaceId?: string
  nodeToken?: string
  parentNodeToken?: string
  objToken?: string
  objType?: string
  title?: string
  url?: string
  hasChild?: boolean
}

export interface WikiNodeListPresentation {
  spaceId: string
  parentNodeToken?: string
  items: LarkWikiNodeSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
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

export interface UpdateMessagePresentation {
  ok: true
  messageId: string
}

export interface DeleteMessagePresentation {
  ok: true
  messageId: string
}

export interface DeleteDocumentBlocksPresentation {
  ok: true
  documentId: string
  parentBlockId: string
  startIndex: number
  endIndex: number
}

export interface DeleteWikiNodePresentation {
  ok: true
  spaceId: string
  nodeToken: string
}

export interface ReadDocumentBlocksPresentation {
  ok: true
  documentId: string
  items: LarkDocxBlockSummary[]
  hasMore: boolean
  nextPageToken?: string
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

export function presentDriveRootFolderResult(
  result: LarkDriveRootFolderResult,
): DriveRootFolderPresentation {
  return {
    ok: true,
    id: result.id,
    token: result.token,
    name: result.name,
    parentId: result.parentId,
    ownerId: result.ownerId,
  }
}

export function presentDriveFileListResult(result: LarkListDriveFilesResult): DriveFileListPresentation {
  return {
    folderToken: result.folderToken,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
    raw: result.raw,
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

export function presentSearchDocsResult(result: LarkSearchDocsResult): SearchDocsPresentation {
  return {
    searchKey: result.searchKey,
    items: result.items,
    total: result.total,
    hasMore: result.hasMore,
    nextOffset: result.nextOffset,
    raw: result.raw,
  }
}

export function presentKnowledgeLookupResult(result: LarkKnowledgeLookupResult): KnowledgeLookupPresentation {
  return {
    query: result.query,
    items: result.items,
    contexts: result.contexts,
    total: result.total,
    hasMore: result.hasMore,
    nextOffset: result.nextOffset,
    raw: result.raw,
  }
}

export function presentWikiSpaceListResult(result: LarkListWikiSpacesResult): WikiSpaceListPresentation {
  return {
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
    raw: result.raw,
  }
}

export function presentWikiNodeResult(result: LarkGetWikiNodeResult): WikiNodePresentation {
  return {
    ok: true,
    spaceId: result.spaceId,
    nodeToken: result.nodeToken,
    parentNodeToken: result.parentNodeToken,
    objToken: result.objToken,
    objType: result.objType,
    title: result.title,
    url: result.url,
    hasChild: result.hasChild,
  }
}

export function presentWikiNodeListResult(result: LarkListWikiNodesResult): WikiNodeListPresentation {
  return {
    spaceId: result.spaceId,
    parentNodeToken: result.parentNodeToken,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
    raw: result.raw,
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

export function presentUpdateMessageResult(result: LarkUpdateMessageResult): UpdateMessagePresentation {
  return {
    ok: true,
    messageId: result.messageId,
  }
}

export function presentDeleteMessageResult(result: LarkDeleteMessageResult): DeleteMessagePresentation {
  return {
    ok: true,
    messageId: result.messageId,
  }
}

export function presentDeleteDocumentBlocksResult(
  result: LarkDeleteDocumentBlocksResult,
): DeleteDocumentBlocksPresentation {
  return {
    ok: true,
    documentId: result.documentId,
    parentBlockId: result.parentBlockId,
    startIndex: result.startIndex,
    endIndex: result.endIndex,
  }
}

export function presentDeleteWikiNodeResult(result: LarkDeleteWikiNodeResult): DeleteWikiNodePresentation {
  return {
    ok: true,
    spaceId: result.spaceId,
    nodeToken: result.nodeToken,
  }
}

export function presentReadDocumentBlocksResult(
  result: LarkReadDocumentBlocksResult,
): ReadDocumentBlocksPresentation {
  return {
    ok: true,
    documentId: result.documentId,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

// ── Bitable ───────────────────────────────────────────────────────────────────

export interface BitableListTablesPresentation {
  ok: boolean
  items: LarkBitableTableSummary[]
  hasMore: boolean
  nextPageToken?: string
}

export interface BitableQueryRecordsPresentation {
  ok: boolean
  items: unknown[]
  hasMore: boolean
  nextPageToken?: string
}

export interface BitableCreateRecordPresentation {
  ok: boolean
  recordId: string
  fields: Record<string, unknown>
}

export interface BitableUpdateRecordPresentation {
  ok: boolean
  recordId: string
  fields: Record<string, unknown>
}

export function presentBitableListTablesResult(result: LarkBitableListTablesResult): BitableListTablesPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

export function presentBitableQueryRecordsResult(result: LarkBitableQueryRecordsResult): BitableQueryRecordsPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

export function presentBitableCreateRecordResult(result: LarkBitableCreateRecordResult): BitableCreateRecordPresentation {
  return {
    ok: true,
    recordId: result.recordId,
    fields: result.fields,
  }
}

export interface BitableListFieldsPresentation {
  ok: boolean
  items: LarkBitableFieldSummary[]
  hasMore: boolean
  nextPageToken?: string
  total?: number
}

export function presentBitableListFieldsResult(result: LarkBitableListFieldsResult): BitableListFieldsPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
    total: result.total,
  }
}

export function presentBitableUpdateRecordResult(result: LarkBitableUpdateRecordResult): BitableUpdateRecordPresentation {
  return {
    ok: true,
    recordId: result.recordId,
    fields: result.fields,
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export interface CalendarListEventsPresentation {
  ok: boolean
  items: LarkCalendarEventSummary[]
  hasMore: boolean
  nextPageToken?: string
}

export interface CalendarCreateEventPresentation {
  ok: boolean
  eventId: string
  summary?: string
  startTime?: string
  endTime?: string
}

export interface CalendarUpdateEventPresentation {
  ok: boolean
  eventId: string
  summary?: string
  startTime?: string
  endTime?: string
}

export function presentCalendarListEventsResult(result: LarkCalendarListEventsResult): CalendarListEventsPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

export function presentCalendarCreateEventResult(result: LarkCalendarCreateEventResult): CalendarCreateEventPresentation {
  return {
    ok: true,
    eventId: result.eventId,
    summary: result.summary,
    startTime: result.startTime,
    endTime: result.endTime,
  }
}

export function presentCalendarUpdateEventResult(result: LarkCalendarUpdateEventResult): CalendarUpdateEventPresentation {
  return {
    ok: true,
    eventId: result.eventId,
    summary: result.summary,
    startTime: result.startTime,
    endTime: result.endTime,
  }
}

// ── Task ──────────────────────────────────────────────────────────────────────

export interface TaskCreatePresentation {
  ok: boolean
  taskGuid: string
  summary: string
}

export interface TaskListPresentation {
  ok: boolean
  items: LarkTaskSummary[]
  hasMore: boolean
  nextPageToken?: string
}

export interface TaskUpdatePresentation {
  ok: boolean
  taskGuid: string
  summary?: string
}

export function presentTaskCreateResult(result: LarkTaskCreateResult): TaskCreatePresentation {
  return {
    ok: true,
    taskGuid: result.taskGuid,
    summary: result.summary,
  }
}

export function presentTaskListResult(result: LarkTaskListResult): TaskListPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

export function presentTaskUpdateResult(result: LarkTaskUpdateResult): TaskUpdatePresentation {
  return {
    ok: true,
    taskGuid: result.taskGuid,
    summary: result.summary,
  }
}

// ── IM additions ──────────────────────────────────────────────────────────────

export interface ListMessagesPresentation {
  ok: boolean
  items: LarkMessageSummary[]
  hasMore: boolean
  nextPageToken?: string
}

export interface DeleteMessageReactionPresentation {
  ok: boolean
  reactionId?: string
}

export function presentListMessagesResult(result: LarkListMessagesResult): ListMessagesPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

export function presentDeleteMessageReactionResult(result: LarkDeleteMessageReactionResult): DeleteMessageReactionPresentation {
  return {
    ok: true,
    reactionId: result.reactionId,
  }
}

// ── Contact ───────────────────────────────────────────────────────────────────

export interface ContactGetUserPresentation {
  ok: boolean
  user: LarkUserProfile
}

export interface ContactSearchUserPresentation {
  ok: boolean
  items: LarkUserProfile[]
  hasMore: boolean
  nextPageToken?: string
}

export function presentContactGetUserResult(result: LarkContactGetUserResult): ContactGetUserPresentation {
  return {
    ok: true,
    user: result.user,
  }
}

export function presentContactSearchUserResult(result: LarkContactSearchUserResult): ContactSearchUserPresentation {
  return {
    ok: true,
    items: result.items,
    hasMore: result.hasMore,
    nextPageToken: result.nextPageToken,
  }
}

// ── Wiki additions ────────────────────────────────────────────────────────────

export interface CreateWikiNodePresentation {
  ok: boolean
  nodeToken: string
  objToken?: string
  objType?: string
  title?: string
}

export function presentCreateWikiNodeResult(result: LarkCreateWikiNodeResult): CreateWikiNodePresentation {
  return {
    ok: true,
    nodeToken: result.nodeToken,
    objToken: result.objToken,
    objType: result.objType,
    title: result.title,
  }
}
