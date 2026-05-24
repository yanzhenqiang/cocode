# Cocode Agent 架构重构设计

## 1. 设计目标

将现有的三套 agent 执行机制（内嵌 subagent、teammate pane swarm、后台 async agent）合并为**一套统一、对称、可扩展的 runtime 架构**。

核心原则：**每个 agent 都是平等的 cocode CLI 进程，通过 tmux session 隔离，通过终端 I/O 通信。**

## 2. 现状问题

当前 cocode 存在三种并存的 agent 模型：

| 模型 | 实现方式 | 问题 |
|------|---------|------|
| **内嵌 subagent** | `AgentTool` 内部直接调用 `runAgent()`，共享进程 | `AgentTool.tsx` 1400+ 行，sync/async/fork/remote 路径交织，难以维护 |
| **Teammate swarm** | `spawnTeammate()` 创建 tmux pane split | Pane 数量超过 5 个后视觉拥挤，不可扩展 |
| **后台 async agent** | `AsyncGenerator` + `AppState.tasks` 注册表 | 生命周期管理与 tmux 割裂，用户无法 attach 干预 |

此外，通信机制也不统一：
- `queuePendingMessage`（内存队列）
- `teammateMailbox`（文件 JSON + 锁）
- `enqueueAgentNotification`（XML 插入主会话）

## 3. 核心设计

### 3.1 进程模型

```
tmux server
|
|-- session "main"          -- 主 agent（用户默认 attach）
|   `-- pane 0: cocode
|
|-- session "agent-abc"     -- subagent A
|   `-- pane 0: cocode --agent <type> --prompt-file <path>
|
|-- session "agent-def"     -- subagent B
|   `-- pane 0: cocode --agent <type> --prompt-file <path>
|
`-- session "agent-ghi"     -- subagent C
    `-- pane 0: cocode --agent <type> --prompt-file <path>
```

**原则**：
- 一个 agent = 一个 tmux session = 一个 cocode CLI 进程
- 不拆分 pane，每个 session 只有一个全屏 pane
- 主 agent 和 subagent 完全对称，都走 `cocode` 入口

### 3.2 Spawn 流程

```
AgentTool.call()
    |
    |-- 1. 解析 agent 定义（type / prompt / model / tools）
    |
    |-- 2. Sync flush 主会话 transcript 到磁盘
    |       确保子 agent 能读取完整上下文
    |
    |-- 3. System prompt 落盘到 .meta.json
    |       解决跨进程 prompt cache 一致性问题
    |
    |-- 4. 生成 session 名（agent-<uuid> 或用户指定名）
    |
    |-- 5. tmux new -s <name> -d \
    |       -e PARENT_SESSION=<main-session-id> \
    |       -e MAILBOX_PATH=/tmp/cocode/mailboxes/<name>.jsonl \
    |       "cocode --agent <type> --prompt-file <path> [其他 CLI 参数]"
    |
    `-- 6. 返回 { status: 'async_launched', sessionName, mailboxPath }
```

**AgentTool 职责**：只做参数转换和调度，不再内嵌 `runAgent()`。

### 3.3 通信机制（双向对称）

主 agent 把 subagent 当作"另一个 cocode 程序"来操作，就像用户操作 cocode 一样。

#### 主 → 子：SendMessage

```bash
# 方式 A：直接模拟用户输入（默认）
tmux send-keys -t <session-name> "<prompt text>" Enter

# 方式 B：通过环境变量获取 mailbox 路径后写入
# （用于结构化/大消息，避免 send-keys 长度限制）
MAILBOX=$(tmux show-environment -t <name> MAILBOX_PATH | cut -d= -f2)
echo '{"from":"main","text":"..."}' >> "$MAILBOX"
```

#### 子 → 主：结果回推

```bash
# 子 agent 内部通过 BashTool 执行
PARENT=$(tmux show-environment PARENT_SESSION | cut -d= -f2)
tmux send-keys -t "$PARENT" "<result summary>" Enter
```

子 agent 不需要知道自己是"被调用的"，它以为自己就是普通的 cocode 会话。

#### 主查子状态：主动轮询

```bash
# 查屏幕输出
tmux capture-pane -t <session-name> -p

# 查进程是否存在
tmux has-session -t <session-name>  # exit 0 = running, exit 1 = done
```

### 3.4 生命周期管理

