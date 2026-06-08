# TEST_SUB_AGENT_RESULT

## 测试时间
2026-06-08 +0800

## 版本
v0.15.0

## Commit
445f914

## 修复说明
回退 auto mode removal commits (65af0bc~98da704)，这些提交虽意在修复 TRANSCRIPT_CLASSIFIER + modelSupportsAutoMode 导致 skill Bash 规则被剥离的问题，但修复不完整，引入新 bug（attachments.ts 遗留未定义变量等），导致模型不响应。

## 测试结果
全部 10 项通过。
