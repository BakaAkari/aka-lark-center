import { LarkApiClient } from '../../client/request.js'
import { createValidationError, ensureNonEmptyString, wrapDomainError } from '../../shared/errors.js'
import { parseLarkDocumentReference } from '../../shared/resource-ref.js'
import { truncateResourceContent } from '../../shared/resource-context.js'
import type {
  LarkDocxRawContentData,
  LarkReadDocumentContentParams,
  LarkReadDocumentContentResult,
  LarkReadDocumentContextParams,
  LarkResolvedDocumentTarget,
  LarkResourceContext,
} from '../../shared/types.js'
import type { LarkDriveService } from '../drive/service.js'
import type { LarkWikiService } from '../wiki/service.js'

export class LarkResourceService {
  constructor(
    private readonly client: LarkApiClient,
    private readonly drive: LarkDriveService,
    private readonly wiki: LarkWikiService,
  ) {}

  async resolveDocumentTarget(documentRef: string): Promise<LarkResolvedDocumentTarget> {
    const input = ensureNonEmptyString(documentRef, 'documentRef')

    try {
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
        }
      }

      return {
        documentId: reference.token,
        documentType: reference.kind === 'doc' ? 'doc' : 'docx',
        sourceRef: reference.sourceRef,
        sourceType: reference.kind,
      }
    } catch (error) {
      throw wrapDomainError('解析飞书文档资源失败', error)
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
}
