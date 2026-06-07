import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

import { logForDebugging } from '../../utils/debug.js'
const asTrimmedString = (s: unknown): string | undefined => typeof s === 'string' ? s.trim() || undefined : undefined;

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const warnedUndefinedEnvNames = new Set<string>()

type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh'

export type ProviderTransport = 'chat_completions' | 'responses'
export type OpenAICompatibleApiFormat = 'chat_completions' | 'responses'

export type ResolvedProviderRequest = {
  transport: ProviderTransport
  requestedModel: string
  resolvedModel: string
  baseUrl: string
  reasoning?: {
    effort: ReasoningEffort
  }
}

type ModelDescriptor = {
  raw: string
  baseModel: string
  reasoning?: {
    effort: ReasoningEffort
  }
}

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function hashCacheScopePartition(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 16)
}

function normalizeCacheScopeHeaderValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function isPrivateIpv4Address(hostname: string): boolean {
  const octets = hostname.split('.').map(part => Number.parseInt(part, 10))
  if (octets.length !== 4 || octets.some(octet => Number.isNaN(octet))) {
    return false
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  )
}

function isPrivateIpv6Address(hostname: string): boolean {
  const firstHextet = hostname.split(':', 1)[0]
  if (!firstHextet) return false

  const prefix = Number.parseInt(firstHextet, 16)
  if (Number.isNaN(prefix)) return false

  return (prefix & 0xfe00) === 0xfc00 || (prefix & 0xffc0) === 0xfe80
}

// Reads an env-var-style string intended as a URL or path, rejecting both
// empty strings and the literal string "undefined" that Windows shells can
// write when a variable is unset-then-referenced without quotes (issue #336).
function asEnvUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed === 'undefined') {
    return undefined
  }
  return trimmed
}

function asNamedEnvUrl(
  value: string | undefined,
  envName: string,
): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (trimmed === 'undefined') {
    if (!warnedUndefinedEnvNames.has(envName)) {
      warnedUndefinedEnvNames.add(envName)
      logForDebugging(
        `[provider-config] Environment variable ${envName} is the literal string "undefined"; ignoring it.`,
        { level: 'warn' },
      )
    }
    return undefined
  }

  return trimmed
}

function readNestedString(
  value: unknown,
  paths: string[][],
): string | undefined {
  for (const path of paths) {
    let current = value
    let valid = true
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        valid = false
        break
      }
      current = (current as Record<string, unknown>)[key]
    }
    if (!valid) continue
    const stringValue = asTrimmedString(current)
    if (stringValue) return stringValue
  }
  return undefined
}

function parseReasoningEffort(value: string | undefined): ReasoningEffort | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
    return normalized
  }
  return undefined
}

export function parseOpenAICompatibleApiFormat(
  value: string | undefined,
): OpenAICompatibleApiFormat | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase().replace(/[- ]+/g, '_')
  if (
    normalized === 'responses' ||
    normalized === 'response' ||
    normalized === 'responses_api'
  ) {
    return 'responses'
  }
  if (
    normalized === 'chat_completions' ||
    normalized === 'chat_completion' ||
    normalized === 'completions' ||
    normalized === 'completion' ||
    normalized === 'chat'
  ) {
    return 'chat_completions'
  }
  return undefined
}

function parseModelDescriptor(model: string): ModelDescriptor {
  const trimmed = model.trim()
  const queryIndex = trimmed.indexOf('?')
  if (queryIndex === -1) {
    return {
      raw: trimmed,
      baseModel: trimmed,
    }
  }

  const baseModel = trimmed.slice(0, queryIndex).trim()
  const params = new URLSearchParams(trimmed.slice(queryIndex + 1))
  const reasoning =
    parseReasoningEffort(params.get('reasoning') ?? undefined)

  return {
    raw: trimmed,
    baseModel,
    reasoning: typeof reasoning === 'string' ? { effort: reasoning } : reasoning,
  }
}

