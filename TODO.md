# TODO

## Done
- [x] Remove --bare mode, --worktree, --agent CLI flags
- [x] Remove LSP module, trust dialog, ctrl+r history search
- [x] Fix critical stubs (getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema)
- [x] Delete credential modules (codexCredentials, geminiCredentials, githubModelsCredentials)
- [x] Remove 26 feature flags
- [x] Remove TeammateIdle, WorktreeCreate/Remove hooks
- [x] Remove 3 unused npm packages
- [x] Delete 6 orphaned UI components
- [x] Batch 1-5: StructuredDiff, HighlightedCode, LogoV2/Feed, ConsoleOAuthFlow/ProviderManager, TreeSelect

## Remaining

### Feature Flags (3 complex)
- [ ] BASH_CLASSIFIER (14 refs)
- [ ] EXPERIMENTAL_SKILL_SEARCH (7 refs)
- [ ] REACTIVE_COMPACT (4 refs)

### Stubs (embedded in live code)
- [ ] Plugin management UI — `useManagePlugins.ts` (~8 stubs)
- [ ] MCP OAuth/keychain — `clearKeychainCache` in auth.ts/mcp/
- [ ] Marketplace — `parsePluginIdentifier`, `parseChatgptAccountId`
- [ ] main.tsx — `mainThreadAgentDefinition` (10 refs)
