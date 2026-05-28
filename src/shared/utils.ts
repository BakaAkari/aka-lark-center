export function maskToken(token: string | undefined): string {
  if (!token) return '***'
  if (token.length <= 8) return '***'
  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

export function normalizeBaseUrl(url?: string): string {
  if (!url) return 'https://open.feishu.cn'
  return url.replace(/\/$/, '')
}
