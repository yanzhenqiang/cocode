// Stub: Codex OAuth shared utilities removed
export const CODEX_OAUTH_ISSUER = ''
export const CODEX_REFRESH_URL = ''
export const DEFAULT_CODEX_OAUTH_CLIENT_ID = ''
export const DEFAULT_CODEX_OAUTH_CALLBACK_PORT = 0
export const CODEX_OAUTH_SCOPE = ''
export const CODEX_OAUTH_ORIGINATOR = ''
export const CODEX_API_KEY_TOKEN_NAME = ''
export const CODEX_ID_TOKEN_SUBJECT_TYPE = ''
export const CODEX_TOKEN_EXCHANGE_GRANT = ''

export function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function getCodexOAuthClientId(): string { return '' }
export function getCodexOAuthCallbackPort(): number { return 0 }
export function escapeHtml(value: string): string { return value }
export function parseChatgptAccountId(_value?: string): string | undefined { return undefined }
export async function exchangeCodexIdTokenForApiKey(): Promise<never> { throw new Error('Codex OAuth removed') }
export function decodeJwtPayload(_token: string): any { return {} }
