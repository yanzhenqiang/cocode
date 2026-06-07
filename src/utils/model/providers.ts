import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import {
  getTransportKindForRoute,
  resolveActiveRouteIdFromEnv,
} from '../../integrations/routeMetadata.js'
import { isEnvTruthy } from '../envUtils.js'

// Legacy provider categories that older model/status/runtime callers still
// consume. Descriptor route ids are the newer source of truth, but we keep
// this compatibility surface stable until later cleanup packets retire it.
export type LegacyAPIProvider =
  | 'firstParty'
  | 'openai'
  | 'ollama'

// Backward-compatible public alias. Keep importing APIProvider where callers
// intentionally consume the legacy category surface.
export type APIProvider = LegacyAPIProvider

export function getAPIProvider(): LegacyAPIProvider {
  const activeRouteId = resolveActiveRouteIdFromEnv(process.env)

  switch (activeRouteId) {
    case 'openai':
    case 'custom':
      return 'openai'
    case 'anthropic':
    default:
      if (
        activeRouteId &&
        activeRouteId !== 'anthropic' &&
        ['local', 'openai-compatible'].includes(
          getTransportKindForRoute(activeRouteId) ?? '',
        )
      ) {
        return 'openai'
      }

      return 'firstParty'
  }
}

export function usesAnthropicAccountFlow(): boolean {
  return getAPIProvider() === 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
