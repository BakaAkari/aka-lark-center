import type { Context } from 'koishi'
import { runCli, type RunCliOptions } from './executor.js'
import { ConcurrencyLimiter } from './concurrency.js'
import { createCliExecutionError } from '../shared/errors.js'
import { maskToken } from '../shared/utils.js'
import type { CliResult } from '../shared/types.js'

export interface SafeRunOptions extends RunCliOptions {
  userKey?: string
  redactInLog?: boolean
}

export class SafeCliRunner {
  private limiter = new ConcurrencyLimiter(1)
  private logger: any

  constructor(
    private ctx: Context,
    private binaryPath: string,
  ) {
    this.logger = ctx.logger('aka-lark-center.cli')
  }

  async run(options: SafeRunOptions): Promise<CliResult> {
    const key = options.userKey ?? 'global'

    return this.limiter.acquire(key, async () => {
      const argsDesc = options.args.join(' ')
      this.logger.info(`CLI start: ${argsDesc}`)

      const start = Date.now()
      try {
        const result = await runCli({
          binaryPath: this.binaryPath,
          args: options.args,
          cwd: options.cwd,
          env: options.env,
          timeoutMs: options.timeoutMs,
        })

        const safeStdout = options.redactInLog ? this.redact(result.stdout) : result.stdout
        const safeStderr = options.redactInLog ? this.redact(result.stderr) : result.stderr

        if (result.exitCode !== 0) {
          this.logger.warn(
            `CLI error: exit=${result.exitCode} duration=${Date.now() - start}ms args=${argsDesc}`,
          )
          if (safeStderr) this.logger.warn(`stderr: ${safeStderr.slice(0, 500)}`)
        } else {
          this.logger.info(`CLI ok: duration=${Date.now() - start}ms args=${argsDesc}`)
        }

        return result
      } catch (err) {
        this.logger.error(`CLI exception: ${(err as Error).message} args=${argsDesc}`)
        throw err
      }
    })
  }

  private redact(text: string): string {
    return text
      .replace(/["']?access[_-]?token["']?\s*[:=]\s*["'][^"']+["']/gi, (m) =>
        m.replace(/["'][^"']+["']$/, '"***"'),
      )
      .replace(/["']?app[_-]?secret["']?\s*[:=]\s*["'][^"']+["']/gi, (m) =>
        m.replace(/["'][^"']+["']$/, '"***"'),
      )
      .replace(/["']?device[_-]?code["']?\s*[:=]\s*["'][^"']+["']/gi, (m) =>
        m.replace(/["'][^"']+["']$/, '"***"'),
      )
  }
}

export async function runWithBotIdentity(
  runner: SafeCliRunner,
  appId: string,
  appSecret: string,
  configDir: string,
  args: string[],
  timeoutMs?: number,
): Promise<CliResult> {
  const result = await runner.run({
    binaryPath: (runner as any).binaryPath,
    args,
    env: {
      HOME: configDir,
      LARK_APP_ID: appId,
      LARK_APP_SECRET: appSecret,
    },
    timeoutMs,
    redactInLog: true,
  })
  return result
}
