# TODO: Code Cleanup

## This session: 7 stub directories FULLY DELETED

| # | Directory | Size | Importers Fixed |
|---|-----------|------|-----------------|
| 1 | `services/oauth/` | 3 files | print.ts, ConsoleOAuthFlow.tsx, useCanSwitchToExistingSubscription.tsx |
| 2 | `services/PromptSuggestion/` | 2 files | PromptInput.tsx, REPL.tsx, AppStateStore.ts, LocalAgentTask.tsx, LocalShellTask.tsx |
| 3 | `hooks/usePromptSuggestion.ts` | 1 file | PromptInput.tsx |
| 4 | `utils/secureStorage/` | 4 files | main.tsx, auth.ts, authPortable.ts, mcp/auth.ts, mcp/client.ts, codexCredentials.ts, geminiCredentials.ts, githubModelsCredentials.ts, AssistantTextMessage.tsx |
| 5 | `utils/nativeInstaller/` | 1 file | install.tsx, useInstallMessages.tsx, status.tsx, Doctor.tsx, doctorDiagnostic.ts |
| 6 | `utils/deepLink/` | 1 file | backgroundHousekeeping.ts, interactiveHelpers.tsx, main.tsx |
| 7 | `utils/plugins/` | 26 files | ~40 importers across main.tsx, print.ts, QueryEngine.ts, setup.ts, commands.ts, lsp/config.ts, mcp/config.ts, and 15+ hooks/commands |

### Also deleted
- `commands/upgrade/` (2 files, 0 importers)
- `screens/replStartupGates.ts` (0 importers after cleanup)

### Caller modifications
- All imports replaced with inline minimal stubs
- `OAuthService` → inline stub class in print.ts, ConsoleOAuthFlow.tsx
- LODESTONE feature block removed from backgroundHousekeeping.ts, main.tsx
- setup.ts dynamic import → no-op Promise.resolve

## Pre-existing cleanup (from prior sessions)

| Batch | Module | Lines |
|-------|--------|-------|
| 35-63 | Various (OOM fixes, dead tools/commands, services, etc.) | ~34,700 |

## Still present (not stub-related)

| Module | Size | Notes |
|--------|------|-------|
| `services/mcp/` | 448KB | MCP — required for subagents |
| `services/compact/` | 176KB | Context compaction — core |
| `services/lsp/` | 96KB | LSP integration |
| `components/` | 3.3MB | React UI — compiled |
| `utils/shell/` | 120KB | Shell snapshots |
