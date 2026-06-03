# TODO — ALL CLEAN

## Done
- [x] Remove --bare mode (30+ gates)
- [x] Remove --worktree / --tmux / --agent / --agents CLI flags
- [x] Remove LSP module (20 files)
- [x] Remove trust dialog
- [x] Remove ctrl+r history search
- [x] Fix critical stubs (getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema)
- [x] Delete credential modules (codexCredentials, geminiCredentials, githubModelsCredentials)
- [x] Remove 33/33 feature flags
- [x] Delete plugin management system (5 files, ~700 lines)
- [x] Delete plugin UI stubs (StructuredDiff, HighlightedCode, LogoV2/Feed, TreeSelect, ProviderManager)
- [x] Remove 9 OAuth/keychain stubs from auth.ts
- [x] Remove refreshActivePlugins and dead plugin reload system
- [x] Remove TeammateIdle, WorktreeCreate/Remove hooks
- [x] Massive swarm/teammate cleanup (~75% eliminated)
- [x] Remove all plugin command stubs from commands.ts
- [x] Remove 3 unused npm packages
- [x] **ALL 70+ STUBS ELIMINATED — ZERO REMAINING**

## Nothing Left

| Metric | Start | Final |
|--------|-------|-------|
| Lines | 354,397 | 344,723 |
| Files | 1,425 | ~1,360 |
| Feature flags | 33 dead | 0 |
| Stubs | ~70 | 0 |
| Tests | 8/8 | 8/8 |
| Commits | - | 45+ |
