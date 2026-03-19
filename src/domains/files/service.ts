import { LarkApiClient } from '../../client/request.js'
import { LarkDriveService } from '../drive/service.js'
import {
  ensureNonEmptyString,
  wrapDomainError,
} from '../../shared/errors.js'
import { extractTextLikeContent } from './extractors.js'
import type {
  LarkDownloadFileParams,
  LarkDownloadFileResult,
  LarkReadFileContentParams,
  LarkReadFileContentResult,
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
        text: extracted.text,
        raw: {
          meta,
        },
      }
    } catch (error) {
      throw wrapDomainError('读取文件内容失败', error)
    }
  }
}