export function isLocalProviderUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false
  try {
    let hostname = new URL(baseUrl).hostname.toLowerCase()

    // Strip IPv6 brackets added by the URL parser (e.g. "[::1]" -> "::1")
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1)
    }

    // Strip RFC6874 IPv6 zone identifiers (e.g. "fe80::1%25en0" -> "fe80::1")
    const zoneIdIndex = hostname.indexOf('%25')
    if (zoneIdIndex !== -1) {
      hostname = hostname.slice(0, zoneIdIndex)
    }

    if (LOCALHOST_HOSTNAMES.has(hostname) || hostname === '0.0.0.0') {
      return true
    }
    if (hostname.endsWith('.local')) {
      return true
    }

    const ipVersion = isIP(hostname)
    if (ipVersion === 4) {
      // Treat the full 127.0.0.0/8 loopback range as local
      const firstOctet = Number.parseInt(hostname.split('.', 1)[0] ?? '', 10)
      return firstOctet === 127 || isPrivateIpv4Address(hostname)
    }
    if (ipVersion === 6) {
      return isPrivateIpv6Address(hostname)
    }

    return false
  } catch {
    return false
  }
}

// Fast-path opt-outs that are safe (and beneficial) when the provider is a
// local OpenAI-compatible endpoint. These features are designed for cloud
// behaviours that do not exist on local backends:
//   - byte-stable serialization (`stableStringify`) targets implicit prefix
//     caching on OpenAI/Kimi/DeepSeek/Codex; local backends do not hash
//     request prefixes, so the deep key-sort is pure CPU overhead.
//   - strict tool-schema normalization rewrites Anthropic schemas to the
//     `additionalProperties: false` shape required by Groq/Azure; local
//     llama.cpp/vLLM accept either form, so the recursive walk is wasted.
//   - tool-result compression tiers tool_result blocks for stateless cloud
//     providers; on a single-user local box where the conversation lives
//     in RAM, the tier-walk is wasted unless the user opts back in.
//
// Issue #1016 traced cumulative client-side overhead as the dominant cause
// of v0.5+ regressions against ~45 tok/s local models: against a 200ms cloud
// API the layers are invisible, but against multi-second local round-trips
// they multiply per-call.
//
// Set `COCODE_LOCAL_FAST_PATH=1` to force it on, `=0` to force off, or
// leave it unset to let `isLocalProviderUrl` decide. The opt-out is intended
// to be conservative: if the env var is set explicitly, callers can audit
// regressions; if not, behaviour only changes for hosts already classified
// as local by the existing detector (loopback, RFC1918, .local, ULA/LL).
const LOCAL_FAST_PATH_ENV = 'COCODE_LOCAL_FAST_PATH'

export type LocalFastPathConfig = {
  enabled: boolean
  skipStableStringify: boolean
  skipStrictTools: boolean
  skipToolHistoryCompression: boolean
}

const LOCAL_FAST_PATH_OFF: LocalFastPathConfig = {
  enabled: false,
  skipStableStringify: false,
  skipStrictTools: false,
  skipToolHistoryCompression: false,
}

const LOCAL_FAST_PATH_ON: LocalFastPathConfig = {
  enabled: true,
  skipStableStringify: true,
  skipStrictTools: true,
  skipToolHistoryCompression: true,
}

function parseLocalFastPathOverride(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined
  const v = raw.trim().toLowerCase()
  if (v === '' || v === 'auto') return undefined
  if (v === '0' || v === false || v === 'off' || v === 'no') return false
  if (v === '1' || v === true || v === 'on' || v === 'yes') return true
  return undefined
}

