import { LARK_TOOL_DEFINITIONS } from '../../shared/tool-definitions.js'
import { createPermissionError, createUnsupportedError, createValidationError } from '../../shared/errors.js'
import {
  expectToolString,
  formatToolJson,
  resolveDriveMemberPermission,
} from '../../shared/utils.js'
import type {
  Config,
  DocumentContentType,
  LarkToolDefinition,
  ReceiveIdType,
  SessionLike,
} from '../../shared/types.js'
import type { ChatLunaPluginLike, StructuredToolConstructor } from './runtime.js'
import type { LarkCenter } from '../../plugin/service.js'
import { formatToolError } from '../../plugin/formatters.js'
import {
  presentAddMessageReactionResult,
  presentAppendDocumentContentResult,
  presentChatListResult,
  presentCreateDocumentResult,
  presentReadDocumentContentResult,
  presentReplyMessageResult,
  presentSendMessageResult,
} from '../../plugin/presenters.js'
import { resolveToolContext } from '../../plugin/request-context.js'

export function registerChatLunaTools(
  plugin: ChatLunaPluginLike,
  StructuredTool: StructuredToolConstructor,
  center: LarkCenter,
  config: Config,
) {
  for (const definition of LARK_TOOL_DEFINITIONS) {
    plugin.registerTool(definition.name, {
      selector() {
        return true
      },
      authorization(session: SessionLike) {
        return resolveToolContext(center, config, session).permission.granted
      },
      createTool() {
        return createChatLunaToolInstance(StructuredTool, definition, center, config)
      },
    })
  }
}

function createChatLunaToolInstance(
  StructuredTool: StructuredToolConstructor,
  definition: LarkToolDefinition,
  center: LarkCenter,
  config: Config,
) {
  const toolDescription = buildChatLunaToolDescription(definition)

  return new class extends StructuredTool {
    name = definition.name
    description = toolDescription
    schema = definition.inputSchema

    constructor() {
      super({ verboseParsingErrors: true })
    }

    async _call(
      input: Record<string, unknown>,
      _runManager?: unknown,
      runtimeConfig?: { configurable?: { session?: SessionLike } },
    ) {
      const request = resolveToolContext(center, config, runtimeConfig?.configurable?.session)

      if (!request.permission.granted) {
        return formatToolError(
          definition.name,
          createPermissionError(request.permission.error ?? '权限不足。'),
          request.output,
        )
      }

      try {
        switch (definition.name) {
          case 'lark_doc_create': {
            const transferOwnership = typeof input.transferOwnership === 'boolean'
              ? input.transferOwnership
              : request.ownership.autoTransferToRequester
            const ownerOpenId = request.requester.ownerOpenId

            if (transferOwnership && !ownerOpenId) {
              throw createValidationError('当前工具调用不在飞书/Lark 用户上下文中，无法把文档 owner 自动转给请求者。')
            }

            const result = await center.createDocument({
              title: expectToolString(input.title, 'title'),
              folderToken: typeof input.folderToken === 'string' ? input.folderToken : undefined,
              content: typeof input.content === 'string' ? input.content : undefined,
              contentType: input.contentType as DocumentContentType | undefined,
              ownerOpenId,
              transferOwnership,
              retainedBotPermission: resolveDriveMemberPermission(
                typeof input.retainedBotPermission === 'string' ? input.retainedBotPermission : undefined,
                request.ownership.retainedBotPermission,
              ),
              stayPut: typeof input.stayPut === 'boolean' ? input.stayPut : request.ownership.stayPut,
            })
            return formatToolJson(presentCreateDocumentResult(result), request.output.maxResponseLength)
          }
          case 'lark_doc_read_content': {
            const result = await center.readDocumentContent({
              documentId: expectToolString(input.documentId, 'documentId'),
            })
            return formatToolJson(presentReadDocumentContentResult(result), request.output.maxResponseLength)
          }
          case 'lark_doc_append_content': {
            const result = await center.appendDocumentContent({
              documentId: expectToolString(input.documentId, 'documentId'),
              content: expectToolString(input.content, 'content'),
              contentType: input.contentType as DocumentContentType | undefined,
              parentBlockId: typeof input.parentBlockId === 'string' ? input.parentBlockId : undefined,
              index: typeof input.index === 'number' ? input.index : undefined,
            })
            return formatToolJson(presentAppendDocumentContentResult(result), request.output.maxResponseLength)
          }
          case 'lark_list_chats': {
            const result = await center.listChats({
              pageSize: typeof input.pageSize === 'number' ? input.pageSize : undefined,
              pageToken: typeof input.pageToken === 'string' ? input.pageToken : undefined,
            })
            return formatToolJson(presentChatListResult(result), request.output.maxResponseLength)
          }
          case 'lark_send_message': {
            const result = await center.sendMessage({
              receiveId: expectToolString(input.receiveId, 'receiveId'),
              receiveIdType: input.receiveIdType as ReceiveIdType | undefined,
              messageType: typeof input.messageType === 'string' ? input.messageType : undefined,
              content: expectToolString(input.content, 'content'),
              json: Boolean(input.json),
            })
            return formatToolJson(presentSendMessageResult(result), request.output.maxResponseLength)
          }
          case 'lark_message_reply': {
            const result = await center.replyMessage({
              messageId: expectToolString(input.messageId, 'messageId'),
              content: expectToolString(input.content, 'content'),
              messageType: typeof input.messageType === 'string' ? input.messageType : undefined,
              json: Boolean(input.json),
              replyInThread: Boolean(input.replyInThread),
            })
            return formatToolJson(presentReplyMessageResult(result), request.output.maxResponseLength)
          }
          case 'lark_message_add_reaction': {
            const messageId = expectToolString(input.messageId, 'messageId')
            const result = await center.addMessageReaction({
              messageId,
              emojiType: expectToolString(input.emojiType, 'emojiType'),
            })
            const presentation = presentAddMessageReactionResult(messageId, result)
            return formatToolJson(
              {
                ok: presentation.ok,
                reactionId: presentation.reactionId,
                emojiType: presentation.emojiType,
              },
              request.output.maxResponseLength,
            )
          }
          case 'lark_raw_api_request': {
            const result = await center.rawRequest({
              method: expectToolString(input.method, 'method'),
              path: expectToolString(input.path, 'path'),
              payload: input.payload,
              json: Boolean(input.json),
            })
            return formatToolJson(result, request.output.maxResponseLength)
          }
          default:
            throw createUnsupportedError(`unsupported tool: ${definition.name}`, {
              toolName: definition.name,
            })
        }
      } catch (error) {
        return formatToolError(definition.name, error, request.output)
      }
    }
  }()
}

function buildChatLunaToolDescription(definition: LarkToolDefinition) {
  return [
    definition.description,
    `Usage: ${definition.usage}`,
    `Risk: ${definition.riskLevel}`,
    `Input JSON schema: ${JSON.stringify(definition.inputSchema)}`,
  ].join('\n')
}
