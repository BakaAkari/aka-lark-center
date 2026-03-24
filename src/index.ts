import type { Context } from 'koishi'
import { ChatLunaBridgeManager } from './bridge/chatluna/manager.js'
import { registerCommands } from './plugin/commands.js'
import { Config as ConfigSchema } from './plugin/config.js'
import { LarkCenter } from './plugin/service.js'
import { LarkCenterError } from './shared/errors.js'
import { PLUGIN_NAME } from './shared/constants.js'
import { LARK_TOOL_DEFINITIONS } from './shared/tool-definitions.js'
import { normalizeBaseUrl } from './shared/utils.js'
import type { Config as SharedConfig } from './shared/types.js'

export const name = PLUGIN_NAME
export const inject = {
  required: ['http'],
  optional: ['chatluna'],
} as const

export const Config = ConfigSchema
export { LarkCenter, LarkCenterError, LARK_TOOL_DEFINITIONS }
export type Config = SharedConfig
export type { LarkCenterErrorCode } from './shared/errors.js'

export type {
  DocumentContentType,
  DriveMemberPermission,
  LarkActor,
  LarkAddMessageReactionParams,
  LarkAddMessageReactionResult,
  LarkApiResponse,
  LarkAppendDocumentContentParams,
  LarkAppendDocumentContentResult,
  LarkAuthResponse,
  LarkBatchGetDriveMetasParams,
  LarkBatchGetDriveMetasResult,
  LarkBitableQueryRecordsParams,
  LarkBitableQueryRecordsResult,
  LarkCapabilityFlags,
  LarkChatListData,
  LarkChatSummary,
  LarkCreateDocumentParams,
  LarkCreateDocumentResult,
  LarkDocxBlock,
  LarkDocxBlockListData,
  LarkDocxConvertData,
  LarkDocumentReference,
  LarkDocumentReferenceKind,
  LarkDocumentSummary,
  LarkDriveMetaResult,
  LarkDriveRootFolderResult,
  LarkDriveFileSummary,
  LarkDriveResourceType,
  LarkDriveMeta,
  LarkGetDriveMetaParams,
  LarkListDriveFilesParams,
  LarkListDriveFilesResult,
  LarkListChatsParams,
  LarkListChatsResult,
  LarkKnowledgeContextItem,
  LarkKnowledgeLookupParams,
  LarkKnowledgeLookupResult,
  LarkMessageSendData,
  LarkMethod,
  LarkPingResult,
  LarkReadDocumentContextParams,
  LarkSearchDocsParams,
  LarkSearchDocsResult,
  LarkSearchDocumentSummary,
  LarkListWikiSpacesParams,
  LarkListWikiSpacesResult,
  LarkWikiSpaceSummary,
  LarkGetWikiNodeParams,
  LarkGetWikiNodeResult,
  LarkListWikiNodesParams,
  LarkListWikiNodesResult,
  LarkWikiNodeSummary,
  LarkRawRequestParams,
  LarkResourceContext,
  LarkResourceContextType,
  LarkReadDocumentContentParams,
  LarkReadDocumentContentResult,
  LarkResolvedDocumentTarget,
  LarkReadFileContentParams,
  LarkReadFileContentResult,
  LarkReadMessageAttachmentParams,
  LarkReadMessageAttachmentResult,
  LarkReadSessionAttachmentParams,
  LarkReplyMessageParams,
  LarkReplyMessageResult,
  LarkSessionAttachmentSource,
  LarkSessionAttachmentTarget,
  LarkRequestQuery,
  LarkSendMessageParams,
  LarkSendMessageResult,
  LarkToolDefinition,
  LarkToolSchemaProperty,
  LarkTransferDocumentOwnershipParams,
  LarkTransferDocumentOwnershipResult,
  ReceiveIdType,
  SessionLike,
  TenantAccessTokenCache,
} from './shared/types.js'

export function apply(ctx: Context, config: SharedConfig) {
  const logger = ctx.logger(name)
  const center = new LarkCenter(ctx, config)
  const chatLunaBridge = new ChatLunaBridgeManager(ctx, center, config, logger)

  registerCommands(ctx, center, config)

  // 等待 chatluna 服务可用后再同步
  ctx.inject(['chatluna'], async (ctx) => {
    await chatLunaBridge.sync(Boolean(config.chatlunaEnabled))
  })

  ctx.accept(['chatlunaEnabled', 'chatlunaContextInjectionEnabled', 'chatlunaContextMaxChars'], (nextConfig) => {
    chatLunaBridge.updateConfig(nextConfig)
    // 只在 chatluna 服务可用时同步
    if ((ctx as Context & { chatluna?: unknown }).chatluna) {
      void chatLunaBridge.sync(Boolean(nextConfig.chatlunaEnabled))
    }
  }, { immediate: true })

  ctx.on('dispose', async () => {
    await chatLunaBridge.dispose()
  })

  logger.info(
    'enabled, baseUrl=%s, command=%s, service=%s',
    normalizeBaseUrl(config.baseUrl),
    config.commandName.trim() || 'lark',
    'larkCenter',
  )
}
