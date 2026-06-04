import { getInitialSettings } from '../settings/settings.js'

/**
 * Resolve the default shell for input-box `!` commands.
 *
 * Only 'bash' is supported.
 */
export function resolveDefaultShell(): 'bash' {
  return getInitialSettings().defaultShell ?? 'bash'
}
