# TODO: Residual Stubs Cleanup

Stubs are stepping stones — each must eventually be **fully deleted** along with all its callers.

## Remaining Stubs

### 1. `services/oauth/` (~1KB stub, was ~55KB) [Batch 50+51: 1146→auth.ts decoupled]
- **Files**: `index.ts`, `client.ts`, `getOauthProfile.ts`, `types.ts`
- **✅ Done**: `utils/auth.ts` — OAuth imports replaced with inline stubs (Batch 51)
- **✅ Done**: `services/api/client.ts` — checkAndRefreshOAuthTokenIfNeeded removed
- **✅ Done**: `entrypoints/init.ts` — populateOAuthAccountInfoIfNeeded removed
- **Remaining blockers**:
  - `cli/handlers/auth.ts` — uses OAuthService, createAndStoreApiKey, etc (login deleted, handler is dead)
  - `utils/config.ts` — OAuth account types
  - `services/api/bootstrap.ts`, `codexOAuth.ts`, `grove.ts`, `usage.ts`, `firstTokenDate.ts`
  - `services/mcp/auth.ts`, `claudeai.ts`, `client.ts`, `xaaIdpLogin.ts`
  - `components/ConsoleOAuthFlow.tsx`, `LogoV2.tsx`, `MCPRemoteServerMenu.tsx` (compiled React)
  - `utils/apiPreconnect.ts`, `betas.ts`, `env.ts`, `fastMode.ts`, `http.ts`
  - `utils/plugins/marketplaceManager.ts`, `secureStorage/macOsKeychainHelpers.ts`
  - `hooks/notifs/useCanSwitchToExistingSubscription.tsx` (compiled React)
- **Next**: Clean `cli/handlers/auth.ts` → delete oauth stub

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
