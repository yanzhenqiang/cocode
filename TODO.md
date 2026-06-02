# TODO

## Done
- [x] Remove --bare mode
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search
- [x] Remove LSP module (20 files)
- [x] Remove trust dialog
- [x] Fix stubs (getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema)
- [x] Delete credential modules + 11 dead stub files
- [x] Remove 26 feature flags
- [x] Remove TeammateIdle, WorktreeCreate/Remove hooks
- [x] Remove 3 unused npm packages
- [x] Delete 6 orphaned UI components

## Remaining

### Feature Flags (3 complex)
- [ ] BASH_CLASSIFIER (14 refs)
- [ ] EXPERIMENTAL_SKILL_SEARCH (7 refs)
- [ ] REACTIVE_COMPACT (4 refs)

### Deep UI Cleanup Plan (return-null stubs → delete file + callers)

#### Batch 1: StructuredDiff (2 files, ~15 refs)
- `components/StructuredDiff/colorDiff.ts` — `expectColorDiff()`, `getSyntaxTheme()` → `return null`
- `components/StructuredDiff/Fallback.tsx` — `return null`
- Callers: ~11 refs across messages, permissions

#### Batch 2: HighlightedCode (1 file, ~2 refs)
- `components/HighlightedCode/Fallback.tsx` — `return null`

#### Batch 3: LogoV2/Feed (4 files, ~15 refs)
- `LogoV2/Feed.tsx` — `return null`
- `LogoV2/OverageCreditUpsell.tsx` — `return null`
- Callers: REPL.tsx and others

#### Batch 4: ConsoleOAuthFlow (1 file, ~10 refs)
- `components/ConsoleOAuthFlow.tsx` — `ProviderManager()` → `return null`
- Callers: main.tsx, REPL.tsx, interactiveHelpers

#### Batch 5: TreeSelect (1 file, ~8 refs)
- `components/ui/TreeSelect.tsx` — `return null`

### Approach
For each batch:
1. Trace all callers
2. Remove imports and in-place calls (e.g. `<DeadComponent />` → `{null}`)
3. Delete the stub file
4. Build + test
