import type { Context } from 'koishi'
import { LarkApiClient } from '../../client/request.js'
import { LarkDriveService } from '../drive/service.js'
import { createValidationError, ensureNonEmptyString, wrapDomainError } from '../../shared/errors.js'
import { formatErrorMessage, normalizeDocumentContent, resolveDocumentContentType } from '../../shared/utils.js'
import type {
  DocumentContentType,
  LarkAppendDocumentContentParams,
  LarkAppendDocumentContentResult,
  LarkCreateDocumentParams,
  LarkCreateDocumentResult,
  LarkDeleteDocumentBlocksParams,
  LarkDeleteDocumentBlocksResult,
  LarkDocxBlock,
  LarkDocxBlockListData,
  LarkDocxBlockSummary,
  LarkDocxConvertData,
  LarkReadDocumentBlocksParams,
  LarkReadDocumentBlocksResult,
} from '../../shared/types.js'

export class LarkDocsService {
  constructor(
    private readonly client: LarkApiClient,
    private readonly drive: LarkDriveService,
    private readonly logger: ReturnType<Context['logger']>,
  ) {}

  async createDocument(params: LarkCreateDocumentParams): Promise<LarkCreateDocumentResult> {
    const title = ensureNonEmptyString(params.title, '文档标题')

    try {
      const response = await this.client.requestOrThrow<{
        document?: {
          document_id?: string
          revision_id?: number
          title?: string
        }
      }>('POST', '/open-apis/docx/v1/documents', {
        title,
        folder_token: params.folderToken?.trim() || undefined,
      })

      const documentId = response.data?.document?.document_id
      if (!documentId) {
        throw createValidationError('飞书未返回 document_id。')
      }

      const result: LarkCreateDocumentResult = {
        document: {
          documentId,
          revisionId: response.data?.document?.revision_id,
          title: response.data?.document?.title,
          url: await this.drive.getDocumentUrl(documentId).catch((error) => {
            this.logger.warn('failed to resolve docx url for %s: %s', documentId, formatErrorMessage(error))
            return undefined
          }),
        },
        appended: false,
        ownershipTransferred: false,
      }

      if (params.transferOwnership && params.ownerOpenId?.trim()) {
        const ownership = await this.drive.transferDocumentOwnership({
          documentId,
          ownerOpenId: params.ownerOpenId.trim(),
          retainedBotPermission: params.retainedBotPermission,
          stayPut: params.stayPut,
        })
        result.ownershipTransferred = true
        result.ownerOpenId = ownership.ownerOpenId
        result.retainedBotPermission = ownership.retainedBotPermission
      }

      if (params.content?.trim()) {
        await this.appendDocumentContent({
          documentId,
          content: params.content,
          contentType: params.contentType,
        })
        result.appended = true
      }

      return result
    } catch (error) {
      throw wrapDomainError('创建飞书文档失败', error)
    }
  }

