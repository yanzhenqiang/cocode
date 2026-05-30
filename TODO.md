# TODO: Residual Stubs Cleanup

Stubs are stepping stones — each must eventually be **fully deleted** along with all its callers.

## Remaining Stubs

### 1. `services/oauth/` (~1KB stub, was ~55KB)
- **Files**: `index.ts`, `client.ts`, `getOauthProfile.ts`, `types.ts`
- **Blockers** (files that still import from it):
  - `utils/auth.ts` — OAuth token check, refresh, subscriber logic
  - `utils/config.ts` — OAuth account types
  - `cli/handlers/auth.ts` — auth login/logout handler (login/logout cmds already deleted)
  - `services/api/client.ts` — partially cleaned (checkAndRefreshOAuthToken removed)
  - `services/api/bootstrap.ts`, `codexOAuth.ts`, `grove.ts`, `usage.ts`, `firstTokenDate.ts`
  - `services/mcp/auth.ts`, `claudeai.ts`, `client.ts`, `xaaIdpLogin.ts`
  - `components/ConsoleOAuthFlow.tsx`, `LogoV2.tsx`, `MCPRemoteServerMenu.tsx`
  - `utils/apiPreconnect.ts`, `betas.ts`, `env.ts`, `fastMode.ts`, `http.ts`
  - `utils/plugins/marketplaceManager.ts`, `secureStorage/macOsKeychainHelpers.ts`
  - `hooks/notifs/useCanSwitchToExistingSubscription.tsx`
- **Strategy**: Clean `utils/auth.ts` OAuth paths → clean callers → delete stub

### 2. `services/PromptSuggestion/` (~1KB stub, was ~52KB)
- **Files**: `promptSuggestion.ts`, `speculation.ts`
- **Hook**: `hooks/usePromptSuggestion.ts`
- **Blockers** (compiled React, hard to edit):
  - `components/PromptInput/PromptInput.tsx` — `usePromptSuggestion()` call
  - `components/PromptInput/usePromptInputPlaceholder.ts`
  - `hooks/useTypeahead.tsx`, `useCommandKeybindings.tsx`
  - `screens/REPL.tsx` — speculation state
  - `state/AppState.tsx`, `AppStateStore.ts` — speculation fields
  - `tasks/LocalAgentTask.tsx`, `LocalShellTask.tsx`
  - `services/api/promptCacheBreakDetection.ts`
  - SDK files: `entrypoints/sdk/controlSchemas.ts`, `coreSchemas.ts`, `coreTypes.generated.ts`
- **Strategy**: These are compiled React files (react-compiler-runtime). Need to identify which can be safely modified. May require replacing speculation state fields in AppStateStore.

### 3. `commands/upgrade/` (~1KB stub, was ~12KB)
- **Files**: `index.js`, `upgrade.js`
- **Blocker**: `commands/rate-limit-options/rate-limit-options.tsx` (compiled React — uses `upgrade.isEnabled()` and `upgradeCall`)
- **Strategy**: Delete rate-limit-options first, then upgrade stub

## Completed (already fully deleted)

| Batch | Module | Lines |
|-------|--------|-------|
| 41 | `services/autoDream/` + `tasks/DreamTask/` | 972 |
| 43 | `services/MagicDocs/` | 366 |
| 44 | `commands/login/` + `logout/` | 302 |
| 45→48 | `services/settingsSync/` | 648 |
| 46→48 | `services/policyLimits/` | 663 |
| 47→48 | `services/github/` | 263 |
| 49 | `commands/install-github-app/`, `rate-limit-options/`, `sandbox-toggle/` | 2,761 |
| 50 | `services/oauth/` (partial — stubs remain) | 1,146 |

## Other Large Candidates

| Module | Size | Notes |
|--------|------|-------|
| `commands/plugin/` | 304KB | Plugin system — user wants to keep subcommands |
| `utils/plugins/` | 788KB | Plugin infrastructure |
| `services/mcp/` | 464KB | MCP — used by subagents |
| `services/lsp/` | 96KB | LSP integration |