| 操作 | 命令 |
|------|------|
| **Spawn** | `tmux new -s <name> -d "cocode ..."` |
| **SendMessage** | `tmux send-keys -t <name> "text" Enter` |
| **Query 状态** | `tmux has-session -t <name>` / `tmux capture-pane` |
| **用户 Attach** | `tmux attach -t <name>` |
| **Kill** | `tmux kill-session -t <name>` |
| **Resume** | `tmux attach -t <name>`（如果还在）或从 transcript 重建 |

**退出即销毁**：子 agent 的 cocode 进程正常结束后，tmux session 自动消失。

### 3.5 交互命令 `/agent_view`

cocode REPL 内新增 slash command，用于在多个运行中的 agent session 之间快速切换：

```
/agent_view              -- 弹出所有活跃 agent session 列表（类似 /resume 的 picker）
/agent_view worker1      -- 直接 attach 到指定 session
```

**内部实现**：

```typescript
// 1. 列出所有 tmux session
const sessions = await bash('tmux list-sessions -F "#{session_name}"');
const agentSessions = sessions.split('\n').filter(s => s !== 'main');

// 2. 展示 picker（复用 /resume 的 UI 组件）
const selected = await showPicker(agentSessions);

// 3. attach 到目标 session
await bash(`tmux attach -t ${selected}`);
```

**行为说明**：
- 执行后用户终端切换到目标 agent 的 REPL
- 在目标 agent 中按 `Ctrl+b d` 可 detach 回原主 session

### 3.6 跨主机扩展

Session 模型天然支持跨主机：

```bash
# 本地 spawn 远程子 agent
ssh remote-host "tmux new -s worker1 -d 'cocode --agent ...'"

# 本地发消息
ssh remote-host "tmux send-keys -t worker1 '搜索完成' Enter"

# 本地 attach（通过 SSH + tmux）
ssh -t remote-host "tmux attach -t worker1"
```

不需要修改 cocode 代码，通信协议仍然是终端 I/O，只是 tmux server 跑在另一台机器上。与 cocode 现有 `teleportToRemote`（CCR 云服务）相比，这套方案更通用——任意 SSH 可达的机器都可以成为 agent host。

## 4. 和现有系统的差异

| 现有 | 新方案 |
|------|--------|
| `AgentTool.tsx` 1400 行（内嵌调度+执行） | `AgentTool.tsx` ~100 行（纯调度） |
| `runAgent()` async generator | 子进程自己的 `main.tsx` 主循环 |
| `AppState.tasks[agentId]` 注册表 | `tmux list-sessions` |
| `queuePendingMessage` 内存队列 | `tmux send-keys` |
| `enqueueAgentNotification` XML 推送 | `tmux send-keys -t main` |
| `teammateMailbox` 文件 JSON + 锁 | 可选：环境变量指向的 JSONL 文件 |
| `killAsyncAgent()` 手动清理 | `tmux kill-session` |
| Pane split swarm（5+ 不可用） | Session 模型（无数量限制） |
| 用户只能 kill 不能干预 | `tmux attach -t` 随时进入 REPL |

## 5. 关键技术点

### 5.1 System Prompt 落盘

子进程需要重建和父进程一致的 system prompt 才能共享 API cache。

**方案**：主 agent 在 spawn 前把 `renderedSystemPrompt` 写入 session 目录的 `.meta.json`：

```json
{
  "agentType": "Explore",
  "systemPrompt": ["line1", "line2", ...],
  "model": "claude-sonnet-4-6",
  "timestamp": "2026-05-23T10:00:00Z"
}
```

子 agent 启动时通过 `--system-prompt-file` 读取。

**待讨论**：如果 GrowthBook flag 在父子之间变化，是否接受 cache miss？

### 5.2 Sync Flush

Spawn 子 agent 前必须确保主 agent 的所有消息已落盘。

```typescript
async function flushBeforeSpawn(): Promise<void> {
  await transcriptWriter.flushAllPending();
  // 确认最后一条消息的 UUID 已写入磁盘
  const lastMsg = await readLastTranscriptEntry();
  assert(lastMsg.uuid === expectedUuid);
}
```

**待讨论**：flush 失败时的重试策略？

### 5.3 结果获取（两种模式）

#### 模式 A：主动查询（Pull）

主 agent 定期 `capture-pane` 查看子 agent 输出，适用于长任务监控。

```bash
tmux capture-pane -t worker1 -p | tail -20
```

#### 模式 B：被动推送（Push）

子 agent 完成后主动 `send-keys` 通知主 agent。

