import type { Context } from 'koishi'
import type { ToolCatalogManager } from '../catalog/manager.js'
import { SafeCliRunner } from '../cli/runner.js'
import type { RiskLevel } from '../shared/risks.js'

export interface ChatLunaBridgeOptions {
  enabled: boolean
  riskLevel: RiskLevel
  catalog: ToolCatalogManager
  runner: SafeCliRunner
  getConfigDir: (userKey: string) => string
  getAppCredentials: () => { appId: string; appSecret: string }
}

export function registerChatLunaBridge(ctx: Context, options: ChatLunaBridgeOptions) {
  if (!options.enabled) return

  // Placeholder: ChatLuna bridge will be wired when ChatLuna service is available
  ctx.logger('aka-lark-center.bridge').info('ChatLuna bridge registered (placeholder)')
}

export function buildToolDefinitions(catalog: ToolCatalogManager) {
  const commands = catalog.list()
  return commands.map((cmd) => ({
    name: `lark_${cmd.subcommand.replace(/[:\-]/g, '_')}`,
    description: cmd.description || `Execute lark-cli command: ${cmd.subcommand}`,
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'string',
          description: 'Space-separated arguments for the CLI command',
        },
      },
      required: ['args'],
    } as any,
    handler: async (params: { args: string }) => {
      return `Tool ${cmd.subcommand} registered. Actual execution requires runtime bridge.`
    },
  }))
}
