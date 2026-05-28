import { createHash } from 'crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, chmodSync } from 'fs'
import { get, request } from 'https'
import { resolve } from 'path'
import { spawn } from 'child_process'
import {
  CLI_VERSION,
  CLI_BINARY_NAME,
  CLI_REPO,
  CLI_DEFAULT_MIRROR,
  PLATFORM_MAP,
  ARCH_MAP,
  CLI_CHECKSUMS,
} from '../shared/constants.js'
import { createCliExecutionError } from '../shared/errors.js'

export interface InstallOptions {
  baseDir: string
  logger?: { info: (msg: string, meta?: object) => void; warn: (msg: string, meta?: object) => void; error: (msg: string, meta?: object) => void }
}

export interface InstallResult {
  binaryPath: string
  installed: boolean
  version: string
}

function getPlatformArch(): { platform: string; arch: string } {
  const platform = PLATFORM_MAP[process.platform]
  const arch = ARCH_MAP[process.arch]
  if (!platform || !arch) {
    throw new Error(`Unsupported platform/arch: ${process.platform}-${process.arch}`)
  }
  return { platform, arch }
}

function getArchiveName(): string {
  const { platform, arch } = getPlatformArch()
  const ext = process.platform === 'win32' ? '.zip' : '.tar.gz'
  return `${CLI_BINARY_NAME}-${CLI_VERSION}-${platform}-${arch}${ext}`
}

function resolveDownloadUrls(archiveName: string): string[] {
  const urls: string[] = []

  // GitHub releases (primary)
  urls.push(`https://github.com/${CLI_REPO}/releases/download/v${CLI_VERSION}/${archiveName}`)

  // npm mirror fallback
  const binaryPath = `/-/binary/lark-cli/v${CLI_VERSION}/${archiveName}`
  urls.push(`${CLI_DEFAULT_MIRROR.replace(/\/+$/, '')}${binaryPath}`)

  // Optional: user-configured corporate registry (not implemented here; mirrors npm_config_registry logic)
  const registry = (process.env.npm_config_registry || '').trim()
  if (registry && !isDefaultNpmjsRegistry(registry)) {
    try {
      const base = new URL(registry)
      const mirrorUrl = `${base.origin}${base.pathname.replace(/\/+$/, '')}${binaryPath}`
      if (!urls.includes(mirrorUrl)) urls.push(mirrorUrl)
    } catch {
      // ignore malformed registry
    }
  }

  return urls
}

function isDefaultNpmjsRegistry(url: string): boolean {
  try {
    return new URL(url).hostname === 'registry.npmjs.org'
  } catch {
    return false
  }
}

