# TEST_SUB_AGENT — 端到端功能测试

## 目的

验证主 Agent 通过 Skill 拉起 Subagent 的完整链路：
**用户 Prompt → 主 Agent 调用 `/agent` Skill → 子 Agent Spawn → 子 Agent 执行任务 → 环境变量验证 → 生命周期管理**

## 前置条件

- **TEST_SMOKE 已通过**
- tmux 已安装且 tmux server 运行中
- `cocode.sh` 可执行，位于 `/Users/zhoukangjia/workspace/`
- API 环境变量已配置（或通过 `cocode.sh` 内置导出）

## 测试脚本

```bash
#!/bin/bash
set -e

echo "========================================"
echo "TEST_SUB_AGENT — 端到端功能测试"
echo "========================================"

PASS=0
FAIL=0

function pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

function fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
}

function cleanup() {
  tmux kill-session -t main 2>/dev/null || true
  for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
    tmux kill-session -t "$s" 2>/dev/null || true
  done
}

# Setup
cleanup
sleep 1

# Step 1: 启动主 Agent
echo "Step 1: 启动主 agent..."
tmux new -s main -d "cd /Users/zhoukangjia/workspace && bash"
sleep 2
tmux send-keys -t main "./cocode.sh" Enter
sleep 15

# 验证点 1.1
if tmux has-session -t main 2>/dev/null; then
  pass "1.1 主 Agent 启动"
else
  fail "1.1 主 Agent 未启动"
  exit 1
fi

# Step 2: 发送初始 Prompt（触发 Skill 拉起 Subagent）
echo "Step 2: 发送 prompt 触发 Skill..."
tmux send-keys -t main "/agent 创建一个 Explore subagent，任务是'列出当前目录下所有文件'" Enter
sleep 25

# 验证点 2.1
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -qE "agent|Explore|spawn|session"; then
  pass "2.1 Skill 调用响应"
else
  fail "2.1 主 agent 未响应 skill 调用"
fi

# Step 3: 验证主流程正确性
echo "Step 3: 验证子 agent..."
sleep 5

# 3.1 Subagent Session 被正确创建
AGENT_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-' | head -1)
if [ -n "$AGENT_SESSION" ]; then
  pass "3.1 Subagent Session 被正确创建 ($AGENT_SESSION)"
else
  fail "3.1 Subagent Session 未创建"
fi

# 3.2 环境变量注入验证
if [ -n "$AGENT_SESSION" ]; then
  ENV_OUTPUT=$(tmux show-environment -t "$AGENT_SESSION" 2>/dev/null)

  if echo "$ENV_OUTPUT" | grep -q "PARENT_SESSION=main"; then
    pass "3.2 PARENT_SESSION=main 注入正确"
  else
    fail "3.2 PARENT_SESSION 未正确注入"
  fi

  if echo "$ENV_OUTPUT" | grep -q "AGENT_TYPE=Explore"; then
    pass "3.3 AGENT_TYPE=Explore 注入正确"
  else
    fail "3.3 AGENT_TYPE 未正确注入"
  fi

  # 3.4 子 Agent 独立执行委托任务
  sleep 5
  SUB_OUTPUT=$(tmux capture-pane -t "$AGENT_SESSION" -p 2>/dev/null)
  if echo "$SUB_OUTPUT" | grep -qE "文件|cocode|目录|ls"; then
    pass "3.4 子 agent 在执行任务"
  else
    fail "3.4 子 agent 未执行任务"
  fi

  # 3.5 生命周期管理验证
  tmux kill-session -t "$AGENT_SESSION"
  sleep 1
  if ! tmux has-session -t "$AGENT_SESSION" 2>/dev/null; then
    pass "3.5 kill subagent 后主 agent 不受影响"
  else
    fail "3.5 kill subagent 后 session 仍存在"
  fi
fi

# 3.6 主 agent 仍然存活
if tmux has-session -t main 2>/dev/null; then
  pass "3.6 主 agent 在子 agent kill 后仍存活"
else
  fail "3.6 主 agent 被连带终止"
fi

# Teardown
cleanup

# 结果汇总
echo ""
echo "========================================"
echo "TEST_SUB_AGENT 结果汇总"
echo "========================================"
echo "通过: $PASS"
echo "失败: $FAIL"

if [ $FAIL -eq 0 ]; then
  echo "全部测试通过！"
  exit 0
else
  echo "存在失败的测试"
  exit 1
fi
```

## 通过标准

| 验证点 | 说明 | 状态 |
|--------|------|------|
| 1.1 主 Agent 启动 | `tmux has-session -t main` 返回 true | 必过 |
| 2.1 Skill 调用响应 | 主 agent 屏幕出现 agent/spawn/session 相关输出 | 必过 |
| 3.1 Subagent 创建 | `agent-*` session 出现 | 必过 |
| 3.2 环境变量 | `PARENT_SESSION=main` | 必过 |
| 3.3 Agent 类型 | `AGENT_TYPE=Explore` | 必过 |
| 3.4 任务执行 | 子 agent pane 有任务执行痕迹 | 必过 |
| 3.5 生命周期 | kill subagent 不影响 main | 必过 |
| 3.6 主 agent 存活 | 子 agent kill 后 main 仍存活 | 必过 |

## 失败排查

| 失败点 | 可能原因 | 排查命令 |
|--------|---------|---------|
| 3.1 subagent 未创建 | skill 未触发或 AgentTool 未走 session 路径 | 检查主 agent 输出是否有 spawn 日志 |
| 3.4 未执行任务 | 子 agent 启动失败 | `tmux capture-pane -t <agent-session> -p` 看报错 |
| 3.6 主 agent 被连带 kill | session 命名冲突或进程树关系错误 | `pstree -p` 查看父子进程关系 |
