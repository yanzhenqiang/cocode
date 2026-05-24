#!/bin/bash
set -e

echo "========================================"
echo "Cocode Agent Refactoring - Full Test Suite"
echo "========================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

function pass() {
  echo -e "${GREEN}PASS${NC}: $1"
  PASS=$((PASS + 1))
}

function fail() {
  echo -e "${RED}FAIL${NC}: $1"
  FAIL=$((FAIL + 1))
}

function cleanup() {
  echo "Cleaning up sessions..."
  tmux kill-session -t main 2>/dev/null || true
  for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
    tmux kill-session -t "$s" 2>/dev/null || true
  done
}

# ========================================
# 前置冒烟测试
# ========================================
echo ""
echo "========================================"
echo "1. 前置冒烟测试（必过）"
echo "========================================"

cleanup
sleep 1

# Step 1: 启动主 Agent
echo "Step 1: 启动主 agent..."
tmux new -s main -d "cd /Users/zhoukangjia/workspace && bash"
sleep 2
tmux send-keys -t main "./cocode.sh" Enter
sleep 15

# Step 2: 验证主 agent session 存活
if tmux has-session -t main 2>/dev/null; then
  pass "1.1 主 agent session 存活"
else
  fail "1.1 主 agent session 未创建"
  exit 1
fi

# Step 3: 发送 prompt
echo "Step 2: 发送 prompt..."
tmux send-keys -t main "你好，请回复'收到'两个字" Enter
sleep 15

# Step 4: 捕获输出并验证
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -q "收到"; then
  pass "1.2 主 agent 响应 prompt"
else
  fail "1.2 主 agent 未响应 prompt"
  echo "Output: $OUTPUT" | tail -20
  cleanup
  exit 1
fi

# Step 5: 清理
tmux kill-session -t main 2>/dev/null || true
echo ""
echo -e "${GREEN}前置冒烟测试通过${NC}"

# ========================================
# E2E 功能测试
# ========================================
echo ""
echo "========================================"
echo "2. 端到端功能测试（E2E）"
echo "========================================"

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
  pass "E2E 1.1 主 Agent 启动"
else
  fail "E2E 1.1 主 Agent 未启动"
  exit 1
fi

# Step 2: 发送初始 Prompt（触发 Skill 拉起 Subagent）
echo "Step 2: 发送 prompt 触发 Skill..."
tmux send-keys -t main "/agent 创建一个 Explore subagent，任务是'列出当前目录下所有文件'" Enter
sleep 25

# 验证点 2.1
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -qE "agent|Explore|spawn|session"; then
  pass "E2E 2.1 主 agent 响应 skill 调用"
else
  fail "E2E 2.1 主 agent 未响应 skill 调用"
fi

# Step 3: 验证主流程正确性

# 3.1 Subagent Session 被正确创建
echo "Step 3: 验证子 agent..."
sleep 5
AGENT_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-' | head -1)
if [ -n "$AGENT_SESSION" ]; then
  pass "E2E 3.1 Subagent Session 被正确创建 ($AGENT_SESSION)"
else
  fail "E2E 3.1 Subagent Session 未创建"
fi

# 3.2 环境变量注入验证
if [ -n "$AGENT_SESSION" ]; then
  ENV_OUTPUT=$(tmux show-environment -t "$AGENT_SESSION" 2>/dev/null)
  if echo "$ENV_OUTPUT" | grep -q "PARENT_SESSION=main"; then
    pass "E2E 3.2 PARENT_SESSION=main 注入正确"
  else
    fail "E2E 3.2 PARENT_SESSION 未正确注入"
  fi

  if echo "$ENV_OUTPUT" | grep -q "AGENT_TYPE=Explore"; then
    pass "E2E 3.3 AGENT_TYPE=Explore 注入正确"
  else
    fail "E2E 3.3 AGENT_TYPE 未正确注入"
  fi

  # 3.4 子 Agent 独立执行委托任务
  sleep 5
  SUB_OUTPUT=$(tmux capture-pane -t "$AGENT_SESSION" -p 2>/dev/null)
  if echo "$SUB_OUTPUT" | grep -qE "文件|cocode|目录|ls"; then
    pass "E2E 3.4 子 agent 在执行任务"
  else
    fail "E2E 3.4 子 agent 未执行任务"
  fi

  # 3.5 生命周期管理验证
  tmux kill-session -t "$AGENT_SESSION"
  sleep 1
  if ! tmux has-session -t "$AGENT_SESSION" 2>/dev/null; then
    pass "E2E 3.5 kill subagent 后主 agent 不受影响"
  else
    fail "E2E 3.5 kill subagent 后 session 仍存在"
  fi
fi

# 验证主 agent 仍然存活
if tmux has-session -t main 2>/dev/null; then
  pass "E2E 3.6 主 agent 在子 agent kill 后仍存活"
else
  fail "E2E 3.6 主 agent 被连带终止"
fi

# Teardown
cleanup

# ========================================
# 测试结果汇总
# ========================================
echo ""
echo "========================================"
echo "测试结果汇总"
echo "========================================"
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}全部测试通过！${NC}"
  exit 0
else
  echo -e "${RED}存在失败的测试${NC}"
  exit 1
fi
