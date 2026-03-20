import { LarkApiClient } from '../../client/request.js'
import { LarkDriveService } from '../drive/service.js'
import { selectSessionAttachmentCandidate } from './context.js'
import {
  ensureNonEmptyString,
  wrapDomainError,
} from '../../shared/errors.js'
import { extractTextLikeContent } from './extractors.js'
import type {
  LarkDownloadFileParams,
  LarkDownloadFileResult,
  LarkReadMessageAttachmentParams,
  LarkReadMessageAttachmentResult,
  LarkReadFileContentParams,
  LarkReadFileContentResult,
  LarkReadSessionAttachmentParams,
} from '../../shared/types.js'

export class LarkFilesService {
  constructor(
    private readonly client: LarkApiClient,
    private readonly drive: LarkDriveService,
  ) {}

  isAvailable() {
    return true
  }

  async download(params: LarkDownloadFileParams): Promise<LarkDownloadFileResult> {
    const fileToken = ensureNonEmptyString(params.fileToken, 'fileToken')

    try {
      const data = await this.client.requestBinary(
        `/open-apis/drive/v1/files/${encodeURIComponent(fileToken)}/download`,
      )

      return {
        fileToken,
        data,
        sizeBytes: data.byteLength,
      }
    } catch (error) {
      throw wrapDomainError('下载文件失败', error)
    }
  }

  async readContent(params: LarkReadFileContentParams): Promise<LarkReadFileContentResult> {
    const fileToken = ensureNonEmptyString(params.fileToken, 'fileToken')

    try {
      const meta = await this.drive.getMeta({
        token: fileToken,
        type: 'file',
      }).catch(() => null)

      const fileName = params.fileName?.trim() || meta?.title
      const mimeType = params.mimeType?.trim()
      const downloaded = await this.download({ fileToken })
      const extracted = extractTextLikeContent(downloaded.data, fileName, mimeType)

      return {
        fileToken,
        fileName,
        mimeType: extracted.mimeType,
        extension: extracted.extension,
        sizeBytes: downloaded.sizeBytes,
        title: meta?.title,
        url: meta?.url,
        text: extracted.text,
        raw: {
          meta,
        },
      }
    } catch (error) {
      throw wrapDomainError('读取文件内容失败', error)
    }
  }

  async downloadMessageAttachment(params: LarkReadMessageAttachmentParams): Promise<LarkDownloadFileResult> {
    const messageId = ensureNonEmptyString(params.messageId, 'messageId')
    const fileKey = ensureNonEmptyString(params.fileKey, 'fileKey')

    try {
      const data = await this.client.requestBinary(
        `/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(fileKey)}`,
        {
          type: 'file',
        },
      )

      return {
        fileToken: fileKey,
        data,
        sizeBytes: data.byteLength,
      }
    } catch (error) {
      throw wrapDomainError('下载消息附件失败', error)
    }
  }

  async readMessageAttachment(params: LarkReadMessageAttachmentParams): Promise<LarkReadMessageAttachmentResult> {
    const messageId = ensureNonEmptyString(params.messageId, 'messageId')
    const fileKey = ensureNonEmptyString(params.fileKey, 'fileKey')

    try {
      const downloaded = await this.downloadMessageAttachment({
        messageId,
        fileKey,
        fileName: params.fileName,
        mimeType: params.mimeType,
      })
      const extracted = extractTextLikeContent(downloaded.data, params.fileName, params.mimeType)

      return {
        messageId,
        fileKey,
        fileName: params.fileName?.trim() || undefined,
        mimeType: extracted.mimeType,
        extension: extracted.extension,
        sizeBytes: downloaded.sizeBytes,
        text: extracted.text,
      }
    } catch (error) {
      throw wrapDomainError('读取消息附件内容失败', error)
    }
  }

  async readSessionAttachment(params: LarkReadSessionAttachmentParams): Promise<LarkReadMessageAttachmentResult> {
    const candidate = selectSessionAttachmentCandidate(params.session, params.target ?? 'auto')
    const result = await this.readMessageAttachment({
      messageId: candidate.messageId,
      fileKey: candidate.fileKey,
      fileName: params.fileName,
      mimeType: params.mimeType,
    })

    return {
      ...result,
      contextSource: candidate.source,
    }
  }
}
