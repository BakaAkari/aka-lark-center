import type { Config, LarkActor, SessionLike } from '../shared/types.js'

export function sessionToActor(session?: SessionLike): LarkActor | undefined {
  if (!session) return undefined

  return {
    userId: session.userId,
    platform: session.platform,
    authority: session.user?.authority,
  }
}

export function sessionToCollaboratorOpenId(session?: SessionLike) {
  if (!session?.userId) return undefined
  if (session.platform !== 'lark' && session.platform !== 'feishu') return undefined
  return session.userId
}

export function getPermissionError(actor: LarkActor | undefined, config: Config) {
  if (!actor) return '当前上下文缺少 session。'
  if (isUserExplicitlyAllowed(actor, config.allowedUsers)) return ''

  const authority = actor.authority ?? 0
  if (authority >= config.minAuthority) return ''

  return `权限不足，需要 authority >= ${config.minAuthority}。`
}

export function isUserExplicitlyAllowed(actor: LarkActor, allowedUsers: string[]) {
  if (!actor.userId) return false
  const scopedId = actor.platform ? `${actor.platform}:${actor.userId}` : ''
  return allowedUsers.includes(actor.userId) || (scopedId ? allowedUsers.includes(scopedId) : false)
}
