import type {
  GatewayDescriptor,
  TransportKind,
  ValidationRoutingMetadata,
  VendorDescriptor,
} from './descriptors.js'
import {
  ensureIntegrationsLoaded,
  getAllGateways,
  getAllVendors,
  getGateway,
  getVendor,
  resolveProfileRoute,
} from './index.js'
import { isEnvTruthy } from '../utils/envUtils.js'

export type RouteDescriptor = GatewayDescriptor | VendorDescriptor

const TRANSPORT_KIND_PROVIDER_TYPE_LABELS: Partial<
  Record<TransportKind, string>
> = {
  'anthropic-native': 'Anthropic native API',
  'anthropic-proxy': 'Anthropic-compatible API',
  local: 'OpenAI-compatible API',
  'openai-compatible': 'OpenAI-compatible API',
}

function getValidationRoutingHosts(
  descriptor: RouteDescriptor,
): string[] {
  const routing = descriptor.validation?.routing as
    | ValidationRoutingMetadata
    | undefined
  return routing?.matchBaseUrlHosts ?? []
}

function normalizeComparableBaseUrl(
  baseUrl?: string,
): string | null {
  if (!baseUrl?.trim()) {
    return null
  }

  try {
    const parsed = new URL(baseUrl)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '').toLowerCase()
  } catch {
    return baseUrl.trim().replace(/\/+$/, '').toLowerCase() || null
  }
}

function normalizeHost(
  baseUrl?: string,
): string | null {
  if (!baseUrl?.trim()) {
    return null
  }

  try {
    return new URL(baseUrl).hostname.toLowerCase()
  } catch {
    return null
  }
}

function getAllRoutes(): RouteDescriptor[] {
  ensureIntegrationsLoaded()
  return [...getAllGateways(), ...getAllVendors()]
}

function resolveKnownLocalRouteIdFromBaseUrl(baseUrl?: string): string | null {
  if (!baseUrl) {
    return null
  }

  try {
    const parsed = new URL(baseUrl)
    const host = parsed.host.toLowerCase()
    const hostname = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    const haystack = `${hostname} ${path}`

    if (host.endsWith(':11434') || haystack.includes('ollama')) {
      return 'ollama'
    }
    if (
      host.endsWith(':1234') ||
      haystack.includes('lmstudio') ||
      haystack.includes('lm-studio')
    ) {
      return 'lmstudio'
    }
  } catch {
    return null
  }

  return null
}

export function getRouteDescriptor(
  routeId: string,
): RouteDescriptor | null {
  ensureIntegrationsLoaded()
  return getGateway(routeId) ?? getVendor(routeId) ?? null
}

export function getRouteLabel(
  routeId: string,
): string | null {
  return getRouteDescriptor(routeId)?.label ?? null
}

export function getRouteDefaultBaseUrl(
  routeId: string,
): string | undefined {
  return getRouteDescriptor(routeId)?.defaultBaseUrl
}

export function getRouteDefaultModel(
  routeId: string,
): string | undefined {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return undefined
  }

  if ('defaultModel' in descriptor && descriptor.defaultModel) {
    return descriptor.defaultModel
  }

  const catalogModels = descriptor.catalog?.models ?? []
  const defaultEntry =
    catalogModels.find(model => model.default) ?? catalogModels[0]

  return defaultEntry?.apiName
}

function uniqueEnvVars(envVars: Iterable<string>): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const envVar of envVars) {
    const trimmed = envVar.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }

    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

function readFirstNonEmptyEnvValue(
  processEnv: NodeJS.ProcessEnv,
  envVars: readonly string[],
): string | undefined {
  for (const envVar of envVars) {
    const value = processEnv[envVar]?.trim()
    if (value) {
      return value
    }
  }

  return undefined
}

export function getRouteCredentialEnvVars(
  routeId: string,
): string[] {
  if (routeId === 'custom') {
    return ['OPENAI_API_KEY']
  }

  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return []
  }

  const envVars = [...(descriptor.setup.credentialEnvVars ?? [])]
  if (
    (descriptor.transportConfig.kind === 'openai-compatible' ||
      descriptor.transportConfig.kind === 'local') &&
    !envVars.includes('OPENAI_API_KEY')
  ) {
    envVars.push('OPENAI_API_KEY')
  }

  return uniqueEnvVars(envVars)
}

