import type { Context } from 'koishi'
import { LarkApiClient } from '../../client/request.js'
import { LarkDriveService } from '../drive/service.js'
import { LarkWikiService } from '../wiki/service.js'
import { createValidationError, ensureNonEmptyString, wrapDomainError } from '../../shared/errors.js'
import { parseLarkDocumentReference } from '../../shared/resource-ref.js'
import { truncateResourceContent } from '../../shared/resource-context.js'
import { formatErrorMessage, normalizeDocumentContent, resolveDocumentContentType } from '../../shared/utils.js'
import type {
  DocumentContentType,
  LarkAppendDocumentContentParams,
  LarkAppendDocumentContentResult,
  LarkCreateDocumentParams,
  LarkCreateDocumentResult,
  LarkDocxBlock,
  LarkDocxBlockListData,
  LarkDocxConvertData,
  LarkDocxRawContentData,
  LarkResourceContext,
  LarkReadDocumentContentParams,
  LarkReadDocumentContextParams,
  LarkReadDocumentContentResult,
} from '../../shared/types.js'

export class LarkDocsService {
  constructor(
    private readonly client: LarkApiClient,
    private readonly drive: LarkDriveService,
    private readonly wiki: LarkWikiService,
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

  async readDocumentContent(params: LarkReadDocumentContentParams): Promise<LarkReadDocumentContentResult> {
    const documentRef = ensureNonEmptyString(params.documentId, 'documentId')

    try {
      const resolved = await this.resolveDocumentTarget(documentRef)
      const [response, meta] = await Promise.all([
        this.readRawContent(resolved.documentType, resolved.documentId),
        this.drive.getMeta({
          token: resolved.documentId,
          type: resolved.documentType,
        }).catch(() => null),
      ])

      return {
        documentId: resolved.documentId,
        documentType: resolved.documentType,
        sourceRef: resolved.sourceRef,
        sourceType: resolved.sourceType,
        title: meta?.title || resolved.title,
        url: meta?.url || resolved.url,
        content: typeof response.data?.content === 'string' ? response.data.content : '',
        raw: {
          response,
          resolved,
        },
      }
    } catch (error) {
      throw wrapDomainError('读取飞书文档内容失败', error)
    }
  }

  async readDocumentContext(params: LarkReadDocumentContextParams): Promise<LarkResourceContext> {
    const documentRef = ensureNonEmptyString(params.documentRef, 'documentRef')

    try {
      const result = await this.readDocumentContent({ documentId: documentRef })
      const truncated = truncateResourceContent(result.content, params.maxContentLength)

      return {
        type: result.sourceType,
        sourceRef: result.sourceRef,
        resolvedToken: result.documentId,
        resolvedType: result.documentType,
        title: result.title,
        url: result.url,
        content: truncated.content,
        truncated: truncated.truncated,
        contentLength: truncated.contentLength,
        permissionState: 'granted',
        raw: result.raw,
      }
    } catch (error) {
      throw wrapDomainError('构建飞书文档上下文失败', error)
    }
  }

  private async readRawContent(documentType: 'doc' | 'docx', documentId: string) {
    if (documentType === 'doc') {
      return this.client.requestOrThrow<LarkDocxRawContentData>(
        'GET',
        `/open-apis/doc/v2/${encodeURIComponent(documentId)}/raw_content`,
      )
    }

    return this.client.requestOrThrow<LarkDocxRawContentData>(
      'GET',
      `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`,
    )
  }

  private async resolveDocumentTarget(input: string) {
    const reference = parseLarkDocumentReference(input)
    if (reference.kind === 'wiki') {
      const node = await this.wiki.getNode({ token: reference.token })
      if (!node.objToken || !node.objType) {
        throw createValidationError('该 wiki 节点未返回可读取的真实文档 token。', {
          token: reference.token,
        })
      }

      if (node.objType !== 'doc' && node.objType !== 'docx') {
        throw createValidationError(
          `当前 wiki 节点映射到 ${node.objType} 资源，lark.read.doc 目前只支持 doc/docx。请先用 wiki 查询命令确认目标类型。`,
          {
            token: reference.token,
            objType: node.objType,
            objToken: node.objToken,
          },
        )
      }

      return {
        documentId: node.objToken,
        documentType: node.objType,
        sourceRef: reference.sourceRef,
        sourceType: reference.kind,
        title: node.title,
        url: node.url,
      } as const
    }

    return {
      documentId: reference.token,
      documentType: reference.kind === 'doc' ? 'doc' : 'docx',
      sourceRef: reference.sourceRef,
      sourceType: reference.kind,
    } as const
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
