import type { Session } from 'koishi'

export interface Config {
  baseUrl: string
  appId: string
  appSecret: string
  timeout: number
  tokenRefreshBufferSeconds: number
  commandName: string
  minAuthority: number
  allowedUsers: string[]
  defaultReceiveIdType: ReceiveIdType
  maxResponseLength: number
  autoTransferOwnershipToRequester: boolean
  retainedBotPermissionAfterOwnershipTransfer: DriveMemberPermission
  transferOwnershipStayPut: boolean
  logApiFailures: boolean
  chatlunaEnabled: boolean
  chatlunaContextInjectionEnabled: boolean
  chatlunaContextMaxChars: number
  chatlunaAttachmentMaxChars: number
}

export type ReceiveIdType = 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
export type LarkMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type DocumentContentType = 'plain_text' | 'markdown' | 'html'
export type DriveMemberPermission = 'view' | 'edit' | 'full_access'
export type LarkRequestQuery = Record<string, string | undefined>
export type LarkDriveResourceType = 'doc' | 'docx' | 'sheet' | 'bitable' | 'file' | 'wiki' | 'folder'
export type LarkDocumentReferenceKind = 'doc' | 'docx' | 'wiki'
export type LarkResourceContextType = LarkDocumentReferenceKind | 'file'
export type LarkResolvedResourceType = 'doc' | 'docx' | 'file'
export type LarkResourcePermissionState = 'granted' | 'denied' | 'unknown'

export type SessionLike = Session & {
  user?: {
    authority?: number
  }
}

export interface TenantAccessTokenCache {
  token: string
  expiresAt: number
  expireInSeconds: number
}

export interface LarkActor {
  userId?: string
  platform?: string
  authority?: number
}

export type LarkRequestSource = 'command' | 'chatluna_tool'
export type LarkOutputChannel = 'command' | 'tool'

export interface LarkRequesterIdentity {
  actor?: LarkActor
  ownerOpenId?: string
  isLarkUserContext: boolean
}

export interface LarkPermissionState {
  granted: boolean
  error?: string
}

export interface LarkOwnershipPreferences {
  requesterOpenId?: string
  autoTransferToRequester: boolean
  retainedBotPermission: DriveMemberPermission
  stayPut: boolean
}

export interface LarkOutputPreferences {
  channel: LarkOutputChannel
  maxResponseLength: number
}

export interface LarkRequestContext {
  source: LarkRequestSource
  session?: SessionLike
  requester: LarkRequesterIdentity
  permission: LarkPermissionState
  ownership: LarkOwnershipPreferences
  output: LarkOutputPreferences
}

export interface LarkApiResponse<T = unknown> {
  code?: number
  msg?: string
  message?: string
  data?: T
  [key: string]: unknown
}

export interface LarkAuthResponse extends LarkApiResponse {
  tenant_access_token?: string
  expire?: number
}

export interface LarkChatListData {
  items?: LarkChatSummary[]
  has_more?: boolean
  page_token?: string
}

export interface LarkDocxConvertData {
  first_level_block_ids?: string[]
  blocks?: LarkDocxBlock[]
}

export interface LarkDocxRawContentData {
  content?: string
}

export interface LarkDriveMeta {
  doc_token?: string
  doc_type?: string
  title?: string
  owner_id?: string
  url?: string
}

export interface LarkDocxBlockListData {
  items?: LarkDocxBlock[]
  has_more?: boolean
  page_token?: string
}

export interface LarkMessageSendData {
  message_id?: string
  root_id?: string
}

export interface LarkChatSummary {
  chat_id?: string
  name?: string
  description?: string
  avatar?: string
}

export interface LarkDocxBlock {
  block_id?: string
  parent_id?: string
  children?: string[]
  block_type?: number
  [key: string]: unknown
}

export interface LarkDocumentSummary {
  documentId?: string
  revisionId?: number
  title?: string
  url?: string
}

export interface LarkPingResult {
  token: string
  expireInSeconds: number
}

export interface LarkCapabilityFlags {
  docs: boolean
  drive: boolean
  messages: boolean
  bitable: boolean
  files: boolean
  search: boolean
  wiki: boolean
  chatlunaBridge: boolean
}

export interface LarkDocumentReference {
  kind: LarkDocumentReferenceKind
  token: string
  matchedText: string
  sourceRef: string
}

export interface LarkResourceContext {
  type: LarkResourceContextType
  sourceRef: string
  matchedText?: string
  resolvedToken?: string
  resolvedType?: LarkResolvedResourceType
  title?: string
  url?: string
  content: string
  truncated: boolean
  contentLength: number
  permissionState: LarkResourcePermissionState
  error?: string
  raw?: unknown
}

export interface LarkListChatsParams {
  pageSize?: number
  pageToken?: string
}

