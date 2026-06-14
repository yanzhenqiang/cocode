import { getSessionId } from '../bootstrap/state.js'
import { stringWidth } from '../ink/stringWidth.js'
import type { LogOption } from '../types/logs.js'
import { getCwd } from './cwd.js'
import { getDisplayPath } from './file.js'
import {
  truncate,
  truncateToWidth,
  truncateToWidthNoEllipsis,
} from './format.js'
import {
  getStoredChangelogFromMemory,
  parseChangelog,
  sliceReleaseNotesForDisplay,
} from './releaseNotes.js'
import { gt } from './semver.js'
import { loadMessageLogs } from './sessionStorage.js'
import { getInitialSettings } from './settings/settings.js'

// Layout constants
const MAX_LEFT_WIDTH = 50
const MAX_USERNAME_LENGTH = 20
const BORDER_PADDING = 4
const DIVIDER_WIDTH = 1
const CONTENT_PADDING = 2

export type LayoutMode = 'horizontal' | 'compact'

export type LayoutDimensions = {
  leftWidth: number
  rightWidth: number
  totalWidth: number
}

/**
 * Determines the layout mode based on terminal width
 */
/**
 * Calculates layout dimensions for the LogoV2 component
 */
/**
 * Calculates optimal left panel width based on content
 */
/**
 * Formats the welcome message based on username
 */
/**
 * Truncates a path in the middle if it's too long.
 * Width-aware: uses stringWidth() for correct CJK/emoji measurement.
 */
// Simple cache for preloaded activity
let cachedActivity: LogOption[] = []
let cachePromise: Promise<LogOption[]> | null = null

/**
 * Preloads recent conversations for display in Logo v2
 */
/**
 * Gets cached activity synchronously
 */
/**
 * Formats release notes for display, with smart truncation
 */
export function formatReleaseNoteForDisplay(
  note: string,
  maxWidth: number,
): string {
  // Simply truncate at the max width, same as Recent Activity descriptions
  return truncate(note, maxWidth)
}

/**
 * Gets the common logo display data used by both LogoV2 and CondensedLogo
 */
/**
 * Determines how to display model and billing information based on available width
 */
/**
 * Gets recent release notes for Logo v2 display
 * For ants, uses commits bundled at build time
 * For external users, uses public changelog
 */