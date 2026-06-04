/**
 * Tree-sitter-based command prefix extraction (DISABLED in external builds).
 *
 * The tree-sitter bash parser is not available in this build. Prefix extraction
 * for permission prompts is handled by the sync path
 * (getSimpleCommandPrefix/getFirstWordPrefix in bashPermissions.ts).
 *
 * These functions are kept as stubs so that existing importers
 * (BashPermissionRequest.tsx) continue to compile. They always return
 * null / empty array, matching the behavior when the tree-sitter parser was off.
 */

export async function getCommandPrefixStatic(
  _command: string,
  _recursionDepth = 0,
  _wrapperCount = 0,
): Promise<{ commandPrefix: string | null } | null> {
  return null
}

export async function getCompoundCommandPrefixesStatic(
  _command: string,
  _excludeSubcommand?: (subcommand: string) => boolean,
): Promise<string[]> {
  return []
}
