# TODO

## All Major Cleanup Complete

### Round 1: Feature & Stub Cleanup (~9,700 lines)
- [x] 33/33 dead feature flags removed
- [x] 70+ stubs eliminated to zero
- [x] LSP, trust dialog, ctrl+r, --bare, --worktree, --agent removed
- [x] Plugin management system deleted (5 files)
- [x] Swarm/Teammate references ~75% eliminated

### Round 2: Dead Keyword Cleanup (~8,200 lines)
- [x] Vim mode — 2 files deleted
- [x] MiniMax usage tracking — 6 files deleted
- [x] Codex provider — 3 files deleted
- [x] Console OAuth — 1 file deleted
- [x] /diff command — 3 files deleted
- [x] Claude AI rate limit system — 4 files deleted
- [x] claude.ai MCP connectors — 1 file deleted
- [x] --workload CLI flag

## Remaining (harmless / kept intentionally)

| Category | Refs | Reason |
|----------|------|--------|
| Vim `isVimModeEnabled()` | 110 | Always false, safe dead paths |
| MiniMax provider config | 145 | Live provider registration |
| Codex comments | 17 | Documentation only |
| MCP OAuth | 567 | Needed for MCP servers (Notion) |
| claude.ai subscribers | 58 | Mostly comments |

## Stats
- Total: 354,397 → 336,812 lines (-17,585)
- Files: 1,425 → 1,355 (-70)
- Commits: 62
- Tests: 8/8 throughout
