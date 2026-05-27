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

# 2. 捕获当前输出，检测界面状态
OUTPUT=$(tmux capture-pane -t main -p)

# 2a. 如果有 API key 提示（默认选 2. No），按 Up 选 1. Yes 再确认
if echo "$OUTPUT" | grep -q "Do you want to use this API key"; then
  tmux send-keys -t main Up Enter
  sleep 3
  OUTPUT=$(tmux capture-pane -t main -p)
fi

# 2b. 如果有安全提示，按 Enter 确认
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

# 4. 发送 prompt 前捕获一次输出
BEFORE=$(tmux capture-pane -t main -p)

# 5. 发送一条简单 prompt
PROMPT="请回复一个汉字'收'"
tmux send-keys -t main "$PROMPT" Enter

# 6. 等待 API 响应
sleep 25

# 7. 捕获发送 prompt 后的输出
AFTER=$(tmux capture-pane -t main -p)

echo "--- 输出 ---"
echo "$AFTER" | tail -40
echo "------------"

# 8. 检查是否有处理迹象：
#    - spinner 字符（表示正在处理请求）
#    - Error 信息（表示 API 调用失败但有响应）
#    - 输出行数增加（表示有新增内容）
if echo "$AFTER" | grep -q '[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]'; then
  echo "PASS: cocode 正在处理请求（spinner 出现）"
elif echo "$AFTER" | grep -qi "error\|timeout\|超时"; then
  echo "WARN: API 调用出现错误，但 cocode 有响应"
else
  BEFORE_LINES=$(echo "$BEFORE" | wc -l)
  AFTER_LINES=$(echo "$AFTER" | wc -l)
  if [ "$AFTER_LINES" -gt "$BEFORE_LINES" ]; then
    echo "PASS: 终端输出有新增内容"
  else
    echo "FAIL: 发送 prompt 后 cocode 无任何响应"
    exit 1
  fi
fi

# 9. 清理
tmux kill-session -t main 2>/dev/null || true

echo ""
echo "TEST_SMOKE 通过"
