export interface UserIdentity {
  userId: string
  platform: string
}

export function resolveUserId(session: { userId?: string; platform?: string }): UserIdentity {
  return {
    userId: session.userId ?? 'anonymous',
    platform: session.platform ?? 'unknown',
  }
}

export function makeUserKey(identity: UserIdentity): string {
  return `${identity.platform}:${identity.userId}`
}
