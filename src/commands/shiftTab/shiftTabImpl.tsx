import * as React from 'react';
import type { LocalJSXCommandCall } from '../types/command.js';

// Simple mode cycle order: default -> acceptEdits -> plan -> bypassPermissions -> default
const MODE_CYCLE: Record<string, string> = {
  default: 'acceptEdits',
  acceptEdits: 'plan',  
  plan: 'bypassPermissions',
  bypassPermissions: 'default',
};

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const appState = context.getAppState();
  const currentMode = appState.toolPermissionContext.mode;
  const nextMode = MODE_CYCLE[currentMode] || 'default';
  context.setAppState?.({ ...appState, toolPermissionContext: { ...appState.toolPermissionContext, mode: nextMode } });
  onDone(`Switched to ${nextMode} mode`);
};
