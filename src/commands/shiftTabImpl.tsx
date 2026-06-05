import * as React from 'react';
import type { LocalJSXCommandCall } from '../types/command.js';
import { cyclePermissionMode } from '../utils/permissions/getNextPermissionMode.js';

export const call: LocalJSXCommandCall = async (onDone, context) => {
  const appState = context.getAppState();
  const { nextMode } = cyclePermissionMode(appState.toolPermissionContext);
  context.setAppState?.({ ...appState, toolPermissionContext: { ...appState.toolPermissionContext, mode: nextMode } });
  onDone(`Switched to ${nextMode} mode`);
};
