import {
  getModelStrings as getModelStringsState,
  setModelStrings as setModelStringsState,
} from 'src/bootstrap/state.js'
import { getInitialSettings } from '../settings/settings.js'
import {
  CANONICAL_ID_TO_KEY,
  LEGACY_PROVIDER_MODEL_CONFIGS,
  type CanonicalModelId,
  type LegacyProviderModelConfig,
  type ModelKey,
} from './configs.js'
import { type LegacyAPIProvider, getAPIProvider } from './providers.js'

/**
 * Maps each model version to its provider-specific model ID string.
 * Derived from the legacy provider compatibility table — adding a model there
 * extends this type until descriptor-native callers fully replace it.
 */
export type ModelStrings = Record<ModelKey, string>

const MODEL_KEYS = Object.keys(LEGACY_PROVIDER_MODEL_CONFIGS) as ModelKey[]

function getBuiltinModelStrings(provider: LegacyAPIProvider): ModelStrings {
  // Codex piggybacks on the OpenAI provider transport for Anthropic tier aliases.
  // Reuse OpenAI mappings so model string lookups never return undefined.
  const providerKey = provider === 'codex' || provider === 'github' ? 'openai' : provider
  const out = {} as ModelStrings
  for (const key of MODEL_KEYS) {
    out[key] = (
      LEGACY_PROVIDER_MODEL_CONFIGS[key] as LegacyProviderModelConfig
    )[providerKey]
  }
  return out
}

/**
 * Layer user-configured modelOverrides (from settings.json) on top of the
 * provider-derived model strings. Overrides are keyed by canonical first-party
 * model ID (e.g. "claude-opus-4-6") and map to arbitrary provider-specific
 * strings.
 */
function applyModelOverrides(ms: ModelStrings): ModelStrings {
  const overrides = getInitialSettings().modelOverrides
  if (!overrides) {
    return ms
  }
  const out = { ...ms }
  for (const [canonicalId, override] of Object.entries(overrides)) {
    const key = CANONICAL_ID_TO_KEY[canonicalId as CanonicalModelId]
    if (key && override) {
      out[key] = override
    }
  }
  return out
}

/**
 * Resolve an overridden model ID back to its canonical first-party model ID.
 * If the input doesn't match any current override value, it is returned unchanged.
 * Safe to call during module init (no-ops if settings aren't loaded yet).
 */
export function resolveOverriddenModel(modelId: string): string {
  let overrides: Record<string, string> | undefined
  try {
    overrides = getInitialSettings().modelOverrides
  } catch {
    return modelId
  }
  if (!overrides) {
    return modelId
  }
  for (const [canonicalId, override] of Object.entries(overrides)) {
    if (override === modelId) {
      return canonicalId
    }
  }
  return modelId
}

function initModelStrings(): void {
  const ms = getModelStringsState()
  if (ms !== null) {
    // Already initialized
    return
  }
  setModelStringsState(getBuiltinModelStrings(getAPIProvider()))
}

export function getModelStrings(): ModelStrings {
  const ms = getModelStringsState()
  if (ms === null) {
    initModelStrings()
    return applyModelOverrides(getBuiltinModelStrings(getAPIProvider()))
  }
  return applyModelOverrides(ms)
}

/**
 * Ensure model strings are fully initialized.
 * For most providers, this is synchronous.
 * Call this before generating model options to ensure correct strings.
 */
export function ensureModelStringsInitialized(): void {
  const ms = getModelStringsState()
  if (ms !== null) {
    return
  }
  setModelStringsState(getBuiltinModelStrings(getAPIProvider()))
}
