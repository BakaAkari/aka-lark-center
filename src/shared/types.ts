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
}

export type ReceiveIdType = 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
export type LarkMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type DocumentContentType = 'plain_text' | 'markdown' | 'html'
export type DriveMemberPermission = 'view' | 'edit' | 'full_access'
export type LarkRequestQuery = Record<string, string | undefined>
export type LarkDriveResourceType = 'docx' | 'sheet' | 'bitable' | 'file' | 'wiki' | 'folder'

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
  chatlunaBridge: boolean
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

export interface LarkBatchGetDriveMetasParams {
  resources: LarkGetDriveMetaParams[]
}

export interface LarkBatchGetDriveMetasResult {
  items: LarkDriveMetaResult[]
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

export interface LarkReadDocumentContentParams {
  documentId: string
}

export interface LarkReadDocumentContentResult {
  documentId: string
  title?: string
  url?: string
  content: string
  raw: unknown
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
