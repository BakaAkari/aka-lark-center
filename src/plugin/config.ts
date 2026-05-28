import { Schema } from 'koishi'
import type { Config as PluginConfig } from '../shared/types.js'

export const Config: Schema<PluginConfig> = Schema.intersect([
  Schema.object({
    appId: Schema.string().required().description('飞书应用 App ID'),
    appSecret: Schema.string().role('secret').required().description('飞书应用 App Secret'),
    baseUrl: Schema.string().default('https://open.feishu.cn').description('Lark / 飞书 OpenAPI 基础地址'),
    timeout: Schema.number().min(1000).max(120000).default(30000).description('CLI 命令执行超时，单位毫秒'),
    logApiFailures: Schema.boolean().default(true).description('在日志中输出 CLI 调用失败信息'),
  }).description('Lark 凭证'),
  Schema.object({
    commandName: Schema.string().default('lark').description('主命令名'),
    larkCliConfigDir: Schema.string().default('').description('lark-cli 配置持久化目录，留空则使用插件数据目录下的 lark-center'),
  }).description('命令入口'),
  Schema.object({
    minAuthority: Schema.number().min(0).max(5).default(4).description('最小 authority，默认仅管理员可用'),
    allowedUsers: Schema.array(String).role('table').default([]).description('额外允许的用户列表，支持 userId 或 platform:userId'),
  }).description('权限控制'),
  Schema.object({
    chatlunaEnabled: Schema.boolean().default(false).description('是否启用内置 ChatLuna 工具桥接'),
    chatlunaRiskLevel: Schema.union([
      Schema.const('read').description('仅暴露读取类工具'),
      Schema.const('write').description('暴露读取和写入类工具'),
      Schema.const('destructive').description('额外暴露删除/转移等破坏性工具'),
      Schema.const('admin').description('暴露全部工具包括管理员操作'),
    ] as const).default('write').description('ChatLuna 工具风险等级'),
  }).description('LLM 集成'),
])
