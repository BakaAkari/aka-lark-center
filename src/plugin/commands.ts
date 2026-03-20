import type { Context } from 'koishi'
import { parseAttachmentReferenceInput } from '../domains/files/context.js'
import { createPermissionError, createValidationError } from '../shared/errors.js'
import { formatJson, maskToken, normalizeBaseUrl, resolveDriveMemberPermission } from '../shared/utils.js'
import type { Config, DocumentContentType, ReceiveIdType, SessionLike } from '../shared/types.js'
import {
  formatCommandError,
  formatAddMessageReactionResult,
  formatAppendDocumentContentResult,
  formatChatListResult,
  formatCreateDocumentResult,
  formatPingResult,
  formatReadFileContentResult,
  formatReadMessageAttachmentResult,
  formatReadDocumentContentResult,
  formatReplyMessageResult,
  formatSendMessageResult,
  formatTransferDocumentOwnershipResult,
} from './formatters.js'
import {
  presentAddMessageReactionResult,
  presentAppendDocumentContentResult,
  presentChatListResult,
  presentCreateDocumentResult,
  presentPingResult,
  presentReadFileContentResult,
  presentReadMessageAttachmentResult,
  presentReadDocumentContentResult,
  presentReplyMessageResult,
  presentSendMessageResult,
  presentTransferDocumentOwnershipResult,
} from './presenters.js'
import { resolveCommandContext } from './request-context.js'
import type { LarkCenter } from './service.js'

