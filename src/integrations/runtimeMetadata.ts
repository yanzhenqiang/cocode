import type {
  ModelCatalogEntry,
} from './descriptors.js'
import { ensureIntegrationsLoaded } from './index.js'
import {
  getAllModels,
  getCatalogEntriesForRoute,
  getModel,
} from './registry.js'
import {
  getRouteDescriptor,
  resolveActiveRouteIdFromEnv,
  resolveRouteIdFromBaseUrl,
  type RouteDescriptor,
} from './routeMetadata.js'

function normalizeModelApiName(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

function matchesCatalogEntryModel(
  routeId: string,
  entry: ModelCatalogEntry,
  modelApiName: string,
): boolean {
  if (entry.apiName.trim().toLowerCase() === modelApiName) {
    return true
  }

  if (!entry.modelDescriptorId) {
    return false
  }

  const modelDescriptor = getModel(entry.modelDescriptorId)
  if (!modelDescriptor) {
    return false
  }

  if (modelDescriptor.defaultModel.trim().toLowerCase() === modelApiName) {
    return true
  }

  const providerMappedModel = modelDescriptor.providerModelMap?.[routeId]
  return providerMappedModel?.trim().toLowerCase() === modelApiName
}

function getCatalogEntryForModel(
  routeId: string,
  modelApiName: string | undefined,
): ModelCatalogEntry | null {
  const normalizedModel = normalizeModelApiName(modelApiName)
  if (!normalizedModel) {
    return null
  }

  ensureIntegrationsLoaded()
  const entries = getCatalogEntriesForRoute(routeId)
  return (
    entries.find(entry =>
      matchesCatalogEntryModel(routeId, entry, normalizedModel),
    ) ?? null
  )
}

export type ModelRuntimeLimits = {
  contextWindow?: number
  maxOutputTokens?: number
}

function getModelDescriptorForCatalogEntry(entry: ModelCatalogEntry | null) {
  if (!entry?.modelDescriptorId) {
    return null
  }

  return getModel(entry.modelDescriptorId) ?? null
}

function findModelDescriptorForApiName(
  routeId: string | null,
  modelApiName: string | undefined,
) {
  const trimmedModel = modelApiName?.trim()
  if (!trimmedModel) {
    return null
  }
  const normalizedModel = trimmedModel.toLowerCase()

  ensureIntegrationsLoaded()
  const models = getAllModels()
    .map(model => {
      const routeMappedModel = routeId
        ? model.providerModelMap?.[routeId]
        : undefined
      return {
        model,
        names: [
          model.id,
          model.defaultModel,
          routeMappedModel,
        ].filter((value): value is string => Boolean(value?.trim())),
      }
    })
    .sort((left, right) => {
      const leftLongest = Math.max(...left.names.map(name => name.length))
      const rightLongest = Math.max(...right.names.map(name => name.length))
      return rightLongest - leftLongest
    })

  for (const candidate of models) {
    if (candidate.names.some(name => trimmedModel === name.trim())) {
      return candidate.model
    }
  }

  for (const candidate of models) {
    if (candidate.names.some(name => trimmedModel.startsWith(name.trim()))) {
      return candidate.model
    }
  }

  for (const candidate of models) {
    if (
      candidate.names.some(name => {
        const normalizedName = name.trim().toLowerCase()
        return (
          normalizedModel === normalizedName ||
          normalizedModel.startsWith(normalizedName)
        )
      })
    ) {
      return candidate.model
    }
  }

  return null
}

function findCatalogEntryForApiName(
  routeId: string | null,
  modelApiName: string | undefined,
): ModelCatalogEntry | null {
  if (!routeId || routeId === 'anthropic') {
    return null
  }

  return getCatalogEntryForModel(routeId, modelApiName)
}

export function resolveModelRuntimeLimits(options: {
  model: string
  processEnv?: NodeJS.ProcessEnv
  baseUrl?: string
  activeProfileProvider?: string
}): ModelRuntimeLimits {
  const processEnv = options.processEnv ?? process.env
  const runtimeEnv: NodeJS.ProcessEnv = { ...processEnv }
  if (options.baseUrl !== undefined) {
    runtimeEnv.OPENAI_BASE_URL = options.baseUrl
  }

  const routeId = resolveActiveRouteIdFromEnv(runtimeEnv, {
    activeProfileProvider: options.activeProfileProvider,
  })
  const catalogEntry = findCatalogEntryForApiName(routeId, options.model)
  const modelDescriptor =
    getModelDescriptorForCatalogEntry(catalogEntry) ??
    findModelDescriptorForApiName(routeId, options.model)

  return {
    contextWindow:
      catalogEntry?.contextWindow ??
      modelDescriptor?.contextWindow,
    maxOutputTokens:
      catalogEntry?.maxOutputTokens ??
      modelDescriptor?.maxOutputTokens,
  }
}

export function usesAnthropicNativeMessageFormat(options?: {
  processEnv?: NodeJS.ProcessEnv
  model?: string
  activeProfileProvider?: string
  providerCategory?:
    | 'firstParty'
    | 'openai'
}): boolean {
  const processEnv = options?.processEnv ?? process.env
  const providerCategory = options?.providerCategory

  if (providerCategory === 'firstParty') {
    return true
  }

  if (providerCategory === 'openai') {
    return false
  }

  const routeId = resolveActiveRouteIdFromEnv(processEnv, {
    activeProfileProvider: options?.activeProfileProvider,
  })

  if (routeId === 'anthropic') {
    return true
  }

  return false
}
