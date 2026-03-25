import { LarkApiClient } from '../../client/request.js'
import { wrapDomainError } from '../../shared/errors.js'
import type {
  LarkBitableCreateRecordParams,
  LarkBitableCreateRecordResult,
  LarkBitableFieldSummary,
  LarkBitableListFieldsParams,
  LarkBitableListFieldsResult,
  LarkBitableListTablesParams,
  LarkBitableListTablesResult,
  LarkBitableQueryRecordsParams,
  LarkBitableQueryRecordsResult,
  LarkBitableTableSummary,
  LarkBitableUpdateRecordParams,
  LarkBitableUpdateRecordResult,
} from '../../shared/types.js'

export class LarkBitableService {
  constructor(private readonly client: LarkApiClient) {}

  isAvailable() {
    return true
  }

  async listTables(params: LarkBitableListTablesParams): Promise<LarkBitableListTablesResult> {
    const { appToken, pageSize, pageToken } = params
    const query: Record<string, string> = {}
    if (pageSize) query.page_size = String(Math.min(pageSize, 100))
    if (pageToken) query.page_token = pageToken

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        `/open-apis/bitable/v1/apps/${appToken}/tables`,
        undefined,
        query,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const rawItems = (data.items as Record<string, unknown>[] | undefined) ?? []
      return {
        items: rawItems.map(toTableSummary),
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('列出多维表格数据表失败', error)
    }
  }

  async queryRecords(params: LarkBitableQueryRecordsParams): Promise<LarkBitableQueryRecordsResult> {
    const { appToken, tableId, pageSize, pageToken, filter } = params
    const body: Record<string, unknown> = {}
    if (pageSize) body.page_size = Math.min(pageSize, 500)
    if (pageToken) body.page_token = pageToken
    if (filter) body.filter = filter

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'POST',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
        body,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      return {
        items: (data.items as unknown[]) ?? [],
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('查询多维表格记录失败', error)
    }
  }

  async createRecord(params: LarkBitableCreateRecordParams): Promise<LarkBitableCreateRecordResult> {
    const { appToken, tableId, fields } = params

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'POST',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        { fields },
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const record = (data.record ?? {}) as Record<string, unknown>
      return {
        recordId: (record.record_id as string) ?? '',
        fields: (record.fields as Record<string, unknown>) ?? {},
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('创建多维表格记录失败', error)
    }
  }

  async updateRecord(params: LarkBitableUpdateRecordParams): Promise<LarkBitableUpdateRecordResult> {
    const { appToken, tableId, recordId, fields } = params

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'PUT',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
        { fields },
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const record = (data.record ?? {}) as Record<string, unknown>
      return {
        recordId: (record.record_id as string) ?? recordId,
        fields: (record.fields as Record<string, unknown>) ?? {},
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('更新多维表格记录失败', error)
    }
  }
  async listFields(params: LarkBitableListFieldsParams): Promise<LarkBitableListFieldsResult> {
    const { appToken, tableId, viewId, pageSize, pageToken } = params
    const query: Record<string, string> = {}
    if (viewId) query.view_id = viewId
    if (pageSize) query.page_size = String(Math.min(pageSize, 100))
    if (pageToken) query.page_token = pageToken

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
        undefined,
        query,
      )
      const data = (response.data ?? {}) as Record<string, unknown>
      const rawItems = (data.items as Record<string, unknown>[] | undefined) ?? []
      return {
        items: rawItems.map(toFieldSummary),
        hasMore: Boolean(data.has_more),
        nextPageToken: data.page_token as string | undefined,
        total: data.total as number | undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('列出多维表格字段失败', error)
    }
  }
}

function toTableSummary(item: Record<string, unknown>): LarkBitableTableSummary {
  return {
    tableId: (item.table_id as string) ?? '',
    name: item.name as string | undefined,
    revision: item.revision as number | undefined,
  }
}

function toFieldSummary(item: Record<string, unknown>): LarkBitableFieldSummary {
  const desc = item.description as Record<string, unknown> | undefined
  return {
    fieldId: (item.field_id as string) ?? '',
    fieldName: (item.field_name as string) ?? '',
    type: (item.type as number) ?? 0,
    uiType: item.ui_type as string | undefined,
    isPrimary: item.is_primary as boolean | undefined,
    description: desc?.text as string | undefined,
  }
}
