# TODO

## 当前已完成的清理

- [x] 死代码清理：SDK schemas、MCP serve/管理命令、EXTRACT_MEMORIES、VERIFICATION_AGENT、companion/buddy、ultraplan useEffect
- [x] bootstrap/state.ts 死函数 ×24、initialState 死字段 ×5
- [x] 死文件删除：install.tsx、Doctor.tsx、coreTypes.generated.ts、coreSchemas.ts、controlTypes.ts
- [x] feature flags 关闭 ×9
- [x] REPL 渲染修复（useAppState 对象 selector 无限重渲染）
- [x] test_subagent.sh 10/10

---

## 核心问题

当前代码复杂度主要来自三个维度：

1. **PromptInput 目录 ↔ REPL.tsx 耦合太深** — 两个巨型组件通过 AppState 全局变量隐式通信，props 传递链超过 20 层
2. **AppState 是全局垃圾桶** — 所有状态都往里塞，组件间通过全局 store 隐式依赖，无法独立测试
3. **持久化逻辑散落各处** — session/config/permission 的读写跟业务逻辑混在一起，没有统一的数据层

---

## 阶段 1：理清状态边界

### 1.1 盘点当前 AppState 字段

**当前活跃字段（真正被多组件用的）：**

| 分组 | 字段 | 说明 |
|------|------|------|
| 会话 | `sessionId` (state.ts) | 当前会话 ID |
| 会话 | `sessionProjectDir` (state.ts) | transcript 存放目录 |
| 模型 | `mainLoopModel` | 当前模型 |
| 模型 | `thinkingEnabled` | 思考模式 |
| 模型 | `effortValue` | 努力级别 |
| 权限 | `toolPermissionContext` | 权限模式 + 工具白名单 |
| 权限 | `sessionBypassPermissionsMode` (state.ts) | 跳过权限 |
| 文件 | `fileHistory` | 文件编辑快照（回退用） |
| 任务 | `tasks` | 后台 bash/agent 任务 |
| MCP | `mcp` | MCP 连接/工具/命令 |
| UI | `notifications` | 通知队列 |
| UI | `settings` | 用户配置 |
| UI | `verbose` | 详细模式 |
| 沙箱 | `workerSandboxPermissions` | worker 网络权限请求 |

**已被桩化（可以进一步清理的）：**

| 字段 | 当前状态 | 后续 |
|------|----------|------|
| `ultraplanPendingChoice` | `useAppState(() => undefined)` | 从 AppState 类型和所有消费者中移除 |
| `ultraplanLaunchPending` | 同上 | 同上 |
| `spinnerTip` | 同上 | 同上 |
| `pendingWorkerRequest` | 同上 | 同上 |
| `pendingSandboxRequest` | 同上 | 同上 |
| `teamContext` | 同上 | 同上 |
| `agentDefinitions` | 模块级常量空对象 | 同上 |

### 1.2 理清状态 → 持久化的对应关系

当前写入 session JSONL 的是 `recordTranscript(messages)` —— 每次 LLM 响应后调用。但 config 和 permission 的持久化走的是完全不同的路径：

| 数据类型 | 当前持久化方式 | 写入时机 | 问题 |
|----------|---------------|----------|------|
| 对话消息 | `insertMessageChain()` → JSONL | 每轮 LLM 响应后 | ✓ 正常 |
| 用户配置 | `saveGlobalConfig()` → `~/.cocode.json` | 分散在 20+ 个调用点 | 无统一入口 |
| 权限规则 | `saveSettings()` → `settings.json` | 每次权限变更 | 与 config 混在一起 |
| 会话元数据 | `cacheSessionTitle()` / `saveTag()` → `.jsonl` 尾部 lite 条目 | 用户重命名/打 tag | write-only，读时解析 |

**目标**：所有状态变更走统一的数据层，`state → persist` 是一条清晰的单向流。

---

## 阶段 2：解开 PromptInput ↔ REPL 耦合

### 当前耦合点

```
REPL.tsx
  ├── 读取 toolPermissionContext、tasks、mcp 等全局状态
  ├── 传递给 PromptInput 作为 props（20+ 个）
  │    ├── toolPermissionContext → PromptInput
  │    ├── commands/agents → PromptInputFooter
  │    ├── mcpClients → PromptInputFooter
  │    └── ...
  └── PromptInput 内部又通过 useAppState 读全局状态
       └── 绕过 props，直接访问 store
```

### 拆分步骤

2.1 **抽离 PromptInput 所需的数据接口** → 定义一个明确的 `PromptInputContext` 类型，只包含 PromptInput 真正需要的字段，不暴露整个 AppState

2.2 **消除 PromptInput 内部的 useAppState 调用** → 改为从 props 或独立 context 获取，不再直接读全局 store

2.3 **REPL.tsx 拆子组件**：
- `ReplHeader` — terminal title、mode indicator
- `MessagesPanel` — message list + scroll
- `ToolPermissionOverlay` — 权限弹窗
- `PromptInputArea` — 输入框 + footer

2.4 **每个子组件独立可测试** — 接收明确的 props，不依赖 AppState

---

## 阶段 3：统一持久化层

### 3.1 Session 持久化

当前 `sessionStorage.ts` 5000+ 行，包含：
- `Project` 类（文件锁、写入队列、flush 定时器）
- `insertMessageChain`（消息链写入）
- `loadConversationForResume`（恢复会话）
- lite metadata（title/tag/mode）
- agent transcript
- worktree state

**目标**：
- 分离关注点：`Project` → 文件操作层 / `SessionStore` → 业务逻辑层
- 写入路径：所有状态变更 → `SessionStore.dispatch(action)` → 入队 → 100ms debounce → 写盘
- 读取路径：启动时 `SessionStore.load(sessionId)` → 一次读全部状态，不散落各处

### 3.2 Config 持久化

当前 `config.ts` 1700+ 行，`saveGlobalConfig()` 被 20+ 处调用，每次都是读-改-写模式。

**目标**：
- 单一 `ConfigStore`，提供 `get(key)` / `set(key, value)` / `subscribe(key, callback)`
- 写操作 debounce 100ms，自动合并同一窗口内的多次修改
- 跟 session 持久化共用同一套文件锁和写入队列

### 3.3 Permission 持久化

当前 `settings.ts` 管理 settings.json，`permissionSetup.ts` 管理权限规则，两者分离但概念重叠。

**目标**：
- 权限规则作为 settings 的子集，统一走 ConfigStore
- 权限变更不直接写盘，通过 ConfigStore dispatch

---

## 阶段 4：入口简化

当前入口 `cli.tsx` → `main.tsx` (1700+ 行) → 包含 CLI 参数解析、MCP 配置、会话恢复、REPL 启动等所有逻辑。

**目标**：
- `main.tsx` 瘦身：参数解析 → `CliArgs`，MCP 配置 → `McpBootstrap`，会话恢复 → `SessionResume`
- 入口只做三件事：解析参数 → 初始化服务 → 启动 REPL

---

## 待立即执行

- [ ] 从 AppState 类型中移除 7 个已桩化字段（ultraplanPendingChoice、ultraplanLaunchPending、spinnerTip、pendingWorkerRequest、pendingSandboxRequest、teamContext、agentDefinitions）
- [ ] 移除对应的 useAppState(() => defaultValue) 占位调用
- [ ] 更新 React Compiler `_c(N)` 计数
