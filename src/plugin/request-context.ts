import { sessionToActor, sessionToCollaboratorOpenId } from '../identity/permissions.js'
import type {
  Config,
  LarkOutputChannel,
  LarkRequestContext,
  LarkRequestSource,
  SessionLike,
} from '../shared/types.js'
import type { LarkCenter } from './service.js'

interface ResolveRequestContextOptions {
  source: LarkRequestSource
  outputChannel: LarkOutputChannel
  session?: SessionLike
}

export function resolveCommandContext(center: LarkCenter, config: Config, session?: SessionLike) {
  return resolveRequestContext(center, config, {
    source: 'command',
    outputChannel: 'command',
    session,
  })
}

export function resolveToolContext(center: LarkCenter, config: Config, session?: SessionLike) {
  return resolveRequestContext(center, config, {
    source: 'chatluna_tool',
    outputChannel: 'tool',
    session,
  })
}

function resolveRequestContext(
  center: LarkCenter,
  config: Config,
  options: ResolveRequestContextOptions,
): LarkRequestContext {
  const actor = sessionToActor(options.session)
  const ownerOpenId = sessionToCollaboratorOpenId(options.session)
  const permissionError = center.getPermissionError(actor)

  return {
    source: options.source,
    session: options.session,
    requester: {
      actor,
      ownerOpenId,
      isLarkUserContext: Boolean(ownerOpenId),
    },
    permission: {
      granted: !permissionError,
      error: permissionError || undefined,
    },
    ownership: {
      requesterOpenId: ownerOpenId,
      autoTransferToRequester: config.autoTransferOwnershipToRequester,
      retainedBotPermission: config.retainedBotPermissionAfterOwnershipTransfer,
      stayPut: config.transferOwnershipStayPut,
    },
    output: {
      channel: options.outputChannel,
      maxResponseLength: config.maxResponseLength,
    },
  }
}
