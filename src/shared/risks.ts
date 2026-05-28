export type RiskLevel = 'read' | 'write' | 'destructive' | 'admin'

export const RISK_ORDER: RiskLevel[] = ['read', 'write', 'destructive', 'admin']

export function riskLevelPermits(cmdLevel: RiskLevel, configLevel: RiskLevel): boolean {
  return RISK_ORDER.indexOf(cmdLevel) <= RISK_ORDER.indexOf(configLevel)
}

export function classifyRisk(commandPath: string): RiskLevel {
  const lower = commandPath.toLowerCase()
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('purge') || lower.includes('drop') || lower.includes('unbind') || lower.includes('logout')) {
    return 'destructive'
  }
  if (lower.includes('admin') || lower.includes('role') || lower.includes('permission') || lower.includes('scope')) {
    return 'admin'
  }
  if (lower.includes('create') || lower.includes('update') || lower.includes('edit') || lower.includes('add') || lower.includes('append') || lower.includes('send') || lower.includes('post') || lower.includes('put') || lower.includes('patch') || lower.includes('transfer') || lower.includes('move') || lower.includes('copy') || lower.includes('share')) {
    return 'write'
  }
  return 'read'
}