```bash
# 子 agent 内部
PARENT=$(tmux show-environment PARENT_SESSION | cut -d= -f2)
tmux send-keys -t "$PARENT" "任务完成，结果在 /tmp/result.txt" Enter
```

**待讨论**：主 agent 如何区分"用户输入"和"子 agent 推送的消息"？

### 5.4 环境变量传递

每个 session 启动时注入：

| 变量 | 用途 |
|------|------|
| `PARENT_SESSION` | 父 session 名，子 agent 回推用 |
| `MAILBOX_PATH` | 可选，大消息/结构化消息的落盘路径 |
| `AGENT_TYPE` | agent 类型标识 |
| `AGENT_ID` | 全局唯一 ID |

## 6. 迁移路径

不建议一次性全改，分阶段：

### 阶段 1：CLI 增强（不碰现有逻辑）
- CLI 支持 `--system-prompt-file`
- CLI 支持 `--prompt-file`
- CLI 支持 `--fork-from-session` / `--fork-from-message`
- System prompt 落盘到 `.meta.json`

### 阶段 2：AgentTool 增加 session 路径（可选）
- `AgentTool` 增加 `isolation: 'tmux-session'` 选项
- 实现 `spawnAgentSession()` 作为新路径
- 内嵌路径保留作为 fallback

### 阶段 3：通信层抽象
- 实现 `TmuxMessenger`（send-keys / capture-pane 封装）
- `SendMessageTool` 支持 `to: <session-name>` 路由
- 与现有 `teammateMailbox` 并存

### 阶段 4：全面切换
- 默认 spawn 走 session 路径
- 删除内嵌 `runAgent()` 调用
- 删除 `AppState.tasks` 中的 agent 注册表
- Pane split 仅作为可视化可选模式保留

## 7. 待讨论问题

1. ~~子 agent 完成后如何可靠通知主 agent？~~ ✅ **已确认**
   - 不预设通知机制。子 agent 的 system prompt 中会说明：`"你可以通过 BashTool 执行 tmux send-keys -t main 来向主 agent 汇报结果"`。
   - LLM 自主决定何时、以何种格式通信。通道存在（tmux），无需程序层硬编码通知协议。

2. ~~主 agent 如何解析 `capture-pane` 的输出？~~ ✅ **已确认**
   - 不需要特殊解析器，不需要清洗 ANSI 码。
   - `capture-pane` 拿到的终端文本直接交给 LLM 阅读。LLM 自己理解屏幕上的内容，就像人类看终端一样。
   - 不定义消息格式、不约定 XML/JSON，所有通信都是自然语言文本。

3. ~~SendMessage 时如果子 agent 正在执行 Bash 命令，`send-keys` 会发给谁？~~ ✅ **已确认**
   - tmux `send-keys` 发送给 pane 的输入缓冲，由前台进程消费。
   - 如果 Bash 在跑，消息进入 Bash stdin；Bash 结束后 cocode 重新获得前台时继续消费。
   - TS 代码不处理这个时序问题。子 agent 的 system prompt 告诉它："完成任务后回到 REPL 等待输入"，或主 agent 先 `capture-pane` 确认子 agent 空闲再 `send-keys`。

4. ~~多个子 agent 同时 `send-keys -t main`，消息会不会交错？~~ ✅ **已确认**
   - tmux 的 pane 输入是 FIFO 队列，字符不会交错。
   - 多条消息的先后顺序取决于发送时机，这不是 TS 代码需要保证的，LLM 可以处理乱序或拼接。

5. ~~Prompt cache 是否放弃？~~ ✅ **已确认**
   - **放弃**。接受子 agent 每次重新构建 system prompt 的额外 token 成本。
   - System prompt 落盘（`.meta.json`）作为可选优化，不是必须的。
   - 跨进程本身就是独立的 API 请求，cache miss 是可接受的。

6. ~~Teammate swarm 的 pane 可视化是否保留？~~ ✅ **已确认**
   - **保留为可选模式**。`mode: 'swarm'` 时继续使用 pane split（适合 2-4 个 agent 协作监控）。
   - 默认 subagent 走 session 模型。swarm 是特殊场景的可视化模式。

## 8. 架构哲学

### 小步快跑：最小改动 + 即时验证

**原则**：每次只做最小化的代码改动，改完后立即跑测试验证，通过后再进行下一步。

**Why**: 本次重构涉及 runtime、通信层、生命周期管理等多个模块，改动面大、耦合性强。小步快跑可以：
- 将大重构拆成多个可独立验证的步骤
- 每一步失败时，调试范围被限制在最小改动内
- 随时可回退到上一个稳定状态，降低重构风险

