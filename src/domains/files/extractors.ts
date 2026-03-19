import { createValidationError } from '../../shared/errors.js'

const TEXT_FILE_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'jsonl',
  'csv',
  'tsv',
  'yaml',
  'yml',
  'xml',
  'html',
  'htm',
  'log',
  'ini',
  'conf',
  'env',
  'sql',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'java',
  'kt',
  'go',
  'rs',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'sh',
  'bash',
  'zsh',
  'css',
  'scss',
  'less',
  'vue',
])

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/x-yaml',
  'application/yaml',
  'application/toml',
  'application/sql',
  'image/svg+xml',
])

export function extractTextLikeContent(
  bytes: ArrayBuffer,
  fileName?: string,
  mimeType?: string,
) {
  const normalizedMimeType = normalizeMimeType(mimeType)
  const extension = getFileExtension(fileName)
  const supported = isTextLikeFile(extension, normalizedMimeType)

  if (!supported) {
    throw createValidationError(
      `暂不支持读取该文件类型。当前仅支持文本类文件，收到 extension=${extension || 'unknown'} mime=${normalizedMimeType || 'unknown'}。`,
      { fileName, mimeType: normalizedMimeType, extension },
    )
  }

  const text = decodeUtf8(bytes)
  if (!text.trim()) {
    throw createValidationError('文件内容为空，或当前文件不适合按文本方式读取。', {
      fileName,
      mimeType: normalizedMimeType,
      extension,
    })
  }

  return {
    text,
    mimeType: normalizedMimeType || inferMimeTypeFromExtension(extension),
    extension,
  }
}

export function isTextLikeFile(extension?: string, mimeType?: string) {
  if (mimeType?.startsWith('text/')) return true
  if (mimeType && TEXT_MIME_TYPES.has(mimeType)) return true
  if (extension && TEXT_FILE_EXTENSIONS.has(extension)) return true
  return false
}

export function getFileExtension(fileName?: string) {
  if (!fileName) return undefined
  const normalized = fileName.trim().toLowerCase()
  const lastDotIndex = normalized.lastIndexOf('.')
  if (lastDotIndex < 0 || lastDotIndex === normalized.length - 1) return undefined
  return normalized.slice(lastDotIndex + 1)
}

export function inferMimeTypeFromExtension(extension?: string) {
  if (!extension) return undefined

  if (extension === 'json' || extension === 'jsonl') return 'application/json'
  if (extension === 'xml') return 'application/xml'
  if (extension === 'yaml' || extension === 'yml') return 'application/x-yaml'
  if (extension === 'csv') return 'text/csv'
  if (extension === 'tsv') return 'text/tab-separated-values'
  if (extension === 'md' || extension === 'markdown') return 'text/markdown'
  if (extension === 'html' || extension === 'htm') return 'text/html'
  return 'text/plain'
}

function normalizeMimeType(mimeType?: string) {
  if (!mimeType?.trim()) return undefined
  const [normalized] = mimeType.trim().toLowerCase().split(';', 1)
  return normalized || undefined
}

function decodeUtf8(bytes: ArrayBuffer) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))
  return text.replace(/^\uFEFF/, '')
}
