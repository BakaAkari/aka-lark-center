import type { Context } from 'koishi'
import { PLUGIN_NAME } from './shared/constants.js'
import { Config } from './plugin/config.js'
import { LarkCenter } from './plugin/service.js'

export const name = PLUGIN_NAME
export const inject = {
  required: [],
  optional: ['chatluna'],
} as const

export { Config, LarkCenter }

export function apply(ctx: Context, config: any) {
  ctx.plugin(LarkCenter, config)
}
