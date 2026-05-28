export const DEFAULT_BLACKLIST = new Set<string>([
  // event stream subscriptions
  'event:consume',
  'event:subscribe',
  'event:unsubscribe',
  'event:listen',
  // long-running / interactive
  'shell',
  'exec',
  'run',
  'watch',
  // auth handled by plugin
  'auth:login',
  // direct shell escape
  'bash',
  'sh',
  'zsh',
])

export const ALWAYS_BLOCKED_PREFIXES = ['event:', 'shell:', 'exec:', 'bash:', 'sh:', 'zsh:']

export function isBlocked(commandPath: string, extraBlacklist?: Set<string>): boolean {
  const lower = commandPath.toLowerCase().trim()
  if (DEFAULT_BLACKLIST.has(lower)) return true
  if (extraBlacklist?.has(lower)) return true
  for (const prefix of ALWAYS_BLOCKED_PREFIXES) {
    if (lower.startsWith(prefix)) return true
  }
  return false
}