function httpsGet(url: string, timeoutMs = 120_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const req = get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect (up to 3 levels handled by recursion depth naturally limited by caller)
        httpsGet(res.headers.location, timeoutMs).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Request timeout for ${url}`))
    })
  })
}

function sha256File(filePath: string): string {
  const hash = createHash('sha256')
  const fd = readFileSync(filePath)
  hash.update(fd)
  return hash.digest('hex')
}

function getEmbeddedChecksum(archiveName: string): string | null {
  return CLI_CHECKSUMS[archiveName] ?? null
}

function getFileChecksum(archiveName: string, checksumsPath: string): string | null {
  if (!existsSync(checksumsPath)) return null
  const content = readFileSync(checksumsPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf('  ')
    if (idx === -1) continue
    const hash = trimmed.slice(0, idx)
    const name = trimmed.slice(idx + 2)
    if (name === archiveName) return hash.toLowerCase()
  }
  return null
}

function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archivePath, '-C', destDir], {
      stdio: 'ignore',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`tar exited with code ${code}`))
      else resolve()
    })
  })
}

function extractZip(archivePath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Prefer tar on Windows (Git Bash / modern Windows tar available)
    // Fallback to PowerShell Expand-Archive if tar not available
    const tryTar = spawn('tar', ['-xf', archivePath, '-C', destDir], { stdio: 'ignore' })
    tryTar.on('error', () => {
      const ps = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          `Expand-Archive -LiteralPath "${archivePath}" -DestinationPath "${destDir}" -Force`,
        ],
        { stdio: 'ignore' },
      )
      ps.on('error', reject)
      ps.on('close', (code) => {
        if (code !== 0) reject(new Error(`Expand-Archive exited with code ${code}`))
        else resolve()
      })
    })
    tryTar.on('close', (code) => {
      if (code === 0) resolve()
      // if tar failed, the error handler above will trigger Expand-Archive
    })
  })
}

export async function ensureInstalled(options: InstallOptions): Promise<InstallResult> {
  const binDir = resolve(options.baseDir, 'lark-cli', 'bin')
  const binaryName = CLI_BINARY_NAME + (process.platform === 'win32' ? '.exe' : '')
  const binaryPath = resolve(binDir, binaryName)

  if (existsSync(binaryPath)) {
    return { binaryPath, installed: false, version: CLI_VERSION }
  }

  const log = options.logger
  log?.info('lark-cli binary not found, starting download', { binDir, version: CLI_VERSION })

  mkdirSync(binDir, { recursive: true })

  const archiveName = getArchiveName()
  const tmpDir = resolve(options.baseDir, 'lark-cli', 'tmp-' + Date.now())
  mkdirSync(tmpDir, { recursive: true })

  const archivePath = resolve(tmpDir, archiveName)
  const urls = resolveDownloadUrls(archiveName)

  let downloaded = false
  let lastErr: Error | undefined

  for (const url of urls) {
    try {
      log?.info('downloading lark-cli binary', { url })
      const data = await httpsGet(url)
      const stream = createWriteStream(archivePath)
      await new Promise<void>((resolve, reject) => {
        stream.write(data, (err) => {
          if (err) reject(err)
          else {
            stream.end()
            stream.on('finish', resolve)
            stream.on('error', reject)
          }
        })
      })
      downloaded = true
      log?.info('download success', { url, bytes: data.length })
      break
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      log?.warn('download failed, trying next mirror', { url, error: lastErr.message })
    }
  }

  if (!downloaded) {
    throw createCliExecutionError(
      `Failed to download lark-cli binary from all mirrors. Last error: ${lastErr?.message}`,
    )
  }

  // Checksum verification (best-effort)
  try {
    let expected = getEmbeddedChecksum(archiveName)
    if (!expected) {
      // Fallback to file on disk for local / unpackaged environments
      const checksumsPath = resolve(__dirname, '..', '..', 'src', 'cli', 'checksums.txt')
      expected = getFileChecksum(archiveName, checksumsPath)
    }
    if (expected) {
      const actual = sha256File(archivePath).toLowerCase()
      if (actual !== expected) {
        throw createCliExecutionError(
          `Checksum mismatch for ${archiveName}: expected ${expected} but got ${actual}`,
        )
      }
      log?.info('checksum verified', { archiveName })
    } else {
      log?.warn('checksum data not available, skipping verification', { archiveName })
    }
  } catch (e) {
    log?.warn('checksum verification error', { error: (e as Error).message })
  }

  // Extract
  try {
    if (process.platform === 'win32') {
      await extractZip(archivePath, tmpDir)
    } else {
      await extractTarGz(archivePath, tmpDir)
    }
    log?.info('extraction complete', { tmpDir })
  } catch (e) {
    throw createCliExecutionError(`Failed to extract ${archiveName}: ${(e as Error).message}`)
  }

  // Move binary into place
  const extractedBinary = resolve(tmpDir, binaryName)
  if (!existsSync(extractedBinary)) {
    throw createCliExecutionError(`Binary not found after extraction: ${extractedBinary}`)
  }

  // Use copy instead of rename for cross-device safety (tmp may be on different fs)
  const { copyFileSync, rmSync } = await import('fs')
  copyFileSync(extractedBinary, binaryPath)
  chmodSync(binaryPath, 0o755)
  rmSync(tmpDir, { recursive: true, force: true })

  log?.info('lark-cli installed', { binaryPath, version: CLI_VERSION })
  return { binaryPath, installed: true, version: CLI_VERSION }
}

export function resolveCliBinary(baseDir: string): string {
  const binDir = resolve(baseDir, 'lark-cli', 'bin')
  const binaryName = CLI_BINARY_NAME + (process.platform === 'win32' ? '.exe' : '')
  return resolve(binDir, binaryName)
}
