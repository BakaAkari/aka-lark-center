import type { Context } from 'koishi'
import { Service } from 'koishi'
import { LarkApiClient } from '../client/request.js'
import { LarkBitableService } from '../domains/bitable/service.js'
import { LarkDocsService } from '../domains/docs/service.js'
import { LarkDriveService } from '../domains/drive/service.js'
import { LarkFilesService } from '../domains/files/service.js'
import { LarkMessagesService } from '../domains/messages/service.js'
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
  LarkDriveMetaResult,
  LarkListChatsParams,
  LarkListChatsResult,
  LarkPingResult,
  LarkRawRequestParams,
  LarkReadDocumentContentParams,
  LarkReadDocumentContentResult,
  LarkReplyMessageParams,
  LarkReplyMessageResult,
  LarkSendMessageParams,
  LarkSendMessageResult,
  LarkTransferDocumentOwnershipParams,
  LarkTransferDocumentOwnershipResult,
} from '../shared/types.js'

declare module '@koishijs/core' {
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

  private readonly pluginConfig: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'larkCenter', true)

    this.pluginConfig = config

    const logger = ctx.logger(PLUGIN_NAME)
    this.client = new LarkApiClient(ctx, config, logger)
    this.drive = new LarkDriveService(this.client)
    this.docs = new LarkDocsService(this.client, this.drive, logger)
    this.messages = new LarkMessagesService(this.client, config)
    this.bitable = new LarkBitableService()
    this.files = new LarkFilesService(this.client, this.drive)
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
    return this.docs.readDocumentContent(params)
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
