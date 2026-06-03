/**
 * Standalone agent utilities for sessions with custom names/colors
 */

import type { AppState } from '../state/AppState.js'

/**
 * Returns the standalone agent name if set.
 */
export function getStandaloneAgentName(appState: AppState): string | undefined {
  return appState.standaloneAgentContext?.name
}