export function getRouteCredentialValue(
  routeId: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return readFirstNonEmptyEnvValue(
    processEnv,
    getRouteCredentialEnvVars(routeId),
  )
}

export function resolveRouteCredentialValue(
  options?: {
    routeId?: string | null
    baseUrl?: string
    processEnv?: NodeJS.ProcessEnv
    activeProfileProvider?: string
  },
): string | undefined {
  const processEnv = options?.processEnv ?? process.env
  const routeId =
    options?.routeId ??
    resolveActiveRouteIdFromEnv(processEnv, {
      activeProfileProvider: options?.activeProfileProvider,
    }) ??
    resolveRouteIdFromBaseUrl(options?.baseUrl) ??
    (options?.baseUrl ? 'custom' : null)

  if (!routeId || routeId === 'anthropic') {
    return undefined
  }

  return getRouteCredentialValue(routeId, processEnv)
}

export function routeSupportsCustomHeaders(
  routeId: string,
): boolean {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return false
  }

  return descriptor.transportConfig.openaiShim?.supportsAuthHeaders === true
}

export function routeShowsAuthHeaderValue(routeId: string): boolean {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return false
  }

  return (
    descriptor.transportConfig.openaiShim?.supportsAuthHeaders === true &&
    descriptor.transportConfig.openaiShim?.ui?.showAuthHeaderValue !== false
  )
}

export function routeShowsAuthHeader(routeId: string): boolean {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return false
  }

  return (
    descriptor.transportConfig.openaiShim?.supportsAuthHeaders === true &&
    descriptor.transportConfig.openaiShim?.ui?.showAuthHeader !== false
  )
}

export function routeShowsCustomHeaders(routeId: string): boolean {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor) {
    return false
  }

  return (
    routeSupportsCustomHeaders(routeId) &&
    descriptor.transportConfig.openaiShim?.ui?.showCustomHeaders !== false
  )
}

function routeSupportsOpenAIShimOption(
  routeId: string,
  option: 'supportsApiFormatSelection' | 'supportsAuthHeaders',
): boolean {
  const descriptor = getRouteDescriptor(routeId)
  if (!descriptor || descriptor.transportConfig.kind !== 'openai-compatible') {
    return false
  }

  return descriptor.transportConfig.openaiShim?.[option] === true
}

export function routeSupportsApiFormatSelection(routeId: string): boolean {
  return routeSupportsOpenAIShimOption(routeId, 'supportsApiFormatSelection')
}

export function routeSupportsAuthHeaders(routeId: string): boolean {
  return routeSupportsOpenAIShimOption(routeId, 'supportsAuthHeaders')
}

export function getRouteProviderTypeLabel(
  routeId: string,
): string {
  const kind = getRouteDescriptor(routeId)?.transportConfig.kind
  return (
    (kind ? TRANSPORT_KIND_PROVIDER_TYPE_LABELS[kind] : undefined) ??
    'OpenAI-compatible API'
  )
}

export function resolveRouteIdFromBaseUrl(
  baseUrl?: string,
  options?: {
    requireDiscovery?: boolean
  },
): string | null {
  const normalizedBaseUrl = normalizeComparableBaseUrl(baseUrl)
  const normalizedHost = normalizeHost(baseUrl)
  if (!normalizedBaseUrl && !normalizedHost) {
    return null
  }

  const routes = getAllRoutes().filter(route =>
    options?.requireDiscovery ? Boolean(route.catalog?.discovery) : true,
  )

  for (const route of routes) {
    const normalizedDefaultBaseUrl = normalizeComparableBaseUrl(
      route.defaultBaseUrl,
    )
    if (
      normalizedBaseUrl &&
      normalizedDefaultBaseUrl === normalizedBaseUrl
    ) {
      return route.id
    }
  }

  if (normalizedHost) {
    for (const route of routes) {
      if (getValidationRoutingHosts(route).includes(normalizedHost)) {
        return route.id
      }
    }
  }

  const localRouteId = resolveKnownLocalRouteIdFromBaseUrl(baseUrl)
  if (localRouteId) {
    return localRouteId
  }

  return null
}

export function resolveActiveRouteIdFromEnv(
  _processEnv: NodeJS.ProcessEnv = process.env,
  _options?: {
    activeProfileProvider?: string
  },
): string | null {
  return 'anthropic'
}

export function getTransportKindForRoute(
  routeId: string,
): TransportKind | null {
  return getRouteDescriptor(routeId)?.transportConfig.kind ?? null
}
