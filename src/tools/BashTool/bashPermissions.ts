import { APIUserAbortError } from '@anthropic-ai/sdk'
import type { z } from 'zod/v4'
import { feature } from 'bun:bundle'
import type { ToolPermissionContext, ToolUseContext } from '../../Tool.js'
import type { PendingClassifierCheck } from '../../types/permissions.js'
import { tryParseShellCommand } from '../../utils/bash/shellQuote.js'
import { getCwd } from '../../utils/cwd.js'
import { AbortError } from '../../utils/errors.js'
import type {
  ClassifierBehavior,
  ClassifierResult,
} from '../../utils/permissions/bashClassifier.js'
import {
  classifyBashCommand,
  getBashPromptAllowDescriptions,
  getBashPromptAskDescriptions,
  getBashPromptDenyDescriptions,
  isClassifierPermissionsEnabled,
} from '../../utils/permissions/bashClassifier.js'
import type {
  PermissionDecisionReason,
  PermissionResult,
} from '../../utils/permissions/PermissionResult.js'
import type { PermissionUpdate } from '../../utils/permissions/PermissionUpdateSchema.js'
import { createPermissionRequestMessage } from '../../utils/permissions/permissions.js'
import {
  matchWildcardPattern as sharedMatchWildcardPattern,
  permissionRuleExtractPrefix as sharedPermissionRuleExtractPrefix,
} from '../../utils/permissions/shellRuleMatching.js'
import { BashTool } from './BashTool.js'

/**
 * Log classifier evaluation results for analysis.
 * No-op in external builds.
 */
function logClassifierResultForAnts(
  _command: string,
  _behavior: ClassifierBehavior,
  _descriptions: string[],
  _result: ClassifierResult,
): void {
  // Internal-only logging removed from external build.
}

// Env-var assignment prefix (VAR=value). Shared across prefix helpers.
const ENV_VAR_ASSIGN_RE = /^[A-Za-z_]\w*=/

/**
 * Extract a stable command prefix (command + subcommand) from a raw command string.
 * Skips leading env var assignments only if they are in SAFE_ENV_VARS (or
 * ANT_ONLY_SAFE_ENV_VARS for ant users). Returns null if a non-safe env var is
 * encountered (to fall back to exact match), or if the second token doesn't look
 * like a subcommand.
 */
export function getSimpleCommandPrefix(command: string): string | null {
  const tokens = command.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  let i = 0
  while (i < tokens.length && ENV_VAR_ASSIGN_RE.test(tokens[i]!)) {
    const varName = tokens[i]!.split('=')[0]!
    const isAntOnlySafe =
      'false' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
    if (!SAFE_ENV_VARS.has(varName) && !isAntOnlySafe) {
      return null
    }
    i++
  }

  const remaining = tokens.slice(i)
  if (remaining.length < 2) return null
  const subcmd = remaining[1]!
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(subcmd)) return null
  return remaining.slice(0, 2).join(' ')
}

const BARE_SHELL_PREFIXES = new Set([
  'sh',
  'bash',
  'zsh',
  'fish',
  'csh',
  'tcsh',
  'ksh',
  'dash',
  'cmd',
  'powershell',
  'pwsh',
  'env',
  'xargs',
  'nice',
  'stdbuf',
  'nohup',
  'timeout',
  'time',
  'sudo',
  'doas',
  'pkexec',
])

/**
 * UI-only fallback: extract the first word alone when getSimpleCommandPrefix
 * declines. In external builds TREE_SITTER_BASH is off, so the async
 * tree-sitter refinement in BashPermissionRequest never fires — without this,
 * pipes and compounds dump into the editable field verbatim.
 */
