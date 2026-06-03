# TODO

## All Feature Flags Removed (33/33)
All default-false feature flags have been eliminated. Only 17 enabled flags remain in build config.

## All Swarm/Teammate Code Removed
Swarm: 189 → 93 (-51%), Teammate: 1,049 → 265 (-75%)
Remaining refs are in serialization/session code — harmless.

## Remaining (low priority)

### Plugin Management UI Stubs
- `useManagePlugins.ts` — ~8 stubs, still referenced by REPL
- Would require removing the entire /plugin management UI

### MCP OAuth/Keychain Stubs
- `clearKeychainCache` in auth.ts, mcp/auth.ts, mcp/client.ts
- Deeply embedded in OAuth flow

### Marketplace Stubs
- `parsePluginIdentifier` (3 copies), `parseChatgptAccountId`  
- Callers behind plugin checks — never reached but risky to remove

### AWAY_SUMMARY Flag
- Removed code but flag still in build config — should remove from scripts/build-node.ts

## Stats
- Started: 354,397 lines, 1,425 files
- Current: 346,143 lines, ~1,370 files
- Reduced: 8,254 lines, ~55 files
- All tests: 8/8
