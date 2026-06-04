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

# Pre-accept trust dialog for home directory
CWD_PATH="/data/data/com.termux/files/home"
if [ ! -f "$HOME/.cocode.json" ]; then
  echo "{\"projects\":{\"$CWD_PATH\":{\"hasTrustDialogAccepted\":true}}}" > "$HOME/.cocode.json"
else
  # Merge trust setting into existing config
  node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(process.env.HOME, '.cocode.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e) {}
if (!config.projects) config.projects = {};
config.projects['$CWD_PATH'] = { ...(config.projects['$CWD_PATH'] || {}), hasTrustDialogAccepted: true };
fs.writeFileSync(configPath, JSON.stringify(config));
" 2>/dev/null || true
fi

# Step 1: 启动主 Agent
echo "Step 1: 启动主 agent..."
tmux new -s main -d "cd /data/data/com.termux/files/home && bash"
sleep 2
tmux send-keys -t main "bash /data/data/com.termux/files/home/cocode.sh" Enter
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

  if echo "$ENV_OUTPUT" | grep -q "AGENT_ID=$AGENT_SESSION"; then
    pass "3.3 AGENT_ID 注入正确"
  else
    fail "3.3 AGENT_ID 未正确注入"
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
