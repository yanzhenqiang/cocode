# TODO

## Done
- [x] Remove --bare mode, --worktree, --agent CLI flags
- [x] Remove LSP module, trust dialog, ctrl+r history search
- [x] Fix critical stubs
- [x] Delete credential modules + 17 dead files
- [x] Remove 28/33 feature flags (only REACTIVE_COMPACT remains)
- [x] Remove TeammateIdle, WorktreeCreate/Remove hooks
- [x] Remove 3 unused npm packages
- [x] Delete return-null UI stubs (StructuredDiff, HighlightedCode, LogoV2/Feed, TreeSelect, ProviderManager)
- [x] Remove mainThreadAgentDefinition

## Swarm/Teammate Residual Cleanup (next big task)

**Swarm references: ~189** across files:
- `screens/REPL.tsx` (26)
- `components/PromptInput/` (14+24)
- `hooks/toolPermission/handlers/swarmWorkerHandler.ts` (13)
- `hooks/useSwarmPermissionPoller.ts` (11)
- `hooks/useSwarmInitialization.ts` (7)
- `components/PromptInput/useSwarmBanner.ts` (5+24)
- `utils/teammate.ts` (56)
- `utils/api.ts` (12)
- etc.

**Teammate references: ~1,049** across files:
- `components/PromptInput/PromptInput.tsx` (66)
- `hooks/useBackgroundTaskNavigation.ts` (63)
- `utils/teammate.ts` (56)
- `components/tasks/BackgroundTasksDialog.tsx` (53)
- `screens/REPL.tsx` (39)
- `components/Spinner/TeammateSpinnerLine.tsx` (30)
- `tasks/InProcessTeammateTask/` (60+)
- `components/PromptInput/PromptInputFooterLeftSide.tsx` (36)
- etc.

### Approach
1. Delete files only used by Swarm/Teammate
2. Clean references from shared files (REPL.tsx, PromptInput.tsx)
3. Remove hooks: useSwarmPermissionPoller, useSwarmInitialization, useSwarmBanner
4. Remove tasks: InProcessTeammateTask
5. Clean up state/AppStateStore.tsx swarm fields

## Remaining Stubs
- [ ] Plugin management UI — `useManagePlugins.ts`
- [ ] MCP OAuth/keychain
- [ ] Marketplace — `parsePluginIdentifier`, `parseChatgptAccountId`
- [ ] REACTIVE_COMPACT feature flag (1 remaining)