export function getFirstWordPrefix(command: string): string | null {
  const tokens = command.trim().split(/\s+/).filter(Boolean)

  let i = 0
  while (i < tokens.length && ENV_VAR_ASSIGN_RE.test(tokens[i]!)) {
    const varName = tokens[i]!.split('=')[0]!
    const isAntOnlySafe =
      'false' && ANT_ONLY_SAFE_ENV_VARS.has(varName)
    if (!SAFE_ENV_VARS.has(varName) && !isAntOnlySafe) {
      return null
    }
    i++
  }

  const cmd = tokens[i]
  if (!cmd) return null
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(cmd)) return null
  if (BARE_SHELL_PREFIXES.has(cmd)) return null
  return cmd
}

/**
 * Match a command against a wildcard pattern (case-sensitive for Bash).
 * Delegates to shared implementation.
 */
export function matchWildcardPattern(
  pattern: string,
  command: string,
): boolean {
  return sharedMatchWildcardPattern(pattern, command)
}

/**
 * Extract prefix from legacy :* syntax (e.g., "npm:*" -> "npm")
 * Delegates to shared implementation.
 */
export const permissionRuleExtractPrefix = sharedPermissionRuleExtractPrefix

/**
 * Whitelist of environment variables that are safe to strip from commands.
 * These variables CANNOT execute code or load libraries.
 */
const SAFE_ENV_VARS = new Set([
  'GOEXPERIMENT',
  'GOOS',
  'GOARCH',
  'CGO_ENABLED',
  'GO111MODULE',
  'RUST_BACKTRACE',
  'RUST_LOG',
  'NODE_ENV',
  'PYTHONUNBUFFERED',
  'PYTHONDONTWRITEBYTECODE',
  'PYTEST_DISABLE_PLUGIN_AUTOLOAD',
  'PYTEST_DEBUG',
  'ANTHROPIC_API_KEY',
  'LANG',
  'LANGUAGE',
  'LC_ALL',
  'LC_CTYPE',
  'LC_TIME',
  'CHARSET',
  'TERM',
  'COLORTERM',
  'NO_COLOR',
  'FORCE_COLOR',
  'TZ',
  'LS_COLORS',
  'LSCOLORS',
  'GREP_COLOR',
  'GREP_COLORS',
  'GCC_COLORS',
  'TIME_STYLE',
  'BLOCK_SIZE',
  'BLOCKSIZE',
])

const ANT_ONLY_SAFE_ENV_VARS = new Set([
  'KUBECONFIG',
  'DOCKER_HOST',
  'AWS_PROFILE',
  'CLOUDSDK_CORE_PROJECT',
  'CLUSTER',
  'COO_CLUSTER',
  'COO_CLUSTER_NAME',
  'COO_NAMESPACE',
  'COO_LAUNCH_YAML_DRY_RUN',
  'SKIP_NODE_VERSION_CHECK',
  'EXPECTTEST_ACCEPT',
  'CI',
  'GIT_LFS_SKIP_SMUDGE',
  'CUDA_VISIBLE_DEVICES',
  'JAX_PLATFORMS',
  'COLUMNS',
  'TMUX',
  'POSTGRESQL_VERSION',
  'FIRESTORE_EMULATOR_HOST',
  'HARNESS_QUIET',
  'TEST_CROSSCHECK_LISTS_MATCH_UPDATE',
  'DBT_PER_DEVELOPER_ENVIRONMENTS',
  'STATSIG_FORD_DB_CHECKS',
  'ANT_ENVIRONMENT',
  'ANT_SERVICE',
  'MONOREPO_ROOT_DIR',
  'PYENV_VERSION',
  'PGPASSWORD',
  'GH_TOKEN',
  'GROWTHBOOK_API_KEY',
])

/**
 * Simplified wrapper strip. Kept for API compatibility with cd/git detection.
 */
export function stripSafeWrappers(command: string): string {
  return command.trim()
}

/**
 * Builds the pending classifier check metadata if classifier is enabled and has allow descriptions.
 * Returns undefined if classifier is disabled, in auto mode, or no allow descriptions exist.
 */
