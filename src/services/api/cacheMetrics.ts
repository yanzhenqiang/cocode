/**
 * Cross-provider cache usage normalizer for Phase 1 observability.
 *
 * Two layers of extraction, because the shim layer (openaiShim/codexShim)
 * already converts raw provider usage to Anthropic-shape on the way in:
 *
 *   1. `extractCacheReadFromRawUsage` — consumes RAW provider usage, used
 *      from inside the shims where each provider's native field names are
 *      still visible. Single source of truth for "where is the cached-
 *      tokens count on provider X".
 *   2. `extractCacheMetrics` — consumes POST-shim Anthropic-shape usage,
 *      which is what every downstream caller (cost-tracker, REPL display,
 *      /cache-stats) actually sees.
 *
 * Design rationale:
 *   - Pure functions, no globals: callers pass the provider explicitly so
 *     that tests, background agents and teammates get consistent results
 *     even when the process-level provider flag differs.
 *   - `hitRate` is null whenever there is no input to compare against
 *     (0 read + 0 created). A 0% hit rate would suggest "cold" when in
 *     reality the turn had no cacheable content to begin with.
 *   - After normalization, `read + created <= total`, with any remainder
 *     being fresh (non-cacheable) input tokens. The shim enforces this
 *     invariant by subtracting cached from raw prompt_tokens so that
 *     post-shim `input_tokens` is always "fresh only" per Anthropic
 *     convention.
 */
import type { APIProvider } from '../../utils/model/providers.js'

/** Providers for which we know how to read cache fields. */
export type CacheAwareProvider = 'anthropic' | 'openai'

/** Unified cache metrics for one API response. */
export type CacheMetrics = {
  /** Tokens served from cache on this request. */
  read: number
  /**
   * Tokens written INTO the cache on this request. Only non-zero for
   * providers with explicit caching (Anthropic family).
   */
  created: number
  /**
   * Total input tokens the request is measured against, computed uniformly
   * as `fresh + read + created` after the shim normalizes every provider
   * to the Anthropic convention. Used as the denominator for hit-rate.
   */
  total: number
  /**
   * `read / total`, or null when the denominator is zero or the provider
   * doesn't support cache reporting.
   */
  hitRate: number | null
  /**
   * False for providers that do not expose cache data at all. Callers
   * should render "N/A" instead of "0%" in that case.
   */
  supported: boolean
}

/** Empty reference returned for unsupported providers — copy elision. */
const UNSUPPORTED: CacheMetrics = {
  read: 0,
  created: 0,
  total: 0,
  hitRate: null,
  supported: false,
}

/** Raw usage shape — intentionally permissive, each provider picks its fields. */
export type RawUsage = Record<string, unknown> | null | undefined

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Read the cached-tokens count from a RAW provider usage object.
 * Only handles Anthropic-native shape (cache_read_input_tokens).
 */
export function extractCacheReadFromRawUsage(usage: RawUsage): number {
  if (!usage || typeof usage !== 'object') return 0
  const u = usage as Record<string, unknown>
  return asNumber(u.cache_read_input_tokens)
}

/**
 * Shape produced by the shim layer — matches the Anthropic BetaUsage
 * fields that every downstream caller (cost-tracker, REPL, /cache-stats)
 * consumes. Keeping it in this module lets the shim and the integration
 * tests share one definition and eliminates the drift class of bugs
 * where a shim is updated but a test simulator isn't.
 */
export type NormalizedShimUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

/**
 * Convert raw provider usage (any known shape) into the Anthropic-shape
 * `NormalizedShimUsage` used throughout the codebase.
 */
export function buildAnthropicUsageFromRawUsage(
  raw: RawUsage,
): NormalizedShimUsage {
  const cacheRead = extractCacheReadFromRawUsage(raw)
  const u = (raw ?? {}) as Record<string, unknown>
  const rawInput =
    asNumber(u.input_tokens) || asNumber(u.prompt_tokens)
  const fresh = rawInput >= cacheRead ? rawInput - cacheRead : rawInput
  const output =
    asNumber(u.output_tokens) || asNumber(u.completion_tokens)
  return {
    input_tokens: fresh,
    output_tokens: output,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: cacheRead,
  }
}

