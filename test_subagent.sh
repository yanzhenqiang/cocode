#!/bin/bash
set -e

echo "========================================"
echo "TEST_SUB_AGENT — spawn-agent 端到端测试"
echo "========================================"

# 清理残留 tmux
tmux kill-server 2>/dev/null || true

# 确保 dist 与源码一致
# 先 link 当前包，使 cocode.sh 中的 `exec cocode` 可用
echo "Building..."
npm link
npx tsx scripts/build-node.ts

PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  tmux kill-session -t main 2>/dev/null || true
  for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
    tmux kill-session -t "$s" 2>/dev/null || true
  done
}

# Setup
cleanup
sleep 1

# Create .TEST directory with known files
TEST_DIR="$(pwd)/.TEST"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
echo "marker_alpha_123" > "$TEST_DIR/alpha.txt"
echo "marker_beta_456"  > "$TEST_DIR/beta.txt"
echo "marker_gamma_789" > "$TEST_DIR/gamma.txt"

# Step 1: 启动主 agent
echo "Step 1: 启动主 agent..."
tmux new -s main -d "cd $(pwd) && exec bash"
sleep 2
tmux send-keys -t main "bash /data/data/com.termux/files/home/cocode.sh" Enter
sleep 20

if tmux has-session -t main 2>/dev/null; then
  pass "1.1 主 Agent 启动"
else
  fail "1.1 主 Agent 未启动"
  cleanup; exit 1
fi

# Step 2: 要求 LLM 使用 spawn-agent 创建子 agent 来列出文件
echo "Step 2: 发送 prompt 要求使用 spawn-agent..."
tmux send-keys -t main "/agent 使用 spawn-agent 创建一个子 agent，任务是在 $TEST_DIR 下列出所有文件，把文件名返回给主 agent" Enter
sleep 60

# 2.1 主 agent 响应了
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -qE "agent|spawn|session|Agent"; then
  pass "2.1 主 agent 响应了技能调用"
else
  fail "2.1 主 agent 未响应技能调用"
fi

# Step 3: 验证子 agent
echo "Step 3: 验证子 agent..."
sleep 10

AGENT_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-' | head -1)
if [ -n "$AGENT_SESSION" ]; then
  pass "3.1 spawn-agent 创建了独立 subagent session ($AGENT_SESSION)"

  # 等待子 agent 执行
  sleep 40
  AGENT_OUTPUT=$(tmux capture-pane -t "$AGENT_SESSION" -p -S -500)

  # 3.2-3.4 验证子 agent 找到了正确的文件
  if echo "$AGENT_OUTPUT" | grep -q "alpha"; then
    pass "3.2 子 agent 找到了 alpha.txt"
  else
    fail "3.2 子 agent 未找到 alpha.txt"
  fi

  if echo "$AGENT_OUTPUT" | grep -q "beta"; then
    pass "3.3 子 agent 找到了 beta.txt"
  else
    fail "3.3 子 agent 未找到 beta.txt"
  fi

  if echo "$AGENT_OUTPUT" | grep -q "gamma"; then
    pass "3.4 子 agent 找到了 gamma.txt"
  else
    fail "3.4 子 agent 未找到 gamma.txt"
  fi
else
  fail "3.1 spawn-agent 未创建 agent session"
fi

# Step 4: 验证环境变量和生命周期
if [ -n "$AGENT_SESSION" ]; then
  ENV_OUTPUT=$(tmux show-environment -t "$AGENT_SESSION" 2>/dev/null)

  if echo "$ENV_OUTPUT" | grep -q "PARENT_SESSION=main"; then
    pass "4.1 PARENT_SESSION=main 注入正确"
  else
    fail "4.1 PARENT_SESSION 未正确注入"
  fi

  if echo "$ENV_OUTPUT" | grep -q "AGENT_ID=$AGENT_SESSION"; then
    pass "4.2 AGENT_ID 注入正确"
  else
    fail "4.2 AGENT_ID 未正确注入"
  fi

  # Kill subagent and verify main survives
  tmux kill-session -t "$AGENT_SESSION" 2>/dev/null
  sleep 1
  if ! tmux has-session -t "$AGENT_SESSION" 2>/dev/null; then
    pass "4.3 kill subagent 后 session 被清除"
  else
    fail "4.3 kill subagent 后 session 仍存在"
  fi
fi

if tmux has-session -t main 2>/dev/null; then
  pass "4.4 主 agent 在子 agent kill 后仍存活"
else
  fail "4.4 主 agent 被连带终止"
fi

cleanup
rm -rf "$TEST_DIR"

echo ""
echo "========================================"
echo "TEST_SUB_AGENT 结果汇总"
echo "========================================"
echo "通过: $PASS"
echo "失败: $FAIL"
[ $FAIL -eq 0 ] && echo "全部测试通过！" && exit 0
echo "存在失败的测试"
exit 1
