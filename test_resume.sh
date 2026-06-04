#!/usr/bin/env bash
set -euo pipefail

echo "===== TEST_RESUME — /resume 命令测试 ====="

# Kill any leftover sessions
tmux kill-session -t test 2>/dev/null || true
for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
  tmux kill-session -t "$s" 2>/dev/null || true
done
sleep 1

# Step 1: 启动 cocode，发送 prompt 并等待回复
echo "Step 1: 创建新会话..."
tmux new -s test -d "cd /data/data/com.termux/files/home/cocode && bash"
sleep 2
tmux send-keys -t test "cocode" Enter
sleep 20

# 发送 prompt
tmux send-keys -t test "hello, reply with just OK" Enter
sleep 20

# 退出
tmux send-keys -t test C-c
sleep 3
tmux send-keys -t test "/exit" Enter
sleep 3

# 关闭 session
tmux kill-session -t test 2>/dev/null || true
sleep 2

# Step 2: 重新启动，测试 /resume
echo "Step 2: 打开 /resume..."
tmux new -s test -d "cd /data/data/com.termux/files/home/cocode && bash"
sleep 2
tmux send-keys -t test "cocode" Enter
sleep 20

tmux send-keys -t test "/resume" Enter
sleep 10

echo ""
echo "=== /resume 输出 ==="
tmux capture-pane -t test -p -S -100 | grep -i "convers\|resum\|session\|found\|load" | head -10
echo ""
echo "=== 完整输出 (最后20行) ==="
tmux capture-pane -t test -p -S -100 | tail -20

# 清理
tmux kill-session -t test 2>/dev/null || true
for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do
  tmux kill-session -t "$s" 2>/dev/null || true
done

echo ""
echo "===== TEST_RESUME 完成 ====="
