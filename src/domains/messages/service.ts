import { LarkApiClient } from '../../client/request.js'
import { createValidationError, ensureNonEmptyString, wrapDomainError } from '../../shared/errors.js'
import { buildMessageContent, normalizeMethod, normalizeOpenApiPath, resolveReceiveIdType } from '../../shared/utils.js'
import type {
  Config,
  LarkAddMessageReactionParams,
  LarkAddMessageReactionResult,
  LarkChatListData,
  LarkListChatsParams,
  LarkListChatsResult,
  LarkMessageSendData,
  LarkRawRequestParams,
  LarkReplyMessageParams,
  LarkReplyMessageResult,
  LarkSendMessageParams,
  LarkSendMessageResult,
} from '../../shared/types.js'

export class LarkMessagesService {
  constructor(
    private readonly client: LarkApiClient,
    private readonly config: Config,
  ) {}

  async listChats(params: LarkListChatsParams = {}): Promise<LarkListChatsResult> {
    const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20

    try {
      const response = await this.client.requestOrThrow<LarkChatListData>('GET', '/open-apis/im/v1/chats', undefined, {
        page_size: String(pageSize),
        page_token: params.pageToken,
      })
      const data = response.data ?? {}
      return {
        items: data.items ?? [],
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('列出飞书会话失败', error)
    }
  }

  async sendMessage(params: LarkSendMessageParams): Promise<LarkSendMessageResult> {
    const receiveId = ensureNonEmptyString(params.receiveId, 'receiveId')
    const content = ensureNonEmptyString(params.content, '消息内容')

    const receiveIdType = resolveReceiveIdType(params.receiveIdType, this.config.defaultReceiveIdType)
    if (!receiveIdType) {
      throw createValidationError('receive_id_type 非法，可选 chat_id/open_id/user_id/union_id/email。')
    }

    const messageType = typeof params.messageType === 'string' && params.messageType.trim()
      ? params.messageType.trim()
      : 'text'

    try {
      const contentPayload = buildMessageContent(messageType, content, Boolean(params.json))
      const response = await this.client.requestOrThrow<LarkMessageSendData>(
        'POST',
        `/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`,
        {
          receive_id: receiveId,
          msg_type: messageType,
          content: contentPayload,
        },
      )

      return {
        receiveIdType,
        messageId: response.data?.message_id,
        rootId: response.data?.root_id,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('发送飞书消息失败', error)
    }
  }

  async replyMessage(params: LarkReplyMessageParams): Promise<LarkReplyMessageResult> {
    const messageId = ensureNonEmptyString(params.messageId, 'messageId')
    const content = ensureNonEmptyString(params.content, '回复内容')

    const messageType = typeof params.messageType === 'string' && params.messageType.trim()
      ? params.messageType.trim()
      : 'text'

    try {
      const contentPayload = buildMessageContent(messageType, content, Boolean(params.json))
      const response = await this.client.requestOrThrow<LarkMessageSendData & {
        parent_id?: string
        thread_id?: string
      }>(
        'POST',
        `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/reply`,
        {
          msg_type: messageType,
          content: contentPayload,
          reply_in_thread: Boolean(params.replyInThread),
        },
      )

      return {
        messageId: response.data?.message_id,
        rootId: response.data?.root_id,
        parentId: response.data?.parent_id,
        threadId: response.data?.thread_id,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('回复飞书消息失败', error)
    }
  }

  async addMessageReaction(params: LarkAddMessageReactionParams): Promise<LarkAddMessageReactionResult> {
    const messageId = ensureNonEmptyString(params.messageId, 'messageId')
    const emojiType = ensureNonEmptyString(params.emojiType, 'emojiType')

    try {
      const response = await this.client.requestOrThrow<{
        reaction_id?: string
        reaction_type?: {
          emoji_type?: string
        }
      }>(
        'POST',
        `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/reactions`,
        {
          reaction_type: {
            emoji_type: emojiType,
          },
        },
      )

      return {
        reactionId: response.data?.reaction_id,
        emojiType: response.data?.reaction_type?.emoji_type || emojiType,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('添加飞书消息表情失败', error)
    }
  }

  async rawRequest(params: LarkRawRequestParams): Promise<unknown> {
    const method = normalizeMethod(params.method)
    if (!method) {
      throw createValidationError('method 非法，可选 GET/POST/PUT/PATCH/DELETE。')
    }
    if (!params.path?.trim()) {
      throw createValidationError('请输入 OpenAPI 路径，例如 /open-apis/im/v1/chats。')
    }

    let parsedPayload = params.payload
    if (typeof params.payload === 'string' && params.payload.trim() && params.json) {
      try {
        parsedPayload = JSON.parse(params.payload)
      } catch (error) {
        throw createValidationError(`payload 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`)
      }
    }

    try {
      return await this.client.requestOrThrow(method, params.path.trim(), parsedPayload)
    } catch (error) {
      throw wrapDomainError(`调用飞书 OpenAPI 失败: ${method} ${normalizeOpenApiPath(params.path)}`, error)
    }
  }
}