export function getLocalFastPathConfig(
  baseUrl: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): LocalFastPathConfig {
  const override = parseLocalFastPathOverride(env[LOCAL_FAST_PATH_ENV])
  const enabled = override ?? isLocalProviderUrl(baseUrl)
  return enabled ? LOCAL_FAST_PATH_ON : LOCAL_FAST_PATH_OFF
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizePathWithV1(pathname: string): string {
  const trimmed = trimTrailingSlash(pathname)
  if (!trimmed || trimmed === '/') {
    return '/v1'
  }

  if (trimmed.toLowerCase().endsWith('/v1')) {
    return trimmed
  }

  return `${trimmed}/v1`
}

function isLikelyOllamaEndpoint(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl)
    const hostname = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()

    if (parsed.port === '11434') {
      return true
    }

    return (
      hostname.includes('ollama') ||
      pathname.includes('ollama')
    )
  } catch {
    return false
  }
}

export function getLocalProviderRetryBaseUrls(baseUrl: string): string[] {
  if (!isLocalProviderUrl(baseUrl)) {
    return []
  }

  try {
    const parsed = new URL(baseUrl)
    const original = trimTrailingSlash(parsed.toString())
    const seen = new Set<string>([original])
    const candidates: string[] = []

    const addCandidate = (hostname: string, pathname: string): void => {
      const next = new URL(parsed.toString())
      next.hostname = hostname
      next.pathname = pathname
      next.search = ''
      next.hash = ''

      const normalized = trimTrailingSlash(next.toString())
      if (seen.has(normalized)) {
        return
      }

      seen.add(normalized)
      candidates.push(normalized)
    }

    const v1Pathname = normalizePathWithV1(parsed.pathname)
    if (v1Pathname !== trimTrailingSlash(parsed.pathname)) {
      addCandidate(parsed.hostname, v1Pathname)
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname === '::1') {
      addCandidate('127.0.0.1', parsed.pathname || '/')
      addCandidate('127.0.0.1', v1Pathname)
    }

    return candidates
  } catch {
    return []
  }
}

export function shouldAttemptLocalToollessRetry(options: {
  baseUrl: string
  hasTools: boolean
}): boolean {
  if (!options.hasTools) {
    return false
  }

  if (!isLocalProviderUrl(options.baseUrl)) {
    return false
  }

  return isLikelyOllamaEndpoint(options.baseUrl)
}

export function resolveProviderRequest(options?: {
  model?: string
  baseUrl?: string
  fallbackModel?: string
  reasoningEffortOverride?: ReasoningEffort
  apiFormat?: OpenAICompatibleApiFormat | string
}): ResolvedProviderRequest {
  const requestedModel =
    options?.model?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    options?.fallbackModel?.trim() ||
    'gpt-4o'
  const descriptor = parseModelDescriptor(requestedModel)
  const explicitBaseUrl = asEnvUrl(options?.baseUrl)
  const primaryEnvBaseUrl = asNamedEnvUrl(process.env.OPENAI_BASE_URL, 'OPENAI_BASE_URL')
  const fallbackEnvBaseUrl = primaryEnvBaseUrl === undefined
    ? asNamedEnvUrl(process.env.OPENAI_API_BASE, 'OPENAI_API_BASE')
    : undefined

  const requestedApiFormat =
    parseOpenAICompatibleApiFormat(options?.apiFormat) ??
    parseOpenAICompatibleApiFormat(process.env.OPENAI_API_FORMAT)

  return {
    transport: requestedApiFormat === 'responses' ? 'responses' : 'chat_completions',
    requestedModel,
    resolvedModel: descriptor.baseModel,
    baseUrl: ((explicitBaseUrl ?? primaryEnvBaseUrl ?? fallbackEnvBaseUrl) || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, ''),
    reasoning: options?.reasoningEffortOverride
      ? { effort: options.reasoningEffortOverride }
      : descriptor.reasoning,
  }
}

export function getAdditionalModelOptionsCacheScope(): string | null {
  return 'firstParty'
}

export function getReasoningEffortForModel(_model: string): ReasoningEffort | undefined {
  // Reasoning effort defaults are determined by the model provider,
  // not hardcoded here. Return undefined to use the provider's default.
  return undefined
}
