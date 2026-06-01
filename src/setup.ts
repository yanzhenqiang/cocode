/* eslint-disable custom-rules/no-process-exit */

import chalk from 'chalk'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from 'src/services/analytics/index.js'
import { getCwd } from 'src/utils/cwd.js'
import { checkForReleaseNotes } from 'src/utils/releaseNotes.js'
import { setCwd } from 'src/utils/Shell.js'
import { initSinks } from 'src/utils/sinks.js'
import {
  getIsNonInteractiveSession,
  getProjectRoot,
  getSessionId,
  setOriginalCwd,
  setProjectRoot,
  switchSession,
} from './bootstrap/state.js'
import { getCommands } from './commands.js'
import { initSessionMemory } from './services/SessionMemory/sessionMemory.js'
import { asSessionId } from './types/ids.js'
import { isAgentSwarmsEnabled } from './utils/agentSwarmsEnabled.js'
import { checkAndRestoreTerminalBackup } from './utils/appleTerminalBackup.js'
import { prefetchApiKeyFromApiKeyHelperIfSafe } from './utils/auth.js'
import { clearMemoryFileCaches } from './utils/claudemd.js'
import { getCurrentProjectConfig, getGlobalConfig } from './utils/config.js'
import { logForDiagnosticsNoPII } from './utils/diagLogs.js'
import { env } from './utils/env.js'
import { envDynamic } from './utils/envDynamic.js'
import { isEnvTruthy } from './utils/envUtils.js'
import { errorMessage } from './utils/errors.js'
import { findCanonicalGitRoot, findGitRoot, getIsGit } from './utils/git.js'
import { initializeFileChangedWatcher } from './utils/hooks/fileChangedWatcher.js'
import {
  captureHooksConfigSnapshot,
  updateHooksConfigSnapshot,
} from './utils/hooks/hooksConfigSnapshot.js'
import { hasWorktreeCreateHook } from './utils/hooks.js'
import { checkAndRestoreITerm2Backup } from './utils/iTermBackup.js'
import { logError } from './utils/log.js'
import { getRecentActivity } from './utils/logoV2Utils.js'
import type { PermissionMode } from './utils/permissions/PermissionMode.js'
import { getPlanSlug } from './utils/plans.js'
import { saveWorktreeState } from './utils/sessionStorage.js'
import { profileCheckpoint } from './utils/startupProfiler.js'

