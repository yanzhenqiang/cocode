# TODO

## Done
- [x] Remove --bare mode
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search
- [x] Remove LSP module
- [x] Remove trust dialog
- [x] Fix stubs: getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema
- [x] Delete 11 dead stub files (TungstenTool, VerifyPlanExecution, autoFix, etc.)
- [x] Delete plugins/bundled (Karpathy guidelines)
- [x] Delete autoFixConfig

## Next: Platform-Specific Stubs (~7)
- `src/utils/doctorDiagnostic.ts`: `detectApk`, `detectDeb`, `detectRpm`, `detectPacman`, `detectHomebrew`, `detectWinget`, `detectMise`, `getPackageManager`
- All return `() => false` or `() => null`
- Used by doctor command for health checks
- Safe to delete — Termux/Android doesn't use any package manager detection

## Remaining
- **Plugin management UI** (~15): `useManagePlugins.ts` — still used by REPL
- **MCP OAuth/keychain** (~8): deeply embedded in auth flow
- **Marketplace/ChatGPT** (~5): `parsePluginIdentifier`, `parseChatgptAccountId`
- **Default-false feature flags** (33): largest dead code blocks
