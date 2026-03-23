import { LarkApiClient } from '../../client/request.js'
import {
  createNotFoundError,
  ensureNonEmptyString,
  wrapDomainError,
} from '../../shared/errors.js'
import type {
  LarkBatchGetDriveMetasParams,
  LarkBatchGetDriveMetasResult,
  LarkDriveFileSummary,
  LarkDriveMeta,
  LarkDriveMetaResult,
  LarkDriveRootFolderResult,
  LarkDriveResourceType,
  LarkGetDriveMetaParams,
  LarkListDriveFilesParams,
  LarkListDriveFilesResult,
  LarkTransferDocumentOwnershipParams,
  LarkTransferDocumentOwnershipResult,
} from '../../shared/types.js'

export class LarkDriveService {
  constructor(private readonly client: LarkApiClient) {}

  async getRootFolderMeta(): Promise<LarkDriveRootFolderResult> {
    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'GET',
        '/open-apis/drive/explorer/v2/root_folder/meta',
      )

      const data = asRecord(response.data) ?? {}
      return {
        id: takeString(data.id),
        token: takeString(data.token),
        name: takeString(data.name),
        parentId: takeString(data.parent_id) || takeString(data.parentId),
        ownerId: takeString(data.owner_id) || takeString(data.ownUid) || takeString(data.createUid),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取我的空间根文件夹失败', error)
    }
  }

  async listFiles(params: LarkListDriveFilesParams = {}): Promise<LarkListDriveFilesResult> {
    const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), 200)
      : 20

    try {
      const folderToken = params.folderToken?.trim() || (await this.getRootFolderMeta()).token
      const response = await this.client.requestOrThrow<{
        files?: Array<Record<string, unknown>>
        items?: Array<Record<string, unknown>>
        has_more?: boolean
        next_page_token?: string
        page_token?: string
      }>(
        'GET',
        '/open-apis/drive/v1/files',
        undefined,
        {
          folder_token: folderToken,
          page_size: String(pageSize),
          page_token: params.pageToken?.trim() || undefined,
        },
      )

      const items = (response.data?.files ?? response.data?.items ?? []).map(toDriveFileSummary)
      return {
        folderToken,
        items,
        hasMore: Boolean(response.data?.has_more),
        nextPageToken: takeString(response.data?.next_page_token) || takeString(response.data?.page_token),
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取文件夹清单失败', error)
    }
  }

  async batchGetMetas(params: LarkBatchGetDriveMetasParams): Promise<LarkBatchGetDriveMetasResult> {
    const resources = params.resources
      .map((resource) => ({
        token: ensureNonEmptyString(resource.token, 'resource token'),
        type: resource.type ?? 'docx',
      }))

    if (!resources.length) {
      return {
        items: [],
        raw: { metas: [] },
      }
    }

    const response = await this.client.requestOrThrow<{
      metas?: LarkDriveMeta[]
      failed_list?: Array<{ token?: string, code?: number }>
    }>(
      'POST',
      '/open-apis/drive/v1/metas/batch_query',
      {
        request_docs: resources.map((resource) => ({
          doc_token: resource.token,
          doc_type: resource.type,
        })),
        with_url: true,
      },
    )

    const items: LarkDriveMetaResult[] = []
    for (const resource of resources) {
      const meta = this.toDriveMetaResult(resource.token, resource.type, response.data?.metas)
      if (meta) items.push(meta)
    }

    return {
      items,
      raw: response,
    }
  }

  async getMeta(params: LarkGetDriveMetaParams): Promise<LarkDriveMetaResult> {
    const token = ensureNonEmptyString(params.token, 'token')
    const type = params.type ?? 'docx'
    const result = await this.batchGetMetas({
      resources: [{ token, type }],
    })

    const meta = result.items.find((item) => item.token === token && item.type === type)
    if (!meta) {
      throw createNotFoundError('drive 资源', { token, type })
    }

    return meta
  }

  async getDocumentUrl(documentId: string) {
    const meta = await this.getMeta({
      token: documentId,
      type: 'docx',
    })

    if (!meta.url) {
      throw createNotFoundError('文档 url', { documentId })
    }

    return meta.url
  }

  async transferDocumentOwnership(params: LarkTransferDocumentOwnershipParams): Promise<LarkTransferDocumentOwnershipResult> {
    const documentId = ensureNonEmptyString(params.documentId, 'documentId')
    const ownerOpenId = ensureNonEmptyString(params.ownerOpenId, 'ownerOpenId')
    const retainedBotPermission = params.retainedBotPermission ?? 'edit'
    const stayPut = Boolean(params.stayPut)

    try {
      await this.client.requestOrThrow(
        'POST',
        `/open-apis/drive/v1/permissions/${encodeURIComponent(documentId)}/members/transfer_owner`,
        {
          member_type: 'openid',
          member_id: ownerOpenId,
        },
        {
          type: 'docx',
          remove_old_owner: 'false',
          old_owner_perm: retainedBotPermission,
          stay_put: String(stayPut),
        },
      )

      return {
        documentId,
        ownerOpenId,
        retainedBotPermission,
        stayPut,
        url: await this.getDocumentUrl(documentId).catch(() => undefined),
      }
    } catch (error) {
      throw wrapDomainError('转移文档 owner 失败', error)
    }
  }

  async grantDocumentCollaborator(documentId: string, collaboratorOpenId: string) {
    try {
      await this.client.requestOrThrow(
        'POST',
        `/open-apis/drive/v1/permissions/${encodeURIComponent(ensureNonEmptyString(documentId, 'documentId'))}/members`,
        {
          member_type: 'openid',
          member_id: ensureNonEmptyString(collaboratorOpenId, 'collaboratorOpenId'),
          perm: 'edit',
        },
        {
          type: 'docx',
          need_notification: 'false',
        },
      )
    } catch (error) {
      throw wrapDomainError('添加文档协作者失败', error)
    }
  }

  private toDriveMetaResult(
    token: string,
    type: LarkDriveResourceType,
    metas?: LarkDriveMeta[],
  ): LarkDriveMetaResult | null {
    const meta = metas?.find((item) => item.doc_token === token && item.doc_type === type)
      ?? metas?.find((item) => item.doc_token === token)
    if (!meta) return null

    return {
      token,
      type,
      title: meta.title,
      ownerId: meta.owner_id,
      url: meta.url,
      raw: meta,
    }
  }
}

function toDriveFileSummary(item: Record<string, unknown>): LarkDriveFileSummary {
  return {
    token: takeString(item.token) || takeString(item.file_token),
    type: resolveDriveResourceType(item.type) || resolveDriveResourceType(item.mime_type) || resolveDriveResourceType(item.file_type),
    name: takeString(item.name),
    parentToken: takeString(item.parent_token) || takeString(item.parentToken),
    url: takeString(item.url),
    ownerId: takeString(item.owner_id) || takeString(item.ownerId),
    raw: item,
  }
}

function resolveDriveResourceType(value: unknown): LarkDriveResourceType | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const normalized = value.trim() as LarkDriveResourceType
  return ['doc', 'docx', 'sheet', 'bitable', 'file', 'wiki', 'folder'].includes(normalized)
    ? normalized
    : undefined
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function takeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}
