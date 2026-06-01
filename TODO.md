# TODO

## Stub Cleanup Plan

### Already fixed stubs
- [x] `getPluginSkills = () => []` → `async () => []` (`src/commands.ts:60`)
- [x] `loadAllPluginsCacheOnly = () => []` → `async () => ({ enabled: [], errors: [] })` (`src/services/mcp/config.ts:22`)
- [x] `createStatsStore()` returned `{}`, missing `observe` → added no-op (`src/context/stats.ts`)
- [x] `MarketplaceSourceSchema` was `type` not `const` → fixed (`src/utils/settings/types.ts`)

### Known stubs (placeholder functions returning empty/undefined)
- `getPluginCommands = () => []` (`src/commands.ts:58`)
- `clearPluginCommandCache = () => {}` (`src/commands.ts:59`)
- `clearPluginSkillsCache = () => {}` (`src/commands.ts:61`)
- `getPluginMcpServers = () => []` (`src/services/mcp/config.ts:21`)
- Many more `const getXxx = () => ...` patterns from removed plugin system

### Default-false feature flags (dead code behind feature('XXX'))

From `scripts/build-node.ts` — these are NOT in the enabled list so always false:

| Flag | Files |
|------|-------|
| `BUILDING_CLAUDE_APPS` | `src/skills/bundled/index.ts` |
| `REVIEW_ARTIFACT` | `src/skills/bundled/index.ts` |
| `RUN_SKILL_GENERATOR` | `src/skills/bundled/index.ts` |
| `ULTRAPLAN` | `src/utils/ultraplan/`, `src/utils/processUserInput/` |
| `HISTORY_SNIP` | `src/QueryEngine.ts` |
| `STREAMLINED_OUTPUT` | `src/cli/print.ts` |
| `FILE_PERSISTENCE` | `src/cli/print.ts` |
| `DOWNLOAD_USER_SETTINGS` | `src/cli/print.ts` |
| `REACTIVE_COMPACT` | `src/commands/compact/` |
| `BASH_CLASSIFIER` | `src/cli/structuredIO.ts`, various |
| `SKILL_IMPROVEMENT` | `src/utils/hooks/` |
| `TREE_SITTER_BASH` | bash parser |
| `TREE_SITTER_BASH_SHADOW` | bash parser |
| `ANTI_DISTILLATION_CC` | `src/services/api/` |
| `AGENT_MEMORY_SNAPSHOT` | agent memory |
| `AUTO_THEME` | UI |
| `BREAK_CACHE_COMMAND` | `src/commands/` |
| `BYOC_ENVIRONMENT_RUNNER` | runner |
| `COMPACTION_REMINDERS` | compact |
| `CONNECTOR_TEXT` | connectors |
| `CONVERSATION_ARC` | context |
| `EXPERIMENTAL_SKILL_SEARCH` | search |
| `HYBRID_CONTEXT_STRATEGY` | context |
| `IS_LIBC_GLIBC/MUSL` | platform |
| `KAIROS` | cron scheduler |
| `LODESTONE` | unknown |
| `MEMORY_SHAPE_TELEMETRY` | memory |
| `MULTI_TURN_CONTEXT` | context |
| `NATIVE_CLIPBOARD_IMAGE` | clipboard |
| `SELF_HOSTED_RUNNER` | runner |
| `TEMPLATES` | templates |
| `UNATTENDED_RETRY` | retry |
| `WORKFLOW_SCRIPTS` | workflow |

## Cleanup Strategy
- Process ONE flag/stub at a time
- Build + test (8/8) after each change
- Commit after each successful removal
