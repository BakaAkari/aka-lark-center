import { Context, Schema } from 'koishi'
import type { Session } from 'koishi'

export const name = 'aka-lark-center'
export const inject = ['http'] as const

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
  logApiFailures: boolean
}

type ReceiveIdType = 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
type LarkMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type SessionLike = Session & {
  user?: {
    authority?: number
  }
}

interface LarkApiResponse<T = unknown> {
  code?: number
  msg?: string
  message?: string
  data?: T
  [key: string]: unknown
}

interface LarkAuthResponse extends LarkApiResponse {
  tenant_access_token?: string
  expire?: number
}

interface LarkChatListData {
  items?: Array<{
    chat_id?: string
    name?: string
    description?: string
    avatar?: string
  }>
  has_more?: boolean
  page_token?: string
}

interface LarkMessageSendData {
  message_id?: string
  root_id?: string
}

const RECEIVE_ID_TYPES = new Set<ReceiveIdType>(['chat_id', 'open_id', 'user_id', 'union_id', 'email'])
const LARK_METHODS = new Set<LarkMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    baseUrl: Schema.string().default('https://open.feishu.cn').description('Lark / 飞书 OpenAPI 基础地址'),
    appId: Schema.string().required().description('飞书应用 App ID'),
    appSecret: Schema.string().role('secret').required().description('飞书应用 App Secret'),
    timeout: Schema.number().min(1000).max(120000).default(30000).description('请求超时，单位毫秒'),
    tokenRefreshBufferSeconds: Schema.number().min(30).max(3600).default(120).description('Access Token 提前刷新秒数'),
    logApiFailures: Schema.boolean().default(true).description('在日志中输出 OpenAPI 调用失败信息'),
  }).description('Lark 凭证'),
  Schema.object({
    commandName: Schema.string().default('lark').description('主命令名'),
    defaultReceiveIdType: Schema.union([
      Schema.const('chat_id').description('群聊 ID'),
      Schema.const('open_id').description('用户 Open ID'),
      Schema.const('user_id').description('用户 User ID'),
      Schema.const('union_id').description('用户 Union ID'),
      Schema.const('email').description('用户邮箱'),
    ] as const).default('chat_id' as ReceiveIdType).description('消息发送默认 receive_id_type'),
    maxResponseLength: Schema.number().min(500).max(12000).default(4000).description('命令输出最大长度'),
  }).description('命令入口'),
  Schema.object({
    minAuthority: Schema.number().min(0).max(5).default(4).description('最小 authority，默认仅管理员可用'),
    allowedUsers: Schema.array(String).role('table').default([]).description('额外允许的用户列表，支持 userId 或 platform:userId'),
  }).description('权限控制'),
])

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(name)
  const client = new LarkClient(ctx, config, logger)
  const root = config.commandName.trim() || 'lark'

  ctx.command(root, '飞书 / Lark OpenAPI 工具集合')

  ctx.command(`${root}.ping`, '验证飞书凭证并测试 tenant_access_token')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const permissionError = getPermissionError(session as SessionLike, config)
      if (permissionError) return permissionError

      const result = await client.ping()
      if (!result.ok) return result.message

      return [
        'Lark 凭证可用。',
        `baseUrl: ${normalizeBaseUrl(config.baseUrl)}`,
        `expireInSeconds: ${result.data.expire}`,
        `tokenPreview: ${maskToken(result.data.token)}`,
      ].join('\n')
    })

  ctx.command(`${root}.chat.list`, '列出机器人可访问的群聊 / 会话')
    .userFields(['authority'])
    .option('pageSize', '-s <pageSize:number> 每页数量，默认 20')
    .option('pageToken', '-t <pageToken:string> 分页 token')
    .action(async ({ session, options }) => {
      const resolvedOptions = (options ?? {}) as { pageSize?: number, pageToken?: string }
      const permissionError = getPermissionError(session as SessionLike, config)
      if (permissionError) return permissionError

      const pageSize = typeof resolvedOptions.pageSize === 'number' && resolvedOptions.pageSize > 0 ? Math.min(resolvedOptions.pageSize, 100) : 20
      const result = await client.listChats(pageSize, resolvedOptions.pageToken)
      if (!result.ok) return result.message

      const items = result.data.items ?? []
      if (!items.length) {
        return formatJson(result.raw, config.maxResponseLength)
      }

      const lines = items.map((item, index) => {
        const title = item.name || '(未命名会话)'
        const chatId = item.chat_id || '(无 chat_id)'
        const description = item.description ? ` | ${item.description}` : ''
        return `${index + 1}. ${title}\nchat_id: ${chatId}${description}`
      })

      if (result.data.has_more && result.data.page_token) {
        lines.push(`next_page_token: ${result.data.page_token}`)
      }

      return lines.join('\n\n')
    })

  ctx.command(`${root}.message.send <receiveId:string> <content:text>`, '向飞书 chat_id/open_id/user_id 等目标发送消息')
    .userFields(['authority'])
    .option('receiveIdType', '-r <receiveIdType:string> receive_id_type，默认使用插件配置')
    .option('messageType', '-m <messageType:string> msg_type，默认 text')
    .option('json', '-j 将 content 视为符合 Lark 要求的 content JSON')
    .action(async ({ session, options }, receiveId, content) => {
      const resolvedOptions = (options ?? {}) as { receiveIdType?: string, messageType?: string, json?: boolean }
      const permissionError = getPermissionError(session as SessionLike, config)
      if (permissionError) return permissionError

      if (!receiveId?.trim()) {
        return '请输入 receiveId。'
      }
      if (!content?.trim()) {
        return '请输入消息内容。'
      }

      const receiveIdType = resolveReceiveIdType(resolvedOptions.receiveIdType, config.defaultReceiveIdType)
      if (!receiveIdType) {
        return 'receive_id_type 非法，可选 chat_id/open_id/user_id/union_id/email。'
      }

      const messageType = typeof resolvedOptions.messageType === 'string' && resolvedOptions.messageType.trim()
        ? resolvedOptions.messageType.trim()
        : 'text'

      const result = await client.sendMessage(receiveId.trim(), receiveIdType, messageType, content, Boolean(resolvedOptions.json))
      if (!result.ok) return result.message

      return [
        '消息发送成功。',
        `receive_id_type: ${receiveIdType}`,
        `message_id: ${result.data.message_id || '(unknown)'}`,
        result.data.root_id ? `root_id: ${result.data.root_id}` : '',
      ].filter(Boolean).join('\n')
    })

  ctx.command(`${root}.raw <method:string> <path:text> [payload:text]`, '调用任意飞书 / Lark OpenAPI')
    .userFields(['authority'])
    .option('json', '-j 将 payload 解析为 JSON')
    .action(async ({ session, options }, method, path, payload) => {
      const resolvedOptions = (options ?? {}) as { json?: boolean }
      const permissionError = getPermissionError(session as SessionLike, config)
      if (permissionError) return permissionError

      const normalizedMethod = normalizeMethod(method)
      if (!normalizedMethod) {
        return 'method 非法，可选 GET/POST/PUT/PATCH/DELETE。'
      }
      if (!path?.trim()) {
        return '请输入 OpenAPI 路径，例如 /open-apis/im/v1/chats。'
      }

      let parsedPayload: unknown
      if (payload?.trim()) {
        if (resolvedOptions.json) {
          try {
            parsedPayload = JSON.parse(payload)
          } catch (error) {
            return `payload 不是合法 JSON：${formatErrorMessage(error)}`
          }
        } else {
          parsedPayload = payload
        }
      }

      const result = await client.request(normalizedMethod, path.trim(), parsedPayload)
      if (!result.ok) return result.message
      return formatJson(result.data, config.maxResponseLength)
    })

  logger.info('enabled, baseUrl=%s, command=%s', normalizeBaseUrl(config.baseUrl), root)
}

