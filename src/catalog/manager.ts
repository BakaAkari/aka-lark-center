import type { Context } from 'koishi'
import { discoverCommands, type ToolCommand } from './discovery.js'
import { isBlocked } from './blacklist.js'
import { riskLevelPermits, type RiskLevel } from '../shared/risks.js'

export interface ToolCatalogOptions {
  binaryPath: string
  configDir: string
  riskLevel: RiskLevel
  extraBlacklist?: Set<string>
}

export class ToolCatalogManager {
  private commands: ToolCommand[] = []
  private logger: any

  constructor(private ctx: Context) {
    this.logger = ctx.logger('aka-lark-center.catalog')
  }

  async refresh(options: ToolCatalogOptions): Promise<ToolCommand[]> {
    const discovered = await discoverCommands(options.binaryPath, options.configDir)
    const allowed: ToolCommand[] = []

    for (const cmd of discovered) {
      if (isBlocked(cmd.subcommand, options.extraBlacklist)) {
        this.logger.debug(`blocked: ${cmd.subcommand}`)
        continue
      }
      if (!riskLevelPermits(cmd.riskLevel, options.riskLevel)) {
        continue
      }
      allowed.push(cmd)
    }

    this.commands = allowed
    this.logger.info(`catalog refreshed: ${allowed.length}/${discovered.length} commands allowed`)
    return allowed
  }

  list(): ToolCommand[] {
    return this.commands.slice()
  }

  find(subcommand: string): ToolCommand | undefined {
    return this.commands.find((c) => c.subcommand === subcommand)
  }
}
