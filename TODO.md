# TODO: Residual Stubs Cleanup

Stubs are stepping stones — each must eventually be **fully deleted** along with all its callers.

## Remaining Stubs

### 1. `services/oauth/` (~1KB stub, was ~55KB) — 87→3 importers
- **Files**: `index.ts`, `client.ts`, `getOauthProfile.ts`, `types.ts`
- **✅ Done**: `utils/auth.ts` — OAuth imports replaced with inline stubs (Batch 51)
- **✅ Done**: `services/api/client.ts` — checkAndRefreshOAuthTokenIfNeeded removed
- **✅ Done**: `entrypoints/init.ts` — populateOAuthAccountInfoIfNeeded removed
- **✅ Done**: `cli/handlers/auth.ts` — replaced with simplified stub (Batch 52)
- **✅ Done**: `utils/config.ts` — OAuth types replaced with local aliases (Batch 53)
- **Only 3 compiled React files remain** (cannot edit):
  - `cli/print.ts` — uses OAuthService
  - `components/ConsoleOAuthFlow.tsx` — OAuth login UI
  - `hooks/notifs/useCanSwitchToExistingSubscription.tsx`
- **Status**: Stub cannot be fully deleted (compiled React blockers), but is now minimal

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

## Completed (already fully deleted or stubbed)

| Batch | Module | Lines |
|-------|--------|-------|
| 41 | `services/autoDream/` + `tasks/DreamTask/` | 972 |
| 43 | `services/MagicDocs/` | 366 |
| 44 | `commands/login/` + `logout/` | 302 |
| 45→48 | `services/settingsSync/` | 648 |
| 46→48 | `services/policyLimits/` | 663 |
| 47→48 | `services/github/` | 263 |
| 49 | `commands/install-github-app/`, `rate-limit-options/`, `sandbox-toggle/` | 2,761 |
| 50-53 | `services/oauth/` (87→3 importers, minimal stubs remain) | 1,394 |
| 54 | `services/vcr.ts` → pass-through stub | 400 |
| 55 | `codexOAuth.ts`, `codexUsage.ts`, `mockRateLimits.ts`, `rateLimitMocking.ts` | 1,124 |
| 56 | `services/api/codexOAuthShared.ts` | 141 |
| 57 | `services/mcp/xaaIdpLogin.ts` | 499 |
| 58 | `services/autoFix/` + `commands/auto-fix.ts` | 288 |
| 59 | `services/preventSleep.ts` | 165 |

## Other Large Candidates

| Module | Size | Notes |
|--------|------|-------|
| `commands/plugin/` | 304KB | Plugin system — user wants to keep subcommands |
| `utils/plugins/` | 788KB | Plugin infrastructure |
| `services/mcp/` | 464KB | MCP — used by subagents |
| `services/lsp/` | 96KB | LSP integration |
