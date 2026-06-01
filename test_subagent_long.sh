#!/bin/bash
set -e
cleanup() { tmux kill-session -t main 2>/dev/null || true; for s in $(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-'); do tmux kill-session -t "$s" 2>/dev/null || true; done; }
cleanup
sleep 1
echo "Starting main agent..."
tmux new -s main -d "cd /data/data/com.termux/files/home && bash"
sleep 2
tmux send-keys -t main "./cocode.sh" Enter
sleep 15
echo "Sending /agent command..."
tmux send-keys -t main "/agent 创建一个子agent列出当前目录文件" Enter
sleep 60  # way longer
echo "Checking for agent session..."
AGENT=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^agent-' | head -1)
if [ -n "$AGENT" ]; then
  echo "PASS: Subagent created: $AGENT"
  SUB_OUT=$(tmux capture-pane -t "$AGENT" -p 2>/dev/null)
  echo "$SUB_OUT" | tail -10
  tmux kill-session -t "$AGENT"
else
  echo "FAIL: No subagent after 60s"
  MAIN_OUT=$(tmux capture-pane -t main -p)
  echo "$MAIN_OUT" | tail -15
fi
cleanup
