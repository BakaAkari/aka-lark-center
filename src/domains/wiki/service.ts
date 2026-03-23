import { LarkApiClient } from '../../client/request.js'
import {
  ensureNonEmptyString,
  wrapDomainError,
} from '../../shared/errors.js'
import type {
  LarkGetWikiNodeParams,
  LarkGetWikiNodeResult,
  LarkListWikiNodesParams,
  LarkListWikiNodesResult,
  LarkListWikiSpacesParams,
  LarkListWikiSpacesResult,
  LarkWikiNodeSummary,
  LarkWikiSpaceSummary,
} from '../../shared/types.js'

export class LarkWikiService {
  constructor(private readonly client: LarkApiClient) {}

  isAvailable() {
    return true
  }

  async listSpaces(params: LarkListWikiSpacesParams = {}): Promise<LarkListWikiSpacesResult> {
    const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), 50)
      : 20

    try {
      const response = await this.client.requestOrThrow<{
        items?: Array<Record<string, unknown>>
        has_more?: boolean
        page_token?: string
      }>(
        'GET',
        '/open-apis/wiki/v2/spaces',
        undefined,
        {
          page_size: String(pageSize),
          page_token: params.pageToken,
        },
      )

      const items = (response.data?.items ?? []).map(toWikiSpaceSummary)
      return {
        items,
        hasMore: Boolean(response.data?.has_more),
        nextPageToken: takeString(response.data?.page_token),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取知识空间列表失败', error)
    }
  }

  async getNode(params: LarkGetWikiNodeParams): Promise<LarkGetWikiNodeResult> {
    const token = ensureNonEmptyString(params.token, 'token')

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        '/open-apis/wiki/v2/spaces/get_node',
        undefined,
        {
          token,
        },
      )

      const node = toWikiNodeSummary(asRecord(response.data?.node) ?? asRecord(response.data) ?? {})
      return {
        ...node,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取知识库节点信息失败', error)
    }
  }

  async listNodes(params: LarkListWikiNodesParams): Promise<LarkListWikiNodesResult> {
    const spaceId = ensureNonEmptyString(params.spaceId, 'spaceId')
    const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), 50)
      : 20

    try {
      const response = await this.client.requestOrThrow<{
        items?: Array<Record<string, unknown>>
        has_more?: boolean
        page_token?: string
      }>(
        'GET',
        `/open-apis/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes`,
        undefined,
        {
          parent_node_token: params.parentNodeToken?.trim() || undefined,
          page_size: String(pageSize),
          page_token: params.pageToken,
        },
      )

      return {
        spaceId,
        parentNodeToken: params.parentNodeToken?.trim() || undefined,
        items: (response.data?.items ?? []).map(toWikiNodeSummary),
        hasMore: Boolean(response.data?.has_more),
        nextPageToken: takeString(response.data?.page_token),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取知识库子节点列表失败', error)
    }
  }
}

function toWikiSpaceSummary(item: Record<string, unknown>): LarkWikiSpaceSummary {
  return {
    spaceId: takeString(item.space_id),
    name: takeString(item.name),
    description: takeString(item.description),
    raw: item,
  }
}

function toWikiNodeSummary(item: Record<string, unknown>): LarkWikiNodeSummary {
  return {
    spaceId: takeString(item.space_id),
    nodeToken: takeString(item.node_token),
    parentNodeToken: takeString(item.parent_node_token),
    objToken: takeString(item.obj_token),
    objType: takeString(item.obj_type),
    title: takeString(item.title) || takeString(item.obj_title),
    url: takeString(item.url),
    hasChild: typeof item.has_child === 'boolean' ? item.has_child : undefined,
    raw: item,
  }
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function takeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
