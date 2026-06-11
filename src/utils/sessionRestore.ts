import type { UUID } from 'crypto'
import { dirname } from 'path'
import {
  getMainLoopModelOverride,
  getSessionId,
  setMainLoopModelOverride,
  setMainThreadAgentType,
  switchSession,
} from '../bootstrap/state.js'
import type { AppState } from '../state/AppState.js'
import type { AgentColorName } from '../tools/AgentTool/agentColorManager.js'
import {
  type AgentDefinition,
  type AgentDefinitionsResult,
  getActiveAgentsFromList,
  getAgentDefinitionsWithOverrides,
} from '../tools/AgentTool/loadAgentsDir.js'
import { TODO_WRITE_TOOL_NAME } from '../tools/TodoWriteTool/constants.js'
import { asSessionId } from '../types/ids.js'
import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
  PersistedWorktreeSession,
} from '../types/logs.js'
import type { Message } from '../types/message.js'
import { renameRecordingForSession } from './asciicast.js'
import {
  type AttributionState,
} from './commitAttribution.js'
import { updateSessionName } from './concurrentSessions.js'
import { logForDebugging } from './debug.js'
import type { FileHistorySnapshot } from './fileHistory.js'
import { fileHistoryRestoreStateFromLog } from './fileHistory.js'
import { createSystemMessage } from './messages.js'
import { parseUserSpecifiedModel } from './model/model.js'
import {
  adoptResumedSessionFile,
  recordContentReplacement,
  resetSessionFilePointer,
  restoreSessionMetadata,
} from './sessionStorage.js'
import { isTodoV2Enabled } from './tasks.js'
import type { TodoList } from './todo/types.js'
import { TodoListSchema } from './todo/types.js'
import type { ContentReplacementRecord } from './toolResultStorage.js'

type ResumeResult = {
  messages?: Message[]
  fileHistorySnapshots?: FileHistorySnapshot[]
  contextCollapseCommits?: ContextCollapseCommitEntry[]
  contextCollapseSnapshot?: ContextCollapseSnapshotEntry
}

/**
 * Scan the transcript for the last TodoWrite tool_use block and return its todos.
 * Used to hydrate AppState.todos on SDK --resume so the model's todo list
 * survives session restarts without file persistence.
 */
function extractTodosFromTranscript(messages: Message[]): TodoList {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.type !== 'assistant') continue
    const toolUse = msg.message.content.find(
      block => block.type === 'tool_use' && block.name === TODO_WRITE_TOOL_NAME,
    )
    if (!toolUse || toolUse.type !== 'tool_use') continue
    const input = toolUse.input
    if (input === null || typeof input !== 'object') return []
    const parsed = TodoListSchema().safeParse(
      (input as Record<string, unknown>).todos,
    )
    return parsed.success ? parsed.data : []
  }
  return []
}

/**
 * Restore session state (file history, attribution, todos) from log on resume.
 * Used by both SDK (print.ts) and interactive (REPL.tsx, main.tsx) resume paths.
 */
export function restoreSessionStateFromLog(
  result: ResumeResult,
  setAppState: (f: (prev: AppState) => AppState) => void,
): void {
  // Restore file history state
  if (result.fileHistorySnapshots && result.fileHistorySnapshots.length > 0) {
    fileHistoryRestoreStateFromLog(result.fileHistorySnapshots, newState => {
      setAppState(prev => ({ ...prev, fileHistory: newState }))
    })
  }

  // Restore TodoWrite state from transcript (SDK/non-interactive only).
  // Interactive mode uses file-backed v2 tasks, so AppState.todos is unused there.
  if (!isTodoV2Enabled() && result.messages && result.messages.length > 0) {
    const todos = extractTodosFromTranscript(result.messages)
    if (todos.length > 0) {
      const agentId = getSessionId()
      setAppState(prev => ({
        ...prev,
        todos: { ...prev.todos, [agentId]: todos },
      }))
    }
  }
}

/**
 * Compute restored attribution state from log snapshots.
 * Used for computing initial state before render (e.g., main.tsx --continue).
 * Returns undefined if attribution feature is disabled or no snapshots exist.
 */
export function computeRestoredAttributionState(
  _result: ResumeResult,
): AttributionState | undefined {
  return undefined
}

/**
 * Compute standalone agent context (name/color) for session resume.
 * Used for computing initial state before render (per CLAUDE.md guidelines).
 * Returns undefined if no name/color is set on the session.
 */
