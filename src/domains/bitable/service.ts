import { createCapabilityError } from '../../shared/errors.js'
import type {
  LarkBitableQueryRecordsParams,
  LarkBitableQueryRecordsResult,
} from '../../shared/types.js'

export class LarkBitableService {
  isAvailable() {
    return false
  }

  async queryRecords(_params: LarkBitableQueryRecordsParams): Promise<LarkBitableQueryRecordsResult> {
    throw createCapabilityError('bitable', 'Bitable 域骨架已经预留，但查询能力还未实现。')
  }
}
