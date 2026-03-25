import type { Context } from 'koishi'
import { Service } from 'koishi'
import { LarkApiClient } from '../client/request.js'
import { LarkBitableService } from '../domains/bitable/service.js'
import { LarkCalendarService } from '../domains/calendar/service.js'
import { LarkContactService } from '../domains/contact/service.js'
import { LarkDocsService } from '../domains/docs/service.js'
import { LarkDriveService } from '../domains/drive/service.js'
import { LarkFilesService } from '../domains/files/service.js'
import { LarkKnowledgeService } from '../domains/knowledge/service.js'
import { LarkMessagesService } from '../domains/messages/service.js'
import { LarkResourceService } from '../domains/resources/service.js'
import { LarkSearchService } from '../domains/search/service.js'
import { LarkTasksService } from '../domains/tasks/service.js'
import { LarkWikiService } from '../domains/wiki/service.js'
import { getPermissionError as resolvePermissionError } from '../identity/permissions.js'
import { wrapDomainError } from '../shared/errors.js'
import { getCapabilityFlags } from '../shared/capabilities.js'
import { PLUGIN_NAME } from '../shared/constants.js'
import { LARK_TOOL_DEFINITIONS } from '../shared/tool-definitions.js'
import type {
  Config,
  LarkActor,
  LarkAddMessageReactionParams,
  LarkAddMessageReactionResult,
  LarkAppendDocumentContentParams,
  LarkAppendDocumentContentResult,
  LarkBatchGetDriveMetasParams,
  LarkBatchGetDriveMetasResult,
  LarkBitableCreateRecordParams,
  LarkBitableCreateRecordResult,
  LarkBitableListTablesParams,
  LarkBitableListTablesResult,
  LarkBitableQueryRecordsParams,
  LarkBitableQueryRecordsResult,
  LarkBitableUpdateRecordParams,
  LarkBitableUpdateRecordResult,
  LarkCalendarCreateEventParams,
  LarkCalendarCreateEventResult,
  LarkCalendarListEventsParams,
  LarkCalendarListEventsResult,
  LarkCalendarUpdateEventParams,
  LarkCalendarUpdateEventResult,
  LarkCapabilityFlags,
  LarkContactGetUserParams,
  LarkContactGetUserResult,
  LarkContactSearchUserParams,
  LarkContactSearchUserResult,
  LarkCreateDocumentParams,
  LarkCreateDocumentResult,
  LarkCreateWikiNodeParams,
  LarkCreateWikiNodeResult,
  LarkDeleteDocumentBlocksParams,
  LarkDeleteDocumentBlocksResult,
  LarkDeleteMessageParams,
  LarkDeleteMessageResult,
  LarkDeleteMessageReactionParams,
  LarkDeleteMessageReactionResult,
  LarkDeleteWikiNodeParams,
  LarkDeleteWikiNodeResult,
  LarkGetDriveMetaParams,
  LarkDriveRootFolderResult,
  LarkDriveMetaResult,
  LarkListChatsParams,
  LarkListChatsResult,
  LarkListDriveFilesParams,
  LarkListDriveFilesResult,
  LarkListMessagesParams,
  LarkListMessagesResult,
  LarkListWikiNodesParams,
  LarkListWikiNodesResult,
  LarkListWikiSpacesParams,
  LarkListWikiSpacesResult,
  LarkKnowledgeLookupParams,
  LarkKnowledgeLookupResult,
  LarkPingResult,
  LarkRawRequestParams,
  LarkResourceContext,
  LarkReadDocumentBlocksParams,
  LarkReadDocumentBlocksResult,
  LarkReadDocumentContentParams,
  LarkReadDocumentContextParams,
  LarkReadDocumentContentResult,
  LarkReadFileContentParams,
  LarkReadFileContentResult,
  LarkReadMessageAttachmentParams,
  LarkReadMessageAttachmentResult,
  LarkReadSessionAttachmentParams,
  LarkReplyMessageParams,
  LarkReplyMessageResult,
  LarkSearchDocsParams,
  LarkSearchDocsResult,
  LarkSendMessageParams,
  LarkSendMessageResult,
  LarkTaskCreateParams,
  LarkTaskCreateResult,
  LarkTaskListParams,
  LarkTaskListResult,
  LarkTaskUpdateParams,
  LarkTaskUpdateResult,
  LarkGetWikiNodeParams,
  LarkGetWikiNodeResult,
  LarkTransferDocumentOwnershipParams,
  LarkTransferDocumentOwnershipResult,
  LarkUpdateMessageParams,
  LarkUpdateMessageResult,
} from '../shared/types.js'