export interface LarkListChatsResult {
  items: LarkChatSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface LarkSearchDocumentSummary {
  docsToken?: string
  docsType?: string
  title?: string
  ownerId?: string
  url?: string
  raw?: unknown
}

export interface LarkSearchDocsParams {
  searchKey: string
  count?: number
  offset?: number
  ownerIds?: string[]
  chatIds?: string[]
  docsTypes?: string[]
}

export interface LarkSearchDocsResult {
  searchKey: string
  count: number
  offset: number
  items: LarkSearchDocumentSummary[]
  total?: number
  hasMore: boolean
  nextOffset?: number
  raw: unknown
}

export interface LarkKnowledgeLookupParams {
  query: string
  count?: number
  offset?: number
  docsTypes?: string[]
  ownerIds?: string[]
  chatIds?: string[]
  readTopK?: number
  maxContentLength?: number
}

export interface LarkKnowledgeContextItem {
  docsToken?: string
  docsType?: string
  title?: string
  url?: string
  content: string
  truncated: boolean
  contentLength: number
  readError?: string
}

export interface LarkKnowledgeLookupResult {
  query: string
  items: LarkSearchDocumentSummary[]
  contexts: LarkKnowledgeContextItem[]
  total?: number
  hasMore: boolean
  nextOffset?: number
  raw: unknown
}

export interface LarkListWikiSpacesParams {
  pageSize?: number
  pageToken?: string
}

export interface LarkWikiSpaceSummary {
  spaceId?: string
  name?: string
  description?: string
  raw?: unknown
}

export interface LarkListWikiSpacesResult {
  items: LarkWikiSpaceSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface LarkWikiNodeSummary {
  spaceId?: string
  nodeToken?: string
  parentNodeToken?: string
  objToken?: string
  objType?: string
  title?: string
  url?: string
  hasChild?: boolean
  raw?: unknown
}

export interface LarkGetWikiNodeParams {
  token: string
}

export interface LarkGetWikiNodeResult extends LarkWikiNodeSummary {
  raw: unknown
}

export interface LarkListWikiNodesParams {
  spaceId: string
  parentNodeToken?: string
  pageSize?: number
  pageToken?: string
}

export interface LarkListWikiNodesResult {
  spaceId: string
  parentNodeToken?: string
  items: LarkWikiNodeSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface LarkSendMessageParams {
  receiveId: string
  receiveIdType?: ReceiveIdType
  messageType?: string
  content: string
  json?: boolean
}

export interface LarkSendMessageResult {
  receiveIdType: ReceiveIdType
  messageId?: string
  rootId?: string
  raw: unknown
}

export interface LarkCreateDocumentParams {
  title: string
  folderToken?: string
  content?: string
  contentType?: DocumentContentType
  ownerOpenId?: string
  transferOwnership?: boolean
  retainedBotPermission?: DriveMemberPermission
  stayPut?: boolean
}

export interface LarkCreateDocumentResult {
  document: LarkDocumentSummary
  appended: boolean
  ownershipTransferred: boolean
  ownerOpenId?: string
  retainedBotPermission?: DriveMemberPermission
}

export interface LarkTransferDocumentOwnershipParams {
  documentId: string
  ownerOpenId: string
  retainedBotPermission?: DriveMemberPermission
  stayPut?: boolean
}

export interface LarkTransferDocumentOwnershipResult {
  documentId: string
  ownerOpenId: string
  retainedBotPermission: DriveMemberPermission
  stayPut: boolean
  url?: string
}

export interface LarkGetDriveMetaParams {
  token: string
  type?: LarkDriveResourceType
}

export interface LarkDriveMetaResult {
  token: string
  type: LarkDriveResourceType
  title?: string
  ownerId?: string
  url?: string
  raw?: LarkDriveMeta
}

export interface LarkDriveRootFolderResult {
  id?: string
  token?: string
  name?: string
  parentId?: string
  ownerId?: string
  raw: unknown
}

export interface LarkDriveFileSummary {
  token?: string
  type?: LarkDriveResourceType
  name?: string
  parentToken?: string
  url?: string
  ownerId?: string
  raw?: unknown
}

export interface LarkListDriveFilesParams {
  folderToken?: string
  pageSize?: number
  pageToken?: string
}

export interface LarkListDriveFilesResult {
  folderToken?: string
  items: LarkDriveFileSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface LarkBatchGetDriveMetasParams {
  resources: LarkGetDriveMetaParams[]
}

export interface LarkBatchGetDriveMetasResult {
  items: LarkDriveMetaResult[]
  raw: unknown
}

export interface LarkReadDocumentBlocksParams {
  documentId: string
  pageSize?: number
  pageToken?: string
}

export interface LarkDocxBlockSummary {
  blockId: string
  parentId?: string
  blockType: number
  children?: string[]
  text?: string
  raw?: unknown
}

export interface LarkReadDocumentBlocksResult {
  documentId: string
  items: LarkDocxBlockSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw: unknown
}

export interface LarkAppendDocumentContentParams {
  documentId: string
  content: string
  contentType?: DocumentContentType
  parentBlockId?: string
  index?: number
}

export interface LarkAppendDocumentContentResult {
  documentId: string
  parentBlockId: string
  blockCount: number
  childBlockIds: string[]
  raw: unknown
}

export interface LarkDeleteDocumentBlocksParams {
  documentId: string
  parentBlockId: string
  startIndex: number
  endIndex: number
}

export interface LarkDeleteDocumentBlocksResult {
  documentId: string
  parentBlockId: string
  startIndex: number
  endIndex: number
  raw: unknown
}

export interface LarkDeleteWikiNodeParams {
  spaceId: string
  nodeToken: string
}

export interface LarkDeleteWikiNodeResult {
  spaceId: string
  nodeToken: string
  raw: unknown
}

export interface LarkReadDocumentContentParams {
  documentId: string
}

export interface LarkReadDocumentContentResult {
  documentId: string
  documentType: 'doc' | 'docx'
  sourceRef: string
  sourceType: LarkDocumentReferenceKind
  title?: string
  url?: string
  content: string
  raw: unknown
}

export interface LarkResolvedDocumentTarget {
  documentId: string
  documentType: 'doc' | 'docx'
  sourceRef: string
  sourceType: LarkDocumentReferenceKind
  title?: string
  url?: string
}

export interface LarkReadDocumentContextParams {
  documentRef: string
  maxContentLength?: number
}

export interface LarkReplyMessageParams {
  messageId: string
  content: string
  messageType?: string
  json?: boolean
  replyInThread?: boolean
}

export interface LarkReplyMessageResult {
  messageId?: string
  rootId?: string
  parentId?: string
  threadId?: string
  raw: unknown
}

export interface LarkUpdateMessageParams {
  messageId: string
  content: string
  messageType?: string
  json?: boolean
}

export interface LarkUpdateMessageResult {
  messageId: string
  raw: unknown
}

export interface LarkDeleteMessageParams {
  messageId: string
}

export interface LarkDeleteMessageResult {
  messageId: string
  raw: unknown
}

export interface LarkAddMessageReactionParams {
  messageId: string
  emojiType: string
}

export interface LarkAddMessageReactionResult {
  reactionId?: string
  emojiType: string
  raw: unknown
}

export interface LarkRawRequestParams {
  method: LarkMethod | string
  path: string
  payload?: unknown
  json?: boolean
}

export interface LarkBitableQueryRecordsParams {
  appToken: string
  tableId: string
  pageSize?: number
  pageToken?: string
  filter?: string
}

export interface LarkBitableQueryRecordsResult {
  items: unknown[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

export interface LarkReadFileContentParams {
  fileToken: string
  fileName?: string
  mimeType?: string
}

export interface LarkReadMessageAttachmentParams {
  messageId: string
  fileKey: string
  fileName?: string
  mimeType?: string
}

export type LarkSessionAttachmentSource = 'current' | 'quote'
export type LarkSessionAttachmentTarget = 'auto' | LarkSessionAttachmentSource

export interface LarkReadSessionAttachmentParams {
  session?: SessionLike
  target?: LarkSessionAttachmentTarget
  fileName?: string
  mimeType?: string
}

export interface LarkReadFileContentResult {
  fileToken: string
  fileName?: string
  mimeType?: string
  extension?: string
  sizeBytes?: number
  title?: string
  url?: string
  text: string
  raw?: unknown
}

export interface LarkReadMessageAttachmentResult {
  messageId: string
  fileKey: string
  contextSource?: LarkSessionAttachmentSource
  fileName?: string
  mimeType?: string
  extension?: string
  sizeBytes?: number
  text: string
  raw?: unknown
}

export interface LarkDownloadFileParams {
  fileToken: string
}

export interface LarkDownloadFileResult {
  fileToken: string
  data: ArrayBuffer
  sizeBytes: number
  raw?: unknown
}

// ── Bitable ──────────────────────────────────────────────────────────────────

export interface LarkBitableFieldSummary {
  fieldId: string
  fieldName: string
  type: number
  typeName?: string
  uiType?: string
  isPrimary?: boolean
  description?: string
}

export interface LarkBitableListFieldsParams {
  appToken: string
  tableId: string
  viewId?: string
  pageSize?: number
  pageToken?: string
}

export interface LarkBitableListFieldsResult {
  items: LarkBitableFieldSummary[]
  hasMore: boolean
  nextPageToken?: string
  total?: number
  raw?: unknown
}

export interface LarkBitableTableSummary {
  tableId: string
  name?: string
  revision?: number
}

export interface LarkBitableListTablesParams {
  appToken: string
  pageSize?: number
  pageToken?: string
}

export interface LarkBitableListTablesResult {
  items: LarkBitableTableSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

export interface LarkBitableCreateRecordParams {
  appToken: string
  tableId: string
  fields: Record<string, unknown>
}

export interface LarkBitableCreateRecordResult {
  recordId: string
  fields: Record<string, unknown>
  raw?: unknown
}

export interface LarkBitableUpdateRecordParams {
  appToken: string
  tableId: string
  recordId: string
  fields: Record<string, unknown>
}

export interface LarkBitableUpdateRecordResult {
  recordId: string
  fields: Record<string, unknown>
  raw?: unknown
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export interface LarkCalendarEventSummary {
  eventId: string
  summary?: string
  description?: string
  startTime?: string
  endTime?: string
  status?: string
  location?: string
}

export interface LarkCalendarListEventsParams {
  calendarId?: string
  startTime?: string
  endTime?: string
  pageSize?: number
  pageToken?: string
}

export interface LarkCalendarListEventsResult {
  items: LarkCalendarEventSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

export interface LarkCalendarCreateEventParams {
  calendarId?: string
  summary: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  needNotification?: boolean
}

export interface LarkCalendarCreateEventResult {
  eventId: string
  summary?: string
  startTime?: string
  endTime?: string
  raw?: unknown
}

export interface LarkCalendarUpdateEventParams {
  calendarId?: string
  eventId: string
  summary?: string
  description?: string
  startTime?: string
  endTime?: string
  location?: string
  needNotification?: boolean
}

export interface LarkCalendarUpdateEventResult {
  eventId: string
  summary?: string
  startTime?: string
  endTime?: string
  raw?: unknown
}

// ── Task ─────────────────────────────────────────────────────────────────────

export interface LarkTaskSummary {
  taskGuid: string
  summary: string
  description?: string
  dueTime?: string
  completedAt?: string
  status?: string
}

export interface LarkTaskCreateParams {
  summary: string
  description?: string
  dueTime?: string
  assigneeOpenIds?: string[]
}

export interface LarkTaskCreateResult {
  taskGuid: string
  summary: string
  raw?: unknown
}

export interface LarkTaskListParams {
  pageSize?: number
  pageToken?: string
  completed?: boolean
}

export interface LarkTaskListResult {
  items: LarkTaskSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

export interface LarkTaskUpdateParams {
  taskGuid: string
  summary?: string
  description?: string
  dueTime?: string
  completed?: boolean
}

export interface LarkTaskUpdateResult {
  taskGuid: string
  summary?: string
  raw?: unknown
}

// ── IM additions ─────────────────────────────────────────────────────────────

export interface LarkMessageSummary {
  messageId: string
  msgType?: string
  content?: string
  createTime?: string
  senderId?: string
}

export interface LarkListMessagesParams {
  chatId: string
  startTime?: string
  endTime?: string
  sortType?: 'ByCreateTimeAsc' | 'ByCreateTimeDesc'
  pageSize?: number
  pageToken?: string
}

export interface LarkListMessagesResult {
  items: LarkMessageSummary[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

export interface LarkDeleteMessageReactionParams {
  messageId: string
  reactionId: string
}

export interface LarkDeleteMessageReactionResult {
  reactionId?: string
  raw?: unknown
}

// ── Contact ──────────────────────────────────────────────────────────────────

export interface LarkUserProfile {
  openId?: string
  userId?: string
  name?: string
  enName?: string
  email?: string
  mobile?: string
  department?: string
  jobTitle?: string
  avatar?: string
}

export interface LarkContactGetUserParams {
  openId: string
}

export interface LarkContactGetUserResult {
  user: LarkUserProfile
  raw?: unknown
}

export interface LarkContactSearchUserParams {
  departmentId?: string
  pageSize?: number
  pageToken?: string
}

export interface LarkContactSearchUserResult {
  items: LarkUserProfile[]
  hasMore: boolean
  nextPageToken?: string
  raw?: unknown
}

// ── Wiki additions ────────────────────────────────────────────────────────────

export interface LarkCreateWikiNodeParams {
  spaceId: string
  parentNodeToken?: string
  title: string
  objType?: 'doc' | 'docx' | 'sheet' | 'mindnote' | 'bitable' | 'file'
}

export interface LarkCreateWikiNodeResult {
  nodeToken: string
  objToken?: string
  objType?: string
  title?: string
  raw?: unknown
}

export interface LarkToolSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object'
  description: string
  enum?: string[]
}

export interface LarkToolDefinition {
  name: string
  description: string
  usage: string
  riskLevel: 'low' | 'medium' | 'high'
  inputSchema: {
    type: 'object'
    properties: Record<string, LarkToolSchemaProperty>
    required?: string[]
  }
}