class LarkClient {
  private tokenCache?: {
    token: string
    expiresAt: number
    expireInSeconds: number
  }

  constructor(
    private readonly ctx: Context,
    private readonly config: Config,
    private readonly logger: ReturnType<Context['logger']>,
  ) {}

  async ping(): Promise<{ ok: true, data: { token: string, expire: number } } | { ok: false, message: string }> {
    try {
      const token = await this.getTenantAccessToken()
      return { ok: true, data: { token: token.token, expire: token.expireInSeconds } }
    } catch (error) {
      return { ok: false, message: this.formatFailure('获取 tenant_access_token 失败', error) }
    }
  }

  async listChats(pageSize: number, pageToken?: string): Promise<{ ok: true, data: LarkChatListData, raw: unknown } | { ok: false, message: string }> {
    try {
      const response = await this.requestOrThrow<LarkChatListData>('GET', '/open-apis/im/v1/chats', undefined, {
        page_size: String(pageSize),
        page_token: pageToken,
      })
      return { ok: true, data: response.data ?? {}, raw: response }
    } catch (error) {
      return { ok: false, message: this.formatFailure('列出飞书会话失败', error) }
    }
  }

  async sendMessage(
    receiveId: string,
    receiveIdType: ReceiveIdType,
    messageType: string,
    content: string,
    treatContentAsJson: boolean,
  ): Promise<{ ok: true, data: LarkMessageSendData } | { ok: false, message: string }> {
    try {
      const contentPayload = buildMessageContent(messageType, content, treatContentAsJson)
      const response = await this.requestOrThrow<LarkMessageSendData>(
        'POST',
        `/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`,
        {
          receive_id: receiveId,
          msg_type: messageType,
          content: contentPayload,
        },
      )
      return { ok: true, data: response.data ?? {} }
    } catch (error) {
      return { ok: false, message: this.formatFailure('发送飞书消息失败', error) }
    }
  }

