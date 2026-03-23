import type { Context } from 'koishi'
import { Service } from 'koishi'
import { LarkApiClient } from '../client/request.js'
import { LarkBitableService } from '../domains/bitable/service.js'
import { LarkDocsService } from '../domains/docs/service.js'
import { LarkDriveService } from '../domains/drive/service.js'
import { LarkFilesService } from '../domains/files/service.js'
import { LarkKnowledgeService } from '../domains/knowledge/service.js'
import { LarkMessagesService } from '../domains/messages/service.js'
import { LarkResourceService } from '../domains/resources/service.js'
import { LarkSearchService } from '../domains/search/service.js'
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
  LarkBitableQueryRecordsParams,
  LarkBitableQueryRecordsResult,
  LarkCapabilityFlags,
  LarkCreateDocumentParams,
  LarkCreateDocumentResult,
  LarkGetDriveMetaParams,
  LarkDriveRootFolderResult,
  LarkDriveMetaResult,
  LarkListChatsParams,
  LarkListChatsResult,
  LarkListDriveFilesParams,
  LarkListDriveFilesResult,
  LarkListWikiNodesParams,
  LarkListWikiNodesResult,
  LarkListWikiSpacesParams,
  LarkListWikiSpacesResult,
  LarkKnowledgeLookupParams,
  LarkKnowledgeLookupResult,
  LarkPingResult,
  LarkRawRequestParams,
  LarkResourceContext,
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
  LarkGetWikiNodeParams,
  LarkGetWikiNodeResult,
  LarkTransferDocumentOwnershipParams,
  LarkTransferDocumentOwnershipResult,
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
  readonly files: LarkFilesService
  readonly search: LarkSearchService
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
    this.bitable = new LarkBitableService()
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

  rawRequest(params: LarkRawRequestParams): Promise<unknown> {
    return this.messages.rawRequest(params)
  }

  queryBitableRecords(params: LarkBitableQueryRecordsParams): Promise<LarkBitableQueryRecordsResult> {
    return this.bitable.queryRecords(params)
  }
}