function buildPendingClassifierCheck(
  command: string,
  toolPermissionContext: ToolPermissionContext,
): { command: string; cwd: string; descriptions: string[] } | undefined {
  if (!isClassifierPermissionsEnabled()) {
    return undefined
  }
  // Skip in auto mode - auto mode classifier handles all permission decisions
  if (feature('TRANSCRIPT_CLASSIFIER') && toolPermissionContext.mode === 'auto')
    return undefined
  if (toolPermissionContext.mode === 'bypassPermissions') return undefined

  const allowDescriptions = getBashPromptAllowDescriptions(
    toolPermissionContext,
  )
  if (allowDescriptions.length === 0) return undefined

  return {
    command,
    cwd: getCwd(),
    descriptions: allowDescriptions,
  }
}

const speculativeChecks = new Map<string, Promise<ClassifierResult>>()

/**
 * Start a speculative bash allow classifier check early, so it runs in
 * parallel with pre-tool hooks, deny/ask classifiers, and permission dialog setup.
 * The result can be consumed later by executeAsyncClassifierCheck via
 * consumeSpeculativeClassifierCheck.
 */
export function peekSpeculativeClassifierCheck(
  command: string,
): Promise<ClassifierResult> | undefined {
  return speculativeChecks.get(command)
}

export function startSpeculativeClassifierCheck(
  command: string,
  toolPermissionContext: ToolPermissionContext,
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
): boolean {
  // Same guards as buildPendingClassifierCheck
  if (!isClassifierPermissionsEnabled()) return false
  if (feature('TRANSCRIPT_CLASSIFIER') && toolPermissionContext.mode === 'auto')
    return false
  if (toolPermissionContext.mode === 'bypassPermissions') return false
  const allowDescriptions = getBashPromptAllowDescriptions(
    toolPermissionContext,
  )
  if (allowDescriptions.length === 0) return false

  const cwd = getCwd()
  const promise = classifyBashCommand(
    command,
    cwd,
    allowDescriptions,
    'allow',
    signal,
    isNonInteractiveSession,
  )
  // Prevent unhandled rejection if the signal aborts before this promise is consumed.
  // The original promise (which may reject) is still stored in the Map for consumers to await.
  promise.catch(() => {})
  speculativeChecks.set(command, promise)
  return true
}

/**
 * Consume a speculative classifier check result for the given command.
 * Returns the promise if one exists (and removes it from the map), or undefined.
 */
export function consumeSpeculativeClassifierCheck(
  command: string,
): Promise<ClassifierResult> | undefined {
  const promise = speculativeChecks.get(command)
  if (promise) {
    speculativeChecks.delete(command)
  }
  return promise
}

export function clearSpeculativeChecks(): void {
  speculativeChecks.clear()
}

/**
 * Await a pending classifier check and return a PermissionDecisionReason if
 * high-confidence allow, or undefined otherwise.
 *
 * Used by swarm agents (both tmux and in-process) to gate permission
 * forwarding: run the classifier first, and only escalate to the leader
 * if the classifier doesn't auto-approve.
 */
export async function awaitClassifierAutoApproval(
  pendingCheck: PendingClassifierCheck,
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
): Promise<PermissionDecisionReason | undefined> {
  const { command, cwd, descriptions } = pendingCheck
  const speculativeResult = consumeSpeculativeClassifierCheck(command)
  const classifierResult = speculativeResult
    ? await speculativeResult
    : await classifyBashCommand(
        command,
        cwd,
        descriptions,
        'allow',
        signal,
        isNonInteractiveSession,
      )

  logClassifierResultForAnts(command, 'allow', descriptions, classifierResult)

  if (
    feature('BASH_CLASSIFIER') &&
    classifierResult.matches &&
    classifierResult.confidence === 'high'
  ) {
    return {
      type: 'classifier',
      classifier: 'bash_allow',
      reason: `Allowed by prompt rule: "${classifierResult.matchedDescription}"`,
    }
  }
  return undefined
}