**How to apply**（对应迁移路径的 4 个阶段）：

| 阶段 | 最小改动范围 | 验证测试 |
|------|-------------|---------|
| 阶段 1 | CLI 新增 `--system-prompt-file`、`--prompt-file` 参数 | 手动跑 `cocode --system-prompt-file x.json --prompt-file y.md`，验证进程正常启动 |
| 阶段 2 | AgentTool 新增 `isolation: 'tmux-session'` 分支，内嵌路径保留 | 跑 E2E 测试 Step 1~3.1：spawn subagent session，验证主/子 session 并存 |
| 阶段 3 | TmuxMessenger 封装 + SendMessageTool 路由 | 跑 E2E 测试 Step 3.3~3.5：验证环境变量注入、子 agent 任务执行、结果回推 |
| 阶段 4 | 默认走 session 路径，删除内嵌 `runAgent()` | 跑完整 E2E 测试（含 3.6~3.7），验证 `/agent_view`、kill 生命周期、主 agent 不受影响 |

**红线**：不提交未经测试的代码；不在一个步骤里同时修改调用方和被调用方。

### TS 只建通道，Prompt 管语义

本方案的核心设计原则：**TS 代码只负责建立通信的可能性，所有通信语义交给 system prompt 管理。**

| 层级 | 职责 | 说明 |
|------|------|------|
| **TS 代码** | 管道工 | 创建 tmux session、暴露 `send-keys`/`capture-pane` 工具 |
| **System Prompt** | 交通规则 | 告诉 LLM "你是谁、你可以做什么、你怎么通信" |
| **LLM** | 司机 | 自主决定何时发消息、发什么内容、如何解析对方输出 |

**不需要**：
- ❌ 消息格式定义（JSON/XML）
- ❌ 通信协议硬编码（握手、ack、重试）
- ❌ 输入验证/解析器
- ❌ 通知机制（task-notification）
- ❌ Agent 注册表（AppState.tasks）

**只需要**：
- ✅ 子 agent 的 system prompt 中写：`"你可以通过 BashTool 执行 tmux send-keys -t main 向主 agent 汇报结果"`
- ✅ 主 agent 的 system prompt 中写：`"你可以通过 BashTool 执行 tmux capture-pane -t <name> 查看子 agent 状态"`
- ✅ LLM 自己决定什么时候用、用什么格式

## 9. 测试结果

### 基础功能验证

```bash
# 1. 创建 tmux session
tmux new -d -s cocode-test

# 2. 向 session 发送 cocode 命令
tmux send-keys -t cocode-test "node /path/to/cocode/dist/cli.mjs --help" Enter

# 3. 捕获输出
tmux capture-pane -t cocode-test -p
# 输出：cocode 的完整 help 信息，包括 Usage、Options、Commands

# 4. 终止 session
tmux kill-session -t cocode-test
```

**结果**：
- ✅ tmux session 可以正常创建
- ✅ `send-keys` 可以成功向 cocode 发送命令
- ✅ `capture-pane` 可以完整捕获 cocode 的输出
- ✅ `kill-session` 可以正确终止 session

### 结论

tmux session 模型对于 cocode 完全可行。cocode 在独立 tmux session 中运行正常，输入输出都可以通过 tmux 命令控制。

## 10. 端到端功能测试（E2E）

### 测试目标

验证主 Agent 通过 Skill 拉起 Subagent 的完整链路：
**用户 Prompt → 主 Agent 调用 Skill → 子 Agent Spawn → 子 Agent 执行任务 → 双向通信 → 结果回推 → 状态查询**

### 前置条件

- tmux 已安装且 tmux server 运行中
- `cocode.sh` 可执行，位于 `/Users/zhoukangjia/workspace/`
- API 环境变量已配置（或通过 `cocode.sh` 内置导出）

### 测试步骤

#### Step 1：启动主 Agent

```bash
# 清理残留 session
tmux kill-session -t main 2>/dev/null
tmux kill-session -t agent-test 2>/dev/null

# 创建主 agent session，启动 cocode.sh（不加任何参数）
tmux new -s main -d "cd /Users/zhoukangjia/workspace && ./cocode.sh"

# 等待 cocode REPL 就绪
sleep 5
```

**验证点 1.1**：主 agent session 存在且存活
```bash
tmux has-session -t main || { echo "FAIL: main session 未创建"; exit 1; }
```

