import { mkdir } from 'fs/promises'
import { resolve } from 'path'
import { runCli } from './executor.js'
import { createCliExecutionError } from '../shared/errors.js'

export interface AuthStatus {
  bound: boolean
  userOpenId?: string
  userName?: string
}

export interface DeviceFlowInitResult {
  verificationUrl: string
  deviceCode: string
  expiresIn: number
  interval: number
}

export interface UserAuthManagerOptions {
  appId: string
  appSecret: string
}

export class UserAuthManager {
  constructor(
    private baseDir: string,
    private binaryPath: string,
    private options: UserAuthManagerOptions,
  ) {}

  private userConfigDir(userId: string): string {
    return resolve(this.baseDir, 'users', userId, '.lark-cli')
  }

  async ensureUserConfigDir(userId: string): Promise<string> {
    const dir = this.userConfigDir(userId)
    await mkdir(dir, { recursive: true })
    return dir
  }

  private async ensureCliConfig(userId: string): Promise<string> {
    const dir = await this.ensureUserConfigDir(userId)
    const result = await runCli({
      binaryPath: this.binaryPath,
      args: [
        'config',
        'init',
        '--app-id',
        this.options.appId,
        '--app-secret-stdin',
        '--brand',
        'feishu',
      ],
      env: { HOME: dir },
      stdin: `${this.options.appSecret}\n`,
      timeoutMs: 30000,
    })
    if (result.exitCode !== 0) {
      throw createCliExecutionError(
        `CLI config init failed: ${result.stderr || result.stdout}`,
        result.exitCode,
        result.stderr,
      )
    }
    return dir
  }

  async getAuthStatus(userId: string): Promise<AuthStatus> {
    const dir = this.userConfigDir(userId)
    try {
      const result = await runCli({
        binaryPath: this.binaryPath,
        args: ['auth', 'status', '--json'],
        env: { HOME: dir },
        timeoutMs: 15000,
      })
      if (result.exitCode !== 0) return { bound: false }
      const data = JSON.parse(result.stdout || '{}')
      return {
        bound: !!data.userOpenId || !!data.authenticated,
        userOpenId: data.userOpenId,
        userName: data.userName,
      }
    } catch {
      return { bound: false }
    }
  }

  async initDeviceFlow(userId: string): Promise<DeviceFlowInitResult> {
    const dir = await this.ensureCliConfig(userId)
    const result = await runCli({
      binaryPath: this.binaryPath,
      args: ['auth', 'login', '--no-wait', '--json'],
      env: { HOME: dir },
      timeoutMs: 30000,
    })
    if (result.exitCode !== 0) {
      throw createCliExecutionError(
        `Device flow init failed: ${result.stderr}`,
        result.exitCode,
        result.stderr,
      )
    }
    const data = JSON.parse(result.stdout || '{}')
    return {
      verificationUrl: data.verification_url || data.verificationUrl,
      deviceCode: data.device_code || data.deviceCode,
      expiresIn: data.expires_in || data.expiresIn || 1800,
      interval: data.interval || 5,
    }
  }

  async completeDeviceFlow(userId: string, deviceCode: string): Promise<AuthStatus> {
    const dir = this.userConfigDir(userId)
    const result = await runCli({
      binaryPath: this.binaryPath,
      args: ['auth', 'login', '--device-code', deviceCode, '--json'],
      env: { HOME: dir },
      timeoutMs: 60000,
    })
    if (result.exitCode !== 0) {
      throw createCliExecutionError(
        `Device flow complete failed: ${result.stderr}`,
        result.exitCode,
        result.stderr,
      )
    }
    return this.getAuthStatus(userId)
  }

  async unbind(userId: string): Promise<void> {
    const dir = this.userConfigDir(userId)
    await runCli({
      binaryPath: this.binaryPath,
      args: ['auth', 'logout', '--force'],
      env: { HOME: dir },
      timeoutMs: 15000,
    }).catch(() => {
      // ignore logout failures
    })
  }
}
