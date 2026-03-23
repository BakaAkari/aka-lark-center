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
  formatDriveFileListResult,
  formatDriveRootFolderResult,
  formatKnowledgeLookupResult,
  formatPingResult,
  formatReadFileContentResult,
  formatReadMessageAttachmentResult,
  formatReadDocumentContentResult,
  formatReplyMessageResult,
  formatSearchDocsResult,
  formatSendMessageResult,
  formatTransferDocumentOwnershipResult,
  formatWikiNodeListResult,
  formatWikiNodeResult,
  formatWikiSpaceListResult,
} from './formatters.js'
import {
  presentAddMessageReactionResult,
  presentAppendDocumentContentResult,
  presentChatListResult,
  presentCreateDocumentResult,
  presentDriveFileListResult,
  presentDriveRootFolderResult,
  presentKnowledgeLookupResult,
  presentPingResult,
  presentReadFileContentResult,
  presentReadMessageAttachmentResult,
  presentReadDocumentContentResult,
  presentReplyMessageResult,
  presentSearchDocsResult,
  presentSendMessageResult,
  presentTransferDocumentOwnershipResult,
  presentWikiNodeListResult,
  presentWikiNodeResult,
  presentWikiSpaceListResult,
} from './presenters.js'
import { resolveCommandContext } from './request-context.js'
import type { LarkCenter } from './service.js'

