# 合并 Config 和 Settings 为统一配置系统

## 目标

将两套独立的持久化系统合并为一套。

## 现状

| | Config (`cocode.json`) | Settings (`settings.json`) |
|------|------|------|
| **文件** | `~/.cocode/cocode.json` + `./cocode.json` | `~/.cocode/settings.json` + `./cocode/settings.json` |
| **内容** | 应用偏好：verbose, theme, editorMode, numStartups, oauthAccount... | LLM 配置：model, permissions, hooks, env, effortLevel... |
| **读** | `getGlobalConfig()`, `getCurrentProjectConfig()` | `getInitialSettings()`, `getSettingsForSource()` |
| **写** | `saveGlobalConfig()`, `saveCurrentProjectConfig()` | `updateSettingsForSource()` |
| **代码** | `config.ts` | `settings.ts` + `settingsCache.ts` |

## 重叠

- `apiKeyHelper` 两边都有定义
- 读/写逻辑重复：都做"从磁盘读 → 合并 → 缓存"

## 计划

1. 梳理 Config 和 Settings 所有字段，确定保留哪些
2. 统一为一个 schema 和一个配置文件
3. 合并读函数（`getInitialSettings` + `getGlobalConfig`）
4. 合并写函数（`updateSettingsForSource` + `saveGlobalConfig`）
5. 删除 settings: `localSettings`, `flagSettings`, `policySettings` ✅ 已完成
6. 删除死函数：`loadManagedFileSettings` 等 ✅ 已完成
