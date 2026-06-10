import type { Notification } from 'src/context/notifications.js'
import type { PermissionMode } from '../utils/permissions/PermissionMode.js'
import type { TodoList } from 'src/utils/todo/types.js'
// Bridge module deleted — inline type stub
import type { Command } from '../commands.js'
import type { ElicitationRequestEvent } from '../services/mcp/elicitationHandler.js'
import type {
  MCPServerConnection,
  ServerResource,
} from '../services/mcp/types.js'
import {
  getEmptyToolPermissionContext,
  type Tool,
  type ToolPermissionContext,
} from '../Tool.js'
import type { TaskState } from '../tasks/types.js'
import type { AgentDefinitionsResult } from '../tools/AgentTool/loadAgentsDir.js'
import type { AllowedPrompt } from '../tools/ExitPlanModeTool/ExitPlanModeV2Tool.js'
import type { AgentId } from '../types/ids.js'
import type { Message, UserMessage } from '../types/message.js'
import type { LoadedPlugin, PluginError } from '../types/plugin.js'
import type { DeepImmutable } from '../types/utils.js'
import {
  type AttributionState,
  createEmptyAttributionState,
} from '../utils/commitAttribution.js'
import type { EffortValue } from '../utils/effort.js'
import type { FileHistoryState } from '../utils/fileHistory.js'
import type { REPLHookContext } from '../utils/hooks/postSamplingHooks.js'
import type { SessionHooksState } from '../utils/hooks/sessionHooks.js'
import type { ModelSetting } from '../utils/model/model.js'
import { getInitialSettings } from '../utils/settings/settings.js'
import type { SettingsJson } from '../utils/settings/types.js'
import { shouldEnableThinkingByDefault } from '../utils/thinking.js'
import type { Store } from './store.js'

export type CompletionBoundary =
  | { type: 'complete'; completedAt: number; outputTokens: number }
  | { type: 'bash'; command: string; completedAt: number }
  | { type: 'edit'; toolName: string; filePath: string; completedAt: number }
  | {
      type: 'denied_tool'
      toolName: string
      detail: string
      completedAt: number
    }

export type SpeculationResult = {
  messages: Message[]
  boundary: CompletionBoundary | null
  timeSavedMs: number
}

export type SpeculationState =
  | { status: 'idle' }
  | {
      status: 'active'
      id: string
      abort: () => void
      startTime: number
      messagesRef: { current: Message[] } // Mutable ref - avoids array spreading per message
      writtenPathsRef: { current: Set<string> } // Mutable ref - relative paths written to overlay
      boundary: CompletionBoundary | null
      suggestionLength: number
      toolUseCount: number
      isPipelined: boolean
      contextRef: { current: REPLHookContext }
      pipelinedSuggestion?: {
        text: string
        promptId: 'user_intent' | 'stated_intent'
        generationRequestId: string | null
      } | null
    }

export const IDLE_SPECULATION_STATE: SpeculationState = { status: 'idle' }

export type FooterItem =
  | 'tasks'
  | 'tmux'
  | 'bagel'
  | 'teams'
  | 'bridge'
  | 'companion'

export type AppState = DeepImmutable<{
  settings: SettingsJson
  verbose: boolean
  mainLoopModel: ModelSetting
  mainLoopModelForSession: ModelSetting
  statusLineText: string | undefined
  // Which footer pill is focused (arrow-key navigation below the prompt).
  toolPermissionContext: ToolPermissionContext
}> & {
  tasks: { [taskId: string]: TaskState }
  // Timestamp of last /buddy pet — CompanionSprite renders hearts while recent
  // TODO (ashwin): see if we can use utility-types DeepReadonly for this
  mcp: {
    clients: MCPServerConnection[]
    tools: Tool[]
    commands: Command[]
    resources: Record<string, ServerResource[]>
    /**
     * Incremented by /reload-plugins to trigger MCP effects to re-run
     * and pick up newly-enabled plugin MCP servers. Effects read this
     * as a dependency; the value itself is not consumed.
     */
    pluginReconnectKey: number
  }
  fileHistory: FileHistoryState
  attribution: AttributionState
  todos: { [agentId: string]: TodoList }
  notifications: {
    current: Notification | null
    queue: Notification[]
  }
  elicitation: {
    queue: ElicitationRequestEvent[]
  }
  thinkingEnabled: boolean | undefined
  sessionHooks: SessionHooksState
  // Worker sandbox permission requests (leader side) - for network access approval
  workerSandboxPermissions: {
    queue: Array<{
      requestId: string
      workerId: string
      workerName: string
      workerColor?: string
      host: string
      createdAt: number
    }>
    selectedIndex: number
  }
  // Auth version - incremented on login/logout to trigger re-fetching of auth-dependent data
  authVersion: number
  // Initial message to process (from CLI args or plan mode exit)
  // When set, REPL will process the message and trigger a query
  initialMessage: {
    message: UserMessage
    clearContext?: boolean
    mode?: PermissionMode
    // Session-scoped permission rules from plan mode (e.g., "run tests", "install dependencies")
    allowedPrompts?: AllowedPrompt[]
  } | null
  // Active overlays (Select dialogs, etc.) for Escape key coordination
  activeOverlays: ReadonlySet<string>
  // Effort value
  effortValue?: EffortValue
}

export type AppStateStore = Store<AppState>

export function getDefaultAppState(): AppState {
  const initialMode: PermissionMode = 'default'

  return {
    settings: getInitialSettings(),
    tasks: {},
    verbose: false,
    mainLoopModel: null, // alias, full name (as with --model or env var), or null (default)
    mainLoopModelForSession: null,
    statusLineText: undefined,
    toolPermissionContext: {
      ...getEmptyToolPermissionContext(),
      mode: initialMode,
    },
    fileHistory: {
      snapshots: [],
      trackedFiles: new Set(),
      snapshotSequence: 0,
    },
    attribution: createEmptyAttributionState(),
    mcp: {
      clients: [],
      tools: [],
      commands: [],
      resources: {},
      pluginReconnectKey: 0,
    },
    todos: {},
    notifications: {
      current: null,
      queue: [],
    },
    elicitation: {
      queue: [],
    },
    thinkingEnabled: shouldEnableThinkingByDefault(),
    sessionHooks: new Map(),
    workerSandboxPermissions: {
      queue: [],
      selectedIndex: 0,
    },
    authVersion: 0,
    initialMessage: null,
    effortValue: undefined,
    activeOverlays: new Set<string>(),
  }
}