  async request(method: LarkMethod, apiPath: string, data?: unknown): Promise<{ ok: true, data: unknown } | { ok: false, message: string }> {
    try {
      const response = await this.requestOrThrow(method, apiPath, data)
      return { ok: true, data: response }
    } catch (error) {
      return { ok: false, message: this.formatFailure(`调用飞书 OpenAPI 失败: ${method} ${normalizeOpenApiPath(apiPath)}`, error) }
    }
  }

  private async requestOrThrow<T = unknown>(
    method: LarkMethod,
    apiPath: string,
    data?: unknown,
    query?: Record<string, string | undefined>,
  ): Promise<LarkApiResponse<T>> {
    const token = await this.getTenantAccessToken()
    const url = this.buildUrl(apiPath, query)
    const response = await (this.ctx.http as any)(url, {
      method,
      data,
      timeout: this.config.timeout,
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    }) as LarkApiResponse<T>

    assertLarkResponseOk(response)
    return response
  }

  private async getTenantAccessToken() {
    const now = Date.now()
    if (this.tokenCache && now < this.tokenCache.expiresAt) {
      return this.tokenCache
    }

    const response = await this.ctx.http.post(this.buildUrl('/open-apis/auth/v3/tenant_access_token/internal'), {
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    }, {
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }) as LarkAuthResponse

    assertLarkResponseOk(response)

    if (typeof response.tenant_access_token !== 'string' || typeof response.expire !== 'number') {
      throw new Error('Lark 返回的 tenant_access_token 响应结构不完整。')
    }

    const expiresAt = now + Math.max(response.expire - this.config.tokenRefreshBufferSeconds, 30) * 1000
    this.tokenCache = {
      token: response.tenant_access_token,
      expireInSeconds: response.expire,
      expiresAt,
    }
    return this.tokenCache
  }

  private buildUrl(apiPath: string, query?: Record<string, string | undefined>) {
    const url = new URL(normalizeOpenApiPath(apiPath), normalizeBaseUrl(this.config.baseUrl))
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) url.searchParams.set(key, value)
    }
    return url.toString()
  }

  private formatFailure(prefix: string, error: unknown) {
    if (this.config.logApiFailures) {
      this.logger.warn('%s: %s', prefix, formatErrorMessage(error))
    }
    return `${prefix}：${formatErrorMessage(error)}`
  }
}

function buildMessageContent(messageType: string, content: string, treatContentAsJson: boolean) {
  if (treatContentAsJson) {
    JSON.parse(content)
    return content
  }

  if (messageType !== 'text') {
    throw new Error('非 text 消息必须使用 -j 提供符合 Lark 要求的 content JSON。')
  }

  return JSON.stringify({ text: content })
}

function resolveReceiveIdType(value: unknown, fallback: ReceiveIdType): ReceiveIdType | null {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  return RECEIVE_ID_TYPES.has(value.trim() as ReceiveIdType) ? value.trim() as ReceiveIdType : null
}

function normalizeMethod(value: unknown): LarkMethod | null {
  if (typeof value !== 'string') return null
  const method = value.trim().toUpperCase() as LarkMethod
  return LARK_METHODS.has(method) ? method : null
}

function getPermissionError(session: SessionLike, config: Config) {
  if (!session) return '当前上下文缺少 session。'
  if (isUserExplicitlyAllowed(session, config.allowedUsers)) return ''

  const authority = session.user?.authority ?? 0
  if (authority >= config.minAuthority) return ''

  return `权限不足，需要 authority >= ${config.minAuthority}。`
}

function isUserExplicitlyAllowed(session: SessionLike, allowedUsers: string[]) {
  if (!session.userId) return false
  const scopedId = session.platform ? `${session.platform}:${session.userId}` : ''
  return allowedUsers.includes(session.userId) || (scopedId ? allowedUsers.includes(scopedId) : false)
}

function assertLarkResponseOk(response: unknown): asserts response is LarkApiResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Lark 返回了空响应。')
  }

  const larkResponse = response as LarkApiResponse
  const code = typeof larkResponse.code === 'number' ? larkResponse.code : undefined
  if (code !== undefined && code !== 0) {
    const message = [
      typeof larkResponse.msg === 'string' ? larkResponse.msg : '',
      typeof larkResponse.message === 'string' ? larkResponse.message : '',
    ].filter(Boolean).join(' | ')
    throw new Error(message || `Lark API code=${code}`)
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function normalizeOpenApiPath(apiPath: string) {
  let normalized = apiPath.trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.startsWith('/open-apis/')) normalized = `/open-apis${normalized}`
  return normalized
}

function formatJson(value: unknown, maxLength: number) {
  const text = JSON.stringify(value, null, 2) || String(value)
  if (text.length <= maxLength) {
    return `\`\`\`json\n${text}\n\`\`\``
  }
  return `\`\`\`json\n${text.slice(0, maxLength)}\n...\n\`\`\``
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown error'
}

function maskToken(token: string) {
  if (token.length <= 10) return token
  return `${token.slice(0, 6)}...${token.slice(-4)}`
}
