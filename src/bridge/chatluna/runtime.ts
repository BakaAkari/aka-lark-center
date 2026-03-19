import { createRequire } from 'node:module'
import type { Context } from 'koishi'
import { createUnsupportedError } from '../../shared/errors.js'
import { formatErrorMessage } from '../../shared/utils.js'
import type { SessionLike } from '../../shared/types.js'

export interface ChatLunaServiceLike {
  installPlugin(plugin: unknown): Promise<void> | void
  uninstallPlugin(plugin: unknown): void
  getPlugin?(name: string): unknown
}

export interface ChatLunaPluginLike {
  registerTool(name: string, tool: unknown): void
  dispose?(): Promise<void> | void
}

export type ChatLunaPluginConstructor = new (
  ctx: Context,
  config: Record<string, never>,
  platformName: string,
  createConfigPool: boolean,
) => ChatLunaPluginLike

export type StructuredToolConstructor = new (...args: any[]) => {
  name?: string
  description?: string
  schema?: unknown
  _call(input: Record<string, unknown>, runManager?: unknown, config?: { configurable?: { session?: SessionLike } }): Promise<string>
}

const runtimeRequire = createRequire(`${process.cwd()}/package.json`)

export async function loadChatLunaRuntime(): Promise<{
  ChatLunaPlugin: ChatLunaPluginConstructor
  StructuredTool: StructuredToolConstructor
}> {
  const [chatlunaModule, langchainToolsModule] = await Promise.all([
    loadRuntimeModule('koishi-plugin-chatluna/services/chat'),
    loadRuntimeModule('@langchain/core/tools'),
  ])

  const ChatLunaPlugin = chatlunaModule.ChatLunaPlugin as ChatLunaPluginConstructor | undefined
  const StructuredTool = langchainToolsModule.StructuredTool as StructuredToolConstructor | undefined

  if (!ChatLunaPlugin) {
    throw createUnsupportedError('ChatLunaPlugin export not found.', {
      specifier: 'koishi-plugin-chatluna/services/chat',
    })
  }
  if (!StructuredTool) {
    throw createUnsupportedError('StructuredTool export from @langchain/core/tools not found.', {
      specifier: '@langchain/core/tools',
    })
  }

  return {
    ChatLunaPlugin,
    StructuredTool,
  }
}

async function loadRuntimeModule(specifier: string): Promise<Record<string, any>> {
  try {
    return runtimeRequire(specifier) as Record<string, any>
  } catch (requireError) {
    return importRuntimeModule(specifier, requireError)
  }
}

function importRuntimeModule(specifier: string, requireError?: unknown): Promise<Record<string, any>> {
  const dynamicImport = new Function('s', 'return import(s)') as (target: string) => Promise<Record<string, any>>
  return dynamicImport(specifier).catch((importError) => {
    throw createUnsupportedError([
      `failed to load runtime module "${specifier}"`,
      `require: ${formatErrorMessage(requireError)}`,
      `import: ${formatErrorMessage(importError)}`,
    ].join('; '), {
      specifier,
    })
  })
}
