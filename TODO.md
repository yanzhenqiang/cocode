# TODO

## Code Cleanup Progress

### Completed
- [x] Remove --bare mode (30+ gates)
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search (fully cleaned)
- [x] Remove LSP module (20 files, -5910 lines)
- [x] Remove trust dialog
- [x] Fix critical stubs: getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema
- [x] Delete credential modules: codexCredentials, geminiCredentials, githubModelsCredentials
- [x] Delete 11 dead stub files (TungstenTool, VerifyPlanExecution, autoFix, etc.)
- [x] Delete plugins/bundled (Karpathy guidelines)
- [x] Delete autoFixConfig + settings reference
- [x] Remove platform package manager detection stubs (detectApk, detectHomebrew, etc.)
- [x] Remove isUndercover dead code (5 files)
- [x] Remove keychain prefetch stubs
- [x] Remove clearPluginCache, getManagedPluginNames, getPluginSeedDirs
- [x] Remove plugin version sync stubs
- [x] Remove main.tsx agent variables (agentsJson, agentCli, cliAgents, agentSetting)
- [x] Delete 4 empty directories

### Feature Flags Removed (26/33)
- [x] REVIEW_ARTIFACT, BUILDING_CLAUDE_APPS, RUN_SKILL_GENERATOR
- [x] ANTI_DISTILLATION_CC, STREAMLINED_OUTPUT, FILE_PERSISTENCE, HYBRID_CONTEXT_STRATEGY
- [x] COMPACTION_REMINDERS, BREAK_CACHE_COMMAND, UNATTENDED_RETRY, LODESTONE
- [x] CONVERSATION_ARC, MULTI_TURN_CONTEXT, AUTO_THEME, NATIVE_CLIPBOARD_IMAGE
- [x] SELF_HOSTED_RUNNER, BYOC_ENVIRONMENT_RUNNER, IS_LIBC_GLIBC/MUSL
- [x] DOWNLOAD_USER_SETTINGS, AGENT_MEMORY_SNAPSHOT, WORKFLOW_SCRIPTS
- [x] SKILL_IMPROVEMENT, MEMORY_SHAPE_TELEMETRY
- [x] AWAY_SUMMARY, TEMPLATES, KAIROS, CONNECTOR_TEXT
- [x] TREE_SITTER_BASH_SHADOW, ULTRAPLAN

## Remaining

### Feature Flags (3 complex, risky)
- [ ] BASH_CLASSIFIER (14 refs) — bash permission classifier, core safety
- [ ] EXPERIMENTAL_SKILL_SEARCH (7 refs) — skill search
- [ ] REACTIVE_COMPACT (4 refs) — compaction logic

### Stubs (embedded in live code)
- Plugin management UI: `useManagePlugins.ts` (~8 stubs) — REPL dependency
- MCP OAuth/keychain: `clearKeychainCache` in auth.ts/mcp/ — OAuth flow
- Marketplace: `parsePluginIdentifier`, `parseChatgptAccountId` — plugin flow
- main.tsx: `mainThreadAgentDefinition` (10 refs) — session resume

### Stats
- 352,575 lines, 1,407 source files, 17MB dist
