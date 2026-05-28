import type { Context } from 'koishi'
import type { LarkCenter } from './service.js'
import type { Config } from '../shared/types.js'
import { maskToken } from '../shared/utils.js'
import { resolveCliBinary, ensureInstalled } from '../cli/installer.js'
import { CLI_VERSION } from '../shared/constants.js'

export function registerCommands(ctx: Context, center: LarkCenter, config: Config) {
  const root = (config.commandName || 'lark').trim() || 'lark'

  ctx.command(root, '飞书 / Lark CLI 工具集合')
  ctx.command(`${root}.system`, '系统与调试命令')
  ctx.command(`${root}.auth`, '用户身份管理')

  ctx.command(`${root}.system.ping`, '验证 CLI 可用性并查看基本信息')
    .userFields(['authority'])
    .action(async ({ session }) => {
      try {
        const baseDir = config.larkCliConfigDir || ctx.baseDir
        const binaryPath = resolveCliBinary(baseDir)
        const { existsSync } = await import('fs')
        const exists = existsSync(binaryPath)
        return `CLI version=${CLI_VERSION} binaryPath=${binaryPath} exists=${exists}`
      } catch (e) {
        return `CLI check failed: ${(e as Error).message}`
      }
    })

  ctx.command(`${root}.system.cli.install`, '手动下载并安装 lark-cli 二进制')
    .userFields(['authority'])
    .action(async ({ session }) => {
      try {
        const result = await ensureInstalled({
          baseDir: config.larkCliConfigDir || ctx.baseDir,
          logger: ctx.logger('aka-lark-center.installer'),
        })
        if (result.installed) {
          return `lark-cli ${result.version} 安装成功：${result.binaryPath}`
        }
        return `lark-cli ${result.version} 已存在：${result.binaryPath}`
      } catch (e) {
        return `安装失败：${(e as Error).message}`
      }
    })

  ctx.command(`${root}.system.cli.version`, '查看当前 lark-cli 版本信息')
    .userFields(['authority'])
    .action(async ({ session }) => {
      return `bundled lark-cli version: ${CLI_VERSION}`
    })

  ctx.command(`${root}.auth.status`, '查看当前用户绑定状态')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const key = center.getUserKey(session as any)
      const status = await center.auth.getAuthStatus(key)
      if (!status.bound) return `用户 ${key} 尚未绑定飞书身份。`
      return `用户 ${key} 已绑定：${status.userName ?? status.userOpenId ?? 'unknown'}`
    })

  ctx.command(`${root}.auth.bind`, '绑定个人飞书身份（Device Flow）')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const key = center.getUserKey(session as any)
      const existing = await center.auth.getAuthStatus(key)
      if (existing.bound) {
        return `已绑定：${existing.userName ?? existing.userOpenId}。如需换绑，先执行 ${root}.auth.unbind。`
      }
      try {
        const init = await center.auth.initDeviceFlow(key)
        const lines = [
          `请在 ${init.expiresIn} 秒内完成绑定：`,
          `1. 打开链接：${init.verificationUrl}`,
          `2. 输入设备码：${init.deviceCode}`,
          `3. 授权后，执行 ${root}.auth.confirm <设备码> 完成绑定`,
        ]
        return lines.join('\n')
      } catch (e) {
        return `绑定初始化失败：${(e as Error).message}`
      }
    })

  ctx.command(`${root}.auth.confirm <deviceCode:string>`, '确认 Device Flow 绑定')
    .userFields(['authority'])
    .action(async ({ session }, deviceCode) => {
      const key = center.getUserKey(session as any)
      try {
        const status = await center.auth.completeDeviceFlow(key, deviceCode)
        if (!status.bound) return '绑定未完成，请检查设备码是否过期。'
        return `绑定成功：${status.userName ?? status.userOpenId}`
      } catch (e) {
        return `绑定确认失败：${(e as Error).message}`
      }
    })

  ctx.command(`${root}.auth.unbind`, '解绑个人飞书身份')
    .userFields(['authority'])
    .action(async ({ session }) => {
      const key = center.getUserKey(session as any)
      await center.auth.unbind(key)
      return `用户 ${key} 已解绑。`
    })
}