export async function setup(
  cwd: string,
  permissionMode: PermissionMode,
  allowDangerouslySkipPermissions: boolean,
  customSessionId?: string | null,
  _messagingSocketPath?: string,
): Promise<void> {
  logForDiagnosticsNoPII('info', 'setup_started')

  // Check for Node.js version < 18
  const nodeVersion = process.version.match(/^v(\d+)\./)?.[1]
  if (!nodeVersion || parseInt(nodeVersion) < 18) {
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.error(
      chalk.bold.red(
        'Error: Cocode requires Node.js version 18 or higher.',
      ),
    )
    process.exit(1)
  }

  // Set custom session ID if provided
  if (customSessionId) {
    switchSession(asSessionId(customSessionId))
  }

  // --bare / SIMPLE: skip UDS messaging server and teammate snapshot.
  // Scripted calls don't receive injected messages and don't use swarm teammates.
  // Explicit --messaging-socket-path is the escape hatch (per #23222 gate pattern).

  // Terminal backup restoration — interactive only. Print mode doesn't
  // interact with terminal settings; the next interactive session will
  // detect and restore any interrupted setup.
  if (!getIsNonInteractiveSession()) {
    // iTerm2 backup check only when swarms enabled
    if (isAgentSwarmsEnabled()) {
      const restoredIterm2Backup = await checkAndRestoreITerm2Backup()
      if (restoredIterm2Backup.status === 'restored') {
        // biome-ignore lint/suspicious/noConsole:: intentional console output
        console.log(
          chalk.yellow(
            'Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect.',
          ),
        )
      } else if (restoredIterm2Backup.status === 'failed') {
        // biome-ignore lint/suspicious/noConsole:: intentional console output
        console.error(
          chalk.red(
            `Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${restoredIterm2Backup.backupPath}.`,
          ),
        )
      }
    }

    // Check and restore Terminal.app backup if setup was interrupted
    try {
      const restoredTerminalBackup = await checkAndRestoreTerminalBackup()
      if (restoredTerminalBackup.status === 'restored') {
        // biome-ignore lint/suspicious/noConsole:: intentional console output
        console.log(
          chalk.yellow(
            'Detected an interrupted Terminal.app setup. Your original settings have been restored. You may need to restart Terminal.app for the changes to take effect.',
          ),
        )
      } else if (restoredTerminalBackup.status === 'failed') {
        // biome-ignore lint/suspicious/noConsole:: intentional console output
        console.error(
          chalk.red(
            `Failed to restore Terminal.app settings. Please manually restore your original settings with: defaults import com.apple.Terminal ${restoredTerminalBackup.backupPath}.`,
          ),
        )
      }
    } catch (error) {
      // Log but don't crash if Terminal.app backup restoration fails
      logError(error)
    }
  }

  // IMPORTANT: setCwd() must be called before any other code that depends on the cwd
  setCwd(cwd)

  // Capture hooks configuration snapshot to avoid hidden hook modifications.
  // IMPORTANT: Must be called AFTER setCwd() so hooks are loaded from the correct directory
  const hooksStart = Date.now()
  captureHooksConfigSnapshot()
  logForDiagnosticsNoPII('info', 'setup_hooks_captured', {
    duration_ms: Date.now() - hooksStart,
  })

  // Initialize FileChanged hook watcher — sync, reads hook config snapshot
  initializeFileChangedWatcher(cwd)

  // Background jobs - only critical registrations that must happen before first query
  logForDiagnosticsNoPII('info', 'setup_background_jobs_starting')
  // Bundled skills/plugins are registered in main.tsx before the parallel
  // getCommands() kick — see comment there. Moved out of setup() because
  // the await points above (startUdsMessaging, ~20ms) meant getCommands()
  // raced ahead and memoized an empty bundledSkills list.
  initSessionMemory() // Synchronous - registers hook, gate check happens lazily
  logForDiagnosticsNoPII('info', 'setup_background_jobs_launched')

  profileCheckpoint('setup_before_prefetch')
  // Pre-fetch promises - only items needed before render
  logForDiagnosticsNoPII('info', 'setup_prefetch_starting')
  // When CLAUDE_CODE_SYNC_PLUGIN_INSTALL is set, skip all plugin prefetch.
  // The sync install path in print.ts calls refreshPluginState() after
  // installing, which reloads commands, hooks, and agents. Prefetching here
  // races with the install (concurrent copyPluginToVersionedCache / cachePlugin
  // on the same directories), and the hot-reload handler fires clearPluginCache()
  // mid-install when policySettings arrives.
  const skipPluginPrefetch =
    (getIsNonInteractiveSession() &&
      isEnvTruthy(process.env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL))
  if (!skipPluginPrefetch) {
    void getCommands(getProjectRoot())
  }
  // Plugin loading removed — utils/plugins/ was deleted
  // --bare: skip attribution hook install + repo classification +
  // session-file-access analytics + team memory watcher. These are background
  // bookkeeping for commit attribution + usage metrics — scripted calls don't
  // commit code, and the 49ms attribution hook stat check (measured) is pure
  // overhead. NOT an early-return: the --dangerously-skip-permissions safety
  // gate, tengu_started beacon, and apiKeyHelper prefetch below must still run.
  void import('./utils/sessionFileAccessHooks.js').then(m =>
    m.registerSessionFileAccessHooks(),
  ) // Register session file access analytics hooks
  initSinks() // Attach error log + analytics sinks and drain queued events

  // Session-success-rate denominator. Emit immediately after the analytics
  // sink is attached — before any parsing, fetching, or I/O that could throw.
  // inc-3694 (P0 CHANGELOG crash) threw at checkForReleaseNotes below; every
  // event after this point was dead. This beacon is the earliest reliable
  // "process started" signal for release health monitoring.
  logEvent('tengu_started', {})

  void prefetchApiKeyFromApiKeyHelperIfSafe(getIsNonInteractiveSession()) // Prefetch safely - only executes if trust already confirmed
  profileCheckpoint('setup_after_prefetch')

  // Pre-fetch data for Logo v2 - await to ensure it's ready before logo renders.
  const { hasReleaseNotes } = await checkForReleaseNotes(
    getGlobalConfig().lastReleaseNotesSeen,
  )
  if (hasReleaseNotes) {
    await getRecentActivity()
  }

  // If permission mode is set to bypass, verify we're in a safe environment
  if (
    permissionMode === 'bypassPermissions' ||
    allowDangerouslySkipPermissions
  ) {
    // Check if running as root/sudo on Unix-like systems
    // Allow root if in a sandbox (e.g., TPU devspaces that require root)
    if (
      process.platform !== 'win32' &&
      typeof process.getuid === 'function' &&
      process.getuid() === 0 &&
      process.env.IS_SANDBOX !== '1' &&
      !isEnvTruthy(process.env.CLAUDE_CODE_BUBBLEWRAP)
    ) {
      // biome-ignore lint/suspicious/noConsole:: intentional console output
      console.error(
        `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`,
      )
      process.exit(1)
    }

  }

  if (process.env.NODE_ENV === 'test') {
    return
  }

  // Log tengu_exit event from the last session?
  const projectConfig = getCurrentProjectConfig()
  if (
    projectConfig.lastCost !== undefined &&
    projectConfig.lastDuration !== undefined
  ) {
    logEvent('tengu_exit', {
      last_session_cost: projectConfig.lastCost,
      last_session_api_duration: projectConfig.lastAPIDuration,
      last_session_tool_duration: projectConfig.lastToolDuration,
      last_session_duration: projectConfig.lastDuration,
      last_session_lines_added: projectConfig.lastLinesAdded,
      last_session_lines_removed: projectConfig.lastLinesRemoved,
      last_session_total_input_tokens: projectConfig.lastTotalInputTokens,
      last_session_total_output_tokens: projectConfig.lastTotalOutputTokens,
      last_session_total_cache_creation_input_tokens:
        projectConfig.lastTotalCacheCreationInputTokens,
      last_session_total_cache_read_input_tokens:
        projectConfig.lastTotalCacheReadInputTokens,
      last_session_fps_average: projectConfig.lastFpsAverage,
      last_session_fps_low_1_pct: projectConfig.lastFpsLow1Pct,
      last_session_id:
        projectConfig.lastSessionId as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      ...projectConfig.lastSessionMetrics,
    })
    // Note: We intentionally don't clear these values after logging.
    // They're needed for cost restoration when resuming sessions.
    // The values will be overwritten when the next session exits.
  }
}