#### Step 2：发送初始 Prompt（触发 Skill 拉起 Subagent）

```bash
# 向主 agent 发送自然语言 Prompt，指示其调用 /agent skill 创建子 agent
tmux send-keys -t main "使用 /agent 命令创建一个 Explore subagent，任务是'列出当前目录下所有文件'" Enter
```

**验证点 2.1**：主 agent 收到输入并开始处理（屏幕输出有响应）
```bash
sleep 3
tmux capture-pane -t main -p | grep -qE "agent|Explore|Skill" || { echo "FAIL: 主 agent 未响应 skill 调用"; exit 1; }
```

#### Step 3：验证主流程正确性

**3.1 Subagent Session 被正确创建**
```bash
sleep 5
AGENT_SESSION=$(tmux list-sessions -F '#{session_name}' | grep '^agent-')
test -n "$AGENT_SESSION" || { echo "FAIL: subagent session 未创建"; exit 1; }
echo "Subagent session: $AGENT_SESSION"
```

**3.2 子 Agent 进程参数正确**
```bash
pgrep -af "cocode --agent Explore" || { echo "FAIL: 子进程未以 --agent Explore 启动"; exit 1; }
```

**3.3 环境变量注入验证**
```bash
# PARENT_SESSION 指向 main
tmux show-environment -t "$AGENT_SESSION" | grep -q "PARENT_SESSION=main" || { echo "FAIL: PARENT_SESSION 未正确注入"; exit 1; }

# AGENT_TYPE 标识正确
tmux show-environment -t "$AGENT_SESSION" | grep -q "AGENT_TYPE=Explore" || { echo "FAIL: AGENT_TYPE 未正确注入"; exit 1; }
```

**3.4 子 Agent 独立执行委托任务**
```bash
sleep 5
# 子 agent 的 pane 中应有任务执行痕迹（命令输出、cocode REPL 交互等）
tmux capture-pane -t "$AGENT_SESSION" -p | grep -qE "cocode|Explore|文件|ls|目录" || { echo "FAIL: 子 agent 未执行任务"; exit 1; }
```

**3.5 子 → 主通信验证（结果回推）**
```bash
sleep 10
# 子 agent 完成后，应通过 tmux send-keys -t main 向主 agent 汇报结果
# 主 agent 的屏幕输出中应出现子 agent 的结果摘要
tmux capture-pane -t main -p | grep -qE "文件|结果|完成|result" || { echo "FAIL: 主 agent 未收到子 agent 结果"; exit 1; }
```

**3.6 状态查询能力验证（/agent_view）**
```bash
# 主 agent 执行 /agent_view 应能列出所有活跃 agent session
tmux send-keys -t main "/agent_view" Enter
sleep 2
tmux capture-pane -t main -p | grep -q "$AGENT_SESSION" || { echo "FAIL: /agent_view 未列出子 agent"; exit 1; }
```

**3.7 生命周期管理验证**
```bash
# 通过 tmux kill-session 终止子 agent
tmux kill-session -t "$AGENT_SESSION"
sleep 1

# 验证子 agent session 已消失
tmux has-session -t "$AGENT_SESSION" 2>/dev/null && { echo "FAIL: kill-session 后子 agent 仍存活"; exit 1; }

# 主 agent 不受影响，仍然存活
tmux has-session -t main || { echo "FAIL: kill 子 agent 后主 agent 被连带终止"; exit 1; }
```

### Teardown

```bash
tmux kill-session -t main 2>/dev/null
tmux kill-session -t "$AGENT_SESSION" 2>/dev/null
echo "E2E 测试通过"
```

### 测试通过标准

| 验证点 | 说明 | 状态 |
|--------|------|------|
| 1.1 主 Agent 启动 | `tmux has-session -t main` 返回 true | 必过 |
| 2.1 Skill 调用响应 | 主 agent 屏幕出现 skill 相关输出 | 必过 |
| 3.1 Subagent 创建 | `agent-*` session 出现 | 必过 |
| 3.2 进程参数 | `pgrep` 匹配到 `--agent Explore` | 必过 |
| 3.3 环境变量 | `PARENT_SESSION=main`, `AGENT_TYPE=Explore` | 必过 |
| 3.4 任务执行 | 子 agent pane 有任务执行痕迹 | 必过 |
| 3.5 结果回推 | 主 agent pane 出现子 agent 结果 | 必过 |
| 3.6 状态查询 | `/agent_view` 能列出子 agent | 必过 |
| 3.7 生命周期 | kill subagent 不影响 main | 必过 |

