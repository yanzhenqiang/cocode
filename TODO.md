# TODO — Next Round

## Dead Keyword Cleanup

| Keyword | Refs | 说明 |
|---------|------|------|
| `oauth` / `OAuth` | 863 | OAuth 认证流程（token 刷新、keychain、login） |
| `codex` / `Codex` | 430 | ChatGPT Codex API 集成、用量统计、shim |
| `claude.ai` / `ClaudeAI` | 350 | Anthropic 订阅检测、rate limit、billing |
| `minimax` / `MiniMax` | 239 | MiniMax 用量统计面板 |
| `vim` / `Vim` | 169 | Vim 编辑模式 |
| `chatgpt` / `ChatGPT` | 22 | ChatGPT 账号解析、provider |

**总计 ~2,073 引用**

## Feature Modules to Delete

- [ ] **Vim 模式** (~169 refs) — 终端 vim 按键绑定
- [ ] **Codex 集成** (~430 refs) — ChatGPT Codex API provider、用量面板
- [ ] **MiniMax 用量** (~239 refs) — MiniMax 使用量统计 UI
- [ ] **OAuth 残留** (~863 refs) — keychain、token refresh、login flow

## Previous Round Stats

- 46 commits, -9,674 lines, -65 files
- 70+ stubs eliminated
- 33 feature flags removed
- Swarm/Teammate ~75% cleaned
