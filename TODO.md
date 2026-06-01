# TODO

## ~~MCP Config Loading Breaks tmux send-keys~~ (FIXED)

**Root cause**: `loadAllPluginsCacheOnly` stub in `src/services/mcp/config.ts:22` returned `() => []` (empty array), but the code at `getClaudeCodeMcpConfigs` line 1112 expects `pluginResult.errors.length` — the result shaped as `{ enabled: [], errors: [] }`. Accessing `.errors` on an array returned `undefined`, then `.length` threw TypeError. This caused `getClaudeCodeMcpConfigs` to reject, and the unhandled rejection caused the process to hang.

**Fix**: Changed `const loadAllPluginsCacheOnly = () => []` to `const loadAllPluginsCacheOnly = async () => ({ enabled: [], errors: [] })`.

**Same pattern as**: `getPluginSkills` stub fix in `src/commands.ts:60`.
