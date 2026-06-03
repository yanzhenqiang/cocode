# TODO

## Done
- [x] Remove --bare mode, --worktree, --agent CLI flags
- [x] Remove LSP module, trust dialog, ctrl+r history search
- [x] Fix critical stubs
- [x] Delete credential modules + 17 dead files
- [x] Remove 28/33 feature flags (only REACTIVE_COMPACT remains)
- [x] Remove TeammateIdle, WorktreeCreate/Remove hooks
- [x] Remove 3 unused npm packages
- [x] Delete return-null UI stubs
- [x] Remove mainThreadAgentDefinition
- [x] Massive swarm/teammate cleanup (~72% eliminated)

## Swarm/Teammate Residual (94 Swarm + 294 Teammate, mostly type refs)
The remaining references are almost all in type definitions (`Task.ts`, `types.ts`) and serialization code needed for backward compatibility with saved sessions. These are harmless and don't execute at runtime.

## Remaining
- [ ] REACTIVE_COMPACT feature flag (1 remaining flag)
- [ ] Plugin management UI stubs — `useManagePlugins.ts`
- [ ] MCP OAuth/keychain stubs
- [ ] Marketplace stubs — `parsePluginIdentifier`, `parseChatgptAccountId`

## Stats
- Started: 354,397 lines, 1,425 files
- Current: 346,288 lines, ~1,380 files
- Reduced: 8,109 lines, ~45 files