type AsyncClassifierCheckCallbacks = {
  shouldContinue: () => boolean
  onAllow: (decisionReason: PermissionDecisionReason) => void
  onComplete?: () => void
}

/**
 * Execute the bash allow classifier check asynchronously.
 * This runs in the background while the permission prompt is shown.
 * If the classifier allows with high confidence and the user hasn't interacted, auto-approves.
 *
 * @param pendingCheck - Classifier check metadata from bashToolHasPermission
 * @param signal - Abort signal
 * @param isNonInteractiveSession - Whether this is a non-interactive session
 * @param callbacks - Callbacks to check if we should continue and handle approval
 */
export async function executeAsyncClassifierCheck(
  pendingCheck: { command: string; cwd: string; descriptions: string[] },
  signal: AbortSignal,
  isNonInteractiveSession: boolean,
  callbacks: AsyncClassifierCheckCallbacks,
): Promise<void> {
  const { command, cwd, descriptions } = pendingCheck
  const speculativeResult = consumeSpeculativeClassifierCheck(command)

  let classifierResult: ClassifierResult
  try {
    classifierResult = speculativeResult
      ? await speculativeResult
      : await classifyBashCommand(
          command,
          cwd,
          descriptions,
          'allow',
          signal,
          isNonInteractiveSession,
        )
  } catch (error: unknown) {
    // When the coordinator session is cancelled, the abort signal fires and the
    // classifier API call rejects with APIUserAbortError. This is expected and
    // should not surface as an unhandled promise rejection.
    if (error instanceof APIUserAbortError || error instanceof AbortError) {
      callbacks.onComplete?.()
      return
    }
    callbacks.onComplete?.()
    throw error
  }

  logClassifierResultForAnts(command, 'allow', descriptions, classifierResult)

  // Don't auto-approve if user already made a decision or has interacted
  // with the permission dialog (e.g., arrow keys, tab, typing)
  if (!callbacks.shouldContinue()) return

  if (
    feature('BASH_CLASSIFIER') &&
    classifierResult.matches &&
    classifierResult.confidence === 'high'
  ) {
    callbacks.onAllow({
      type: 'classifier',
      classifier: 'bash_allow',
      reason: `Allowed by prompt rule: "${classifierResult.matchedDescription}"`,
    })
  } else {
    // No match — notify so the checking indicator is cleared
    callbacks.onComplete?.()
  }
}

/**
 * The main implementation to check if we need to ask for user permission to call BashTool with a given input.
 * AI classifier only — all hardcoded security checks and user rule matching removed.
 */
