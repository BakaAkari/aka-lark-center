export interface Config {
  appId: string
  appSecret: string
  baseUrl?: string
  commandName?: string
  timeout?: number
  logApiFailures?: boolean
  minAuthority?: number
  allowedUsers?: string[]
  chatlunaEnabled?: boolean
  chatlunaRiskLevel?: 'read' | 'write' | 'destructive' | 'admin'
  larkCliConfigDir?: string
}

export interface CliResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

export interface LarkPingResult {
  version: string
  cliPath: string
  configDir: string
}
