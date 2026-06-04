#!/bin/bash
set -e

echo "========================================"
echo "TEST_SUB_AGENT — 端到端功能测试"
echo "========================================"

PASS=0
FAIL=0

function pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
function fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

function cleanup() {
  tmux kill-session -t main 2>/dev/null || true
  for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
    tmux kill-session -t "$s" 2>/dev/null || true
  done
}

# Setup
cleanup
sleep 1

# Create test workspace with known files
TEST_DIR="$(pwd)/.TEST"
mkdir -p "$TEST_DIR"
echo "hello from alpha" > "$TEST_DIR/test_alpha.txt"
echo "hello from beta" > "$TEST_DIR/test_beta.txt"
echo "hello from gamma" > "$TEST_DIR/test_gamma.txt"

# Step 1: 启动主 Agent
echo "Step 1: 启动主 agent..."
tmux new -s main -d "cd $TEST_DIR && exec bash"
sleep 2
tmux send-keys -t main "bash /data/data/com.termux/files/home/cocode.sh" Enter
sleep 15

# 验证点 1.1
if tmux has-session -t main 2>/dev/null; then
  pass "1.1 主 Agent 启动"
else
  fail "1.1 主 Agent 未启动"
  cleanup
  exit 1
fi

# Step 2: 发送 Skill 命令（触发子 agent 列出目录）
echo "Step 2: 发送 prompt 触发子 agent..."
tmux send-keys -t main "/agent 列出$TEST_DIR下面的所有文件，只返回文件名，不要解释" Enter
sleep 60

# 验证点 2.1 - 主 agent 响应了
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -qE "agent|Explore|spawn|session"; then
  pass "2.1 主 agent 响应了 skill 调用"
else
  fail "2.1 主 agent 未响应 skill 调用"
fi

# Step 3: 验证子 agent 工作
echo "Step 3: 验证子 agent..."
sleep 5

# 3.1 Subagent Session 创建
AGENT_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-' | head -1)
if [ -n "$AGENT_SESSION" ]; then
  pass "3.1 Subagent Session 被正确创建 ($AGENT_SESSION)"

  # 等待子 agent 执行完成
  sleep 30
  AGENT_OUTPUT=$(tmux capture-pane -t "$AGENT_SESSION" -p -S -500)

  # 3.2 验证能列出正确的文件名
  if echo "$AGENT_OUTPUT" | grep -q "test_alpha"; then
    pass "3.2 子 agent 找到了 test_alpha.txt"
  else
    fail "3.2 子 agent 未找到 test_alpha.txt"
  fi

  if echo "$AGENT_OUTPUT" | grep -q "test_beta"; then
    pass "3.3 子 agent 找到了 test_beta.txt"
  else
    fail "3.3 子 agent 未找到 test_beta.txt"
  fi

  if echo "$AGENT_OUTPUT" | grep -q "test_gamma"; then
    pass "3.4 子 agent 找到了 test_gamma.txt"
  else
    fail "3.4 子 agent 未找到 test_gamma.txt"
  fi
else
  fail "3.1 Subagent Session 未创建"
fi

# 3.5 主 agent 仍然存活
if tmux has-session -t main 2>/dev/null; then
  pass "3.5 主 agent 在子 agent 执行后仍存活"
else
  fail "3.5 主 agent 被连带终止"
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
