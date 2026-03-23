import { Schema } from 'koishi'
import type { Config as PluginConfig, DriveMemberPermission, ReceiveIdType } from '../shared/types.js'

export const Config: Schema<PluginConfig> = Schema.intersect([
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
    autoTransferOwnershipToRequester: Schema.boolean().default(false).description('创建文档后是否自动把文档 owner 转交给发起命令的飞书用户。'),
    retainedBotPermissionAfterOwnershipTransfer: Schema.union([
      Schema.const('view').description('保留只读权限'),
      Schema.const('edit').description('保留可编辑权限'),
      Schema.const('full_access').description('保留完全权限'),
    ] as const).default('edit' as DriveMemberPermission).description('转移 owner 后保留给 bot 的权限角色。'),
    transferOwnershipStayPut: Schema.boolean().default(false).description('转移 owner 后是否保留在原位置。关闭时会尽量移到新 owner 的个人空间，便于清理 bot 云空间。'),
  }).description('命令入口'),
  Schema.object({
    minAuthority: Schema.number().min(0).max(5).default(4).description('最小 authority，默认仅管理员可用'),
    allowedUsers: Schema.array(String).role('table').default([]).description('额外允许的用户列表，支持 userId 或 platform:userId'),
  }).description('权限控制'),
  Schema.object({
    chatlunaEnabled: Schema.boolean().default(false).description('是否启用内置 ChatLuna 工具桥接。开启后会把飞书工具注册到 ChatLuna，关闭时自动卸载。'),
    chatlunaContextInjectionEnabled: Schema.boolean().default(true).description('是否在 ChatLuna 对话前自动识别飞书文档链接并注入文档上下文。'),
    chatlunaContextMaxChars: Schema.number().min(500).max(20000).default(4000).description('自动注入到 ChatLuna 上下文中的飞书文档最大字符数。'),
  }).description('LLM 集成'),
])
