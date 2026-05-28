export const PLUGIN_NAME = 'aka-lark-center'
export const CHATLUNA_BRIDGE_PLATFORM_NAME = 'aka-lark-center-tools'

export const CLI_VERSION = '1.0.41'
export const CLI_BINARY_NAME = 'lark-cli'
export const CLI_REPO = 'larksuite/cli'
export const CLI_DEFAULT_MIRROR = 'https://registry.npmmirror.com'

export const PLATFORM_MAP: Record<string, string> = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows',
}

export const ARCH_MAP: Record<string, string> = {
  x64: 'amd64',
  arm64: 'arm64',
}

// Embedded checksums so that verification works even when checksums.txt is
// missing at runtime (e.g. tsup bundled output, flattened node_modules).
// Format: { archiveName: sha256hex }
export const CLI_CHECKSUMS: Record<string, string> = {
  'lark-cli-1.0.41-darwin-amd64.tar.gz': 'e3c09546b63cc84419df22671d8c940c0eeb17e2d0e6c64536e980553315fa49',
  'lark-cli-1.0.41-darwin-arm64.tar.gz': '5ed74939c3edb686957d7a56991a45a9c9c290b789079a4c6f12aa69527f7ca3',
  'lark-cli-1.0.41-linux-amd64.tar.gz': 'f2593ca0fa03fd085a050bc938b76808b42afb6c8d9f6dab6c9b995412b9c1c0',
  'lark-cli-1.0.41-linux-arm64.tar.gz': 'd6fadb7265327147e0fb608c35891fffc648c0fc40c4907b809ed18477c584a1',
  'lark-cli-1.0.41-windows-amd64.zip': 'b727a4430b98b9f6cb4eea4d89d7d36e4914400fb33d94e9d19832dd3b635364',
  'lark-cli-1.0.41-windows-arm64.zip': '6e3f4f2455f3e24fc43987f5f6d710150011341914e82e83084405e9c70b119e',
}
