# TODO

## Done
- [x] Remove --bare mode
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search
- [x] Remove LSP module (in progress)

## Remaining Stubs (~50, mostly plugin-related)
Grouped by module:
- **Plugin management UI** (~15): `useManagePlugins.ts`, `useLspPluginRecommendation.tsx`, etc.
- **Plugin loading** (~10): `loadPluginAgents`, `loadPluginHooks`, `loadPluginMcpServers`, etc.
- **MCP OAuth/keychain** (~8): `clearKeychainCache`, `isOAuthTokenExpired`, etc.
- **Marketplace/ChatGPT** (~5): `parsePluginIdentifier`, `parseChatgptAccountId`, etc.
- **LSP diagnostics** (~5): `LSPDiagnosticRegistry`, `LSPServerManager`, etc. (being deleted now)
- **Platform-specific** (~7): `detectHomebrew`, `detectApk`, `detectDeb`, etc.

## Default-False Feature Flags (33 total)
Largest dead code blocks behind feature() gates.