export function registerCommands(ctx: Context, center: LarkCenter, config: Config) {
  const root = config.commandName.trim() || 'lark'

  ctx.command(root, '飞书 / Lark OpenAPI 工具集合')
  ctx.command(`${root}.system`, '系统与调试命令')
  ctx.command(`${root}.query`, '查询与检索命令')
  ctx.command(`${root}.read`, '统一的读取类命令')
  ctx.command(`${root}.write`, '统一的写入类命令')
  ctx.command(`${root}.message`, '消息交互命令')

  ctx.command(`${root}.system.ping`, '验证飞书凭证并测试 tenant_access_token')
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

  ctx.command(`${root}.query.chat.list`, '列出机器人可访问的群聊 / 会话')
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

  ctx.command(`${root}.query.drive.root`, '获取当前可访问的云空间根文件夹')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.getDriveRootFolder()
        return formatDriveRootFolderResult(presentDriveRootFolderResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.query.drive.list [folderToken:string]`, '列出文件夹下的资源清单，不传 folderToken 时默认列根目录')
    .userFields(['authority'])
    .option('pageSize', '-s <pageSize:number> 每页数量，默认 20')
    .option('pageToken', '-t <pageToken:string> 分页 token')
    .action(async ({ session, options }, folderToken) => {
      const resolvedOptions = (options ?? {}) as { pageSize?: number, pageToken?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.listDriveFiles({
          folderToken,
          pageSize: resolvedOptions.pageSize,
          pageToken: resolvedOptions.pageToken,
        })
        return formatDriveFileListResult(presentDriveFileListResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.write.doc.create <title:string> [content:text]`, '创建飞书文档，可选追加初始内容')
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

  ctx.command(`${root}.write.doc.transfer-owner <documentId:string> [ownerOpenId:string]`, '把文档 owner 转给指定飞书用户，默认转给当前发起命令的用户')
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

  ctx.command(`${root}.write.doc.append <documentId:string> <content:text>`, '向飞书文档追加内容')
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

  const readDocumentAction = async (
    { session }: { session?: SessionLike },
    documentRef: string,
  ) => {
    const request = resolveCommandContext(center, config, session as SessionLike | undefined)
    if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

    try {
      const result = await center.readDocumentContent({
        documentId: documentRef,
      })

      return formatReadDocumentContentResult(presentReadDocumentContentResult(result), request.output)
    } catch (error) {
      return formatCommandError(error)
    }
  }

  ctx.command(`${root}.read.doc <documentRef:text>`, '读取飞书文档内容，自动识别 wiki/doc/docx 链接或 token')
    .userFields(['authority'])
    .action(readDocumentAction)

  ctx.command(`${root}.read.file [fileToken:text]`, '读取飞书文件文本内容，未提供 fileToken 时自动尝试读取当前上下文附件')
    .userFields(['authority'])
    .option('fileName', '-n <fileName:string> 文件名，用于辅助识别扩展名')
    .option('mimeType', '-m <mimeType:string> MIME 类型，用于辅助识别内容类型')
    .option('source', '-s <source:string> 附件来源 auto/current/quote，默认 auto')
    .action(async ({ session, options }, fileToken) => {
      const resolvedOptions = (options ?? {}) as { fileName?: string, mimeType?: string, source?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const normalizedInput = typeof fileToken === 'string' ? fileToken.trim() : ''
        const target = typeof resolvedOptions.source === 'string' && resolvedOptions.source.trim()
          ? resolvedOptions.source.trim()
          : 'auto'
        if (!['auto', 'current', 'quote'].includes(target)) {
          return formatCommandError(createValidationError('source 必须是 auto/current/quote 之一。'))
        }

        if (!normalizedInput) {
          const result = await center.readSessionAttachment({
            session: session as SessionLike,
            target: target as 'auto' | 'current' | 'quote',
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

  ctx.command(`${root}.query.docs.search <searchKey:text>`, '按关键词搜索飞书文档资源')
    .userFields(['authority'])
    .option('count', '-c <count:number> 返回数量，默认 10')
    .option('offset', '-o <offset:number> 搜索偏移，默认 0')
    .option('docsTypes', '-t <docsTypes:string> 文档类型过滤，逗号分隔')
    .option('ownerIds', '-u <ownerIds:string> owner_id 过滤，逗号分隔')
    .option('chatIds', '-g <chatIds:string> chat_id 过滤，逗号分隔')
    .action(async ({ session, options }, searchKey) => {
      const resolvedOptions = (options ?? {}) as {
        count?: number
        offset?: number
        docsTypes?: string
        ownerIds?: string
        chatIds?: string
      }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.searchDocs({
          searchKey,
          count: resolvedOptions.count,
          offset: resolvedOptions.offset,
          docsTypes: parseCsvOption(resolvedOptions.docsTypes),
          ownerIds: parseCsvOption(resolvedOptions.ownerIds),
          chatIds: parseCsvOption(resolvedOptions.chatIds),
        })

        return formatSearchDocsResult(presentSearchDocsResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.query.docs.lookup <query:text>`, '按用户需求搜索候选文档，并自动读取前几个可读文档正文')
    .userFields(['authority'])
    .option('count', '-c <count:number> 搜索候选数量，默认 10')
    .option('offset', '-o <offset:number> 搜索偏移，默认 0')
    .option('docsTypes', '-t <docsTypes:string> 文档类型过滤，逗号分隔')
    .option('ownerIds', '-u <ownerIds:string> owner_id 过滤，逗号分隔')
    .option('chatIds', '-g <chatIds:string> chat_id 过滤，逗号分隔')
    .option('readTopK', '-r <readTopK:number> 自动读取前几个可读文档，默认 1')
    .option('maxContentLength', '-m <maxContentLength:number> 每个自动读取文档的最大字符数')
    .action(async ({ session, options }, query) => {
      const resolvedOptions = (options ?? {}) as {
        count?: number
        offset?: number
        docsTypes?: string
        ownerIds?: string
        chatIds?: string
        readTopK?: number
        maxContentLength?: number
      }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.knowledgeLookup({
          query,
          count: resolvedOptions.count,
          offset: resolvedOptions.offset,
          docsTypes: parseCsvOption(resolvedOptions.docsTypes),
          ownerIds: parseCsvOption(resolvedOptions.ownerIds),
          chatIds: parseCsvOption(resolvedOptions.chatIds),
          readTopK: resolvedOptions.readTopK,
          maxContentLength: resolvedOptions.maxContentLength,
        })

        return formatKnowledgeLookupResult(presentKnowledgeLookupResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.query.wiki.spaces`, '列出当前应用可访问的知识空间')
    .userFields(['authority'])
    .option('pageSize', '-s <pageSize:number> 每页数量，默认 20')
    .option('pageToken', '-t <pageToken:string> 分页 token')
    .action(async ({ session, options }) => {
      const resolvedOptions = (options ?? {}) as { pageSize?: number, pageToken?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.listWikiSpaces({
          pageSize: resolvedOptions.pageSize,
          pageToken: resolvedOptions.pageToken,
        })
        return formatWikiSpaceListResult(presentWikiSpaceListResult(result), request.output)
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.query.wiki.node <token:string>`, '获取知识库节点信息')
    .userFields(['authority'])
    .action(async ({ session }, token) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.getWikiNode({ token })
        return formatWikiNodeResult(presentWikiNodeResult(result))
      } catch (error) {
        return formatCommandError(error)
      }
    })

  ctx.command(`${root}.query.wiki.children <spaceId:string> [parentNodeToken:string]`, '列出知识空间或父节点下的子节点')
    .userFields(['authority'])
    .option('pageSize', '-s <pageSize:number> 每页数量，默认 20')
    .option('pageToken', '-t <pageToken:string> 分页 token')
    .action(async ({ session, options }, spaceId, parentNodeToken) => {
      const resolvedOptions = (options ?? {}) as { pageSize?: number, pageToken?: string }
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      try {
        const result = await center.listWikiNodes({
          spaceId,
          parentNodeToken,
          pageSize: resolvedOptions.pageSize,
          pageToken: resolvedOptions.pageToken,
        })
        return formatWikiNodeListResult(presentWikiNodeListResult(result), request.output)
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

  ctx.command(`${root}.system.raw <method:string> <path:text> [payload:text]`, '调用任意飞书 / Lark OpenAPI')
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

  ctx.command(`${root}.system.tool.list`, '列出可供其他插件桥接的飞书工具定义')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const request = resolveCommandContext(center, config, session as SessionLike)
      if (!request.permission.granted) return formatCommandError(createPermissionError(request.permission.error ?? '权限不足。'))

      return formatJson(center.getToolDefinitions(), request.output.maxResponseLength)
    })
}

function parseCsvOption(value?: string) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const items = value.split(',').map(item => item.trim()).filter(Boolean)
  return items.length ? items : undefined
}
