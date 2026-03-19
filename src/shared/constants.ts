import type { LarkMethod, ReceiveIdType } from './types.js'

export const PLUGIN_NAME = 'aka-lark-center'
export const RECEIVE_ID_TYPES = new Set<ReceiveIdType>(['chat_id', 'open_id', 'user_id', 'union_id', 'email'])
export const LARK_METHODS = new Set<LarkMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
export const CHATLUNA_BRIDGE_PLATFORM_NAME = 'aka-lark-center-tools'