  async appendDocumentContent(params: LarkAppendDocumentContentParams): Promise<LarkAppendDocumentContentResult> {
    const documentId = ensureNonEmptyString(params.documentId, 'documentId')
    const content = ensureNonEmptyString(params.content, '文档内容')
    const contentType = resolveDocumentContentType(params.contentType)
    if (!contentType) {
      throw createValidationError('contentType 非法，可选 plain_text/markdown/html。')
    }

    try {
      const parentBlockId = params.parentBlockId?.trim() || await this.getDocumentRootBlockId(documentId)
      const converted = await this.convertDocumentContent(content, contentType)

      const childBlockIds = converted.first_level_block_ids ?? []
      const blocks = converted.blocks ?? []
      if (!childBlockIds.length || !blocks.length) {
        throw createValidationError('飞书未返回可插入的文档块。')
      }

      const response = await this.client.requestOrThrow<{
        children?: LarkDocxBlock[]
        document_revision_id?: number
        client_token?: string
        block_id_relations?: Array<{ temporary_block_id?: string, block_id?: string }>
      }>(
        'POST',
        `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks/${encodeURIComponent(parentBlockId)}/descendant`,
        {
          children_id: childBlockIds,
          descendants: blocks,
          index: typeof params.index === 'number' && params.index >= 0 ? params.index : undefined,
        },
      )

      return {
        documentId,
        parentBlockId,
        blockCount: childBlockIds.length,
        childBlockIds,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('追加飞书文档内容失败', error)
    }
  }
  async readDocumentBlocks(params: LarkReadDocumentBlocksParams): Promise<LarkReadDocumentBlocksResult> {
    const documentId = ensureNonEmptyString(params.documentId, 'documentId')
    const pageSize = typeof params.pageSize === 'number' && params.pageSize > 0
      ? Math.min(Math.floor(params.pageSize), 200)
      : 50

    try {
      const response = await this.client.requestOrThrow<LarkDocxBlockListData>(
        'GET',
        `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks`,
        undefined,
        {
          page_size: String(pageSize),
          page_token: params.pageToken?.trim() || undefined,
        },
      )

      const items = (response.data?.items ?? []).map(toBlockSummary)
      return {
        documentId,
        items,
        hasMore: Boolean(response.data?.has_more),
        nextPageToken: typeof response.data?.page_token === 'string' && response.data.page_token
          ? response.data.page_token
          : undefined,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('获取飞书文档块列表失败', error)
    }
  }

  async deleteDocumentBlocks(params: LarkDeleteDocumentBlocksParams): Promise<LarkDeleteDocumentBlocksResult> {
    const documentId = ensureNonEmptyString(params.documentId, 'documentId')
    const parentBlockId = ensureNonEmptyString(params.parentBlockId, 'parentBlockId')

    if (typeof params.startIndex !== 'number' || params.startIndex < 0) {
      throw createValidationError('startIndex 必须是非负整数。')
    }
    if (typeof params.endIndex !== 'number' || params.endIndex <= params.startIndex) {
      throw createValidationError('endIndex 必须大于 startIndex。')
    }

    try {
      const response = await this.client.requestOrThrow<Record<string, unknown>>(
        'DELETE',
        `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks/${encodeURIComponent(parentBlockId)}/children/batch_delete`,
        {
          start_index: params.startIndex,
          end_index: params.endIndex,
        },
      )

      return {
        documentId,
        parentBlockId,
        startIndex: params.startIndex,
        endIndex: params.endIndex,
        raw: response,
      }
    } catch (error) {
      throw wrapDomainError('删除飞书文档块失败', error)
    }
  }

  private async convertDocumentContent(content: string, contentType: DocumentContentType) {
    const convertedContent = normalizeDocumentContent(content, contentType)
    const response = await this.client.requestOrThrow<LarkDocxConvertData>(
      'POST',
      '/open-apis/docx/v1/documents/blocks/convert',
      convertedContent,
    )
    return response.data ?? {}
  }

  private async getDocumentRootBlockId(documentId: string) {
    const response = await this.client.requestOrThrow<LarkDocxBlockListData>(
      'GET',
      `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks`,
      undefined,
      { page_size: '50' },
    )

    const items = response.data?.items ?? []
    const rootBlock = items.find(block => block.block_type === 1) ?? items.find(block => !block.parent_id)
    if (!rootBlock?.block_id) {
      throw createValidationError('无法定位文档根块，请手动提供 parentBlockId。')
    }

    return rootBlock.block_id
  }
}

function toBlockSummary(block: LarkDocxBlock): LarkDocxBlockSummary {
  // Extract plain text from text block elements if present
  let text: string | undefined
  const textContent = block.text as { elements?: Array<{ text_run?: { content?: string } }> } | undefined
  if (textContent?.elements) {
    const parts = textContent.elements
      .map(el => el.text_run?.content ?? '')
      .filter(Boolean)
    if (parts.length) text = parts.join('')
  }

  return {
    blockId: block.block_id ?? '',
    parentId: typeof block.parent_id === 'string' ? block.parent_id : undefined,
    blockType: typeof block.block_type === 'number' ? block.block_type : 0,
    children: Array.isArray(block.children) ? block.children as string[] : undefined,
    text,
    raw: block,
  }
}