export function computeStandaloneAgentContext(
  agentName: string | undefined,
  agentColor: string | undefined,
): AppState['standaloneAgentContext'] | undefined {
  if (!agentName && !agentColor) {
    return undefined
  }
  return {
    name: agentName ?? '',
    color: (agentColor === 'default' ? undefined : agentColor) as
      | AgentColorName
      | undefined,
  }
}

/**
 * Restore agent setting from a resumed session.
 *
 * When resuming a conversation that used a custom agent, this re-applies the
 * agent type and model override (unless the user specified --agent on the CLI).
 * Mutates bootstrap state via setMainThreadAgentType / setMainLoopModelOverride.
 *
 * Returns the restored agent definition and its agentType string, or undefined
 * if no agent was restored.
 */
export function restoreAgentFromSession(
  agentSetting: string | undefined,
  currentAgentDefinition: AgentDefinition | undefined,
  agentDefinitions: AgentDefinitionsResult,
): {
  agentDefinition: AgentDefinition | undefined
  agentType: string | undefined
} {
  // If user already specified --agent on CLI, keep that definition
  if (currentAgentDefinition) {
    return { agentDefinition: currentAgentDefinition, agentType: undefined }
  }

  // If session had no agent, clear any stale bootstrap state
  if (!agentSetting) {
    setMainThreadAgentType(undefined)
    return { agentDefinition: undefined, agentType: undefined }
  }

  const resumedAgent = agentDefinitions.activeAgents.find(
    agent => agent.agentType === agentSetting,
  )
  if (!resumedAgent) {
    logForDebugging(
      `Resumed session had agent "${agentSetting}" but it is no longer available. Using default behavior.`,
    )
    setMainThreadAgentType(undefined)
    return { agentDefinition: undefined, agentType: undefined }
  }

  setMainThreadAgentType(resumedAgent.agentType)

  // Apply agent's model if user didn't specify one
  if (
    !getMainLoopModelOverride() &&
    resumedAgent.model &&
    resumedAgent.model !== 'inherit'
  ) {
    setMainLoopModelOverride(parseUserSpecifiedModel(resumedAgent.model))
  }

  return { agentDefinition: resumedAgent, agentType: resumedAgent.agentType }
}

/**
 * Refresh agent definitions after a coordinator/normal mode switch.
 *
 * When resuming a session that was in a different mode (coordinator vs normal),
 * the built-in agents need to be re-derived to match the new mode. CLI-provided
 * agents (from --agents flag) are merged back in.
 */
export async function refreshAgentDefinitionsForModeSwitch(
  _modeWasSwitched: boolean,
  _currentCwd: string,
  _cliAgents: AgentDefinition[],
  currentAgentDefinitions: AgentDefinitionsResult,
): Promise<AgentDefinitionsResult> {
  return currentAgentDefinitions
}

/**
 * Result of processing a resumed/continued conversation for rendering.
 */
export type ProcessedResume = {
  messages: Message[]
  fileHistorySnapshots?: FileHistorySnapshot[]
  contentReplacements?: ContentReplacementRecord[]
  agentName: string | undefined
  agentColor: AgentColorName | undefined
  restoredAgentDef: AgentDefinition | undefined
  initialState: AppState
}

/**
 * The loaded conversation data (return type of loadConversationForResume).
 */
type ResumeLoadResult = {
  messages: Message[]
  fileHistorySnapshots?: FileHistorySnapshot[]
  contentReplacements?: ContentReplacementRecord[]
  contextCollapseCommits?: ContextCollapseCommitEntry[]
  contextCollapseSnapshot?: ContextCollapseSnapshotEntry
  sessionId: UUID | undefined
  agentName?: string
  agentColor?: string
  agentSetting?: string
  customTitle?: string
  tag?: string
  mode?: 'coordinator' | 'normal'
  worktreeSession?: PersistedWorktreeSession | null
  prNumber?: number
  prUrl?: string
  prRepository?: string
}

/**
 * Restore worktree for resume — no-op since worktrees are not supported.
 */
export function restoreWorktreeForResume(
  _worktreeSession: PersistedWorktreeSession | null | undefined,
): void {
  // no-op
}

/**
 * Exit restored worktree — no-op since worktrees are not supported.
 */
export function exitRestoredWorktree(): void {
  // no-op
}

/**
 * Process a loaded conversation for resume/continue.
 *
 * Handles coordinator mode matching, session ID setup, agent restoration,
 * mode persistence, and initial state computation. Called by both --continue
 * and --resume paths in main.tsx.
 */