/**
 * Extract a unified CacheMetrics from POST-SHIM (Anthropic-shape) usage.
 */
export function extractCacheMetrics(
  usage: RawUsage,
  provider: CacheAwareProvider,
): CacheMetrics {
  if (!usage || typeof usage !== 'object') return UNSUPPORTED
  const u = usage as Record<string, unknown>
  const read = asNumber(u.cache_read_input_tokens)
  const created = asNumber(u.cache_creation_input_tokens)
  const fresh = asNumber(u.input_tokens)

  // Only Anthropic provider supports cache metrics reporting
  if (provider !== 'anthropic') {
    return UNSUPPORTED
  }

  const total = read + created + fresh
  return {
    read,
    created,
    total,
    hitRate: total > 0 ? Math.min(1, read / total) : null,
    supported: true,
  }
}

/**
 * Map the canonical APIProvider enum into a cache-capability bucket.
 */
export function resolveCacheProvider(
  provider: APIProvider,
  _hints?: { githubNativeAnthropic?: boolean; openAiBaseUrl?: string },
): CacheAwareProvider {
  if (provider === 'firstParty') return 'anthropic'
  return 'openai'
}

/**
 * Format a CacheMetrics value into a human-facing one-liner used by
 * `showCacheStats: 'compact'`. Stable format — snapshot-tested.
 *
 * Examples:
 *   "[Cache: 1.2k read • hit 12%]"
 *   "[Cache: N/A]"                  (unsupported provider)
 *   "[Cache: cold]"                 (supported, no reads yet)
 *
 * The `undefined` branch at the top is defensive: TypeScript enforces
 * `CacheMetrics` at call sites, but a failed API response could leave
 * the caller with nothing to render. Treat absent metrics as "no data"
 * rather than throwing on `metrics.supported`.
 */
export function formatCacheMetricsCompact(
  metrics: CacheMetrics | undefined | null,
): string {
  if (!metrics) return '[Cache: N/A]'
  if (!metrics.supported) return '[Cache: N/A]'
  if (metrics.read === 0 && metrics.created === 0) return '[Cache: cold]'
  const parts: string[] = [`${formatCompactNumber(metrics.read)} read`]
  if (metrics.hitRate !== null) {
    parts.push(`hit ${Math.round(metrics.hitRate * 100)}%`)
  }
  return `[Cache: ${parts.join(' • ')}]`
}

/**
 * Format a CacheMetrics value into a multi-field breakdown used by
 * `showCacheStats: 'full'`. Stable format — snapshot-tested.
 *
 * Example:
 *   "[Cache: read=1.2k created=340 hit=12%]"
 *
 * Same `undefined` tolerance as `formatCacheMetricsCompact` — a failed
 * API response shouldn't throw on the display path.
 */
export function formatCacheMetricsFull(
  metrics: CacheMetrics | undefined | null,
): string {
  if (!metrics) return '[Cache: N/A]'
  if (!metrics.supported) return '[Cache: N/A]'
  const parts: string[] = [
    `read=${formatCompactNumber(metrics.read)}`,
    `created=${formatCompactNumber(metrics.created)}`,
  ]
  if (metrics.hitRate !== null) {
    parts.push(`hit=${Math.round(metrics.hitRate * 100)}%`)
  } else {
    parts.push('hit=n/a')
  }
  return `[Cache: ${parts.join(' ')}]`
}

// Compact 1.2k-style formatter. Duplicated here (not imported from
// utils/format.ts) because this module should stay dependency-light and
// deterministic — utils/format pulls Intl locale state which varies.
function formatCompactNumber(n: number): string {
  if (n < 1_000) return String(n)
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
}

/** Sum two CacheMetrics, preserving `supported` as true only if both are. */
export function addCacheMetrics(a: CacheMetrics, b: CacheMetrics): CacheMetrics {
  // Copy elision: if either side is the unsupported sentinel, return the
  // other as-is so aggregates on a purely-unsupported session stay cheap.
  if (!a.supported && !b.supported) return UNSUPPORTED
  if (!a.supported) return b
  if (!b.supported) return a
  const read = a.read + b.read
  const created = a.created + b.created
  const total = a.total + b.total
  return {
    read,
    created,
    total,
    hitRate: total > 0 ? read / total : null,
    supported: true,
  }
}
