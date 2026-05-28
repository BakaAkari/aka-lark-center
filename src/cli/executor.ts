import { spawn } from 'child_process'
import { createCliExecutionError } from '../shared/errors.js'
import type { CliResult } from '../shared/types.js'
import { resolveCliBinary } from './installer.js'

let cachedBinaryPath: string | undefined

export function resolveCliBinaryPath(baseDir: string): string {
  if (cachedBinaryPath) return cachedBinaryPath
  cachedBinaryPath = resolveCliBinary(baseDir)
  return cachedBinaryPath
}

export function clearCachedBinaryPath(): void {
  cachedBinaryPath = undefined
}

export interface RunCliOptions {
  args: string[]
  binaryPath: string
  cwd?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
}

export function runCli(options: RunCliOptions): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    const child = spawn(options.binaryPath, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8')
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })

    const timer = options.timeoutMs
      ? setTimeout(() => {
          killed = true
          child.kill('SIGTERM')
          setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL')
          }, 5000)
        }, options.timeoutMs)
      : null

    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(createCliExecutionError(`Failed to spawn CLI: ${err.message}`))
    })

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      const durationMs = Date.now() - start
      if (killed && code === null) {
        reject(createCliExecutionError('CLI execution timed out', -1))
        return
      }
      if (signal) {
        reject(createCliExecutionError(`CLI killed by signal ${signal}`, code ?? -1))
        return
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? -1,
        durationMs,
      })
    })
  })
}
