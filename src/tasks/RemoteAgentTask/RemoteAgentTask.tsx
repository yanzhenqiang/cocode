import type { SetAppStateFn } from 'src/state/AppState.js';

export type RemoteAgentTaskState = {
  id: string
  type: 'remote_agent'
  status: string
  title: string
  isRemoteReview?: boolean
  isUltraplan?: boolean
  sessionId?: string
}

export const RemoteAgentTask = {
  async kill(_taskId: string, _setAppState: SetAppStateFn): Promise<void> {
    // Remote agent tasks are no longer supported
  },
}

export function restoreRemoteAgentTasks(_args: {
  abortController: AbortController
  getAppState: () => unknown
  setAppState: SetAppStateFn
}): void {
  // Remote agent tasks are no longer supported
}