### 失败排查指引

| 失败点 | 可能原因 | 排查命令 |
|--------|---------|---------|
| 1.1 main session 不存在 | cocode.sh 启动失败 | `tmux capture-pane -t main -p` 看报错 |
| 3.1 subagent 未创建 | skill 未触发或 AgentTool 未走 session 路径 | 检查主 agent 输出是否有 spawn 日志 |
| 3.5 未收到结果 | 子 agent 未执行 `tmux send-keys -t main` | `tmux capture-pane -t "$AGENT_SESSION" -p` 看子 agent 是否完成 |
| 3.7 主 agent 被连带 kill | session 命名冲突或进程树关系错误 | `pstree -p` 查看父子进程关系 |

## 11. 接口定义

### 9.1 TmuxMessenger

```typescript
interface TmuxMessenger {
  createSession(name: string, command: string, env?: Record<string, string>): Promise<void>;
  sendKeys(sessionName: string, text: string): Promise<void>;
  capturePane(sessionName: string): Promise<string>;
  hasSession(sessionName: string): Promise<boolean>;
  killSession(sessionName: string): Promise<void>;
  attachSession(sessionName: string): Promise<void>;
  listSessions(): Promise<string[]>;
}
```

### 9.2 AgentTool 新 call() 流程

```typescript
async call(input, toolUseContext) {
  // 1. 解析参数
  const { prompt, subagent_type, model, isolation } = input;

  // 2. 决定隔离方式（默认 session）
  const effectiveIsolation = isolation ?? 'tmux-session';

  // 3. sync flush 主会话
  await flushBeforeSpawn();

  // 4. system prompt 落盘（可选）
  const metaPath = await writeAgentMeta({ agentType: subagent_type });

  // 5. 生成 session 名
  const sessionName = `agent-${createAgentId()}`;

  // 6. spawn tmux session
  const cmd = buildCocodeCommand({ prompt, agentType: subagent_type, model, metaPath });
  await tmuxMessenger.createSession(sessionName, cmd, {
    PARENT_SESSION: getCurrentSessionName(),
    AGENT_TYPE: subagent_type ?? 'general-purpose',
  });

  // 7. 返回
  return {
    data: {
      status: 'async_launched',
      sessionName,
      attachCmd: `tmux attach -t ${sessionName}`,
    }
  };
}
```

### 9.3 环境变量规范

| 变量名 | 是否必须 | 示例值 | 说明 |
|--------|---------|--------|------|
| `PARENT_SESSION` | 是 | `main` | 父 session 名，子 agent 回推用 |
| `AGENT_TYPE` | 是 | `Explore` | agent 类型标识 |
| `AGENT_ID` | 是 | `agent-abc123` | 全局唯一 ID |
| `MAILBOX_PATH` | 否 | `/tmp/cocode/mailboxes/agent-abc.jsonl` | 大消息/结构化消息落盘路径 |
| `SYSTEM_PROMPT_FILE` | 否 | `/tmp/cocode/meta/agent-abc.json` | system prompt 落盘路径 |

### 9.4 System Prompt 模板（子 agent）

```
你是一个 cocode subagent，运行在独立的 tmux session 中。

你的身份：{agentType}
你的任务：完成主 agent 委托的工作。

通信方式：
- 向主 agent 汇报：执行 BashTool `tmux send-keys -t "$PARENT_SESSION" "你的汇报内容" Enter`
- 查看主 agent 状态：执行 BashTool `tmux capture-pane -t "$PARENT_SESSION" -p`

注意事项：
- 你是独立的 cocode 进程，可以自主决定何时通信、用什么格式
- 所有通信都是自然语言文本，不需要 JSON/XML
- 完成任务后，可以主动汇报结果，不需要等待主 agent 询问
```

## 10. 实现决策

### 实现优先级

| 优先级 | 内容 | 状态 |
|--------|------|------|
| P0 | 确认 design.md 所有待讨论问题 | ✅ 已完成 |
| P1 | CLI 增强（`--system-prompt-file`、`--prompt-file`） | 待实现 |
| P2 | AgentTool 增加 `isolation: 'tmux-session'` 双路径 | 待实现 |
| P3 | TmuxMessenger 通信抽象层 | 待实现 |
| P4 | 全面切换，删除内嵌路径 | 待实现 |

---

*design.md v0.3 - 定稿版，进入实现阶段。*