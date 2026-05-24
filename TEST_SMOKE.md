# TEST_SMOKE — 前置冒烟测试

## 目的

验证最基本的 cocode + tmux 集成链路可用：**tmux 拉起主 agent → send-keys 发送 prompt → 主 agent 正常响应**。这是后续所有 E2E 测试的前置条件，此测试不通过则无需继续。

## 前置条件

- tmux 已安装且 tmux server 运行中
- `cocode.sh` 可执行，位于 `/Users/zhoukangjia/workspace/`
- API 环境变量已配置（或通过 `cocode.sh` 内置导出）

## 测试脚本

```bash
#!/bin/bash
set -e

echo "========================================"
echo "TEST_SMOKE — 前置冒烟测试"
echo "========================================"

# 清理残留 session
tmux kill-session -t main 2>/dev/null || true
sleep 1

# 1. 拉起主 agent
tmux new -s main -d "cd /Users/zhoukangjia/workspace && bash"
sleep 2
tmux send-keys -t main "./cocode.sh" Enter
sleep 15

# 2. 验证主 agent session 存活
if ! tmux has-session -t main 2>/dev/null; then
  echo "FAIL: main session 未创建"
  exit 1
fi
echo "PASS: 主 agent session 存活"

# 3. 发送一条简单 prompt
tmux send-keys -t main "你好，请回复'收到'两个字" Enter

# 4. 等待并捕获输出
sleep 15
OUTPUT=$(tmux capture-pane -t main -p)

# 5. 验证主 agent 有响应（输出非空且包含预期内容）
if ! echo "$OUTPUT" | grep -q "收到"; then
  echo "FAIL: 主 agent 未响应 prompt"
  echo "$OUTPUT" | tail -20
  exit 1
fi
echo "PASS: 主 agent 响应 prompt"

# 6. 清理
tmux kill-session -t main 2>/dev/null || true

echo ""
echo "TEST_SMOKE 通过"
```

## 通过标准

- `tmux has-session -t main` 返回 0（主 agent 成功启动）
- `tmux capture-pane -t main -p` 输出非空且包含对 prompt 的响应（如"收到"）

## 失败排查

| 失败点 | 可能原因 | 排查命令 |
|--------|---------|---------|
| main session 不存在 | cocode.sh 启动失败 | `tmux capture-pane -t main -p` 看报错 |
| 无响应 | API key 无效或网络问题 | 检查 cocode 输出是否有 API error |
| 无响应 | 模型加载慢 | 增大 sleep 时间再试 |
