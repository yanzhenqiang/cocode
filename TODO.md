# TODO

## Done
- [x] Remove --bare mode
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search
- [x] Remove LSP module (20 files, -5910 lines)
- [x] Remove trust dialog
- [x] Fix stubs: getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema
- [x] Delete 11 dead stub files
- [x] Delete plugins/bundled
- [x] Delete autoFixConfig
- [x] Remove platform package manager detection stubs
- [x] Remove isUndercover dead code (5 files)
- [x] Remove keychain prefetch stubs
- [x] Remove clearPluginCache, getManagedPluginNames, getPluginSeedDirs
- [x] Remove plugin version sync stubs
- [x] Delete 4 empty directories

## Feature Flags Removed (26/33)
- [x] REVIEW_ARTIFACT, BUILDING_CLAUDE_APPS, RUN_SKILL_GENERATOR
- [x] ANTI_DISTILLATION_CC, STREAMLINED_OUTPUT, FILE_PERSISTENCE, HYBRID_CONTEXT_STRATEGY
- [x] COMPACTION_REMINDERS, BREAK_CACHE_COMMAND, UNATTENDED_RETRY, LODESTONE
- [x] CONVERSATION_ARC, MULTI_TURN_CONTEXT, AUTO_THEME, NATIVE_CLIPBOARD_IMAGE
- [x] SELF_HOSTED_RUNNER, BYOC_ENVIRONMENT_RUNNER, IS_LIBC_GLIBC/MUSL
- [x] DOWNLOAD_USER_SETTINGS, AGENT_MEMORY_SNAPSHOT, WORKFLOW_SCRIPTS
- [x] SKILL_IMPROVEMENT, MEMORY_SHAPE_TELEMETRY
- [x] AWAY_SUMMARY, TEMPLATES, KAIROS, CONNECTOR_TEXT
- [x] TREE_SITTER_BASH_SHADOW, ULTRAPLAN

## Remaining Dead Feature Flags (3 complex)
- [ ] BASH_CLASSIFIER (14 refs) — bash permission classifier
- [ ] EXPERIMENTAL_SKILL_SEARCH (7 refs) — skill search
- [ ] REACTIVE_COMPACT (4 refs) — compaction logic

## Remaining Stubs
- **Plugin management UI** (~15): `useManagePlugins.ts` and related
- **MCP OAuth/keychain** (~8): `clearKeychainCache` in auth/mcp
- **Marketplace/ChatGPT** (~5): `parsePluginIdentifier`, `parseChatgptAccountId`
- **Other small stubs**: `cleanupShellAliases`, `setupPluginHookHotReload`, `getPluginMcpServers`, etc.
- **main.tsx agent variables**: `agentsJson = undefined`, `agentCli = undefined`, etc.
