export class LarkCenterError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'LARK_CENTER_ERROR',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'LarkCenterError'
  }
}

export function createCliExecutionError(
  message: string,
  exitCode?: number,
  stderr?: string,
): LarkCenterError {
  return new LarkCenterError(
    message,
    exitCode !== undefined ? `CLI_EXIT_${exitCode}` : 'CLI_EXECUTION_ERROR',
    { exitCode, stderr: stderr?.slice(0, 2000) },
  )
}
