import type { Config, LarkCapabilityFlags } from './types.js'

export function getCapabilityFlags(config: Config): LarkCapabilityFlags {
  return {
    docs: true,
    drive: true,
    messages: true,
    bitable: false,
    files: true,
    chatlunaBridge: Boolean(config.chatlunaEnabled),
  }
}
