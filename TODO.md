# TODO

## All Cleanup Complete

### Round 1: Feature & Stub Cleanup (~9,700 lines)
- [x] 33/33 dead feature flags removed
- [x] 70+ stubs eliminated to zero
- [x] LSP, trust dialog, ctrl+r, --bare, --worktree, --agent removed
- [x] Plugin management system deleted (5 files)
- [x] Swarm/Teammate references ~75% eliminated

### Round 2: Dead Keyword Cleanup (~8,600 lines)
- [x] Vim mode — 169→2 refs (-366 lines)
- [x] MiniMax usage tracking — 6 files deleted
- [x] Codex provider — 430→0 code refs, 3 files deleted
- [x] Console OAuth — 1 file deleted
- [x] /diff command — 3 files deleted
- [x] Claude AI rate limit system — 4 files deleted
- [x] claude.ai MCP connectors — 1 file deleted
- [x] --workload CLI flag

### Remaining (harmless / kept)
| Category | Refs | Reason |
|----------|------|--------|
| Vim | 2 | Function def + editor name |
| MiniMax | 145 | Live provider registration |
| Codex | ~15 | Comments only |
| MCP OAuth | 567 | MCP servers (Notion) |
| claude.ai | ~58 | isClaudeAISubscriber() always false |
| subscriber | ~187 | isClaudeAISubscriber() callers |

### Stats
- Total: 354,397 → 336,xxx lines (~-18,000)
- Files: 1,425 → ~1,350 (~-75)
- Commits: 65
- Tests: 8/8 throughout
