import type { Context } from 'koishi'
import type { LarkCenter } from '../../plugin/service.js'
import { CHATLUNA_BRIDGE_PLATFORM_NAME } from '../../shared/constants.js'
import { formatErrorMessage } from '../../shared/utils.js'
import type { Config } from '../../shared/types.js'
import type { ChatLunaPluginLike, ChatLunaServiceLike } from './runtime.js'
import { loadChatLunaRuntime } from './runtime.js'
import { registerChatLunaTools } from './tools.js'

export class ChatLunaBridgeManager {
  private chatLunaPlugin?: ChatLunaPluginLike
  private warnedUnavailable = false
  private syncQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly ctx: Context,
    private readonly center: LarkCenter,
    private readonly config: Config,
    private readonly logger: ReturnType<Context['logger']>,
  ) {}

  sync(enabled: boolean) {
    this.syncQueue = this.syncQueue
      .catch(() => {})
      .then(async () => {
        if (enabled) {
          await this.enable()
        } else {
          await this.disable()
        }
      })
    return this.syncQueue
  }

  async dispose() {
    await this.disable()
  }

  private async enable() {
    if (this.chatLunaPlugin) return

    const chatlunaService = this.getChatLunaService()
    const runtime = await loadChatLunaRuntime().catch((error) => {
      if (!this.warnedUnavailable) {
        this.logger.warn('ChatLuna bridge enabled but runtime modules are unavailable: %s', formatErrorMessage(error))
        this.warnedUnavailable = true
      }
      return null
    })

    if (!chatlunaService || !runtime) {
      if (!this.warnedUnavailable) {
        this.logger.warn('ChatLuna bridge enabled, but ChatLuna service is not available. Install and enable ChatLuna first.')
        this.warnedUnavailable = true
      }
      return
    }

    const existing = chatlunaService.getPlugin?.(CHATLUNA_BRIDGE_PLATFORM_NAME)
    if (existing) {
      this.logger.warn('ChatLuna plugin name "%s" is already in use, skip built-in bridge registration.', CHATLUNA_BRIDGE_PLATFORM_NAME)
      this.warnedUnavailable = true
      return
    }

    const plugin = new runtime.ChatLunaPlugin(this.ctx, {}, CHATLUNA_BRIDGE_PLATFORM_NAME, false)
    registerChatLunaTools(plugin, runtime.StructuredTool, this.center, this.config)

    if (!chatlunaService.getPlugin?.(CHATLUNA_BRIDGE_PLATFORM_NAME)) {
      await Promise.resolve(chatlunaService.installPlugin(plugin))
    }

    this.chatLunaPlugin = plugin
    this.warnedUnavailable = false
    this.logger.info('ChatLuna bridge enabled with %s tools.', this.center.getToolDefinitions().length)
  }

  private async disable() {
    if (!this.chatLunaPlugin) return

    const plugin = this.chatLunaPlugin
    this.chatLunaPlugin = undefined

    const chatlunaService = this.getChatLunaService()
    try {
      chatlunaService?.uninstallPlugin(plugin)
    } catch (error) {
      this.logger.warn('failed to uninstall ChatLuna bridge plugin: %s', formatErrorMessage(error))
    }

    try {
      await Promise.resolve(plugin.dispose?.())
    } catch (error) {
      this.logger.warn('failed to dispose ChatLuna bridge plugin: %s', formatErrorMessage(error))
    }

    this.logger.info('ChatLuna bridge disabled.')
  }

  private getChatLunaService() {
    const service = (this.ctx as Context & {
      chatluna?: ChatLunaServiceLike
    }).chatluna

    if (!service) return null
    if (typeof service.installPlugin !== 'function' || typeof service.uninstallPlugin !== 'function') {
      return null
    }

    return service
  }
}
