#!/bin/bash
set -e

echo "========================================"
echo "TEST_SMOKE — 前置冒烟测试"
echo "========================================"

WORK_DIR="/data/data/com.termux/files/home"

# 从 cocode.sh 提取环境变量（去掉 exec 行避免替换当前进程）
source <(sed '/^exec /d' /data/data/com.termux/files/home/cocode.sh)

# 清理残留 session
tmux kill-session -t main 2>/dev/null || true
sleep 1

# 1. 拉起主 agent（继承当前环境变量）
tmux new -s main -d "cd ${WORK_DIR} && bash"
sleep 2
tmux send-keys -t main "cocode" Enter
sleep 12

# 2. 确认 API key（按上箭头选 1. Yes，然后 Enter）
tmux send-keys -t main Up Enter
sleep 5

# 3. 确认安全提示（默认选1，直接Enter）
tmux send-keys -t main Enter
sleep 5

# 4. 验证主 agent session 存活
if ! tmux has-session -t main 2>/dev/null; then
  echo "FAIL: main session 未创建"
  exit 1
fi
echo "PASS: 主 agent session 存活"

# 5. 发送一条简单 prompt
tmux send-keys -t main "你好，请回复'收到'两个字" Enter

# 6. 等待并捕获输出
sleep 30
OUTPUT=$(tmux capture-pane -t main -p)

# 7. 验证主 agent 有响应
echo "--- 输出尾部 ---"
echo "$OUTPUT" | tail -40
echo "----------------"

if ! echo "$OUTPUT" | grep -q "收到"; then
  echo "FAIL: 主 agent 未响应 prompt"
  exit 1
fi
echo "PASS: 主 agent 响应 prompt"

# 8. 清理
tmux kill-session -t main 2>/dev/null || true

echo ""
echo "TEST_SMOKE 通过"
