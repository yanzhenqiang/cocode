# 未平移到新 main 的 commits 清单

新 main 重置到 `a5b5e21e`（`删除 /statusline 命令及相关代码，修复子 agent 测试`）。
以下 commits 来自原 `main` (`f7a4428d`)，尚未 cherry-pick/rebase 到新 main。

| # | Commit | Message |
|---|--------|---------|
| 1 | `713519a7` | 删除 WebSearch adapter providers 和未使用的 beta header |
| 2 | `82ccf027` | 清理未引用 beta header 并删除 3P/OpenAI 兼容逻辑 |
| 3 | `3fabee2a` | 彻底删除 cache-probe 命令及目录 |
| 4 | `12a0cb60` | 清理死代码：删除 AgentTool 目录/集成层/cache-probe 等废弃命令，移除 7 个桩化 AppState 字段，简化 LogSelector/useTypeahead 冗余分支 |
| 5 | `5c6d25dd` | 清理 utils/messages.ts 死代码 |
| 6 | `0894a839` | 清理 REPL/state 死代码：移除 sessionIngressToken 与 workerSandboxPermissions |
| 7 | `cad095d9` | 清理 viewingAgentTaskId 死代码：移除队友/子 agent 视图残留 |
| 8 | `9a943bfb` | 清理 fastMode 死代码：删除 fastMode 功能模块、UI、状态、API 参数、主题色、键位等 |
| 9 | `8e1109cc` | 删除 auto mode（TRANSCRIPT_CLASSIFIER）全部死代码 |
| 10 | `9abf9ed4` | 修复并启用 MonitorTool |
| 11 | `d4e83aac` | 删除 isAntEmployee 与 logAntError 内部 stub |
| 12 | `77cabd31` | 修复权限规则保存并移除 enterprise MCP 配置 |
| 13 | `0215f6e1` | 移除 managed 内存与规则路径（enterprise policy 残留） |
| 14 | `61ea080a` | 移除 enterprise-only 设置字段与相关逻辑 |
| 15 | `a0d22622` | 移除 XAA IdP 功能 |
| 16 | `b259ad8c` | 从 Tool 接口移除 toAutoClassifierInput |
| 17 | `4bbe8008` | 精简 analytics / GrowthBook stub 模块 |
| 18 | `5caad601` | 移除 IDE 集成存根文件 |
| 19 | `71366114` | 移除 worktree 集成存根文件 |
| 20 | `3e67f600` | 删除更多未使用函数和组件 |
| 21 | `88b2c798` | 批量删除未使用函数（第 1 波） |
| 22 | `9569bfe0` | 批量删除未使用函数（第 2 波） |
| 23 | `872395f0` | 批量删除未使用函数（第 3 波） |
| 24 | `1e21e1dd` | 批量删除未使用函数（第 4 波） |
| 25 | `60a0baf3` | 批量删除未使用函数（第 5 波） |
| 26 | `ec4b550e` | 批量删除未使用函数（第 6 波） |
| 27 | `eb803828` | 批量删除未使用函数（第 7 波） |
| 28 | `de378a08` | 批量删除未使用函数（第 8 波） |
| 29 | `9d4cf7ad` | 批量删除未使用函数（第 9 波） |
| 30 | `78f97cf0` | 批量删除未使用函数（第 10 波 / 收尾） |
| 31 | `42d67718` | 精简 CLI 选项并清理 profiler/server-config/Grove 等残留 |
| 32 | `f7a4428d` | mmmm |

## 备注

- 这些 commit 都在 `old` 分支上保留（`old` -> `f7a4428d`）。
- 平移时需要逐个 cherry-pick，每步运行 `./test_subagent.sh` 确保子 agent 测试仍然通过。
- 根据之前验证，`12a0cb60` 引入的子 agent session 创建失败是需要重点排查的回归点。
