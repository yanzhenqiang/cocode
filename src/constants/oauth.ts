/**
 * API and server configuration constants.
 * This file was historically the OAuth config module but has been simplified
 * to only provide the API endpoint config needed for non-OAuth operation.
 * MCP OAuth config (MCP_CLIENT_METADATA_URL) is retained.
 */

export const OAUTH_BETA_HEADER = 'oauth-2025-04-20' as const

type OauthConfig = {
  BASE_API_URL: string
  /** The claude.ai web origin */
  CLAUDE_AI_ORIGIN: string
  OAUTH_FILE_SUFFIX: string
  MCP_PROXY_URL: string
  MCP_PROXY_PATH: string
}

const PROD_OAUTH_CONFIG: OauthConfig = {
  BASE_API_URL: 'https://api.anthropic.com',
  CLAUDE_AI_ORIGIN: 'https://claude.ai',
  OAUTH_FILE_SUFFIX: '',
  MCP_PROXY_URL: 'https://mcp-proxy.anthropic.com',
  MCP_PROXY_PATH: '/v1/mcp/{server_id}',
}

/**
 * Client ID Metadata Document URL for MCP OAuth (CIMD / SEP-991).
 * When an MCP auth server advertises client_id_metadata_document_supported: true,
 * Claude Code uses this URL as its client_id instead of Dynamic Client Registration.
 * The URL must point to a JSON document hosted by Anthropic.
 * See: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00
 */
export const MCP_CLIENT_METADATA_URL =
  'https://claude.ai/oauth/claude-code-client-metadata'

export function fileSuffixForOauthConfig(): string {
  // OAuth file suffix is no longer configurable after Console OAuth removal
  return ''
}

// Default to prod config
export function getOauthConfig(): OauthConfig {
  return PROD_OAUTH_CONFIG
}
