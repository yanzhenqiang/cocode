# TODO

## Completed
- [x] Remove --bare mode
- [x] Remove --worktree / --tmux CLI flags
- [x] Remove --agent / --agents CLI options
- [x] Remove ctrl+r history search
- [x] Fix stub: getPluginSkills, loadAllPluginsCacheOnly, createStatsStore, MarketplaceSourceSchema

## Stub Cleanup
Plugin system stubs that can be removed after verifying no callers depend on their return values:
- `getPluginCommands = () => []` (`src/commands.ts:58`)
- `clearPluginCommandCache = () => {}` (`src/commands.ts:59`)
- `clearPluginSkillsCache = () => {}` (`src/commands.ts:61`)
- `getPluginMcpServers = () => []` (`src/services/mcp/config.ts:21`)
- Others TBD

## Default-False Feature Flags to Clean
- [ ] TREE_SITTER_BASH
- [ ] STREAMLINED_OUTPUT
- [ ] REVIEW_ARTIFACT / BUILDING_CLAUDE_APPS / RUN_SKILL_GENERATOR
- [ ] KAIROS
- [ ] ... 33 total, pick one at a time
