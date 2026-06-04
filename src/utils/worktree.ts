// ============================================================
// Stub file for Termux/Android: worktree operations (git worktrees,
// tmux sessions, etc.) are not available on this platform.
// All exported function bodies are replaced with minimal stubs.
// Type exports are preserved unchanged.
// ============================================================

const VALID_WORKTREE_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/
const MAX_WORKTREE_SLUG_LENGTH = 64

export function validateWorktreeSlug(slug: string): void {
  if (slug.length > MAX_WORKTREE_SLUG_LENGTH) {
    throw new Error(
      `Invalid worktree name: must be ${MAX_WORKTREE_SLUG_LENGTH} characters or fewer (got ${slug.length})`,
    )
  }
  for (const segment of slug.split('/')) {
    if (segment === '.' || segment === '..') {
      throw new Error(
        `Invalid worktree name "${slug}": must not contain "." or ".." path segments`,
      )
    }
    if (!VALID_WORKTREE_SLUG_SEGMENT.test(segment)) {
      throw new Error(
        `Invalid worktree name "${slug}": each "/"-separated segment must be non-empty and contain only letters, digits, dots, underscores, and dashes`,
      )
    }
  }
}

export type WorktreeSession = {
  originalCwd: string
  worktreePath: string
  worktreeName: string
  worktreeBranch?: string
  originalBranch?: string
  originalHeadCommit?: string
  sessionId: string
  tmuxSessionName?: string
  hookBased?: boolean
  creationDurationMs?: number
  usedSparsePaths?: boolean
}

export function getCurrentWorktreeSession(): WorktreeSession | null {
  return null
}

export function restoreWorktreeSession(_session: WorktreeSession | null): void {
  // no-op
}

export function generateTmuxSessionName(
  _repoPath: string,
  _branch: string,
): string {
  return ''
}

export async function withGitWorktreeMutationLock<T>(
  _repoRoot: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn()
}

export function _resetGitWorktreeMutationLocksForTesting(): void {
  // no-op
}

export function worktreeBranchName(_slug: string): string {
  return ''
}

export function buildRevParseFailureMessage(
  baseBranch: string,
  stderr: string,
  exitCode: number,
): string {
  const detail = stderr.trim() || `exit code ${exitCode}`
  const hint =
    baseBranch === 'HEAD'
      ? ' (HEAD has no resolvable commit — make at least one commit, or check whether git is installed and on PATH)'
      : ''
  return `Failed to resolve base branch "${baseBranch}": ${detail}${hint}`
}

export async function copyWorktreeIncludeFiles(
  _repoRoot: string,
  _worktreePath: string,
): Promise<string[]> {
  return []
}

export function parsePRReference(_input: string): number | null {
  return null
}

export async function isTmuxAvailable(): Promise<boolean> {
  return false
}

export function getTmuxInstallInstructions(): string {
  return 'tmux not available'
}

export async function createTmuxSessionForWorktree(
  _sessionName: string,
  _worktreePath: string,
): Promise<{ created: boolean; error?: string }> {
  return { created: false }
}

export async function killTmuxSession(
  _sessionName: string,
): Promise<boolean> {
  return false
}

export async function createWorktreeForSession(
  _sessionId: string,
  _slug: string,
  _tmuxSessionName?: string,
  _options?: { prNumber?: number },
): Promise<WorktreeSession> {
  throw new Error('worktrees not supported')
}

export async function keepWorktree(): Promise<void> {
  // no-op
}

export async function cleanupWorktree(): Promise<void> {
  // no-op
}

export async function createAgentWorktree(
  _slug: string,
): Promise<{
  worktreePath: string
  worktreeBranch?: string
  headCommit?: string
  gitRoot?: string
}> {
  throw new Error('worktrees not supported')
}

export async function removeAgentWorktree(
  _worktreePath: string,
  _worktreeBranch?: string,
  _gitRoot?: string,
): Promise<boolean> {
  return false
}

export async function cleanupStaleAgentWorktrees(
  _cutoffDate: Date,
): Promise<number> {
  return 0
}

export async function hasWorktreeChanges(
  _worktreePath: string,
  _headCommit: string,
): Promise<boolean> {
  return false
}

export async function execIntoTmuxWorktree(
  _args: string[],
): Promise<{
  handled: boolean
  error?: string
}> {
  return { handled: false, error: 'worktrees not supported' }
}