export async function processResumedConversation(
  result: ResumeLoadResult,
  opts: {
    forkSession: boolean
    sessionIdOverride?: string
    transcriptPath?: string
    includeAttribution?: boolean
  },
  context: {
    mainThreadAgentDefinition: AgentDefinition | undefined
    agentDefinitions: AgentDefinitionsResult
    currentCwd: string
    cliAgents: AgentDefinition[]
    initialState: AppState
  },
): Promise<ProcessedResume> {
  // Reuse the resumed session's ID unless --fork-session is specified
  if (!opts.forkSession) {
    const sid = opts.sessionIdOverride ?? result.sessionId
    if (sid) {
      // When resuming from a different project directory (git worktrees,
      // cross-project), transcriptPath points to the actual file; its dirname
      // is the project dir. Otherwise the session lives in the current project.
      switchSession(
        asSessionId(sid),
        opts.transcriptPath ? dirname(opts.transcriptPath) : null,
      )
      // Rename asciicast recording to match the resumed session ID so
      // getSessionRecordingPaths() can discover it during /share
      await renameRecordingForSession()
      await resetSessionFilePointer()
    }
  } else if (result.contentReplacements?.length) {
    // --fork-session keeps the fresh startup session ID. useLogMessages will
    // copy source messages into the new JSONL via recordTranscript, but
    // content-replacement entries are a separate entry type only written by
    // recordContentReplacement (which query.ts calls for newlyReplaced, never
    // the pre-loaded records). Without this seed, `claude -r {newSessionId}`
    // finds source tool_use_ids in messages but no matching replacement records
    // → they're classified as FROZEN → full content sent (cache miss, permanent
    // overage). insertContentReplacement stamps sessionId = getSessionId() =
    // the fresh ID, so loadTranscriptFile's keyed lookup will match.
    await recordContentReplacement(result.contentReplacements)
  }

  // Restore session metadata so /status shows the saved name and metadata
  // is re-appended on session exit. Fork doesn't take ownership of the
  // original session's worktree — a "Remove" on the fork's exit dialog
  // would delete a worktree the original session still references — so
  // strip worktreeSession from the fork path so the cache stays unset.
  restoreSessionMetadata(
    opts.forkSession ? { ...result, worktreeSession: undefined } : result,
  )

  if (!opts.forkSession) {
    // Cd back into the worktree the session was in when it last exited.
    // Done after restoreSessionMetadata (which caches the worktree state
    // from the transcript) so if the directory is gone we can override
    // the cache before adoptResumedSessionFile writes it.
    restoreWorktreeForResume(result.worktreeSession)

    // Point sessionFile at the resumed transcript and re-append metadata
    // now. resetSessionFilePointer above nulled it (so the old fresh-session
    // path doesn't leak), but that blocks reAppendSessionMetadata — which
    // bails on null — from running in the exit cleanup handler. For fork,
    // useLogMessages populates a *new* file via recordTranscript on REPL
    // mount; the normal lazy-materialize path is correct there.
    adoptResumedSessionFile()
  }

  // Restore agent setting from resumed session
  const { agentDefinition: restoredAgent, agentType: resumedAgentType } =
    restoreAgentFromSession(
      result.agentSetting,
      context.mainThreadAgentDefinition,
      context.agentDefinitions,
    )

  // Compute initial state before render (per CLAUDE.md guidelines)
  const restoredAttribution = opts.includeAttribution
    ? computeRestoredAttributionState(result)
    : undefined
  const standaloneAgentContext = computeStandaloneAgentContext(
    result.agentName,
    result.agentColor,
  )
  void updateSessionName(result.agentName)
  const refreshedAgentDefs = await refreshAgentDefinitionsForModeSwitch(
    false,
    context.currentCwd,
    context.cliAgents,
    context.agentDefinitions,
  )

  return {
    messages: result.messages,
    fileHistorySnapshots: result.fileHistorySnapshots,
    contentReplacements: result.contentReplacements,
    agentName: result.agentName,
    agentColor: (result.agentColor === 'default'
      ? undefined
      : result.agentColor) as AgentColorName | undefined,
    restoredAgentDef: restoredAgent,
    initialState: {
      ...context.initialState,
      ...(resumedAgentType && { agent: resumedAgentType }),
      ...(restoredAttribution && { attribution: restoredAttribution }),
      ...(standaloneAgentContext && { standaloneAgentContext }),
      agentDefinitions: refreshedAgentDefs,
    },
  }
}
