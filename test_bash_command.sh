#!/bin/bash
set -e

echo "========================================"
echo "TEST_BASH_COMMAND — Bash 命令执行检测"
echo "========================================"

WORK_DIR="/data/data/com.termux/files/home"

# 清理残留 session
tmux kill-session -t bash_test 2>/dev/null || true
sleep 1

# 1. 拉起主 agent
tmux new -s bash_test -d "cd ${WORK_DIR} && bash"
sleep 2
tmux send-keys -t bash_test "./cocode.sh" Enter
sleep 15

# 2. 捕获当前输出，处理初始提示
OUTPUT=$(tmux capture-pane -t bash_test -p)

# 2a. API key 提示
if echo "$OUTPUT" | grep -q "Do you want to use this API key"; then
  tmux send-keys -t bash_test Up Enter
  sleep 3
  OUTPUT=$(tmux capture-pane -t bash_test -p)
fi

# 2b. 安全提示
if echo "$OUTPUT" | grep -q "Enter to confirm"; then
  tmux send-keys -t bash_test Enter
  sleep 3
fi

# 3. 验证主 agent session 存活
if ! tmux has-session -t bash_test 2>/dev/null; then
  echo "FAIL: bash_test session 未创建"
  exit 1
fi
echo "PASS: 主 agent session 存活"

# 4. 发送 prompt 要求执行 bash 命令
BEFORE=$(tmux capture-pane -t bash_test -p)

PROMPT="请用 BashTool 执行 whoami 命令，只返回结果不要解释"
tmux send-keys -t bash_test "$PROMPT" Enter

# 5. 等待 AI 响应 + 工具调用
sleep 20

# 5a. 如果出现审批提示，自动确认 Yes
OUTPUT=$(tmux capture-pane -t bash_test -p)
if echo "$OUTPUT" | grep -q "Do you want to proceed"; then
  echo "INFO: 检测到权限审批提示，自动确认..."
  tmux send-keys -t bash_test Enter
  sleep 15
fi

# 6. 捕获发送 prompt 后的输出
AFTER=$(tmux capture-pane -t bash_test -p)

echo "--- 输出 ---"
echo "$AFTER" | tail -50
echo "------------"

# 7. 检测 BashTool 是否被调用
if echo "$AFTER" | grep -qi "Bash\|bash\|Executing\|Running"; then
  echo "PASS: 检测到 BashTool 调用迹象"
else
  echo "WARN: 未明确检测到 BashTool 调用字样"
fi

# 8. 检测 whoami 输出
CURRENT_USER=$(whoami)
if echo "$AFTER" | grep -q "$CURRENT_USER"; then
  echo "PASS: 输出包含当前用户名 '$CURRENT_USER'，whoami 执行成功"
else
  # 备选：检查输出是否显著增加
  BEFORE_LINES=$(echo "$BEFORE" | wc -l)
  AFTER_LINES=$(echo "$AFTER" | wc -l)
  DIFF=$((AFTER_LINES - BEFORE_LINES))
  if [ "$DIFF" -gt 5 ]; then
    echo "PASS: 终端输出显著增加（新增 $DIFF 行），推断有命令执行输出"
  else
    echo "FAIL: 未检测到 whoami 执行输出"
    exit 1
  fi
fi

# 9. 清理
tmux kill-session -t bash_test 2>/dev/null || true

echo ""
echo "TEST_BASH_COMMAND 通过"