export function registerCommands(ctx: Context, center: LarkCenter, config: Config) {
  const root = config.commandName.trim() || 'lark'

  ctx.command(root, '飞书 / Lark OpenAPI 工具集合')

  ctx.command(`${root}.ping`, '验证飞书凭证并测试 tenant_access_token')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.ping()
        return formatPingResult(
          presentPingResult(result, normalizeBaseUrl(config.baseUrl), maskToken(result.token)),
        )
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.chat.list`, '列出机器人可访问的群聊 / 会话')
    .userFields(['authority'])
    .option('pageSize', '-s <pageSize:number> 每页数量，默认 20')
    .option('pageToken', '-t <pageToken:string> 分页 token')
    .action(async ({ session, options }) => {
      const resolvedOptions = (options ?? {}) as { pageSize?: number, pageToken?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.listChats({
          pageSize: resolvedOptions.pageSize,
          pageToken: resolvedOptions.pageToken,
        })
        return formatChatListResult(presentChatListResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.doc.create <title:string> [content:text]`, '创建飞书文档，可选追加初始内容')
    .userFields(['authority'])
    .option('folderToken', '-f <folderToken:string> 目标文件夹 token')
    .option('contentType', '-c <contentType:string> 内容类型 plain_text/markdown/html，默认 plain_text')
    .option('transferOwner', '-o 创建后把文档 owner 转给当前飞书用户')
    .option('stayPut', '-s 转移 owner 后保留在原位置')
    .option('botPerm', '-p <botPerm:string> 转移 owner 后保留给 bot 的权限 view/edit/full_access')
    .action(async ({ session, options }, title, content) => {
      const resolvedOptions = (options ?? {}) as {
        folderToken?: string
        contentType?: string
        transferOwner?: boolean
        stayPut?: boolean
        botPerm?: string
      }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const ownerOpenId = request.requester.ownerOpenId
        const transferOwnership = resolvedOptions.transferOwner ?? request.ownership.autoTransferToRequester
        if (transferOwnership && !ownerOpenId) {
          return '当前会话不是飞书/Lark 用户上下文，无法自动转移文档 owner。请在飞书会话中使用，或新增专门的 owner 转移命令传入 open_id。'
        }

        const result = await center.createDocument({
          title,
          folderToken: resolvedOptions.folderToken,
          content,
          contentType: resolvedOptions.contentType as DocumentContentType | undefined,
          ownerOpenId,
          transferOwnership,
          retainedBotPermission: resolveDriveMemberPermission(resolvedOptions.botPerm, request.ownership.retainedBotPermission),
          stayPut: resolvedOptions.stayPut ?? request.ownership.stayPut,
        })

        return formatCreateDocumentResult(presentCreateDocumentResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.doc.transfer-owner <documentId:string> [ownerOpenId:string]`, '把文档 owner 转给指定飞书用户，默认转给当前发起命令的用户')
    .userFields(['authority'])
    .option('stayPut', '-s 转移 owner 后保留在原位置')
    .option('botPerm', '-p <botPerm:string> 转移后保留给 bot 的权限 view/edit/full_access')
    .action(async ({ session, options }, documentId, ownerOpenIdArg) => {
      const resolvedOptions = (options ?? {}) as { stayPut?: boolean, botPerm?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      const ownerOpenId = ownerOpenIdArg?.trim() || request.requester.ownerOpenId
      if (!ownerOpenId) {
        return '请提供 ownerOpenId，或在飞书/Lark 会话中直接调用该命令。'
      }

      try {
        const result = await center.transferDocumentOwnership({
          documentId,
          ownerOpenId,
          retainedBotPermission: resolveDriveMemberPermission(resolvedOptions.botPerm, request.ownership.retainedBotPermission),
          stayPut: resolvedOptions.stayPut ?? request.ownership.stayPut,
        })

        return formatTransferDocumentOwnershipResult(presentTransferDocumentOwnershipResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.doc.append <documentId:string> <content:text>`, '向飞书文档追加内容')
    .userFields(['authority'])
    .option('contentType', '-c <contentType:string> 内容类型 plain_text/markdown/html，默认 plain_text')
    .option('parentBlockId', '-p <parentBlockId:string> 父 block_id，默认自动定位文档根块')
    .option('index', '-i <index:number> 插入位置')
    .action(async ({ session, options }, documentId, content) => {
      const resolvedOptions = (options ?? {}) as { contentType?: string, parentBlockId?: string, index?: number }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.appendDocumentContent({
          documentId,
          content,
          contentType: resolvedOptions.contentType as DocumentContentType | undefined,
          parentBlockId: resolvedOptions.parentBlockId,
          index: resolvedOptions.index,
        })

        return formatAppendDocumentContentResult(presentAppendDocumentContentResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.doc.read <documentId:string>`, '读取飞书文档纯文本内容')
    .userFields(['authority'])
    .action(async ({ session }, documentId) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.readDocumentContent({
          documentId,
        })

        return formatReadDocumentContentResult(presentReadDocumentContentResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.file.read [fileToken:text]`, '读取飞书文件文本内容')
    .userFields(['authority'])
    .option('fileName', '-n <fileName:string> 文件名，用于辅助识别扩展名')
    .option('mimeType', '-m <mimeType:string> MIME 类型，用于辅助识别内容类型')
    .action(async ({ session, options }, fileToken) => {
      const resolvedOptions = (options ?? {}) as { fileName?: string, mimeType?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const normalizedInput = typeof fileToken === 'string' ? fileToken.trim() : ''
        if (!normalizedInput) {
          const result = await center.readSessionAttachment({
            session: session as SessionLike,
            target: 'auto',
            fileName: resolvedOptions.fileName,
            mimeType: resolvedOptions.mimeType,
          })
          return formatReadMessageAttachmentResult(presentReadMessageAttachmentResult(result), request.output)
        }

        const attachmentReference = parseAttachmentReferenceInput(normalizedInput)
        if (attachmentReference) {
          const result = await center.readMessageAttachment({
            messageId: attachmentReference.messageId,
            fileKey: attachmentReference.fileKey,
            fileName: resolvedOptions.fileName,
            mimeType: resolvedOptions.mimeType,
          })
          return formatReadMessageAttachmentResult(presentReadMessageAttachmentResult(result), request.output)
        }

        const result = await center.readFileContent({
          fileToken: normalizedInput,
          fileName: resolvedOptions.fileName,
          mimeType: resolvedOptions.mimeType,
        })

        return formatReadFileContentResult(presentReadFileContentResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.file.read-context [source:string]`, '读取当前消息或引用消息中的飞书文件附件文本内容')
    .userFields(['authority'])
    .option('fileName', '-n <fileName:string> 文件名，用于辅助识别扩展名')
    .option('mimeType', '-m <mimeType:string> MIME 类型，用于辅助识别内容类型')
    .action(async ({ session, options }, source) => {
      const resolvedOptions = (options ?? {}) as { fileName?: string, mimeType?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const target = typeof source === 'string' && source.trim() ? source.trim() : 'auto'
        if (!['auto', 'current', 'quote'].includes(target)) {
          return formatCommandError(createValidationError('source 必须是 auto/current/quote 之一。'))
        }

        const result = await center.readSessionAttachment({
          session: session as SessionLike,
          target: target as 'auto' | 'current' | 'quote',
          fileName: resolvedOptions.fileName,
          mimeType: resolvedOptions.mimeType,
        })

        return formatReadMessageAttachmentResult(presentReadMessageAttachmentResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.message.send <receiveId:string> <content:text>`, '向飞书 chat_id/open_id/user_id 等目标发送消息')
    .userFields(['authority'])
    .option('receiveIdType', '-r <receiveIdType:string> receive_id_type，默认使用插件配置')
    .option('messageType', '-m <messageType:string> msg_type，默认 text')
    .option('json', '-j 将 content 视为符合 Lark 要求的 content JSON')
    .action(async ({ session, options }, receiveId, content) => {
      const resolvedOptions = (options ?? {}) as { receiveIdType?: string, messageType?: string, json?: boolean }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.sendMessage({
          receiveId,
          receiveIdType: resolvedOptions.receiveIdType as ReceiveIdType | undefined,
          messageType: resolvedOptions.messageType,
          content,
          json: Boolean(resolvedOptions.json),
        })

        return formatSendMessageResult(presentSendMessageResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.message.reply <messageId:string> <content:text>`, '回复指定飞书消息')
    .userFields(['authority'])
    .option('messageType', '-m <messageType:string> msg_type，默认 text')
    .option('json', '-j 将 content 视为符合 Lark 要求的 content JSON')
    .option('thread', '-t 尽量以话题形式回复')
    .action(async ({ session, options }, messageId, content) => {
      const resolvedOptions = (options ?? {}) as { messageType?: string, json?: boolean, thread?: boolean }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.replyMessage({
          messageId,
          content,
          messageType: resolvedOptions.messageType,
          json: Boolean(resolvedOptions.json),
          replyInThread: Boolean(resolvedOptions.thread),
        })

        return formatReplyMessageResult(presentReplyMessageResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.message.reaction.add <messageId:string> <emojiType:string>`, '给指定飞书消息添加表情回复')
    .userFields(['authority'])
    .action(async ({ session }, messageId, emojiType) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.addMessageReaction({
          messageId,
          emojiType,
        })

        return formatAddMessageReactionResult(presentAddMessageReactionResult(messageId, result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.raw <method:string> <path:text> [payload:text]`, '调用任意飞书 / Lark OpenAPI')
    .userFields(['authority'])
    .option('json', '-j 将 payload 解析为 JSON')
    .action(async ({ session, options }, method, path, payload) => {
      const resolvedOptions = (options ?? {}) as { json?: boolean }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.rawRequest({
          method,
          path,
          payload,
          json: Boolean(resolvedOptions.json),
        })
        return formatJson(result, request.output.maxResponseLength)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.tool.list`, '列出可供其他插件桥接的飞书工具定义')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      return formatJson(center.getToolDefinitions(), request.output.maxResponseLength)
    })
}