export async function bashToolHasPermission(
  input: z.infer<typeof BashTool.inputSchema>,
  context: ToolUseContext,
): Promise<PermissionResult> {
  const appState = context.getAppState()

  // Auto mode: TRANSCRIPT_CLASSIFIER handles permission decisions elsewhere
  if (
    feature('TRANSCRIPT_CLASSIFIER') &&
    appState.toolPermissionContext.mode === 'auto'
  ) {
    return {
      behavior: 'passthrough',
      message: 'Auto mode',
    }
  }

  // Bypass permissions
  if (appState.toolPermissionContext.mode === 'bypassPermissions') {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: {
        type: 'other',
        reason: 'Bypass permissions',
      },
    }
  }

  // Check Bash prompt deny and ask rules using Haiku classifier
  if (isClassifierPermissionsEnabled()) {
    const denyDescriptions = getBashPromptDenyDescriptions(
      appState.toolPermissionContext,
    )
    const askDescriptions = getBashPromptAskDescriptions(
      appState.toolPermissionContext,
    )
    const hasDeny = denyDescriptions.length > 0
    const hasAsk = askDescriptions.length > 0

    if (hasDeny || hasAsk) {
      const [denyResult, askResult] = await Promise.all([
        hasDeny
          ? classifyBashCommand(
              input.command,
              getCwd(),
              denyDescriptions,
              'deny',
              context.abortController.signal,
              context.options.isNonInteractiveSession,
            )
          : null,
        hasAsk
          ? classifyBashCommand(
              input.command,
              getCwd(),
              askDescriptions,
              'ask',
              context.abortController.signal,
              context.options.isNonInteractiveSession,
            )
          : null,
      ])

      if (context.abortController.signal.aborted) {
        throw new AbortError()
      }

      if (denyResult) {
        logClassifierResultForAnts(
          input.command,
          'deny',
          denyDescriptions,
          denyResult,
        )
      }
      if (askResult) {
        logClassifierResultForAnts(
          input.command,
          'ask',
          askDescriptions,
          askResult,
        )
      }

      // Deny takes precedence
      if (denyResult?.matches && denyResult.confidence === 'high') {
        return {
          behavior: 'deny',
          message: `Denied by Bash prompt rule: "${denyResult.matchedDescription}"`,
          decisionReason: {
            type: 'other',
            reason: `Denied by Bash prompt rule: "${denyResult.matchedDescription}"`,
          },
        }
      }

      if (askResult?.matches && askResult.confidence === 'high') {
        return {
          behavior: 'ask',
          message: createPermissionRequestMessage(BashTool.name),
          decisionReason: {
            type: 'other',
            reason: `Required by Bash prompt rule: "${askResult.matchedDescription}"`,
          },
          ...(feature('BASH_CLASSIFIER')
            ? {
                pendingClassifierCheck: buildPendingClassifierCheck(
                  input.command,
                  appState.toolPermissionContext,
                ),
              }
            : {}),
        }
      }
    }
  }

  // Default: passthrough — will prompt user, with optional background allow classifier
  const decisionReason = {
    type: 'other' as const,
    reason: 'This command requires approval',
  }
  return {
    behavior: 'passthrough',
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    ...(feature('BASH_CLASSIFIER')
      ? {
          pendingClassifierCheck: buildPendingClassifierCheck(
            input.command,
            appState.toolPermissionContext,
          ),
        }
      : {}),
  }
}

/**
 * Checks if a subcommand is a git command after normalizing away safe wrappers
 * (env vars, timeout, etc.) and shell quotes.
 */
export function isNormalizedGitCommand(command: string): boolean {
  // Fast path: catch the most common case before any parsing
  if (command.startsWith('git ') || command === 'git') {
    return true
  }
  const stripped = stripSafeWrappers(command)
  const parsed = tryParseShellCommand(stripped)
  if (parsed.success && parsed.tokens.length > 0) {
    // Direct git command
    if (parsed.tokens[0] === 'git') {
      return true
    }
    // "xargs git ..." — xargs runs git in the current directory,
    // so it must be treated as a git command for cd+git security checks.
    if (parsed.tokens[0] === 'xargs' && parsed.tokens.includes('git')) {
      return true
    }
    return false
  }
  return /^git(?:\s|$)/.test(stripped)
}

/**
 * Checks if a subcommand is a cd command after normalizing away safe wrappers
 * (env vars, timeout, etc.) and shell quotes.
 */
export function isNormalizedCdCommand(command: string): boolean {
  const stripped = stripSafeWrappers(command)
  const parsed = tryParseShellCommand(stripped)
  if (parsed.success && parsed.tokens.length > 0) {
    const cmd = parsed.tokens[0]
    return cmd === 'cd' || cmd === 'pushd' || cmd === 'popd'
  }
  return /^(?:cd|pushd|popd)(?:\s|$)/.test(stripped)
}

/**
 * Checks if a compound command contains any cd command,
 * using normalized detection that handles env var prefixes and shell quotes.
 */
export function commandHasAnyCd(command: string): boolean {
  return command.split(/&&|;|\|/g).some(subcmd =>
    isNormalizedCdCommand(subcmd.trim()),
  )
}
