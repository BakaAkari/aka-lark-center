import { formatErrorMessage } from '../../shared/utils.js'
import { ensureNonEmptyString, wrapDomainError } from '../../shared/errors.js'
import type {
  LarkKnowledgeContextItem,
  LarkKnowledgeLookupParams,
  LarkKnowledgeLookupResult,
} from '../../shared/types.js'
import type { LarkResourceService } from '../resources/service.js'
import type { LarkSearchService } from '../search/service.js'

const READABLE_DOC_TYPES = new Set(['doc', 'docx', 'wiki'])

export class LarkKnowledgeService {
  constructor(
    private readonly search: LarkSearchService,
    private readonly resources: LarkResourceService,
  ) {}

  async lookup(params: LarkKnowledgeLookupParams): Promise<LarkKnowledgeLookupResult> {
    const query = ensureNonEmptyString(params.query, 'query')
    const readTopK = typeof params.readTopK === 'number' && params.readTopK > 0
      ? Math.min(Math.floor(params.readTopK), 5)
      : 1
    const docsTypes = normalizeReadableDocsTypes(params.docsTypes)

    try {
      const searchResult = await searchWithFallback(this.search, {
        searchKey: query,
        count: params.count,
        offset: params.offset,
        docsTypes,
        ownerIds: params.ownerIds,
        chatIds: params.chatIds,
      })

      const readableItems = searchResult.items
        .filter((item) => item.docsType && READABLE_DOC_TYPES.has(item.docsType))
        .slice(0, readTopK)

      const contexts: LarkKnowledgeContextItem[] = await Promise.all(readableItems.map(async (item) => {
        const documentRef = item.docsToken || item.url
        if (!documentRef) {
          return {
            docsToken: item.docsToken,
            docsType: item.docsType,
            title: item.title,
            url: item.url,
            content: '',
            truncated: false,
            contentLength: 0,
            readError: '搜索结果缺少可读取的 token 或 url。',
          }
        }

        try {
          const context = await this.resources.readDocumentContext({
            documentRef,
            maxContentLength: params.maxContentLength,
          })

          return {
            docsToken: item.docsToken || context.resolvedToken,
            docsType: item.docsType || context.resolvedType,
            title: item.title || context.title,
            url: item.url || context.url,
            content: context.content,
            truncated: context.truncated,
            contentLength: context.contentLength,
          }
        } catch (error) {
          return {
            docsToken: item.docsToken,
            docsType: item.docsType,
            title: item.title,
            url: item.url,
            content: '',
            truncated: false,
            contentLength: 0,
            readError: formatErrorMessage(error),
          }
        }
      }))

      return {
        query,
        items: searchResult.items,
        contexts,
        total: searchResult.total,
        hasMore: searchResult.hasMore,
        nextOffset: searchResult.nextOffset,
        raw: {
          search: searchResult.raw,
        },
      }
    } catch (error) {
      throw wrapDomainError('执行飞书知识检索失败', error)
    }
  }
}

async function searchWithFallback(
  search: LarkSearchService,
  params: {
    searchKey: string
    count?: number
    offset?: number
    docsTypes?: string[]
    ownerIds?: string[]
    chatIds?: string[]
  },
) {
  try {
    return await search.searchDocs(params)
  } catch (error) {
    if (!params.docsTypes?.length) {
      throw error
    }

    return search.searchDocs({
      ...params,
      docsTypes: undefined,
    })
  }
}

function normalizeReadableDocsTypes(input?: string[]) {
  const items = input
    ?.map(item => item?.trim().toLowerCase())
    .filter((item): item is string => Boolean(item) && READABLE_DOC_TYPES.has(item))

  return items?.length ? Array.from(new Set(items)) : undefined
}