declare module 'koishi' {
  interface Context {
    larkCenter: LarkCenter
  }
}

export class LarkCenter extends Service {
  readonly client: LarkApiClient
  readonly drive: LarkDriveService
  readonly docs: LarkDocsService
  readonly messages: LarkMessagesService
  readonly bitable: LarkBitableService
  readonly calendar: LarkCalendarService
  readonly contact: LarkContactService
  readonly files: LarkFilesService
  readonly search: LarkSearchService
  readonly tasks: LarkTasksService
  readonly wiki: LarkWikiService
  readonly resources: LarkResourceService
  readonly knowledge: LarkKnowledgeService

  private readonly pluginConfig: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'larkCenter', true)

    this.pluginConfig = config

    const logger = ctx.logger(PLUGIN_NAME)
    this.client = new LarkApiClient(ctx, config, logger)
    this.drive = new LarkDriveService(this.client)
    this.wiki = new LarkWikiService(this.client)
    this.docs = new LarkDocsService(this.client, this.drive, logger)
    this.messages = new LarkMessagesService(this.client, config)
    this.bitable = new LarkBitableService(this.client)
    this.calendar = new LarkCalendarService(this.client)
    this.contact = new LarkContactService(this.client)
    this.tasks = new LarkTasksService(this.client)
    this.files = new LarkFilesService(this.client, this.drive)
    this.search = new LarkSearchService(this.client)
    this.resources = new LarkResourceService(this.client, this.drive, this.wiki)
    this.knowledge = new LarkKnowledgeService(this.search, this.resources)
  }

  getToolDefinitions() {
    return LARK_TOOL_DEFINITIONS
  }

  getToolDefinition(name: string) {
    return LARK_TOOL_DEFINITIONS.find(tool => tool.name === name)
  }

  getPermissionError(actor?: LarkActor) {
    return resolvePermissionError(actor, this.pluginConfig)
  }

  getCapabilities(): LarkCapabilityFlags {
    return getCapabilityFlags(this.pluginConfig)
  }

  async ping(): Promise<LarkPingResult> {
    try {
      const token = await this.client.getTenantAccessToken()
      return {
        token: token.token,
        expireInSeconds: token.expireInSeconds,
      }
    } catch (error) {
      throw wrapDomainError('获取 tenant_access_token 失败', error)
    }
  }

  listChats(params?: LarkListChatsParams): Promise<LarkListChatsResult> {
    return this.messages.listChats(params)
  }

  sendMessage(params: LarkSendMessageParams): Promise<LarkSendMessageResult> {
    return this.messages.sendMessage(params)
  }

  createDocument(params: LarkCreateDocumentParams): Promise<LarkCreateDocumentResult> {
    return this.docs.createDocument(params)
  }

  getDriveMeta(params: LarkGetDriveMetaParams): Promise<LarkDriveMetaResult> {
    return this.drive.getMeta(params)
  }

  getDriveRootFolder(): Promise<LarkDriveRootFolderResult> {
    return this.drive.getRootFolderMeta()
  }

  listDriveFiles(params?: LarkListDriveFilesParams): Promise<LarkListDriveFilesResult> {
    return this.drive.listFiles(params)
  }

  batchGetDriveMetas(params: LarkBatchGetDriveMetasParams): Promise<LarkBatchGetDriveMetasResult> {
    return this.drive.batchGetMetas(params)
  }

  transferDocumentOwnership(params: LarkTransferDocumentOwnershipParams): Promise<LarkTransferDocumentOwnershipResult> {
    return this.drive.transferDocumentOwnership(params)
  }

  appendDocumentContent(params: LarkAppendDocumentContentParams): Promise<LarkAppendDocumentContentResult> {
    return this.docs.appendDocumentContent(params)
  }

  readDocumentBlocks(params: LarkReadDocumentBlocksParams): Promise<LarkReadDocumentBlocksResult> {
    return this.docs.readDocumentBlocks(params)
  }

  readDocumentContent(params: LarkReadDocumentContentParams): Promise<LarkReadDocumentContentResult> {
    return this.resources.readDocumentContent(params)
  }

  readDocumentContext(params: LarkReadDocumentContextParams): Promise<LarkResourceContext> {
    return this.resources.readDocumentContext(params)
  }

  readFileContent(params: LarkReadFileContentParams): Promise<LarkReadFileContentResult> {
    return this.files.readContent(params)
  }

  searchDocs(params: LarkSearchDocsParams): Promise<LarkSearchDocsResult> {
    return this.search.searchDocs(params)
  }

  knowledgeLookup(params: LarkKnowledgeLookupParams): Promise<LarkKnowledgeLookupResult> {
    return this.knowledge.lookup(params)
  }

  listWikiSpaces(params?: LarkListWikiSpacesParams): Promise<LarkListWikiSpacesResult> {
    return this.wiki.listSpaces(params)
  }

  getWikiNode(params: LarkGetWikiNodeParams): Promise<LarkGetWikiNodeResult> {
    return this.wiki.getNode(params)
  }

  listWikiNodes(params: LarkListWikiNodesParams): Promise<LarkListWikiNodesResult> {
    return this.wiki.listNodes(params)
  }

  readMessageAttachment(params: LarkReadMessageAttachmentParams): Promise<LarkReadMessageAttachmentResult> {
    return this.files.readMessageAttachment(params)
  }

  readSessionAttachment(params: LarkReadSessionAttachmentParams): Promise<LarkReadMessageAttachmentResult> {
    return this.files.readSessionAttachment(params)
  }

  replyMessage(params: LarkReplyMessageParams): Promise<LarkReplyMessageResult> {
    return this.messages.replyMessage(params)
  }

  addMessageReaction(params: LarkAddMessageReactionParams): Promise<LarkAddMessageReactionResult> {
    return this.messages.addMessageReaction(params)
  }

  updateMessage(params: LarkUpdateMessageParams): Promise<LarkUpdateMessageResult> {
    return this.messages.updateMessage(params)
  }

  deleteMessage(params: LarkDeleteMessageParams): Promise<LarkDeleteMessageResult> {
    return this.messages.deleteMessage(params)
  }

  deleteDocumentBlocks(params: LarkDeleteDocumentBlocksParams): Promise<LarkDeleteDocumentBlocksResult> {
    return this.docs.deleteDocumentBlocks(params)
  }

  deleteWikiNode(params: LarkDeleteWikiNodeParams): Promise<LarkDeleteWikiNodeResult> {
    return this.wiki.deleteNode(params)
  }

  rawRequest(params: LarkRawRequestParams): Promise<unknown> {
    return this.messages.rawRequest(params)
  }

  queryBitableRecords(params: LarkBitableQueryRecordsParams): Promise<LarkBitableQueryRecordsResult> {
    return this.bitable.queryRecords(params)
  }

  listBitableTables(params: LarkBitableListTablesParams): Promise<LarkBitableListTablesResult> {
    return this.bitable.listTables(params)
  }

  createBitableRecord(params: LarkBitableCreateRecordParams): Promise<LarkBitableCreateRecordResult> {
    return this.bitable.createRecord(params)
  }

  updateBitableRecord(params: LarkBitableUpdateRecordParams): Promise<LarkBitableUpdateRecordResult> {
    return this.bitable.updateRecord(params)
  }

  listCalendarEvents(params: LarkCalendarListEventsParams): Promise<LarkCalendarListEventsResult> {
    return this.calendar.listEvents(params)
  }

  createCalendarEvent(params: LarkCalendarCreateEventParams): Promise<LarkCalendarCreateEventResult> {
    return this.calendar.createEvent(params)
  }

  updateCalendarEvent(params: LarkCalendarUpdateEventParams): Promise<LarkCalendarUpdateEventResult> {
    return this.calendar.updateEvent(params)
  }

  createTask(params: LarkTaskCreateParams): Promise<LarkTaskCreateResult> {
    return this.tasks.createTask(params)
  }

  listTasks(params: LarkTaskListParams): Promise<LarkTaskListResult> {
    return this.tasks.listTasks(params)
  }

  updateTask(params: LarkTaskUpdateParams): Promise<LarkTaskUpdateResult> {
    return this.tasks.updateTask(params)
  }

  listMessages(params: LarkListMessagesParams): Promise<LarkListMessagesResult> {
    return this.messages.listMessages(params)
  }

  deleteMessageReaction(params: LarkDeleteMessageReactionParams): Promise<LarkDeleteMessageReactionResult> {
    return this.messages.deleteMessageReaction(params)
  }

  getContactUser(params: LarkContactGetUserParams): Promise<LarkContactGetUserResult> {
    return this.contact.getUser(params)
  }

  searchContactUser(params: LarkContactSearchUserParams): Promise<LarkContactSearchUserResult> {
    return this.contact.searchUser(params)
  }

  createWikiNode(params: LarkCreateWikiNodeParams): Promise<LarkCreateWikiNodeResult> {
    return this.wiki.createNode(params)
  }
}
