# TODO

## 已完成
- [x] spinner 扫光动画 + 随机动词列表
- [x] 死依赖清理 (@orama/orama, @orama/plugin-data-persistence)
- [x] TRANSCRIPT_CLASSIFIER 全树删除 (auto mode, ~16 文件)
- [x] KAIROS 整树枯死代码
- [x] 死 React 组件 (UserChannelMessage, DiffDetailView, SandboxSettings)
- [x] 死权限弹窗 (NotebookEditPermissionRequest, WorkflowTool)
- [x] AppState 死字段 × 22: thinkingBudgetTokens, selectedIPAgentIndex, inbox, showTeammateMessagePreview, kairosEnabled, channelPermissionCallbacks, bagel*×3, replContext, teamContext, promptSuggestionEnabled, promptSuggestion×5, denialTracking, companionReaction, tungsten*×5, spinnerTip
- [x] AppState agent + agentNameRegistry 字段

---

## 清理已删字段的残留消费者代码

**原则：删 AppState 字段必须连带清理所有消费者，不留死引用。**

### 当前残留

| 字段 | 残留文件 | 状态 |
|---|---|---|
| `agentNameRegistry` | useTypeahead.tsx (已加 `\|\| []` guard) | ✓ 已处理 |
| `promptSuggestionEnabled` | usePromptInputPlaceholder.ts, Config.tsx | 待清理 |
| `promptSuggestion` | PromptInput.tsx, useTypeahead.tsx (已替换常量) | 待清理 |
| `denialTracking` | permissions.ts (3 处读取) | 待清理 |
| `companionReaction` | REPL.tsx (setAppState 已删) | ✓ 已处理 |
| `spinnerTip` | REPL.tsx (已改 undefined 常量) | ✓ 已处理 |
| `teamContext` | PromptInput, REPL, getNextPermissionMode, useTasksV2 | 待清理 |
| `inbox` | 类型残留 | 待清理 |

---

## AppState 下一批待清理字段

### 1. `agent` (987 refs) — Agent 名称可能用不到
- --agent CLI 参数 + settings 里的 agent 名
- 如果只用单 agent，这个字段只是字符串传递

### 2. `agentNameRegistry` (5 refs) — Agent 名→ID 映射
- CoordinatorAgentStatus + useTypeahead 在用
- 不用多 Agent 协作的话可能死

### 3. `fastMode` (191 refs) — 检查是否默认开启
- 快速模式（低延迟模型），191 处引用说明到处在用
- 需确认默认值

### 4. `isUltraplanMode` (4 refs) — Ultraplan 模式
- 只在 onChangeAppState 里设置和检查
- 不用 ultraplan 远程任务的话死

### 5. `viewSelectionMode` (6 refs) — Agent 视图选择
- Spinner + PromptInput 用
- 不用多 Agent 协作的话永远 'none'

### 6. `speculationSessionTimeSavedMs` (7 refs) — 推测节省时间
- 纯统计数字，PromptInput + REPL 传递
- 删了不影响功能

### 7. `pendingWorkerRequest` + `pendingSandboxRequest` (12 refs) — Worker 系统
- 子进程等待 Leader 批准的请求
- 不用 worker-leader 模式的话永远 null

### 8. `skillImprovement` (10 refs) — 技能改进建议
- useSkillImprovementSurvey hook 在用
- 需确认是否实际触发过

### 9. `standaloneAgentContext` (16 refs) — 独立 Agent 上下文
- rename/clear/REPL/ResumeConversation 都在写
- 活代码，暂留

---

## AppState 字段审计

当前 UI 的数据流: **AppState (~50 字段)** → React 组件 → Ink 渲染器

### 已删除的死字段（零组件读取）

| 字段 | 原因 |
|---|---|
| `thinkingBudgetTokens` | 类型定义有，零读取零写入，不在默认值中 |
| `selectedIPAgentIndex` | 只被 main.tsx 和 store 默认值赋值，零组件读取 |
| `inbox` | `{ messages: [] }` 只初始化，零组件读取 |
| `showTeammateMessagePreview` | false/undefined，零组件读取 |
| `kairosEnabled` | 永远 false，KAIROS 整树已砍 |

### 保留但可疑（待下沉到局部）

| 字段 | 引用数 | 说明 |
|---|---|---|
| `denialTracking` | 9 | 只在 `utils/permissions/permissions.ts` 内部使用 |
| `companionReaction` | 5 | 只有 `screens/REPL.tsx` 读写 |
| `speculation` | 8 | 只有 `PromptInput.tsx` 读一个字段 |

### 活跃字段（高频读写）

| 字段 | 说明 |
|---|---|
| `messages` | 对话消息数组，LLM 输出逐 token 追加 |
| `settings` | 用户配置 |
| `toolPermissionContext` | 当前等待审批的权限请求 |
| `tasks` | 后台任务和子 Agent 状态 |
| `mcp` | MCP 服务器连接/工具/命令 |
| `notifications` | 通知队列 |

---

## React Compiler 产物还原计划

### 背景

`src/components/` 下 255 个 `.tsx` 文件 (46k 行) **全部是 React Compiler 编译输出**，不是人写的 JSX。原始手写源码不在仓库里。

编译器输出特征：
```
// 编译器产物（当前代码）
import { c as _c } from "react-compiler-runtime";
function Component(t0) {
  const $ = _c(30);
  let t1;
  if ($[0] !== dep) { t1 = compute(); $[0] = dep; $[1] = t1; }
  else { t1 = $[1]; }  // 每个变量 4-5 行
}
```

每行业务逻辑被展开成 3-4 行 memo 缓存代码。255 个文件中约 **60-70% (~28k 行) 是编译器噪音**。

### 验证结果

已用 `FilesystemPermissionRequest.tsx` 验证：114 行编译器产物 → 73 行手写 JSX，构建+smoke 均通过。证明：
1. 可以安全替换，不需要改任何其他文件
2. 每个文件平均瘦身 35-40%
3. 全量做预计砍 **15k-18k 行**

### 执行计划（分 5 批，按风险从低到高）

#### 第 1 批：design-system/（16 文件, ~1.9k 行）— 最低风险
通用 UI 组件(Dialog/Box/Text/Tabs/Pane/Byline 等)，逻辑简单，全项目引用 50+ 次。出问题最容易发现。
- [ ] ThemedBox.tsx
- [ ] ThemedText.tsx
- [ ] Dialog.tsx
- [ ] Tabs.tsx
- [ ] Pane.tsx
- [ ] Byline.tsx
- [ ] Divider.tsx
- [ ] 其余 9 个

#### 第 2 批：messages/（33 文件, ~4.7k 行）— 低风险
消息渲染器，每个文件逻辑独立，只被 Message.tsx 路由系统调用。

#### 第 3 批：permissions/（35 文件, ~8.6k 行）— 中风险
权限弹窗，每个对应一种工具。已验证 FilesystemPermissionRequest 可行。

#### 第 4 批：PromptInput/ + mcp/ + CustomSelect/（42 文件, ~10.6k 行）— 中高风险
交互密集，逻辑复杂。需要逐个验证。

#### 第 5 批：根目录独立组件（81 文件, ~16k 行）— 高风险
包含 REPL.tsx（4151 行）、LogSelector（1543 行）等巨型文件。需要拆分+还原并行做。

---

## 大型文件拆分（后续）

- [ ] `utils/messages.ts` (5,296)
- [ ] `utils/sessionStorage.ts` (5,058)
- [ ] `utils/hooks.ts` (4,695)
- [ ] `screens/REPL.tsx` (4,151)
- [ ] `utils/attachments.ts` (3,387)
