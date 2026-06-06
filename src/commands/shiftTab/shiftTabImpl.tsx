import type { LocalJSXCommandCall } from '../../types/command.js';
import { getNextPermissionMode, cyclePermissionMode } from '../../utils/permissions/getNextPermissionMode.js';

const MODE_LABELS: Record<string, string> = {
  default: 'Default',
  acceptEdits: 'Accept Edits',
  plan: 'Plan',
  bypassPermissions: 'Bypass',
  auto: 'Auto',
};

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const appState = context.getAppState();
  const nextMode = getNextPermissionMode(appState.toolPermissionContext);
  const { context: newContext } = cyclePermissionMode(appState.toolPermissionContext);
  context.setAppState(prev => ({
    ...prev,
    toolPermissionContext: {
      ...newContext,
      mode: nextMode,
    },
  }));
  onDone(`Switched to ${MODE_LABELS[nextMode] ?? nextMode} mode`, { display: 'system' });
};
