import type { Context } from 'koishi'
import { Service } from 'koishi'
import { PLUGIN_NAME } from '../shared/constants.js'
import { UserAuthManager } from '../cli/auth.js'
import { SafeCliRunner } from '../cli/runner.js'
import { ToolCatalogManager } from '../catalog/manager.js'
import { resolveUserId, makeUserKey } from '../identity/user.js'
import { ensureInstalled, resolveCliBinary } from '../cli/installer.js'
import { registerCommands } from './commands.js'
import { registerChatLunaBridge } from '../bridge/chatluna.js'
import type { Config } from '../shared/types.js'

declare module 'koishi' {
  interface Context {
    larkCenter: LarkCenter
  }
}

export class LarkCenter extends Service {
  readonly auth: UserAuthManager
  readonly runner: SafeCliRunner
  readonly catalog: ToolCatalogManager
  binaryPath: string

  constructor(ctx: Context, public config: Config) {
    super(ctx, PLUGIN_NAME)
    const baseDir = config.larkCliConfigDir || ctx.baseDir
    this.binaryPath = resolveCliBinary(baseDir)
    this.auth = new UserAuthManager(baseDir, this.binaryPath, {
      appId: config.appId,
      appSecret: config.appSecret,
    })
    this.runner = new SafeCliRunner(ctx, this.binaryPath)
    this.catalog = new ToolCatalogManager(ctx)
  }

  async start(): Promise<void> {
    await this.ensureCliInstalled()
    registerCommands(this.ctx, this, this.config)
    registerChatLunaBridge(this.ctx, {
      enabled: this.config.chatlunaEnabled ?? false,
      riskLevel: this.config.chatlunaRiskLevel ?? 'write',
      catalog: this.catalog,
      runner: this.runner,
      getConfigDir: (key) => this.userConfigDir(key),
      getAppCredentials: () => ({
        appId: this.config.appId,
        appSecret: this.config.appSecret,
      }),
    })
  }

  async ensureCliInstalled(): Promise<void> {
    const result = await ensureInstalled({
      baseDir: this.config.larkCliConfigDir || this.ctx.baseDir,
      logger: this.ctx.logger('aka-lark-center.installer'),
    })
    if (result.installed) {
      this.binaryPath = result.binaryPath
    }
  }

  getUserKey(session: { userId?: string; platform?: string }): string {
    return makeUserKey(resolveUserId(session))
  }

  userConfigDir(userKey: string): string {
    // expose the private method through a public wrapper
    return (this.auth as any).userConfigDir(userKey)
  }
}
