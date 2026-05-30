# TODO: Residual Stubs Cleanup

Each stub below exists because **compiled React files** import from it — can't be properly deleted until those callers are cleaned or removed.

## Current Stubs (needed by compiled React)

### 1. `services/oauth/` (was 55KB → 1KB stub)
- **Stub files**: `index.ts`, `client.ts`, `getOauthProfile.ts`, `types.ts`
- **Blockers** (compiled React): `cli/print.ts`, `components/ConsoleOAuthFlow.tsx`, `hooks/notifs/useCanSwitchToExistingSubscription.tsx`

### 2. `services/PromptSuggestion/` (was 52KB → 1KB stub)
- **Stub files**: `promptSuggestion.ts`, `speculation.ts`
- **Hook stub**: `hooks/usePromptSuggestion.ts`
- **Blockers** (compiled React): `PromptInput.tsx`, `useTypeahead.tsx`, `REPL.tsx`, `AppState.tsx`, `AppStateStore.ts`, `LocalAgentTask.tsx`

### 3. `commands/upgrade/` (was 12KB → 1KB stub)
- **Stub files**: `index.js`, `upgrade.js`
- **Blocker** (compiled React): `rate-limit-options.tsx`

### 4. `utils/secureStorage/` (was 56KB → 1KB stub)
- **Stub files**: `index.ts`, `macOsKeychainHelpers.ts`, `keychainPrefetch.ts`
- **Blockers**: `main.tsx`, `auth.ts`, `authPortable.ts`, `mcp/auth.ts`, `mcp/client.ts`

### 5. `utils/nativeInstaller/` (was 100KB → 1KB stub)
- **Stub file**: `index.ts`
- **Blocker** (compiled React): `commands/install.tsx`, `hooks/notifs/useInstallMessages.tsx`

### 6. `utils/deepLink/` (was 36KB → 1KB stub)
- **Stub file**: `registerProtocol.ts`
- **Blocker** (compiled React): `interactiveHelpers.tsx`, `components/DesktopHandoff.tsx`

### 7. `utils/plugins/performStartupChecks.tsx` (stub only)
- **Blocker** (compiled React): `screens/REPL.tsx`

## Completed Cleanup

| Batch | Module | Lines |
|-------|--------|-------|
| 35 fix | OOM fix (logSessionTelemetry, terminalAnsi, Codex warning) | ~20 |
| 36 | AgentTool dead code (builtInAgents, remote_launched, teammate_spawned) | 92 |
| 37 | Dead tool registrations from tools.ts (9 tools) | 47 |
| 38 | Dead commands from feature flags (6 commands) | 42 |
| 39 | Ant-internal + ide/chrome/desktop/mobile commands (19 modules) | 790 |
| 40 | Zombie imports (SLEEP_TOOL_NAME, VERIFY_PLAN) | 14 |
| 41 | `services/autoDream/` + `tasks/DreamTask/` | 972 |
| 42 | `services/PromptSuggestion/` → stubs | 1,637 |
| 43 | `services/MagicDocs/` | 366 |
| 44 | `commands/login/` + `logout/` + `upgrade/` | 302 |
| 45 | `services/settingsSync/` → stubs | 648 |
| 46 | `services/policyLimits/` → stubs | 663 |
| 47 | `services/github/` → stubs | 263 |
| 48 | Proper delete settingsSync, policyLimits, github, onboard-github | 450 |
| 49 | `install-github-app/`, `rate-limit-options/`, `sandbox-toggle/` | 2,761 |
| 50 | `services/oauth/` → stubs (1,146 lines) | 1,146 |
| 51 | `utils/auth.ts` OAuth imports → inline stubs | 8 |
| 52 | `cli/handlers/auth.ts` → simplified stub | 240 |
| 53 | `utils/config.ts` OAuth types → local aliases | 4 |
| 54 | `services/vcr.ts` → pass-through stub | 400 |
| 55 | `codexOAuth.ts`, `codexUsage.ts`, `mockRateLimits.ts`, `rateLimitMocking.ts` | 1,124 |
| 56 | `services/api/codexOAuthShared.ts` | 141 |
| 57 | `services/mcp/xaaIdpLogin.ts` | 499 |
| 58 | `services/autoFix/` + `commands/auto-fix.ts` | 288 |
| 59 | `services/preventSleep.ts` | 165 |
| 60 | Plugin marketplace system (33 files) | 15,628 |
| 61 | Plugin CLI commands from main.tsx | 449 |
| 62 | `utils/nativeInstaller/` + `utils/deepLink/` → stubs | 3,685 |
| 63 | `utils/secureStorage/` → stubs | 993 |

**Total: ~34,700 lines deleted across 29 batches**

## Other Large Candidates

| Module | Size | Notes |
|--------|------|-------|
| `utils/plugins/` | 568KB | Plugin loading/schemas — core for skill discovery |
| `utils/shell/` | 120KB | Shell snapshots — could potentially be slimmed |
| `services/mcp/` | 448KB | MCP — required for subagents |
| `services/compact/` | 176KB | Context compaction — core |
| `services/lsp/` | 96KB | LSP integration |
| `components/` | 3.3MB | React UI — compiled, can't easily delete |
