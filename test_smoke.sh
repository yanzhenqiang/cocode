#!/bin/bash
set -e

echo "========================================"
echo "TEST_SMOKE — 前置冒烟测试"
echo "========================================"

WORK_DIR="/data/data/com.termux/files/home"

# 清理残留 session
tmux kill-session -t main 2>/dev/null || true
sleep 1

# 1. 拉起主 agent
tmux new -s main -d "cd ${WORK_DIR} && bash"
sleep 2
tmux send-keys -t main "./cocode.sh" Enter
sleep 15

# 2. 检查是否有安全提示，如果有就按回车确认
OUTPUT=$(tmux capture-pane -t main -p)
if echo "$OUTPUT" | grep -q "Enter to confirm"; then
  tmux send-keys -t main Enter
  sleep 3
fi

# 3. 验证主 agent session 存活
if ! tmux has-session -t main 2>/dev/null; then
  echo "FAIL: main session 未创建"
  exit 1
fi
echo "PASS: 主 agent session 存活"

# 4. 发送一条简单 prompt
tmux send-keys -t main "你好，请回复'收到'两个字" Enter

# 5. 等待并捕获输出
sleep 25
OUTPUT=$(tmux capture-pane -t main -p)

# 6. 验证主 agent 有响应
echo "--- 输出 ---"
echo "$OUTPUT" | tail -50
echo "------------"

if ! echo "$OUTPUT" | grep -q "收到"; then
  echo "FAIL: 主 agent 未响应 prompt"
  exit 1
fi
echo "PASS: 主 agent 响应 prompt"

# 7. 清理
tmux kill-session -t main 2>/dev/null || true

echo ""
echo "TEST_SMOKE 通过"
