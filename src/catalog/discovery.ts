import { runCli } from '../cli/executor.js'
import { classifyRisk } from '../shared/risks.js'
import type { RiskLevel } from '../shared/risks.js'

export interface ToolCommand {
  category: string
  subcommand: string
  description?: string
  riskLevel: RiskLevel
}

export { classifyRisk }

export async function discoverCommands(
  binaryPath: string,
  cliConfigDir: string,
): Promise<ToolCommand[]> {
  const result = await runCli({
    binaryPath,
    args: ['--help', '--json'],
    env: { HOME: cliConfigDir },
    timeoutMs: 15000,
  })
  if (result.exitCode !== 0) {
    // fallback: return minimal known set
    return []
  }
  try {
    const data = JSON.parse(result.stdout || '{}')
    const commands: ToolCommand[] = []
    // lark-cli --json structure varies; adapt as needed
    if (Array.isArray(data.commands)) {
      for (const cmd of data.commands) {
        const path = typeof cmd === 'string' ? cmd : cmd.name || cmd.command
        if (typeof path === 'string') {
          commands.push({
            category: path.split(':')[0] || 'unknown',
            subcommand: path,
            description: cmd.description,
            riskLevel: classifyRisk(path),
          })
        }
      }
    }
    return commands
  } catch {
    return []
  }
}
