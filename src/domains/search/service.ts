import { LarkApiClient } from '../../client/request.js'
import {
  ensureNonEmptyString,
  wrapDomainError,
} from '../../shared/errors.js'
import type {
  LarkSearchDocsParams,
  LarkSearchDocsResult,
  LarkSearchDocumentSummary,
} from '../../shared/types.js'

export class LarkSearchService {
  constructor(private readonly client: LarkApiClient) {}

  isAvailable() {
    return true
  }

  async searchDocs(params: LarkSearchDocsParams): Promise<LarkSearchDocsResult> {
    const searchKey = ensureNonEmptyString(params.searchKey, 'searchKey')
    const count = typeof params.count === 'number' && params.count > 0
      ? Math.min(Math.floor(params.count), 50)
      : 10
    const offset = typeof params.offset === 'number' && params.offset >= 0
      ? Math.floor(params.offset)
      : 0

    try {
      const response = await this.client.requestOrThrow<{
        docs_entities?: Array<Record<string, unknown>>
        total?: number
        has_more?: boolean
      }>(
        'POST',
        '/open-apis/suite/docs-api/search/object',
        {
          search_key: searchKey,
          count,
          offset,
          owner_ids: sanitizeStringArray(params.ownerIds),
          chat_ids: sanitizeStringArray(params.chatIds),
          docs_types: sanitizeStringArray(params.docsTypes),
        },
      )

      const items = (response.data?.docs_entities ?? []).map(toSearchDocumentSummary)
      const total = typeof response.data?.total === 'number' ? response.data.total : undefined
      const hasMore = typeof response.data?.has_more === 'boolean'
        ? response.data.has_more
        : (typeof total === 'number' ? offset + items.length < total : items.length >= count)

      return {
        searchKey,
        count,
        offset,
        items,
        total,
        hasMore,
        nextOffset: hasMore ? offset + items.length : undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('搜索飞书文档失败', error)
    }
  }
}

function sanitizeStringArray(input?: string[]) {
  const items = input
    ?.map(item => item?.trim())
    .filter((item): item is string => Boolean(item))
  return items?.length ? items : undefined
}

function toSearchDocumentSummary(entity: Record<string, unknown>): LarkSearchDocumentSummary {
  return {
    docsToken: takeString(entity.docs_token),
    docsType: takeString(entity.docs_type),
    title: takeString(entity.title),
    ownerId: takeString(entity.owner_id),
    url: takeString(entity.url),
    raw: entity,
  }
}

function takeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
